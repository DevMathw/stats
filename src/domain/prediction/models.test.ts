import { describe, expect, it } from 'vitest';
import { dixonColesMatrix, fitDixonColes, lambdas, tau } from './dixonColes';
import { calibrateHomeAdvantage, elo1X2, EloTable, eloExpected, fitDrawCurve, marginFactor } from './elo';
import { fitWeights, blend1X2, MIN_PARA_PESOS } from './ensemble';
import { apply1X2, fit1X2, fitBinary, applyBinary, MIN_PARA_CALIBRAR } from './calibration';
import { prepareBins, predictBoosting, predictForest, trainBoosting, trainRandomForest, seededRandom } from './ml/tree';
import { predictNeuralNet, trainNeuralNet } from './ml/neuralNet';
import { score1X2, scoreBinary } from './metrics';
import { poissonProbabilities } from './goalModels';
import type { ModelId, Outcome1X2 } from './types';

describe('Elo', () => {
  it('sin diferencia de rating, el partido está 50-50 antes de la ventaja de campo', () => {
    expect(eloExpected(0)).toBeCloseTo(0.5, 6);
    expect(eloExpected(400)).toBeCloseTo(10 / 11, 6);
  });

  it('una goleada mueve el rating más que un 1-0', () => {
    expect(marginFactor(4)).toBeGreaterThan(marginFactor(1));
    // Pero cada gol extra mueve menos que el anterior.
    expect(marginFactor(5) - marginFactor(4)).toBeLessThan(marginFactor(2) - marginFactor(1));
  });

  it('ganar sube al local y baja al visitante en la misma cantidad', () => {
    const t = new EloTable();
    t.update('A', 'B', 2, 0);
    expect(t.get('A')).toBeGreaterThan(1500);
    expect(t.get('A') - 1500).toBeCloseTo(1500 - t.get('B'), 9);
  });

  it('el empate es más probable en un partido igualado que en uno desigual', () => {
    const curva = { base: 0.28, scale: 260 };
    expect(elo1X2(0, curva).draw).toBeGreaterThan(elo1X2(400, curva).draw);
  });

  it('las tres probabilidades suman 1', () => {
    const p = elo1X2(120, { base: 0.28, scale: 260 });
    expect(p.home + p.draw + p.away).toBeCloseTo(1, 9);
  });

  it('la ventaja de campo se mide con los resultados, no se supone', () => {
    // Una liga donde el local gana el 60 % y empata el 20 % → 0,7 de los puntos.
    const muestras: { result: Outcome1X2 }[] = [
      ...Array.from({ length: 60 }, () => ({ result: '1' as const })),
      ...Array.from({ length: 20 }, () => ({ result: 'X' as const })),
      ...Array.from({ length: 20 }, () => ({ result: '2' as const })),
    ];
    const v = calibrateHomeAdvantage(muestras);
    expect(v).toBeGreaterThan(100);
    expect(eloExpected(v)).toBeCloseTo(0.7, 2);
  });

  it('con pocos partidos no se calibra nada', () => {
    expect(calibrateHomeAdvantage([{ result: '1' }])).toBe(60);
    expect(fitDrawCurve([{ diff: 0, result: 'X' }])).toEqual({ base: 0.28, scale: 260 });
  });
});

describe('Dixon-Coles', () => {
  it('tau solo toca los cuatro marcadores bajos', () => {
    expect(tau(2, 2, 1.4, 1.1, 0.1)).toBe(1);
    expect(tau(0, 0, 1.4, 1.1, 0.1)).not.toBe(1);
    expect(tau(1, 1, 1.4, 1.1, 0.1)).toBeCloseTo(0.9, 9);
  });

  it('con rho = 0 la matriz es la de Poisson', () => {
    const dc = dixonColesMatrix(1.5, 1.1, 0, 10);
    const p = poissonProbabilities(1.5, 1.1);
    let home = 0;
    for (let x = 0; x < dc.length; x++) for (let y = 0; y < x; y++) home += dc[x][y];
    expect(home).toBeCloseTo(p.probs1x2.home, 3);
  });

  it('no se ajusta con pocos partidos: devuelve null en vez de inventar fuerzas', () => {
    expect(fitDixonColes([{ homeTeamId: 'A', awayTeamId: 'B', homeGoals: 1, awayGoals: 0, ageDays: 1 }])).toBeNull();
  });

  it('recupera que un equipo es más fuerte que otro', () => {
    // Liga de 6 equipos donde A gana casi siempre y F pierde casi siempre.
    const equipos = ['A', 'B', 'C', 'D', 'E', 'F'];
    const fuerza: Record<string, number> = { A: 2.4, B: 1.6, C: 1.3, D: 1.1, E: 0.9, F: 0.6 };
    const random = seededRandom(7);
    const partidos = [];
    for (let vuelta = 0; vuelta < 6; vuelta++) {
      for (const local of equipos) {
        for (const visitante of equipos) {
          if (local === visitante) continue;
          const poisson = (lambda: number) => {
            let k = 0;
            let p = Math.exp(-lambda);
            let acumulado = p;
            const u = random();
            while (u > acumulado && k < 8) {
              k++;
              p = (p * lambda) / k;
              acumulado += p;
            }
            return k;
          };
          partidos.push({
            homeTeamId: local,
            awayTeamId: visitante,
            homeGoals: poisson(fuerza[local] * 1.2),
            awayGoals: poisson(fuerza[visitante] * 0.9),
            ageDays: vuelta * 10,
          });
        }
      }
    }
    const fit = fitDixonColes(partidos)!;
    expect(fit).not.toBeNull();
    expect(fit.attack.get('A')!).toBeGreaterThan(fit.attack.get('F')!);
    expect(fit.gamma).toBeGreaterThan(1); // la ventaja de campo se recupera
    const l = lambdas(fit, 'A', 'F')!;
    expect(l.home).toBeGreaterThan(l.away);
  });
});

describe('árboles', () => {
  const datos = () => {
    const random = seededRandom(3);
    const X: Float64Array[] = [];
    const y: number[] = [];
    for (let i = 0; i < 400; i++) {
      const a = random() * 2 - 1;
      const b = random() * 2 - 1;
      X.push(Float64Array.from([a, b, random()]));
      // Regla no lineal: la clase depende del producto de los dos primeros.
      y.push(a * b > 0 ? 1 : 0);
    }
    return { X, y: Int32Array.from(y) };
  };

  it('los tramos reparten cada variable sin perder el orden', () => {
    const b = prepareBins([Float64Array.from([1, 5]), Float64Array.from([2, 6]), Float64Array.from([3, 7])], 4);
    expect(b.features).toBe(2);
    expect(b.rows).toBe(3);
    // `bins` va por variable: `bins[0]` es la primera columna, una entrada por fila.
    expect(b.bins[0][0]).toBeLessThan(b.bins[0][2]);
  });

  it('el bosque aprende una regla no lineal', () => {
    const { X, y } = datos();
    const oneHot = Array.from(y, (v) => Float64Array.from(v === 1 ? [0, 1] : [1, 0]));
    const m = trainRandomForest(X, oneHot, { trees: 40, maxDepth: 6, minSamplesLeaf: 5, seed: 1 });
    let aciertos = 0;
    for (let i = 0; i < X.length; i++) if ((predictForest(m, X[i])[1] >= 0.5 ? 1 : 0) === y[i]) aciertos++;
    expect(aciertos / X.length).toBeGreaterThan(0.85);
  });

  it('el boosting también, y devuelve probabilidades que suman 1', () => {
    const { X, y } = datos();
    const m = trainBoosting(X, y, 2, { rounds: 40, learningRate: 0.2, maxDepth: 3, minSamplesLeaf: 5, seed: 1 });
    const p = predictBoosting(m, X[0]);
    expect(p[0] + p[1]).toBeCloseTo(1, 9);
    let aciertos = 0;
    for (let i = 0; i < X.length; i++) if ((predictBoosting(m, X[i])[1] >= 0.5 ? 1 : 0) === y[i]) aciertos++;
    expect(aciertos / X.length).toBeGreaterThan(0.85);
  });

  it('la red neuronal aprende la misma regla y se queda en la mejor época', () => {
    const { X, y } = datos();
    const m = trainNeuralNet(X, y, 2, { hidden: 8, epochs: 60, learningRate: 0.1, l2: 1e-5, batchSize: 16, validationFraction: 0.2, seed: 5 });
    expect(m.epochsUsed).toBeGreaterThan(0);
    expect(m.validationLoss).toBeLessThan(0.7);
    const p = predictNeuralNet(m, X[0]);
    expect(p[0] + p[1]).toBeCloseTo(1, 9);
  });
});

describe('ensemble', () => {
  const ids: ModelId[] = ['poisson', 'elo'];

  it('con pocas muestras reparte por igual en vez de fingir que ha medido algo', () => {
    const w = fitWeights(ids, [new Map([['poisson', 0.5] as const, ['elo', 0.5] as const])]);
    expect(w.get('poisson')).toBeCloseTo(0.5, 9);
  });

  it('da más peso al modelo que acertaba más', () => {
    const muestras = Array.from({ length: MIN_PARA_PESOS + 50 }, () => new Map<ModelId, number>([['poisson', 0.2], ['elo', 0.6]]));
    const w = fitWeights(ids, muestras);
    expect(w.get('elo')!).toBeGreaterThan(w.get('poisson')!);
    expect(w.get('elo')! + w.get('poisson')!).toBeCloseTo(1, 6);
  });

  it('mezcla solo con los modelos que respondieron', () => {
    const r = blend1X2(new Map([['elo', { home: 0.6, draw: 0.2, away: 0.2 }]]), new Map([['poisson', 0.7], ['elo', 0.3]]));
    expect(r!.used).toEqual(['elo']);
    expect(r!.probs.home).toBeCloseTo(0.6, 6);
  });
});

describe('calibración', () => {
  it('sin muestra suficiente no toca nada', () => {
    const p = { home: 0.7, draw: 0.2, away: 0.1 };
    const q = apply1X2(p, fit1X2([{ probs: p, actual: '1' }]));
    // Pasa por exp y log, así que la igualdad es hasta el último bit de un double.
    expect(q.home).toBeCloseTo(p.home, 12);
    expect(q.draw).toBeCloseTo(p.draw, 12);
    expect(q.away).toBeCloseTo(p.away, 12);
  });

  it('corrige a un modelo demasiado seguro', () => {
    // El modelo dice 90 % local, pero el local solo gana el 60 % de las veces.
    const muestras = Array.from({ length: MIN_PARA_CALIBRAR + 100 }, (_, i) => ({
      probs: { home: 0.9, draw: 0.05, away: 0.05 },
      actual: (i % 10 < 6 ? '1' : i % 10 < 8 ? 'X' : '2') as Outcome1X2,
    }));
    const c = fit1X2(muestras, 2000, 0.2);
    const ajustada = apply1X2({ home: 0.9, draw: 0.05, away: 0.05 }, c);
    expect(ajustada.home).toBeLessThan(0.9);
    expect(ajustada.home).toBeGreaterThan(0.45);
  });

  it('la calibración binaria acerca la probabilidad a la frecuencia real', () => {
    const muestras = Array.from({ length: MIN_PARA_CALIBRAR + 100 }, (_, i) => ({ p: 0.8, actual: (i % 10 < 5 ? 1 : 0) as 0 | 1 }));
    const c = fitBinary(muestras, 2000, 0.3);
    expect(applyBinary(0.8, c)).toBeLessThan(0.7);
  });
});

describe('métricas', () => {
  it('acertar con seguridad puntúa mejor que acertar con dudas', () => {
    const seguro = score1X2([{ probs: { home: 0.9, draw: 0.05, away: 0.05 }, actual: '1' }]);
    const dudoso = score1X2([{ probs: { home: 0.4, draw: 0.3, away: 0.3 }, actual: '1' }]);
    expect(seguro.logLoss!).toBeLessThan(dudoso.logLoss!);
    expect(seguro.brier!).toBeLessThan(dudoso.brier!);
  });

  it('el aporte es 0 cuando el modelo solo repite la frecuencia base', () => {
    const preds = Array.from({ length: 300 }, (_, i) => ({
      probs: { home: 0.5, draw: 0.3, away: 0.2 },
      actual: (i % 10 < 5 ? '1' : i % 10 < 8 ? 'X' : '2') as Outcome1X2,
    }));
    expect(score1X2(preds).skill!).toBeCloseTo(0, 2);
  });

  it('un mercado de sí/no se mide igual', () => {
    const s = scoreBinary([{ p: 0.9, actual: 1 }, { p: 0.8, actual: 1 }, { p: 0.2, actual: 0 }]);
    expect(s.n).toBe(3);
    expect(s.accuracy).toBe(1);
    expect(s.logLoss!).toBeLessThan(0.3);
  });
});
