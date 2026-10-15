/**
 * Tickets combinados. PICKS_METHODOLOGY.md §5.
 *
 * La probabilidad de que acierten todas las selecciones NO se calcula multiplicando cuando hay
 * dependencia:
 *
 *  - Partidos distintos: se multiplican (supuesto de independencia entre partidos; se indica).
 *  - Mismo partido y misma variable del modelo: probabilidad conjunta EXACTA con la misma
 *    distribución que dio las individuales (goles y BTTS sobre la matriz de marcadores Poisson; 1X2 y
 *    doble oportunidad sobre sus resultados; corners, tarjetas o goles de una parte sobre su distribución de conteo).
 *  - Mismo partido y variables distintas (p. ej. goles y corners): el modelo no mide su dependencia.
 *    No se inventa: se dan las cotas de Fréchet, válidas para cualquier dependencia,
 *        máx(0, pA + pB − 1)  ≤  P(A y B)  ≤  mín(pA, pB)
 */
import type {
  BetStatus,
  CorrelationLevel,
  JointMethod,
  Selection,
} from '../../types/betting';
import type { Probabilities1X2 } from '../../types';
import { poissonPmf } from '../probability/poisson';
import { goalDifferenceDistribution, MAX_GOALS } from '../probability/goalDifference';
import { countCdf, type CountDistribution } from '../probability/negativeBinomial';
import { correlationBetween, maxCorrelation, outcomeOnScore, selectionGroup, selectionKey } from './markets';

export interface JointLeg {
  fixtureId: string;
  selection: Selection;
  odds: number;
  probability: number;
  lambdaHome: number;
  lambdaAway: number;
  probs1x2: Probabilities1X2;
  /** Distribución de conteo de corners o tarjetas (solo en esos mercados). */
  distribution: CountDistribution | null;
}

export interface PairCorrelation {
  a: number;
  b: number;
  level: CorrelationLevel;
  /** Conjunta exacta si las dos son de la misma variable del modelo. */
  joint: number | null;
  /** Lo que daría multiplicar como si fueran independientes. */
  independent: number;
}

export interface JointResult {
  probability: number | null;
  low: number;
  high: number;
  method: JointMethod;
  correlation: CorrelationLevel;
  pairs: PairCorrelation[];
  notes: string[];
  /** Motivo por el que el ticket no es válido (duplicado, incompatible). */
  invalid: string | null;
}

export function combinedOdds(odds: number[]): number {
  return odds.reduce((a, b) => a * b, 1);
}

/**
 * P(todas) para selecciones del MISMO partido y la MISMA variable. Cuenta solo «gana»: un ticket no
 * admite selecciones que puedan acabar en devolución (ver `evaluateTicket`).
 */
function conjuntaGrupo(legs: JointLeg[]): number {
  const g = selectionGroup(legs[0].selection);
  const ref = legs[0];
  const ganan = (i: number, j: number) => legs.every((l) => outcomeOnScore(l.selection, i, j) === 'gana');
  if (g === 'resultado') {
    // 1X2, doble oportunidad y hándicaps solo dependen de la diferencia de goles k: marcador k–0 o 0–(−k).
    const d = goalDifferenceDistribution(ref.lambdaHome, ref.lambdaAway, ref.probs1x2);
    if (!d) return NaN;
    return d.reduce((a, x, idx) => {
      const k = idx - MAX_GOALS;
      return ganan(Math.max(k, 0), Math.max(-k, 0)) ? a + x : a;
    }, 0);
  }
  if (g === 'goles') {
    let total = 0;
    for (let i = 0; i <= MAX_GOALS; i++) {
      const pi = poissonPmf(i, ref.lambdaHome);
      for (let j = 0; j <= MAX_GOALS; j++) {
        if (ganan(i, j)) total += pi * poissonPmf(j, ref.lambdaAway);
      }
    }
    return total;
  }
  // Corners, tarjetas o goles de una parte: intervalo [desde, hasta] de valores que cumplen todas.
  const d = legs.find((l) => l.distribution)?.distribution;
  if (!d) return NaN;
  let desde = 0;
  let hasta = Infinity;
  for (const l of legs) {
    const s = l.selection as Extract<Selection, { side: 'over' | 'under' }>;
    if (s.side === 'over') desde = Math.max(desde, Math.floor(s.line) + 1);
    else hasta = Math.min(hasta, Math.floor(s.line));
  }
  if (desde > hasta) return 0;
  const bajo = desde === 0 ? 0 : countCdf(desde - 1, d);
  return (hasta === Infinity ? 1 : countCdf(hasta, d)) - bajo;
}

export function jointProbability(legs: JointLeg[]): JointResult {
  const notes: string[] = [];
  const pairs: PairCorrelation[] = [];
  if (legs.length === 0) {
    return { probability: null, low: 0, high: 0, method: 'independiente', correlation: 'ninguna', pairs, notes, invalid: 'El ticket no tiene selecciones.' };
  }

  for (let i = 0; i < legs.length; i++) {
    for (let j = i + 1; j < legs.length; j++) {
      if (legs[i].fixtureId !== legs[j].fixtureId) continue;
      const level = correlationBetween(legs[i].selection, legs[j].selection);
      const mismoGrupo = selectionGroup(legs[i].selection) === selectionGroup(legs[j].selection);
      pairs.push({
        a: i,
        b: j,
        level,
        joint: mismoGrupo ? conjuntaGrupo([legs[i], legs[j]]) : null,
        independent: legs[i].probability * legs[j].probability,
      });
    }
  }
  const correlation = maxCorrelation(pairs.map((p) => p.level));
  if (pairs.some((p) => p.level === 'identica')) {
    return { probability: null, low: 0, high: 0, method: 'independiente', correlation, pairs, notes, invalid: 'Selección repetida en el mismo partido.' };
  }
  if (pairs.some((p) => p.level === 'excluyente')) {
    return { probability: null, low: 0, high: 0, method: 'independiente', correlation, pairs, notes, invalid: 'Selecciones incompatibles: no pueden acertar a la vez.' };
  }

  const porPartido = new Map<string, JointLeg[]>();
  for (const l of legs) porPartido.set(l.fixtureId, [...(porPartido.get(l.fixtureId) ?? []), l]);

  let exacta = 1;
  let low = 1;
  let high = 1;
  let conCotas = false;
  let mismoPartido = false;
  for (const grupoPartido of porPartido.values()) {
    if (grupoPartido.length > 1) mismoPartido = true;
    const porVariable = new Map<string, JointLeg[]>();
    for (const l of grupoPartido) {
      const g = selectionGroup(l.selection);
      porVariable.set(g, [...(porVariable.get(g) ?? []), l]);
    }
    // Sola en su variable, la selección conserva su probabilidad individual tal cual.
    const ps = [...porVariable.values()].map((g) => (g.length === 1 ? g[0].probability : conjuntaGrupo(g)));
    if (ps.some((p) => !Number.isFinite(p))) {
      return { probability: null, low: 0, high: 0, method: 'cotas', correlation, pairs, notes, invalid: 'No se pudo calcular la probabilidad conjunta de las selecciones del mismo partido.' };
    }
    if (ps.length === 1) {
      exacta *= ps[0];
      low *= ps[0];
      high *= ps[0];
    } else {
      conCotas = true;
      low *= Math.max(0, ps.reduce((a, b) => a + b, 0) - (ps.length - 1));
      high *= Math.min(...ps);
    }
  }

  if (porPartido.size > 1) notes.push('Entre partidos distintos se supone independencia.');
  if (conCotas) {
    notes.push(
      'Hay selecciones del mismo partido sobre variables distintas (p. ej. goles y corners): el modelo no mide cómo se relacionan, así que la probabilidad combinada no es estimable. Se muestra el rango posible para cualquier dependencia.',
    );
    return { probability: null, low, high, method: 'cotas', correlation, pairs, notes, invalid: null };
  }
  if (mismoPartido) notes.push('Las selecciones del mismo partido se combinan con su probabilidad conjunta exacta del modelo, no multiplicando.');
  return { probability: exacta, low: exacta, high: exacta, method: mismoPartido ? 'exacta' : 'independiente', correlation, pairs, notes, invalid: null };
}

/** Estado del ticket a partir del de sus selecciones. Una selección anulada sale de la cuota. */
export function settleTicketLegs(legs: { status: BetStatus; odds: number }[]): { status: BetStatus; settledOdds: number | null } {
  if (legs.some((l) => l.status === 'perdido')) return { status: 'perdido', settledOdds: null };
  if (legs.some((l) => l.status === 'pendiente')) return { status: 'pendiente', settledOdds: null };
  const vivas = legs.filter((l) => l.status === 'ganado');
  if (vivas.length === 0) return { status: 'anulado', settledOdds: 1 };
  return { status: 'ganado', settledOdds: combinedOdds(vivas.map((l) => l.odds)) };
}

export function ticketDuplicateKey(legs: { fixtureId: string; selection: Selection }[]): string {
  return legs
    .map((l) => `${l.fixtureId}#${selectionKey(l.selection)}`)
    .sort()
    .join('|');
}
