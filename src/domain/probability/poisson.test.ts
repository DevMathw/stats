import { describe, expect, it } from 'vitest';
import {
  calculateBTTSProbability,
  calculateCleanSheetProbability,
  calculateOverProbability,
  calculateUnderProbability,
  mostLikelyScoreline,
  poissonCdf,
  poissonPmf,
  scoreMatrix,
} from './poisson';
import { calculate1X2Probabilities, expectedPoints, logistic, resultPick } from './matchProbabilities';
import { clamp, shrinkToLeagueMean, shrinkWeight } from './shrink';

const PARAMS = { kLogistic: 1.1, kDrawDecay: 0.5 };

describe('Poisson', () => {
  it('pmf coincide con los valores cerrados', () => {
    // P(0; 1.5) = e^-1.5
    expect(poissonPmf(0, 1.5)).toBeCloseTo(Math.exp(-1.5), 12);
    // P(2; 1.5) = e^-1.5 · 1.5² / 2
    expect(poissonPmf(2, 1.5)).toBeCloseTo((Math.exp(-1.5) * 1.5 ** 2) / 2, 12);
    expect(poissonPmf(-1, 1.5)).toBe(0);
  });

  it('cdf = suma acumulada de la pmf', () => {
    const lambda = 2.7;
    for (const k of [0, 1, 2, 3, 7]) {
      let sum = 0;
      for (let i = 0; i <= k; i++) sum += poissonPmf(i, lambda);
      expect(poissonCdf(k, lambda)).toBeCloseTo(sum, 12);
    }
  });

  it('la distribución suma 1', () => {
    expect(poissonCdf(60, 3.1)).toBeCloseTo(1, 12);
  });
});

describe('Over / Under', () => {
  const lambda = 2.6;

  it('Over 1.5 = 1 - POISSON(1, λ, TRUE)', () => {
    expect(calculateOverProbability(lambda, 1.5)).toBeCloseTo(1 - poissonCdf(1, lambda), 12);
  });

  it('Over 2.5 = 1 - POISSON(2, λ, TRUE)', () => {
    expect(calculateOverProbability(lambda, 2.5)).toBeCloseTo(1 - poissonCdf(2, lambda), 12);
  });

  it('Over 3.5 = 1 - POISSON(3, λ, TRUE)', () => {
    expect(calculateOverProbability(lambda, 3.5)).toBeCloseTo(1 - poissonCdf(3, lambda), 12);
  });

  it('valores concretos con λ = 2.6', () => {
    // e^-2.6 = 0.0742736 ⇒ CDF(1)=0.2673850, CDF(2)=0.5184298, CDF(3)=0.7360020
    expect(calculateOverProbability(2.6, 1.5)).toBeCloseTo(0.7326150, 6);
    expect(calculateOverProbability(2.6, 2.5)).toBeCloseTo(0.4815702, 6);
    expect(calculateOverProbability(2.6, 3.5)).toBeCloseTo(0.2639980, 6);
  });

  it('Over + Under = 1 y Over es monótono decreciente en la línea', () => {
    expect(calculateOverProbability(2.6, 2.5) + calculateUnderProbability(2.6, 2.5)).toBeCloseTo(1, 12);
    expect(calculateOverProbability(2.6, 1.5)).toBeGreaterThan(calculateOverProbability(2.6, 2.5));
    expect(calculateOverProbability(2.6, 2.5)).toBeGreaterThan(calculateOverProbability(2.6, 3.5));
  });
});

describe('BTTS y portería a cero', () => {
  it('sigue la fórmula del Excel', () => {
    const [lh, la] = [1.7, 1.1];
    expect(calculateBTTSProbability(lh, la)).toBeCloseTo(
      1 - Math.exp(-lh) - Math.exp(-la) + Math.exp(-(lh + la)),
      12,
    );
  });

  it('BTTS = P(local marca) · P(visitante marca) por independencia', () => {
    const [lh, la] = [1.7, 1.1];
    expect(calculateBTTSProbability(lh, la)).toBeCloseTo(
      (1 - Math.exp(-lh)) * (1 - Math.exp(-la)),
      12,
    );
  });

  it('la portería a cero usa el λ del rival', () => {
    expect(calculateCleanSheetProbability(1.1)).toBeCloseTo(Math.exp(-1.1), 12);
    // Sin ataque rival, portería a cero segura.
    expect(calculateCleanSheetProbability(0)).toBe(1);
  });
});

describe('1X2', () => {
  it('suma exactamente 1', () => {
    for (const [lh, la] of [
      [1.8, 1.0],
      [0.9, 2.4],
      [1.3, 1.3],
      [3.5, 0.2],
    ]) {
      const p = calculate1X2Probabilities(lh, la, 0.25, PARAMS);
      expect(p.home + p.draw + p.away).toBeCloseTo(1, 12);
    }
  });

  it('reproduce la fórmula del Excel', () => {
    const [lh, la, drawRate] = [1.8, 1.0, 0.26];
    const diff = lh - la;
    const draw = drawRate * Math.exp(-PARAMS.kDrawDecay * diff * diff);
    const l = 1 / (1 + Math.exp(-PARAMS.kLogistic * diff));
    const p = calculate1X2Probabilities(lh, la, drawRate, PARAMS);
    expect(p.draw).toBeCloseTo(draw, 12);
    expect(p.home).toBeCloseTo((1 - draw) * l, 12);
    expect(p.away).toBeCloseTo((1 - draw) * (1 - l), 12);
  });

  it('con λ iguales el reparto es simétrico y el empate es máximo', () => {
    const even = calculate1X2Probabilities(1.4, 1.4, 0.25, PARAMS);
    expect(even.home).toBeCloseTo(even.away, 12);
    expect(even.draw).toBeCloseTo(0.25, 12);
    const skewed = calculate1X2Probabilities(2.4, 1.0, 0.25, PARAMS);
    expect(skewed.draw).toBeLessThan(even.draw);
    expect(skewed.home).toBeGreaterThan(skewed.away);
  });

  it('logistic(0) = 0.5', () => {
    expect(logistic(0, 1.1)).toBeCloseTo(0.5, 12);
  });

  it('resultado según la probabilidad del favorito: gana, doble oportunidad o sin favorito', () => {
    const r = (home: number, draw: number, away: number) => resultPick({ home, draw, away });
    expect(r(0.58, 0.24, 0.18)).toBe('1'); // favorito al 58 %
    expect(r(0.5, 0.27, 0.23)).toBe('1X'); // entre 45 y 55 %
    expect(r(0.449, 0.239, 0.312)).toBe('sinFavorito'); // antes «victoria local clara»: nadie llega al 45 %
    expect(r(0.371, 0.252, 0.377)).toBe('sinFavorito'); // antes «X · empate claro»
    expect(r(0.23, 0.27, 0.5)).toBe('2X');
    expect(r(0.25, 0.2, 0.55)).toBe('2'); // justo en el 55 %
  });

  it('los puntos esperados son V·3 + E·1', () => {
    const p = { home: 0.5, draw: 0.3, away: 0.2 };
    expect(expectedPoints(p, true)).toBeCloseTo(0.5 * 3 + 0.3, 12);
    expect(expectedPoints(p, false)).toBeCloseTo(0.2 * 3 + 0.3, 12);
  });
});

describe('Marcador más probable', () => {
  it('la matriz de marcadores suma ≈ 1', () => {
    const m = scoreMatrix(1.6, 1.2, 12);
    const total = m.flat().reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 6);
  });

  it('elige el máximo de la matriz', () => {
    // λ pequeños ⇒ 0-0; local muy superior ⇒ marcador favorable al local.
    expect(mostLikelyScoreline(0.3, 0.3)).toBe('0 - 0');
    expect(mostLikelyScoreline(2.4, 0.6)).toBe('2 - 0');
  });

  it('dentro del resultado, el marcador más probable que lo cumple', () => {
    // Sin resultado la matriz da 1-1, que no casa con una victoria local.
    expect(mostLikelyScoreline(1.8, 1.16)).toBe('1 - 1');
    expect(mostLikelyScoreline(1.8, 1.16, '1')).toBe('2 - 1');
    // Sin favorito no se restringe: el más probable de toda la matriz.
    expect(mostLikelyScoreline(1.8, 1.16, 'sinFavorito')).toBe('1 - 1');
  });

  it('el marcador nunca contradice el resultado', () => {
    for (const lh of [0.3, 0.9, 1.3, 1.8, 2.6]) {
      for (const la of [0.3, 0.9, 1.3, 1.8, 2.6]) {
        const pick = resultPick(calculate1X2Probabilities(lh, la, 0.27, PARAMS));
        const [h, a] = mostLikelyScoreline(lh, la, pick).split(' - ').map(Number);
        const cumple = { '1': h > a, '1X': h >= a, sinFavorito: true, '2X': a >= h, '2': a > h }[pick];
        expect(cumple, `λ ${lh}-${la}: ${pick} con ${h}-${a}`).toBe(true);
      }
    }
  });
});

describe('Contracción bayesiana', () => {
  it('peso = PJ / (PJ + K)', () => {
    expect(shrinkWeight(5, 5)).toBeCloseTo(0.5, 12);
    expect(shrinkWeight(0, 5)).toBe(0);
    expect(shrinkWeight(45, 5)).toBeCloseTo(0.9, 12);
  });

  it('sin partidos devuelve la media de liga', () => {
    expect(shrinkToLeagueMean(4, 0, 1.35, 5)).toBeCloseTo(1.35, 12);
  });

  it('con PJ = K está a mitad de camino', () => {
    expect(shrinkToLeagueMean(3, 5, 1, 5)).toBeCloseTo(2, 12);
  });

  it('un valor ausente equivale a la media de liga', () => {
    expect(shrinkToLeagueMean(null, 8, 1.4, 5)).toBeCloseTo(1.4, 12);
  });

  it('tiende al valor del equipo cuando hay muchos partidos', () => {
    expect(shrinkToLeagueMean(3, 1000, 1, 5)).toBeCloseTo(3, 1);
  });

  it('clamp replica MAX(MIN(x,hi),lo)', () => {
    expect(clamp(5, -2, 2)).toBe(2);
    expect(clamp(-5, -2, 2)).toBe(-2);
    expect(clamp(0.7, -2, 2)).toBe(0.7);
  });
});
