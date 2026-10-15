/**
 * Nombre y escudo que se MUESTRAN de un equipo.
 *
 * Si el club tiene entrada en el catálogo oficial, se usan su nombre y su escudo oficiales; si
 * no, el nombre que ya tienen los datos y ningún escudo. El nombre de ESPN no se muestra nunca:
 * es solo la clave interna.
 *
 * Qué fuente oficial manda cuando un club aparece en varias (su liga doméstica frente a UEFA)
 * lo deciden los generadores al escribir `officialTeams.ts`: aquí llega ya una sola entrada por
 * club.
 */
import { OFFICIAL_TEAMS, type OfficialTeam } from '../../data/officialTeams';
import { espnIdFromRef, matchByNames } from './teamIdentity';
import { parseTeamId } from './ids';

const POR_ID = new Map(OFFICIAL_TEAMS.filter((t) => t.espnId).map((t) => [t.espnId, t]));
/** Clubes de ligas que ESPN no tiene (la Ekstraklasa): se enlazan por su clave en la competición. */
const POR_EQUIPO = new Map(OFFICIAL_TEAMS.filter((t) => t.teamId).map((t) => [t.teamId!, t]));

/**
 * Los mismos clubes, agrupados por competición y con sus variantes de nombre.
 *
 * Hace falta porque la clave exacta (`liga|nombre`) solo acierta si la fuente escribe el club igual que
 * los datos, y muchas veces no: el libro histórico dice «Girona FC» y FotMob «Girona». Con la lista por
 * liga se puede emparejar con la misma regla que la plantilla de ESPN, que se niega si hay más de un
 * candidato.
 */
const POR_LIGA = new Map<string, (OfficialTeam & { names: string[] })[]>();
for (const t of OFFICIAL_TEAMS) {
  if (!t.teamId || !t.names?.length) continue;
  const { leagueId } = parseTeamId(t.teamId);
  const lista = POR_LIGA.get(leagueId) ?? [];
  lista.push(t as OfficialTeam & { names: string[] });
  POR_LIGA.set(leagueId, lista);
}

/**
 * El club oficial de un equipo: por su referencia global, por su clave en la competición o, si la
 * fuente lo escribe de otra forma, por nombre dentro de su propia competición.
 *
 * El último paso es el que da escudo a los clubes que **ya no juegan** esa competición: descendieron,
 * no están en la plantilla actual de ESPN y por eso no tienen referencia global ni la tendrán nunca.
 * Nunca da nombre oficial, solo escudo: esas entradas son de fuente secundaria.
 */
export function officialTeam(ref: string | null | undefined, teamId?: string): OfficialTeam | null {
  const id = espnIdFromRef(ref);
  const global = id ? POR_ID.get(id) : undefined;
  if (global) return global;
  if (!teamId) return null;
  const exacto = POR_EQUIPO.get(teamId);
  if (exacto) return exacto;

  const { leagueId, teamName } = parseTeamId(teamId);
  const r = matchByNames(teamName, POR_LIGA.get(leagueId) ?? []);
  return r.status === 'resolved' ? r.team : null;
}

export interface TeamDisplay {
  name: string;
  crestUrl: string | null;
  /** `true` si nombre y escudo vienen de una fuente oficial. */
  official: boolean;
  source: string | null;
}

export function teamDisplay(ref: string | null | undefined, fallbackName: string, teamId?: string): TeamDisplay {
  return displayOf(officialTeam(ref, teamId), fallbackName);
}

/**
 * Un escudo de una fuente secundaria (la web oficial no deja leerlo) se muestra, pero el nombre
 * sigue siendo el de los datos: no se presenta como oficial lo que no lo es.
 */
export function displayOf(o: OfficialTeam | null, fallbackName: string): TeamDisplay {
  if (!o) return { name: fallbackName, crestUrl: null, official: false, source: null };
  if (o.secondary) return { name: fallbackName, crestUrl: o.crestUrl, official: false, source: o.source };
  return { name: o.name, crestUrl: o.crestUrl, official: true, source: o.source };
}

/**
 * Dirección local del escudo. El navegador nunca pide el escudo al CDN oficial: lo pide al
 * servidor, que lo descarga una sola vez y lo guarda (ver `server/crestProxy.ts`).
 */
export const crestSrc = (url: string) => `/api/crest?u=${encodeURIComponent(url)}`;
