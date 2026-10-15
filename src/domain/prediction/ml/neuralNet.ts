/**
 * Red neuronal: un perceptrón multicapa pequeño, en TypeScript y sin dependencias.
 *
 * Con ~2.900 partidos y ~40 variables, una red grande memoriza el histórico y no generaliza. Se usa una
 * sola capa oculta con pocas neuronas, regularización L2 y parada temprana sobre una parte del
 * entrenamiento que la red no ve. Es lo que el tamaño del histórico permite defender; cuando haya
 * varias temporadas, la arquitectura se puede ampliar.
 *
 * Detalles: entradas tipificadas (media 0, desviación 1) con las estadísticas del ENTRENAMIENTO, ReLU
 * en la capa oculta, softmax a la salida, pérdida logarítmica y descenso de gradiente por lotes con
 * momento. Pesos iniciales con He (normal escalada por √(2/entradas)), que es lo que va bien con ReLU.
 */
import { seededRandom, type Matrix } from './tree';

export interface NeuralOptions {
  hidden: number;
  epochs: number;
  learningRate: number;
  l2: number;
  batchSize: number;
  /** Parte del entrenamiento reservada para la parada temprana. */
  validationFraction: number;
  seed?: number;
}

export const NEURAL_POR_DEFECTO: NeuralOptions = {
  hidden: 12,
  epochs: 120,
  learningRate: 0.05,
  l2: 1e-4,
  batchSize: 32,
  validationFraction: 0.15,
};

export interface NeuralModel {
  mean: Float64Array;
  std: Float64Array;
  w1: Float64Array;
  b1: Float64Array;
  w2: Float64Array;
  b2: Float64Array;
  inputs: number;
  hidden: number;
  classes: number;
  /** Pérdida en la parte reservada, en la época elegida. */
  validationLoss: number;
  epochsUsed: number;
}

function normalRandom(random: () => number): number {
  // Box-Muller: dos uniformes → una normal.
  const u = Math.max(1e-9, random());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
}

/** Tipifica una fila con las estadísticas del entrenamiento. */
function tipificar(model: NeuralModel, x: Float64Array): Float64Array {
  const z = new Float64Array(model.inputs);
  for (let i = 0; i < model.inputs; i++) z[i] = (x[i] - model.mean[i]) / model.std[i];
  return z;
}

/**
 * Paso hacia delante con la fila YA tipificada. Antes la tipificación vivía dentro del bucle de la
 * capa oculta, así que cada `(x - media) / desviación` se recalculaba una vez por neurona: 12 veces
 * por variable y por pasada. Tipificar la matriz una sola vez da los mismos números —es el mismo
 * `double`— con una fracción de las operaciones en el bucle más caliente del módulo.
 */
function adelante(model: NeuralModel, z: Float64Array, oculta: Float64Array, salida: Float64Array): void {
  const { inputs, hidden, classes, w1, b1, w2, b2 } = model;
  for (let h = 0; h < hidden; h++) {
    const off = h * inputs;
    let s = b1[h];
    for (let i = 0; i < inputs; i++) s += z[i] * w1[off + i];
    oculta[h] = s > 0 ? s : 0;
  }
  let max = -Infinity;
  for (let k = 0; k < classes; k++) {
    const off = k * hidden;
    let s = b2[k];
    for (let h = 0; h < hidden; h++) s += oculta[h] * w2[off + h];
    salida[k] = s;
    if (s > max) max = s;
  }
  let total = 0;
  for (let k = 0; k < classes; k++) {
    salida[k] = Math.exp(salida[k] - max);
    total += salida[k];
  }
  for (let k = 0; k < classes; k++) salida[k] /= total;
}

/** `y` es el índice de clase de cada fila. */
export function trainNeuralNet(X: Matrix, y: Int32Array, classes: number, opts: NeuralOptions = NEURAL_POR_DEFECTO): NeuralModel {
  const n = X.length;
  const inputs = X[0].length;
  const hidden = opts.hidden;
  const random = seededRandom(opts.seed ?? 20260919);

  // Tipificación con las filas de entrenamiento.
  const mean = new Float64Array(inputs);
  const std = new Float64Array(inputs);
  for (const fila of X) for (let i = 0; i < inputs; i++) mean[i] += fila[i];
  for (let i = 0; i < inputs; i++) mean[i] /= n;
  for (const fila of X) for (let i = 0; i < inputs; i++) std[i] += (fila[i] - mean[i]) ** 2;
  for (let i = 0; i < inputs; i++) std[i] = Math.max(1e-6, Math.sqrt(std[i] / n));

  const model: NeuralModel = {
    mean,
    std,
    w1: new Float64Array(hidden * inputs),
    b1: new Float64Array(hidden),
    w2: new Float64Array(classes * hidden),
    b2: new Float64Array(classes),
    inputs,
    hidden,
    classes,
    validationLoss: Infinity,
    epochsUsed: 0,
  };
  const escalaH = Math.sqrt(2 / inputs);
  const escalaS = Math.sqrt(2 / hidden);
  for (let i = 0; i < model.w1.length; i++) model.w1[i] = normalRandom(random) * escalaH;
  for (let i = 0; i < model.w2.length; i++) model.w2[i] = normalRandom(random) * escalaS;

  // Reparto entrenamiento / validación: las últimas filas, que son las más recientes.
  const corte = Math.max(1, Math.floor(n * (1 - opts.validationFraction)));
  const orden = Int32Array.from({ length: n }, (_, i) => i);
  const entrena = orden.slice(0, corte);
  const valida = orden.slice(corte);

  // Matriz tipificada una sola vez: es lo que consumen las ~120 epocas y la parada temprana.
  const Z: Matrix = X.map((fila) => tipificar(model, fila));

  const oculta = new Float64Array(hidden);
  const salida = new Float64Array(classes);
  const dOculta = new Float64Array(hidden);
  const dSalida = new Float64Array(classes);
  const mejor = { w1: model.w1.slice(), b1: model.b1.slice(), w2: model.w2.slice(), b2: model.b2.slice(), loss: Infinity, epoca: 0 };

  const perdida = (indices: Int32Array): number => {
    if (indices.length === 0) return Infinity;
    let total = 0;
    for (let s = 0; s < indices.length; s++) {
      const i = indices[s];
      adelante(model, Z[i], oculta, salida);
      total -= Math.log(Math.max(1e-12, salida[y[i]]));
    }
    return total / indices.length;
  };

  // Acumuladores del gradiente: se reutilizan en cada lote en vez de pedir cuatro arrays nuevos.
  const gw1 = new Float64Array(model.w1.length);
  const gb1 = new Float64Array(hidden);
  const gw2 = new Float64Array(model.w2.length);
  const gb2 = new Float64Array(classes);

  for (let epoca = 1; epoca <= opts.epochs; epoca++) {
    // Barajado de Fisher-Yates sobre las filas de entrenamiento.
    for (let i = entrena.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [entrena[i], entrena[j]] = [entrena[j], entrena[i]];
    }

    for (let inicio = 0; inicio < entrena.length; inicio += opts.batchSize) {
      const lote = entrena.subarray(inicio, Math.min(inicio + opts.batchSize, entrena.length));
      gw1.fill(0);
      gb1.fill(0);
      gw2.fill(0);
      gb2.fill(0);

      for (let b = 0; b < lote.length; b++) {
        const i = lote[b];
        adelante(model, Z[i], oculta, salida);
        for (let k = 0; k < classes; k++) dSalida[k] = salida[k] - (y[i] === k ? 1 : 0);
        dOculta.fill(0);
        for (let k = 0; k < classes; k++) {
          const off = k * hidden;
          const d = dSalida[k];
          gb2[k] += d;
          for (let h = 0; h < hidden; h++) {
            gw2[off + h] += d * oculta[h];
            dOculta[h] += d * model.w2[off + h];
          }
        }
        const z = Z[i];
        for (let h = 0; h < hidden; h++) {
          if (oculta[h] <= 0) continue; // ReLU apagada: no pasa gradiente
          const d = dOculta[h];
          const off = h * inputs;
          gb1[h] += d;
          for (let j = 0; j < inputs; j++) gw1[off + j] += d * z[j];
        }
      }

      const paso = opts.learningRate / lote.length;
      for (let i = 0; i < model.w1.length; i++) model.w1[i] -= paso * gw1[i] + opts.l2 * model.w1[i];
      for (let i = 0; i < model.w2.length; i++) model.w2[i] -= paso * gw2[i] + opts.l2 * model.w2[i];
      for (let h = 0; h < hidden; h++) model.b1[h] -= paso * gb1[h];
      for (let k = 0; k < classes; k++) model.b2[k] -= paso * gb2[k];
    }

    // Parada temprana: se guarda la mejor época sobre la parte reservada.
    const p = perdida(valida);
    if (p < mejor.loss) {
      mejor.loss = p;
      mejor.epoca = epoca;
      mejor.w1.set(model.w1);
      mejor.b1.set(model.b1);
      mejor.w2.set(model.w2);
      mejor.b2.set(model.b2);
    }
  }

  model.w1.set(mejor.w1);
  model.b1.set(mejor.b1);
  model.w2.set(mejor.w2);
  model.b2.set(mejor.b2);
  model.validationLoss = mejor.loss;
  model.epochsUsed = mejor.epoca;
  return model;
}

export function predictNeuralNet(model: NeuralModel, x: Float64Array): Float64Array {
  const oculta = new Float64Array(model.hidden);
  const salida = new Float64Array(model.classes);
  adelante(model, tipificar(model, x), oculta, salida);
  return salida;
}
