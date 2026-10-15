/**
 * Premier League: la API de Pulselive, que es la plataforma de datos de premierleague.com.
 * Exige la cabecera `Origin` de la web oficial.
 */
import { getJson } from '../http.ts';
import { offsetDateTime } from '../time.ts';
import {
  optaStats,
  SourceError,
  type MatchSource,
  type SourceMatch,
  type SourceStatus,
  type StatValues,
} from '../types.ts';

const BASE = 'https://footballapi.pulselive.com/football';
const CABECERAS = { Origin: 'https://www.premierleague.com', Referer: 'https://www.premierleague.com/' };

export interface PlFixture {
  id: number;
  gameweek?: { gameweek?: number };
  kickoff?: { millis?: number; gmtOffset?: number };
  teams?: { team?: { id?: number; name?: string }; score?: number | null }[];
  status?: string;
  /** Solo en la ficha del partido (`/fixtures/{id}`): la lista de la temporada no lo trae. */
  halfTimeScore?: { homeScore?: number | null; awayScore?: number | null };
}

/** C = completado, U = por jugar, L/I = en juego, P = aplazado, A = suspendido. */
const ESTADOS: Record<string, SourceStatus> = {
  C: 'finished',
  U: 'scheduled',
  L: 'live',
  I: 'live',
  P: 'postponed',
  A: 'suspended',
};

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export function parsePremierLeague(fixtures: PlFixture[]): SourceMatch[] {
  const out: SourceMatch[] = [];
  for (const f of fixtures) {
    const millis = f.kickoff?.millis;
    const [local, visitante] = f.teams ?? [];
    if (typeof millis !== 'number' || !local?.team?.name || !visitante?.team?.name) continue;
    // `gmtOffset` es el desfase de la hora oficial británica ese día (GMT o BST).
    const { date, time, utc: instante } = offsetDateTime(new Date(millis).toISOString(), f.kickoff?.gmtOffset ?? 0);
    const status = ESTADOS[f.status ?? ''] ?? 'scheduled';
    const terminado = status === 'finished';
    out.push({
      sourceId: String(f.id),
      round: num(f.gameweek?.gameweek),
      date,
      time,
      utc: instante,
      phase: null,
      homeTeam: local.team.name,
      awayTeam: visitante.team.name,
      homeGoals: terminado ? num(local.score) : null,
      awayGoals: terminado ? num(visitante.score) : null,
      homeHalfTime: null,
      awayHalfTime: null,
      status,
    });
  }
  return out;
}

interface PlStats {
  data?: Record<string, { M?: { name?: string; value?: number }[] }>;
}

/**
 * Cifras de Opta por equipo, emparejadas con el local y el visitante del partido, y el marcador al
 * descanso de su ficha. Esta API no publica xG (comprobado el 14/09/2026).
 */
export function parsePremierLeagueStats(fixture: PlFixture, stats: PlStats): StatValues {
  const [local, visitante] = fixture.teams ?? [];
  const de = (id: number | undefined) =>
    Object.fromEntries((stats.data?.[String(id)]?.M ?? []).map((x) => [x.name, x.value]));
  return {
    ...optaStats(de(local?.team?.id), de(visitante?.team?.id), [local?.score, visitante?.score]),
    halfTimeHome: num(fixture.halfTimeScore?.homeScore),
    halfTimeAway: num(fixture.halfTimeScore?.awayScore),
  };
}

export function premierLeagueSource(): MatchSource {
  return {
    name: 'premierleague.com',
    secondary: false,
    async fetch() {
      const temporadas = await getJson<{ content?: { id: number; label: string }[] }>(
        `${BASE}/competitions/1/compseasons?page=0&pageSize=5`,
        { headers: CABECERAS },
      );
      const vigente = temporadas.content?.[0];
      if (!vigente) throw new Error('no publica ninguna temporada');
      const url = `${BASE}/fixtures?comps=1&compSeasons=${vigente.id}&page=0&pageSize=500&sort=asc`;
      const data = await getJson<{ content?: PlFixture[] }>(url, { headers: CABECERAS });
      return { season: vigente.label, url, matches: parsePremierLeague(data.content ?? []), notes: [] };
    },
    async matchStats(sourceId) {
      const url = `${BASE}/stats/match/${sourceId}`;
      const [partido, stats] = await Promise.all([
        getJson<PlFixture>(`${BASE}/fixtures/${sourceId}`, { headers: CABECERAS }),
        getJson<PlStats>(url, { headers: CABECERAS }),
      ]);
      if (partido.status !== 'C') throw new SourceError('el partido no consta como terminado', url);
      return { url, values: parsePremierLeagueStats(partido, stats) };
    },
  };
}
