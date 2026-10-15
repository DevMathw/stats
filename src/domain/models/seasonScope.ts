/**
 * Qué partidos son «la temporada en curso» y cuáles son histórico.
 *
 * Esta es la pieza que hace seguro cargar temporadas pasadas. Sin ella, meter la BetPlay 2025 en la base
 * junto a la 2026 corrompería todo lo que la aplicación calcula: la tabla sumaría dos torneos, el PPG de un
 * equipo mezclaría dos plantillas, las medias de la liga se promediarían entre temporadas y las
 * proyecciones saldrían de esa mezcla. El motor (`domain/engine.ts`) agrupa por liga, nunca por temporada.
 *
 * La decisión de diseño, y el motivo:
 *
 *   **El histórico no entra en `recalculateAll`.** Tabla, forma, medias, dispersión y proyecciones son de
 *   la temporada vigente y solo de ella. El histórico se guarda entero y se usa donde de verdad aporta:
 *   el dataset del motor de predicción (`prediction/features.ts`) y el backtest, que recorren los partidos
 *   POR FECHA y por construcción no pueden mirar hacia delante.
 *
 * Alternativa descartada: meter la temporada en el id de equipo. Habría obligado a reescribir los
 * `home_team_id` y `away_team_id` de los 3.041 partidos guardados y todo lo que los referencia, a cambio
 * de lo mismo que consigue un filtro.
 *
 * La comparación usa la clave canónica (`season.ts`) y no el texto: en la base conviven `2026/27` y
 * `2026/27*` para la misma temporada, y un libro importado puede traer `2026` o `2026/2027`.
 */
import type { Fixture, League, Match } from '../../types';
import { seasonKey } from './season';

/** Temporada vigente de cada competición, ya en clave canónica. */
export function currentSeasons(leagues: League[]): Map<string, string | null> {
  return new Map(leagues.map((l) => [l.id, seasonKey(l.season)]));
}

/**
 * Si un partido pertenece a la temporada vigente de su competición.
 *
 * Un partido de una liga que no está dada de alta se considera vigente: descartarlo lo haría desaparecer
 * del análisis sin que nada lo dijera, y hasta hoy todos los partidos guardados son de la temporada en
 * curso. Lo mismo si su temporada no tiene clave legible.
 */
export function isCurrentSeason(m: Pick<Match | Fixture, 'leagueId' | 'season'>, vigentes: Map<string, string | null>): boolean {
  if (!vigentes.has(m.leagueId)) return true;
  const dela = vigentes.get(m.leagueId) ?? null;
  const suya = seasonKey(m.season);
  if (dela === null || suya === null) return true;
  return dela === suya;
}

export interface SeasonSplit<T> {
  /** Lo que alimenta a `recalculateAll`: tabla, forma, medias y proyecciones. */
  current: T[];
  /** Temporadas anteriores: solo para entrenar modelos, comparar y hacer backtest. */
  history: T[];
}

/** Separa una lista de partidos en temporada vigente e histórico. */
export function splitBySeason<T extends Pick<Match | Fixture, 'leagueId' | 'season'>>(
  rows: T[],
  leagues: League[],
): SeasonSplit<T> {
  const vigentes = currentSeasons(leagues);
  const current: T[] = [];
  const history: T[] = [];
  for (const r of rows) (isCurrentSeason(r, vigentes) ? current : history).push(r);
  return { current, history };
}

/** Cuántos partidos hay por competición y temporada. Para la pantalla de datasets. */
export function countBySeason(matches: Match[]): Map<string, Map<string, number>> {
  const out = new Map<string, Map<string, number>>();
  for (const m of matches) {
    const clave = seasonKey(m.season) ?? m.season;
    const porLiga = out.get(m.leagueId) ?? new Map<string, number>();
    porLiga.set(clave, (porLiga.get(clave) ?? 0) + 1);
    out.set(m.leagueId, porLiga);
  }
  return out;
}
