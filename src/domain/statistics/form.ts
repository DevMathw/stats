/**
 * Hoja FORMA. MODEL_MAPPING.md §7 y DIFF-12.
 *
 * Hay DOS maneras de decidir qué partidos entran en «los últimos 5», y la diferencia no es cosmética:
 *
 * - **`excel`**: una ventana de NÚMEROS DE JORNADA, como el libro:
 *     `ultimaJornada = MAX(jornada del equipo)` y `jornada > ultimaJornada − N  Y  jornada <= ultimaJornada`.
 * - **`fecha`**: los N últimos partidos que el equipo ha jugado de verdad, por fecha.
 *
 * En el libro las dos coinciden, porque tenía una sola competición con las jornadas numeradas de corrido.
 * Fuera de ahí, la del libro se rompe de dos formas, medidas sobre los datos reales el 21/09/2026:
 *
 *  1. **Competiciones por fases.** El Championship Round de la LigaPro vuelve a numerar desde la J1, pero
 *     `MAX(jornada)` sigue siendo la J30 de la fase regular, así que la ventana se queda en J26–J30 y **el
 *     partido más reciente del equipo no entra en su propia forma**. La forma se congela al empezar el
 *     play-off y ya no se mueve. Afectaba a 12 de los 16 equipos de la LigaPro.
 *  2. **Partidos aplazados.** Si el orden de jornada no coincide con el de fecha (LaLiga, Championship),
 *     la ventana coge jornadas, no partidos recientes.
 *
 * En total, 48 de 584 equipos daban una forma distinta según el método. Por eso `fecha` es el valor por
 * defecto y `excel` se conserva: es lo que necesita `npm run validate` para comparar contra el libro, igual
 * que `statAverageMode` (DIFF-07). De aquí salen `Prom GF Ult5/Ult10`, que alimentan W_FORM5 y W_FORM10.
 */
import type { FormWindow, FormWindowMode, Match, RecentForm } from '../../types';
import { hasResult, pointsFor, resultFT } from '../calculations/matchDerived';
import { safeDiv } from './aggregate';

/** FORMA!D — jornada más alta jugada. 0 si el equipo no tiene partidos. */
export function lastPlayedRound(matches: Match[], leagueId: string, teamName: string): number {
  let max = 0;
  for (const m of matches) {
    if (m.leagueId !== leagueId) continue;
    if (m.homeTeamName !== teamName && m.awayTeamName !== teamName) continue;
    if (!hasResult(m)) continue;
    if (m.round > max) max = m.round;
  }
  return max;
}

export function emptyFormWindow(window: 5 | 10): FormWindow {
  return {
    window,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    points: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    avgGoalsFor: null,
    avgGoalsAgainst: null,
  };
}

/** Los partidos del equipo que entran en la ventana, según el método. */
export function matchesInWindow(
  matches: Match[],
  leagueId: string,
  teamName: string,
  window: 5 | 10,
  mode: FormWindowMode,
  lastRound = lastPlayedRound(matches, leagueId, teamName),
): Match[] {
  const suyos = matches.filter(
    (m) => m.leagueId === leagueId && hasResult(m) && (m.homeTeamName === teamName || m.awayTeamName === teamName),
  );
  if (mode === 'fecha') {
    // Desempate por jornada: dos partidos el mismo día se ordenan como los numera la competición.
    return [...suyos].sort((a, b) => a.date.localeCompare(b.date) || a.round - b.round).slice(-window);
  }
  if (lastRound === 0) return [];
  const lower = lastRound - window;
  return suyos.filter((m) => m.round > lower && m.round <= lastRound);
}

export function calculateRecentForm(
  matches: Match[],
  leagueId: string,
  teamName: string,
  window: 5 | 10,
  mode: FormWindowMode = 'excel',
  lastRound = lastPlayedRound(matches, leagueId, teamName),
): FormWindow {
  const out = emptyFormWindow(window);

  for (const m of matchesInWindow(matches, leagueId, teamName, window, mode, lastRound)) {
    const isHome = m.homeTeamName === teamName;

    out.played++;
    const r = resultFT(m)!;
    if (r === 'X') out.drawn++;
    else if ((r === '1') === isHome) out.won++;
    else out.lost++;

    out.points += pointsFor(m, isHome)!;
    out.goalsFor += (isHome ? m.homeGoals : m.awayGoals)!;
    out.goalsAgainst += (isHome ? m.awayGoals : m.homeGoals)!;
  }

  out.avgGoalsFor = safeDiv(out.goalsFor, out.played);
  out.avgGoalsAgainst = safeDiv(out.goalsAgainst, out.played);
  return out;
}

export function calculateForm(matches: Match[], leagueId: string, teamName: string, mode: FormWindowMode = 'excel'): RecentForm {
  const lastRound = lastPlayedRound(matches, leagueId, teamName);
  return {
    lastRound,
    last5: calculateRecentForm(matches, leagueId, teamName, 5, mode, lastRound),
    last10: calculateRecentForm(matches, leagueId, teamName, 10, mode, lastRound),
  };
}
