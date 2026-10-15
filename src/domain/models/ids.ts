import type { Match, Fixture } from '../../types';

/** EQUIPOS!D — `Liga & "|" & Equipo`. */
export function buildTeamId(leagueId: string, teamName: string): string {
  return `${leagueId}|${teamName}`;
}

export function parseTeamId(teamId: string): { leagueId: string; teamName: string } {
  const i = teamId.indexOf('|');
  return { leagueId: teamId.slice(0, i), teamName: teamId.slice(i + 1) };
}

/**
 * Clave natural de un partido cuando el proveedor no da id.
 * Enunciado: `liga + temporada + fecha + equipo local + equipo visitante`.
 */
export function buildMatchKey(m: {
  leagueId: string;
  season: string;
  date: string;
  homeTeamName: string;
  awayTeamName: string;
}): string {
  return [m.leagueId, m.season, m.date, m.homeTeamName, m.awayTeamName].join('|');
}

/** Id preferente: el del proveedor; si no, la clave natural. */
export function resolveMatchId(m: {
  providerId?: string | null;
  leagueId: string;
  season: string;
  date: string;
  homeTeamName: string;
  awayTeamName: string;
}): string {
  return m.providerId ? `p:${m.providerId}` : buildMatchKey(m);
}

/** Ambas claves de un partido, para deduplicar contra registros heterogéneos. */
export function matchIdentityKeys(m: Match | Fixture): string[] {
  const keys = [buildMatchKey(m)];
  if (m.providerId) keys.push(`p:${m.providerId}`);
  return keys;
}

/** "J5" para la UI; internamente la jornada siempre es número. */
export function formatRound(round: number): string {
  return `J${round}`;
}
