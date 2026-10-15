/**
 * Empareja las competiciones de la hoja LIGAS con el catálogo del proveedor.
 *
 * El problema: LIGAS dice "LaLiga" en "Espana" y el proveedor dice "La Liga" en "Spain".
 * Igual que con los equipos, aquí **no se adivina**: lo inequívoco se asigna solo y lo
 * dudoso se devuelve como lista de candidatos para que lo elija el usuario.
 */
import type { League } from '../../types';
import { normalizeTeamName } from './teamResolver';

/** Una competición tal como la lista el proveedor. */
export interface ProviderCompetition {
  /** Id con el que el proveedor la identifica. */
  id: string;
  name: string;
  /** País o ámbito, como lo llama el proveedor (normalmente en inglés). */
  country: string;
  /** "League", "Cup"… */
  type: string;
  /** Temporada en curso según el proveedor. */
  currentSeason: number | null;
  /** Plan necesario para leerla, tal como lo etiqueta el proveedor. `null` si no lo dice. */
  plan: string | null;
}

/** Países de la hoja LIGAS (sin acentos) → como los nombra el proveedor. */
const COUNTRY_ES_EN: Record<string, string> = {
  alemania: 'germany',
  argentina: 'argentina',
  belgica: 'belgium',
  bolivia: 'bolivia',
  brasil: 'brazil',
  chile: 'chile',
  colombia: 'colombia',
  dinamarca: 'denmark',
  ecuador: 'ecuador',
  espana: 'spain',
  francia: 'france',
  inglaterra: 'england',
  italia: 'italy',
  'paises bajos': 'netherlands',
  paraguay: 'paraguay',
  portugal: 'portugal',
  turquia: 'turkey',
  uruguay: 'uruguay',
  venezuela: 'venezuela',
  europa: 'world',
};

/** Ámbitos que no son un país: ahí sí se busca sin filtrar por país. */
const SUPRANATIONAL = new Set(['world', 'europe', 'europa', 'international']);

/**
 * Nombres de LIGAS que no se parecen al del proveedor y hay que traducir a mano.
 * Comprobados contra `GET /v4/competitions` de football-data.org.
 */
const NAME_HINTS: Record<string, string> = {
  laliga: 'primera division',
  'brasileirao serie a': 'campeonato brasileiro serie a',
  'liga portugal primeira liga': 'primeira liga',
  'primera division liga profesional': 'liga profesional',
  'primera a liga betplay dimayor': 'primera a',
  'primera division campeonato nacional': 'primera division',
  'ligapro serie a': 'liga pro',
  'belgian pro league': 'jupiler pro league',
};

function tokens(s: string): string[] {
  return normalizeTeamName(s).split(' ').filter(Boolean);
}

function isSubset(small: string[], big: string[]): boolean {
  const set = new Set(big);
  return small.length > 0 && small.every((t) => set.has(t));
}

export interface CompetitionMatch {
  leagueId: string;
  /** Elegida automáticamente porque no había duda. `null` si hay que decidir. */
  chosen: ProviderCompetition | null;
  /** Por qué se eligió, o por qué no. */
  reason: 'exact' | 'hint' | 'subset' | 'only-league' | 'ambiguous' | 'none';
  /** Opciones razonables para que el usuario elija cuando `chosen` es null. */
  candidates: ProviderCompetition[];
}

export function matchCompetition(
  league: League,
  catalog: ProviderCompetition[],
): CompetitionMatch {
  const country = COUNTRY_ES_EN[normalizeTeamName(league.country)] ?? normalizeTeamName(league.country);

  // Las competiciones UEFA no cuelgan de un país: el proveedor las agrupa como "World"
  // o "Europe". Solo en ese caso se busca fuera de un país concreto.
  const isSupra = SUPRANATIONAL.has(country);
  const sameCountry = catalog.filter((c) => {
    const cc = normalizeTeamName(c.country);
    return isSupra ? SUPRANATIONAL.has(cc) : cc === country;
  });

  // Si el proveedor no cubre ese país, NO se busca en el resto del catálogo: acabaría
  // asignando la "Primera División" de otro país. Antes que adivinar, no se asigna nada.
  if (sameCountry.length === 0) {
    return { leagueId: league.id, chosen: null, reason: 'none', candidates: [] };
  }

  const pool = sameCountry;
  const leagueType = pool.filter((c) => normalizeTeamName(c.type) === 'league');
  const scope = leagueType.length > 0 ? leagueType : pool;

  const nameNorm = normalizeTeamName(league.name);
  const target = NAME_HINTS[nameNorm] ?? nameNorm;

  const exact = scope.filter((c) => normalizeTeamName(c.name) === nameNorm);
  if (exact.length === 1) return { leagueId: league.id, chosen: exact[0], reason: 'exact', candidates: exact };

  const hinted = scope.filter((c) => normalizeTeamName(c.name) === target);
  if (hinted.length === 1) return { leagueId: league.id, chosen: hinted[0], reason: 'hint', candidates: hinted };

  const t = tokens(target);
  const subset = scope.filter((c) => {
    const ct = tokens(c.name);
    return isSubset(t, ct) || isSubset(ct, t);
  });
  if (subset.length === 1) return { leagueId: league.id, chosen: subset[0], reason: 'subset', candidates: subset };

  // Un solo torneo de tipo liga en ese país: no hay con qué confundirlo.
  if (!isSupra && leagueType.length === 1) {
    return { leagueId: league.id, chosen: leagueType[0], reason: 'only-league', candidates: leagueType };
  }

  const candidates = (subset.length > 0 ? subset : scope).slice(0, 25);
  return {
    leagueId: league.id,
    chosen: null,
    reason: candidates.length > 0 ? 'ambiguous' : 'none',
    candidates,
  };
}

export function matchCompetitions(
  leagues: League[],
  catalog: ProviderCompetition[],
): CompetitionMatch[] {
  return leagues.map((l) => matchCompetition(l, catalog));
}
