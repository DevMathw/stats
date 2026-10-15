/**
 * Identidad global de equipos.
 *
 * Reconoce que el mismo club juega en varias competiciones aunque cada fuente lo escriba de
 * otra forma. La clave es el id de ESPN, que es el mismo para un club en todas sus
 * competiciones. Es interna: no se muestra en ninguna parte.
 *
 * La regla que evita las falsas uniones: un nombre se busca SOLO dentro de la plantilla de su
 * competición, nunca en todo el catálogo. En LaLiga, «Real Madrid CF» solo puede ser uno de
 * 20 clubes; en el catálogo entero, «Inter» sería también Internacional de Porto Alegre o
 * Internacional de Bogotá.
 */
import type { Fixture, League, Match } from '../../types/index.ts';
// Extensión `.ts` explícita: los generadores de `scripts/` importan este módulo desde Node.
import { TEAM_CATALOG } from '../../data/teamCatalog.ts';
import { TEAM_ALIAS_SEED } from '../../data/teamAliasSeed.ts';
import type { CatalogTeam } from './teamCatalog.ts';
import { espnLeagueId } from './espnLeagues.ts';
import { normalizeTeamName } from './teamResolver.ts';

/** Palabras que no identifican a un club: «Real Madrid CF» y «Real Madrid» son el mismo. */
const GENERICAS = new Set([
  'fc', 'cf', 'afc', 'sc', 'ac', 'cd', 'ud', 'sd', 'club', 'de', 'cfc', 'osc', 'kv', 'fk', 'sk',
  'if', 'bk', 'ca', 'sad', 'cp', 'the',
]);

const palabras = (s: string) =>
  normalizeTeamName(s)
    .split(' ')
    .filter((w) => w && !GENERICAS.has(w));
const clave = (s: string) => palabras(s).join(' ');
const contenido = (a: string[], b: string[]) => a.length > 0 && a.every((w) => b.includes(w));

const PLANTILLAS = new Map<string, CatalogTeam[]>();
for (const t of TEAM_CATALOG) {
  for (const slug of t.competitions) {
    const lista = PLANTILLAS.get(slug) ?? [];
    lista.push(t);
    PLANTILLAS.set(slug, lista);
  }
}
const SEMILLA = new Map(TEAM_ALIAS_SEED.map((a) => [normalizeTeamName(a.name), a.espnId]));

export const teamRef = (espnId: string) => `espn-${espnId}`;

export const espnIdFromRef = (ref: string | null | undefined): string | null =>
  ref?.startsWith('espn-') ? ref.slice(5) : null;

/**
 * Alias `nombre entrante normalizado → nombre que ya usa la app` para UNA competición, a través
 * del club de ESPN: «Olympique de Marseille» (web oficial) y «Marsella» (Excel) son el mismo club,
 * así que el partido se funde en vez de crear un equipo nuevo.
 *
 * Solo salen alias inequívocos: si dos nombres entrantes caen en el mismo club, o el club tiene
 * dos nombres en la app, no se crea ninguno.
 *
 * @param rows filas ya guardadas, con su referencia global puesta (`attachTeamRefs`)
 */
export function identityAliasesFor(
  league: Pick<League, 'id' | 'name' | 'country'>,
  rows: Pick<Match, 'leagueId' | 'homeTeamName' | 'awayTeamName' | 'homeTeamRef' | 'awayTeamRef'>[],
  incoming: string[],
  aliases: Record<string, string> = {},
): Record<string, string> {
  const enApp = new Map<string, Set<string>>();
  for (const r of rows) {
    if (r.leagueId !== league.id) continue;
    for (const [nombre, ref] of [
      [r.homeTeamName, r.homeTeamRef],
      [r.awayTeamName, r.awayTeamRef],
    ] as const) {
      const id = espnIdFromRef(ref);
      if (!id) continue;
      const set = enApp.get(id) ?? new Set<string>();
      set.add(nombre);
      enApp.set(id, set);
    }
  }

  const roster = rosterFor(league);
  const entrantes = new Map<string, string[]>();
  for (const nombre of new Set(incoming)) {
    const res = resolveInCompetition(nombre, roster, aliases);
    if (res.status !== 'resolved') continue;
    entrantes.set(res.team.espnId, [...(entrantes.get(res.team.espnId) ?? []), nombre]);
  }

  const out: Record<string, string> = {};
  for (const [id, nombres] of entrantes) {
    const conocidos = enApp.get(id);
    if (nombres.length !== 1 || conocidos?.size !== 1) continue;
    out[normalizeTeamName(nombres[0])] = [...conocidos][0];
  }
  return out;
}

/** Plantilla de la competición según ESPN. Vacía si ESPN no la cubre. */
/** Plantilla de una competición por su id de ESPN (el mismo `slug` que usa el registro de fuentes). */
export const rosterForSlug = (slug: string): CatalogTeam[] => PLANTILLAS.get(slug) ?? [];

export function rosterFor(league: Pick<League, 'name' | 'country'>): CatalogTeam[] {
  const slug = espnLeagueId(league.name, league.country);
  return slug ? rosterForSlug(slug) : [];
}

/** Lo que se puede emparejar por nombre: cualquier cosa que traiga sus variantes. */
export interface ConNombres {
  names: string[];
}

export type NameMatch<T> =
  | { status: 'resolved'; team: T; via: 'exact' | 'subset' }
  | { status: 'ambiguous'; candidates: T[] }
  | { status: 'unresolved' };

/**
 * Empareja un nombre con una lista de candidatos por sus variantes de nombre.
 *
 * Son los dos pasos que no miran alias: mismo nombre salvo sufijos genéricos y, si eso no basta, uno
 * contiene todas las palabras del otro. En los dos, **solo vale si el candidato es único**: con dos o
 * más se devuelve `ambiguous` y no se empareja nada. Es la regla que impide fundir «FK Žalgiris» con
 * «Kauno Žalgiris».
 *
 * Vive aparte de `resolveInCompetition` porque la usan dos sitios con listas distintas: la plantilla de
 * ESPN de una competición (para la identidad interna) y los clubes que una fuente publicó en esa
 * competición (para el escudo de un club que ya no la juega).
 */
export function matchByNames<T extends ConNombres>(name: string, candidatos: readonly T[]): NameMatch<T> {
  const k = clave(name);
  const exactos = candidatos.filter((t) => t.names.some((x) => clave(x) === k));
  if (exactos.length === 1) return { status: 'resolved', team: exactos[0], via: 'exact' };
  if (exactos.length > 1) return { status: 'ambiguous', candidates: exactos };

  const w = palabras(name);
  const parciales = candidatos.filter((t) =>
    t.names.some((x) => {
      const xw = palabras(x);
      return contenido(w, xw) || contenido(xw, w);
    }),
  );
  if (parciales.length === 1) return { status: 'resolved', team: parciales[0], via: 'subset' };
  if (parciales.length > 1) return { status: 'ambiguous', candidates: parciales };
  return { status: 'unresolved' };
}

export type TeamResolution =
  | { status: 'resolved'; team: CatalogTeam; via: 'alias' | 'exact' | 'subset' }
  | { status: 'ambiguous'; candidates: CatalogTeam[] }
  | { status: 'unresolved' };

/**
 * @param roster  plantilla de la competición del partido (`rosterFor`)
 * @param aliases confirmados por el usuario: `nombre normalizado → id de ESPN`
 */
export function resolveInCompetition(
  name: string,
  roster: CatalogTeam[],
  aliases: Record<string, string> = {},
): TeamResolution {
  if (roster.length === 0) return { status: 'unresolved' };
  const n = normalizeTeamName(name);

  // 1. Alias: primero los del usuario, luego los revisados. Solo valen si el club juega ESTA
  //    competición, así que un alias mal puesto no puede sacar a un equipo de su liga.
  for (const id of [aliases[n], SEMILLA.get(n)]) {
    const t = id ? roster.find((x) => x.espnId === id) : undefined;
    if (t) return { status: 'resolved', team: t, via: 'alias' };
  }

  // 2 y 3. Por nombre: igual salvo sufijos genéricos, o uno contenido en el otro.
  return matchByNames(name, roster);
}

/**
 * ¿Son el mismo club dos nombres de una misma competición? Iguales al normalizar o, si la plantilla los identifica a los
 * dos sin dudas, con el mismo id: «CSD Macará» y «Macará», o «U. Católica (ECU)» y «Universidad Católica», que no
 * empiezan igual. Sin plantilla, solo por nombre.
 */
export function sameClub(a: string, b: string, roster: CatalogTeam[]): boolean {
  if (normalizeTeamName(a) === normalizeTeamName(b)) return true;
  const ra = resolveInCompetition(a, roster);
  const rb = resolveInCompetition(b, roster);
  return ra.status === 'resolved' && rb.status === 'resolved' && ra.team.espnId === rb.team.espnId;
}

export interface TeamIssue {
  leagueId: string;
  /** Nombre tal como está en los datos. */
  name: string;
  /**
   * `ambiguous`: encaja con varios clubes de la plantilla.
   * `unresolved`: no se parece a ninguno.
   * `shared`: se parece a un club que ya tiene otro nombre de la misma competición.
   */
  status: 'ambiguous' | 'unresolved' | 'shared';
  candidates: { espnId: string; name: string }[];
}

type Hallazgo = {
  leagueId: string;
  name: string;
  team: CatalogTeam | null;
  via: 'alias' | 'exact' | 'subset' | null;
};

/**
 * Pone a cada partido y pendiente la referencia global de sus dos equipos.
 *
 * No cambia nombres ni `homeTeamId`: la clasificación, las estadísticas y la validación contra
 * el Excel siguen siendo por competición y dan exactamente lo mismo. Es idempotente, y una
 * fila que ya estaba bien se devuelve tal cual (misma referencia de objeto).
 */
export function attachTeamRefs(input: {
  leagues: League[];
  matches: Match[];
  fixtures: Fixture[];
  aliases?: Record<string, string>;
}): { matches: Match[]; fixtures: Fixture[]; issues: TeamIssue[] } {
  const ligas = new Map(input.leagues.map((l) => [l.id, l]));
  const hallazgos = new Map<string, Hallazgo>();
  const issues = new Map<string, TeamIssue>();

  // 1. Cada nombre distinto de cada competición se resuelve una sola vez.
  const registrar = (leagueId: string, name: string) => {
    const ck = `${leagueId}|${name}`;
    if (hallazgos.has(ck)) return;
    const liga = ligas.get(leagueId);
    const roster = liga ? rosterFor(liga) : [];
    // Sin plantilla no hay con qué comparar. No es un problema del equipo, así que no se
    // reporta: simplemente queda sin referencia.
    if (roster.length === 0) {
      hallazgos.set(ck, { leagueId, name, team: null, via: null });
      return;
    }
    const r = resolveInCompetition(name, roster, input.aliases);
    if (r.status === 'resolved') {
      hallazgos.set(ck, { leagueId, name, team: r.team, via: r.via });
      return;
    }
    hallazgos.set(ck, { leagueId, name, team: null, via: null });
    issues.set(ck, {
      leagueId,
      name,
      status: r.status,
      candidates:
        r.status === 'ambiguous'
          ? r.candidates.map((t) => ({ espnId: t.espnId, name: t.name }))
          : [],
    });
  };
  for (const row of [...input.matches, ...input.fixtures]) {
    registrar(row.leagueId, row.homeTeamName);
    registrar(row.leagueId, row.awayTeamName);
  }

  // 2. Dos nombres de una misma competición que apuntan al mismo club pueden ser el mismo club
  //    escrito de dos formas («Real Madrid» y «Real Madrid CF», ambos por nombre exacto) o dos
  //    clubes distintos que se parecen («FK Žalgiris» de Vilnius cae por contención en
  //    «Kauno Žalgiris»). Solo la contención es sospechosa: el nombre que comparte club por esa
  //    vía se queda sin referencia y pasa a revisión.
  const porClub = new Map<string, string[]>();
  for (const [ck, h] of hallazgos) {
    if (!h.team) continue;
    const k = `${h.leagueId}|${h.team.espnId}`;
    porClub.set(k, [...(porClub.get(k) ?? []), ck]);
  }
  for (const claves of porClub.values()) {
    if (claves.length < 2) continue;
    for (const ck of claves) {
      const h = hallazgos.get(ck)!;
      if (h.via !== 'subset' || !h.team) continue;
      issues.set(ck, {
        leagueId: h.leagueId,
        name: h.name,
        status: 'shared',
        candidates: [{ espnId: h.team.espnId, name: h.team.name }],
      });
      hallazgos.set(ck, { ...h, team: null, via: null });
    }
  }

  const refDe = (leagueId: string, name: string): string | null => {
    const team = hallazgos.get(`${leagueId}|${name}`)?.team;
    return team ? teamRef(team.espnId) : null;
  };

  const marcar = <T extends Match | Fixture>(row: T): T => {
    const homeTeamRef = refDe(row.leagueId, row.homeTeamName);
    const awayTeamRef = refDe(row.leagueId, row.awayTeamName);
    return row.homeTeamRef === homeTeamRef && row.awayTeamRef === awayTeamRef
      ? row
      : { ...row, homeTeamRef, awayTeamRef };
  };

  return {
    matches: input.matches.map(marcar),
    fixtures: input.fixtures.map(marcar),
    issues: [...issues.values()],
  };
}
