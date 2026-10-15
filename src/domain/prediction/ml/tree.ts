/**
 * Árboles de decisión, bosque aleatorio y gradient boosting, en TypeScript y sin dependencias.
 *
 * Por qué escritos aquí y no con una librería: el histórico son ~2.900 partidos y 41 variables. A esa
 * escala esto entrena en menos de un segundo, y meter una dependencia de aprendizaje automático (con
 * binarios nativos o WebAssembly) sería cargar el proyecto con un problema de instalación a cambio de
 * nada. Cuando el histórico crezca en un orden de magnitud, habrá que revisarlo.
 *
 * **Cortes por histograma**, que es lo que usan LightGBM y el modo `hist` de XGBoost: cada variable se
 * reparte una sola vez en 32 tramos por cuantiles, y en cada nodo se acumulan las sumas de cada tramo.
 * Así buscar el mejor corte cuesta O(filas × variables) por nivel en vez de reordenar en cada nodo.
 * Con la versión que ordenaba, un bosque de 120 árboles no terminaba en un tiempo razonable.
 *
 * Un solo constructor de árboles sirve para los dos modelos, porque los dos necesitan lo mismo: un
 * árbol de regresión que predice un VECTOR y parte por el error cuadrático.
 *   - **Bosque aleatorio**: cada árbol aprende el vector one-hot de la clase sobre una muestra bootstrap
 *     y un subconjunto de variables; la media de los árboles son las probabilidades.
 *   - **Gradient boosting**: en cada ronda, un árbol por clase ajustado al gradiente de la pérdida
 *     logarítmica, con tasa de aprendizaje.
 */

/** Matriz de variables: una fila por partido, siempre la misma longitud. */
export type Matrix = Float64Array[];

/** Tramos en los que se reparte cada variable. */
export const MAX_BINS = 32;

export interface Binned {
  /**
   * Un array POR VARIABLE con el tramo de cada fila (`bins[variable][fila]`).
   *
   * Por columnas y no por filas porque así se recorre: buscar el mejor corte de una variable lee sus
   * N valores seguidos. Con la disposición por filas cada lectura era `bins[fila][variable]`, dos
   * saltos de memoria y un tramo útil por cada 41 bytes traídos a la caché.
   */
  bins: Uint8Array[];
  /** Por variable, el valor de corte de cada tramo (el borde superior). */
  edges: Float64Array[];
  features: number;
  rows: number;
}

/** Reparte cada variable en tramos por cuantiles. Los valores repetidos no crean tramos vacíos. */
export function prepareBins(X: Matrix, maxBins = MAX_BINS): Binned {
  const n = X.length;
  const features = X[0].length;
  const edges: Float64Array[] = [];
  const bins: Uint8Array[] = [];

  const columna = new Float64Array(n);
  for (let f = 0; f < features; f++) {
    for (let i = 0; i < n; i++) columna[i] = X[i][f];
    const ordenada = Float64Array.from(columna).sort();
    const distintos: number[] = [];
    for (let i = 0; i < n; i++) if (i === 0 || ordenada[i] !== ordenada[i - 1]) distintos.push(ordenada[i]);

    let cortes: number[];
    if (distintos.length <= maxBins) {
      // Pocos valores distintos: un tramo por valor, cortando a medio camino.
      cortes = distintos.slice(0, -1).map((v, i) => (v + distintos[i + 1]) / 2);
    } else {
      cortes = [];
      for (let b = 1; b < maxBins; b++) {
        const q = ordenada[Math.min(n - 1, Math.floor((b * n) / maxBins))];
        if (cortes.length === 0 || q > cortes[cortes.length - 1]) cortes.push(q);
      }
    }
    edges.push(Float64Array.from(cortes));

    const col = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const v = columna[i];
      let b = 0;
      while (b < cortes.length && v > cortes[b]) b++;
      col[i] = b;
    }
    bins.push(col);
  }
  return { bins, edges, features, rows: n };
}

/** Tramo al que cae un valor suelto (para predecir). */
const binOf = (v: number, edges: Float64Array): number => {
  let b = 0;
  while (b < edges.length && v > edges[b]) b++;
  return b;
};

export interface TreeOptions {
  maxDepth: number;
  minSamplesLeaf: number;
  /** Variables candidatas en cada corte. `null` = todas. */
  maxFeatures: number | null;
  random: () => number;
}

interface Leaf {
  leaf: true;
  value: Float64Array;
}
interface Split {
  leaf: false;
  feature: number;
  /** Valor real de corte: `x <= threshold` va a la izquierda. */
  threshold: number;
  left: TreeNode;
  right: TreeNode;
}
export type TreeNode = Leaf | Split;

/** Generador congruente lineal: aleatorio reproducible a partir de una semilla. */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Error cuadrático de un grupo respecto a su media, sumado en las K salidas. */
function sse(sumas: Float64Array, cuadrados: Float64Array, n: number, desde: number, K: number): number {
  if (n <= 0) return 0;
  let total = 0;
  for (let k = 0; k < K; k++) total += cuadrados[desde + k] - (sumas[desde + k] * sumas[desde + k]) / n;
  return total;
}

function construir(
  datos: Binned,
  Y: Float64Array,
  K: number,
  indices: Int32Array,
  desde: number,
  hasta: number,
  depth: number,
  opts: TreeOptions,
  buffers: { sumas: Float64Array; cuadrados: Float64Array; cuentas: Int32Array },
): TreeNode {
  const n = hasta - desde;
  const valor = new Float64Array(K);
  const totalSumas = new Float64Array(K);
  const totalCuadrados = new Float64Array(K);
  for (let i = desde; i < hasta; i++) {
    const base = indices[i] * K;
    for (let k = 0; k < K; k++) {
      const y = Y[base + k];
      totalSumas[k] += y;
      totalCuadrados[k] += y * y;
    }
  }
  for (let k = 0; k < K; k++) valor[k] = n > 0 ? totalSumas[k] / n : 0;
  if (depth >= opts.maxDepth || n < 2 * opts.minSamplesLeaf) return { leaf: true, value: valor };

  const nVariables = datos.features;
  const candidatas: number[] = [];
  if (opts.maxFeatures === null || opts.maxFeatures >= nVariables) {
    for (let f = 0; f < nVariables; f++) candidatas.push(f);
  } else {
    const pool = Array.from({ length: nVariables }, (_, f) => f);
    for (let i = 0; i < opts.maxFeatures; i++) {
      const j = i + Math.floor(opts.random() * (pool.length - i));
      [pool[i], pool[j]] = [pool[j], pool[i]];
      candidatas.push(pool[i]);
    }
  }

  const errorPadre = sse(totalSumas, totalCuadrados, n, 0, K);
  let mejorGanancia = 1e-12;
  let mejorVariable = -1;
  let mejorCorte = 0;

  const { sumas, cuadrados, cuentas } = buffers;
  const izquierdaSumas = new Float64Array(K);
  const izquierdaCuadrados = new Float64Array(K);
  const derechaSumas = new Float64Array(K);
  const derechaCuadrados = new Float64Array(K);

  for (const f of candidatas) {
    const tramos = datos.edges[f].length + 1;
    sumas.fill(0, 0, tramos * K);
    cuadrados.fill(0, 0, tramos * K);
    cuentas.fill(0, 0, tramos);

    // Histograma del nodo: una pasada por sus filas.
    const col = datos.bins[f];
    if (K === 1) {
      // El gradient boosting ajusta un árbol por clase, así que K = 1 en todas sus llamadas.
      for (let i = desde; i < hasta; i++) {
        const fila = indices[i];
        const b = col[fila];
        const y = Y[fila];
        cuentas[b]++;
        sumas[b] += y;
        cuadrados[b] += y * y;
      }
    } else {
      for (let i = desde; i < hasta; i++) {
        const fila = indices[i];
        const b = col[fila];
        const base = fila * K;
        cuentas[b]++;
        for (let k = 0; k < K; k++) {
          const y = Y[base + k];
          sumas[b * K + k] += y;
          cuadrados[b * K + k] += y * y;
        }
      }
    }

    // Barrido de izquierda a derecha por los tramos.
    izquierdaSumas.fill(0);
    izquierdaCuadrados.fill(0);
    let nIzquierda = 0;
    for (let b = 0; b < tramos - 1; b++) {
      nIzquierda += cuentas[b];
      for (let k = 0; k < K; k++) {
        izquierdaSumas[k] += sumas[b * K + k];
        izquierdaCuadrados[k] += cuadrados[b * K + k];
      }
      const nDerecha = n - nIzquierda;
      if (nIzquierda < opts.minSamplesLeaf || nDerecha < opts.minSamplesLeaf) continue;
      for (let k = 0; k < K; k++) {
        derechaSumas[k] = totalSumas[k] - izquierdaSumas[k];
        derechaCuadrados[k] = totalCuadrados[k] - izquierdaCuadrados[k];
      }
      const ganancia =
        errorPadre - sse(izquierdaSumas, izquierdaCuadrados, nIzquierda, 0, K) - sse(derechaSumas, derechaCuadrados, nDerecha, 0, K);
      if (ganancia > mejorGanancia) {
        mejorGanancia = ganancia;
        mejorVariable = f;
        mejorCorte = datos.edges[f][b];
      }
    }
  }

  if (mejorVariable < 0) return { leaf: true, value: valor };

  // Reparte los índices del nodo en sitio.
  const corteBin = binOf(mejorCorte, datos.edges[mejorVariable]);
  const colCorte = datos.bins[mejorVariable];
  let iz = desde;
  let de = hasta - 1;
  while (iz <= de) {
    if (colCorte[indices[iz]] <= corteBin) iz++;
    else {
      const tmp = indices[iz];
      indices[iz] = indices[de];
      indices[de] = tmp;
      de--;
    }
  }
  if (iz === desde || iz === hasta) return { leaf: true, value: valor };

  return {
    leaf: false,
    feature: mejorVariable,
    threshold: mejorCorte,
    left: construir(datos, Y, K, indices, desde, iz, depth + 1, opts, buffers),
    right: construir(datos, Y, K, indices, iz, hasta, depth + 1, opts, buffers),
  };
}

/** `Y` son `filas` x `K` valores seguidos: la fila `i` ocupa desde `i * K`. */
export function growTree(datos: Binned, Y: Float64Array, K: number, indices: Int32Array, opts: TreeOptions): TreeNode {
  const maxTramos = MAX_BINS + 1;
  const buffers = {
    sumas: new Float64Array(maxTramos * K),
    cuadrados: new Float64Array(maxTramos * K),
    cuentas: new Int32Array(maxTramos),
  };
  return construir(datos, Y, K, indices, 0, indices.length, 0, opts, buffers);
}

export function predictTree(node: TreeNode, x: Float64Array): Float64Array {
  let n = node;
  while (!n.leaf) n = x[n.feature] <= n.threshold ? n.left : n.right;
  return n.value;
}

// ---------------------------------------------------------------------------
// Bosque aleatorio
// ---------------------------------------------------------------------------

export interface ForestOptions {
  trees: number;
  maxDepth: number;
  minSamplesLeaf: number;
  /** Variables por corte. Por defecto, la raíz del total (lo habitual en clasificación). */
  maxFeatures?: number;
  seed?: number;
}

export interface RandomForestModel {
  trees: TreeNode[];
  classes: number;
}

/** `Y` son vectores one-hot de la clase de cada fila. */
export function trainRandomForest(X: Matrix, Y: Matrix, opts: ForestOptions): RandomForestModel {
  const K = Y[0].length;
  const plano = new Float64Array(Y.length * K);
  for (let i = 0; i < Y.length; i++) plano.set(Y[i], i * K);
  return trainRandomForestBinned(prepareBins(X), Y.length, plano, K, opts);
}

export function trainRandomForestBinned(datos: Binned, n: number, Y: Float64Array, K: number, opts: ForestOptions): RandomForestModel {
  const random = seededRandom(opts.seed ?? 12345);
  const maxFeatures = opts.maxFeatures ?? Math.max(2, Math.round(Math.sqrt(datos.features)));
  const trees: TreeNode[] = [];
  const indices = new Int32Array(n);
  for (let t = 0; t < opts.trees; t++) {
    for (let i = 0; i < n; i++) indices[i] = Math.floor(random() * n);
    trees.push(growTree(datos, Y, K, indices, { maxDepth: opts.maxDepth, minSamplesLeaf: opts.minSamplesLeaf, maxFeatures, random }));
  }
  return { trees, classes: K };
}

export function predictForest(model: RandomForestModel, x: Float64Array): Float64Array {
  const out = new Float64Array(model.classes);
  for (const t of model.trees) {
    const v = predictTree(t, x);
    for (let k = 0; k < out.length; k++) out[k] += v[k];
  }
  let total = 0;
  for (let k = 0; k < out.length; k++) {
    // El promediado puede dejar un valor ligerísimamente negativo; una probabilidad no lo es.
    out[k] = Math.max(0, out[k] / model.trees.length);
    total += out[k];
  }
  if (total > 0) for (let k = 0; k < out.length; k++) out[k] /= total;
  else out.fill(1 / out.length);
  return out;
}

// ---------------------------------------------------------------------------
// Gradient boosting (pérdida logarítmica multiclase)
// ---------------------------------------------------------------------------

export interface BoostingOptions {
  rounds: number;
  learningRate: number;
  maxDepth: number;
  minSamplesLeaf: number;
  /** Filas por ronda (submuestreo estocástico). 1 = todas. */
  subsample?: number;
  seed?: number;
}

export interface BoostingModel {
  /** `rounds` × `classes` árboles, en orden. */
  rounds: TreeNode[][];
  classes: number;
  learningRate: number;
  /** Logit inicial de cada clase: su frecuencia en el entrenamiento. */
  base: Float64Array;
}

function softmax(f: Float64Array, salida: Float64Array): void {
  let max = -Infinity;
  for (const v of f) if (v > max) max = v;
  let total = 0;
  for (let k = 0; k < f.length; k++) {
    salida[k] = Math.exp(f[k] - max);
    total += salida[k];
  }
  for (let k = 0; k < f.length; k++) salida[k] /= total;
}

/** `y` es el índice de clase de cada fila. */
export function trainBoosting(X: Matrix, y: Int32Array, classes: number, opts: BoostingOptions): BoostingModel {
  return trainBoostingBinned(prepareBins(X), X, y, classes, opts);
}

export function trainBoostingBinned(datos: Binned, X: Matrix, y: Int32Array, classes: number, opts: BoostingOptions): BoostingModel {
  const n = X.length;
  const random = seededRandom(opts.seed ?? 54321);
  const base = new Float64Array(classes);
  for (let i = 0; i < n; i++) base[y[i]]++;
  for (let k = 0; k < classes; k++) base[k] = Math.log(Math.max(1e-6, base[k] / n));

  // `F` plano: n x classes logits seguidos, en vez de n arrays de longitud `classes`.
  const F = new Float64Array(n * classes);
  for (let i = 0; i < n; i++) F.set(base, i * classes);
  const logits = new Float64Array(classes);
  const p = new Float64Array(classes);
  const rondas: TreeNode[][] = [];
  const gradiente = new Float64Array(n);
  const escala = (opts.learningRate * (classes - 1)) / classes;
  const submuestra = opts.subsample ?? 1;
  const cuantas = submuestra >= 1 ? n : Math.max(opts.minSamplesLeaf * 4, Math.round(n * submuestra));
  const indices = new Int32Array(cuantas);

  for (let r = 0; r < opts.rounds; r++) {
    const arboles: TreeNode[] = [];
    for (let k = 0; k < classes; k++) {
      for (let i = 0; i < n; i++) {
        // `F` cambia tras el árbol de CADA clase, así que el softmax hay que rehacerlo por clase.
        for (let c = 0; c < classes; c++) logits[c] = F[i * classes + c];
        softmax(logits, p);
        gradiente[i] = (y[i] === k ? 1 : 0) - p[k];
      }
      if (submuestra >= 1) for (let i = 0; i < n; i++) indices[i] = i;
      else for (let i = 0; i < cuantas; i++) indices[i] = Math.floor(random() * n);

      const arbol = growTree(datos, gradiente, 1, indices, {
        maxDepth: opts.maxDepth,
        minSamplesLeaf: opts.minSamplesLeaf,
        maxFeatures: null,
        random,
      });
      arboles.push(arbol);
      for (let i = 0; i < n; i++) F[i * classes + k] += escala * predictTree(arbol, X[i])[0];
    }
    rondas.push(arboles);
  }

  return { rounds: rondas, classes, learningRate: opts.learningRate, base };
}

export function predictBoosting(model: BoostingModel, x: Float64Array): Float64Array {
  const F = Float64Array.from(model.base);
  const escala = (model.learningRate * (model.classes - 1)) / model.classes;
  for (const ronda of model.rounds) {
    for (let k = 0; k < model.classes; k++) F[k] += escala * predictTree(ronda[k], x)[0];
  }
  const out = new Float64Array(model.classes);
  softmax(F, out);
  return out;
}
