/**
 * Formato común de un partido tal como lo entrega una fuente, antes de pasar al modelo de la app.
 *
 * Cada competición tiene su propio extractor (la web de LaLiga no se parece en nada a la API de
 * UEFA), pero todos devuelven esto. Lo que la fuente no publica es `null`: nunca se rellena.
 */

import type { SourceTimeline } from '../../src/domain/statistics/momentum.ts';

export type SourceStatus = 'finished' | 'scheduled' | 'live' | 'postponed' | 'cancelled' | 'suspended';

export interface SourceMatch {
  /** Id del partido en la fuente. `null` si no publica ninguno. */
  sourceId: string | null;
  /** Jornada. `null` si la fuente no la publica: ese partido no se podrá cargar. */
  round: number | null;
  /** Fecha oficial en la hora local de la competición (`YYYY-MM-DD`). */
  date: string;
  /** Hora oficial local (`HH:mm`), si se publica. */
  time: string | null;
  /**
   * Instante del saque inicial (ISO con `Z`). Es la misma hora que `date` + `time`, sin zona de por medio:
   * con él se enseña la hora de Colombia sin suponer en qué país se juega. `null` si la fuente no lo publica.
   */
  utc: string | null;
  /**
   * Fase tal como la nombra la fuente («Clausura», «Championship Round», «Relegation Round»). `null` en las
   * competiciones que numeran las jornadas de corrido. La numeración de una fase EMPIEZA POR 1: sin la fase,
   * la jornada 1 del hexagonal y la 1 de la fase regular serían la misma.
   */
  phase: string | null;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number | null;
  awayGoals: number | null;
  homeHalfTime: number | null;
  awayHalfTime: number | null;
  status: SourceStatus;
  /** Resultado adjudicado por decisión (incomparecencia, sanción): no se jugó entero. Solo si la fuente lo publica. */
  awarded?: boolean;
}

export interface SourceResult {
  /** Temporada tal como la escribe la fuente («2026/2027», «2026 - Clausura»…). */
  season: string;
  /** URL principal consultada. */
  url: string;
  matches: SourceMatch[];
  /** Avisos no fatales: partidos descartados, fases excluidas… */
  notes: string[];
}

/**
 * Estadísticas de UN partido tal como las publica la fuente, con la posesión del local en % y el
 * marcador de la propia fuente, que comprueba que las cifras son de ESTE partido.
 */
export type StatValues = {
  scoreHomeFound: number | null;
  scoreAwayFound: number | null;
  shotsHome: number | null;
  shotsAway: number | null;
  shotsOnTargetHome: number | null;
  shotsOnTargetAway: number | null;
  possessionHomePct: number | null;
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
  /** Marcador al descanso, si la fuente lo publica. */
  halfTimeHome: number | null;
  halfTimeAway: number | null;
};

export interface SourceStats {
  /** De dónde salieron las cifras. */
  url: string;
  values: StatValues;
  /**
   * Lo mínimo que enseña la propia fuente en su cronología (una tarjeta por evento). Una cifra por debajo
   * no es la real: se descarta, y la guardada se borra.
   */
  minimums?: Partial<Record<keyof StatValues, number>>;
}

export interface MatchSource {
  /** Nombre legible para el log: «premierleague.com», «FotMob». */
  name: string;
  /** `true` para las fuentes de respaldo autorizadas. */
  secondary: boolean;
  /** Web de la secundaria que enlaza Configuración → Proveedor. La oficial enlaza la `officialUrl` de su liga. */
  site?: string;
  /** Se consulta, pero hoy no se pueden extraer sus partidos: el motivo medido. */
  unavailable?: string;
  fetch(): Promise<SourceResult>;
  /**
   * Estadísticas de un partido por su id en esta fuente. Solo lo tienen las fuentes que las
   * publican. `round` es la jornada, para las que tienen una página por jornada.
   */
  matchStats?(sourceId: string, round: number): Promise<SourceStats>;
  /**
   * Cronología de un partido (tiros con minuto y xG, goles y tarjetas): de ahí sale el momentum.
   * Solo lo tienen las fuentes que la publican.
   */
  matchTimeline?(sourceId: string): Promise<SourceTimeline>;
}

type Par = [unknown, unknown];

const numero = (v: unknown): number | null => {
  const x = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return typeof x === 'number' && Number.isFinite(x) ? x : null;
};

/** Valores a partir de pares [local, visitante]. Lo que no llega, o no es un número, queda `null`. */
export function statValues(p: {
  score: Par;
  shots: Par;
  onTarget: Par;
  possessionPct: Par;
  corners: Par;
  yellow: Par;
  red: Par;
  fouls: Par;
  offsides: Par;
  /** Solo las fuentes que publican xG. */
  xg?: Par;
  /** Solo las fuentes que publican el marcador al descanso. */
  halfTime?: Par;
}): StatValues {
  return {
    scoreHomeFound: numero(p.score[0]),
    scoreAwayFound: numero(p.score[1]),
    shotsHome: numero(p.shots[0]),
    shotsAway: numero(p.shots[1]),
    shotsOnTargetHome: numero(p.onTarget[0]),
    shotsOnTargetAway: numero(p.onTarget[1]),
    possessionHomePct: numero(p.possessionPct[0]),
    cornersHome: numero(p.corners[0]),
    cornersAway: numero(p.corners[1]),
    yellowCardsHome: numero(p.yellow[0]),
    yellowCardsAway: numero(p.yellow[1]),
    redCardsHome: numero(p.red[0]),
    redCardsAway: numero(p.red[1]),
    foulsHome: numero(p.fouls[0]),
    foulsAway: numero(p.fouls[1]),
    offsidesHome: numero(p.offsides[0]),
    offsidesAway: numero(p.offsides[1]),
    xGHome: numero(p.xg?.[0]),
    xGAway: numero(p.xg?.[1]),
    halfTimeHome: numero(p.halfTime?.[0]),
    halfTimeAway: numero(p.halfTime?.[1]),
  };
}

/**
 * Fuentes con datos de Opta (premierleague.com, laliga.com). Opta OMITE las cifras que valen 0: un
 * equipo sin rojas no trae `total_red_card`. Como eso no se distingue de «no publicado», quedan
 * `null`: nunca se convierte un dato desconocido en 0.
 */
export function optaStats(
  home: Record<string, unknown> | undefined,
  away: Record<string, unknown> | undefined,
  score: Par,
): StatValues {
  const par = (k: string): Par => [home?.[k], away?.[k]];
  return statValues({
    score,
    shots: par('total_scoring_att'),
    onTarget: par('ontarget_scoring_att'),
    possessionPct: par('possession_percentage'),
    corners: par('won_corners'),
    yellow: par('total_yel_card'),
    red: par('total_red_card'),
    fouls: par('fk_foul_lost'),
    offsides: par('total_offside'),
  });
}

export class SourceError extends Error {
  readonly url: string | null;

  constructor(message: string, url: string | null = null) {
    super(message);
    this.name = 'SourceError';
    this.url = url;
  }
}
