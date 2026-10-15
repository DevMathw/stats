import { describe, expect, it } from 'vitest';
import type { Match } from '../../types';
import { aggregateStat, cornersPicker, type TeamMatch } from './aggregate';

function fila(cornersHome: number | null, cornersAway: number | null): TeamMatch {
  return { match: { cornersHome, cornersAway } as Match, isHome: true };
}

describe('aggregateStat: divisor de los promedios (DIFF-07)', () => {
  // 3 partidos jugados, uno sin corners publicados.
  const rows = [fila(6, 4), fila(8, 2), fila(null, null)];

  it('excel divide entre PJ: el partido sin dato cuenta como 0', () => {
    const a = aggregateStat(rows, cornersPicker, 3, 'excel');
    expect(a.avgFor).toBeCloseTo(14 / 3, 12);
    expect(a.avgAgainst).toBeCloseTo(6 / 3, 12);
    expect(a.sample).toBe(2);
  });

  it('muestra divide entre los partidos con el dato', () => {
    const a = aggregateStat(rows, cornersPicker, 3, 'muestra');
    expect(a.avgFor).toBeCloseTo(7, 12);
    expect(a.avgAgainst).toBeCloseTo(3, 12);
    expect(a.avgTotal).toBeCloseTo(10, 12);
    expect(a.for).toBe(14);
  });

  it('sin ningún dato los promedios son null en los dos modos, nunca 0', () => {
    for (const mode of ['excel', 'muestra'] as const) {
      const a = aggregateStat([fila(null, null)], cornersPicker, 1, mode);
      expect(a.avgFor).toBeNull();
      expect(a.avgAgainst).toBeNull();
    }
  });

  it('con un lado ausente, cada lado usa su propia muestra', () => {
    const a = aggregateStat([fila(5, null), fila(7, 3)], cornersPicker, 2, 'muestra');
    expect(a.avgFor).toBeCloseTo(6, 12);
    expect(a.avgAgainst).toBeCloseTo(3, 12);
  });
});
