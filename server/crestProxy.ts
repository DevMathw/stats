/**
 * Caché local de escudos oficiales.
 *
 * El navegador nunca pide un escudo al CDN oficial: pide `/api/crest`, y el servidor descarga
 * cada escudo UNA vez, lo guarda en disco y lo sirve desde ahí. Dos motivos medidos:
 *
 *  - Los CDN oficiales cortan el acceso tras muchas peticiones seguidas: `img.uefa.com` y
 *    `www.uefa.com` dejaron de responder a esta máquina después de una ronda de pruebas.
 *  - Una tabla con cientos de filas pediría cientos de escudos a la vez.
 *
 * Solo se sirven dominios oficiales de la lista: no es un proxy abierto. Y un escudo que falla
 * no se vuelve a pedir durante un rato, para no insistir contra un CDN que ya ha cortado.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Orígenes de escudos: dominio y ruta. La ruta importa en los dominios compartidos: el S3 de
 * Ligue 1 aloja otros buckets que no son suyos. Cada fuente nueva añade el suyo aquí.
 */
export const CREST_HOSTS = [
  'img.uefa.com/',
  'resources.premierleague.com/',
  'assets.laliga.com/',
  'media-sdp.legaseriea.it/',
  'www.bundesliga.com/assets/clublogo/',
  's3.eu-west-1.amazonaws.com/image.mpg/', // bucket de Ligue 1: no todos sus escudos cuelgan de assets/clubs
  'eredivisie.b-cdn.net/production/clubs/',
  'www.ligaportugal.pt/backoffice/assets/',
  'statics-maker.llt-services.com/prl/images/',
  'dimayor.com.co/wp-content/uploads/',
  'statics-maker.llt-services.com/apf/images/',
  'www.auf.org.uy/imagenes/img_contenido/club_club/',
  'ligafutve.org/wp-content/uploads/',
  'www.anfp.cl/wp-content/uploads/',
  'fbf.com.bo/wp-content/uploads/',
  // Secundaria autorizada, solo para ligas cuya web oficial no deja leer los escudos.
  'images.fotmob.com/image_resources/logo/teamlogo/',
];

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';
/** El escudo oficial más pesado medido (San Lorenzo, en la web de la APF) ronda 1,1 MB. */
const MAX_BYTES = 2_000_000;
/** Tras un fallo, no se reintenta ese escudo hasta pasado este tiempo. */
export const RETRY_AFTER_MS = 10 * 60_000;

/**
 * La URL, si es https y empieza por un origen de la lista. Si no, `null`. Se compara la ruta ya
 * normalizada por `URL` (sin `..`), que es la que se descarga.
 */
export function isAllowedCrestUrl(raw: string): URL | null {
  try {
    const u = new URL(raw);
    const destino = `${u.hostname}${u.pathname}`;
    return u.protocol === 'https:' && CREST_HOSTS.some((p) => destino.startsWith(p)) ? u : null;
  } catch {
    return null;
  }
}

export interface Crest {
  body: Buffer;
  type: string;
}

export function createCrestCache(dir: string, now: () => number = Date.now) {
  const fallos = new Map<string, number>();

  return async function obtener(raw: string): Promise<Crest | null> {
    const u = isAllowedCrestUrl(raw);
    if (!u) return null;

    const archivo = join(dir, createHash('sha1').update(u.href).digest('hex'));
    try {
      return { body: await readFile(archivo), type: (await readFile(`${archivo}.type`, 'utf8')).trim() };
    } catch {
      // no está en caché: se descarga
    }

    const ultimoFallo = fallos.get(u.href);
    if (ultimoFallo !== undefined && now() - ultimoFallo < RETRY_AFTER_MS) return null;

    try {
      const res = await fetch(u, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10_000) });
      const type = res.headers.get('content-type') ?? '';
      if (!res.ok || !type.startsWith('image/')) throw new Error(`respuesta ${res.status} ${type}`);
      const body = Buffer.from(await res.arrayBuffer());
      if (body.length === 0 || body.length > MAX_BYTES) throw new Error(`tamaño ${body.length}`);
      await mkdir(dir, { recursive: true });
      await writeFile(archivo, body);
      await writeFile(`${archivo}.type`, type);
      fallos.delete(u.href);
      return { body, type };
    } catch {
      fallos.set(u.href, now());
      return null;
    }
  };
}
