/**
 * Catálogo de clave interna de equipos.
 *
 * El id de ESPN solo sirve para reconocer que el mismo club juega en varias competiciones
 * (Real Madrid = 86 en LaLiga y en Champions). **No se muestra nunca**: el nombre y el escudo
 * visibles salen de la fuente oficial de cada liga.
 *
 * Lo genera `scripts/buildTeamCatalog.mjs` en `src/data/teamCatalog.ts`.
 */
export interface CatalogTeam {
  espnId: string;
  /** Nombre en ESPN. Solo para emparejar; nunca se muestra. */
  name: string;
  shortName: string;
  abbreviation: string;
  /** País de su liga doméstica, con la grafía de la hoja LIGAS. `null` si solo juega en UEFA. */
  country: string | null;
  /** Todas las variantes de nombre que publica ESPN, para emparejar. */
  names: string[];
  /** Slugs de ESPN de las competiciones en las que aparece. */
  competitions: string[];
}
