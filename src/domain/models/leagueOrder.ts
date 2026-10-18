/**
 * El orden en el que se enseñan las competiciones, siempre el mismo en toda la aplicación.
 *
 * No es alfabético ni por número de partidos: es el orden con el que se trabaja, de las cinco grandes
 * europeas hacia abajo, después las copas UEFA y por último América. Alfabéticamente, «Allsvenskan» y
 * «Belgian Pro League» abrían la lista por delante de la Premier, y había que buscar.
 *
 * Las claves son los NOMBRES tal y como llegan de la base (`League.name`, que hoy coincide con `League.id`),
 * no los del registro de fuentes de `server/matches/registry.ts`, que los escribe distinto: allí la danesa
 * es «Superliga Dinamarca» y la portuguesa «Liga Portugal», y emparejarlo con eso dejaría dos competiciones
 * fuera del orden sin que nada avisara.
 *
 * Una competición que no esté aquí no es un error: va al final, ordenada por nombre, y se sigue viendo.
 */
const ORDEN = [
  // Las cinco grandes
  'Premier League',
  'LaLiga',
  'Serie A',
  'Bundesliga',
  'Ligue 1',
  // Resto de Europa
  'Eredivisie',
  'Liga Portugal (Primeira Liga)',
  'Superliga',
  'Belgian Pro League',
  'Super Lig',
  'EFL Championship',
  'Bundesliga Austria',
  'Super League Grecia',
  'Eliteserien',
  'Ekstraklasa',
  'Allsvenskan',
  'Scottish Premiership',
  'Super League Suiza',
  // Competiciones continentales de clubes
  'UEFA Champions League',
  'UEFA Europa League',
  'UEFA Conference League',
  // América
  'Brasileirao Serie A',
  'Primera Division (Liga Profesional)',
  'Primera A (Liga BetPlay Dimayor)',
  'Primera Division (Campeonato Nacional)',
  'Primera Division (Paraguay)',
  'Primera Division (Uruguay)',
  'Liga FUTVE',
  'Division Profesional',
  'LigaPro Serie A',
  'Liga MX',
  'MLS',
];

/** nombre → posición. Se construye una vez: la comparación se llama por cada par al ordenar. */
const POSICION = new Map(ORDEN.map((nombre, i) => [nombre, i]));

/** La posición de una competición, o el final de la lista si no está en el orden. */
const posicionDe = (l: { id: string; name?: string }) => POSICION.get(l.name ?? l.id) ?? POSICION.get(l.id) ?? ORDEN.length;

/**
 * Compara dos competiciones por el orden de arriba. Las que no estén, al final y entre ellas por nombre.
 *
 * Sirve para `Array.prototype.sort`, así que no se puede devolver `undefined` en ningún camino.
 */
export function compareLeagues<T extends { id: string; name?: string }>(a: T, b: T): number {
  const pa = posicionDe(a);
  const pb = posicionDe(b);
  if (pa !== pb) return pa - pb;
  return (a.name ?? a.id).localeCompare(b.name ?? b.id, 'es');
}

/** Copia ordenada: no toca el array que recibe, que puede venir del almacén. */
export const sortLeagues = <T extends { id: string; name?: string }>(leagues: T[]): T[] => [...leagues].sort(compareLeagues);

/** Solo para la prueba: comprobar que el orden no tiene repetidos ni se ha quedado corto. */
export const ORDEN_COMPETICIONES: readonly string[] = ORDEN;
