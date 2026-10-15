/**
 * 1X2. PROYECCIONES!W/X/Y. MODEL_MAPPING.md §14.
 *
 *   P(X) = drawRate · e^(-K_DRAWDECAY · (λL-λV)²)
 *   L    = 1 / (1 + e^(-K_LOGISTIC · (λL-λV)))
 *   P(1) = (1 - P(X)) · L
 *   P(2) = (1 - P(X)) · (1 - L)
 *
 * P(1)+P(X)+P(2) = 1 por construcción; la normalización final es defensiva.
 */
import type { ModelParams, OutcomePick, Probabilities1X2 } from '../../types';
import { MAX_GOALS } from './goalDifference';
import { scoreMatrix } from './poisson';

/**
 * 1X2 de la matriz de marcadores Poisson con las mismas λ que dan Over, BTTS y los hándicaps (DIFF-11). Medido el
 * 18/09/2026 en walk-forward sobre 1.267 partidos: el empate queda en el 24,6 % frente al 24,2 % real (la logística del
 * libro daba 20,8 %) y el Brier del 1X2 baja 0,0055 ± 0,0021.
 */
export function poisson1X2Probabilities(lambdaHome: number, lambdaAway: number): Probabilities1X2 {
  let home = 0;
  let draw = 0;
  let away = 0;
  scoreMatrix(lambdaHome, lambdaAway, MAX_GOALS).forEach((fila, i) =>
    fila.forEach((p, j) => {
      if (i > j) home += p;
      else if (i === j) draw += p;
      else away += p;
    }),
  );
  const sum = home + draw + away;
  return { home: home / sum, draw: draw / sum, away: away / sum };
}

export function logistic(x: number, k: number): number {
  return 1 / (1 + Math.exp(-k * x));
}

export function calculate1X2Probabilities(
  lambdaHome: number,
  lambdaAway: number,
  leagueDrawRate: number,
  params: Pick<ModelParams, 'kLogistic' | 'kDrawDecay'>,
): Probabilities1X2 {
  const diff = lambdaHome - lambdaAway;
  const draw = leagueDrawRate * Math.exp(-params.kDrawDecay * diff * diff);
  const l = logistic(diff, params.kLogistic);

  const home = (1 - draw) * l;
  const away = (1 - draw) * (1 - l);

  const sum = home + draw + away;
  if (sum <= 0) return { home: 1 / 3, draw: 1 / 3, away: 1 / 3 };
  return { home: home / sum, draw: draw / sum, away: away / sum };
}

/** Probabilidad del favorito a partir de la cual se da como ganador. */
export const CLEAR_FAVORITE = 0.55;
/** Por debajo, ningún equipo es favorito y no se pronostica resultado. */
export const MIN_FAVORITE = 0.45;

/**
 * Resultado de la proyección según la probabilidad del favorito, el mayor de P(1) y P(2). MODEL_MAPPING.md DIFF-03.
 *
 *   favorito ≥ 55 %            → 1 / 2              gana el favorito
 *   45 % ≤ favorito < 55 %     → 1X / 2X            el favorito o el empate
 *   favorito < 45 %            → sinFavorito        no se pronostica
 *
 * Medido el 19/09/2026 en walk-forward sobre 1.287 partidos: «gana» acierta el 64,3 % (224), la doble oportunidad el
 * 75,7 % (448) y 615 quedan sin favorito, donde el favorito solo gana el 42 %. La etiqueta anterior, por P(1) − P(2),
 * daba «X · empate claro» en partidos igualados y acertaba el 24,9 %; su «victoria clara», el 52,9 % y el 46,1 %.
 * El empate casi nunca es el resultado más probable (6 de 1.287), así que no tiene etiqueta propia.
 * Las probabilidades no cambian: solo cómo se resumen.
 */
export function resultPick(p: Probabilities1X2): OutcomePick {
  const local = p.home >= p.away;
  const favorito = Math.max(p.home, p.away);
  if (favorito >= CLEAR_FAVORITE) return local ? '1' : '2';
  if (favorito >= MIN_FAVORITE) return local ? '1X' : '2X';
  return 'sinFavorito';
}

/** Puntos esperados de un partido: V=3, E=1, D=0 (PROYECCION FINAL!H). */
export function expectedPoints(p: Probabilities1X2, isHome: boolean): number {
  return (isHome ? p.home : p.away) * 3 + p.draw;
}
