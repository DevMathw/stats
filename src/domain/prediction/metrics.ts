/**
 * Métricas para comparar modelos. Todas sobre predicciones hechas ANTES del partido.
 *
 *  - **Log loss**: −log de la probabilidad que el modelo le dio al resultado que pasó. Es la métrica
 *    que manda aquí, porque castiga la seguridad equivocada: acertar con un 90 % vale mucho más que
 *    acertar con un 40 %, y fallar con un 90 % arruina la media.
 *  - **Brier**: error cuadrático de las probabilidades. Menos sensible a los extremos que el log loss.
 *  - **Acierto**: cuántas veces el resultado más probable fue el que pasó. Es la más intuitiva y la
 *    peor de las tres para elegir modelo: no mira lo seguro que estaba.
 *  - **ECE** (error de calibración esperado): la distancia media entre lo que el modelo dice y lo que
 *    pasa, por tramos de probabilidad. Un modelo puede acertar poco y estar bien calibrado, y al revés.
 *
 * Como referencia se calcula siempre la **frecuencia base**: predecir siempre el reparto histórico.
 * Un modelo que no la mejora no aporta nada, por buena que parezca su cifra de acierto.
 */
import type { Probabilities1X2 } from '../../types';
import { OUTCOMES, probabilityOf, type Outcome1X2 } from './types';

export interface ScoreSummary {
  n: number;
  logLoss: number | null;
  brier: number | null;
  accuracy: number | null;
  ece: number | null;
  /** Log loss de predecir siempre la frecuencia observada. */
  baseLogLoss: number | null;
  /** 1 − logLoss/baseLogLoss. Positivo: el modelo aporta sobre la frecuencia base. */
  skill: number | null;
}

const VACIO: ScoreSummary = { n: 0, logLoss: null, brier: null, accuracy: null, ece: null, baseLogLoss: null, skill: null };

const log = (p: number) => Math.log(Math.min(1 - 1e-12, Math.max(1e-12, p)));

/** Calibración por tramos sobre la probabilidad del resultado más probable. */
function eceOf(pares: { p: number; acierto: 0 | 1 }[], bins = 10): number | null {
  if (pares.length === 0) return null;
  const tramos = Array.from({ length: bins }, () => ({ n: 0, suma: 0, aciertos: 0 }));
  for (const { p, acierto } of pares) {
    const i = Math.min(bins - 1, Math.max(0, Math.floor(p * bins)));
    tramos[i].n++;
    tramos[i].suma += p;
    tramos[i].aciertos += acierto;
  }
  let total = 0;
  for (const t of tramos) if (t.n > 0) total += (t.n / pares.length) * Math.abs(t.suma / t.n - t.aciertos / t.n);
  return total;
}

/** Métricas de un conjunto de predicciones 1X2 con su resultado real. */
export function score1X2(preds: { probs: Probabilities1X2; actual: Outcome1X2 }[]): ScoreSummary {
  const n = preds.length;
  if (n === 0) return { ...VACIO };

  let ll = 0;
  let brier = 0;
  let aciertos = 0;
  const frecuencia: Record<Outcome1X2, number> = { '1': 0, X: 0, '2': 0 };
  const calibracion: { p: number; acierto: 0 | 1 }[] = [];

  for (const { probs, actual } of preds) {
    ll -= log(probabilityOf(probs, actual));
    for (const o of OUTCOMES) {
      const p = probabilityOf(probs, o);
      brier += (p - (o === actual ? 1 : 0)) ** 2;
    }
    const mejor = OUTCOMES.reduce((a, b) => (probabilityOf(probs, b) > probabilityOf(probs, a) ? b : a));
    if (mejor === actual) aciertos++;
    calibracion.push({ p: probabilityOf(probs, mejor), acierto: mejor === actual ? 1 : 0 });
    frecuencia[actual]++;
  }

  let base = 0;
  for (const o of OUTCOMES) {
    const f = frecuencia[o] / n;
    if (f > 0) base -= frecuencia[o] * Math.log(f);
  }
  const baseLogLoss = base / n;
  const logLoss = ll / n;

  return {
    n,
    logLoss,
    brier: brier / n,
    accuracy: aciertos / n,
    ece: eceOf(calibracion),
    baseLogLoss,
    skill: baseLogLoss > 0 ? 1 - logLoss / baseLogLoss : null,
  };
}

/** Métricas de un mercado de sí/no (Over, BTTS). */
export function scoreBinary(preds: { p: number; actual: 0 | 1 }[]): ScoreSummary {
  const n = preds.length;
  if (n === 0) return { ...VACIO };

  let ll = 0;
  let brier = 0;
  let aciertos = 0;
  let positivos = 0;
  const calibracion: { p: number; acierto: 0 | 1 }[] = [];

  for (const { p, actual } of preds) {
    ll -= actual === 1 ? log(p) : log(1 - p);
    brier += (p - actual) ** 2;
    const prediccion = p >= 0.5 ? 1 : 0;
    if (prediccion === actual) aciertos++;
    calibracion.push({ p: prediccion === 1 ? p : 1 - p, acierto: prediccion === actual ? 1 : 0 });
    positivos += actual;
  }

  const f = positivos / n;
  const baseLogLoss = f <= 0 || f >= 1 ? null : -(f * Math.log(f) + (1 - f) * Math.log(1 - f));
  const logLoss = ll / n;

  return {
    n,
    logLoss,
    brier: brier / n,
    accuracy: aciertos / n,
    ece: eceOf(calibracion),
    baseLogLoss,
    skill: baseLogLoss && baseLogLoss > 0 ? 1 - logLoss / baseLogLoss : null,
  };
}
