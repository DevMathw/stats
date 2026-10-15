/**
 * Genera `src/data/teamCatalog.ts`: el catálogo global de equipos a partir de las plantillas
 * de ESPN de las competiciones del registro que ESPN tiene.
 *
 *   npm run catalog
 *
 * El id de ESPN es la identidad del equipo: el mismo club tiene el mismo id en todas sus
 * competiciones (Real Madrid = 86 en LaLiga y en Champions). Se genera una vez y se guarda en
 * el repositorio para que la identificación funcione sin red, sea reproducible en los tests y
 * cualquier cambio se vea en un diff. Se regenera al empezar temporada (ascensos y descensos).
 *
 * El país NO sale de ESPN: su `slug` no es fiable como país (Atlético Bucaramanga es
 * `betbrain.bucaramanga`, ABB es `abb`). Sale de la liga doméstica en la que juega; los
 * clubes que solo aparecen en competiciones UEFA quedan con país `null`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';

/** [slug de ESPN, país tal como lo escribe la hoja LIGAS]. Las UEFA van al final. */
const COMPETICIONES = [
  ['eng.1', 'Inglaterra'],
  ['eng.2', 'Inglaterra'],
  ['esp.1', 'Espana'],
  ['ita.1', 'Italia'],
  ['ger.1', 'Alemania'],
  ['fra.1', 'Francia'],
  ['ned.1', 'Paises Bajos'],
  ['por.1', 'Portugal'],
  ['den.1', 'Dinamarca'],
  ['bel.1', 'Belgica'],
  ['tur.1', 'Turquia'],
  ['bra.1', 'Brasil'],
  ['arg.1', 'Argentina'],
  ['col.1', 'Colombia'],
  ['chi.1', 'Chile'],
  ['par.1', 'Paraguay'],
  ['uru.1', 'Uruguay'],
  ['bol.1', 'Bolivia'],
  ['ecu.1', 'Ecuador'],
  ['ven.1', 'Venezuela'],
  ['aut.1', 'Austria'],
  ['gre.1', 'Grecia'],
  ['nor.1', 'Noruega'],
  // La Ekstraklasa no está en ESPN (404 y ninguna liga polaca en su listado, 15/09/2026): sus clubes quedan sin
  // identidad global. Sus estadísticas se piden igual, por el id de FotMob de cada partido.
  ['sco.1', 'Escocia'],
  ['sui.1', 'Suiza'],
  ['swe.1', 'Suecia'],
  ['mex.1', 'Mexico'],
  ['usa.1', 'Estados Unidos'],
  ['uefa.champions', null],
  ['uefa.europa', null],
  ['uefa.europa.conf', null],
];

/**
 * Clubes que jugaron una competición en las temporadas que la aplicación guarda pero ya NO están en su
 * plantilla de hoy (descendidos, o el mismo club con otro nombre).
 *
 * Hacen falta porque `/teams` devuelve siempre la plantilla actual —`?season=2025` la ignora, medido el
 * 26/09/2026— y sin ellos los equipos de los históricos se quedan sin identidad: ni escudo, ni nombre
 * oficial, ni posibilidad de asignarlos a mano en Configuración → Equipos, porque la lista de candidatos
 * es justo esta plantilla.
 *
 * Cada id NO se elige a ojo: sale del propio marcador histórico de ESPN de esa competición, que para el
 * partido en cuestión devuelve el id del club. Se anota la fecha consultada para poder repetirlo.
 */
const HISTORICOS = [
  // col.1, temporada 2025. `scoreboard?dates=20250128` → «4928:Fortaleza CEIF vs 5481:Envigado FC».
  ['col.1', '5481'],
  // col.1, temporada 2025. `scoreboard?dates=20250203` → «7915:Llaneros FC vs 17374:Unión Magdalena».
  ['col.1', '17374'],
];

const equipos = new Map();
const recuento = {};
/** Cuántos clubes se añadieron por competición fuera de su plantilla actual. */
const historicos = {};

/** Añade un equipo de ESPN al catálogo, acumulando sus nombres y sus competiciones. */
function acumular(t, slug, pais) {
  const e = equipos.get(t.id) ?? {
    espnId: t.id,
    name: t.displayName,
    shortName: t.shortDisplayName ?? t.displayName,
    abbreviation: t.abbreviation ?? '',
    country: null,
    names: [],
    competitions: [],
  };
  for (const n of [t.displayName, t.shortDisplayName, t.name, t.location]) {
    if (n && !e.names.includes(n)) e.names.push(n);
  }
  if (!e.competitions.includes(slug)) e.competitions.push(slug);
  if (pais && !e.country) e.country = pais;
  equipos.set(t.id, e);
}

const paisDe = new Map(COMPETICIONES);

for (const [slug, pais] of COMPETICIONES) {
  const res = await fetch(`${BASE}/${slug}/teams`);
  if (!res.ok) throw new Error(`${slug}: ESPN respondió ${res.status}`);
  const lista = (await res.json()).sports?.[0]?.leagues?.[0]?.teams ?? [];
  // Una plantilla vacía casi seguro es un fallo de ESPN, no una liga sin equipos: se aborta
  // antes que escribir un catálogo al que le falta una competición entera.
  if (lista.length === 0) throw new Error(`${slug}: ESPN devolvió la plantilla vacía`);
  recuento[slug] = lista.length;

  for (const { team: t } of lista) acumular(t, slug, pais);
}

for (const [slug, id] of HISTORICOS) {
  if ([...equipos.values()].some((e) => e.espnId === id && e.competitions.includes(slug))) continue;
  const res = await fetch(`${BASE}/${slug}/teams/${id}`);
  if (!res.ok) throw new Error(`${slug}/${id}: ESPN respondió ${res.status}`);
  const t = (await res.json()).team;
  if (!t?.id) throw new Error(`${slug}/${id}: ESPN no devolvió el equipo`);
  acumular(t, slug, paisDe.get(slug) ?? null);
  historicos[slug] = (historicos[slug] ?? 0) + 1;
}

// Orden estable por id: regenerar sin cambios en ESPN produce el mismo archivo.
const teams = [...equipos.values()].sort((a, b) => Number(a.espnId) - Number(b.espnId));

const fecha = new Date().toISOString().slice(0, 10);
const salida = `// GENERADO por scripts/buildTeamCatalog.mjs el ${fecha}. No editar a mano: \`npm run catalog\`.
import type { CatalogTeam } from '../domain/models/teamCatalog.ts';

export const CATALOG_GENERATED_AT = '${fecha}';

/** Equipos por competición en el momento de generar. */
export const CATALOG_COUNTS: Record<string, number> = ${JSON.stringify(recuento, null, 2)};

/** Clubes añadidos por competición que ya no están en su plantilla actual, pero sí en los históricos. */
export const CATALOG_HISTORICAL_COUNTS: Record<string, number> = ${JSON.stringify(historicos, null, 2)};

export const TEAM_CATALOG: CatalogTeam[] = ${JSON.stringify(teams, null, 2)};
`;

mkdirSync('src/data', { recursive: true });
writeFileSync('src/data/teamCatalog.ts', salida);

const multi = teams.filter((t) => t.competitions.length > 1).length;
const suma = (o) => Object.values(o).reduce((a, b) => a + b, 0);
console.log(
  `${teams.length} equipos únicos · ${suma(recuento)} plazas en ${COMPETICIONES.length} competiciones ` +
    `(+${suma(historicos)} de históricos) · ${multi} juegan más de una · ` +
    `${teams.filter((t) => !t.country).length} sin país (solo UEFA)`,
);
