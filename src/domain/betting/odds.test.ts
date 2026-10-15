import { describe, expect, it } from 'vitest';
import {
  assessOdds,
  edge,
  expectedValue,
  fairOdds,
  impliedProbability,
  minAcceptableOdds,
  roundMoney,
  validateOdds,
} from './odds';

describe('Cuotas: probabilidad implícita, cuota justa y edge', () => {
  it('probabilidad implícita = 1 / cuota', () => {
    expect(impliedProbability(1.85)).toBeCloseTo(0.540540540, 8);
    expect(impliedProbability(2)).toBe(0.5);
  });

  it('cuota justa = 1 / probabilidad estimada', () => {
    expect(fairOdds(0.6)).toBeCloseTo(1.6667, 4);
    expect(fairOdds(1)).toBe(1);
  });

  it('probabilidad 0: ninguna cuota es justa', () => {
    expect(fairOdds(0)).toBeNull();
  });

  it('edge = estimada − implícita (el ejemplo de la interfaz: 61 % a 1.85 → +6.95 pp)', () => {
    expect(edge(0.61, 1.85)).toBeCloseTo(0.0695, 4);
    expect(edge(0.5, 1.8)).toBeLessThan(0);
  });

  it('valor esperado por unidad = p · cuota − 1', () => {
    expect(expectedValue(0.61, 1.85)).toBeCloseTo(0.1285, 10);
    expect(expectedValue(0.5, 2)).toBeCloseTo(0, 12);
  });

  it('cuota mínima aceptable con edge mínimo', () => {
    expect(minAcceptableOdds(0.6, 0.02)).toBeCloseTo(1 / 0.58, 12);
    // Con edge mínimo 0 es la cuota justa.
    expect(minAcceptableOdds(0.6, 0)).toBeCloseTo(fairOdds(0.6)!, 12);
    // Si el edge mínimo supera la probabilidad, ninguna cuota llega.
    expect(minAcceptableOdds(0.01, 0.02)).toBeNull();
  });

  it('redondeo de moneda a 2 decimales', () => {
    expect(roundMoney(333 * 1.87)).toBe(622.71);
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });
});

describe('Validación de cuotas', () => {
  it.each([
    [1, 'mayor que 1'],
    [0.95, 'mayor que 1'],
    [0, 'mayor que 1'],
    [-2, 'mayor que 1'],
    [Number.NaN, 'Introduce'],
    [Number.POSITIVE_INFINITY, 'finito'],
    [1001, 'fuera de rango'],
  ])('rechaza %s', (odds, texto) => {
    expect(validateOdds(odds)).toContain(texto);
  });

  it('rechaza lo que no es número', () => {
    expect(validateOdds('1.85')).not.toBeNull();
    expect(validateOdds(null)).not.toBeNull();
  });

  it('acepta cuotas decimales válidas', () => {
    expect(validateOdds(1.01)).toBeNull();
    expect(validateOdds(1.85)).toBeNull();
    expect(validateOdds(1000)).toBeNull();
  });
});

describe('Cuota factible', () => {
  it('valor potencial cuando el edge alcanza el mínimo', () => {
    const a = assessOdds(0.6, 1.85, 0.02);
    expect(a.state).toBe('valor');
    expect(a.fairOdds).toBeCloseTo(1.6667, 4);
    expect(a.oddsDiff).toBeCloseTo(1.85 - 1 / 0.6, 10);
  });

  it('sin valor con edge positivo por debajo del mínimo o negativo', () => {
    expect(assessOdds(0.55, 1.85, 0.02).state).toBe('sin-valor'); // edge +0.95 pp
    expect(assessOdds(0.5, 1.85, 0.02).state).toBe('sin-valor');
  });

  it('con devolución posible el valor esperado descuenta la devolución; el edge no cambia', () => {
    const a = assessOdds(0.6, 1.9, 0.02, 0.25);
    expect(a.edge).toBeCloseTo(0.6 - 1 / 1.9, 12);
    expect(a.expectedValue).toBeCloseTo(0.75 * (0.6 * 1.9 - 1), 12);
  });

  it('datos insuficientes sin probabilidad', () => {
    const a = assessOdds(null, 1.85, 0.02);
    expect(a.state).toBe('insuficiente');
    expect(a.edge).toBeNull();
    expect(a.fairOdds).toBeNull();
  });
});
