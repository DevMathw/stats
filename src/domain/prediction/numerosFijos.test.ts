/**
 * Los números de los modelos, clavados.
 *
 * Las optimizaciones del 10/10/2026 (tramos por columnas, tablas planas, invariantes fuera del bucle,
 * entradas de la red ya tipificadas) se comprobaron contra la versión anterior con
 * `npm run medir-entrenamiento`, que resume TODAS las probabilidades del backtest en una huella: salió
 * la misma, `6f911ce9`. Pero esa comprobación necesita la base real, así que no corre en los tests.
 *
 * Esto es el equivalente pequeño: un dataset de juguete, semillas fijas y los valores exactos que sale
 * el día que se midió. Si alguien vuelve a tocar estos bucles buscando velocidad, aquí se ve si cambió
 * algún número. Un cambio DELIBERADO del modelo también rompe este test: entonces se actualizan los
 * valores y se dice en el commit, que es justo lo que se quiere que cueste.
 */
import { describe, expect, it } from 'vitest';
import { prepareBins, predictBoosting, predictForest, trainBoosting, trainRandomForest, seededRandom } from './ml/tree';
import { predictNeuralNet, trainNeuralNet } from './ml/neuralNet';
import { fitDrawCurve } from './elo';
import { fit1X2, fitBinary, MIN_PARA_CALIBRAR } from './calibration';
import { fitWeights, MIN_PARA_PESOS } from './ensemble';
import type { ModelId, Outcome1X2 } from './types';

/** Dataset reproducible: 6 variables, una regla no lineal y ruido con semilla. */
function datos(n = 400) {
  const r = seededRandom(4242);
  const X: Float64Array[] = [];
  const y: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = r() * 2 - 1;
    const b = r() * 2 - 1;
    const c = r();
    X.push(Float64Array.from([a, b, c, a * b, a + b, r()]));
    y.push(a * b + 0.3 * (r() - 0.5) > 0 ? 1 : 0);
  }
  return { X, y: Int32Array.from(y) };
}

describe('los modelos dan los mismos números que el día que se midieron', () => {
  const { X, y } = datos();

  it('bosque aleatorio', () => {
    const oneHot = Array.from(y, (v) => Float64Array.from(v === 1 ? [0, 1] : [1, 0]));
    const m = trainRandomForest(X, oneHot, { trees: 30, maxDepth: 6, minSamplesLeaf: 5, seed: 7 });
    expect(predictForest(m, X[0])[1]).toMatchInlineSnapshot(`0.0062665391359795946`);
    expect(predictForest(m, X[37])[1]).toMatchInlineSnapshot(`0.5749201968702229`);
  });

  it('gradient boosting', () => {
    const m = trainBoosting(X, y, 2, { rounds: 25, learningRate: 0.2, maxDepth: 3, minSamplesLeaf: 5, seed: 7 });
    expect(predictBoosting(m, X[0])[1]).toMatchInlineSnapshot(`0.18356739067378505`);
    expect(predictBoosting(m, X[37])[1]).toMatchInlineSnapshot(`0.5662540692007302`);
  });

  it('red neuronal', () => {
    const m = trainNeuralNet(X, y, 2, { hidden: 6, epochs: 15, learningRate: 0.05, l2: 1e-4, batchSize: 16, validationFraction: 0.2, seed: 7 });
    expect(m.epochsUsed).toMatchInlineSnapshot(`15`);
    expect(predictNeuralNet(m, X[0])[1]).toMatchInlineSnapshot(`0.0020590690143565847`);
  });

  it('tramos del histograma', () => {
    const b = prepareBins(X, 8);
    // La misma fila 0 que daba la version por filas, reconstruida desde las columnas: comprueba que el
    // cambio de disposicion es una transpuesta y no otra cosa.
    expect(b.bins.map((col) => col[0])).toMatchInlineSnapshot(`
      [
        7,
        0,
        2,
        0,
        3,
        5,
      ]
    `);
    expect([...b.bins[0].slice(0, 12)]).toMatchInlineSnapshot(`
      [
        7,
        3,
        4,
        5,
        0,
        3,
        7,
        7,
        4,
        3,
        7,
        5,
      ]
    `);
    expect([...b.edges[0]]).toMatchInlineSnapshot(`
      [
        -0.7610777895897627,
        -0.5416575167328119,
        -0.317983815446496,
        -0.082689318805933,
        0.20509670348837972,
        0.4762565712444484,
        0.7299733525142074,
      ]
    `);
  });

  it('curva del empate', () => {
    const r = seededRandom(99);
    const muestras = Array.from({ length: 600 }, () => {
      const diff = (r() - 0.5) * 800;
      const u = r();
      const result: Outcome1X2 = u < 0.27 ? 'X' : diff > 0 ? '1' : '2';
      return { diff, result };
    });
    expect(fitDrawCurve(muestras)).toMatchInlineSnapshot(`
      {
        "base": 0.37000000000000016,
        "scale": 600,
      }
    `);
  });

  it('calibración 1X2 y de sí/no', () => {
    const r = seededRandom(123);
    const m1x2 = Array.from({ length: MIN_PARA_CALIBRAR + 50 }, () => {
      const h = 0.2 + r() * 0.6;
      const d = (1 - h) * 0.4;
      const u = r();
      return { probs: { home: h, draw: d, away: 1 - h - d }, actual: (u < h ? '1' : u < h + d ? 'X' : '2') as Outcome1X2 };
    });
    expect(fit1X2(m1x2)).toMatchInlineSnapshot(`
      {
        "a": 1.161453738651566,
        "b": [
          -0.1632909329614407,
          -0.01277197601339392,
          0.17606290897483481,
        ],
      }
    `);

    const binarias = Array.from({ length: MIN_PARA_CALIBRAR + 50 }, () => {
      const p = 0.1 + r() * 0.8;
      return { p, actual: (r() < p * 0.8 ? 1 : 0) as 0 | 1 };
    });
    expect(fitBinary(binarias)).toMatchInlineSnapshot(`
      {
        "a": 0.8016476341477876,
        "b": -0.5147374772324516,
      }
    `);
  });

  it('pesos del ensemble', () => {
    const r = seededRandom(555);
    const ids: ModelId[] = ['poisson', 'elo', 'boosting'];
    const muestras = Array.from({ length: MIN_PARA_PESOS + 100 }, () => {
      const m = new Map<ModelId, number>([
        ['poisson', 0.2 + r() * 0.3],
        ['boosting', 0.3 + r() * 0.4],
      ]);
      // El Elo no responde a uno de cada tres: el ajuste tiene que renormalizar sin él.
      if (r() > 0.33) m.set('elo', 0.15 + r() * 0.3);
      return m;
    });
    expect([...fitWeights(ids, muestras)]).toMatchInlineSnapshot(`
      [
        [
          "poisson",
          0,
        ],
        [
          "elo",
          0,
        ],
        [
          "boosting",
          1,
        ],
      ]
    `);
  });
});
