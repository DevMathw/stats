/**
 * Modelo de datos. Espejo tipado del libro Excel.
 *
 * Regla transversal: un dato que el proveedor NO entrega es `null`, nunca 0.
 * Ver MODEL_MAPPING.md §3.
 */

// ---------------------------------------------------------------------------
// Entidades primarias
// ---------------------------------------------------------------------------

/** Hoja LIGAS. */
export interface League {
  /** Nombre de la liga: es la clave real usada por todo el libro (PARTIDOS!A). */
  id: string;
  country: string;
  name: string;
  confederation: string;
  season: string;
  calendarFormat: string;
  /** `null` cuando LIGAS dice "Confirmar". */
  teamCount: number | null;
  regularSeasonRounds: string | null;
  approximateStartDate: string | null;
  source: string | null;
  reliabilityNotes: string | null;
}

/** Derivado de PARTIDOS: EQUIPOS solo aporta Liga + Equipo. */
export interface Team {
  /** `${leagueId}|${name}` — igual que EQUIPOS!D. */
  id: string;
  leagueId: string;
  name: string;
  country: string;
  season: string;
  /** Referencia global (`espn-86`) si se identificó. Interna. */
  ref?: string | null;
}

/** Hoja PARTIDOS. Solo columnas primarias; las derivadas se calculan. */
export interface Match {
  id: string;
  /** Id del proveedor externo, si vino de una sincronización. */
  providerId: string | null;
  leagueId: string;
  country: string;
  season: string;
  /** ISO `YYYY-MM-DD`. Fecha OFICIAL de la competición, la que ordena las jornadas. */
  date: string;
  /** Hora oficial local (`HH:mm`) según la fuente. El Excel no la tiene. */
  kickoffTime?: string | null;
  /**
   * Instante del saque inicial (ISO con `Z`), tal como lo publica la fuente. Es lo que permite enseñar la
   * hora de Colombia sin suponer nada. `null` en los partidos cargados antes de guardarlo: ahí se
   * reconstruye con la zona de la competición (`src/utils/matchTime.ts`).
   */
  kickoffUtc?: string | null;
  /**
   * Fase con nombre propio dentro de la temporada, tal como la publica la fuente («Clausura»,
   * «Championship Round»). `null` en las competiciones que numeran las jornadas de corrido. Importa porque
   * cada fase vuelve a numerar desde la jornada 1.
   */
  phase?: string | null;
  /** SIEMPRE numérico (1, 2, 3...). La UI muestra "J5". Es el número DENTRO de `phase`. */
  round: number;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;

  homeGoals: number | null;
  awayGoals: number | null;
  /**
   * Resultado adjudicado por decisión (incomparecencia, sanción): el marcador es oficial, pero el partido no se jugó
   * entero y no tiene estadísticas. Se guarda y se muestra, y no cuenta en el análisis (`countsForAnalysis`, DIFF-09).
   */
  awarded?: boolean;
  homeFirstHalfGoals: number | null;
  awayFirstHalfGoals: number | null;

  shotsHome: number | null;
  shotsAway: number | null;
  shotsOnTargetHome: number | null;
  shotsOnTargetAway: number | null;

  /** Fracción 0–1, como en el Excel (0.64 = 64 %). */
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

  source: string | null;
  /** ISO datetime. */
  updatedAt: string | null;

  /**
   * Procedencia de las ESTADÍSTICAS (corners, tarjetas, tiros), que puede ser distinta de
   * `source`: el marcador puede venir de la web oficial y las cifras de una secundaria
   * autorizada (`'FotMob (secundaria)'`). La URL exacta está en `statsCitations`.
   */
  statsSource: string | null;
  /** ISO datetime del último intento de completar las estadísticas. */
  statsUpdatedAt: string | null;
  /**
   * URLs de las que salieron las estadísticas. Es lo que hace auditable un dato buscado en
   * internet: cualquier cifra se puede comprobar abriendo su fuente.
   */
  statsCitations: string[];

  /**
   * Referencia global del equipo (`espn-86`): la misma para un club en todas sus
   * competiciones. La pone `attachTeamRefs`; `null` si no se pudo identificar sin adivinar.
   * Es interna y nunca se muestra.
   */
  homeTeamRef?: string | null;
  awayTeamRef?: string | null;

  /**
   * Datos escritos a mano en Partidos (claves de este mismo objeto: `xGHome`, `homeFirstHalfGoals`…).
   * Ninguna actualización los sustituye; si se borran en el formulario, vuelven a quedar para las fuentes.
   */
  manualFields?: string[];
}

export type FixtureStatus = 'Programado' | 'Aplazado' | 'Cancelado';

/** Hoja PARTIDOS PENDIENTES. */
export interface Fixture {
  id: string;
  providerId: string | null;
  leagueId: string;
  country: string;
  season: string;
  date: string;
  /** Hora oficial local (`HH:mm`) según la fuente. */
  kickoffTime?: string | null;
  /** Instante del saque inicial (ISO con `Z`). Ver `Match.kickoffUtc`. */
  kickoffUtc?: string | null;
  /** Fase con nombre propio, tal como la publica la fuente. Ver `Match.phase`. */
  phase?: string | null;
  round: number;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  status: FixtureStatus;
  source: string | null;

  /**
   * Referencia global del equipo (`espn-86`): la misma para un club en todas sus
   * competiciones. La pone `attachTeamRefs`; `null` si no se pudo identificar sin adivinar.
   * Es interna y nunca se muestra.
   */
  homeTeamRef?: string | null;
  awayTeamRef?: string | null;
}

// ---------------------------------------------------------------------------
// Parámetros del modelo (hoja CONFIGURACION)
// ---------------------------------------------------------------------------

export interface ModelParams {
  wBase: number;
  wForm5: number;
  wForm10: number;
  wXg: number;
  kShrink: number;
  wH2h: number;
  wSos: number;
  kLogistic: number;
  kDrawDecay: number;
  /**
   * `documented`: sin xG el peso W_XG cae a la fuerza base (metodología de CONFIGURACION
   * y requisito del enunciado).
   * `excel`: reproduce literalmente la fórmula del libro, donde xG ausente vale 0.
   * Ver MODEL_MAPPING.md DIFF-01.
   */
  xgMissingMode: 'documented' | 'excel';
  /**
   * Divisor de los promedios de corners, tarjetas, tiros y xG.
   * `muestra`: partidos con el dato reportado (sin sesgo si falta alguno).
   * `excel`: PJ, como `EQUIPOS!S = P/E`; con cobertura parcial el promedio queda por debajo.
   * Ver MODEL_MAPPING.md DIFF-07.
   */
  statAverageMode: 'muestra' | 'excel';
  /**
   * Qué partidos entran en «los últimos 5 / 10».
   * `fecha`: los que el equipo jugó de verdad, por fecha.
   * `excel`: la ventana de números de jornada del libro, que se congela al empezar una fase nueva.
   * Ver `src/domain/statistics/form.ts` y MODEL_MAPPING.md DIFF-12.
   */
  formWindowMode: FormWindowMode;
  /**
   * De dónde sale el 1X2.
   * `poisson`: la matriz de marcadores con las λ de la proyección, la misma que da Over y BTTS.
   * `excel`: la logística del libro con decaimiento del empate (K_LOGISTIC, K_DRAWDECAY).
   * Ver MODEL_MAPPING.md DIFF-11.
   */
  oneXTwoMode: 'poisson' | 'excel';
  /**
   * De dónde salen los goles esperados y el 1X2 de cada proyección.
   * `libro`: el modelo de siempre (fuerza base + forma + xG + H2H + SoS).
   * `mixto`: 70 % libro + 30 % de la mezcla de los siete modelos. Es el que mejor salió medido sobre
   * 1.628 partidos (log loss 1,0416 frente a 1,0434 del libro y 1,0486 del ensemble solo).
   * `ensemble`: solo los siete modelos.
   * En los dos últimos, un partido sin predicción se queda con el libro y la proyección lo dice.
   * Ver PREDICTION_ENGINE.md §7.
   */
  projectionSource: 'libro' | 'mixto' | 'ensemble';
  /**
   * Término de xG de los goles esperados.
   * `favorContra`: xG a favor del equipo × xG en contra del rival, relativo a la liga, como la fuerza base.
   * `excel`: solo el xG a favor del equipo, como el libro.
   * Ver MODEL_MAPPING.md DIFF-12.
   */
  xgStrengthMode: 'favorContra' | 'excel';
  /**
   * Hacia dónde se contraen las medias de GOLES y xG de cada equipo cuando lleva pocos partidos (córners,
   * tarjetas y tiros se quedan siempre en la media de liga: medido, ahí el histórico no aporta).
   * `historico`: hacia lo que ESE equipo hizo en las temporadas anteriores de la competición, contraído a su
   *   vez hacia la liga según cuántos partidos lo respalden. Una competición sin histórico da exactamente
   *   lo mismo que `liga`.
   * `liga`: hacia la media de la competición, como el libro.
   * Ver `projections/expectedValues.ts` y MODEL_MAPPING.md §10.
   */
  priorMode: 'historico' | 'liga';
  /** Partidos de histórico que hacen falta para que el prior pese la mitad. Solo con `priorMode: historico`. */
  kPrior: number;
}

/**
 * Resultado de una proyección según la probabilidad del favorito: `1` / `2` gana, `1X` / `2X` él o el empate,
 * `sinFavorito` ningún equipo llega al 45 %. Ver MODEL_MAPPING.md DIFF-03.
 */
export type OutcomePick = '1' | '1X' | 'sinFavorito' | '2X' | '2';

// ---------------------------------------------------------------------------
// Agregados estadísticos
// ---------------------------------------------------------------------------

/**
 * Suma + promedio de una métrica, con el tamaño de muestra que la respalda.
 * `sample = 0` ⇒ el proveedor no reportó el dato ⇒ `avgFor/avgAgainst = null` ⇒ "N/D".
 */
export interface StatAggregate {
  for: number;
  against: number;
  total: number;
  avgFor: number | null;
  avgAgainst: number | null;
  avgTotal: number | null;
  /** Nº de partidos en los que la métrica estaba reportada. */
  sample: number;
}

export interface RecordBlock {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  avgGoalsFor: number | null;
  avgGoalsAgainst: number | null;
  avgGoalsTotal: number | null;
}

/** Hoja EQUIPOS. */
export interface TeamStats extends RecordBlock {
  teamId: string;
  leagueId: string;
  teamName: string;
  country: string;

  corners: StatAggregate;
  cards: StatAggregate;
  shots: StatAggregate;
  shotsOnTarget: StatAggregate;
  xg: StatAggregate;

  bttsPct: number | null;
  over15Pct: number | null;
  over25Pct: number | null;
  over35Pct: number | null;
  under25Pct: number | null;
  cleanSheetPct: number | null;

  avgGoalsAsHome: number | null;
  avgGoalsAsAway: number | null;
  ppg: number | null;

  /** Rellenado por `calculateStandings` (EQUIPOS!BC). */
  position: number;
  /** EQUIPOS!BG. `null` si PJ = 0. */
  sos: number | null;
  form: RecentForm;
}

/** Hojas ESTADISTICAS HOME / ESTADISTICAS AWAY. */
export interface SplitStats extends RecordBlock {
  teamId: string;
  leagueId: string;
  teamName: string;
  side: 'home' | 'away';
  corners: StatAggregate;
  cards: StatAggregate;
  shots: StatAggregate;
  shotsOnTarget: StatAggregate;
  xg: StatAggregate;
  bttsPct: number | null;
  over15Pct: number | null;
  over25Pct: number | null;
  over35Pct: number | null;
  cleanSheetPct: number | null;
}

/** Una ventana de la hoja FORMA (últimos 5 o últimos 10). */
export interface FormWindow {
  window: 5 | 10;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  avgGoalsFor: number | null;
  avgGoalsAgainst: number | null;
}

export interface RecentForm {
  /** FORMA!D — jornada más alta jugada por el equipo. 0 si no ha jugado. */
  lastRound: number;
  last5: FormWindow;
  last10: FormWindow;
}

/** Fila de TABLA DE POSICIONES. */
export interface StandingRow {
  position: number;
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  ppg: number | null;
}

/** Medias de liga usadas por la contracción bayesiana. */
export interface LeagueAverages {
  leagueId: string;
  /** Media de `Prom GF` de los locales (AVERAGEIFS sobre ESTADISTICAS HOME!L). */
  homeGoalsFor: number;
  homeGoalsAgainst: number;
  awayGoalsFor: number;
  awayGoalsAgainst: number;
  homeCornersFor: number;
  homeCornersAgainst: number;
  awayCornersFor: number;
  awayCornersAgainst: number;
  homeCardsFor: number;
  homeCardsAgainst: number;
  awayCardsFor: number;
  awayCardsAgainst: number;
  homeShotsFor: number;
  homeShotsAgainst: number;
  awayShotsFor: number;
  awayShotsAgainst: number;
  homeSotFor: number;
  homeSotAgainst: number;
  awaySotFor: number;
  awaySotAgainst: number;
  /** AVERAGEIFS(EQUIPOS!BB) — media de PPG de la liga, para el ajuste SoS. */
  ppg: number;
  /** COUNTIFS(FT="X") / COUNTIFS(FT<>"") — fallback 0.25. */
  drawRate: number;
  /**
   * Fracción de los goles que llega en la 1.ª parte, contraída hacia la global (`calculateFirstHalfShare`). `null` si
   * la liga no tiene bastantes partidos con resultado al descanso. No existe en el Excel: DIFF-10.
   */
  firstHalfShare: number | null;
  /** Partidos de la liga con resultado al descanso. */
  halfTimeMatches: number;
  /** Medias de xG por condición, entre equipos con xG. 0 si nadie tiene xG (DIFF-12). */
  homeXgFor: number;
  homeXgAgainst: number;
  awayXgFor: number;
  awayXgAgainst: number;
}

// ---------------------------------------------------------------------------
// Proyecciones
// ---------------------------------------------------------------------------

export interface Probabilities1X2 {
  home: number;
  draw: number;
  away: number;
}

export interface MatchProjection {
  fixtureId: string;
  leagueId: string;
  /** Fecha oficial de la competición; la hora se enseña siempre en la de Colombia (`src/utils/matchTime.ts`). */
  date: string;
  kickoffTime: string | null;
  kickoffUtc: string | null;
  phase: string | null;
  round: number;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;

  expectedGoalsHome: number;
  expectedGoalsAway: number;
  expectedGoalsTotal: number;

  expectedCornersHome: number | null;
  expectedCornersAway: number | null;
  expectedCornersTotal: number | null;

  expectedCardsHome: number | null;
  expectedCardsAway: number | null;
  expectedCardsTotal: number | null;

  expectedShotsHome: number | null;
  expectedShotsAway: number | null;
  expectedShotsTotal: number | null;

  expectedSotHome: number | null;
  expectedSotAway: number | null;
  expectedSotTotal: number | null;

  /** Goles esperados en cada parte: λ total × proporción de la liga. `null` sin resultados al descanso. DIFF-10. */
  expectedGoalsFirstHalf: number | null;
  expectedGoalsSecondHalf: number | null;

  probOver15: number;
  probOver25: number;
  probOver35: number;
  /** Al menos 1 y al menos 2 goles en cada parte (Poisson). `null` sin resultados al descanso. */
  probOver05FirstHalf: number | null;
  probOver15FirstHalf: number | null;
  probOver05SecondHalf: number | null;
  probOver15SecondHalf: number | null;
  probBtts: number;
  probCleanSheetHome: number;
  probCleanSheetAway: number;
  probs1x2: Probabilities1X2;

  /** Resultado según la probabilidad del favorito (`resultPick`). Sustituye a la etiqueta del Excel: ver DIFF-03. */
  resultPick: OutcomePick;
  /** Marcador más probable de la matriz Poisson DENTRO de `resultPick`: nunca lo contradice. */
  mostLikelyScoreline: string;

  /** De dónde salieron los goles esperados y el 1X2 de ESTA proyección. */
  source: 'libro' | 'mixto' | 'ensemble';
  /** Modelos que entraron en la mezcla, si participaron. */
  modelsUsed: string[] | null;
  /** Confianza medida de esa predicción (0–10), si participaron los modelos. */
  modelConfidence: number | null;

  /** Desglose para la tarjeta de análisis. */
  breakdown: ProjectionBreakdown;
}

export interface ProjectionBreakdown {
  baseHome: number;
  baseAway: number;
  form5Home: number | null;
  form5Away: number | null;
  form10Home: number | null;
  form10Away: number | null;
  xgHome: number | null;
  xgAway: number | null;
  h2hAdjustment: number;
  h2hMatches: number;
  sosAdjustmentHome: number;
  sosAdjustmentAway: number;
  /** true si el peso W_XG cayó a la fuerza base por falta de xG. */
  xgFellBackHome: boolean;
  xgFellBackAway: boolean;
  /**
   * Partidos de temporadas ANTERIORES del propio equipo (el local en casa, el visitante fuera) que
   * respaldan la fuerza base. 0 = no había histórico y la contracción fue a la media de la liga, como el
   * libro. Es la trazabilidad de la proyección: de un vistazo se ve sobre qué se apoya.
   */
  priorMatchesHome: number;
  priorMatchesAway: number;
}

/** Hoja PROYECCION FINAL DE TEMPORADA. */
export interface SeasonProjection {
  teamId: string;
  leagueId: string;
  country: string;
  teamName: string;
  currentPosition: number;
  currentPoints: number;
  currentPlayed: number;
  remainingMatches: number;
  projectedRemainingPoints: number;
  projectedPoints: number;
  currentGoalsFor: number;
  projectedGoalsFor: number;
  currentGoalsAgainst: number;
  projectedGoalsAgainst: number;
  currentCorners: number;
  projectedCorners: number;
  currentCards: number;
  projectedCards: number;
  projectedPosition: number;
}

// ---------------------------------------------------------------------------
// Filtros del dashboard (nombres definidos F_PAIS, F_LIGA... del Excel)
// ---------------------------------------------------------------------------

/**
 * Dato del partido que se busca sin publicar (N/D) en Partidos: uno de los 11 que se piden a las fuentes, o
 * `any` para cualquiera. `cards` son las amarillas: así se llamaba antes y puede venir guardado.
 */
export type EmptyStat =
  | 'score'
  | 'possession'
  | 'shots'
  | 'shotsOnTarget'
  | 'corners'
  | 'fouls'
  | 'offsides'
  | 'cards'
  | 'redCards'
  | 'xg'
  | 'halfTime'
  | 'any';

/** Cómo se eligen los partidos de la forma reciente. Ver DIFF-12. */
export type FormWindowMode = 'fecha' | 'excel';

export interface Filters {
  country: string | null;
  leagueId: string | null;
  teamId: string | null;
  /**
   * Temporada en clave canónica (`2025`, `2026-27`). Solo se aplica en Partidos, como `emptyStat`: las
   * pantallas de análisis describen la temporada en curso y ahí un filtro de temporada no filtraría nada.
   */
  season: string | null;
  round: number | null;
  dateFrom: string | null;
  dateTo: string | null;
  /** Solo en Partidos: los disputados con esa columna vacía. */
  emptyStat: EmptyStat | null;
}

export const EMPTY_FILTERS: Filters = {
  country: null,
  leagueId: null,
  teamId: null,
  season: null,
  round: null,
  dateFrom: null,
  dateTo: null,
  emptyStat: null,
};
