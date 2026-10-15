/**
 * Hoja PROYECCION FINAL DE TEMPORADA. MODEL_MAPPING.md §15.
 *
 * Los puntos proyectados restantes salen de las probabilidades 1X2 de cada partido
 * pendiente: V = 3, E = 1, D = 0.
 */
import type { Fixture, MatchProjection, SeasonProjection, TeamStats } from '../../types';
import { expectedPoints } from '../probability/matchProbabilities';

export function calculateSeasonProjection(
  teams: TeamStats[],
  fixtures: Fixture[],
  projections: MatchProjection[],
): SeasonProjection[] {
  const projByFixture = new Map(projections.map((p) => [p.fixtureId, p]));

  const rows: SeasonProjection[] = teams.map((t) => ({
    teamId: t.teamId,
    leagueId: t.leagueId,
    country: t.country,
    teamName: t.teamName,
    currentPosition: t.position,
    currentPoints: t.points,
    currentPlayed: t.played,
    remainingMatches: 0,
    projectedRemainingPoints: 0,
    projectedPoints: t.points,
    currentGoalsFor: t.goalsFor,
    projectedGoalsFor: t.goalsFor,
    currentGoalsAgainst: t.goalsAgainst,
    projectedGoalsAgainst: t.goalsAgainst,
    currentCorners: t.corners.for,
    projectedCorners: t.corners.for,
    currentCards: t.cards.for,
    projectedCards: t.cards.for,
    projectedPosition: 0,
  }));

  const byTeam = new Map(rows.map((r) => [r.teamId, r]));

  for (const f of fixtures) {
    const p = projByFixture.get(f.id);
    if (!p) continue;
    for (const isHome of [true, false]) {
      const row = byTeam.get(isHome ? f.homeTeamId : f.awayTeamId);
      if (!row) continue;
      row.remainingMatches++;
      row.projectedRemainingPoints += expectedPoints(p.probs1x2, isHome);
      row.projectedGoalsFor += isHome ? p.expectedGoalsHome : p.expectedGoalsAway;
      row.projectedGoalsAgainst += isHome ? p.expectedGoalsAway : p.expectedGoalsHome;
      const corners = isHome ? p.expectedCornersHome : p.expectedCornersAway;
      if (corners !== null) row.projectedCorners += corners;
      const cards = isHome ? p.expectedCardsHome : p.expectedCardsAway;
      if (cards !== null) row.projectedCards += cards;
    }
  }

  for (const r of rows) r.projectedPoints = r.currentPoints + r.projectedRemainingPoints;

  // Posición proyectada: Pts proy. → GF proy. → nombre. Sin diferencia de goles (así el Excel).
  const byLeague = new Map<string, SeasonProjection[]>();
  for (const r of rows) {
    const arr = byLeague.get(r.leagueId);
    if (arr) arr.push(r);
    else byLeague.set(r.leagueId, [r]);
  }
  for (const group of byLeague.values()) {
    group
      .slice()
      .sort((a, b) => {
        if (b.projectedPoints !== a.projectedPoints) return b.projectedPoints - a.projectedPoints;
        if (b.projectedGoalsFor !== a.projectedGoalsFor)
          return b.projectedGoalsFor - a.projectedGoalsFor;
        return a.teamName < b.teamName ? -1 : a.teamName > b.teamName ? 1 : 0;
      })
      .forEach((r, i) => {
        r.projectedPosition = i + 1;
      });
  }

  return rows;
}
