/**
 * Un club, un nombre dentro de su competición.
 *
 * Va aparte de `teamIdentity.ts` porque ese módulo lo importan los generadores de `scripts/` desde Node, y
 * eso obliga a extensiones explícitas en toda su cadena de imports. Aquí no hace falta.
 */
import type { Fixture, League, Match } from '../../types';
import { buildTeamId, resolveMatchId } from './ids';
import { currentSeasons, isCurrentSeason } from './seasonScope';

export interface TeamRename {
  leagueId: string;
  from: string;
  to: string;
  /** Filas (partidos + pendientes) que llevaban el nombre antiguo. */
  rows: number;
}

/**
 * Un club, un nombre dentro de su competición.
 *
 * `deriveTeams` identifica a cada equipo por `liga|nombre`, así que el mismo club escrito de dos formas son
 * **dos equipos**: dos filas en Competencias, dos opciones en el filtro de Equipo, dos historiales partidos
 * por la mitad y dos medias con la mitad de la muestra. No es un caso raro: en la BetPlay conviven
 * «Fortaleza FC» (FotMob y los Excel) con «Fortaleza CEIF» (worldfootball), «Alianza Valledupar» con
 * «Alianza FC», «Rionegro Águilas» con «Águilas Doradas» y «Independiente Santa Fe» con «Santa Fe».
 *
 * Gana el nombre de la **temporada en curso**, el más repetido en ella. Es el único que se sostiene: es el
 * que la fuente en vivo seguirá escribiendo en cada «Actualizar partidos», así que unificar en la otra
 * dirección recrearía el duplicado en la siguiente actualización. Un club que solo aparece en el histórico
 * (Envigado, descendido) conserva su nombre: no hay nada con lo que unificarlo.
 *
 * Solo se unifica lo que comparte referencia global, y esa referencia no se pone a la ligera: dos nombres
 * que caen en el mismo club solo por contención la pierden y pasan a revisión (`attachTeamRefs`), así que
 * un parecido de nombre no puede fundir dos clubes distintos.
 *
 * El nombre **visible** no cambia: lo pone `teamDisplay` desde la fuente oficial, y ya era el mismo para
 * los dos. Lo que cambia es la clave interna y, con ella, el `id` del partido cuando sale de los nombres
 * porque la fuente no da uno propio. Es idempotente: una fila que ya está bien se devuelve tal cual.
 */
export function unifyTeamNames(input: {
  leagues: League[];
  matches: Match[];
  fixtures: Fixture[];
}): { matches: Match[]; fixtures: Fixture[]; renamed: TeamRename[] } {
  const vigentes = currentSeasons(input.leagues);
  /** `liga|ref` → `nombre` → filas, contadas aparte en la temporada en curso y en total. */
  const cuenta = new Map<string, Map<string, { curso: number; total: number }>>();
  const filas = [...input.matches, ...input.fixtures];
  for (const row of filas) {
    const enCurso = isCurrentSeason(row, vigentes);
    for (const [name, ref] of [
      [row.homeTeamName, row.homeTeamRef],
      [row.awayTeamName, row.awayTeamRef],
    ] as const) {
      if (!ref) continue;
      const porNombre = cuenta.get(`${row.leagueId}|${ref}`) ?? new Map();
      const n = porNombre.get(name) ?? { curso: 0, total: 0 };
      if (enCurso) n.curso++;
      n.total++;
      porNombre.set(name, n);
      cuenta.set(`${row.leagueId}|${ref}`, porNombre);
    }
  }

  // El desempate por nombre mantiene el resultado estable: la misma base da siempre el mismo nombre.
  const canonico = new Map<string, string>();
  for (const [clave, porNombre] of cuenta) {
    if (porNombre.size < 2) continue;
    const hayCurso = [...porNombre.values()].some((n) => n.curso > 0);
    const [ganador] = [...porNombre].sort(
      ([na, a], [nb, b]) =>
        (hayCurso ? b.curso - a.curso : 0) || b.total - a.total || na.localeCompare(nb),
    )[0];
    canonico.set(clave, ganador);
  }
  if (canonico.size === 0) return { matches: input.matches, fixtures: input.fixtures, renamed: [] };

  const renombres = new Map<string, TeamRename>();
  const nombre = (leagueId: string, name: string, ref: string | null | undefined): string => {
    const nuevo = ref ? canonico.get(`${leagueId}|${ref}`) : undefined;
    if (!nuevo || nuevo === name) return name;
    const k = `${leagueId}|${name}`;
    const ya = renombres.get(k) ?? { leagueId, from: name, to: nuevo, rows: 0 };
    ya.rows++;
    renombres.set(k, ya);
    return nuevo;
  };

  const renombrar = <T extends Match | Fixture>(row: T): T => {
    const homeTeamName = nombre(row.leagueId, row.homeTeamName, row.homeTeamRef);
    const awayTeamName = nombre(row.leagueId, row.awayTeamName, row.awayTeamRef);
    if (homeTeamName === row.homeTeamName && awayTeamName === row.awayTeamName) return row;
    const base = {
      ...row,
      homeTeamName,
      awayTeamName,
      homeTeamId: buildTeamId(row.leagueId, homeTeamName),
      awayTeamId: buildTeamId(row.leagueId, awayTeamName),
    };
    return { ...base, id: resolveMatchId(base) } as T;
  };

  return {
    matches: input.matches.map(renombrar),
    fixtures: input.fixtures.map(renombrar),
    renamed: [...renombres.values()].sort((a, b) => b.rows - a.rows),
  };
}
