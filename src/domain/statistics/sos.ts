/**
 * Strength of Schedule. PARTIDOS!AX/AY + EQUIPOS!BG. MODEL_MAPPING.md §8.
 *
 * Segunda pasada: necesita el PPG de todos los equipos, que ya está calculado.
 * No hay circularidad porque PPG no depende del SoS.
 */
import type { TeamStats } from '../../types';
import type { TeamMatch } from './aggregate';
import { safeDiv } from './aggregate';

/** PPG del rival en cada partido, promediado sobre PJ. `null` si PJ = 0. */
export function calculateStrengthOfSchedule(
  rows: TeamMatch[],
  ppgByTeamId: Map<string, number | null>,
): number | null {
  let sum = 0;
  for (const { match, isHome } of rows) {
    const opponentId = isHome ? match.awayTeamId : match.homeTeamId;
    sum += ppgByTeamId.get(opponentId) ?? 0;
  }
  return safeDiv(sum, rows.length);
}

/** Aplica el SoS in-place a todos los equipos (equivale a rellenar EQUIPOS!BG). */
export function attachStrengthOfSchedule(
  stats: TeamStats[],
  rowsByTeam: Map<string, TeamMatch[]>,
): void {
  const ppg = new Map<string, number | null>(stats.map((s) => [s.teamId, s.ppg]));
  for (const s of stats) {
    s.sos = calculateStrengthOfSchedule(rowsByTeam.get(s.teamId) ?? [], ppg);
  }
}
