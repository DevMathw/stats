/**
 * Calibración: ajustar lo seguro que se muestra un modelo a lo que le pasa de verdad.
 *
 * Un modelo puede ordenar bien los partidos y aun así exagerar. Si de los partidos a los que da un 70 %
 * solo gana el 55 %, sus probabilidades no se pueden usar como probabilidades. La calibración arregla
 * eso sin tocar el orden: estira o encoge la escala.
 *
 *  - **1X2**: escalado de temperatura con sesgo por clase. Se ajustan cuatro números (`a`, y un sesgo
 *    para local, empate y visitante) sobre `softmax(a · log p_k + b_k)`. La temperatura corrige el
 *    exceso o la falta de confianza; los sesgos, que un modelo se quede corto con los empates.
 *  - **Sí/no**: escalado de Platt, `sigmoide(a · logit(p) + b)`, que es lo mismo con dos números.
 *
 * Se ajusta por descenso de gradiente sobre la log loss. Con `a = 1` y `b = 0` la calibración no hace
 * nada, que es donde empieza: si el modelo ya estaba calibrado, se queda como estaba.
 *
 * REGLA: se ajusta SOLO con partidos anteriores a los que se van a calibrar. Calibrar con el propio
 * partido que se predice es la forma más silenciosa de hacer trampas en un backtest.
 */
import type { Probabilities1X2 } from '../../types';
import { normalize1X2, OUTCOMES, probabilityOf, type Outcome1X2 } from './types';

/** Muestras mínimas para calibrar. Por debajo se deja el modelo como está. */
export const MIN_PARA_CALIBRAR = 200;

export interface Calibration1X2 {
  a: number;
  b: [number, number, number];
}

export const SIN_CALIBRAR_1X2: Calibration1X2 = { a: 1, b: [0, 0, 0] };

const log = (p: number) => Math.log(Math.min(1 - 1e-12, Math.max(1e-12, p)));

export function apply1X2(p: Probabilities1X2, c: Calibration1X2): Probabilities1X2 {
  const z = OUTCOMES.map((o, k) => c.a * log(probabilityOf(p, o)) + c.b[k]);
  const max = Math.max(...z);
  const e = z.map((v) => Math.exp(v - max));
  return normalize1X2(e[0], e[1], e[2]);
}

export function fit1X2(muestras: { probs: Probabilities1X2; actual: Outcome1X2 }[], iteraciones = 400, lr = 0.05): Calibration1X2 {
  if (muestras.length < MIN_PARA_CALIBRAR) return SIN_CALIBRAR_1X2;
  let a = 1;
  const b: [number, number, number] = [0, 0, 0];

  /*
   * Los logaritmos de las probabilidades y la clase real no dependen de `a` ni de `b`: se calculan una
   * vez y no 400. Es la misma aritmética en el mismo orden —los números salen idénticos—, pero en vez
   * de 400 pasadas de `Math.log` y cinco arrays por muestra queda una tabla plana que se recorre.
   * Con 9.000 muestras y 7 modelos, esto era el mayor coste del backtest.
   */
  const n = muestras.length;
  const L = new Float64Array(3 * n);
  const real = new Int8Array(n);
  for (let s = 0; s < n; s++) {
    const m = muestras[s];
    for (let k = 0; k < 3; k++) L[3 * s + k] = log(probabilityOf(m.probs, OUTCOMES[k]));
    real[s] = OUTCOMES.indexOf(m.actual);
  }

  for (let it = 0; it < iteraciones; it++) {
    let ga = 0;
    let gb0 = 0;
    let gb1 = 0;
    let gb2 = 0;
    for (let s = 0; s < n; s++) {
      const l0 = L[3 * s];
      const l1 = L[3 * s + 1];
      const l2 = L[3 * s + 2];
      const z0 = a * l0 + b[0];
      const z1 = a * l1 + b[1];
      const z2 = a * l2 + b[2];
      const max = Math.max(z0, z1, z2);
      const e0 = Math.exp(z0 - max);
      const e1 = Math.exp(z1 - max);
      const e2 = Math.exp(z2 - max);
      const total = e0 + e1 + e2;
      const c = real[s];
      const d0 = e0 / total - (c === 0 ? 1 : 0);
      const d1 = e1 / total - (c === 1 ? 1 : 0);
      const d2 = e2 / total - (c === 2 ? 1 : 0);
      ga += d0 * l0;
      gb0 += d0;
      ga += d1 * l1;
      gb1 += d1;
      ga += d2 * l2;
      gb2 += d2;
    }
    const paso = lr / n;
    a = Math.max(0.2, Math.min(3, a - paso * ga));
    b[0] -= paso * gb0;
    b[1] -= paso * gb1;
    b[2] -= paso * gb2;
  }
  return { a, b };
}

export interface CalibrationBinary {
  a: number;
  b: number;
}

export const SIN_CALIBRAR_BINARIA: CalibrationBinary = { a: 1, b: 0 };

const logit = (p: number) => log(p) - log(1 - p);
const sigmoide = (z: number) => 1 / (1 + Math.exp(-z));

export const applyBinary = (p: number, c: CalibrationBinary): number => sigmoide(c.a * logit(p) + c.b);

export function fitBinary(muestras: { p: number; actual: 0 | 1 }[], iteraciones = 400, lr = 0.1): CalibrationBinary {
  if (muestras.length < MIN_PARA_CALIBRAR) return SIN_CALIBRAR_BINARIA;
  let a = 1;
  let b = 0;
  // Igual que en `fit1X2`: el logit de cada muestra es el mismo en las 400 iteraciones.
  const n = muestras.length;
  const Z = new Float64Array(n);
  const real = new Int8Array(n);
  for (let s = 0; s < n; s++) {
    Z[s] = logit(muestras[s].p);
    real[s] = muestras[s].actual;
  }
  for (let it = 0; it < iteraciones; it++) {
    let ga = 0;
    let gb = 0;
    for (let s = 0; s < n; s++) {
      const z = Z[s];
      const d = sigmoide(a * z + b) - real[s];
      ga += d * z;
      gb += d;
    }
    const paso = lr / n;
    a = Math.max(0.2, Math.min(3, a - paso * ga));
    b -= paso * gb;
  }
  return { a, b };
}
