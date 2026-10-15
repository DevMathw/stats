/**
 * Peticiones a las fuentes, con reintento.
 *
 * Se reintenta lo que puede ser pasajero (sin respuesta, error 5xx) y no lo que es una negativa
 * de la fuente (403, 404): insistir contra un bloqueo solo empeora el bloqueo.
 */
import { SourceError } from './types.ts';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';

export interface GetOptions {
  headers?: Record<string, string>;
  /** Codificación del texto. La TFF, por ejemplo, sirve `windows-1254`. */
  charset?: string;
  /** Reintentos tras un fallo pasajero. Por defecto 1. */
  retries?: number;
  timeoutMs?: number;
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function getText(url: string, opts: GetOptions = {}): Promise<string> {
  const intentos = (opts.retries ?? 1) + 1;
  let ultimo: SourceError = new SourceError('sin respuesta', url);

  for (let i = 0; i < intentos; i++) {
    if (i > 0) await esperar(1500 * i);
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { 'User-Agent': UA, ...opts.headers },
        redirect: 'follow',
        signal: AbortSignal.timeout(opts.timeoutMs ?? 20_000),
      });
    } catch (e) {
      const causa = (e as { cause?: { code?: string } }).cause?.code ?? (e as Error).name;
      ultimo = new SourceError(`sin respuesta (${causa})`, url);
      continue;
    }
    if (res.status >= 500) {
      ultimo = new SourceError(`respondió ${res.status}`, url);
      continue;
    }
    if (!res.ok) throw new SourceError(`respondió ${res.status}`, url);
    return new TextDecoder(opts.charset ?? 'utf-8').decode(await res.arrayBuffer());
  }
  throw ultimo;
}

export async function getJson<T>(url: string, opts: GetOptions = {}): Promise<T> {
  const texto = await getText(url, { ...opts, headers: { Accept: 'application/json', ...opts.headers } });
  try {
    return JSON.parse(texto) as T;
  } catch {
    throw new SourceError('no devolvió JSON', url);
  }
}

/** Pausa entre peticiones seguidas a la misma fuente, para no disparar sus límites. */
export const pausa = () => esperar(250);
