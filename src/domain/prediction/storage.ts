/**
 * Cómo se guarda lo que midió el backtest (pesos, calibración y métricas) entre sesiones.
 *
 * El backtest tarda un par de minutos: repetirlo en cada arranque para volver a saber lo mismo no tiene
 * sentido. Se guarda su resultado en los ajustes de la aplicación, junto con CUÁNDO se midió y con
 * cuántos partidos, para que la interfaz pueda decir si está al día. Los `Map` no sobreviven a un JSON,
 * así que aquí se convierten a listas y se reconstruyen al leer.
 */
import type { ModelScores } from './evaluate';
import type { CalibrationState } from './engine';
import type { ModelId } from './types';
import type { Calibration1X2, CalibrationBinary } from './calibration';

/** Lo que se guarda en los ajustes. Todo son datos planos. */
export interface StoredPrediction {
  version: 1;
  measuredAt: string;
  /** Partidos evaluados en el backtest. */
  samples: number;
  matchesAtRun: number;
  ece: number | null;
  weights1x2: [ModelId, number][];
  weightsOver: [ModelId, number][];
  weightsBtts: [ModelId, number][];
  calibration1x2: [ModelId, Calibration1X2][];
  calibrationOver: [ModelId, CalibrationBinary][];
  calibrationBtts: [ModelId, CalibrationBinary][];
  /** Tabla de comparación, tal como se enseñó, para no tener que recalcularla. */
  scores: ModelScores[];
  /** Comparación cara a cara (solo partidos que respondieron todos). */
  common: { records: number; models: ModelScores[] };
  /** Modelos que no pudieron entrenarse y por qué. */
  skipped: { id: ModelId; name: string; reason: string }[];
}

export const SETTINGS_KEY = 'predictionRun';

export function toStored(input: {
  calibration: CalibrationState;
  scores: ModelScores[];
  common: { records: number; models: ModelScores[] };
  skipped: { id: ModelId; name: string; reason: string }[];
  matchesAtRun: number;
}): StoredPrediction {
  const c = input.calibration;
  return {
    version: 1,
    measuredAt: c.measuredAt ?? new Date().toISOString(),
    samples: c.samples,
    matchesAtRun: input.matchesAtRun,
    ece: c.ece,
    weights1x2: [...c.weights1x2],
    weightsOver: [...c.weightsOver],
    weightsBtts: [...c.weightsBtts],
    calibration1x2: [...c.calibration1x2],
    calibrationOver: [...c.calibrationOver],
    calibrationBtts: [...c.calibrationBtts],
    scores: input.scores,
    common: input.common,
    skipped: input.skipped,
  };
}

export function fromStored(s: StoredPrediction | null | undefined): CalibrationState | null {
  if (!s || s.version !== 1) return null;
  return {
    weights1x2: new Map(s.weights1x2),
    weightsOver: new Map(s.weightsOver),
    weightsBtts: new Map(s.weightsBtts),
    calibration1x2: new Map(s.calibration1x2),
    calibrationOver: new Map(s.calibrationOver),
    calibrationBtts: new Map(s.calibrationBtts),
    samples: s.samples,
    ece: s.ece,
    measuredAt: s.measuredAt,
  };
}
