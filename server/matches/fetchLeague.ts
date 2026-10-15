/**
 * Consulta las fuentes de una liga en orden de prioridad y se queda con la primera que sirve.
 *
 * Fuente oficial primero; después las secundarias autorizadas, en su orden estricto. Cada intento
 * queda registrado, haya servido o no, para que el log diga de dónde salió cada dato.
 */
import { SourceError, type MatchSource, type SourceMatch } from './types.ts';

export interface Attempt {
  source: string;
  url: string | null;
  secondary: boolean;
  ok: boolean;
  /** Motivo del fallo, en lenguaje llano. */
  error: string | null;
}

export interface LeagueFetch {
  source: string;
  url: string;
  secondary: boolean;
  season: string;
  matches: SourceMatch[];
  notes: string[];
  attempts: Attempt[];
}

export class AllSourcesFailed extends Error {
  readonly attempts: Attempt[];

  constructor(attempts: Attempt[]) {
    super('Ninguna fuente devolvió partidos utilizables');
    this.name = 'AllSourcesFailed';
    this.attempts = attempts;
  }
}

/**
 * ¿Es la misma temporada? Se comparan los años: «2026/27», «2026/2027» y «2026-27» son la misma;
 * en Sudamérica «2026» y «2026 - Clausura» encajan con «2026/27», que es como la etiqueta el libro.
 */
export function sameSeason(expected: string, actual: string): boolean {
  const anios = (s: string) =>
    (s.match(/\d{4}|(?<=[/-])\d{2}\b/g) ?? []).map((y) => (y.length === 2 ? 2000 + Number(y) : Number(y)));
  const a = anios(expected);
  const b = anios(actual);
  if (a.length === 0) return true; // la liga no guarda años: no hay nada con qué comparar
  if (b.length === 0) return false; // la fuente no dice su temporada: no se puede verificar
  return a[0] === b[0] && (a.length < 2 || b.length < 2 || a[1] === b[1]);
}

export async function fetchLeague(sources: MatchSource[], expectedSeason: string): Promise<LeagueFetch> {
  const attempts: Attempt[] = [];
  for (const fuente of sources) {
    try {
      const r = await fuente.fetch();
      if (!sameSeason(expectedSeason, r.season)) {
        throw new SourceError(`publica la temporada «${r.season}», no la ${expectedSeason}`, r.url);
      }
      if (r.matches.length === 0) throw new SourceError('no devolvió ningún partido', r.url);
      attempts.push({ source: fuente.name, url: r.url, secondary: fuente.secondary, ok: true, error: null });
      return {
        source: fuente.name,
        url: r.url,
        secondary: fuente.secondary,
        season: r.season,
        matches: r.matches,
        notes: r.notes,
        attempts,
      };
    } catch (e) {
      attempts.push({
        source: fuente.name,
        url: e instanceof SourceError ? e.url : null,
        secondary: fuente.secondary,
        ok: false,
        error: (e as Error).message,
      });
    }
  }
  throw new AllSourcesFailed(attempts);
}
