/**
 * Contrato del proveedor externo de datos.
 *
 * El resto de la aplicación depende SOLO de esta interfaz: cambiar de SofaScore a otro
 * proveedor es escribir otro adaptador y registrarlo en `providers/index.ts`.
 *
 * Regla innegociable: si la fuente no entrega una estadística ⇒ `null`. Nunca 0.
 */
import type { Fixture, League, Match, Team } from '../../types';
import type { ProviderCompetition } from '../../domain/models/competitionMatcher';

export type { ProviderCompetition };

/** Estadísticas de un partido tal y como las entrega el proveedor. */
export interface MatchStatistics {
  shotsHome: number | null;
  shotsAway: number | null;
  shotsOnTargetHome: number | null;
  shotsOnTargetAway: number | null;
  possessionHome: number | null;
  cornersHome: number | null;
  cornersAway: number | null;
  yellowCardsHome: number | null;
  yellowCardsAway: number | null;
  redCardsHome: number | null;
  redCardsAway: number | null;
  foulsHome: number | null;
  foulsAway: number | null;
  offsidesHome: number | null;
  offsidesAway: number | null;
  xGHome: number | null;
  xGAway: number | null;
}

/** Cuánto calendario futuro se quiere. Lo interpreta cada adaptador. */
export interface FixtureQueryOptions {
  /**
   * Nº de jornadas distintas a traer, contadas en orden cronológico desde la más próxima.
   * `undefined` o `0` = todo el calendario restante.
   */
  maxRounds?: number;
}

/**
 * Contrato del proveedor. Hoy solo hay una implementación (football-data.org), pero la
 * interfaz se mantiene porque es lo que permite añadir o cambiar de fuente escribiendo un
 * adaptador y nada más.
 */
export interface FootballDataProvider {
  readonly id: string;
  readonly name: string;
  /**
   * `true` si publica la fecha OFICIAL en la zona horaria de la competición: entonces su fecha
   * manda sobre la guardada. Sin esto se asume UTC y la fecha guardada no se toca.
   */
  readonly officialLocalDates?: boolean;
  getLeagues(): Promise<League[]>;
  getTeams(leagueId: string, seasonId: string): Promise<Team[]>;
  /** Partidos ya jugados (con marcador). */
  getMatches(leagueId: string, seasonId: string): Promise<Match[]>;
  /** Calendario futuro. */
  getFixtures(leagueId: string, seasonId: string, options?: FixtureQueryOptions): Promise<Fixture[]>;
  getMatchStatistics(matchId: string): Promise<MatchStatistics | null>;
  /**
   * Catálogo de competiciones del proveedor, para poder emparejarlas con la hoja LIGAS sin
   * teclear identificadores a mano. Opcional: no todos los proveedores lo publican.
   */
  listCompetitions?(): Promise<ProviderCompetition[]>;
  /**
   * Avisos no fatales acumulados desde la última llamada (y los vacía).
   * Sirve para contar lo que el proveedor entregó incompleto y hubo que descartar, en vez
   * de rellenarlo con un valor inventado.
   */
  takeWarnings?(): string[];
}

export const EMPTY_STATISTICS: MatchStatistics = {
  shotsHome: null,
  shotsAway: null,
  shotsOnTargetHome: null,
  shotsOnTargetAway: null,
  possessionHome: null,
  cornersHome: null,
  cornersAway: null,
  yellowCardsHome: null,
  yellowCardsAway: null,
  redCardsHome: null,
  redCardsAway: null,
  foulsHome: null,
  foulsAway: null,
  offsidesHome: null,
  offsidesAway: null,
  xGHome: null,
  xGAway: null,
};

/** Error de proveedor con contexto suficiente para mostrarlo en pantalla. */
export class ProviderError extends Error {
  readonly detail?: string;

  constructor(message: string, detail?: string) {
    super(message);
    this.name = 'ProviderError';
    this.detail = detail;
  }
}
