/**
 * Filas del Excel de una liga, con la misma estructura que el libro base, y su envío al servidor
 * para guardarlo en `data/ligas/`.
 *
 * Las columnas derivadas (goles totales, BTTS, Over, HT/FT…) se escriben ya calculadas con las
 * mismas funciones que usa la app, que están validadas contra el Excel original.
 */
import { api } from '../apiBase';
import type { Fixture, League, Match } from '../../types';
import {
  awayCleanSheet,
  awayPossession,
  cornersTotal,
  firstHalfTotal,
  foulsTotal,
  hasResult,
  homeCleanSheet,
  isBtts,
  isOver,
  redCardsTotal,
  resultFT,
  resultHT,
  scoreline,
  secondHalfTotal,
  shotsOnTargetTotal,
  shotsTotal,
  totalGoals,
  yellowCardsTotal,
} from '../../domain/calculations/matchDerived';

export type Cell = string | number | null;

const siNo = (v: boolean | null): Cell => (v === null ? null : v ? 'Si' : 'No');

/** Una fila de PARTIDOS, en el orden exacto de sus 51 columnas. */
export function playedRow(m: Match, ppg?: { home: number | null; away: number | null }): Cell[] {
  return [
    m.leagueId, m.country, m.season, m.date, m.round, m.homeTeamName, m.awayTeamName,
    m.homeGoals, m.awayGoals, totalGoals(m),
    m.homeFirstHalfGoals, m.awayFirstHalfGoals, firstHalfTotal(m), secondHalfTotal(m),
    m.shotsHome, m.shotsAway, shotsTotal(m),
    m.shotsOnTargetHome, m.shotsOnTargetAway, shotsOnTargetTotal(m),
    m.possessionHome, awayPossession(m),
    m.cornersHome, m.cornersAway, cornersTotal(m),
    m.yellowCardsHome, m.yellowCardsAway, yellowCardsTotal(m),
    m.redCardsHome, m.redCardsAway, redCardsTotal(m),
    m.foulsHome, m.foulsAway, foulsTotal(m),
    m.offsidesHome, m.offsidesAway,
    m.xGHome, m.xGAway,
    siNo(isBtts(m)), siNo(isOver(m, 1.5)), siNo(isOver(m, 2.5)), siNo(isOver(m, 3.5)),
    siNo(homeCleanSheet(m)), siNo(awayCleanSheet(m)),
    resultHT(m), resultFT(m), scoreline(m),
    m.source, m.updatedAt ? m.updatedAt.slice(0, 10) : null,
    ppg?.home ?? null, ppg?.away ?? null,
  ];
}

export function pendingRow(f: Fixture): Cell[] {
  return [f.leagueId, f.country, f.season, f.date, f.round, f.homeTeamName, f.awayTeamName, f.status, f.source];
}

export function leagueRow(l: League): Cell[] {
  return [
    l.country, l.name, l.confederation, l.season, l.calendarFormat, l.teamCount,
    l.regularSeasonRounds, l.approximateStartDate, l.source, l.reliabilityNotes,
  ];
}

export interface LeagueExcelSaved {
  path: string;
  created: boolean;
  playedRows: number;
  preserved: number;
}

export async function saveLeagueExcel(input: {
  file: string;
  league: League;
  matches: Match[];
  fixtures: Fixture[];
  opponentPpg: Map<string, { home: number | null; away: number | null }>;
}): Promise<LeagueExcelSaved> {
  const res = await fetch(api('/api/league-excel'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      file: input.file,
      league: leagueRow(input.league),
      // PARTIDOS solo lleva partidos terminados, con marcador.
      played: input.matches.filter(hasResult).map((m) => playedRow(m, input.opponentPpg.get(m.id))),
      pending: input.fixtures.map(pendingRow),
    }),
  });
  const body = (await res.json().catch(() => null)) as (LeagueExcelSaved & { error?: string }) | null;
  if (!res.ok || !body) throw new Error(body?.error ?? `El servidor respondió ${res.status}`);
  return body;
}
