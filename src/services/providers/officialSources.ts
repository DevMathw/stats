/**
 * Proveedor de «Actualizar partidos»: la fuente oficial de cada liga, consultada a través del
 * servidor local (`/api/official-matches`), que además prueba las secundarias autorizadas si la
 * oficial no sirve.
 *
 * Solo pasan a disputados los partidos TERMINADOS y con marcador. Los aplazados, cancelados, en
 * juego o por jugar van a pendientes. Un partido sin jornada se descarta con aviso: la jornada es
 * estructural en este modelo y no se inventa.
 */
import type { Fixture, League, Match, Team } from '../../types';
import { buildTeamId, resolveMatchId } from '../../domain/models/ids';
import { espnLeagueId } from '../../domain/models/espnLeagues';
import { espnIdFromRef } from '../../domain/models/teamIdentity';
import { EMPTY_STATISTICS, ProviderError, type FootballDataProvider, type MatchStatistics } from './types';
import type { UpdateAttempt } from '../sync/updateLog';
import type { MatchMomentum } from '../../domain/statistics/momentum';

export interface OfficialMatch {
  sourceId: string | null;
  round: number | null;
  date: string;
  time: string | null;
  /** Instante del saque inicial (ISO con `Z`), si la fuente lo publica. */
  utc: string | null;
  /** Fase con nombre propio dentro de la temporada, si la fuente la publica. */
  phase: string | null;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number | null;
  awayGoals: number | null;
  homeHalfTime: number | null;
  awayHalfTime: number | null;
  status: 'finished' | 'scheduled' | 'live' | 'postponed' | 'cancelled' | 'suspended';
  awarded?: boolean;
}

export interface OfficialFetch {
  league: { name: string; file: string; officialUrl: string };
  source: string;
  url: string;
  secondary: boolean;
  season: string;
  matches: OfficialMatch[];
  notes: string[];
  attempts: UpdateAttempt[];
}

/** Competiciones del registro que no vienen en el Excel base: se añaden desde Configuración. */
export const EXTRA_COMPETITIONS = [
  { slug: 'eng.2', name: 'EFL Championship' },
  { slug: 'uefa.champions', name: 'UEFA Champions League' },
  { slug: 'uefa.europa', name: 'UEFA Europa League' },
  { slug: 'uefa.europa.conf', name: 'UEFA Conference League' },
  { slug: 'aut.1', name: 'Bundesliga Austria' },
  { slug: 'gre.1', name: 'Super League Grecia' },
  { slug: 'nor.1', name: 'Eliteserien' },
  { slug: 'pol.1', name: 'Ekstraklasa' },
  { slug: 'sco.1', name: 'Scottish Premiership' },
  { slug: 'sui.1', name: 'Super League Suiza' },
  { slug: 'swe.1', name: 'Allsvenskan' },
  { slug: 'mex.1', name: 'Liga MX' },
  { slug: 'usa.1', name: 'MLS' },
];

/** Una fuente que consulta la competición: la oficial y después las secundarias, en su orden. */
export interface ConfiguredSource {
  name: string;
  /** Web oficial de la competición o de la secundaria. */
  url: string | null;
  secondary: boolean;
  /** Hoy se leen de ella los partidos y el calendario. */
  matches: boolean;
  /** Además publica estadísticas por partido que la app sabe leer. */
  stats: boolean;
  /** Se consulta, pero no aporta datos: el motivo medido. */
  reason: string | null;
}

/** Una de las competiciones del registro del servidor. */
export interface OfficialLeague {
  slug: string;
  name: string;
  country: string;
  confederation: string;
  file: string;
  officialUrl: string;
  season: string;
  /** Fuentes que consulta, en orden de prioridad. */
  sources: ConfiguredSource[];
}

const SIN_SERVIDOR = '¿Está corriendo npm run dev?';

export async function fetchOfficialLeagues(): Promise<OfficialLeague[]> {
  let res: Response;
  try {
    res = await fetch('/api/official-matches');
  } catch {
    throw new Error(`No se pudo contactar con el servidor local. ${SIN_SERVIDOR}`);
  }
  if (!res.ok) throw new Error(`El servidor local respondió ${res.status}. ${SIN_SERVIDOR}`);
  return (await res.json()) as OfficialLeague[];
}

export interface MomentumResponse {
  momentum: MatchMomentum | null;
  attempts: UpdateAttempt[];
}

export interface OfficialMatchStats {
  /** La primera fuente que aportó datos. */
  source: string | null;
  secondary: boolean;
  url: string | null;
  stats: MatchStatistics | null;
  filled: number;
  /** Marcador al descanso: solo en las competiciones con fuente oficial + FotMob. */
  halfTime: { home: number; away: number } | null;
  /** Cada fuente que aportó algo, en orden, con los datos que dio. */
  contributions: { source: string; secondary: boolean; url: string | null; fields: string[] }[];
  /** Tarjetas que enseñan las cronologías de las fuentes: una cifra guardada por debajo es falsa y se borra. */
  minimums?: Record<string, number>;
  rejected: string[];
  attempts: UpdateAttempt[];
}

/**
 * Estadísticas de UN partido desde la fuente de su liga (la oficial y, si no las publica, las
 * secundarias autorizadas), a través del servidor local.
 */
export async function fetchOfficialMatchStats(
  match: Match,
  league: League,
  aliases: Record<string, string>,
): Promise<OfficialMatchStats> {
  const slug = espnLeagueId(league.name, league.country);
  if (!slug) throw new Error('la competición no tiene fuente configurada');
  if (match.homeGoals === null || match.awayGoals === null) {
    throw new Error('solo se pueden buscar estadísticas de partidos con marcador');
  }

  let res: Response;
  try {
    res = await fetch('/api/match-stats', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        slug,
        season: league.season,
        round: match.round,
        date: match.date,
        homeGoals: match.homeGoals,
        awayGoals: match.awayGoals,
        providerId: match.providerId,
        homeEspnId: espnIdFromRef(match.homeTeamRef),
        awayEspnId: espnIdFromRef(match.awayTeamRef),
        aliases,
      }),
    });
  } catch {
    throw new Error(`No se pudo contactar con el servidor local. ${SIN_SERVIDOR}`);
  }
  const body = (await res.json().catch(() => null)) as (OfficialMatchStats & { error?: string }) | null;
  if (!res.ok || !body) throw new Error(body?.error ?? `El servidor local respondió ${res.status}`);
  return body;
}

/**
 * Momentum de un partido desde la fuente de su liga, a través del servidor local.
 *
 * Vale igual para uno disputado y para uno pendiente o en juego: si hay marcador se manda, y con él la
 * fuente tiene que devolver ESE partido; sin él, se localiza por los dos equipos y la fecha.
 */
export async function fetchMatchMomentum(
  match: Pick<Match, 'leagueId' | 'date' | 'providerId' | 'homeTeamRef' | 'awayTeamRef'> &
    Partial<Pick<Match, 'homeGoals' | 'awayGoals'>>,
  league: League,
  aliases: Record<string, string>,
): Promise<MomentumResponse> {
  const slug = espnLeagueId(league.name, league.country);
  if (!slug) throw new Error('la competición no tiene fuente configurada');

  let res: Response;
  try {
    res = await fetch('/api/match-momentum', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        slug,
        season: league.season,
        date: match.date,
        providerId: match.providerId,
        homeGoals: match.homeGoals ?? null,
        awayGoals: match.awayGoals ?? null,
        homeEspnId: espnIdFromRef(match.homeTeamRef),
        awayEspnId: espnIdFromRef(match.awayTeamRef),
        aliases,
      }),
    });
  } catch {
    throw new Error(`No se pudo contactar con el servidor local. ${SIN_SERVIDOR}`);
  }
  const body = (await res.json().catch(() => null)) as (MomentumResponse & { error?: string }) | null;
  if (!res.ok || !body) throw new Error(body?.error ?? `El servidor local respondió ${res.status}`);
  return body;
}

/** Alta de una competición del registro que la app aún no tiene. Lo desconocido queda vacío. */
export function leagueFromOfficial(o: OfficialLeague): League {
  return {
    id: o.name,
    name: o.name,
    country: o.country,
    confederation: o.confederation,
    season: o.season,
    calendarFormat: '',
    teamCount: null,
    regularSeasonRounds: null,
    approximateStartDate: null,
    source: o.officialUrl,
    reliabilityNotes: null,
  };
}

export class OfficialSourcesProvider implements FootballDataProvider {
  readonly id = 'oficial';
  readonly name = 'Fuentes oficiales';
  /** Las fuentes dan la fecha y hora oficiales de la competición: mandan sobre las guardadas. */
  readonly officialLocalDates = true;
  /** Consulta que sirvió, por liga. */
  readonly fetched = new Map<string, OfficialFetch>();
  /** Cuando ninguna fuente sirvió: archivo de la liga y todos los intentos. */
  readonly failures = new Map<string, { file: string | null; attempts: UpdateAttempt[] }>();

  private readonly leagues: Map<string, League>;
  private readonly cache = new Map<string, Promise<OfficialFetch>>();
  private warnings: string[] = [];

  constructor(leagues: League[]) {
    this.leagues = new Map(leagues.map((l) => [l.id, l]));
  }

  takeWarnings(): string[] {
    const w = this.warnings;
    this.warnings = [];
    return w;
  }

  /** Una consulta por liga: partidos y pendientes salen de la misma respuesta. */
  load(leagueId: string): Promise<OfficialFetch> {
    const hit = this.cache.get(leagueId);
    if (hit) return hit;

    const promesa = (async () => {
      const league = this.leagues.get(leagueId);
      if (!league) throw new ProviderError(`Competición desconocida: ${leagueId}`);
      const slug = espnLeagueId(league.name, league.country);
      if (!slug) throw new ProviderError('No tiene fuente oficial configurada');

      let res: Response;
      try {
        res = await fetch('/api/official-matches', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ slug, season: league.season }),
        });
      } catch {
        throw new ProviderError(`No se pudo contactar con el servidor local. ${SIN_SERVIDOR}`);
      }

      const body = (await res.json().catch(() => null)) as
        | (Partial<OfficialFetch> & { error?: string; file?: string | null })
        | null;
      if (!res.ok || !body?.matches) {
        // Los intentos van al registro, uno por línea: no se amontonan en el mensaje.
        this.failures.set(leagueId, { file: body?.file ?? null, attempts: body?.attempts ?? [] });
        throw new ProviderError(body?.error ?? `El servidor local respondió ${res.status}`);
      }

      const r = body as OfficialFetch;
      this.fetched.set(leagueId, r);
      return r;
    })();

    this.cache.set(leagueId, promesa);
    return promesa;
  }

  async getLeagues(): Promise<League[]> {
    return [];
  }

  async getTeams(): Promise<Team[]> {
    return [];
  }

  private comun(leagueId: string, r: OfficialFetch, m: OfficialMatch) {
    const providerId = m.sourceId ? `${r.source}:${m.sourceId}` : null;
    const season = this.leagues.get(leagueId)?.season ?? '';
    const clave = { leagueId, season, date: m.date, homeTeamName: m.homeTeam, awayTeamName: m.awayTeam };
    return {
      id: resolveMatchId({ providerId, ...clave }),
      providerId,
      leagueId,
      country: '',
      season,
      date: m.date,
      kickoffTime: m.time,
      kickoffUtc: m.utc,
      phase: m.phase,
      homeTeamId: buildTeamId(leagueId, m.homeTeam),
      awayTeamId: buildTeamId(leagueId, m.awayTeam),
      homeTeamName: m.homeTeam,
      awayTeamName: m.awayTeam,
      source: r.secondary ? `${r.source} (secundaria)` : r.source,
    };
  }

  async getMatches(leagueId: string): Promise<Match[]> {
    const r = await this.load(leagueId);
    const out: Match[] = [];
    for (const m of r.matches) {
      if (m.status !== 'finished' || m.homeGoals === null || m.awayGoals === null) continue;
      if (m.round === null) {
        this.warnings.push(`${m.homeTeam} - ${m.awayTeam} (${m.date}) descartado: la fuente no publica su jornada`);
        continue;
      }
      out.push({
        ...this.comun(leagueId, r, m),
        round: m.round,
        homeGoals: m.homeGoals,
        awayGoals: m.awayGoals,
        homeFirstHalfGoals: m.homeHalfTime,
        awayFirstHalfGoals: m.awayHalfTime,
        ...EMPTY_STATISTICS,
        updatedAt: new Date().toISOString(),
        statsSource: null,
        statsUpdatedAt: null,
        statsCitations: [],
        ...(m.awarded ? { awarded: true } : {}),
      });
    }
    return out;
  }

  async getFixtures(leagueId: string): Promise<Fixture[]> {
    const r = await this.load(leagueId);
    const out: Fixture[] = [];
    for (const m of r.matches) {
      if (m.status === 'finished' || m.round === null) continue;
      out.push({
        ...this.comun(leagueId, r, m),
        round: m.round,
        status:
          m.status === 'postponed' || m.status === 'suspended'
            ? 'Aplazado'
            : m.status === 'cancelled'
              ? 'Cancelado'
              : 'Programado',
      });
    }
    return out;
  }

  /** Las fuentes de calendario no aportan estadísticas de partido. */
  async getMatchStatistics(): Promise<MatchStatistics | null> {
    return null;
  }
}
