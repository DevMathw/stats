/**
 * UEFA Champions League, Europa League y Conference League: API oficial `match.uefa.com`.
 *
 * Solo entra la FASE LIGA. Las rondas previas numeran sus jornadas desde 1 por su cuenta y los
 * cruces eliminatorios no tienen jornada: mezclarlos rompería la cuenta de jornadas.
 */
import { getJson } from '../http.ts';
import { offsetDateTime } from '../time.ts';
import {
  SourceError,
  statValues,
  type MatchSource,
  type SourceMatch,
  type SourceStatus,
  type StatValues,
} from '../types.ts';

export interface UefaMatch {
  id: string | number;
  status?: string;
  round?: { metaData?: { type?: string } };
  matchday?: { sequenceNumber?: string | number };
  kickOffTime?: { dateTime?: string; utcOffsetInHours?: number };
  homeTeam?: { id?: string | number; internationalName?: string };
  awayTeam?: { id?: string | number; internationalName?: string };
  score?: { total?: { home?: number | null; away?: number | null } };
}

const ESTADOS: Record<string, SourceStatus> = {
  FINISHED: 'finished',
  UPCOMING: 'scheduled',
  LIVE: 'live',
  POSTPONED: 'postponed',
  CANCELLED: 'cancelled',
  CANCELED: 'cancelled',
  ABANDONED: 'suspended',
  SUSPENDED: 'suspended',
};

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** UEFA llama 2027 a la temporada 2026/27: desde julio ya cuenta la siguiente. */
export function uefaSeasonYear(now: Date): number {
  return now.getUTCMonth() >= 6 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
}

export function parseUefaMatches(data: UefaMatch[]): { matches: SourceMatch[]; notes: string[] } {
  const matches: SourceMatch[] = [];
  let fueraDeFaseLiga = 0;

  for (const m of data) {
    if (m.round?.metaData?.type !== 'GROUP_STANDINGS') {
      fueraDeFaseLiga++;
      continue;
    }
    const utc = m.kickOffTime?.dateTime;
    if (!utc) continue;
    const { date, time, utc: instante } = offsetDateTime(utc, m.kickOffTime?.utcOffsetInHours ?? 0);
    const jornada = Number(m.matchday?.sequenceNumber);
    const status = ESTADOS[m.status ?? ''] ?? 'scheduled';
    const terminado = status === 'finished';

    matches.push({
      sourceId: String(m.id),
      round: Number.isInteger(jornada) && jornada > 0 ? jornada : null,
      date,
      time,
      utc: instante,
      phase: null,
      homeTeam: m.homeTeam?.internationalName ?? '',
      awayTeam: m.awayTeam?.internationalName ?? '',
      homeGoals: terminado ? num(m.score?.total?.home) : null,
      awayGoals: terminado ? num(m.score?.total?.away) : null,
      homeHalfTime: null,
      awayHalfTime: null,
      status,
    });
  }

  return {
    matches,
    notes: fueraDeFaseLiga
      ? [`${fueraDeFaseLiga} partidos de rondas previas o eliminatorias omitidos: no pertenecen a la fase liga`]
      : [],
  };
}

export interface UefaTeamStats {
  teamId?: string | number;
  statistics?: { name?: string; value?: unknown }[];
}

/** Cifras de `matchstats.uefa.com`, emparejadas por el id de cada equipo. */
export function parseUefaStats(match: UefaMatch, equipos: UefaTeamStats[]): StatValues {
  const de = (id: unknown) =>
    Object.fromEntries(
      (equipos.find((t) => String(t.teamId) === String(id))?.statistics ?? []).map((s) => [s.name, s.value]),
    );
  const local = de(match.homeTeam?.id);
  const visitante = de(match.awayTeam?.id);
  const par = (k: string): [unknown, unknown] => [local[k], visitante[k]];
  return statValues({
    score: [match.score?.total?.home, match.score?.total?.away],
    shots: par('attempts'),
    onTarget: par('attempts_on_target'),
    possessionPct: par('ball_possession'),
    corners: par('corners'),
    yellow: par('yellow_cards'),
    red: par('red_cards'),
    fouls: par('fouls_committed'),
    offsides: par('offsides'),
  });
}

export function uefaSource(competitionId: number, name: string, seasonYear: number): MatchSource {
  const url =
    `https://match.uefa.com/v5/matches?competitionId=${competitionId}` +
    `&seasonYear=${seasonYear}&limit=500&offset=0&order=ASC`;
  return {
    name,
    secondary: false,
    async fetch() {
      const data = await getJson<UefaMatch[]>(url);
      const { matches, notes } = parseUefaMatches(Array.isArray(data) ? data : []);
      return { season: `${seasonYear - 1}/${String(seasonYear).slice(2)}`, url, matches, notes };
    },
    async matchStats(sourceId) {
      const statsUrl = `https://matchstats.uefa.com/v1/team-statistics/${encodeURIComponent(sourceId)}`;
      const [partidos, equipos] = await Promise.all([
        getJson<UefaMatch[]>(`https://match.uefa.com/v5/matches?matchId=${encodeURIComponent(sourceId)}`),
        getJson<UefaTeamStats[]>(statsUrl),
      ]);
      const partido = Array.isArray(partidos) ? partidos[0] : undefined;
      if (partido?.status !== 'FINISHED') throw new SourceError('el partido no consta como terminado', statsUrl);
      return { url: statsUrl, values: parseUefaStats(partido, Array.isArray(equipos) ? equipos : []) };
    },
  };
}
