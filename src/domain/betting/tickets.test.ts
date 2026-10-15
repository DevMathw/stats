import { describe, expect, it } from 'vitest';
import type { Selection } from '../../types/betting';
import { calculateBTTSProbability, calculateOverProbability } from '../probability/poisson';
import { countCdf, countDistribution, countOverProbability } from '../probability/negativeBinomial';
import { goalDifferenceDistribution, MAX_GOALS } from '../probability/goalDifference';
import { combinedOdds, jointProbability, settleTicketLegs, type JointLeg } from './tickets';

const DIST = countDistribution(10, { n: 60, mean: 10, variance: 14, index: 1.4 });

function leg(fixtureId: string, selection: Selection, odds = 1.9): JointLeg {
  const lh = 1.6;
  const la = 1.1;
  const probs1x2 = { home: 0.45, draw: 0.27, away: 0.28 };
  let probability: number;
  switch (selection.market) {
    case 'goles':
      probability = selection.side === 'over' ? calculateOverProbability(lh + la, selection.line) : 1 - calculateOverProbability(lh + la, selection.line);
      break;
    case 'btts':
      probability = selection.outcome === 'si' ? calculateBTTSProbability(lh, la) : 1 - calculateBTTSProbability(lh, la);
      break;
    case 'corners':
      probability = selection.side === 'over' ? countOverProbability(DIST, selection.line) : 1 - countOverProbability(DIST, selection.line);
      break;
    case 'resultado':
      probability = probs1x2[selection.outcome];
      break;
    default:
      probability = 0.5;
  }
  return {
    fixtureId,
    selection,
    odds,
    probability,
    lambdaHome: lh,
    lambdaAway: la,
    probs1x2,
    distribution: selection.market === 'corners' ? DIST : null,
  };
}

const over25: Selection = { market: 'goles', side: 'over', line: 2.5 };
const over15: Selection = { market: 'goles', side: 'over', line: 1.5 };
const btts: Selection = { market: 'btts', outcome: 'si' };

describe('Cuota y probabilidad combinadas', () => {
  it('cuota combinada = producto de cuotas', () => {
    expect(combinedOdds([1.5, 1.8, 2])).toBeCloseTo(5.4, 12);
  });

  it('partidos distintos: producto, avisando del supuesto de independencia', () => {
    const a = leg('p1', over25);
    const b = leg('p2', btts);
    const r = jointProbability([a, b]);
    expect(r.method).toBe('independiente');
    expect(r.probability).toBeCloseTo(a.probability * b.probability, 12);
    expect(r.notes.join(' ')).toContain('independencia');
  });

  it('8. mismo partido, Over 2.5 y ambos marcan: conjunta exacta, no el producto', () => {
    const a = leg('p1', over25);
    const b = leg('p1', btts);
    const r = jointProbability([a, b]);
    expect(r.method).toBe('exacta');
    expect(r.correlation).toBe('alta');
    // Correlación positiva: la conjunta supera al producto.
    expect(r.probability!).toBeGreaterThan(a.probability * b.probability);
    expect(r.probability!).toBeLessThanOrEqual(Math.min(a.probability, b.probability));
    expect(r.pairs[0].joint).toBeCloseTo(r.probability!, 12);
  });

  it('selecciones anidadas: Over 1.5 y Over 2.5 = P(Over 2.5)', () => {
    const r = jointProbability([leg('p1', over15), leg('p1', over25)]);
    expect(r.probability).toBeCloseTo(calculateOverProbability(2.7, 2.5), 6);
  });

  it('corners Over 8.5 y Under 11.5: P(9 ≤ X ≤ 11)', () => {
    const r = jointProbability([
      leg('p1', { market: 'corners', side: 'over', line: 8.5 }),
      leg('p1', { market: 'corners', side: 'under', line: 11.5 }),
    ]);
    expect(r.probability).toBeCloseTo(countCdf(11, DIST) - countCdf(8, DIST), 12);
  });

  it('variables distintas del mismo partido: no estimable, cotas de Fréchet', () => {
    const a = leg('p1', over25);
    const b = leg('p1', { market: 'corners', side: 'over', line: 9.5 });
    const r = jointProbability([a, b]);
    expect(r.method).toBe('cotas');
    expect(r.probability).toBeNull();
    expect(r.low).toBeCloseTo(Math.max(0, a.probability + b.probability - 1), 12);
    expect(r.high).toBeCloseTo(Math.min(a.probability, b.probability), 12);
  });

  it('las cotas de un partido se combinan con otro partido independiente', () => {
    const a = leg('p1', over25);
    const b = leg('p1', { market: 'corners', side: 'over', line: 9.5 });
    const c = leg('p2', btts);
    const r = jointProbability([a, b, c]);
    expect(r.high).toBeCloseTo(Math.min(a.probability, b.probability) * c.probability, 12);
  });

  it('mismo partido: hándicap europeo y doble oportunidad, sobre la diferencia de goles', () => {
    const d = goalDifferenceDistribution(1.6, 1.1, { home: 0.45, draw: 0.27, away: 0.28 })!;
    // Local −1 con empate = el local gana por 1 exacto; con 1X también gana: P(D = 1).
    const r = jointProbability([leg('p1', { market: 'europeo', line: -1, outcome: 'draw' }), leg('p1', { market: 'doble', outcome: '1X' })]);
    expect(r.method).toBe('exacta');
    expect(r.probability).toBeCloseTo(d[MAX_GOALS + 1], 12);
  });

  it('mismo partido: goles del local y ambos marcan, sobre la matriz de marcadores', () => {
    const r = jointProbability([leg('p1', { market: 'equipo', team: 'home', side: 'over', line: 1.5 }), leg('p1', btts)]);
    // P(local ≥ 2) · P(visitante ≥ 1) con Poisson independiente.
    expect(r.probability).toBeCloseTo((1 - Math.exp(-1.6) * 2.6) * (1 - Math.exp(-1.1)), 8);
  });

  it('selecciones incompatibles o repetidas: ticket no válido', () => {
    expect(jointProbability([leg('p1', { market: 'resultado', outcome: 'home' }), leg('p1', { market: 'resultado', outcome: 'away' })]).invalid).toContain('incompatibles');
    expect(jointProbability([leg('p1', btts), leg('p1', btts)]).invalid).toContain('repetida');
    // La misma selección en partidos distintos sí vale.
    expect(jointProbability([leg('p1', btts), leg('p2', btts)]).invalid).toBeNull();
  });
});

describe('Liquidación de un ticket', () => {
  it('una selección perdida lo pierde aunque falten otras', () => {
    expect(settleTicketLegs([{ status: 'perdido', odds: 1.5 }, { status: 'pendiente', odds: 2 }]).status).toBe('perdido');
  });

  it('con alguna pendiente y ninguna perdida sigue pendiente', () => {
    expect(settleTicketLegs([{ status: 'ganado', odds: 1.5 }, { status: 'pendiente', odds: 2 }]).status).toBe('pendiente');
  });

  it('una selección anulada sale de la cuota', () => {
    const r = settleTicketLegs([
      { status: 'ganado', odds: 1.5 },
      { status: 'anulado', odds: 2 },
      { status: 'ganado', odds: 1.8 },
    ]);
    expect(r.status).toBe('ganado');
    expect(r.settledOdds).toBeCloseTo(2.7, 12);
  });

  it('todas anuladas: ticket anulado', () => {
    expect(settleTicketLegs([{ status: 'anulado', odds: 1.5 }, { status: 'anulado', odds: 2 }]).status).toBe('anulado');
  });
});
