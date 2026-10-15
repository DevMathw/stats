/**
 * Lo común a los modelos que predicen GOLES (Poisson, Dixon-Coles y xG): de una pareja de goles
 * esperados salen el 1X2, el Over/Under, el BTTS y los marcadores probables, sin estimar nada más.
 *
 * Todo sale de la misma matriz de marcadores, así que las probabilidades de un modelo son coherentes
 * entre sí: el Over 2.5 y el 1X2 que enseña la ficha vienen del mismo reparto.
 */
import { scoreMatrix } from '../probability/poisson';
import { dixonColesMatrix } from './dixonColes';
import { OVER_LINES, normalize1X2, type MarketProbabilities, type OverLine } from './types';

const MAX_GOLES = 10;

/** Cuántos marcadores se enseñan. */
const MARCADORES = 5;

/** Todas las probabilidades de un partido a partir de su matriz de marcadores. */
export function fromScoreMatrix(matrix: number[][], lambdaHome: number, lambdaAway: number): MarketProbabilities {
  let home = 0;
  let draw = 0;
  let away = 0;
  let btts = 0;
  const porTotal = new Map<number, number>();
  const marcadores: { score: string; probability: number }[] = [];

  for (let x = 0; x < matrix.length; x++) {
    for (let y = 0; y < matrix[x].length; y++) {
      const p = matrix[x][y];
      if (p <= 0) continue;
      if (x > y) home += p;
      else if (x === y) draw += p;
      else away += p;
      if (x > 0 && y > 0) btts += p;
      porTotal.set(x + y, (porTotal.get(x + y) ?? 0) + p);
      marcadores.push({ score: `${x}-${y}`, probability: p });
    }
  }

  const over: Partial<Record<OverLine, number>> = {};
  for (const linea of OVER_LINES) {
    let acumulado = 0;
    for (const [total, p] of porTotal) if (total > linea) acumulado += p;
    over[linea] = Math.min(1, Math.max(0, acumulado));
  }

  marcadores.sort((a, b) => b.probability - a.probability);
  return {
    probs1x2: normalize1X2(home, draw, away),
    over,
    btts: Math.min(1, Math.max(0, btts)),
    expectedGoals: { home: lambdaHome, away: lambdaAway },
    scorelines: marcadores.slice(0, MARCADORES),
  };
}

/** Poisson independiente. */
export const poissonProbabilities = (lambdaHome: number, lambdaAway: number): MarketProbabilities =>
  fromScoreMatrix(scoreMatrix(lambdaHome, lambdaAway, MAX_GOLES), lambdaHome, lambdaAway);

/** Poisson con la corrección de Dixon-Coles en los marcadores bajos. */
export const dixonColesProbabilities = (lambdaHome: number, lambdaAway: number, rho: number): MarketProbabilities =>
  fromScoreMatrix(dixonColesMatrix(lambdaHome, lambdaAway, rho, MAX_GOLES), lambdaHome, lambdaAway);
