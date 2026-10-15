/**
 * Contrato del motor de predicción: qué es un modelo y qué devuelve.
 *
 * Todos los modelos se entrenan y se consultan igual, así que activar, desactivar o añadir uno no
 * cambia nada del resto del motor. Un modelo que no tenga datos suficientes para entrenarse DEVUELVE
 * `null` y se queda fuera de esa predicción, con el motivo escrito: nunca predice con datos inventados.
 */
import type { League, Match, ModelParams, Probabilities1X2 } from '../../types';
import type { Features, SampleRow } from './features';

export type ModelId = 'poisson' | 'dixonColes' | 'elo' | 'xg' | 'randomForest' | 'boosting' | 'neuralNet';

/** Líneas de Over/Under que publica el motor. */
export const OVER_LINES = [1.5, 2.5, 3.5] as const;
export type OverLine = (typeof OVER_LINES)[number];

/** Lo que produce un modelo para un partido. `null` en lo que ese modelo no sabe calcular. */
export interface MarketProbabilities {
  probs1x2: Probabilities1X2;
  /**
   * Probabilidad de que se superen los goles de cada línea. Un modelo solo rellena las que sabe
   * calcular: los de goles dan las tres y los de aprendizaje automático solo la 2.5, que es la que se
   * entrena como clasificación. Lo que no está no se deriva a ojo.
   */
  over: Partial<Record<OverLine, number>>;
  /** Ambos equipos marcan. */
  btts: number | null;
  /** Goles esperados de cada equipo. */
  expectedGoals: { home: number; away: number } | null;
  /** Marcadores más probables, de mayor a menor. */
  scorelines: { score: string; probability: number }[] | null;
}

export interface ModelPrediction extends MarketProbabilities {
  modelId: ModelId;
}

/** Datos disponibles para entrenar: TODOS anteriores a `cutoff`. */
export interface TrainingContext {
  /** Filas del dataset anteriores al corte, en orden cronológico. */
  rows: SampleRow[];
  /** Partidos anteriores al corte. */
  matches: Match[];
  leagues: League[];
  params: ModelParams;
  /** Fecha del corte (`YYYY-MM-DD`): nada de esta fecha o posterior ha entrado. */
  cutoff: string;
  /**
   * Trabajo que varios modelos necesitan igual en ESTE corte (dataset codificado, tramos del
   * histograma, fuerzas por goles). Lo llena quien lo pide, vive y muere con el corte, y si no está
   * cada modelo lo calcula por su cuenta: nunca cambia el resultado, solo cuántas veces se calcula.
   */
  cache?: Map<string, unknown>;
}

export interface PredictInput {
  leagueId: string;
  homeTeamId: string;
  awayTeamId: string;
  date: string;
  features: Features;
}

export interface FittedModel {
  id: ModelId;
  /** Partidos con los que se entrenó. */
  trained: number;
  /** Aviso cuando el modelo se entrenó con lo justo, o se quedó sin una parte de las competiciones. */
  note: string | null;
  /** `null` si a ESTE partido no puede responder (equipo desconocido, sin xG…). */
  predict(input: PredictInput): MarketProbabilities | null;
}

export interface PredictionModel {
  id: ModelId;
  name: string;
  /** Qué hace y qué necesita, en una línea, para la interfaz. */
  description: string;
  /** Partidos mínimos para que entrenarlo tenga sentido. Por debajo, `fit` devuelve `null`. */
  minMatches: number;
  fit(ctx: TrainingContext): FittedModel | null;
}

/** Resultado real de un partido, como lo ve el motor. */
export type Outcome1X2 = '1' | 'X' | '2';

export const OUTCOMES: Outcome1X2[] = ['1', 'X', '2'];

export const probabilityOf = (p: Probabilities1X2, outcome: Outcome1X2): number =>
  outcome === '1' ? p.home : outcome === 'X' ? p.draw : p.away;

/** Normaliza tres probabilidades para que sumen 1 sin que ninguna sea 0. */
export function normalize1X2(home: number, draw: number, away: number): Probabilities1X2 {
  const h = Math.max(1e-6, home);
  const d = Math.max(1e-6, draw);
  const a = Math.max(1e-6, away);
  const total = h + d + a;
  return { home: h / total, draw: d / total, away: a / total };
}
