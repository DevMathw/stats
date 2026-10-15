/**
 * Hoja EQUIPOS. MODEL_MAPPING.md §4.
 *
 * `rows` son ya los partidos del equipo (con resultado) junto con el lado en el que jugó.
 * El índice lo construye `domain/engine.ts` en una sola pasada sobre PARTIDOS.
 */
import type { RecentForm, StatAggregate, Team, TeamStats } from '../../types';
import {
  awayCleanSheet,
  homeCleanSheet,
  isBtts,
  isOver,
  pointsFor,
  resultFT,
} from '../calculations/matchDerived';
import {
  aggregateStat,
  cardsPicker,
  cornersPicker,
  safeDiv,
  shotsPicker,
  sotPicker,
  xgPicker,
  type StatAverageMode,
  type TeamMatch,
} from './aggregate';

export function emptyAggregate(): StatAggregate {
  return {
    for: 0,
    against: 0,
    total: 0,
    avgFor: null,
    avgAgainst: null,
    avgTotal: null,
    sample: 0,
  };
}

export function calculateTeamStats(
  team: Team,
  rows: TeamMatch[],
  form: RecentForm,
  mode: StatAverageMode = 'excel',
): TeamStats {
  let won = 0;
  let drawn = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  let btts = 0;
  let over15 = 0;
  let over25 = 0;
  let over35 = 0;
  let cleanSheets = 0;

  let homeGames = 0;
  let homeGoals = 0;
  let awayGames = 0;
  let awayGoals = 0;

  for (const { match, isHome } of rows) {
    const r = resultFT(match)!;
    if (r === 'X') drawn++;
    else if ((r === '1') === isHome) won++;

    goalsFor += (isHome ? match.homeGoals : match.awayGoals)!;
    goalsAgainst += (isHome ? match.awayGoals : match.homeGoals)!;

    if (isBtts(match)) btts++;
    if (isOver(match, 1.5)) over15++;
    if (isOver(match, 2.5)) over25++;
    if (isOver(match, 3.5)) over35++;
    if (isHome ? homeCleanSheet(match) : awayCleanSheet(match)) cleanSheets++;

    if (isHome) {
      homeGames++;
      homeGoals += match.homeGoals!;
    } else {
      awayGames++;
      awayGoals += match.awayGoals!;
    }
  }

  const played = rows.length;
  const lost = played - won - drawn;
  const points = won * 3 + drawn;
  const over25Pct = safeDiv(over25, played);

  return {
    teamId: team.id,
    leagueId: team.leagueId,
    teamName: team.name,
    country: team.country,

    played,
    won,
    drawn,
    lost,
    points,
    goalsFor,
    goalsAgainst,
    goalDiff: goalsFor - goalsAgainst,
    avgGoalsFor: safeDiv(goalsFor, played),
    avgGoalsAgainst: safeDiv(goalsAgainst, played),
    avgGoalsTotal: safeDiv(goalsFor + goalsAgainst, played),

    corners: aggregateStat(rows, cornersPicker, played, mode),
    cards: aggregateStat(rows, cardsPicker, played, mode),
    shots: aggregateStat(rows, shotsPicker, played, mode),
    shotsOnTarget: aggregateStat(rows, sotPicker, played, mode),
    xg: aggregateStat(rows, xgPicker, played, mode),

    bttsPct: safeDiv(btts, played),
    over15Pct: safeDiv(over15, played),
    over25Pct,
    over35Pct: safeDiv(over35, played),
    under25Pct: over25Pct === null ? null : 1 - over25Pct,
    cleanSheetPct: safeDiv(cleanSheets, played),

    avgGoalsAsHome: safeDiv(homeGoals, homeGames),
    avgGoalsAsAway: safeDiv(awayGoals, awayGames),
    ppg: safeDiv(points, played),

    position: 0, // lo fija calculateStandings
    sos: null, // lo fija calculateStrengthOfSchedule
    form,
  };
}

/** Puntos del equipo en un partido; reexportado por comodidad para los tests. */
export { pointsFor };
