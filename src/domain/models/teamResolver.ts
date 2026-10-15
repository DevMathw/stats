/**
 * Reconciliación de nombres de equipo entre fuentes.
 *
 * El Excel dice "Manchester City" y el proveedor puede decir "Manchester City FC". Si no se
 * reconcilian, el mismo equipo entra dos veces y la liga acaba con 40 fichas en vez de 20.
 *
 * Política: se reconoce lo que es inequívoco y **lo dudoso se deja sin resolver** para que el
 * usuario lo mapee a mano. Nunca se adivina un equipo.
 */

/**
 * Letras que NFD no descompone. Sin este paso se convertían en espacios: «Kasımpaşa» quedaba
 * «kas mpasa» y «F.C. København» quedaba «f c k benhavn», así que nunca casaban con la
 * grafía sin tilde de otra fuente.
 */
const SIN_DESCOMPOSICION: Record<string, string> = {
  ı: 'i',
  ø: 'o',
  æ: 'ae',
  œ: 'oe',
  ß: 'ss',
  ł: 'l',
  đ: 'd',
  ð: 'd',
  þ: 'th',
};

/** minúsculas, sin acentos, sin puntuación, espacios colapsados. */
export function normalizeTeamName(name: string): string {
  return (
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // marcas combinantes: acentos, diéresis, cedilla…
      .toLowerCase()
      .replace(/[ıøæœßłđðþ]/g, (c) => SIN_DESCOMPOSICION[c])
      // El punto se QUITA, no se cambia por espacio: «F.C.» tiene que quedar «fc», como «FC».
      .replace(/\./g, '')
      .replace(/['`’\-_/]/g, ' ')
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function tokens(name: string): string[] {
  return normalizeTeamName(name).split(' ').filter(Boolean);
}

function isSubset(small: string[], big: string[]): boolean {
  const set = new Set(big);
  return small.length > 0 && small.every((t) => set.has(t));
}

export interface TeamResolution {
  /** Nombre canónico (el que ya usa la app) o `null` si no se pudo resolver sin adivinar. */
  resolved: string | null;
  reason: 'alias' | 'exact' | 'normalized' | 'subset' | 'new' | 'ambiguous' | 'unknown';
}

/**
 * @param incoming   nombre tal como lo da el proveedor
 * @param known      nombres que ya existen en esa liga
 * @param aliases    mapa `nombre del proveedor (normalizado)` → `nombre canónico`
 *
 * Si la liga aún no tiene equipos (competición nueva) se acepta el nombre entrante tal cual:
 * no hay nada con lo que confundirlo.
 */
export function resolveTeamName(
  incoming: string,
  known: string[],
  aliases: Record<string, string> = {},
): TeamResolution {
  const alias = aliases[normalizeTeamName(incoming)];
  if (alias) return { resolved: alias, reason: 'alias' };

  if (known.length === 0) return { resolved: incoming, reason: 'new' };
  if (known.includes(incoming)) return { resolved: incoming, reason: 'exact' };

  const norm = normalizeTeamName(incoming);
  const exactNorm = known.filter((k) => normalizeTeamName(k) === norm);
  if (exactNorm.length === 1) return { resolved: exactNorm[0], reason: 'normalized' };
  if (exactNorm.length > 1) return { resolved: null, reason: 'ambiguous' };

  // Uno contiene todas las palabras del otro ("Manchester City" ⊂ "Manchester City FC").
  // Se exige además que la PRIMERA palabra coincida, para no confundir "Milan" con
  // "Inter Milan", y que la coincidencia sea única.
  const inc = tokens(incoming);
  const candidates = known.filter((k) => {
    const kt = tokens(k);
    if (inc[0] !== kt[0]) return false;
    return isSubset(inc, kt) || isSubset(kt, inc);
  });
  if (candidates.length === 1) return { resolved: candidates[0], reason: 'subset' };
  if (candidates.length > 1) return { resolved: null, reason: 'ambiguous' };

  return { resolved: null, reason: 'unknown' };
}
