/**
 * Medias de liga usadas por la contracción bayesiana y por el ajuste SoS.
 *
 * Equivale a los `AVERAGEIFS('ESTADISTICAS HOME'!$L$5:$L$404, ...!$A$5:$A$404, liga)`
 * repartidos por toda la fórmula PROYECCIONES!F5: promedian entre EQUIPOS, no entre
 * partidos, e ignoran las celdas "N/A" (equipos con PJ = 0).
 */
import type { LeagueAverages, Match, SplitStats } from '../../types';
import { resultFT } from '../calculations/matchDerived';
import { shrinkWeight } from '../probability/shrink';

function mean(values: (number | null)[]): number {
  let sum = 0;
  let n = 0;
  for (const v of values) {
    if (v === null || !Number.isFinite(v)) continue;
    sum += v;
    n++;
  }
  return n === 0 ? 0 : sum / n;
}

/** COUNTIFS(liga, FT="X") / COUNTIFS(liga, FT<>"") — fallback 0.25 como el Excel. */
export function calculateDrawRate(matches: Match[]): number {
  let draws = 0;
  let total = 0;
  for (const m of matches) {
    const r = resultFT(m);
    if (r === null) continue;
    total++;
    if (r === 'X') draws++;
  }
  return total === 0 ? 0.25 : draws / total;
}

/**
 * Fracción global de los goles que llega en la 1.ª parte. Medida el 18/09/2026 en 2.804 partidos de 31 competiciones:
 * 3.585 de 8.020 goles. Las ligas van del 35,6 % (Bundesliga, 104 goles) al 55,3 % (Europa League, 47), pero casi todo
 * es ruido de muestra: descontada la varianza binomial, la diferencia real entre ligas es de ~1 punto (τ ≈ 0,011).
 */
export const FIRST_HALF_SHARE = 0.447;

/**
 * Goles de la proporción global con los que se contrae la de cada liga: p(1 − p)/τ², que da ≈ 2.150 ponderando por
 * goles y ≈ 1.360 sin ponderar (mismo día). Una liga necesita miles de goles para separarse de la global.
 */
export const FIRST_HALF_PRIOR_GOALS = 2000;

/** Partidos con resultado al descanso que necesita una liga para proyectar por partes. */
export const MIN_HALF_TIME_MATCHES = 20;

/**
 * Proporción de goles de la 1.ª parte en una liga, contraída hacia FIRST_HALF_SHARE:
 * (goles 1.ª parte + m·p) / (goles + m). Solo cuentan los partidos con resultado al descanso coherente con el final.
 */
export function calculateFirstHalfShare(matches: Match[]): { share: number | null; matches: number } {
  let n = 0;
  let primera = 0;
  let total = 0;
  for (const m of matches) {
    const { homeGoals: h, awayGoals: a, homeFirstHalfGoals: h1, awayFirstHalfGoals: a1 } = m;
    if (h === null || a === null || h1 === null || a1 === null || h1 > h || a1 > a) continue;
    n++;
    primera += h1 + a1;
    total += h + a;
  }
  const share = (primera + FIRST_HALF_PRIOR_GOALS * FIRST_HALF_SHARE) / (total + FIRST_HALF_PRIOR_GOALS);
  return { share: n < MIN_HALF_TIME_MATCHES ? null : share, matches: n };
}

export function calculateLeagueAverages(
  leagueId: string,
  homeStats: SplitStats[],
  awayStats: SplitStats[],
  ppgValues: (number | null)[],
  matches: Match[],
): LeagueAverages {
  const h = homeStats;
  const a = awayStats;
  const mitades = calculateFirstHalfShare(matches);
  return {
    leagueId,
    homeGoalsFor: mean(h.map((s) => s.avgGoalsFor)),
    homeGoalsAgainst: mean(h.map((s) => s.avgGoalsAgainst)),
    awayGoalsFor: mean(a.map((s) => s.avgGoalsFor)),
    awayGoalsAgainst: mean(a.map((s) => s.avgGoalsAgainst)),

    homeCornersFor: mean(h.map((s) => s.corners.avgFor)),
    homeCornersAgainst: mean(h.map((s) => s.corners.avgAgainst)),
    awayCornersFor: mean(a.map((s) => s.corners.avgFor)),
    awayCornersAgainst: mean(a.map((s) => s.corners.avgAgainst)),

    homeCardsFor: mean(h.map((s) => s.cards.avgFor)),
    homeCardsAgainst: mean(h.map((s) => s.cards.avgAgainst)),
    awayCardsFor: mean(a.map((s) => s.cards.avgFor)),
    awayCardsAgainst: mean(a.map((s) => s.cards.avgAgainst)),

    homeShotsFor: mean(h.map((s) => s.shots.avgFor)),
    homeShotsAgainst: mean(h.map((s) => s.shots.avgAgainst)),
    awayShotsFor: mean(a.map((s) => s.shots.avgFor)),
    awayShotsAgainst: mean(a.map((s) => s.shots.avgAgainst)),

    homeSotFor: mean(h.map((s) => s.shotsOnTarget.avgFor)),
    homeSotAgainst: mean(h.map((s) => s.shotsOnTarget.avgAgainst)),
    awaySotFor: mean(a.map((s) => s.shotsOnTarget.avgFor)),
    awaySotAgainst: mean(a.map((s) => s.shotsOnTarget.avgAgainst)),

    ppg: mean(ppgValues),
    drawRate: calculateDrawRate(matches),
    firstHalfShare: mitades.share,
    halfTimeMatches: mitades.matches,

    homeXgFor: mean(h.map((s) => s.xg.avgFor)),
    homeXgAgainst: mean(h.map((s) => s.xg.avgAgainst)),
    awayXgFor: mean(a.map((s) => s.xg.avgFor)),
    awayXgAgainst: mean(a.map((s) => s.xg.avgAgainst)),
  };
}

/**
 * Campos de `LeagueAverages` que son una media y se pueden contraer. Se listan a mano a propósito: `leagueId`,
 * `halfTimeMatches` y `firstHalfShare` NO entran (el último ya se contrae hacia la global con su propio prior
 * de 2.000 goles, y contraerlo dos veces lo aplanaría).
 */
const MEDIAS = [
  'homeGoalsFor', 'homeGoalsAgainst', 'awayGoalsFor', 'awayGoalsAgainst',
  'homeCornersFor', 'homeCornersAgainst', 'awayCornersFor', 'awayCornersAgainst',
  'homeCardsFor', 'homeCardsAgainst', 'awayCardsFor', 'awayCardsAgainst',
  'homeShotsFor', 'homeShotsAgainst', 'awayShotsFor', 'awayShotsAgainst',
  'homeSotFor', 'homeSotAgainst', 'awaySotFor', 'awaySotAgainst',
  'ppg', 'drawRate',
  'homeXgFor', 'homeXgAgainst', 'awayXgFor', 'awayXgAgainst',
] as const satisfies readonly (keyof LeagueAverages)[];

/**
 * Las medias de la temporada en curso, contraídas hacia las de las temporadas anteriores de la misma liga.
 *
 * Es la otra mitad del prior histórico. El prior de cada equipo (`projections/expectedValues.ts`) arregla que
 * un equipo con 4 partidos «sea la liga»; esto arregla que **la liga tampoco se conozca**. En la jornada 1 no
 * hay ningún partido, así que todas estas medias valen 0, y eso se propaga de dos formas que se ven en los
 * números: el prior del equipo se contrae hacia 0 (con 30 partidos de histórico salía rebajado un 25 %) y
 * `calculateDefenseStrength` devuelve `null` al dividir por 0, con lo que la fuerza del rival desaparece.
 *
 * El peso es el de siempre, sobre los partidos que la liga lleva jugados: con `kPrior` 10, una jornada de 10
 * partidos ya vale tanto como el histórico. Ese es el orden de magnitud correcto, porque una media de liga se
 * apoya en 20 equipos a la vez y se estabiliza mucho antes que la de un equipo.
 *
 * Sin temporadas anteriores (`previas` nulo) devuelve las de ahora tal cual, misma referencia de objeto.
 */
export function blendLeagueAverages(
  actual: LeagueAverages,
  previas: LeagueAverages | null,
  playedMatches: number,
  kPrior: number,
): LeagueAverages {
  if (!previas) return actual;
  const w = shrinkWeight(playedMatches, kPrior);
  const out = { ...actual };
  for (const k of MEDIAS) {
    /*
     * Un 0 en una media de liga no es «esta liga hace 0 córners»: es que la métrica no está publicada todavía
     * (`mean([])` y `mean([null, null])` valen 0). Mezclarlo como si fuera una medición arrastraba la media
     * histórica hacia abajo: con 2 partidos jugados y ningún córner, 10 córners esperados se quedaban en 8,3.
     * El resto del código usa la misma convención: el `noData` de `calculateExpectedMetric` también lee el 0
     * como «no hay dato».
     * ponytail: una liga en la que de verdad no se hubiera marcado ni un gol tomaría la media del histórico;
     * para distinguirlo habría que devolver `null` en `LeagueAverages`, y eso cambia su tipo y todos sus usos.
     */
    out[k] = actual[k] === 0 ? previas[k] : w * actual[k] + (1 - w) * previas[k];
  }
  return out;
}
