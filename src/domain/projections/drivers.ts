/**
 * Por qué la proyección dice lo que dice: los factores que de verdad la movieron.
 *
 * No es una explicación escrita a mano ni un texto genérico. Cada factor se calcula comparando ESTE
 * partido con la media de su competición, con los mismos números que ya usa el modelo:
 *
 *   - ventaja de campo medida en la liga (no la supuesta),
 *   - diferencia de goles esperados entre los dos equipos,
 *   - forma reciente de cada uno frente a su propio rendimiento de temporada,
 *   - xG a favor y en contra, cuando la fuente lo publica,
 *   - enfrentamientos directos, solo si hay alguno en la base,
 *   - calidad de los rivales (SoS) cuando mueve algo.
 *
 * Un factor que no se puede calcular no aparece: no hay frases de relleno. El orden es por cuánto pesa,
 * medido como desviación respecto a la media de la liga, y por eso dos partidos distintos enseñan
 * factores distintos.
 */
import type { LeagueAverages, MatchProjection } from '../../types';

export interface ProjectionDriver {
  /** Qué mira el factor. */
  label: string;
  /** El dato, ya redondeado, tal como se enseña. */
  value: string;
  /** A favor de quién empuja: local, visitante o ninguno (goles del partido). */
  side: 'home' | 'away' | 'match';
  /** Cuánto se aleja de lo normal en esa liga. Solo ordena; no se enseña como cifra. */
  weight: number;
}

const pct = (v: number) => `${v > 0 ? '+' : ''}${(v * 100).toFixed(0)} %`;

/**
 * Los factores de una proyección, de mayor a menor peso. `averages` es la media de la competición: sin
 * ella no hay con qué comparar y se devuelve una lista vacía.
 */
export function projectionDrivers(p: MatchProjection, averages: LeagueAverages | undefined, max = 4): ProjectionDriver[] {
  if (!averages) return [];
  const b = p.breakdown;
  const out: ProjectionDriver[] = [];

  // 1. Diferencia de goles esperados: es lo que más mueve cualquier mercado.
  const diff = p.expectedGoalsHome - p.expectedGoalsAway;
  const mediaLiga = averages.homeGoalsFor - averages.awayGoalsFor;
  if (Number.isFinite(diff)) {
    out.push({
      label: 'Diferencia de goles esperados',
      value: `${diff > 0 ? '+' : ''}${diff.toFixed(2)} para el ${diff >= 0 ? 'local' : 'visitante'}`,
      side: diff >= 0 ? 'home' : 'away',
      weight: Math.abs(diff - mediaLiga) * 2,
    });
  }

  // 2. Ventaja de campo REAL de esa liga, no la que se supone.
  if (averages.homeGoalsFor > 0 && averages.awayGoalsFor > 0) {
    const ventaja = averages.homeGoalsFor / averages.awayGoalsFor - 1;
    out.push({
      label: 'Ventaja de campo en esta competición',
      value: `el local marca ${pct(ventaja)} que el visitante`,
      side: 'home',
      weight: Math.abs(ventaja),
    });
  }

  // 3. Forma reciente frente al rendimiento de temporada de cada equipo.
  for (const [lado, forma, base] of [
    ['home', b.form5Home, b.baseHome],
    ['away', b.form5Away, b.baseAway],
  ] as const) {
    if (forma === null || base === null || base <= 0) continue;
    const cambio = forma / base - 1;
    if (Math.abs(cambio) < 0.12) continue; // menos de eso es ruido de cinco partidos
    out.push({
      label: `Forma del ${lado === 'home' ? 'local' : 'visitante'} (últimos 5)`,
      value: `marca ${pct(cambio)} respecto a su temporada`,
      side: lado,
      weight: Math.abs(cambio),
    });
  }

  // 4. xG: solo si la fuente lo publica para ese equipo.
  for (const [lado, xg, base] of [
    ['home', b.xgHome, b.baseHome],
    ['away', b.xgAway, b.baseAway],
  ] as const) {
    if (xg === null || base === null || base <= 0) continue;
    const cambio = xg / base - 1;
    if (Math.abs(cambio) < 0.1) continue;
    out.push({
      label: `xG del ${lado === 'home' ? 'local' : 'visitante'}`,
      // El xG por encima de los goles es un equipo que crea y no acierta; por debajo, uno que acierta más
      // de lo que crea. Decirlo al revés confunde, y las dos frases estaban puestas iguales.
      value: cambio > 0 ? `crea ${pct(cambio)} más de lo que marca` : `marca ${pct(-cambio)} más de lo que crea`,
      side: lado,
      weight: Math.abs(cambio) * 0.8,
    });
  }

  // 5. Enfrentamientos directos: solo si los hay.
  if (b.h2hMatches > 0 && Math.abs(b.h2hAdjustment) > 0.01) {
    out.push({
      label: `Enfrentamientos directos (${b.h2hMatches})`,
      value: `${b.h2hAdjustment > 0 ? '+' : ''}${b.h2hAdjustment.toFixed(2)} goles al ${b.h2hAdjustment > 0 ? 'local' : 'visitante'}`,
      side: b.h2hAdjustment > 0 ? 'home' : 'away',
      weight: Math.abs(b.h2hAdjustment),
    });
  }

  // 6. Calidad de los rivales, solo cuando mueve algo.
  for (const [lado, sos] of [
    ['home', b.sosAdjustmentHome],
    ['away', b.sosAdjustmentAway],
  ] as const) {
    if (Math.abs(sos) < 0.01) continue;
    out.push({
      label: `Rivales del ${lado === 'home' ? 'local' : 'visitante'} hasta ahora`,
      value: sos > 0 ? `más duros de lo normal (${pct(sos)})` : `más flojos de lo normal (${pct(sos)})`,
      side: lado,
      weight: Math.abs(sos) * 0.6,
    });
  }

  return out.sort((a, z) => z.weight - a.weight).slice(0, max);
}
