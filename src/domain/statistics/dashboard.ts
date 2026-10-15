/**
 * Hoja DASHBOARD. MODEL_MAPPING.md §16.
 *
 * Los KPIs replican `AVERAGEIFS`, que ignora las filas sin dato: cada KPI viaja con su
 * tamaño de muestra para poder mostrar "N/D" en vez de un 0 inventado.
 */
import type { Filters, Match } from '../../types';
import {
  cornersTotal,
  isBtts,
  isOver,
  totalGoals,
  yellowCardsTotal,
} from '../calculations/matchDerived';

/**
 * Los filtros de la barra, aplicados a una lista de partidos.
 *
 * El equipo se compara por su clave (`liga|nombre`), que es la que llevan las propias filas. Antes se
 * traducía la clave a nombre con un mapa de `derived.teams`, y eso tenía dos problemas: `derived.teams` es
 * solo de la temporada en curso, así que con un club que solo está en el histórico la traducción fallaba y
 * el filtro **se ignoraba en silencio** (se veían los 413 partidos de la temporada con el chip de Envigado
 * puesto); y el mapa había que pasarlo desde cada pantalla.
 */
export function applyFilters(matches: Match[], f: Filters): Match[] {
  return matches.filter((m) => {
    if (f.country && m.country !== f.country) return false;
    if (f.leagueId && m.leagueId !== f.leagueId) return false;
    if (f.round !== null && m.round !== f.round) return false;
    if (f.dateFrom && m.date < f.dateFrom) return false;
    if (f.dateTo && m.date > f.dateTo) return false;
    if (f.teamId && m.homeTeamId !== f.teamId && m.awayTeamId !== f.teamId) return false;
    return true;
  });
}

export interface Kpi {
  value: number | null;
  sample: number;
}

export interface DashboardKpis {
  matches: number;
  avgGoals: Kpi;
  avgCorners: Kpi;
  avgCards: Kpi;
  bttsPct: Kpi;
  over25Pct: Kpi;
}

function average(values: (number | null)[]): Kpi {
  let sum = 0;
  let n = 0;
  for (const v of values) {
    if (v === null) continue;
    sum += v;
    n++;
  }
  return { value: n === 0 ? null : sum / n, sample: n };
}

function rate(values: (boolean | null)[]): Kpi {
  let hits = 0;
  let n = 0;
  for (const v of values) {
    if (v === null) continue;
    if (v) hits++;
    n++;
  }
  return { value: n === 0 ? null : hits / n, sample: n };
}

export function calculateKpis(matches: Match[]): DashboardKpis {
  return {
    matches: matches.length,
    avgGoals: average(matches.map(totalGoals)),
    avgCorners: average(matches.map(cornersTotal)),
    avgCards: average(matches.map(yellowCardsTotal)),
    bttsPct: rate(matches.map(isBtts)),
    over25Pct: rate(matches.map((m) => isOver(m, 2.5))),
  };
}

export interface LeagueSummaryRow {
  leagueId: string;
  matches: number;
  avgGoals: Kpi;
  avgCorners: Kpi;
  avgCards: Kpi;
}

/** DASHBOARD!M6:O24 — una fila por liga, sin aplicar los filtros. */
export function calculateLeagueSummary(matches: Match[]): LeagueSummaryRow[] {
  const byLeague = new Map<string, Match[]>();
  for (const m of matches) {
    const arr = byLeague.get(m.leagueId);
    if (arr) arr.push(m);
    else byLeague.set(m.leagueId, [m]);
  }
  return [...byLeague.entries()].map(([leagueId, ms]) => ({
    leagueId,
    matches: ms.length,
    avgGoals: average(ms.map(totalGoals)),
    avgCorners: average(ms.map(cornersTotal)),
    avgCards: average(ms.map(yellowCardsTotal)),
  }));
}

export interface RoundTrendPoint {
  round: number;
  avgGoals: number | null;
  avgCorners: number | null;
  matches: number;
}

/** DASHBOARD!L46:N… — promedio por número de jornada. */
export function roundTrend(matches: Match[]): RoundTrendPoint[] {
  const byRound = new Map<number, Match[]>();
  for (const m of matches) {
    const arr = byRound.get(m.round);
    if (arr) arr.push(m);
    else byRound.set(m.round, [m]);
  }
  return [...byRound.keys()]
    .sort((a, b) => a - b)
    .map((round) => {
      const ms = byRound.get(round)!;
      return {
        round,
        avgGoals: average(ms.map(totalGoals)).value,
        avgCorners: average(ms.map(cornersTotal)).value,
        matches: ms.length,
      };
    });
}
