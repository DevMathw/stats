/**
 * Ligue 1: la API `ma-api.ligue1.fr` que usa ligue1.com, una jornada por petición.
 */
import { getJson, pausa } from '../http.ts';
import { localDateTime } from '../time.ts';
import {
  SourceError,
  statValues,
  type MatchSource,
  type SourceMatch,
  type SourceStatus,
  type StatValues,
} from '../types.ts';

const CABECERAS = { Origin: 'https://ligue1.com', Referer: 'https://ligue1.com/' };
const MAX_JORNADAS = 38;

interface L1Club {
  score?: number | null;
  clubIdentity?: { name?: string };
}
export interface L1Match {
  matchId: string;
  gameWeekNumber?: number;
  date?: string;
  period?: string;
  home?: L1Club;
  away?: L1Club;
}

export function ligue1Status(period: string | undefined): SourceStatus {
  if (period === 'fullTime') return 'finished';
  if (!period || period === 'preMatch') return 'scheduled';
  if (/postpon/i.test(period)) return 'postponed';
  if (/cancel/i.test(period)) return 'cancelled';
  if (/abandon|suspend|interrupt/i.test(period)) return 'suspended';
  return 'live';
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export function parseLigue1Week(matches: L1Match[]): SourceMatch[] {
  const out: SourceMatch[] = [];
  for (const m of matches) {
    const local = m.home?.clubIdentity?.name;
    const visitante = m.away?.clubIdentity?.name;
    if (!m.date || !local || !visitante) continue;
    const { date, time, utc } = localDateTime(m.date, 'Europe/Paris');
    const status = ligue1Status(m.period);
    const terminado = status === 'finished';
    out.push({
      sourceId: m.matchId,
      round: num(m.gameWeekNumber),
      date,
      time,
      utc,
      phase: null,
      homeTeam: local,
      awayTeam: visitante,
      homeGoals: terminado ? num(m.home?.score) : null,
      awayGoals: terminado ? num(m.away?.score) : null,
      homeHalfTime: null,
      awayHalfTime: null,
      status,
    });
  }
  return out;
}

interface L1Stats {
  possessionPercentage?: number;
  expectedGoals?: number;
  scoringAttempts?: number;
  ontargetScoringAttempts?: number;
  corners?: number;
  fouls?: number;
  offsides?: number;
  bookingsData?: { yellow?: number; red?: number };
}
export interface L1MatchDetail {
  period?: string;
  home?: L1Club & { stats?: L1Stats };
  away?: L1Club & { stats?: L1Stats };
}

/** Cifras de cada club en la ficha del partido de `ma-api.ligue1.fr`. */
export function parseLigue1Stats(m: L1MatchDetail): StatValues {
  const h = m.home?.stats;
  const a = m.away?.stats;
  return statValues({
    score: [m.home?.score, m.away?.score],
    shots: [h?.scoringAttempts, a?.scoringAttempts],
    onTarget: [h?.ontargetScoringAttempts, a?.ontargetScoringAttempts],
    possessionPct: [h?.possessionPercentage, a?.possessionPercentage],
    corners: [h?.corners, a?.corners],
    yellow: [h?.bookingsData?.yellow, a?.bookingsData?.yellow],
    red: [h?.bookingsData?.red, a?.bookingsData?.red],
    fouls: [h?.fouls, a?.fouls],
    offsides: [h?.offsides, a?.offsides],
    xg: [h?.expectedGoals, a?.expectedGoals],
  });
}

export function ligue1Source(seasonStartYear: number): MatchSource {
  const url = (jornada: number) =>
    `https://ma-api.ligue1.fr/championship-matches/championship/1/game-week/${jornada}?season=${seasonStartYear}`;
  return {
    name: 'ligue1.com',
    secondary: false,
    async fetch() {
      const partidos: SourceMatch[] = [];
      // Se recorren jornadas hasta la primera que aún no ha empezado, incluida: esa es la que
      // aporta los próximos pendientes. Las siguientes no hacen falta.
      for (let jornada = 1; jornada <= MAX_JORNADAS; jornada++) {
        if (jornada > 1) await pausa();
        const data = await getJson<{ matches?: L1Match[] }>(url(jornada), { headers: CABECERAS });
        const semana = parseLigue1Week(data.matches ?? []);
        if (semana.length === 0) break;
        partidos.push(...semana);
        if (semana.every((p) => p.status === 'scheduled')) break;
      }
      return {
        season: `${seasonStartYear}/${String(seasonStartYear + 1).slice(2)}`,
        url: url(1),
        matches: partidos,
        notes: [],
      };
    },
    async matchStats(sourceId) {
      const ficha = `https://ma-api.ligue1.fr/championship-match/${encodeURIComponent(sourceId)}`;
      const m = await getJson<L1MatchDetail>(ficha, { headers: CABECERAS });
      if (ligue1Status(m.period) !== 'finished') throw new SourceError('el partido no consta como terminado', ficha);
      return { url: ficha, values: parseLigue1Stats(m) };
    },
  };
}
