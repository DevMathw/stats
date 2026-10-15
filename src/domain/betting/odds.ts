/**
 * Cuotas decimales. PICKS_METHODOLOGY.md §3.
 *
 *   probabilidad implícita = 1 / cuota
 *   cuota justa            = 1 / probabilidad estimada
 *   edge                   = probabilidad estimada − probabilidad implícita
 *   valor esperado (por 1) = probabilidad estimada · cuota − 1
 *   cuota mínima aceptable = 1 / (probabilidad estimada − edge mínimo)
 *
 * La probabilidad implícita incluye el margen de la casa, que no se puede quitar sin las cuotas del
 * resto de resultados del mercado: es una cota superior de la probabilidad «real» según la casa.
 */

/** Por encima no es una cuota de un mercado de fútbol, es un error de escritura. */
export const MAX_ODDS = 1000;

export function roundMoney(x: number): number {
  return Math.round(x * 100) / 100;
}

/** `null` si la cuota es válida; si no, el motivo. */
export function validateOdds(odds: unknown): string | null {
  if (typeof odds !== 'number' || Number.isNaN(odds)) return 'Introduce una cuota decimal.';
  if (!Number.isFinite(odds)) return 'La cuota tiene que ser un número finito.';
  if (odds <= 1) return 'Una cuota decimal tiene que ser mayor que 1: con 1 o menos no hay ganancia posible.';
  if (odds > MAX_ODDS) return `Cuota fuera de rango (máximo ${MAX_ODDS}).`;
  return null;
}

export function isProbability(p: unknown): p is number {
  return typeof p === 'number' && Number.isFinite(p) && p >= 0 && p <= 1;
}

export function impliedProbability(odds: number): number {
  return 1 / odds;
}

/** `null` con probabilidad 0: ninguna cuota la haría justa. */
export function fairOdds(p: number): number | null {
  return p > 0 ? 1 / p : null;
}

export function edge(p: number, odds: number): number {
  return p - 1 / odds;
}

export function expectedValue(p: number, odds: number): number {
  return p * odds - 1;
}

/** Cuota a partir de la cual el edge alcanza el mínimo. `null` si ni una cuota infinita llega. */
export function minAcceptableOdds(p: number, minEdge: number): number | null {
  const objetivo = p - minEdge;
  return objetivo > 0 ? 1 / objetivo : null;
}

export type ValueState = 'valor' | 'sin-valor' | 'insuficiente';

export interface OddsAssessment {
  odds: number;
  impliedProbability: number;
  fairOdds: number | null;
  /** cuota disponible − cuota justa. */
  oddsDiff: number | null;
  edge: number | null;
  expectedValue: number | null;
  minAcceptableOdds: number | null;
  state: ValueState;
  reason: string;
}

/**
 * «Cuota factible»: la disponible frente a la justa. No mira el riesgo ni la muestra: eso es de
 * `recommendStake`. Una cuota no válida no se evalúa (`validateOdds` antes).
 *
 * Con devolución posible (línea entera), `p` es la probabilidad de ganar descontando la devolución y
 * `push` la de devolución: edge y cuota justa se leen sobre `p`, y el valor esperado por unidad es
 * (1 − push) · (p · cuota − 1), porque con devolución ni se gana ni se pierde.
 */
export function assessOdds(p: number | null, odds: number, minEdge: number, push = 0): OddsAssessment {
  const implied = impliedProbability(odds);
  if (p === null || !isProbability(p)) {
    return {
      odds,
      impliedProbability: implied,
      fairOdds: null,
      oddsDiff: null,
      edge: null,
      expectedValue: null,
      minAcceptableOdds: null,
      state: 'insuficiente',
      reason: 'Datos insuficientes para estimar la probabilidad.',
    };
  }
  const fair = fairOdds(p);
  const e = edge(p, odds);
  const pp = (x: number) => `${(x * 100).toFixed(1)} pp`;
  const state: ValueState = e >= minEdge && e > 0 ? 'valor' : 'sin-valor';
  return {
    odds,
    impliedProbability: implied,
    fairOdds: fair,
    oddsDiff: fair === null ? null : odds - fair,
    edge: e,
    expectedValue: (1 - push) * expectedValue(p, odds),
    minAcceptableOdds: minAcceptableOdds(p, minEdge),
    state,
    reason:
      state === 'valor'
        ? `La probabilidad estimada supera a la implícita en ${pp(e)}.`
        : e > 0
          ? `Edge de ${pp(e)}, por debajo del mínimo configurado (${pp(minEdge)}).`
          : `La cuota paga menos de lo que vale según el modelo (edge ${pp(e)}).`,
  };
}
