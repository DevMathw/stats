/**
 * Poisson independiente. MODEL_MAPPING.md §14.
 * `lambda` no se redondea en ningún punto.
 */

import type { OutcomePick } from '../../types';

/** P(X = k) = e^-λ · λ^k / k!  — calculado por recurrencia para no desbordar en k grandes. */
export function poissonPmf(k: number, lambda: number): number {
  if (k < 0 || !Number.isInteger(k)) return 0;
  if (lambda < 0) return 0;
  let p = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) p *= lambda / i;
  return p;
}

/** POISSON(k, λ, TRUE) = Σ_{i=0..k} pmf(i, λ). */
export function poissonCdf(k: number, lambda: number): number {
  if (k < 0) return 0;
  let term = Math.exp(-lambda);
  let sum = term;
  for (let i = 1; i <= k; i++) {
    term *= lambda / i;
    sum += term;
  }
  return Math.min(1, sum);
}

/** PROYECCIONES!Q/R/S — `1 - POISSON(floor(line), λtotal, TRUE)`. */
export function calculateOverProbability(lambdaTotal: number, line: number): number {
  return 1 - poissonCdf(Math.floor(line), lambdaTotal);
}

export function calculateUnderProbability(lambdaTotal: number, line: number): number {
  return 1 - calculateOverProbability(lambdaTotal, line);
}

/** PROYECCIONES!T — `1 - e^-λL - e^-λV + e^-(λL+λV)`. */
export function calculateBTTSProbability(lambdaHome: number, lambdaAway: number): number {
  return (
    1 - Math.exp(-lambdaHome) - Math.exp(-lambdaAway) + Math.exp(-(lambdaHome + lambdaAway))
  );
}

/**
 * PROYECCIONES!U/V — portería a cero.
 * `lambdaOpponent` es el λ del RIVAL: P(rival marca 0) = e^-λrival.
 */
export function calculateCleanSheetProbability(lambdaOpponent: number): number {
  return Math.exp(-lambdaOpponent);
}

/**
 * Matriz de marcadores P(i,j) = pmf(i,λL)·pmf(j,λV), i,j ∈ [0, maxGoals].
 * Añadido sobre el Excel; ver DIFF-03.
 */
export function scoreMatrix(lambdaHome: number, lambdaAway: number, maxGoals = 10): number[][] {
  const home = Array.from({ length: maxGoals + 1 }, (_, i) => poissonPmf(i, lambdaHome));
  const away = Array.from({ length: maxGoals + 1 }, (_, j) => poissonPmf(j, lambdaAway));
  return home.map((ph) => away.map((pa) => ph * pa));
}

/** Qué marcadores (local i, visitante j) caben en cada resultado. Sin favorito, cualquiera. */
const CABE: Record<OutcomePick, (i: number, j: number) => boolean> = {
  '1': (i, j) => i > j,
  '1X': (i, j) => i >= j,
  sinFavorito: () => true,
  '2X': (i, j) => j >= i,
  '2': (i, j) => j > i,
};

/**
 * Marcador más probable, p.ej. "2 - 1". Con `pick`, el más probable DENTRO de ese resultado: el
 * marcador nunca contradice la etiqueta (un «1» no puede venir con 1-1).
 */
export function mostLikelyScoreline(
  lambdaHome: number,
  lambdaAway: number,
  pick?: OutcomePick,
  maxGoals = 10,
): string {
  const m = scoreMatrix(lambdaHome, lambdaAway, maxGoals);
  let best = -1;
  let bi = 0;
  let bj = 0;
  for (let i = 0; i < m.length; i++) {
    for (let j = 0; j < m[i].length; j++) {
      if (pick && !CABE[pick](i, j)) continue;
      if (m[i][j] > best) {
        best = m[i][j];
        bi = i;
        bj = j;
      }
    }
  }
  return `${bi} - ${bj}`;
}
