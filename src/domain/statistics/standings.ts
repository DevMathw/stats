/**
 * TABLA DE POSICIONES + EQUIPOS!BC. MODEL_MAPPING.md §6.
 *
 * El SUMPRODUCT del Excel cuenta cuántos equipos son "mejores"; aquí es el `sort`
 * equivalente:  Pts desc → DG desc → GF desc → nombre asc.
 */
import type { StandingRow, TeamStats } from '../../types';

export function compareStanding(a: TeamStats, b: TeamStats): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
  return a.teamName < b.teamName ? -1 : a.teamName > b.teamName ? 1 : 0;
}

/**
 * Ordena los equipos de UNA liga y devuelve la tabla.
 * Además fija `position` en los propios objetos `TeamStats` (equivale a EQUIPOS!BC).
 */
export function calculateStandings(teams: TeamStats[]): StandingRow[] {
  const sorted = [...teams].sort(compareStanding);
  return sorted.map((t, i) => {
    t.position = i + 1;
    return {
      position: i + 1,
      teamId: t.teamId,
      teamName: t.teamName,
      played: t.played,
      won: t.won,
      drawn: t.drawn,
      lost: t.lost,
      goalsFor: t.goalsFor,
      goalsAgainst: t.goalsAgainst,
      goalDiff: t.goalDiff,
      points: t.points,
      ppg: t.ppg,
    };
  });
}
