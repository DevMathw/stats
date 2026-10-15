/**
 * Lado de la interfaz del worker de predicción: una promesa por petición.
 *
 * Un solo worker, creado la primera vez que se usa y reutilizado: es él quien guarda el motor
 * entrenado, así que crear uno nuevo por pantalla tiraría ese caché. En esta máquina hay dos núcleos,
 * así que repartir el entrenamiento entre varios workers no compraría casi nada y sí quitaría CPU al
 * hilo que pinta; con más núcleos, el sitio natural para paralelizar son los cortes del backtest, que
 * se entrenan de forma independiente.
 */
import type { Fixture, Match, ModelParams } from '../types';
import type { CalibrationState, EnginePrediction, FixturePrediction } from '../domain/prediction/engine';
import type { ModelId } from '../domain/prediction/types';
import type { DatosEntrenamiento, Peticion, Respuesta, ResumenBacktest } from './prediction.worker';

export type { ResumenBacktest } from './prediction.worker';

/**
 * Qué datos tiene detrás un entrenamiento. Si no cambia, el worker no vuelve a entrenar.
 *
 * La calculan igual las dos pantallas que piden predicciones, así que la ficha de un partido reutiliza
 * el entrenamiento del lote y al revés.
 */
export const clavePrediccion = (matches: Match[], params: ModelParams, modelIds: ModelId[]): string =>
  `${matches.length}|${matches.at(-1)?.updatedAt ?? ''}|${JSON.stringify(params)}|${[...modelIds].sort().join(',')}`;

/** `Omit` sobre una union se queda con las claves comunes; esto la reparte y conserva cada variante. */
type SinId<T> = T extends { id: number } ? Omit<T, 'id'> : never;

interface Pendiente {
  resolver: (r: Respuesta) => void;
  rechazar: (e: Error) => void;
  progreso?: (texto: string) => void;
}

let worker: Worker | null = null;
let siguienteId = 0;
const pendientes = new Map<number, Pendiente>();

function arrancar(): Worker {
  if (worker) return worker;
  const w = new Worker(new URL('./prediction.worker.ts', import.meta.url), { type: 'module' });
  w.addEventListener('message', (e: MessageEvent<Respuesta>) => {
    const r = e.data;
    const p = pendientes.get(r.id);
    if (!p) return;
    if (r.tipo === 'progreso') return p.progreso?.(r.texto);
    pendientes.delete(r.id);
    if (r.tipo === 'error') p.rechazar(new Error(r.mensaje));
    else p.resolver(r);
  });
  w.addEventListener('error', (e: ErrorEvent) => {
    // Un fallo del worker deja a todos los que esperan sin respuesta: hay que contárselo a los dos.
    const error = new Error(e.message || 'el entrenamiento se interrumpió');
    for (const [, p] of pendientes) p.rechazar(error);
    pendientes.clear();
    worker = null;
  });
  worker = w;
  return w;
}

function pedir(peticion: SinId<Peticion>, progreso?: (texto: string) => void): Promise<Respuesta> {
  const id = ++siguienteId;
  return new Promise<Respuesta>((resolver, rechazar) => {
    pendientes.set(id, { resolver, rechazar, progreso });
    arrancar().postMessage({ ...peticion, id } as Peticion);
  });
}

/** Predicciones de todos los partidos pendientes. */
export async function predecirLote(
  datos: DatosEntrenamiento,
  fixtures: Fixture[],
  calibracion: CalibrationState,
): Promise<{ predicciones: Map<string, EnginePrediction>; modelos: number }> {
  const clave = clavePrediccion(datos.matches, datos.params, datos.modelIds);
  const r = await pedir({ tipo: 'lote', clave, datos, fixtures, calibracion });
  if (r.tipo !== 'lote') throw new Error('respuesta inesperada del worker');
  return { predicciones: r.predicciones, modelos: r.modelos };
}

/** Lo que dice cada modelo de UN partido, para su ficha. */
export async function predecirFicha(
  datos: DatosEntrenamiento,
  fixture: Fixture,
  calibracion: CalibrationState,
): Promise<FixturePrediction> {
  const clave = clavePrediccion(datos.matches, datos.params, datos.modelIds);
  const r = await pedir({ tipo: 'ficha', clave, datos, fixture, calibracion });
  if (r.tipo !== 'ficha') throw new Error('respuesta inesperada del worker');
  return r.prediccion;
}

/** Backtest temporal completo. `progreso` se llama entre cortes. */
export async function medirModelos(datos: DatosEntrenamiento, progreso?: (texto: string) => void): Promise<ResumenBacktest> {
  const r = await pedir({ tipo: 'backtest', datos }, progreso);
  if (r.tipo !== 'backtest') throw new Error('respuesta inesperada del worker');
  return r.resumen;
}
