/**
 * Ensemble: cómo se combinan los modelos.
 *
 * Los pesos NO se ponen a mano. Salen de minimizar la log loss de la propia mezcla sobre las
 * predicciones que los modelos ya hicieron en el pasado (las del backtest), con dos condiciones que
 * hacen honesto el resultado:
 *
 *  1. **Los pesos de un partido solo se calculan con predicciones ANTERIORES a su fecha.** Si se
 *     ajustaran con todo el histórico, el ensemble sabría qué modelo acertó en el partido que está
 *     prediciendo.
 *  2. **Hasta que hay bastantes partidos anteriores** (`MIN_PARA_PESOS`), no hay pesos que medir y se
 *     reparte por igual entre los modelos que respondan. Es lo que se hace, y se dice.
 *
 * El ajuste es un **gradiente exponenciado** sobre el símplex: los pesos son positivos y suman 1 en
 * todas las iteraciones, sin necesidad de proyectar. Es el método estándar para mezclar expertos.
 *
 * Un modelo que no responde a un partido (no tiene ese equipo, le falta el xG) no participa: su peso
 * se reparte entre los que sí, y la ficha enseña quién entró.
 */
import type { Probabilities1X2 } from '../../types';
import { normalize1X2, OUTCOMES, probabilityOf, type ModelId, type Outcome1X2 } from './types';

/** Predicciones mínimas para ajustar pesos. Por debajo, reparto por igual. */
export const MIN_PARA_PESOS = 150;

export type Weights = Map<ModelId, number>;

const uniformes = (ids: ModelId[]): Weights => new Map(ids.map((id) => [id, 1 / ids.length]));

/**
 * Pesos que minimizan la log loss de la mezcla sobre `muestras`.
 *
 * Cada muestra trae la probabilidad que cada modelo dio al resultado que efectivamente ocurrió. Si un
 * modelo no respondió a ese partido, no aparece en su mapa y la mezcla se renormaliza sin él.
 */
export function fitWeights(ids: ModelId[], muestras: Map<ModelId, number>[], iteraciones = 300, eta = 0.5): Weights {
  if (ids.length === 0) return new Map();
  if (ids.length === 1) return new Map([[ids[0], 1]]);
  if (muestras.length < MIN_PARA_PESOS) return uniformes(ids);

  const w = new Float64Array(ids.length).fill(1 / ids.length);

  /*
   * Las muestras se copian a una tabla plana antes de iterar: 300 iteraciones por dos recorridos
   * hacen 600 búsquedas en `Map` por muestra y modelo, y con 9.000 muestras eso es lo que costaba,
   * no la aritmética. `NaN` marca «este modelo no respondió», igual que antes el `undefined`.
   */
  const k = ids.length;
  const P = new Float64Array(muestras.length * k);
  for (let s = 0; s < muestras.length; s++) {
    const m = muestras[s];
    for (let i = 0; i < k; i++) {
      const p = m.get(ids[i]);
      P[s * k + i] = p === undefined ? NaN : p;
    }
  }

  const grad = new Float64Array(k);
  for (let it = 0; it < iteraciones; it++) {
    grad.fill(0);
    let usadas = 0;
    for (let s = 0; s < muestras.length; s++) {
      const base = s * k;
      // Mezcla solo con los modelos que respondieron, renormalizando sus pesos.
      let mezcla = 0;
      let peso = 0;
      for (let i = 0; i < k; i++) {
        const p = P[base + i];
        if (Number.isNaN(p)) continue;
        mezcla += w[i] * p;
        peso += w[i];
      }
      if (peso <= 0 || mezcla <= 0) continue;
      usadas++;
      const normalizada = mezcla / peso;
      // d(-log mezcla)/dw_i = -(p_i - mezclaNormalizada) / (peso * mezclaNormalizada)
      for (let i = 0; i < k; i++) {
        const p = P[base + i];
        if (Number.isNaN(p)) continue;
        grad[i] -= (p - normalizada) / (peso * normalizada);
      }
    }
    if (usadas === 0) return uniformes(ids);

    // Paso multiplicativo y renormalización: los pesos no se salen del símplex.
    let total = 0;
    for (let i = 0; i < ids.length; i++) {
      w[i] *= Math.exp((-eta * grad[i]) / usadas);
      total += w[i];
    }
    if (!Number.isFinite(total) || total <= 0) return uniformes(ids);
    for (let i = 0; i < ids.length; i++) w[i] /= total;
  }

  // Un peso minúsculo es ruido: se poda y se reparte.
  const min = 0.005;
  let total = 0;
  for (let i = 0; i < w.length; i++) {
    if (w[i] < min) w[i] = 0;
    total += w[i];
  }
  if (total <= 0) return uniformes(ids);
  return new Map(ids.map((id, i) => [id, w[i] / total]));
}

/** Mezcla de 1X2 con los pesos dados, contando solo a los modelos que respondieron. */
export function blend1X2(predicciones: Map<ModelId, Probabilities1X2>, weights: Weights): { probs: Probabilities1X2; used: ModelId[] } | null {
  const usados: ModelId[] = [];
  let peso = 0;
  const suma: Record<Outcome1X2, number> = { '1': 0, X: 0, '2': 0 };
  for (const [id, p] of predicciones) {
    const w = weights.get(id) ?? 0;
    if (w <= 0) continue;
    usados.push(id);
    peso += w;
    for (const o of OUTCOMES) suma[o] += w * probabilityOf(p, o);
  }
  if (peso <= 0 || usados.length === 0) return null;
  return { probs: normalize1X2(suma['1'] / peso, suma.X / peso, suma['2'] / peso), used: usados };
}

/** Mezcla de un mercado de sí/no. */
export function blendBinary(predicciones: Map<ModelId, number>, weights: Weights): { p: number; used: ModelId[] } | null {
  const usados: ModelId[] = [];
  let peso = 0;
  let suma = 0;
  for (const [id, p] of predicciones) {
    const w = weights.get(id) ?? 0;
    if (w <= 0) continue;
    usados.push(id);
    peso += w;
    suma += w * p;
  }
  if (peso <= 0) return null;
  return { p: Math.min(1, Math.max(0, suma / peso)), used: usados };
}
