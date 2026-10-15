import { describe, expect, it } from 'vitest';
import { poissonCdf } from './poisson';
import {
  countCdf,
  countDistribution,
  countOverProbability,
  countQuantile,
  estimateDispersion,
  negBinPmf,
} from './negativeBinomial';

describe('Binomial negativa', () => {
  const mean = 10;
  const phi = 1.5;
  const size = mean / (phi - 1);

  it('la distribución suma 1', () => {
    let s = 0;
    for (let k = 0; k < 200; k++) s += negBinPmf(k, mean, size);
    expect(s).toBeCloseTo(1, 10);
  });

  it('media μ y varianza φ·μ', () => {
    let m = 0;
    let m2 = 0;
    for (let k = 0; k < 300; k++) {
      const p = negBinPmf(k, mean, size);
      m += k * p;
      m2 += k * k * p;
    }
    expect(m).toBeCloseTo(mean, 8);
    expect(m2 - m * m).toBeCloseTo(phi * mean, 6);
  });

  it('con tamaño muy grande se acerca a Poisson', () => {
    expect(countCdf(9, { mean: 10, size: 1e7 })).toBeCloseTo(poissonCdf(9, 10), 5);
  });

  it('φ ≤ 1 usa Poisson', () => {
    expect(countDistribution(10, { n: 50, mean: 10, variance: 9, index: 0.9 }).size).toBeNull();
    expect(countDistribution(10, null).size).toBeNull();
  });

  it('Over de una línea X.5 = 1 − P(X ≤ X)', () => {
    const d = countDistribution(10, { n: 50, mean: 10, variance: 15, index: 1.5 });
    expect(countOverProbability(d, 9.5)).toBeCloseTo(1 - countCdf(9, d), 12);
  });

  it('cuantiles: el central queda cerca de la media', () => {
    const d = countDistribution(10, { n: 50, mean: 10, variance: 15, index: 1.5 });
    expect(countQuantile(d, 0.5)).toBeGreaterThanOrEqual(9);
    expect(countQuantile(d, 0.5)).toBeLessThanOrEqual(10);
    expect(countQuantile(d, 0.1)).toBeLessThan(countQuantile(d, 0.9));
  });
});

describe('Dispersión de una liga', () => {
  it('media, varianza muestral e índice', () => {
    const d = estimateDispersion([8, 10, 12, 14])!;
    expect(d.n).toBe(4);
    expect(d.mean).toBe(11);
    expect(d.variance).toBeCloseTo(20 / 3, 12);
    expect(d.index).toBeCloseTo(20 / 3 / 11, 12);
  });

  it('fracción de partidos con total 0', () => {
    expect(estimateDispersion([0, 0, 5, 7])!.zeroShare).toBe(0.5);
    expect(estimateDispersion([0, 0, 0])!.index).toBe(1);
  });

  it('con menos de 2 partidos no hay dispersión', () => {
    expect(estimateDispersion([9])).toBeNull();
    expect(estimateDispersion([])).toBeNull();
  });
});
