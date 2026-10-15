import { describe, expect, it } from 'vitest';
import { goalDifferenceDistribution, MAX_GOALS } from './goalDifference';
import { poissonPmf } from './poisson';

const P = { home: 0.45, draw: 0.27, away: 0.28 };

describe('Diferencia de goles para hándicaps', () => {
  it('suma 1 y reparte exactamente el 1X2 del modelo', () => {
    const d = goalDifferenceDistribution(1.6, 1.1, P)!;
    const suma = (desde: number, hasta: number) => d.slice(desde + MAX_GOALS, hasta + MAX_GOALS + 1).reduce((a, b) => a + b, 0);
    expect(suma(-MAX_GOALS, MAX_GOALS)).toBeCloseTo(1, 12);
    expect(suma(1, MAX_GOALS)).toBeCloseTo(0.45, 12);
    expect(d[MAX_GOALS]).toBe(0.27);
    expect(suma(-MAX_GOALS, -1)).toBeCloseTo(0.28, 12);
  });

  it('dentro de cada lado conserva la forma de la diferencia de dos Poisson', () => {
    const d = goalDifferenceDistribution(1.6, 1.1, P)!;
    const diferencia = (k: number) => {
      let s = 0;
      for (let i = k; i <= MAX_GOALS; i++) s += poissonPmf(i, 1.6) * poissonPmf(i - k, 1.1);
      return s;
    };
    expect(d[MAX_GOALS + 2] / d[MAX_GOALS + 1]).toBeCloseTo(diferencia(2) / diferencia(1), 10);
  });

  it('sin margen posible a un lado (λ = 0): null, no un reparto inventado', () => {
    expect(goalDifferenceDistribution(0, 1.2, P)).toBeNull();
  });
});
