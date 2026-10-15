/**
 * Diferencia de goles D = goles del local − goles del visitante, para hándicaps y empate no válido.
 * Añadido sobre el Excel. PICKS_METHODOLOGY.md §2.
 *
 * El signo de D sale del 1X2 del modelo; el tamaño del margen, de Poisson con las mismas λ:
 *
 *   P(D = k) = P(1) · S(k) / S(D > 0)     k > 0
 *   P(D = 0) = P(X)
 *   P(D = k) = P(2) · S(k) / S(D < 0)     k < 0
 *
 * con S la diferencia de dos Poisson independientes. Por qué no Poisson a secas: su P(D > 0) no
 * coincide con el P(1) logístico del modelo, y el hándicap −0.5 del local (que ES «gana el local»)
 * tendría otra probabilidad que el 1X2. Dos precios para el mismo evento serían un edge inventado.
 * Con el 1X2 de Poisson (DIFF-11) los dos repartos coinciden y esto es Poisson a secas.
 */
import type { Probabilities1X2 } from '../../types';
import { poissonPmf } from './poisson';

/** Con λ ≤ 4 la masa por encima de 20 goles por equipo es < 1e-8. */
export const MAX_GOALS = 20;

/**
 * `d[k + MAX_GOALS]` = P(D = k) para k en [−MAX_GOALS, MAX_GOALS]. `null` si Poisson no deja margen a
 * un lado (λ = 0): no hay forma de repartir P(1) o P(2).
 */
export function goalDifferenceDistribution(lambdaHome: number, lambdaAway: number, p: Probabilities1X2): number[] | null {
  const local = Array.from({ length: MAX_GOALS + 1 }, (_, i) => poissonPmf(i, lambdaHome));
  const visitante = Array.from({ length: MAX_GOALS + 1 }, (_, j) => poissonPmf(j, lambdaAway));
  const s = new Array<number>(2 * MAX_GOALS + 1).fill(0);
  for (let i = 0; i <= MAX_GOALS; i++) for (let j = 0; j <= MAX_GOALS; j++) s[i - j + MAX_GOALS] += local[i] * visitante[j];
  const gana = s.slice(MAX_GOALS + 1).reduce((a, b) => a + b, 0);
  const pierde = s.slice(0, MAX_GOALS).reduce((a, b) => a + b, 0);
  if (!(gana > 0) || !(pierde > 0)) return null;
  return s.map((x, idx) => (idx > MAX_GOALS ? (p.home * x) / gana : idx < MAX_GOALS ? (p.away * x) / pierde : p.draw));
}
