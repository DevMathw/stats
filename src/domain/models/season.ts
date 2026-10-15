/**
 * Clave canónica de una temporada.
 *
 * Hoy `Match.season` no identifica nada: los 3.041 partidos guardados llevan una de dos etiquetas
 * (`2026/27` y `2026/27*`) y las dos dicen lo mismo, incluidas competiciones cuya temporada es el año
 * natural (Allsvenskan, Brasileirão) o un torneo Apertura/Clausura. El motivo está en
 * `syncEngine.ts`, que al guardar un partido escribe `season: league.season` y **descarta la temporada
 * que reportó la fuente**.
 *
 * Cada fuente además la escribe a su manera: `2026/2027` (FotMob europeo), `2026` (FotMob sudamericano),
 * `2026 - Clausura` (Colombia), `2026/27` (Bundesliga), `English Premier League Season 2026/2027`
 * (Pulselive). Aquí se normalizan todas a una sola forma, ordenable como texto:
 *
 *   - temporada a caballo entre dos años → `2026-27`
 *   - temporada de año natural           → `2026`
 *
 * **El torneo NO entra en la clave.** «Clausura» y «Championship Round» son FASES dentro de una
 * temporada, y en este modelo la fase ya vive en `Match.phase`. Meterla también en la temporada
 * duplicaría el concepto y partiría en dos la tabla de una liga que juega Apertura y Clausura el mismo
 * año. Por eso `parseSeasonLabel` devuelve las dos cosas por separado.
 */

export interface ParsedSeason {
  /** Clave canónica: `2026-27` o `2026`. `null` si la etiqueta no contiene ningún año reconocible. */
  key: string | null;
  /** Torneo o fase que venía dentro de la etiqueta («Clausura»), si lo traía. */
  phase: string | null;
  /** La etiqueta tal cual llegó, para poder rastrear de dónde salió la clave. */
  raw: string;
}

/** Un año de cuatro cifras entre 1900 y 2099: evita confundir un marcador o un id con un año. */
const ANIO = /\b(19\d{2}|20\d{2})\b/;

/**
 * `2026/2027`, `2026/27`, `2026-27` y `2026–27` (guion largo). El segundo grupo puede venir con dos o
 * cuatro cifras.
 */
const RANGO = /\b(19\d{2}|20\d{2})\s*[/‐-―-]\s*(\d{2}|\d{4})\b/;

/**
 * Trocea la etiqueta de una fuente en temporada canónica y fase.
 *
 * El asterisco de `2026/27*` se ignora: viene del libro original como marca de revisión, no forma parte
 * del nombre de la temporada.
 */
/**
 * Las etiquetas son nueve en los 26.937 partidos guardados, y el motor pregunta por la temporada de cada
 * partido en cada pasada: medido, 102 ms por pasada que se quedan en 29 con esta tabla. El resultado no lo
 * muta nadie, así que se comparte.
 */
const MEMO = new Map<string, ParsedSeason>();

export function parseSeasonLabel(label: string | null | undefined): ParsedSeason {
  const raw = String(label ?? '');
  const guardado = MEMO.get(raw);
  if (guardado) return guardado;
  const nuevo = analizar(raw);
  MEMO.set(raw, nuevo);
  return nuevo;
}

function analizar(raw: string): ParsedSeason {
  const limpio = raw.replace(/\*/g, ' ').trim();

  const rango = RANGO.exec(limpio);
  if (rango) {
    const inicio = Number(rango[1]);
    const fin = rango[2].length === 4 ? Number(rango[2]) : Math.floor(inicio / 100) * 100 + Number(rango[2]);
    // `2026/2025` o `2026/2030` no son una temporada: solo vale el año siguiente.
    if (fin === inicio + 1) return { key: `${inicio}-${String(fin).slice(2)}`, phase: faseDe(limpio, rango[0]), raw };
  }

  const suelto = ANIO.exec(limpio);
  if (suelto) return { key: suelto[1], phase: faseDe(limpio, suelto[0]), raw };

  return { key: null, phase: faseDe(limpio, ''), raw };
}

/**
 * Lo que queda de la etiqueta al quitarle la temporada, limpio de separadores y de las palabras de
 * relleno que usan las fuentes («Season», «Temporada»). Cadena vacía → `null`.
 */
function faseDe(limpio: string, temporada: string): string | null {
  const resto = (temporada ? limpio.replace(temporada, ' ') : limpio)
    .replace(/\b(season|temporada|saison|stagione|campeonato)\b/gi, ' ')
    .replace(/[‐-―-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return resto === '' ? null : resto;
}

/** Solo la clave canónica. `null` si la etiqueta no trae año. */
export const seasonKey = (label: string | null | undefined): string | null => parseSeasonLabel(label).key;

/**
 * Si dos etiquetas hablan de la misma temporada, comparando las claves canónicas.
 *
 * Es la comprobación que hace falta al pedir una temporada concreta a una fuente: medido el 21/09/2026,
 * FotMob responde **200 con la temporada actual** si la etiqueta pedida no es una de las suyas (pedirle
 * `2024/2025` a Colombia devuelve el Clausura 2026), y `laLigaSource(2024)` devuelve 2026/27. Sin esta
 * comprobación, esos partidos se guardarían con la etiqueta equivocada y sin ningún aviso.
 *
 * Una etiqueta sin año reconocible nunca se da por buena: es el caso en el que menos se puede confiar.
 */
export function sameSeason(pedida: string | null | undefined, devuelta: string | null | undefined): boolean {
  const a = seasonKey(pedida);
  const b = seasonKey(devuelta);
  return a !== null && b !== null && a === b;
}

/**
 * Orden natural de dos claves canónicas: `2024` < `2024-25` < `2025`.
 *
 * Comparar el texto tal cual ya casi acierta, salvo que `2024-25` quedaría antes que `2024` por ser más
 * larga con el mismo prefijo; una temporada a caballo empieza en el mismo año pero se juega después.
 */
export function compareSeasons(a: string, b: string): number {
  const anio = (s: string) => Number(s.slice(0, 4));
  return anio(a) - anio(b) || a.length - b.length || a.localeCompare(b);
}
