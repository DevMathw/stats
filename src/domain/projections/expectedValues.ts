/**
 * Fuerza base y valores esperados sin ponderar. MODEL_MAPPING.md §11 y §13.
 *
 * Patrón único del Excel (PROYECCIONES!F, I, J, L, M, O, P):
 *
 *   esperado = shrink(ataque_equipo)  ×  shrink(defensa_rival) / mediaLiga(defensa)
 *
 * El segundo factor es la "fuerza defensiva relativa": 1.0 = defensa media de la liga.
 */
import type { LeagueAverages, ModelParams, SplitStats } from '../../types';
import { shrinkToLeagueMean } from '../probability/shrink';

/**
 * Lo que el propio equipo hizo en las temporadas anteriores de esa competicion: el valor y los partidos que
 * lo respaldan. Un valor nulo = el historico no tiene ese dato, y entonces no hay prior.
 */
export interface Prior {
  value: number | null;
  played: number;
}

/**
 * Media desde la que arranca la contraccion.
 *
 * Sin historico es la media de la liga, y entonces todo se comporta exactamente como antes. Con historico es
 * **lo que hizo ese mismo equipo**, contraido a su vez hacia la liga segun cuantos partidos lo respalden: 30
 * partidos con K_PRIOR 10 dejan el prior al 75 % del historico del equipo y al 25 % de la liga.
 *
 * El motivo de que exista: en la jornada 5 la contraccion hacia la media de liga dice que un equipo es, en un
 * 67 %, "la liga". Eso es razonable cuando no se sabe nada mas de el, y deja de serlo cuando hay tres
 * temporadas suyas guardadas. Medido en la BetPlay: con 10 partidos jugados, casi la mitad de la proyeccion
 * era la media de la competicion.
 *
 * La media de liga NO se sustituye donde normaliza (la fuerza defensiva relativa sigue siendo "frente a la
 * liga"): solo cambia el punto de partida de la contraccion.
 */
export function priorMean(prior: Prior | null | undefined, leagueMean: number, kPrior: number): number {
  return prior?.value == null ? leagueMean : shrinkToLeagueMean(prior.value, prior.played, leagueMean, kPrior);
}

/** Media ofensiva del equipo contraída hacia la liga. Valor ABSOLUTO (goles, corners...). */
export function calculateAttackStrength(
  teamAvgFor: number | null,
  played: number,
  leagueAvgFor: number,
  kShrink: number,
): number {
  return shrinkToLeagueMean(teamAvgFor, played, leagueAvgFor, kShrink);
}

/**
 * Fuerza defensiva RELATIVA del rival: `shrink(media encajada) / media de la liga`.
 * 1.0 = defensa del montón; >1 = encaja más que la media.
 */
export function calculateDefenseStrength(
  teamAvgAgainst: number | null,
  played: number,
  leagueAvgAgainst: number,
  kShrink: number,
  /** Media de la que parte la contraccion. Por defecto la de la liga, que es el comportamiento del libro. */
  prior = leagueAvgAgainst,
): number | null {
  if (leagueAvgAgainst === 0) return null; // el IFERROR del Excel
  // El divisor sigue siendo la liga: "1.0 = defensa del monton" tiene que seguir queriendo decir eso.
  return shrinkToLeagueMean(teamAvgAgainst, played, prior, kShrink) / leagueAvgAgainst;
}

/**
 * `IFERROR(ataque × defensaRelativa, ataque)` — el Excel cae al ataque solo si la media
 * de liga es 0 (división por cero).
 */
export function expectedFromStrengths(
  attackAvg: number | null,
  attackPlayed: number,
  leagueAttackMean: number,
  defenseAvg: number | null,
  defensePlayed: number,
  leagueDefenseMean: number,
  kShrink: number,
  /** Historico del equipo que ataca y del que defiende. Sin el, la contraccion va a la media de liga. */
  priors?: { attack?: Prior | null; defense?: Prior | null; kPrior?: number },
): number {
  const kPrior = priors?.kPrior ?? kShrink;
  const attack = calculateAttackStrength(attackAvg, attackPlayed, priorMean(priors?.attack, leagueAttackMean, kPrior), kShrink);
  const defense = calculateDefenseStrength(
    defenseAvg,
    defensePlayed,
    leagueDefenseMean,
    kShrink,
    priorMean(priors?.defense, leagueDefenseMean, kPrior),
  );
  return defense === null ? attack : attack * defense;
}

export interface ExpectedPair {
  home: number | null;
  away: number | null;
  total: number | null;
}

type Metric = 'corners' | 'cards' | 'shots' | 'shotsOnTarget';

const LEAGUE_KEYS: Record<
  Metric,
  {
    homeFor: keyof LeagueAverages;
    homeAgainst: keyof LeagueAverages;
    awayFor: keyof LeagueAverages;
    awayAgainst: keyof LeagueAverages;
  }
> = {
  corners: {
    homeFor: 'homeCornersFor',
    homeAgainst: 'homeCornersAgainst',
    awayFor: 'awayCornersFor',
    awayAgainst: 'awayCornersAgainst',
  },
  cards: {
    homeFor: 'homeCardsFor',
    homeAgainst: 'homeCardsAgainst',
    awayFor: 'awayCardsFor',
    awayAgainst: 'awayCardsAgainst',
  },
  shots: {
    homeFor: 'homeShotsFor',
    homeAgainst: 'homeShotsAgainst',
    awayFor: 'awayShotsFor',
    awayAgainst: 'awayShotsAgainst',
  },
  shotsOnTarget: {
    homeFor: 'homeSotFor',
    homeAgainst: 'homeSotAgainst',
    awayFor: 'awaySotFor',
    awayAgainst: 'awaySotAgainst',
  },
};

/**
 * Corners / tarjetas / tiros / tiros a puerta esperados.
 * NO usan pesos, ni forma, ni xG, ni H2H, ni SoS (igual que el Excel).
 *
 * Tampoco usan el prior histórico de los goles, y eso sí es una decisión medida, no un olvido. Walk-forward
 * del 26/09/2026 sobre las 303 proyecciones de la BetPlay 2026 y 2026/27, comparando partido a partido: en
 * goles el prior baja el error absoluto medio 0,085 ± 0,021, y en corners lo SUBE 0,087 ± 0,048 (con K_PRIOR
 * 5, 0,126 ± 0,057: ya fuera del ruido). Las tarjetas se quedan igual (0,003 ± 0,033). Lo que un equipo
 * marca y encaja se parece de una temporada a otra; sus corners, no lo bastante.
 *
 * Diferencia deliberada con el Excel: si la liga no tiene NINGÚN dato de la métrica,
 * el Excel devuelve 0 y aquí se devuelve `null` ⇒ la interfaz muestra "N/D".
 * No se inventa un 0 que parecería una predicción real.
 */
export function calculateExpectedMetric(
  metric: Metric,
  homeSplit: SplitStats,
  awaySplit: SplitStats,
  averages: LeagueAverages,
  params: MetricParams,
): ExpectedPair {
  const keys = LEAGUE_KEYS[metric];
  const noData =
    homeSplit[metric].sample === 0 &&
    awaySplit[metric].sample === 0 &&
    (averages[keys.homeFor] as number) === 0 &&
    (averages[keys.awayFor] as number) === 0;
  if (noData) return { home: null, away: null, total: null };

  // Con promedios por muestra, la evidencia de la contracción son los partidos con el dato: un
  // equipo con 8 PJ y 2 partidos con corners no aporta 8 observaciones de corners.
  const n = (s: SplitStats) =>
    params.statAverageMode === 'muestra' ? s[metric].sample : s.played;

  const home = expectedFromStrengths(
    homeSplit[metric].avgFor,
    n(homeSplit),
    averages[keys.homeFor] as number,
    awaySplit[metric].avgAgainst,
    n(awaySplit),
    averages[keys.awayAgainst] as number,
    params.kShrink,
  );
  const away = expectedFromStrengths(
    awaySplit[metric].avgFor,
    n(awaySplit),
    averages[keys.awayFor] as number,
    homeSplit[metric].avgAgainst,
    n(homeSplit),
    averages[keys.homeAgainst] as number,
    params.kShrink,
  );
  return { home, away, total: home + away };
}

export type MetricParams = Pick<ModelParams, 'kShrink'> & Partial<Pick<ModelParams, 'statAverageMode'>>;

/** Temporadas anteriores del local en casa y del visitante fuera. */
export type MetricHistory = { home?: SplitStats | null; away?: SplitStats | null };

export const calculateExpectedCorners = (h: SplitStats, a: SplitStats, avg: LeagueAverages, p: MetricParams) =>
  calculateExpectedMetric('corners', h, a, avg, p);

export const calculateExpectedCards = (h: SplitStats, a: SplitStats, avg: LeagueAverages, p: MetricParams) =>
  calculateExpectedMetric('cards', h, a, avg, p);

/** PROYECCIONES!O — el Excel solo publica el TOTAL; aquí además el desglose. */
export const calculateExpectedShots = (h: SplitStats, a: SplitStats, avg: LeagueAverages, p: MetricParams) =>
  calculateExpectedMetric('shots', h, a, avg, p);

/** PROYECCIONES!P. */
export const calculateExpectedShotsOnTarget = (h: SplitStats, a: SplitStats, avg: LeagueAverages, p: MetricParams) =>
  calculateExpectedMetric('shotsOnTarget', h, a, avg, p);
