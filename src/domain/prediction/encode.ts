/**
 * De las variables de un partido al vector numérico que comen los modelos de aprendizaje automático.
 *
 * Dos decisiones que se toman aquí y que conviene tener escritas:
 *
 *  - **El orden de las variables es fijo** (`FEATURE_ORDER`). Un modelo entrenado y su vector de
 *    entrada tienen que hablar del mismo sitio, y un orden implícito (las claves del objeto) se rompe
 *    en cuanto alguien añade un campo.
 *  - **Lo que la fuente no publicó se sustituye por la media de las filas de ENTRENAMIENTO** (y por 0
 *    si esa columna no tiene ningún valor). No es inventar un dato: el dato sigue siendo `null` en la
 *    base y en la interfaz. Es la decisión —documentada— de qué hacer con un hueco dentro del
 *    entrenamiento, porque un árbol o una red no saben leer `null`. Los modelos de goles (Poisson,
 *    Dixon-Coles, xG) no pasan por aquí: ellos se abstienen cuando les falta el dato.
 */
import type { Features } from './features';

export const FEATURE_ORDER: (keyof Features)[] = [
  'eloHome',
  'eloAway',
  'eloDiff',
  'playedHome',
  'playedAway',
  'playedHomeAtHome',
  'playedAwayAtAway',
  'ppgHome',
  'ppgAway',
  'ppgHomeAtHome',
  'ppgAwayAtAway',
  'gfHomeAtHome',
  'gaHomeAtHome',
  'gfAwayAtAway',
  'gaAwayAtAway',
  'form5Home',
  'form5Away',
  'gf5Home',
  'ga5Home',
  'gf5Away',
  'ga5Away',
  'xgForHome',
  'xgAgainstHome',
  'xgForAway',
  'xgAgainstAway',
  'shotsHome',
  'shotsAway',
  'sotHome',
  'sotAway',
  'possessionHome',
  'possessionAway',
  'cornersHome',
  'cornersAway',
  'cardsHome',
  'cardsAway',
  'restHome',
  'restAway',
  'h2hMatches',
  'h2hGoalDiff',
  'leagueGoals',
  'leagueHomeEdge',
];

/** Valores con los que se rellena cada hueco: la media de la columna en el entrenamiento. */
export type Imputer = Float64Array;

// `forEach` con una clave dinámica por variable y fila: 41 llamadas y 41 búsquedas de propiedad por
// partido. Los bucles planos hacen lo mismo sin el cierre intermedio.
const COLUMNAS = FEATURE_ORDER.length;

export function fitImputer(rows: { features: Features }[]): Imputer {
  const medias = new Float64Array(COLUMNAS);
  const cuentas = new Int32Array(COLUMNAS);
  for (let r = 0; r < rows.length; r++) {
    const f = rows[r].features;
    for (let i = 0; i < COLUMNAS; i++) {
      const v = f[FEATURE_ORDER[i]];
      if (typeof v === 'number' && Number.isFinite(v)) {
        medias[i] += v;
        cuentas[i]++;
      }
    }
  }
  for (let i = 0; i < COLUMNAS; i++) medias[i] = cuentas[i] ? medias[i] / cuentas[i] : 0;
  return medias;
}

export function encodeFeatures(f: Features, imputer: Imputer): Float64Array {
  const x = new Float64Array(COLUMNAS);
  for (let i = 0; i < COLUMNAS; i++) {
    const v = f[FEATURE_ORDER[i]];
    x[i] = typeof v === 'number' && Number.isFinite(v) ? v : imputer[i];
  }
  return x;
}

export const encodeAll = (rows: { features: Features }[], imputer: Imputer): Float64Array[] =>
  rows.map((r) => encodeFeatures(r.features, imputer));
