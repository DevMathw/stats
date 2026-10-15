/**
 * Distribución de conteos para corners y tarjetas. Añadido sobre el Excel, que solo publica el
 * valor esperado. Ver PICKS_METHODOLOGY.md §2.
 *
 * Por qué no Poisson a secas: en las ligas la varianza de corners y tarjetas por partido supera a la
 * media (las tarjetas dependen del árbitro, que el modelo no ve). Poisson estrecharía las colas y
 * daría edges falsos lejos de la media. Se usa una binomial negativa con el índice de dispersión
 * φ = varianza / media medido en la liga:
 *
 *   Var(X) = φ · μ   ⇒   tamaño r = μ / (φ − 1)
 *
 * La dispersión de liga incluye además la diferencia entre partidos (no todos tienen la misma μ), así
 * que sobreestima algo la varianza que queda una vez conocida la μ del modelo: el error va hacia
 * probabilidades menos extremas, no hacia edges inventados. Con φ ≤ 1 se usa Poisson.
 */
import { poissonCdf, poissonPmf } from './poisson';

export interface CountDistribution {
  /** Valor esperado del modelo. */
  mean: number;
  /** Tamaño r de la binomial negativa. `null` = Poisson. */
  size: number | null;
}

export interface Dispersion {
  /** Partidos de la liga con el dato de los dos equipos. */
  n: number;
  mean: number;
  /** Varianza muestral (n − 1). */
  variance: number;
  /** φ = varianza / media. */
  index: number;
  /**
   * Fracción de partidos con total 0. Un 0 en corners o tarjetas es rarísimo en un partido real; muchos
   * seguidos delatan una fuente que publica 0 cuando no registra el dato. Ausente = 0.
   */
  zeroShare?: number;
}

/** P(X = k) de la binomial negativa con media μ y tamaño r, por recurrencia. */
export function negBinPmf(k: number, mean: number, size: number): number {
  if (k < 0 || !Number.isInteger(k) || mean < 0 || size <= 0) return 0;
  const p = size / (size + mean);
  let term = Math.pow(p, size);
  for (let i = 1; i <= k; i++) term *= ((i - 1 + size) / i) * (1 - p);
  return term;
}

export function countPmf(k: number, d: CountDistribution): number {
  return d.size === null ? poissonPmf(k, d.mean) : negBinPmf(k, d.mean, d.size);
}

/** P(X ≤ k). */
export function countCdf(k: number, d: CountDistribution): number {
  if (k < 0) return 0;
  if (d.size === null) return poissonCdf(k, d.mean);
  let sum = 0;
  for (let i = 0; i <= k; i++) sum += negBinPmf(i, d.mean, d.size);
  return Math.min(1, sum);
}

/** P(X > línea) con línea X.5. */
export function countOverProbability(d: CountDistribution, line: number): number {
  return 1 - countCdf(Math.floor(line), d);
}

/** Menor k con P(X ≤ k) ≥ q. Para el rango probable. */
export function countQuantile(d: CountDistribution, q: number): number {
  let sum = 0;
  for (let k = 0; k < 500; k++) {
    sum += countPmf(k, d);
    if (sum >= q) return k;
  }
  return 500;
}

/** Índice de dispersión de una muestra de totales por partido. `null` con menos de 2 partidos. */
export function estimateDispersion(totals: number[]): Dispersion | null {
  const n = totals.length;
  if (n < 2) return null;
  const mean = totals.reduce((a, b) => a + b, 0) / n;
  const variance = totals.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1);
  return { n, mean, variance, index: mean > 0 ? variance / mean : 1, zeroShare: totals.filter((t) => t === 0).length / n };
}

/** Distribución para una μ del modelo con el φ de la liga. */
export function countDistribution(mean: number, dispersion: Dispersion | null): CountDistribution {
  const phi = dispersion?.index ?? 1;
  return { mean, size: phi > 1 && mean > 0 ? mean / (phi - 1) : null };
}
