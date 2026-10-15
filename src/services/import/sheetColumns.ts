/**
 * Localiza las columnas de una hoja por el TEXTO de su cabecera, no por su posición.
 *
 * El importador original traía los índices escritos a mano (`liga: 0, fecha: 3, jornada: 4…`). Funciona
 * mientras todos los libros salgan de la misma plantilla —medido el 24/09/2026, los 15 archivos de
 * `data_statistics/` comparten una única firma de 51 columnas—, pero basta con que alguien inserte una
 * columna para que todo se desplace una posición y los córners entren como tarjetas, en silencio y sin
 * que nada falle.
 *
 * Aquí la cabecera manda. La comparación es tolerante porque las cabeceras humanas varían:
 *
 *   «Tiros a Puerta Local», «tiros a puerta local», «Tiros a puerta  LOCAL», «Tiros a Puerta (Local)»
 *
 * se normalizan todas a `tirosapuertalocal`. Se quitan acentos, mayúsculas, signos y espacios, así que
 * también valen «Posesión» y «Posesion», o «Fuera de Juego» y «Fuera-de-juego».
 *
 * Lo que NO hace: adivinar. Una columna que no aparece se queda sin índice y el importador la trata como
 * dato ausente (`null`), que es la regla de toda la aplicación. Nunca se rellena con la columna de al lado
 * ni con un cero.
 */

/** Sin acentos, sin mayúsculas y sin nada que no sea letra o número. */
export function normalizeHeader(v: unknown): string {
  return String(v ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Índice de cada campo en la fila de cabecera.
 *
 * Cada campo declara sus sinónimos aceptados, en orden de preferencia. El primero que aparezca en la hoja
 * gana, así que un libro que traiga a la vez «Goles Local» y «GF Local» usa el primero de la lista.
 */
export type ColumnMap<K extends string> = Partial<Record<K, number>>;

export interface ColumnReport<K extends string> {
  map: ColumnMap<K>;
  /** Campos declarados que la hoja no trae. El importador los dará por ausentes. */
  missing: K[];
  /** Cabeceras de la hoja que no corresponden a ningún campo conocido. Solo informativo. */
  unknown: string[];
}

/**
 * Empareja los campos pedidos con la fila de cabecera.
 *
 * `aliases` es `campo -> nombres aceptados`. La primera columna cuya cabecera normalizada coincida con
 * alguno de los alias se queda con el campo; una segunda columna con el mismo nombre se ignora (un libro
 * con «Goles Local» repetido usa la primera, que es lo que hace también una hoja de cálculo).
 */
export function mapColumns<K extends string>(header: unknown[], aliases: Record<K, readonly string[]>): ColumnReport<K> {
  const normalizadas = header.map(normalizeHeader);
  const map: ColumnMap<K> = {};
  const usadas = new Set<number>();

  for (const campo of Object.keys(aliases) as K[]) {
    for (const alias of aliases[campo]) {
      const objetivo = normalizeHeader(alias);
      const i = normalizadas.findIndex((h, idx) => h === objetivo && !usadas.has(idx));
      if (i >= 0) {
        map[campo] = i;
        usadas.add(i);
        break;
      }
    }
  }

  const conocidas = new Set(
    (Object.values(aliases) as readonly string[][]).flat().map(normalizeHeader),
  );
  return {
    map,
    missing: (Object.keys(aliases) as K[]).filter((k) => map[k] === undefined),
    unknown: normalizadas
      .map((h, i) => ({ h, original: String(header[i] ?? '').trim() }))
      .filter(({ h }) => h !== '' && !conocidas.has(h))
      .map(({ original }) => original),
  };
}

/** Valor de un campo en una fila; `undefined` si la hoja no trae esa columna. */
export const cell = <K extends string>(row: unknown[], map: ColumnMap<K>, campo: K): unknown => {
  const i = map[campo];
  return i === undefined ? null : row[i];
};
