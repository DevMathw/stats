/**
 * Contracción bayesiana hacia la media de liga. MODEL_MAPPING.md §10.
 *
 *   peso = PJ / (PJ + K_SHRINK)
 *   valor = peso · valorEquipo + (1 - peso) · mediaLiga
 *
 * Aparece decenas de veces dentro de PROYECCIONES!F5, siempre con esta forma.
 */

/** Peso de la evidencia propia del equipo frente al prior de la liga. */
export function shrinkWeight(played: number, kShrink: number): number {
  const denom = played + kShrink;
  return denom === 0 ? 0 : played / denom;
}

export function shrinkToLeagueMean(
  teamValue: number | null,
  played: number,
  leagueMean: number,
  kShrink: number,
): number {
  const w = shrinkWeight(played, kShrink);
  // Excel: si el INDEX no devuelve número, el propio término usa AVERAGEIFS(liga).
  const value = teamValue ?? leagueMean;
  return w * value + (1 - w) * leagueMean;
}

/** `MAX(MIN(x, hi), lo)` del Excel. */
export function clamp(x: number, lo: number, hi: number): number {
  return Math.max(Math.min(x, hi), lo);
}
