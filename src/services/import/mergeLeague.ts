/**
 * Fusión de un Excel de UNA competición sobre los datos que ya hay.
 *
 * El importador normal (`importWorkbook`) reemplaza el libro entero. Esto es lo contrario:
 * coge los partidos y pendientes de un archivo por liga —
 * `Analisis_Futbol_2026-27_[Liga].xlsx` o cualquier libro con las mismas hojas — y los mete
 * en la competición de la fila desde la que se pulsó, **sin tocar las demás**.
 *
 * Reglas:
 *  - Un `null` del archivo nunca borra un dato que ya teníamos (`mergeMatch`).
 *  - Los parámetros del modelo NO se tocan: son globales y el usuario los ha podido ajustar.
 *  - Un pendiente que ya figura como disputado con resultado se retira, igual que en la
 *    sincronización con el proveedor.
 */
import type { Fixture, League, Match } from '../../types';
import { buildMatchKey, buildTeamId } from '../../domain/models/ids';
import { hasResult } from '../../domain/calculations/matchDerived';
import { mergeMatch } from '../sync/syncEngine';
import { normalizeTeamName } from '../../domain/models/teamResolver';
import { espnLeagueId } from '../../domain/models/espnLeagues';
import type { CatalogTeam } from '../../domain/models/teamCatalog';
import { rosterFor, sameClub } from '../../domain/models/teamIdentity';
import type { ImportResult } from './excelImport';

const DIA = 86_400_000;

/**
 * El mismo partido traído de otra fuente: misma competición, los mismos dos clubes aunque se escriban distinto
 * (`sameClub`) y, o como mucho dos días de diferencia (la fecha UTC de una fuente frente a la local de otra), o la
 * misma jornada dentro de 60 días (un aplazado que una fuente deja en su fecha original), el mismo margen que
 * `findSamePairInRound`. Sin esto, el Excel de SofaScore duplicó en LigaPro 172 partidos que ya había traído FotMob.
 *
 * La pareja se compara sin mirar quién es local **solo dentro de esos dos días**: ahí las fuentes no se ponen de acuerdo
 * en la localía del MISMO partido (LigaPro J29, Aucas - Barcelona SC). Para saber si la fila entrante viene con la
 * localía al revés, `sameVenue` compara los locales.
 *
 * En la rama de los 60 días la localía SÍ tiene que coincidir, y eso corrige un falso positivo que se tragaba partidos
 * reales. La regla original daba por hecho que «en una jornada dos clubes no se enfrentan dos veces», y eso es falso en
 * cuanto hay eliminatorias a doble partido, que es de lo que están hechos los cuadrangulares sudamericanos. Medido al
 * cargar la BetPlay 2025: la ida `24/06 J24 Santa Fe 0-0 Medellín` y la vuelta `29/06 J24 Medellín 1-2 Santa Fe` —misma
 * jornada, cinco días, localía invertida— se fundían en una, y la vuelta desaparecía sin un solo aviso.
 */
export function findTwin<T extends Match | Fixture>(rows: T[], r: Match | Fixture, roster: CatalogTeam[]): T | undefined {
  const dia = Date.parse(r.date);
  return rows.find((x) => {
    if (x === r || x.leagueId !== r.leagueId) return false;
    const dias = Math.abs(Date.parse(x.date) - dia) / DIA;
    const mismaJornadaLejos = dias > 2;
    if (mismaJornadaLejos && !(x.round === r.round && dias <= 60)) return false;
    const misma = sameClub(x.homeTeamName, r.homeTeamName, roster) && sameClub(x.awayTeamName, r.awayTeamName, roster);
    if (misma) return true;
    // Localía invertida: el mismo partido visto por dos fuentes, o la vuelta de una eliminatoria.
    return !mismaJornadaLejos && sameClub(x.homeTeamName, r.awayTeamName, roster) && sameClub(x.awayTeamName, r.homeTeamName, roster);
  });
}

/** ¿Coincide quién juega en casa? Si no, los datos de la fila entrante van al equipo contrario y no se pueden fundir. */
const sameVenue = (a: Match | Fixture, b: Match | Fixture, roster: CatalogTeam[]) => sameClub(a.homeTeamName, b.homeTeamName, roster);

export interface MergeLeagueInput {
  /** Competición de destino: la fila desde la que se pulsó el botón. */
  league: League;
  imported: ImportResult;
  existingMatches: Match[];
  existingFixtures: Fixture[];
  /** Temporada a la que van las filas. Por defecto, la de la competición. Ver `retarget`. */
  season?: string;
}

export interface MergeLeagueStats {
  newMatches: number;
  updatedMatches: number;
  newFixtures: number;
  updatedFixtures: number;
  /** Pendientes retirados porque ya constan como disputados. */
  closedFixtures: number;
  /** Filas del archivo que son un partido que ya teníamos con la localía invertida: no se añaden ni se funden. */
  invertedMatches: number;
  /** Competición del archivo, cuando no se llama igual que la de destino. */
  renamedFrom: string | null;
}

export interface MergeLeagueResult {
  matches: Match[];
  fixtures: Fixture[];
  stats: MergeLeagueStats;
  error: string | null;
}

/**
 * ¿Nombran los dos la misma competición?
 *
 * Se acepta que uno contenga al otro tras normalizar, porque el archivo puede abreviar:
 * «Liga BetPlay» contra «Primera A (Liga BetPlay Dimayor)». Pero «LaLiga» no está contenida
 * en ninguna de las dos, así que un archivo colombiano no puede colarse en la fila española.
 */
function sameLeague(a: string, b: string): boolean {
  const x = normalizeTeamName(a);
  const y = normalizeTeamName(b);
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
}

/**
 * ¿Son la misma competición el archivo y el destino?
 *
 * Cuando las dos se reconocen —`espnLeagueId` las resuelve por nombre o, en los países de los que la app
 * cubre UNA sola liga, por país— **mandan ellas**, y el parecido de los nombres no pinta nada. Eso
 * arregla dos cosas a la vez:
 *
 *  - Deja entrar lo que es: el archivo dice «Primera División Argentina» y la app «Primera Division
 *    (Liga Profesional)». No comparten ni una palabra de más, pero las dos son `arg.1`.
 *  - **Y deja fuera lo que no**: «Bundesliga Austria» contiene a «Bundesliga», y «Brasileirao Serie A» a
 *    «Serie A». Solo con el nombre, el libro austriaco entraba en la liga alemana y el brasileño en la
 *    italiana, con sus 192 y 380 partidos. `aut.1` no es `ger.1`, y ahí se acaba la discusión.
 *
 * Si alguna de las dos no se reconoce, se cae al parecido de nombres de siempre.
 */
function esLaMisma(a: League, b: League): boolean {
  const x = espnLeagueId(a.name, a.country);
  const y = espnLeagueId(b.name, b.country);
  if (x !== null && y !== null) return x === y;
  return sameLeague(a.name, b.name);
}

/**
 * Qué competición del archivo corresponde a la de destino.
 *
 * Se exige que los nombres se correspondan **aunque el archivo traiga una sola liga**. Sin
 * ese requisito, soltar el archivo en la fila equivocada metía sus partidos en la
 * competición que no era, en silencio: 65 partidos colombianos dentro de LaLiga. Ante la
 * duda no se elige, y el error dice qué contiene el archivo.
 */
export function pickLeagueFromFile(
  target: League,
  fileLeagues: League[],
): { id: string; renamed: boolean } | null {
  const exacta = fileLeagues.find((l) => l.id === target.id);
  if (exacta) return { id: exacta.id, renamed: false };
  const parecida = fileLeagues.find((l) => esLaMisma(l, target));
  return parecida ? { id: parecida.id, renamed: true } : null;
}

/**
 * Reescribe una fila del archivo para que pertenezca a la competición de destino.
 *
 * `season` permite mandar la temporada desde fuera. Por defecto se usa la de la competición, que es lo
 * correcto cuando el archivo es el de la temporada en curso; una carga histórica pasa la suya, porque el
 * libro no dice a cuál pertenece. Sin este parámetro, cargar la BetPlay 2025 la etiquetaba como 2026/27 y
 * la sumaba a la tabla en curso: medido, América de Cali pasaba de 24 puntos en 11 partidos a 69 en 33, y
 * la tabla de 20 equipos a 27.
 */
function retarget<T extends Match | Fixture>(row: T, league: League, season?: string): T {
  const base = {
    ...row,
    leagueId: league.id,
    country: league.country,
    season: season ?? league.season,
    homeTeamId: buildTeamId(league.id, row.homeTeamName),
    awayTeamId: buildTeamId(league.id, row.awayTeamName),
  };
  // El id sale de la clave natural salvo que traiga id de proveedor, que manda.
  return { ...base, id: row.providerId ? `p:${row.providerId}` : buildMatchKey(base) } as T;
}

export function mergeLeagueImport(input: MergeLeagueInput): MergeLeagueResult {
  const { league, imported, season } = input;
  const stats: MergeLeagueStats = {
    newMatches: 0,
    updatedMatches: 0,
    newFixtures: 0,
    updatedFixtures: 0,
    closedFixtures: 0,
    invertedMatches: 0,
    renamedFrom: null,
  };

  const elegida = pickLeagueFromFile(league, imported.leagues);
  if (!elegida) {
    return {
      matches: input.existingMatches,
      fixtures: input.existingFixtures,
      stats,
      error:
        imported.leagues.length === 0
          ? 'El archivo no tiene ninguna competición en la hoja LIGAS.'
          : `Este archivo no es de «${league.name}»: contiene ` +
            `${imported.leagues.map((l) => `«${l.name}»`).join(', ')}. ` +
            'Cárgalo desde la fila que le corresponda.',
    };
  }
  if (elegida.renamed) {
    stats.renamedFrom = imported.leagues.find((l) => l.id === elegida.id)?.name ?? elegida.id;
  }

  /*
   * Las filas de ESTA competicion, de un libro que puede traer varias.
   *
   * Valen los dos ids porque hay dos formas de llegar aqui. Lo normal es que las filas traigan el id del
   * ARCHIVO y `retarget` las pase luego a la competicion de destino. Pero la carga de un historico ya las
   * reetiqueta antes (`prepararHistorico`), asi que llegan con el id de DESTINO. Mientras los dos nombres
   * coincidian no se notaba; con un libro que llama «Superliga Dinamarca» a la que la app llama
   * «Superliga», el filtro tiraba los 192 partidos y la pantalla decia que el archivo no traia ninguno.
   */
  const deEstaLiga = (id: string) => id === elegida.id || id === league.id;
  const delArchivo = <T extends Match | Fixture>(rows: T[]) =>
    rows.filter((r) => deEstaLiga(r.leagueId)).map((r) => retarget(r, league, season));

  const nuevosPartidos = delArchivo(imported.matches);
  const nuevosPendientes = delArchivo(imported.fixtures);

  if (nuevosPartidos.length === 0 && nuevosPendientes.length === 0) {
    return {
      matches: input.existingMatches,
      fixtures: input.existingFixtures,
      stats,
      error: `El archivo no trae ningún partido de «${league.name}».`,
    };
  }

  // ---- Partidos disputados: upsert por clave natural o, si no la hay, sobre el mismo partido traído de otra fuente.
  const matches = [...input.existingMatches];
  const porClave = new Map<string, number>();
  matches.forEach((m, i) => porClave.set(buildMatchKey(m), i));
  const plantilla = rosterFor(league);

  for (const inc of nuevosPartidos) {
    const clave = buildMatchKey(inc);
    const gemelo = porClave.has(clave) ? undefined : findTwin(matches, inc, plantilla);
    // Con la localía invertida no se puede fundir (las estadísticas irían al equipo contrario): se queda la que había.
    if (gemelo && !sameVenue(gemelo, inc, plantilla)) {
      stats.invertedMatches++;
      continue;
    }
    const i = porClave.get(clave) ?? (gemelo ? matches.indexOf(gemelo) : undefined);
    if (i === undefined) {
      matches.push(inc);
      porClave.set(clave, matches.length - 1);
      stats.newMatches++;
      continue;
    }
    const { merged, changed } = mergeMatch(matches[i], inc);
    if (changed) {
      matches[i] = merged;
      stats.updatedMatches++;
    }
  }

  // ---- Pendientes: upsert por clave, sin duplicar filas.
  const fixtures = [...input.existingFixtures];
  const fixturePorClave = new Map<string, number>();
  fixtures.forEach((f, i) => fixturePorClave.set(buildMatchKey(f), i));
  const jugadosLiga = matches.filter((m) => m.leagueId === league.id && hasResult(m));

  for (const inc of nuevosPendientes) {
    const clave = buildMatchKey(inc);
    const i = fixturePorClave.get(clave);
    if (i === undefined) {
      // El mismo partido, pendiente o ya jugado, traído de otra fuente: se queda el que había.
      if (findTwin(fixtures, inc, plantilla) || findTwin(jugadosLiga, inc, plantilla)) continue;
      fixtures.push(inc);
      fixturePorClave.set(clave, fixtures.length - 1);
      stats.newFixtures++;
      continue;
    }
    const anterior = fixtures[i];
    const cambia =
      anterior.date !== inc.date ||
      anterior.round !== inc.round ||
      anterior.status !== inc.status;
    if (cambia) {
      fixtures[i] = { ...anterior, date: inc.date, round: inc.round, status: inc.status };
      stats.updatedFixtures++;
    }
  }

  // ---- Un pendiente que ya consta como disputado CON RESULTADO, en esta u otra fuente, deja de estarlo.
  const disputados = new Set(matches.filter(hasResult).map(buildMatchKey));
  const restantes = fixtures.filter((f) => {
    if (f.leagueId !== league.id) return true;
    if (!disputados.has(buildMatchKey(f)) && !findTwin(jugadosLiga, f, plantilla)) return true;
    stats.closedFixtures++;
    return false;
  });

  return { matches, fixtures: restantes, stats, error: null };
}
