/**
 * Los modelos del motor, todos con el mismo contrato (`PredictionModel`).
 *
 * Cada uno declara cuántos partidos necesita y devuelve `null` si no los tiene: un modelo sin datos se
 * queda fuera de la predicción y el motivo se enseña, en vez de rellenar con supuestos.
 *
 * Qué mira cada uno:
 *   - `poisson`     goles marcados y encajados por condición, contraídos a la media de la liga.
 *   - `dixonColes`  lo mismo por máxima verosimilitud, con corrección de marcadores bajos y memoria corta.
 *   - `elo`         solo resultados: rating dinámico con ventaja de campo y curva del empate medidas.
 *   - `xg`          igual que Poisson pero con xG a favor y en contra: mide ocasiones, no suerte.
 *   - `randomForest`, `boosting`, `neuralNet`: las 41 variables de `features.ts` a la vez.
 *
 * Los tres de aprendizaje automático entrenan tres cosas: 1X2 (tres clases), Over 2.5 y BTTS. No se
 * entrena una clasificación por cada línea de goles porque con este histórico la muestra no da para
 * tantas; las líneas 1.5 y 3.5 las aportan los modelos de goles.
 */
import type { League, Match } from '../../types';
import { shrinkToLeagueMean } from '../probability/shrink';
import { dixonColesProbabilities, poissonProbabilities } from './goalModels';
import { encodeAll, encodeFeatures, fitImputer, type Imputer } from './encode';
import { calibrateHomeAdvantage, elo1X2, fitDrawCurve, type DrawCurve } from './elo';
import { fitDixonColes, lambdas, MIN_PARTIDOS as MIN_DC, type DixonColesFit } from './dixonColes';
import { prepareBins, predictBoosting, predictForest, trainBoostingBinned, trainRandomForestBinned, type Binned, type BoostingModel, type RandomForestModel } from './ml/tree';
import { predictNeuralNet, trainNeuralNet, type NeuralModel } from './ml/neuralNet';
import { normalize1X2, type FittedModel, type MarketProbabilities, type PredictionModel, type TrainingContext } from './types';
import type { SampleRow } from './features';

/** Filas con menos partidos previos que esto no entrenan: sus variables son ruido. */
export const MIN_PARTIDOS_EQUIPO = 3;

/**
 * Lo que varios modelos necesitan igual dentro de un mismo corte, calculado una sola vez.
 *
 * Tres modelos pedían el mismo dataset codificado y dos los mismos tramos del histograma; Poisson y xG
 * calculaban las mismas fuerzas por goles. Con 9.845 partidos eso era codificar 41 variables tres veces
 * y ordenar 41 columnas dos veces por corte. El caché vive en el contexto de entrenamiento, así que se
 * tira solo al acabar el corte y un contexto sin caché sigue funcionando igual, solo más despacio.
 */
const compartido = <T,>(ctx: TrainingContext, clave: string, fn: () => T): T => {
  if (!ctx.cache) return fn();
  if (!ctx.cache.has(clave)) ctx.cache.set(clave, fn());
  return ctx.cache.get(clave) as T;
};

const util = (r: SampleRow) => r.features.playedHome >= MIN_PARTIDOS_EQUIPO && r.features.playedAway >= MIN_PARTIDOS_EQUIPO;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// ---------------------------------------------------------------------------
// Modelos de goles
// ---------------------------------------------------------------------------

interface FuerzaLiga {
  /** Medias de la liga por condición. */
  homeFor: number;
  awayFor: number;
  /** Equipo → fuerza de ataque y defensa por condición, ya contraídas. */
  attackHome: Map<string, number>;
  defenseHome: Map<string, number>;
  attackAway: Map<string, number>;
  defenseAway: Map<string, number>;
  matches: number;
}

/**
 * Fuerzas de ataque y defensa de una liga a partir de una cifra por partido (goles o xG).
 *
 * `valor(m)` devuelve lo que marcó cada equipo en ese partido, o `null` si no está publicado. Cada
 * media de equipo se contrae hacia la de la liga con `shrinkToLeagueMean`, que es lo que evita que
 * tres partidos afortunados conviertan a un equipo en el mejor ataque de la competición.
 */
function fuerzas(matches: Match[], kShrink: number, valor: (m: Match) => { home: number; away: number } | null): FuerzaLiga | null {
  const local = new Map<string, { for: number; against: number; n: number }>();
  const visitante = new Map<string, { for: number; against: number; n: number }>();
  let sumaLocal = 0;
  let sumaVisitante = 0;
  let n = 0;

  for (const m of matches) {
    const v = valor(m);
    if (!v) continue;
    const l = local.get(m.homeTeamId) ?? { for: 0, against: 0, n: 0 };
    l.for += v.home;
    l.against += v.away;
    l.n++;
    local.set(m.homeTeamId, l);
    const vi = visitante.get(m.awayTeamId) ?? { for: 0, against: 0, n: 0 };
    vi.for += v.away;
    vi.against += v.home;
    vi.n++;
    visitante.set(m.awayTeamId, vi);
    sumaLocal += v.home;
    sumaVisitante += v.away;
    n++;
  }
  if (n === 0) return null;

  const mediaLocal = sumaLocal / n;
  const mediaVisitante = sumaVisitante / n;
  if (mediaLocal <= 0 || mediaVisitante <= 0) return null;

  const fuerza = (m: Map<string, { for: number; against: number; n: number }>, campo: 'for' | 'against', media: number) => {
    const out = new Map<string, number>();
    for (const [id, x] of m) {
      const propio = x[campo] / x.n;
      out.set(id, clamp(shrinkToLeagueMean(propio, x.n, media, kShrink) / media, 0.25, 4));
    }
    return out;
  };

  return {
    homeFor: mediaLocal,
    awayFor: mediaVisitante,
    attackHome: fuerza(local, 'for', mediaLocal),
    defenseHome: fuerza(local, 'against', mediaVisitante),
    attackAway: fuerza(visitante, 'for', mediaVisitante),
    defenseAway: fuerza(visitante, 'against', mediaLocal),
    matches: n,
  };
}

/** λ de un enfrentamiento. `null` si alguno de los dos equipos no tiene datos en esa liga. */
function lambdasDeFuerzas(f: FuerzaLiga, homeTeamId: string, awayTeamId: string): { home: number; away: number } | null {
  const ataqueLocal = f.attackHome.get(homeTeamId);
  const defensaLocal = f.defenseHome.get(homeTeamId);
  const ataqueVisitante = f.attackAway.get(awayTeamId);
  const defensaVisitante = f.defenseAway.get(awayTeamId);
  if (ataqueLocal === undefined || defensaLocal === undefined || ataqueVisitante === undefined || defensaVisitante === undefined) return null;
  return {
    home: clamp(f.homeFor * ataqueLocal * defensaVisitante, 0.05, 8),
    away: clamp(f.awayFor * ataqueVisitante * defensaLocal, 0.05, 8),
  };
}

const porLiga = (matches: Match[]): Map<string, Match[]> => {
  const m = new Map<string, Match[]>();
  for (const x of matches) (m.get(x.leagueId) ?? m.set(x.leagueId, []).get(x.leagueId)!).push(x);
  return m;
};

const ligasDe = (ctx: TrainingContext) => compartido(ctx, 'porLiga', () => porLiga(ctx.matches));

/** Fuerzas por goles de cada competición: las piden Poisson y xG, con los mismos parámetros. */
const fuerzasPorGoles = (ctx: TrainingContext): Map<string, FuerzaLiga | null> =>
  compartido(ctx, 'fuerzasGoles', () => {
    const out = new Map<string, FuerzaLiga | null>();
    for (const [id, ms] of ligasDe(ctx)) out.set(id, fuerzas(ms, ctx.params.kShrink, golesDe));
    return out;
  });

const golesDe = (m: Match) => (m.homeGoals === null || m.awayGoals === null ? null : { home: m.homeGoals, away: m.awayGoals });
const xgDe = (m: Match) => (m.xGHome === null || m.xGAway === null ? null : { home: m.xGHome, away: m.xGAway });

/** Modelo Poisson clásico: fuerzas por condición y marcadores independientes. */
export const poissonModel: PredictionModel = {
  id: 'poisson',
  name: 'Poisson',
  description: 'Goles marcados y encajados por condición, contraídos a la media de la liga. Marcadores independientes.',
  minMatches: 20,
  fit(ctx: TrainingContext): FittedModel | null {
    if (ctx.matches.length < this.minMatches) return null;
    const ligas = new Map<string, FuerzaLiga>();
    for (const [id, f] of fuerzasPorGoles(ctx)) {
      if (f && f.matches >= this.minMatches) ligas.set(id, f);
    }
    if (ligas.size === 0) return null;
    return {
      id: this.id,
      trained: ctx.matches.length,
      note: null,
      predict(input) {
        const f = ligas.get(input.leagueId);
        if (!f) return null;
        const l = lambdasDeFuerzas(f, input.homeTeamId, input.awayTeamId);
        return l ? poissonProbabilities(l.home, l.away) : null;
      },
    };
  },
};

/** Dixon-Coles: máxima verosimilitud con corrección de marcadores bajos y peso temporal. */
export const dixonColesModel: PredictionModel = {
  id: 'dixonColes',
  name: 'Dixon-Coles',
  description: 'Poisson ajustado por máxima verosimilitud, con corrección de 0-0/1-0/0-1/1-1 y memoria que decae con el tiempo.',
  minMatches: MIN_DC,
  fit(ctx: TrainingContext): FittedModel | null {
    const ligas = new Map<string, DixonColesFit>();
    const sinAjuste: string[] = [];
    const corte = Date.parse(ctx.cutoff);
    for (const [id, ms] of ligasDe(ctx)) {
      const entrada = ms
        .filter((m) => m.homeGoals !== null && m.awayGoals !== null)
        .map((m) => ({
          homeTeamId: m.homeTeamId,
          awayTeamId: m.awayTeamId,
          homeGoals: m.homeGoals!,
          awayGoals: m.awayGoals!,
          ageDays: Math.max(0, (corte - Date.parse(m.date)) / 86_400_000),
        }));
      const fit = fitDixonColes(entrada);
      if (fit) ligas.set(id, fit);
      else sinAjuste.push(id);
    }
    if (ligas.size === 0) return null;
    return {
      id: this.id,
      trained: ctx.matches.length,
      note: sinAjuste.length ? `${sinAjuste.length} competiciones sin ajuste: menos de ${MIN_DC} partidos` : null,
      predict(input) {
        const fit = ligas.get(input.leagueId);
        if (!fit) return null;
        const l = lambdas(fit, input.homeTeamId, input.awayTeamId);
        return l ? dixonColesProbabilities(l.home, l.away, fit.rho) : null;
      },
    };
  },
};

/** Elo: rating dinámico. Da 1X2 y no goles. */
export const eloModel: PredictionModel = {
  id: 'elo',
  name: 'Elo',
  description: 'Rating que sube y baja partido a partido, con el margen de goles dentro. Ventaja de campo y curva del empate medidas en el histórico.',
  minMatches: 100,
  fit(ctx: TrainingContext): FittedModel | null {
    const filas = ctx.rows.filter(util);
    if (filas.length < this.minMatches) return null;
    const ventaja = calibrateHomeAdvantage(filas.map((r) => r.labels));
    const curva: DrawCurve = fitDrawCurve(filas.map((r) => ({ diff: r.features.eloDiff + ventaja, result: r.labels.result })));
    return {
      id: this.id,
      trained: filas.length,
      note: `ventaja de campo medida: ${ventaja} puntos de Elo`,
      predict(input) {
        const p = elo1X2(input.features.eloDiff + ventaja, curva);
        return {
          probs1x2: normalize1X2(p.home, p.draw, p.away),
          over: {},
          btts: null,
          expectedGoals: null,
          scorelines: null,
        };
      },
    };
  },
};

/** xG: las mismas fuerzas, pero medidas en ocasiones en vez de en goles. */
export const xgModel: PredictionModel = {
  id: 'xg',
  name: 'xG',
  description: 'Fuerzas de ataque y defensa calculadas con xG a favor y en contra: mide las ocasiones creadas, no el acierto puntual.',
  minMatches: 20,
  fit(ctx: TrainingContext): FittedModel | null {
    const ligas = new Map<string, { xg: FuerzaLiga; goles: FuerzaLiga }>();
    const sinXg: string[] = [];
    const golesPorLiga = fuerzasPorGoles(ctx);
    for (const [id, ms] of ligasDe(ctx)) {
      const xg = fuerzas(ms, ctx.params.kShrink, xgDe);
      const goles = golesPorLiga.get(id) ?? null;
      // La escala son los goles reales de la liga: el xG dice quién crea más, no cuántos goles caen.
      if (xg && goles && xg.matches >= this.minMatches) ligas.set(id, { xg, goles });
      else sinXg.push(id);
    }
    if (ligas.size === 0) return null;
    return {
      id: this.id,
      trained: ctx.matches.length,
      note: sinXg.length ? `${sinXg.length} competiciones sin xG suficiente` : null,
      predict(input) {
        const f = ligas.get(input.leagueId);
        if (!f) return null;
        const l = lambdasDeFuerzas(f.xg, input.homeTeamId, input.awayTeamId);
        if (!l) return null;
        // Se reescala de xG a goles con la media real de la liga.
        const escalaLocal = f.goles.homeFor / f.xg.homeFor;
        const escalaVisitante = f.goles.awayFor / f.xg.awayFor;
        return poissonProbabilities(clamp(l.home * escalaLocal, 0.05, 8), clamp(l.away * escalaVisitante, 0.05, 8));
      },
    };
  },
};

// ---------------------------------------------------------------------------
// Aprendizaje automático
// ---------------------------------------------------------------------------

/** Mínimo de filas para que entrenar un modelo con 41 variables no sea un ejercicio de memorización. */
export const MIN_FILAS_ML = 300;

const CLASES_1X2 = ['1', 'X', '2'] as const;

interface EntrenamientoML {
  imputer: Imputer;
  X: Float64Array[];
  resultado: Int32Array;
  over25: Int32Array;
  btts: Int32Array;
  filas: number;
}

function prepararML(rows: SampleRow[]): EntrenamientoML | null {
  const filas = rows.filter(util);
  if (filas.length < MIN_FILAS_ML) return null;
  const imputer = fitImputer(filas);
  return {
    imputer,
    X: encodeAll(filas, imputer),
    resultado: Int32Array.from(filas, (r) => CLASES_1X2.indexOf(r.labels.result)),
    over25: Int32Array.from(filas, (r) => (r.labels.totalGoals > 2.5 ? 1 : 0)),
    btts: Int32Array.from(filas, (r) => r.labels.btts),
    filas: filas.length,
  };
}

/** El dataset codificado, una vez por corte para los tres modelos que lo usan. */
const datosML = (ctx: TrainingContext): EntrenamientoML | null => compartido(ctx, 'ml', () => prepararML(ctx.rows));

/** Los tramos del histograma, una vez por corte para el bosque y el boosting. */
const tramosML = (ctx: TrainingContext, X: Float64Array[]): Binned => compartido(ctx, 'bins', () => prepareBins(X));

/** Etiquetas one-hot en una tabla plana, que es lo que comen los árboles. */
function oneHot(y: Int32Array, k: number): Float64Array {
  const out = new Float64Array(y.length * k);
  for (let i = 0; i < y.length; i++) out[i * k + y[i]] = 1;
  return out;
}

/** Empaqueta lo que devuelven los tres modelos de clasificación en el formato del motor. */
const salidaML = (p1x2: Float64Array, over25: number | null, btts: number | null): MarketProbabilities => ({
  probs1x2: normalize1X2(p1x2[0], p1x2[1], p1x2[2]),
  over: over25 === null ? {} : { 2.5: over25 },
  btts,
  expectedGoals: null,
  scorelines: null,
});

export const randomForestModel: PredictionModel = {
  id: 'randomForest',
  name: 'Random Forest',
  description: 'Bosque de 120 árboles sobre las 41 variables, con muestreo bootstrap. Vota 1X2, Over 2.5 y BTTS.',
  minMatches: MIN_FILAS_ML,
  fit(ctx: TrainingContext): FittedModel | null {
    const d = datosML(ctx);
    if (!d) return null;
    const opciones = { trees: 120, maxDepth: 8, minSamplesLeaf: 8, seed: 20260919 };
    // Los tramos se calculan una vez y los comparten los tres bosques y el boosting.
    const datos = tramosML(ctx, d.X);
    const m1x2: RandomForestModel = trainRandomForestBinned(datos, d.X.length, oneHot(d.resultado, 3), 3, opciones);
    const mOver: RandomForestModel = trainRandomForestBinned(datos, d.X.length, oneHot(d.over25, 2), 2, opciones);
    const mBtts: RandomForestModel = trainRandomForestBinned(datos, d.X.length, oneHot(d.btts, 2), 2, opciones);
    const imputer = d.imputer;
    return {
      id: this.id,
      trained: d.filas,
      note: null,
      predict(input) {
        const x = encodeFeatures(input.features, imputer);
        return salidaML(predictForest(m1x2, x), predictForest(mOver, x)[1], predictForest(mBtts, x)[1]);
      },
    };
  },
};

export const boostingModel: PredictionModel = {
  id: 'boosting',
  name: 'Gradient Boosting',
  description: 'Árboles en cadena (el esquema de XGBoost: pérdida logarítmica y árboles sobre el gradiente) para 1X2, Over 2.5 y BTTS.',
  minMatches: MIN_FILAS_ML,
  fit(ctx: TrainingContext): FittedModel | null {
    const d = datosML(ctx);
    if (!d) return null;
    const opciones = { rounds: 80, learningRate: 0.1, maxDepth: 3, minSamplesLeaf: 12, subsample: 0.8, seed: 20260919 };
    const datos = tramosML(ctx, d.X);
    const m1x2: BoostingModel = trainBoostingBinned(datos, d.X, d.resultado, 3, opciones);
    const mOver: BoostingModel = trainBoostingBinned(datos, d.X, d.over25, 2, opciones);
    const mBtts: BoostingModel = trainBoostingBinned(datos, d.X, d.btts, 2, opciones);
    const imputer = d.imputer;
    return {
      id: this.id,
      trained: d.filas,
      note: null,
      predict(input) {
        const x = encodeFeatures(input.features, imputer);
        return salidaML(predictBoosting(m1x2, x), predictBoosting(mOver, x)[1], predictBoosting(mBtts, x)[1]);
      },
    };
  },
};

export const neuralNetModel: PredictionModel = {
  id: 'neuralNet',
  name: 'Red neuronal',
  description: 'Perceptrón con una capa oculta de 12 neuronas, regularización y parada temprana. Busca relaciones no lineales entre las variables.',
  minMatches: MIN_FILAS_ML,
  fit(ctx: TrainingContext): FittedModel | null {
    const d = datosML(ctx);
    if (!d) return null;
    const m1x2: NeuralModel = trainNeuralNet(d.X, d.resultado, 3);
    const mOver: NeuralModel = trainNeuralNet(d.X, d.over25, 2);
    const mBtts: NeuralModel = trainNeuralNet(d.X, d.btts, 2);
    const imputer = d.imputer;
    return {
      id: this.id,
      trained: d.filas,
      note: `parada temprana en la época ${m1x2.epochsUsed} (1X2)`,
      predict(input) {
        const x = encodeFeatures(input.features, imputer);
        return salidaML(predictNeuralNet(m1x2, x), predictNeuralNet(mOver, x)[1], predictNeuralNet(mBtts, x)[1]);
      },
    };
  },
};

/** Todos los modelos, en el orden en que se enseñan. */
export const MODELS: PredictionModel[] = [poissonModel, dixonColesModel, eloModel, xgModel, randomForestModel, boostingModel, neuralNetModel];

export const modelById = (id: string): PredictionModel | undefined => MODELS.find((m) => m.id === id);

/** Partidos de las competiciones cargadas, para el contexto de entrenamiento. */
export const leaguesOf = (leagues: League[]): Map<string, League> => new Map(leagues.map((l) => [l.id, l]));
