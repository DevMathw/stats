/**
 * Motor de predicción para partidos que aún no se han jugado.
 *
 * Es la otra mitad del módulo: el backtest mide, esto predice. Los dos usan los mismos modelos y las
 * mismas variables, así que lo que se mide es exactamente lo que se enseña.
 *
 * Rendimiento: entrenar los siete modelos con los ~2.900 partidos lleva unos segundos, y una jornada
 * tiene decenas de partidos pendientes. Por eso se entrena UNA vez y se predice en lote, y el resultado
 * se guarda en una caché que solo se invalida cuando cambian los partidos o los parámetros.
 *
 * Los pesos del ensemble y la calibración de cada modelo salen del último backtest guardado. Sin
 * backtest no hay pesos medidos: se reparte por igual y la ficha lo dice, en vez de inventar una
 * ponderación que parezca informada.
 */
import type { Fixture, League, Match, ModelParams, Probabilities1X2 } from '../../types';
import { buildDatasetWithState, featuresForFixture, type DatasetState } from './features';
import { MODELS } from './models';
import { blend1X2, blendBinary, MIN_PARA_PESOS, type Weights } from './ensemble';
import { apply1X2, applyBinary, SIN_CALIBRAR_1X2, SIN_CALIBRAR_BINARIA, type Calibration1X2, type CalibrationBinary } from './calibration';
import { OVER_LINES, type FittedModel, type MarketProbabilities, type ModelId, type OverLine, type PredictionModel } from './types';

/** Lo que el motor sabe de un partido pendiente. */
export interface FixturePrediction {
  fixtureId: string;
  /** Lo que dijo cada modelo que pudo responder. */
  byModel: { id: ModelId; name: string; probabilities: MarketProbabilities }[];
  /** Modelos que no respondieron, con el motivo. */
  missing: { id: ModelId; name: string; reason: string }[];
  ensemble: {
    probs1x2: Probabilities1X2;
    over: Partial<Record<OverLine, number>>;
    btts: number | null;
    expectedGoals: { home: number; away: number } | null;
    scorelines: { score: string; probability: number }[] | null;
    used: ModelId[];
    weights: { id: ModelId; name: string; weight: number }[];
  } | null;
  /** Confianza medida, no una impresión. Ver `confidenceOf`. */
  confidence: Confidence;
}

export interface Confidence {
  /** 0–10. */
  value: number;
  /** Qué la sube y qué la baja, en lenguaje llano. */
  reasons: string[];
  /** Partidos previos del local y del visitante. */
  sample: { home: number; away: number };
  /** Cuánto se parecen entre sí los modelos (0 = dicen cosas distintas, 1 = idénticos). */
  agreement: number;
  /** Error de calibración del ensemble en el último backtest, si lo hay. */
  ece: number | null;
}

/** Pesos y calibración medidos, tal como los dejó el último backtest. */
export interface CalibrationState {
  weights1x2: Weights;
  weightsOver: Weights;
  weightsBtts: Weights;
  calibration1x2: Map<ModelId, Calibration1X2>;
  calibrationOver: Map<ModelId, CalibrationBinary>;
  calibrationBtts: Map<ModelId, CalibrationBinary>;
  /** Partidos con los que se midió y ECE del ensemble en 1X2. */
  samples: number;
  ece: number | null;
  measuredAt: string | null;
}

export const SIN_MEDIR: CalibrationState = {
  weights1x2: new Map(),
  weightsOver: new Map(),
  weightsBtts: new Map(),
  calibration1x2: new Map(),
  calibrationOver: new Map(),
  calibrationBtts: new Map(),
  samples: 0,
  ece: null,
  measuredAt: null,
};

export interface TrainedEngine {
  fitted: FittedModel[];
  missing: { id: ModelId; name: string; reason: string }[];
  state: DatasetState;
  /** Partidos con los que se entrenó. */
  trained: number;
  trainedAt: string;
}

/**
 * Entrena los modelos con TODO lo jugado. Es la operación cara del módulo (segundos), así que se hace
 * una vez por lote de predicciones.
 */
export function trainEngine(input: {
  matches: Match[];
  leagues: League[];
  params: ModelParams;
  models?: PredictionModel[];
}): TrainedEngine {
  const modelos = input.models ?? MODELS;
  const { rows, state } = buildDatasetWithState(input.matches);
  const ctx = {
    rows,
    matches: input.matches,
    leagues: input.leagues,
    params: input.params,
    // El corte es el día siguiente al último partido: todo lo jugado entra.
    cutoff: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
    cache: new Map<string, unknown>(),
  };

  const fitted: FittedModel[] = [];
  const missing: TrainedEngine['missing'] = [];
  for (const modelo of modelos) {
    const fit = modelo.fit(ctx);
    if (fit) fitted.push(fit);
    else missing.push({ id: modelo.id, name: modelo.name, reason: `no hay datos suficientes: necesita al menos ${modelo.minMatches} partidos` });
  }
  return { fitted, missing, state, trained: input.matches.length, trainedAt: new Date().toISOString() };
}

const nombre = (id: ModelId) => MODELS.find((m) => m.id === id)?.name ?? id;

/** Predice un partido pendiente con un motor ya entrenado. */
export function predictFixture(engine: TrainedEngine, fixture: Fixture, calibracion: CalibrationState = SIN_MEDIR): FixturePrediction {
  const features = featuresForFixture(engine.state, fixture);
  const byModel: FixturePrediction['byModel'] = [];
  const missing = [...engine.missing];
  const crudo1x2 = new Map<ModelId, Probabilities1X2>();
  const crudoOver = new Map<OverLine, Map<ModelId, number>>(OVER_LINES.map((l) => [l, new Map()]));
  const crudoBtts = new Map<ModelId, number>();
  const goles: { home: number; away: number; weight: number }[] = [];
  const marcadores = new Map<string, { suma: number; peso: number }>();

  if (!features) {
    return {
      fixtureId: fixture.id,
      byModel: [],
      missing: [...missing, ...engine.fitted.map((f) => ({ id: f.id, name: nombre(f.id), reason: 'alguno de los dos equipos no tiene partidos en la base' }))],
      ensemble: null,
      confidence: { value: 0, reasons: ['Sin partidos previos de alguno de los dos equipos'], sample: { home: 0, away: 0 }, agreement: 0, ece: calibracion.ece },
    };
  }

  const input = { leagueId: fixture.leagueId, homeTeamId: fixture.homeTeamId, awayTeamId: fixture.awayTeamId, date: fixture.date, features };
  for (const modelo of engine.fitted) {
    const p = modelo.predict(input);
    if (!p) {
      missing.push({ id: modelo.id, name: nombre(modelo.id), reason: 'no tiene datos de esta competición o de estos equipos' });
      continue;
    }
    const probs = apply1X2(p.probs1x2, calibracion.calibration1x2.get(modelo.id) ?? SIN_CALIBRAR_1X2);
    const over: Partial<Record<OverLine, number>> = {};
    for (const linea of OVER_LINES) {
      const v = p.over[linea];
      if (v === undefined) continue;
      over[linea] = linea === 2.5 ? applyBinary(v, calibracion.calibrationOver.get(modelo.id) ?? SIN_CALIBRAR_BINARIA) : v;
      crudoOver.get(linea)!.set(modelo.id, over[linea]!);
    }
    const btts = p.btts === null ? null : applyBinary(p.btts, calibracion.calibrationBtts.get(modelo.id) ?? SIN_CALIBRAR_BINARIA);
    if (btts !== null) crudoBtts.set(modelo.id, btts);
    crudo1x2.set(modelo.id, probs);

    const peso = calibracion.weights1x2.get(modelo.id) ?? 1;
    if (p.expectedGoals) goles.push({ ...p.expectedGoals, weight: peso });
    for (const s of p.scorelines ?? []) {
      const m = marcadores.get(s.score) ?? { suma: 0, peso: 0 };
      m.suma += peso * s.probability;
      m.peso += peso;
      marcadores.set(s.score, m);
    }

    byModel.push({ id: modelo.id, name: nombre(modelo.id), probabilities: { probs1x2: probs, over, btts, expectedGoals: p.expectedGoals, scorelines: p.scorelines } });
  }

  const pesos1x2 = calibracion.weights1x2.size ? calibracion.weights1x2 : iguales([...crudo1x2.keys()]);
  const pesosOver = calibracion.weightsOver.size ? calibracion.weightsOver : pesos1x2;
  const pesosBtts = calibracion.weightsBtts.size ? calibracion.weightsBtts : pesos1x2;

  const mezcla = blend1X2(crudo1x2, pesos1x2);
  const over: Partial<Record<OverLine, number>> = {};
  for (const linea of OVER_LINES) {
    const b = blendBinary(crudoOver.get(linea)!, linea === 2.5 ? pesosOver : pesos1x2);
    if (b) over[linea] = b.p;
  }
  const btts = blendBinary(crudoBtts, pesosBtts);

  const pesoGoles = goles.reduce((a, g) => a + g.weight, 0);
  const expectedGoals = pesoGoles > 0
    ? {
        home: goles.reduce((a, g) => a + g.home * g.weight, 0) / pesoGoles,
        away: goles.reduce((a, g) => a + g.away * g.weight, 0) / pesoGoles,
      }
    : null;
  const scorelines = marcadores.size
    ? [...marcadores]
        .map(([score, m]) => ({ score, probability: m.suma / m.peso }))
        .sort((a, b) => b.probability - a.probability)
        .slice(0, 5)
    : null;

  const confidence = confidenceOf(features.playedHome, features.playedAway, [...crudo1x2.values()], calibracion);

  return {
    fixtureId: fixture.id,
    byModel,
    missing,
    ensemble: mezcla
      ? {
          probs1x2: mezcla.probs,
          over,
          btts: btts?.p ?? null,
          expectedGoals,
          scorelines,
          used: mezcla.used,
          weights: [...pesos1x2].filter(([id]) => crudo1x2.has(id)).map(([id, weight]) => ({ id, name: nombre(id), weight })),
        }
      : null,
    confidence,
  };
}

/**
 * Lo que la proyección necesita del motor: probabilidades, goles esperados y de quién salieron. Es
 * plano a propósito: se guarda con la aplicación y viaja al cálculo de PROYECCIONES.
 */
export interface EnginePrediction {
  probs1x2: Probabilities1X2;
  /** `null` si ningún modelo de goles respondió: entonces solo se puede sustituir el 1X2. */
  expectedGoals: { home: number; away: number } | null;
  used: ModelId[];
  confidence: number;
}

export const toEnginePrediction = (p: FixturePrediction): EnginePrediction | null =>
  p.ensemble ? { probs1x2: p.ensemble.probs1x2, expectedGoals: p.ensemble.expectedGoals, used: p.ensemble.used, confidence: p.confidence.value } : null;

/**
 * Predice una lista de partidos con un motor ya entrenado. Entrenar es lo caro; predecir cada partido,
 * no: por eso las proyecciones se calculan en lote y una sola vez.
 */
export function predictFixtures(
  engine: TrainedEngine,
  fixtures: Fixture[],
  calibracion: CalibrationState = SIN_MEDIR,
): Map<string, EnginePrediction> {
  const out = new Map<string, EnginePrediction>();
  for (const f of fixtures) {
    const p = toEnginePrediction(predictFixture(engine, f, calibracion));
    if (p) out.set(f.id, p);
  }
  return out;
}

const iguales = (ids: ModelId[]): Weights => new Map(ids.map((id) => [id, 1 / Math.max(1, ids.length)]));

/**
 * Confianza de una predicción, de 0 a 10, a partir de tres cosas medibles:
 *
 *  - **Muestra**: partidos previos de los dos equipos. Con 3 partidos cada uno, casi nada es fiable.
 *  - **Acuerdo entre modelos**: si Poisson, Elo y la red dicen lo mismo, la señal es más sólida que si
 *    cada uno dice una cosa. Se mide con la distancia media entre sus 1X2.
 *  - **Calibración medida**: el ECE del ensemble en el último backtest. Sin backtest, la confianza tiene
 *    un techo, porque nadie ha comprobado que las probabilidades signifiquen lo que dicen.
 *
 * Nunca llega a 10: una predicción de fútbol no es una certeza y el número no debe sugerirlo.
 */
export function confidenceOf(playedHome: number, playedAway: number, predicciones: Probabilities1X2[], calibracion: CalibrationState): Confidence {
  const razones: string[] = [];
  const muestra = Math.min(playedHome, playedAway);
  const porMuestra = Math.min(1, muestra / 15);
  if (muestra < 6) razones.push(`Muestra corta: ${playedHome} y ${playedAway} partidos previos`);

  let acuerdo = 1;
  if (predicciones.length >= 2) {
    let suma = 0;
    let pares = 0;
    for (let i = 0; i < predicciones.length; i++) {
      for (let j = i + 1; j < predicciones.length; j++) {
        const a = predicciones[i];
        const b = predicciones[j];
        suma += (Math.abs(a.home - b.home) + Math.abs(a.draw - b.draw) + Math.abs(a.away - b.away)) / 2;
        pares++;
      }
    }
    acuerdo = pares ? 1 - suma / pares : 1;
    if (acuerdo < 0.75) razones.push('Los modelos no coinciden entre ellos');
    else razones.push(`${predicciones.length} modelos con probabilidades parecidas`);
  } else {
    razones.push('Solo un modelo pudo predecir este partido');
    acuerdo = 0.5;
  }

  let porCalibracion = 0.5;
  if (calibracion.samples >= MIN_PARA_PESOS && calibracion.ece !== null) {
    porCalibracion = Math.max(0, 1 - calibracion.ece / 0.1);
    razones.push(`Calibración medida en ${calibracion.samples} partidos (ECE ${(calibracion.ece * 100).toFixed(1)} %)`);
  } else {
    razones.push('Sin backtest guardado: pesos repartidos por igual y calibración sin comprobar');
  }

  const valor = 9.5 * (0.4 * porMuestra + 0.35 * Math.max(0, acuerdo) + 0.25 * porCalibracion);
  return {
    value: Math.round(Math.min(9.5, Math.max(0, valor)) * 10) / 10,
    reasons: razones,
    sample: { home: playedHome, away: playedAway },
    agreement: Math.round(Math.max(0, acuerdo) * 100) / 100,
    ece: calibracion.ece,
  };
}
