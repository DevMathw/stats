/**
 * Picks, tickets y wallet virtual. Moneda exclusivamente interna: nada de este módulo representa
 * dinero real. Ver PICKS_METHODOLOGY.md.
 */

export type MarketFamily =
  | 'resultado'
  | 'doble'
  | 'goles'
  | 'mitad'
  | 'btts'
  | 'asiatico'
  | 'europeo'
  | 'equipo'
  | 'cero'
  | 'corners'
  | 'tarjetas'
  | 'tiros'
  | 'sot'
  | 'conteoEquipo';

/**
 * Selección de un mercado. PICKS_METHODOLOGY.md §2.
 *
 * Las líneas X.5 no pueden empatar con el resultado. Las enteras de goles (asiáticas) y del hándicap
 * asiático sí: con el resultado justo en la línea se devuelve el stake («push»). No hay cuartos de línea
 * (x.25, x.75), que se liquidan a medias.
 *
 *  - `asiatico`: `line` se suma a los goles de `team`. Línea 0 = empate no válido.
 *  - `europeo`: `line` (entera, ≠ 0) se suma a los goles del LOCAL; tres resultados, sin devolución.
 *  - `equipo`: goles de un equipo. `cero`: portería a cero de `team` (el rival no marca).
 *  - `mitad`: goles de los dos equipos en la 1.ª (`half` 1) o la 2.ª parte (`half` 2). Se liquida con el descanso.
 *  - «tarjetas» = amarillas, que es lo que registran los datos (EQUIPOS del libro).
 *  - `tiros` y `sot` (tiros a puerta) son mercados de conteo como corners y tarjetas: misma matemática,
 *    otra variable. Ver `COUNT_MARKETS` en `markets.ts`.
 *  - `conteoEquipo`: el mismo conteo pero de UN equipo («corners del local»). Lleva su propia dispersión,
 *    porque la varianza de un equipo no es la del total: medido, φ 1,65 en corners por equipo frente a
 *    1,19 en el total.
 */
export type Selection =
  | { market: 'resultado'; outcome: 'home' | 'draw' | 'away' }
  | { market: 'doble'; outcome: '1X' | 'X2' | '12' }
  | { market: 'goles' | 'corners' | 'tarjetas' | 'tiros' | 'sot'; side: 'over' | 'under'; line: number }
  | { market: 'mitad'; half: 1 | 2; side: 'over' | 'under'; line: number }
  | { market: 'btts'; outcome: 'si' | 'no' }
  | { market: 'asiatico'; team: 'home' | 'away'; line: number }
  | { market: 'europeo'; line: number; outcome: 'home' | 'draw' | 'away' }
  | { market: 'equipo'; team: 'home' | 'away'; side: 'over' | 'under'; line: number }
  | { market: 'cero'; team: 'home' | 'away'; outcome: 'si' | 'no' }
  | { market: 'conteoEquipo'; stat: 'corners' | 'tarjetas' | 'tiros' | 'sot'; team: 'home' | 'away'; side: 'over' | 'under'; line: number };

export type DataQuality = 'alta' | 'media' | 'baja' | 'insuficiente';
export type RiskLevel = 'bajo' | 'medio' | 'alto';
export type CorrelationLevel = 'ninguna' | 'baja' | 'media' | 'alta' | 'excluyente' | 'identica';
export type BetStatus = 'pendiente' | 'ganado' | 'perdido' | 'anulado';

/** Kelly completo solo se muestra: nunca fija el stake. */
export type KellyMode = 'half' | 'quarter' | 'custom';

export interface RiskSettings {
  currencyName: string;
  currencyCode: string;
  /**
   * SC que vale 1 moneda. Las monedas son la unidad de lectura del simulador: stakes, ganancias y
   * pérdidas se muestran en monedas con su equivalencia en SC. Todo se guarda y calcula en SC.
   */
  coinValue: number;
  initialBankroll: number;
  /** 1 unidad = esta fracción del bankroll inicial. */
  unitPct: number;
  kellyMode: KellyMode;
  /** Fracción de Kelly en modo `custom`, (0, 0.5]. */
  customFraction: number;
  /** Tope de stake por pick, en fracción del bankroll. */
  maxKellyPct: number;
  /** Tope absoluto por pick en SC, múltiplo de 0.01 monedas. `null` = sin tope absoluto. */
  maxStakePerPick: number | null;
  maxDailyExposurePct: number;
  maxMatchExposurePct: number;
  maxCompetitionExposurePct: number;
  /** Por debajo no se recomienda stake. */
  minProbability: number;
  /** Edge mínimo, en tanto por uno (0.02 = 2 puntos porcentuales). */
  minEdge: number;
  maxOdds: number;
  /** Partidos mínimos de cada equipo en su condición (local en casa, visitante fuera). */
  minSample: number;
}

export interface RiskComponents {
  datos: number;
  modelo: number;
  mercado: number;
  varianza: number;
  correlacion: number;
}

export interface RiskAssessment {
  /** 0–100. */
  score: number;
  level: RiskLevel;
  components: RiskComponents;
  notes: string[];
}

/** El partido tal y como estaba al registrar el pick. */
export interface EventRef {
  fixtureId: string;
  providerId: string | null;
  leagueId: string;
  season: string;
  date: string;
  kickoffTime: string | null;
  round: number;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
}

export type BindingLimit =
  | 'kelly'
  | 'minimo'
  | 'maxKelly'
  | 'maxStake'
  | 'diario'
  | 'partido'
  | 'competicion'
  | 'saldo'
  | 'correlacion';

export interface PickRecord extends EventRef {
  id: string;
  cycle: number;
  createdAt: string;
  selection: Selection;
  odds: number;
  /** Instantánea del modelo al registrar. */
  probability: number;
  impliedProbability: number;
  edge: number;
  fairOdds: number;
  expectedValue: number;
  kellyFull: number;
  kellyMultiplier: number;
  /** stake / bankroll al registrar. */
  stakeFraction: number;
  confidence: number;
  dataQuality: DataQuality;
  risk: RiskAssessment;
  explanation: string[];
  stake: number;
  bankrollBefore: number;
  status: BetStatus;
  settledAt: string | null;
  matchId: string | null;
  resultNote: string | null;
  grossReturn: number | null;
  netProfit: number | null;
  bankrollAfter: number | null;
}

export interface TicketLeg extends EventRef {
  selection: Selection;
  odds: number;
  probability: number;
  status: BetStatus;
  matchId: string | null;
  resultNote: string | null;
}

export type JointMethod = 'independiente' | 'exacta' | 'cotas';

export interface TicketRecord {
  id: string;
  number: number;
  cycle: number;
  createdAt: string;
  legs: TicketLeg[];
  combinedOdds: number;
  /** Probabilidad conjunta si es estimable; si no, `null` y cuentan las cotas. */
  probability: number | null;
  probabilityLow: number;
  probabilityHigh: number;
  method: JointMethod;
  /** Probabilidad con la que se calculó Kelly (la conjunta o la cota inferior). */
  kellyProbability: number;
  kellyFull: number;
  stake: number;
  bankrollBefore: number;
  risk: RiskAssessment;
  status: BetStatus;
  settledAt: string | null;
  /** Cuota tras quitar las selecciones anuladas. */
  settledOdds: number | null;
  grossReturn: number | null;
  netProfit: number | null;
  bankrollAfter: number | null;
}

export type MovementType =
  | 'inicial'
  | 'deposito'
  | 'reinicio'
  | 'stake'
  | 'retorno'
  | 'perdida'
  | 'reembolso';

export interface Movement {
  id: string;
  cycle: number;
  at: string;
  type: MovementType;
  /** Con signo: el stake es negativo. */
  amount: number;
  /** Saldo disponible tras el movimiento. */
  balanceAfter: number;
  betId: string | null;
  note: string;
}

export interface DraftLeg {
  fixtureId: string;
  selection: Selection;
  odds: number | null;
}

export interface Profile {
  id: string;
  name: string;
  createdAt: string;
  settings: RiskSettings;
  cycle: number;
  movements: Movement[];
  picks: PickRecord[];
  tickets: TicketRecord[];
  ticketCounter: number;
  ticketDraft: DraftLeg[];
}
