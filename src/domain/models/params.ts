import type { ModelParams } from '../../types';

/**
 * CONFIGURACION!C12:C20 del libro, salvo K_SHRINK: 10 en vez de 5. Medido el 18/09/2026 en walk-forward sobre 1.267
 * partidos, con 10 mejoran goles, Over 2.5, BTTS, corners y tarjetas; 3 empeora y 15–20 dan lo mismo que 10. Con una
 * sola temporada las medias de cada equipo tienen mucho ruido. MODEL_MAPPING.md §11.
 */
export const DEFAULT_MODEL_PARAMS: ModelParams = {
  wBase: 0.45,
  wForm5: 0.2,
  wForm10: 0.15,
  wXg: 0.2,
  kShrink: 10,
  wH2h: 0.1,
  wSos: 0.06,
  kLogistic: 1.1,
  kDrawDecay: 0.5,
  xgMissingMode: 'documented',
  statAverageMode: 'muestra',
  formWindowMode: 'fecha',
  oneXTwoMode: 'poisson',
  xgStrengthMode: 'favorContra',
  projectionSource: 'mixto',
  priorMode: 'historico',
  kPrior: 10,
};

/** Parámetros que eligen un método en vez de un número. */
export type ModeParam =
  | 'xgMissingMode'
  | 'statAverageMode'
  | 'formWindowMode'
  | 'oneXTwoMode'
  | 'xgStrengthMode'
  | 'projectionSource'
  | 'priorMode';

type NumericParam = keyof Omit<ModelParams, ModeParam>;

export const PARAM_LABELS: Record<NumericParam, string> = {
  wBase: 'Peso: fuerza ofensiva/defensiva de toda la temporada (local en casa / visitante fuera)',
  wForm5: 'Peso: forma en los últimos 5 partidos',
  wForm10: 'Peso: forma en los últimos 10 partidos',
  wXg: 'Peso: xG/xGA cuando el proveedor lo reporta',
  kShrink: 'Partidos de contracción bayesiana hacia el promedio de la liga',
  kPrior: 'Partidos de histórico para que el propio equipo pese la mitad frente a la liga',
  wH2h: 'Ajuste secundario máximo (±) por enfrentamientos directos (H2H)',
  wSos: 'Ajuste secundario máximo (±) por calidad de los rivales (Strength of Schedule)',
  kLogistic: 'Pendiente de la curva logística que reparte Victoria/Derrota (solo con el 1X2 del libro)',
  kDrawDecay: 'Decaimiento del empate al crecer la diferencia de goles esperados (solo con el 1X2 del libro)',
};

/** Nombre del parámetro tal y como está definido en el libro. */
export const PARAM_EXCEL_NAMES: Record<NumericParam, string> = {
  wBase: 'W_BASE',
  wForm5: 'W_FORM5',
  wForm10: 'W_FORM10',
  wXg: 'W_XG',
  kShrink: 'K_SHRINK',
  kPrior: 'K_PRIOR',
  wH2h: 'W_H2H',
  wSos: 'W_SOS',
  kLogistic: 'K_LOGISTIC',
  kDrawDecay: 'K_DRAWDECAY',
};

export interface WeightValidation {
  sum: number;
  valid: boolean;
  message: string | null;
}

/** El enunciado exige avisar si W_BASE + W_FORM5 + W_FORM10 + W_XG ≠ 1. */
export function validateWeights(p: ModelParams): WeightValidation {
  const sum = p.wBase + p.wForm5 + p.wForm10 + p.wXg;
  const valid = Math.abs(sum - 1) < 1e-9;
  return {
    sum,
    valid,
    message: valid
      ? null
      : `Los pesos suman ${sum.toFixed(3)} en vez de 1. El modelo normaliza dividiendo por la ` +
        `suma (igual que el Excel), así que sigue funcionando, pero la escala de los pesos ` +
        `deja de ser directamente interpretable.`,
  };
}
