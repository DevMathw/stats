/**
 * Adaptador de football-data.org (API v4). Es el único proveedor de la aplicación; todo lo
 * que sabe de esta API vive en este archivo, detrás de `FootballDataProvider`.
 *
 * Lo que hay que saber, sin adornos:
 *  - Necesita una **clave gratuita** (registro con email en football-data.org). Se guarda en el
 *    servidor local, que la añade en el proxy: el navegador nunca la ve. Sin ella devuelve 401.
 *  - El plan gratuito cubre 12 competiciones: Premier League, Championship, Champions League,
 *    LaLiga, Serie A, Bundesliga, Ligue 1, Eredivisie, Primeira Liga, Brasileirão, Mundial y
 *    Eurocopa. Europa League y Conference League son de pago: devuelven 403 y la
 *    sincronización lo informa como competición omitida.
 *  - NO entrega corners, tiros, posesión ni xG. Rellena marcadores, jornadas y calendario;
 *    las columnas de estadística avanzada siguen en N/D salvo que las cargues de otra fuente.
 *  - `matchday` viene del propio proveedor, así que la jornada no se deduce ni se inventa.
 */
import type { Fixture, League, Match, Team } from '../../types';
import type { ProviderCompetition } from '../../domain/models/competitionMatcher';
import { buildTeamId, resolveMatchId } from '../../domain/models/ids';
import {
  EMPTY_STATISTICS,
  ProviderError,
  type FixtureQueryOptions,
  type FootballDataProvider,
  type MatchStatistics,
} from './types';

/**
 * Liga (como se llama en LIGAS) → código de competición de football-data.org.
 * Verificado contra `GET /v4/competitions` el 08/09/2026.
 */
export const FOOTBALL_DATA_CODES: Record<string, string> = {
  'Premier League': 'PL',
  Championship: 'ELC',
  LaLiga: 'PD',
  'Serie A': 'SA',
  Bundesliga: 'BL1',
  'Ligue 1': 'FL1',
  Eredivisie: 'DED',
  'Liga Portugal (Primeira Liga)': 'PPL',
  'Brasileirao Serie A': 'BSA',
  'Champions League': 'CL',
  'UEFA Champions League': 'CL',
  // De pago en football-data.org (TIER_TWO / TIER_FOUR): se dejan mapeadas para que el error
  // que se muestre sea "no incluida en tu plan" y no "sin mapear".
  'Europa League': 'EL',
  'UEFA Europa League': 'EL',
  'Conference League': 'UCL',
  'UEFA Conference League': 'UCL',
  Superliga: 'DSU',
  'Belgian Pro League': 'BJL',
  'Super Lig': 'TSL',
  'Primera Division (Liga Profesional)': 'ASL',
  'Primera Division (Campeonato Nacional)': 'CPD',
  'Primera A (Liga BetPlay Dimayor)': 'CLP',
  'Primera Division (Uruguay)': 'UPD',
  'LigaPro Serie A': 'ELP',
};

/** El plan que football-data.org llama TIER_ONE es el gratuito. */
export const FREE_PLAN = 'TIER_ONE';

export interface FootballDataConfig {
  baseUrl: string;
  /** Liga → código de competición. Tiene prioridad sobre `FOOTBALL_DATA_CODES`. */
  codes: Record<string, string>;
  /**
   * Milisegundos mínimos entre peticiones. El plan gratuito permite 10 por minuto, así que
   * 6100 ms deja margen. Sin esto, sincronizar 20 ligas devuelve 429 en casi todas.
   */
  minIntervalMs: number;
}

export const DEFAULT_FOOTBALL_DATA_CONFIG: FootballDataConfig = {
  baseUrl: '/football-data/v4',
  codes: {},
  minIntervalMs: 6100,
};

interface FdTeam {
  id: number;
  name: string;
  shortName?: string;
  tla?: string;
}
interface FdMatch {
  id: number;
  utcDate: string;
  status: string;
  matchday: number | null;
  homeTeam: FdTeam;
  awayTeam: FdTeam;
  score?: {
    fullTime?: { home: number | null; away: number | null };
    halfTime?: { home: number | null; away: number | null };
  };
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export class FootballDataOrgProvider implements FootballDataProvider {
  readonly id = 'football-data';
  readonly name = 'football-data.org';

  private readonly config: FootballDataConfig;
  private warnings: string[] = [];
  /**
   * Una competición se descarga UNA vez por sincronización y de ahí salen tanto los partidos
   * jugados como el calendario. Antes eran 3 peticiones por liga; ahora es 1.
   */
  private readonly cache = new Map<string, Promise<FdMatch[]>>();
  private nextSlot = 0;

  constructor(config: FootballDataConfig = DEFAULT_FOOTBALL_DATA_CONFIG) {
    this.config = config;
  }

  /** Espacia las peticiones para no chocar con el límite del plan. */
  private async waitTurn(): Promise<void> {
    const now = Date.now();
    const at = Math.max(now, this.nextSlot);
    this.nextSlot = at + this.config.minIntervalMs;
    if (at > now) await new Promise((r) => setTimeout(r, at - now));
  }

  takeWarnings(): string[] {
    const w = this.warnings;
    this.warnings = [];
    return w;
  }

  private code(leagueId: string): string {
    const code = this.config.codes[leagueId]?.trim() || FOOTBALL_DATA_CODES[leagueId];
    if (!code) {
      throw new ProviderError(
        `"${leagueId}" no está mapeada a una competición de football-data.org.`,
        'Escribe su código (PL, ELC, CL…) en Configuración → Proveedor.',
      );
    }
    return code;
  }

  private async get<T>(path: string, leagueId?: string): Promise<T> {
    await this.waitTurn();
    let res: Response;
    try {
      // La clave la pone el servidor local en el proxy.
      res = await fetch(`${this.config.baseUrl}${path}`);
    } catch (e) {
      throw new ProviderError('No se pudo contactar con football-data.org.', String(e));
    }

    if (res.status === 401) {
      throw new ProviderError(
        'football-data.org rechazó la petición: falta la clave o no es válida.',
        'Guárdala en Configuración → Proveedor. Es gratuita: football-data.org/client/register.',
      );
    }
    if (res.status === 403) {
      const code = leagueId ? this.code(leagueId) : '';
      throw new ProviderError(
        `Tu plan no incluye esta competición${code ? ` (${code})` : ''}.`,
        'El plan gratuito cubre 12 competiciones. Europa League, Conference League y casi ' +
          'todas las sudamericanas requieren plan de pago. Pulsa «Buscar ids ' +
          'automáticamente» para ver cuáles cubre tu plan.',
      );
    }
    if (res.status === 429) {
      // No deberia pasar con el espaciado, pero si pasa se cede el turno un minuto entero.
      this.nextSlot = Date.now() + 60_000;
      throw new ProviderError(
        'Límite de peticiones alcanzado (el plan gratuito permite 10 por minuto).',
        'Actualiza esta competición sola desde la pantalla Ligas, o espera un minuto.',
      );
    }
    if (!res.ok) {
      throw new ProviderError(`football-data.org respondió ${res.status}`, `GET ${path}`);
    }
    return (await res.json()) as T;
  }

  /** Las ligas las gestiona la hoja LIGAS; el proveedor no las impone. */
  async getLeagues(): Promise<League[]> {
    return [];
  }

  /**
   * Catálogo completo en UNA petición, con el plan que hace falta para leer cada una.
   * Es lo que permite rellenar los códigos sin teclearlos y saber de antemano cuáles
   * cubre tu clave.
   */
  async listCompetitions(): Promise<ProviderCompetition[]> {
    interface FdCompetition {
      code: string | null;
      name: string;
      type: string;
      plan: string;
      area?: { name?: string };
      currentSeason?: { startDate?: string } | null;
    }
    const data = await this.get<{ competitions?: FdCompetition[] }>('/competitions');
    return (data.competitions ?? [])
      .filter((c) => !!c.code)
      .map((c) => ({
        id: c.code!,
        name: c.name,
        country: c.area?.name ?? '',
        // football-data usa LEAGUE / CUP en mayúsculas.
        type: c.type === 'LEAGUE' ? 'League' : 'Cup',
        currentSeason: c.currentSeason?.startDate
          ? Number(c.currentSeason.startDate.slice(0, 4))
          : null,
        plan: c.plan ?? null,
      }));
  }

  async getTeams(leagueId: string, seasonId: string): Promise<Team[]> {
    const data = await this.get<{ teams?: FdTeam[] }>(
      `/competitions/${this.code(leagueId)}/teams${seasonId ? `?season=${seasonId}` : ''}`,
      leagueId,
    );
    return (data.teams ?? []).map((t) => ({
      id: buildTeamId(leagueId, t.name),
      leagueId,
      name: t.name,
      country: '',
      season: seasonId,
    }));
  }

  /** Todos los partidos de la competición, cacheados por sincronización. */
  private allMatches(leagueId: string, seasonId: string): Promise<FdMatch[]> {
    const code = this.code(leagueId);
    const key = `${code}|${seasonId}`;
    const hit = this.cache.get(key);
    if (hit) return hit;

    const season = seasonId ? `?season=${seasonId}` : '';
    const promise = this.get<{ matches?: FdMatch[] }>(
      `/competitions/${code}/matches${season}`,
      leagueId,
    )
      .then((d) => d.matches ?? [])
      .catch((e) => {
        this.cache.delete(key); // un fallo no se cachea
        throw e;
      });
    this.cache.set(key, promise);
    return promise;
  }

  /**
   * La jornada es estructural (FORMA y PROYECCIONES comparan jornadas): si el proveedor no
   * la da, el partido se descarta con aviso en vez de escribir un 0 inventado.
   */
  private round(m: FdMatch, leagueId: string): number | null {
    if (typeof m.matchday === 'number' && m.matchday > 0) return m.matchday;
    this.warnings.push(
      `${leagueId}: ${m.homeTeam.name} - ${m.awayTeam.name} descartado, sin número de jornada ` +
        '(suele pasar en las eliminatorias, que no tienen jornada).',
    );
    return null;
  }

  async getMatches(leagueId: string, seasonId: string): Promise<Match[]> {
    const all = await this.allMatches(leagueId, seasonId);
    // AWARDED = resultado otorgado por decision (incomparecencia, sancion): esta terminado.
    // IN_PLAY y PAUSED NO lo estan, asi que no entran aqui: siguen siendo pendientes.
    const events = all.filter((e) => e.status === 'FINISHED' || e.status === 'AWARDED');
    const out: Match[] = [];
    for (const e of events) {
      const round = this.round(e, leagueId);
      if (round === null) continue;
      const date = e.utcDate.slice(0, 10);
      const base = {
        leagueId,
        season: seasonId,
        date,
        homeTeamName: e.homeTeam.name,
        awayTeamName: e.awayTeam.name,
      };
      out.push({
        id: resolveMatchId({ providerId: String(e.id), ...base }),
        providerId: String(e.id),
        leagueId,
        country: '',
        season: seasonId,
        date,
        round,
        homeTeamId: buildTeamId(leagueId, e.homeTeam.name),
        awayTeamId: buildTeamId(leagueId, e.awayTeam.name),
        homeTeamName: e.homeTeam.name,
        awayTeamName: e.awayTeam.name,
        homeGoals: num(e.score?.fullTime?.home),
        awayGoals: num(e.score?.fullTime?.away),
        homeFirstHalfGoals: num(e.score?.halfTime?.home),
        awayFirstHalfGoals: num(e.score?.halfTime?.away),
        // Este proveedor no publica corners, tiros, posesión ni xG: quedan en null (N/D).
        ...EMPTY_STATISTICS,
        source: this.name,
        updatedAt: new Date().toISOString(),
        statsSource: null,
        statsUpdatedAt: null,
        statsCitations: [],
      } satisfies Match);
    }
    return out;
  }

  async getFixtures(
    leagueId: string,
    seasonId: string,
    options?: FixtureQueryOptions,
  ): Promise<Fixture[]> {
    const all = await this.allMatches(leagueId, seasonId);
    // Todo lo que no esta terminado sigue pendiente, incluidos los que estan jugandose.
    const pending = all.filter((e) => e.status !== 'FINISHED' && e.status !== 'AWARDED');

    const out: Fixture[] = [];
    for (const e of pending) {
      const round = this.round(e, leagueId);
      if (round === null) continue;
      const date = e.utcDate.slice(0, 10);
      const base = {
        leagueId,
        season: seasonId,
        date,
        homeTeamName: e.homeTeam.name,
        awayTeamName: e.awayTeam.name,
      };
      out.push({
        id: resolveMatchId({ providerId: String(e.id), ...base }),
        providerId: String(e.id),
        leagueId,
        country: '',
        season: seasonId,
        date,
        round,
        homeTeamId: buildTeamId(leagueId, e.homeTeam.name),
        awayTeamId: buildTeamId(leagueId, e.awayTeam.name),
        homeTeamName: e.homeTeam.name,
        awayTeamName: e.awayTeam.name,
        status: e.status === 'POSTPONED' ? 'Aplazado' : 'Programado',
        source: this.name,
      } satisfies Fixture);
    }

    // El horizonte lo aplica el motor de sincronización, que es el único que sabe por qué
    // jornada va la liga. Recortar aquí también producía ventanas incoherentes (p. ej.
    // dejar fuera las jornadas intermedias y saltar de la J6 a la J13), y no ahorraba nada:
    // la competición entera viene en la misma respuesta.
    void options;
    return out;
  }

  /** football-data.org no publica estadísticas de partido en ningún plan. */
  async getMatchStatistics(): Promise<MatchStatistics | null> {
    return null;
  }

  /** Jornada en curso según el propio proveedor, sin deducirla. */
  async getCurrentMatchday(leagueId: string): Promise<number | null> {
    const data = await this.get<{ currentSeason?: { currentMatchday?: number | null } }>(
      `/competitions/${this.code(leagueId)}`,
      leagueId,
    );
    return num(data.currentSeason?.currentMatchday);
  }
}
