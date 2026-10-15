/**
 * Backtest temporal del motor: cada partido se predice con lo que se sabía antes de jugarse.
 *
 * Cómo se evita la fuga de información, que es lo único que hace creíble a un backtest:
 *   1. Las **variables** de cada partido solo miran fechas anteriores (`features.ts`).
 *   2. Los modelos se **reentrenan por cortes**: en el corte del día D solo entran partidos de fechas
 *      estrictamente anteriores a D. Entre corte y corte se usa el modelo entrenado en el último, que
 *      es lo que se podría haber hecho en la vida real (reentrenar cada día no cambia el resultado y
 *      multiplica el tiempo por veinte).
 *   3. Los **pesos del ensemble** y la **calibración** de cada modelo se ajustan solo con predicciones
 *      de partidos anteriores, en ventana expansiva.
 *
 * El resultado son las predicciones de cada modelo partido a partido, guardadas para poder medirlas
 * después de todas las maneras (por modelo, por mercado, por competición) sin repetir el trabajo.
 */
import type { League, Match, ModelParams, Probabilities1X2 } from '../../types';
import { buildDataset, type SampleRow } from './features';
import { MODELS } from './models';
import { fitWeights, blend1X2, blendBinary, type Weights } from './ensemble';
import { apply1X2, applyBinary, fit1X2, fitBinary, SIN_CALIBRAR_1X2, SIN_CALIBRAR_BINARIA, type Calibration1X2, type CalibrationBinary } from './calibration';
import { score1X2 } from './metrics';
import type { CalibrationState } from './engine';
import { OVER_LINES, probabilityOf, type FittedModel, type MarketProbabilities, type ModelId, type Outcome1X2, type OverLine, type PredictionModel } from './types';

/** Cada cuántos días se reentrenan los modelos durante el backtest. */
export const REENTRENO_DIAS = 21;

/** Partidos previos que necesita cada equipo para que su predicción cuente. */
export const MIN_PARTIDOS_PREVIOS = 5;

export interface BacktestOptions {
  matches: Match[];
  leagues: League[];
  params: ModelParams;
  /** Modelos que participan. Por defecto, todos. */
  models?: PredictionModel[];
  refitDays?: number;
  minPlayed?: number;
  /** Se llama entre cortes para poder enseñar el avance y no congelar la interfaz. */
  onProgress?: (hecho: number, total: number, etapa: string) => void | Promise<void>;
}

/** Lo que un modelo predijo para un partido. */
export interface ModelRecord {
  probs1x2: Probabilities1X2;
  over: Partial<Record<OverLine, number>>;
  btts: number | null;
  expectedGoals: { home: number; away: number } | null;
  scorelines: { score: string; probability: number }[] | null;
}

export interface MatchRecord {
  matchId: string;
  leagueId: string;
  date: string;
  homeTeamId: string;
  awayTeamId: string;
  actual: Outcome1X2;
  totalGoals: number;
  btts: 0 | 1;
  /** Predicción de cada modelo que respondió, ya calibrada. */
  byModel: Map<ModelId, ModelRecord>;
  /** Predicción del ensemble con los pesos vigentes en ese momento. */
  ensemble: { probs1x2: Probabilities1X2; over: Partial<Record<OverLine, number>>; btts: number | null; used: ModelId[] } | null;
  /** Pesos que se usaron, para poder enseñar de dónde salió la mezcla. */
  weights: { id: ModelId; weight: number }[];
}

export interface BacktestResult {
  records: MatchRecord[];
  /** Modelos que llegaron a entrenarse alguna vez, con su último aviso. */
  trained: { id: ModelId; name: string; fits: number; lastNote: string | null }[];
  /** Modelos que nunca pudieron entrenarse y por qué. */
  skipped: { id: ModelId; name: string; reason: string }[];
  refits: number;
  evaluated: number;
  /** Partidos descartados por no tener bastante historia previa. */
  skippedMatches: number;
  /** Pesos finales del ensemble (los del último corte), por mercado. */
  finalWeights: { market: string; weights: { id: ModelId; weight: number }[] }[];
  /**
   * Pesos y calibración medidos con TODO el backtest: es lo que usa el motor para los partidos que
   * están por jugarse. Se guarda con la app para no tener que repetir el backtest en cada arranque.
   */
  calibration: CalibrationState;
}

const dias = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / 86_400_000;

/**
 * Ejecuta el backtest. `await`s entre cortes para que la interfaz siga respondiendo mientras corre.
 */
export async function runPredictionBacktest(opts: BacktestOptions): Promise<BacktestResult> {
  const modelos = opts.models ?? MODELS;
  const refitDays = opts.refitDays ?? REENTRENO_DIAS;
  const minPlayed = opts.minPlayed ?? MIN_PARTIDOS_PREVIOS;

  const rows = buildDataset(opts.matches);
  const porFecha = new Map<string, SampleRow[]>();
  for (const r of rows) (porFecha.get(r.date) ?? porFecha.set(r.date, []).get(r.date)!).push(r);
  const fechas = [...porFecha.keys()].sort();

  const matchById = new Map(opts.matches.map((m) => [m.id, m]));
  const records: MatchRecord[] = [];
  const fits = new Map<ModelId, number>();
  const notas = new Map<ModelId, string | null>();
  const nuncaEntrenado = new Map<ModelId, string>();

  let ajustados: FittedModel[] = [];
  let ultimoCorte: string | null = null;
  let refits = 0;
  let evaluated = 0;
  let skippedMatches = 0;

  // Historia de predicciones para pesos y calibración, siempre de partidos ya pasados.
  //
  // La calibración se ajusta con las salidas CRUDAS del modelo. Guardar aquí las ya calibradas y
  // recalibrarlas en el corte siguiente encoge la escala una vez por corte y termina aplastando al
  // modelo contra la frecuencia base: es un error silencioso que se ve en las métricas, no en el código.
  const historia1x2 = new Map<ModelId, { probs: Probabilities1X2; actual: Outcome1X2 }[]>();
  const historiaOver = new Map<ModelId, { p: number; actual: 0 | 1 }[]>();
  const historiaBtts = new Map<ModelId, { p: number; actual: 0 | 1 }[]>();
  const mezcla1x2: Map<ModelId, number>[] = [];
  const mezclaOver: Map<ModelId, number>[] = [];
  const mezclaBtts: Map<ModelId, number>[] = [];

  let pesos1x2: Weights = new Map();
  let pesosOver: Weights = new Map();
  let pesosBtts: Weights = new Map();
  const calibracion1x2 = new Map<ModelId, Calibration1X2>();
  const calibracionOver = new Map<ModelId, CalibrationBinary>();
  const calibracionBtts = new Map<ModelId, CalibrationBinary>();

  for (let f = 0; f < fechas.length; f++) {
    const fecha = fechas[f];

    // ---- Corte: reentrenar con TODO lo anterior a esta fecha ----
    if (ultimoCorte === null || dias(fecha, ultimoCorte) >= refitDays) {
      const previos = opts.matches.filter((m) => m.date < fecha);
      const filasPrevias = rows.filter((r) => r.date < fecha);
      const ctx = { rows: filasPrevias, matches: previos, leagues: opts.leagues, params: opts.params, cutoff: fecha, cache: new Map<string, unknown>() };
      ajustados = [];
      for (const modelo of modelos) {
        const fit = modelo.fit(ctx);
        if (fit) {
          ajustados.push(fit);
          fits.set(modelo.id, (fits.get(modelo.id) ?? 0) + 1);
          notas.set(modelo.id, fit.note);
          nuncaEntrenado.delete(modelo.id);
        } else if (!fits.has(modelo.id)) {
          nuncaEntrenado.set(modelo.id, `necesita al menos ${modelo.minMatches} partidos y en el corte del ${fecha} había ${previos.length}`);
        }
      }
      ultimoCorte = fecha;
      refits++;

      // Pesos y calibración con la historia acumulada hasta aquí.
      const ids = ajustados.map((a) => a.id);
      pesos1x2 = fitWeights(ids, mezcla1x2);
      pesosOver = fitWeights(ids.filter((id) => (historiaOver.get(id)?.length ?? 0) > 0), mezclaOver);
      pesosBtts = fitWeights(ids.filter((id) => (historiaBtts.get(id)?.length ?? 0) > 0), mezclaBtts);
      for (const id of ids) {
        calibracion1x2.set(id, fit1X2(historia1x2.get(id) ?? []));
        calibracionOver.set(id, fitBinary(historiaOver.get(id) ?? []));
        calibracionBtts.set(id, fitBinary(historiaBtts.get(id) ?? []));
      }
      await opts.onProgress?.(f, fechas.length, `entrenando con ${previos.length} partidos (corte ${fecha})`);
    }

    // ---- Predicción de los partidos del día ----
    for (const row of porFecha.get(fecha)!) {
      if (row.features.playedHome < minPlayed || row.features.playedAway < minPlayed) {
        skippedMatches++;
        continue;
      }
      const match = matchById.get(row.matchId);
      if (!match) continue;

      const input = { leagueId: row.leagueId, homeTeamId: row.homeTeamId, awayTeamId: row.awayTeamId, date: row.date, features: row.features };
      const byModel = new Map<ModelId, ModelRecord>();
      const sinCalibrar = new Map<ModelId, MarketProbabilities>();
      const crudo1x2 = new Map<ModelId, Probabilities1X2>();
      const crudoOver = new Map<ModelId, number>();
      const crudoBtts = new Map<ModelId, number>();

      for (const modelo of ajustados) {
        const p = modelo.predict(input);
        if (!p) continue;
        const cal1x2 = calibracion1x2.get(modelo.id) ?? SIN_CALIBRAR_1X2;
        const probs = apply1X2(p.probs1x2, cal1x2);
        const over: Partial<Record<OverLine, number>> = {};
        for (const linea of OVER_LINES) {
          const v = p.over[linea];
          if (v === undefined) continue;
          over[linea] = linea === 2.5 ? applyBinary(v, calibracionOver.get(modelo.id) ?? SIN_CALIBRAR_BINARIA) : v;
        }
        const btts = p.btts === null ? null : applyBinary(p.btts, calibracionBtts.get(modelo.id) ?? SIN_CALIBRAR_BINARIA);

        byModel.set(modelo.id, { probs1x2: probs, over, btts, expectedGoals: p.expectedGoals, scorelines: p.scorelines });
        crudo1x2.set(modelo.id, probs);
        if (over[2.5] !== undefined) crudoOver.set(modelo.id, over[2.5]!);
        if (btts !== null) crudoBtts.set(modelo.id, btts);
        // Para la calibración del próximo corte se guarda lo que dijo el modelo SIN calibrar.
        sinCalibrar.set(modelo.id, p);
      }
      if (byModel.size === 0) {
        skippedMatches++;
        continue;
      }

      const mezclado = blend1X2(crudo1x2, pesos1x2);
      const over25 = blendBinary(crudoOver, pesosOver);
      const bttsMezcla = blendBinary(crudoBtts, pesosBtts);
      // Las líneas 1.5 y 3.5 las dan solo los modelos de goles: se mezclan con los mismos pesos 1X2.
      const overOtras: Partial<Record<OverLine, number>> = {};
      for (const linea of OVER_LINES) {
        if (linea === 2.5) continue;
        const m = new Map<ModelId, number>();
        for (const [id, r] of byModel) if (r.over[linea] !== undefined) m.set(id, r.over[linea]!);
        const b = blendBinary(m, pesos1x2);
        if (b) overOtras[linea] = b.p;
      }

      const actual = row.labels.result;
      records.push({
        matchId: row.matchId,
        leagueId: row.leagueId,
        date: row.date,
        homeTeamId: row.homeTeamId,
        awayTeamId: row.awayTeamId,
        actual,
        totalGoals: row.labels.totalGoals,
        btts: row.labels.btts,
        byModel,
        ensemble: mezclado
          ? {
              probs1x2: mezclado.probs,
              over: { ...overOtras, ...(over25 ? { 2.5: over25.p } : {}) },
              btts: bttsMezcla?.p ?? null,
              used: mezclado.used,
            }
          : null,
        weights: [...pesos1x2].map(([id, weight]) => ({ id, weight })),
      });
      evaluated++;

      // La predicción de hoy es historia para los cortes de mañana.
      const muestra1x2 = new Map<ModelId, number>();
      const muestraOver = new Map<ModelId, number>();
      const muestraBtts = new Map<ModelId, number>();
      const over25Real: 0 | 1 = row.labels.totalGoals > 2.5 ? 1 : 0;
      for (const [id, r] of byModel) {
        // Los pesos del ensemble se miden sobre lo que el ensemble mezcla: las probabilidades calibradas.
        muestra1x2.set(id, probabilityOf(r.probs1x2, actual));
        if (r.over[2.5] !== undefined) muestraOver.set(id, over25Real === 1 ? r.over[2.5]! : 1 - r.over[2.5]!);
        if (r.btts !== null) muestraBtts.set(id, row.labels.btts === 1 ? r.btts : 1 - r.btts);

        // La calibración, sobre lo crudo.
        const bruto = sinCalibrar.get(id)!;
        (historia1x2.get(id) ?? historia1x2.set(id, []).get(id)!).push({ probs: bruto.probs1x2, actual });
        if (bruto.over[2.5] !== undefined) (historiaOver.get(id) ?? historiaOver.set(id, []).get(id)!).push({ p: bruto.over[2.5]!, actual: over25Real });
        if (bruto.btts !== null) (historiaBtts.get(id) ?? historiaBtts.set(id, []).get(id)!).push({ p: bruto.btts, actual: row.labels.btts });
      }
      mezcla1x2.push(muestra1x2);
      if (muestraOver.size) mezclaOver.push(muestraOver);
      if (muestraBtts.size) mezclaBtts.push(muestraBtts);
    }
  }

  // Pesos y calibración con TODO lo recorrido: son los que valen para predecir lo que viene.
  const idsFinales = [...new Set(records.flatMap((r) => [...r.byModel.keys()]))];
  const calibration: CalibrationState = {
    weights1x2: fitWeights(idsFinales, mezcla1x2),
    weightsOver: fitWeights(idsFinales.filter((id) => (historiaOver.get(id)?.length ?? 0) > 0), mezclaOver),
    weightsBtts: fitWeights(idsFinales.filter((id) => (historiaBtts.get(id)?.length ?? 0) > 0), mezclaBtts),
    calibration1x2: new Map(idsFinales.map((id) => [id, fit1X2(historia1x2.get(id) ?? [])])),
    calibrationOver: new Map(idsFinales.map((id) => [id, fitBinary(historiaOver.get(id) ?? [])])),
    calibrationBtts: new Map(idsFinales.map((id) => [id, fitBinary(historiaBtts.get(id) ?? [])])),
    samples: records.length,
    ece: score1X2(records.filter((r) => r.ensemble).map((r) => ({ probs: r.ensemble!.probs1x2, actual: r.actual }))).ece,
    measuredAt: new Date().toISOString(),
  };

  const nombre = (id: ModelId) => MODELS.find((m) => m.id === id)?.name ?? id;
  return {
    calibration,
    records,
    trained: [...fits].map(([id, n]) => ({ id, name: nombre(id), fits: n, lastNote: notas.get(id) ?? null })),
    skipped: [...nuncaEntrenado].map(([id, reason]) => ({ id, name: nombre(id), reason })),
    refits,
    evaluated,
    skippedMatches,
    finalWeights: [
      { market: '1X2', weights: [...pesos1x2].map(([id, weight]) => ({ id, weight })) },
      { market: 'Over 2.5', weights: [...pesosOver].map(([id, weight]) => ({ id, weight })) },
      { market: 'BTTS', weights: [...pesosBtts].map(([id, weight]) => ({ id, weight })) },
    ],
  };
}
