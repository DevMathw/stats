/**
 * Hojas ESTADISTICAS HOME / ESTADISTICAS AWAY. MODEL_MAPPING.md §5.
 *
 * Idéntico a EQUIPOS pero contando solo los partidos del lado indicado.
 */
import type { SplitStats, Team } from '../../types';
import {
  awayCleanSheet,
  homeCleanSheet,
  isBtts,
  isOver,
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

export function calculateSplitStats(
  team: Team,
  allRows: TeamMatch[],
  side: 'home' | 'away',
  mode: StatAverageMode = 'excel',
): SplitStats {
  const rows = allRows.filter((r) => r.isHome === (side === 'home'));
  const isHome = side === 'home';

  let won = 0;
  let drawn = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  let btts = 0;
  let over15 = 0;
  let over25 = 0;
  let over35 = 0;
  let cleanSheets = 0;

  for (const { match } of rows) {
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
  }

  const played = rows.length;
  const lost = played - won - drawn;

  return {
    teamId: team.id,
    leagueId: team.leagueId,
    teamName: team.name,
    side,
    played,
    won,
    drawn,
    lost,
    points: won * 3 + drawn,
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
    over25Pct: safeDiv(over25, played),
    over35Pct: safeDiv(over35, played),
    cleanSheetPct: safeDiv(cleanSheets, played),
  };
}

export const calculateHomeStats = (team: Team, rows: TeamMatch[]) =>
  calculateSplitStats(team, rows, 'home');

export const calculateAwayStats = (team: Team, rows: TeamMatch[]) =>
  calculateSplitStats(team, rows, 'away');
