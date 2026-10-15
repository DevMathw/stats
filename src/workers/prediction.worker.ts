/**
 * Entrenamiento de los siete modelos FUERA del hilo de la interfaz.
 *
 * Por qué existe este archivo: entrenar con los ~9.800 partidos de esta base ocupa decenas de segundos
 * de CPU. Mientras duraba, la aplicación no repintaba, no respondía a un clic y el navegador podía
 * ofrecer cerrar la pestaña. Aquí dentro ese mismo trabajo no bloquea nada: la pantalla sigue viva y
 * puede enseñar en qué va.
 *
 * El worker no cambia ni un número. Llama a las mismas funciones del dominio (`trainEngine`,
 * `predictFixtures`, `runPredictionBacktest`), que siguen siendo puras y se siguen probando sin
 * navegador. Lo único que vive aquí es el paso de mensajes.
 *
 * **Guarda el motor entrenado** con la clave de los datos con los que se entrenó. Antes, pedir las
 * predicciones del lote y luego abrir la ficha de un partido entrenaba DOS veces lo mismo, porque cada
 * pantalla tenía su propio caché. Ahora hay uno solo: mientras no cambien los partidos, los parámetros
 * ni los modelos encendidos, no se vuelve a entrenar.
 */
import type { Fixture, League, Match, ModelParams } from '../types';
import {
  predictFixture,
  predictFixtures,
  trainEngine,
  type CalibrationState,
  type EnginePrediction,
  type FixturePrediction,
  type TrainedEngine,
} from '../domain/prediction/engine';
import { MODELS } from '../domain/prediction/models';
import { runPredictionBacktest } from '../domain/prediction/backtest';
import { summarizeBacktest, type ModelScores } from '../domain/prediction/evaluate';
import type { ModelId } from '../domain/prediction/types';

/** Lo que hace falta para entrenar. Viaja completo en cada petición: clonarlo cuesta mucho menos que entrenar. */
export interface DatosEntrenamiento {
  matches: Match[];
  leagues: League[];
  params: ModelParams;
  /** Modelos encendidos en Predicción → Modelos. */
  modelIds: ModelId[];
}

/** Lo que la pantalla de modelos necesita del backtest. Los registros partido a partido no cruzan: son medio millón de objetos y nadie los usa fuera. */
export interface ResumenBacktest {
  calibration: CalibrationState;
  scores: ModelScores[];
  common: { records: number; models: ModelScores[] };
  skipped: { id: ModelId; name: string; reason: string }[];
  evaluated: number;
  refits: number;
}

export type Peticion =
  | { tipo: 'lote'; id: number; clave: string; datos: DatosEntrenamiento; fixtures: Fixture[]; calibracion: CalibrationState }
  | { tipo: 'ficha'; id: number; clave: string; datos: DatosEntrenamiento; fixture: Fixture; calibracion: CalibrationState }
  | { tipo: 'backtest'; id: number; datos: DatosEntrenamiento };

export type Respuesta =
  | { tipo: 'lote'; id: number; predicciones: Map<string, EnginePrediction>; modelos: number }
  | { tipo: 'ficha'; id: number; prediccion: FixturePrediction }
  | { tipo: 'backtest'; id: number; resumen: ResumenBacktest }
  | { tipo: 'progreso'; id: number; texto: string }
  | { tipo: 'error'; id: number; mensaje: string };

/*
 * `lib` del proyecto es ES2023 + DOM, sin WebWorker, así que `self` no está tipado como worker. Dos
 * conversiones puntuales salen más baratas que meter la librería WebWorker y arrastrar sus choques con
 * DOM por todo el proyecto.
 */
const enviar = (r: Respuesta) => (globalThis as unknown as { postMessage(m: unknown): void }).postMessage(r);

/** Motor entrenado y la clave de los datos con los que se entrenó. */
let memoria: { clave: string; engine: TrainedEngine } | null = null;

function motor(clave: string, datos: DatosEntrenamiento): TrainedEngine {
  if (memoria?.clave === clave) return memoria.engine;
  const encendidos = new Set(datos.modelIds);
  const engine = trainEngine({
    matches: datos.matches,
    leagues: datos.leagues,
    params: datos.params,
    models: MODELS.filter((m) => encendidos.has(m.id)),
  });
  memoria = { clave, engine };
  return engine;
}

async function atender(p: Peticion): Promise<void> {
  if (p.tipo === 'lote') {
    const engine = motor(p.clave, p.datos);
    enviar({ tipo: 'lote', id: p.id, predicciones: predictFixtures(engine, p.fixtures, p.calibracion), modelos: engine.fitted.length });
    return;
  }
  if (p.tipo === 'ficha') {
    enviar({ tipo: 'ficha', id: p.id, prediccion: predictFixture(motor(p.clave, p.datos), p.fixture, p.calibracion) });
    return;
  }
  const encendidos = new Set(p.datos.modelIds);
  const r = await runPredictionBacktest({
    matches: p.datos.matches,
    leagues: p.datos.leagues,
    params: p.datos.params,
    models: MODELS.filter((m) => encendidos.has(m.id)),
    onProgress: (hecho, total, etapa) => {
      enviar({ tipo: 'progreso', id: p.id, texto: `${Math.round((100 * hecho) / total)} % · ${etapa}` });
    },
  });
  const resumen = summarizeBacktest(r);
  enviar({
    tipo: 'backtest',
    id: p.id,
    resumen: {
      calibration: r.calibration,
      scores: resumen.models,
      common: resumen.common,
      skipped: r.skipped,
      evaluated: r.evaluated,
      refits: r.refits,
    },
  });
}

globalThis.addEventListener('message', (e: Event) => {
  const p = (e as MessageEvent<Peticion>).data;
  atender(p).catch((err: unknown) => enviar({ tipo: 'error', id: p.id, mensaje: (err as Error).message }));
});
