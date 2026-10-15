/**
 * La API local de la aplicacion: `/api/store`, `/api/betting`, las fuentes oficiales, los escudos y el
 * Excel de cada liga.
 *
 * Vive aqui y no en `vite.config.ts` porque la monta tambien el servidor de produccion
 * (`server/produccion.ts`). Es EL MISMO codigo en los tres sitios --desarrollo, `vite preview` y el
 * contenedor desplegado--, que es la unica forma de que lo que funciona en casa funcione desplegado.
 */

import { createCrestCache, isAllowedCrestUrl } from './crestProxy.ts';
import { AllSourcesFailed, fetchLeague } from './matches/fetchLeague.ts';
import { LEAGUES, leagueBySlug, leagueList, sourcesFor } from './matches/registry.ts';
import { writeLeagueExcel, type LeagueExcelPayload } from './leagueExcel.ts';
import { fetchMatchStats, type ListCache, type MatchStatsRequest } from './matches/matchStats.ts';
import { fetchMomentum, type MomentumRequest } from './matches/momentum.ts';
import { handleFootballDataKeyRequest, handleStoreRequest, openStore, type Respuesta } from './storage/appStore.ts';
import { handleBettingRequest } from './storage/bettingStore.ts';
import { mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { dirname, join } from 'node:path';
import { DatabaseSync as AbrirBase, type DatabaseSync } from 'node:sqlite';
import { gzipSync } from 'node:zlib';

/**
 * Lo único que se necesita de un servidor para montar la API: poder registrar middlewares y avisar
 * cuando se cierra, para soltar la base de datos.
 *
 * Es la forma de `connect`, que es lo que usa Vite, pero escrito aquí para no atar este módulo a Vite:
 * `server/produccion.ts` trae su propia implementación de doce líneas y no instala nada.
 */
export interface Middlewares {
  use(ruta: string, manejador: (req: IncomingMessage, res: ServerResponse) => void): unknown;
}
type CerrableServer = { on(evento: 'close', cb: () => void): unknown } | null;

/**
 * Donde viven los datos.
 *
 * En casa, la carpeta `data/` del proyecto: lo de siempre, sin tocar nada. En el contenedor, el volumen
 * que se monta en `DATOS_DIR`, porque el sistema de ficheros de la imagen se borra entero en cada
 * despliegue y la base se perderia con el.
 *
 * Los escudos van aparte: en casa se quedan en `node_modules/.cache/`, que es desechable y no ensucia
 * `data/`; desplegado van al volumen para no volver a descargarlos en cada despliegue.
 */
const DATOS = process.env.DATOS_DIR ?? join(process.cwd(), 'data');
export const RUTA_BASE = join(DATOS, 'analisis-futbol.sqlite');
const RUTA_LIGAS = join(DATOS, 'ligas');
const RUTA_ESCUDOS = process.env.CACHE_ESCUDOS ?? join(process.cwd(), 'node_modules', '.cache', 'crests');

/** Calendarios de las fuentes, reutilizados entre consultas de estadísticas de la misma competición. */
const calendarios: ListCache = new Map();

/** Base de datos local (`data/analisis-futbol.sqlite`), abierta la primera vez que se usa. La comparten las rutas y el proxy. */
let almacen: DatabaseSync | null = null;
export const baseDeDatos = () => (almacen ??= openStore(RUTA_BASE));

/**
 * Respuesta JSON, comprimida cuando compensa.
 *
 * `/api/store` son 28,7 MB de JSON con la base llena (26.937 partidos, 14/10/2026) y viajaban en crudo:
 * medido, el panel del navegador tardaba ~40 s y llegaba a dar 408. Con gzip nivel 1 bajan a **3,2 MB en
 * 207 ms** de CPU; el nivel 6 llega a 2,1 MB pero cuesta 947 ms, y para un servidor en la propia maquina
 * el nivel 1 es el cambio bueno.
 *
 * Solo se comprime si el cliente lo acepta y si el cuerpo pasa de 64 kB: por debajo, comprimir cuesta mas
 * que enviar. `req` es opcional para no tocar las quince llamadas que devuelven respuestas pequenas.
 */
const MINIMO_PARA_COMPRIMIR = 64 * 1024;

function json(res: ServerResponse, status: number, body: unknown, req?: IncomingMessage, yaSerializado?: string) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  const texto = yaSerializado ?? JSON.stringify(body);
  const acepta = (req?.headers['accept-encoding'] ?? '').includes('gzip');
  if (!acepta || texto.length < MINIMO_PARA_COMPRIMIR) return res.end(texto);
  const comprimido = gzipSync(texto, { level: 1 });
  res.setHeader('content-encoding', 'gzip');
  // `Vary` para que ninguna cache sirva la version comprimida a un cliente que no la acepta.
  res.setHeader('vary', 'accept-encoding');
  res.end(comprimido);
}

/**
 * Cuerpo JSON. Se acumulan BUFFERS y se decodifica al final: concatenar texto con `+=` rompe los
 * caracteres multibyte que caen entre dos chunks («Atlético» llegaba como «Atl<?>tico»).
 * `null` si no es JSON o se pasa del límite.
 */
function readJson<T>(req: IncomingMessage, limit: number): Promise<T | null> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        req.destroy();
        return resolve(null);
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')) as T);
      } catch {
        resolve(null);
      }
    });
  });
}

/**
 * API local de la app, en el servidor de Vite: un navegador no puede leer otras webs (CORS lo impide), así
 * que las consultas a las fuentes las hace Node.
 *
 * Se monta igual en desarrollo y en `vite preview`. Antes vivía solo en `configureServer`, que es exclusivo
 * de desarrollo: con `vite preview` la aplicación arrancaba sin `/api/store` y, por tanto, sin datos, así
 * que no había forma de probar la compilación de producción contra la base real.
 */
export function montarApi(middlewares: Middlewares, httpServer: CerrableServer) {
  /**
   * «Actualizar partidos». GET: las 23 competiciones del registro. POST `{ slug, season }`: los
   * partidos de UNA, de su web oficial o, si no sirve, de las secundarias autorizadas, con
   * todos los intentos. Ver `server/matches/`.
   */
  middlewares.use('/api/official-matches', async (req, res) => {
    if (req.method === 'GET') return json(res, 200, leagueList());
    if (req.method !== 'POST') return json(res, 405, { error: 'Usa GET o POST.' });
    const body = await readJson<{ slug?: string; season?: string }>(req, 10_000);
    const entry = body?.slug ? leagueBySlug(body.slug) : undefined;
    if (!entry || !body?.season) return json(res, 400, { error: 'Competición sin fuente configurada.' });
    try {
      const r = await fetchLeague(sourcesFor(entry), body.season);
      json(res, 200, { league: { name: entry.name, file: entry.file, officialUrl: entry.officialUrl }, ...r });
    } catch (e) {
      const attempts = e instanceof AllSourcesFailed ? e.attempts : [];
      json(res, 502, { error: (e as Error).message, file: entry.file, attempts });
    }
  });

  /**
   * Estadísticas de UN partido desde la fuente de su liga: la oficial y, si no las publica, las
   * secundarias autorizadas en su orden. Ver `server/matches/matchStats.ts`.
   */
  middlewares.use('/api/match-stats', async (req, res) => {
    if (req.method !== 'POST') return json(res, 405, { error: 'Usa POST.' });
    const body = await readJson<MatchStatsRequest>(req, 50_000);
    const entry = body?.slug ? leagueBySlug(body.slug) : undefined;
    if (
      !body ||
      !entry ||
      typeof body.season !== 'string' ||
      typeof body.date !== 'string' ||
      !Number.isInteger(body.round) ||
      typeof body.homeGoals !== 'number' ||
      typeof body.awayGoals !== 'number'
    ) {
      return json(res, 400, { error: 'Hacen falta la competición, la jornada, la fecha y el marcador.' });
    }
    json(res, 200, await fetchMatchStats(sourcesFor(entry), body, calendarios));
  });

  /**
   * Momentum de UN partido: la cronología (tiros con minuto y xG, goles, tarjetas) de la fuente de su
   * liga, convertida en curva por `server/matches/momentum.ts`. Vale para un partido en juego, y por eso
   * el marcador es opcional: sin él, el partido se localiza por sus dos equipos y la fecha.
   */
  middlewares.use('/api/match-momentum', async (req, res) => {
    if (req.method !== 'POST') return json(res, 405, { error: 'Usa POST.' });
    const body = await readJson<MomentumRequest>(req, 50_000);
    const entry = body?.slug ? leagueBySlug(body.slug) : undefined;
    if (!body || !entry || typeof body.season !== 'string' || typeof body.date !== 'string') {
      return json(res, 400, { error: 'Hacen falta la competición, la temporada y la fecha.' });
    }
    json(res, 200, await fetchMomentum(sourcesFor(entry), body, calendarios));
  });

  /** Guarda el Excel de una liga en `data/ligas/`. Solo acepta los archivos del registro. */
  middlewares.use('/api/league-excel', async (req, res) => {
    if (req.method !== 'POST') return json(res, 405, { error: 'Usa POST.' });
    const body = await readJson<LeagueExcelPayload>(req, 30_000_000);
    if (
      !body ||
      !LEAGUES.some((l) => l.file === body.file) ||
      !Array.isArray(body.league) ||
      !Array.isArray(body.played) ||
      !Array.isArray(body.pending)
    ) {
      return json(res, 400, { error: 'Petición no válida.' });
    }
    try {
      json(res, 200, writeLeagueExcel(RUTA_LIGAS, body));
    } catch (e) {
      json(res, 500, { error: (e as Error).message });
    }
  });

  /**
   * SQLite en lugar del almacenamiento del navegador. `/api/store`: datos (antes `localStorage`); `/api/betting`:
   * picks y bankroll (antes IndexedDB). En ambas GET lee, POST guarda y POST `/migrate` copia lo del navegador una
   * sola vez. `/api/football-data/key` guarda la clave, que no vuelve al navegador. Ver `server/storage/`.
   */
  httpServer?.on('close', () => {
    almacen?.close();
    almacen = null;
  });
  const conBase =
    (manejar: (db: DatabaseSync, method: string, path: string, body: unknown) => Respuesta) =>
    async (req: IncomingMessage, res: ServerResponse) => {
      let db: DatabaseSync;
      try {
        db = baseDeDatos();
      } catch (e) {
        return json(res, 500, { error: `No se pudo abrir la base de datos: ${(e as Error).message}` });
      }
      const body = req.method === 'POST' ? await readJson<unknown>(req, 200_000_000) : null;
      const r = manejar(db, req.method ?? 'GET', (req.url ?? '/').split('?')[0], body);
      json(res, r.status, r.body, req, r.texto);
    };
  middlewares.use('/api/store', conBase(handleStoreRequest));
  middlewares.use('/api/betting', conBase(handleBettingRequest));
  middlewares.use('/api/football-data/key', conBase((db, method, _path, body) => handleFootballDataKeyRequest(db, method, body)));

  /**
   * Escudos oficiales a través de caché local: cada uno se descarga una sola vez del CDN
   * oficial y se sirve desde disco. Ver `server/crestProxy.ts`.
   */
  const crest = createCrestCache(RUTA_ESCUDOS);
  middlewares.use('/api/crest', async (req, res) => {
    const url = new URL(req.url ?? '', 'http://localhost').searchParams.get('u') ?? '';
    const imagen = await crest(url);
    if (!imagen) {
      // 400 = dominio no permitido; 502 = el CDN oficial no lo entregó. La interfaz muestra
      // las iniciales del club en ambos casos.
      res.statusCode = isAllowedCrestUrl(url) ? 502 : 400;
      return res.end();
    }
    res.setHeader('content-type', imagen.type);
    res.setHeader('cache-control', 'public, max-age=604800');
    res.end(imagen.body);
  });

  /*
   * Subir la base entera desde la máquina de casa. Ver `scripts/subirBase.mjs`.
   *
   * El despliegue arranca con un volumen vacío y los datos de verdad están en el `.sqlite` de casa:
   * 26.937 partidos, los picks, el bankroll, las copias de `storage_backups` y la clave de
   * football-data.org. Mandar el FICHERO entero es lo único que no pierde nada, porque no convierte nada:
   * son los mismos bytes. Un volcado a JSON dejaría fuera los secretos y las copias, que `readStore` no
   * devuelve.
   *
   * Sin `TOKEN_ADMIN` la ruta no existe. En casa no hace falta, y así no hay forma de llamarla.
   */
  const token = process.env.TOKEN_ADMIN;
  if (token) {
    middlewares.use('/api/admin/base', async (req, res) => {
      if (req.method !== 'POST') return json(res, 405, { error: 'Usa POST.' });
      if (req.headers.authorization !== `Bearer ${token}`) return json(res, 401, { error: 'Token incorrecto.' });
      const subida = await leerCuerpo(req, 500_000_000);
      if (!subida) return json(res, 400, { error: 'No llegó el archivo.' });
      try {
        return json(res, 200, { counts: reemplazarBase(subida) });
      } catch (e) {
        return json(res, 400, { error: (e as Error).message });
      }
    });
  }
}

/** El cuerpo tal cual, en binario. `null` si se pasa del límite. */
function leerCuerpo(req: IncomingMessage, limite: number): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const trozos: Buffer[] = [];
    let total = 0;
    req.on('data', (trozo: Buffer) => {
      total += trozo.length;
      if (total > limite) {
        req.destroy();
        return resolve(null);
      }
      trozos.push(trozo);
    });
    req.on('end', () => resolve(total === 0 ? null : Buffer.concat(trozos)));
    req.on('error', () => resolve(null));
  });
}

/** Los 16 bytes con los que empieza todo fichero SQLite. */
const FIRMA_SQLITE = Buffer.from('SQLite format 3\0', 'latin1');

/**
 * Pone la base subida en su sitio, sin tocar la que hay hasta estar seguro de que la nueva sirve.
 *
 * El orden importa:
 *   1. se escribe a un fichero aparte y se ABRE para contar filas; si la subida está rota, la base que
 *      ya estaba sigue intacta y la respuesta dice por qué;
 *   2. se suelta la base abierta, porque en Windows no se puede renombrar encima de un fichero en uso;
 *   3. se borran `-wal` y `-shm`: son el diario de la base ANTERIOR y, si se quedan, SQLite los aplica
 *      encima de la nueva y la corrompe.
 */
function reemplazarBase(bytes: Buffer): Record<string, number> {
  if (!bytes.subarray(0, 16).equals(FIRMA_SQLITE)) throw new Error('El archivo no es una base de datos SQLite.');
  mkdirSync(dirname(RUTA_BASE), { recursive: true });
  const provisional = `${RUTA_BASE}.subiendo`;
  writeFileSync(provisional, bytes);

  const counts: Record<string, number> = {};
  const comprobar = new AbrirBase(provisional, { readOnly: true });
  try {
    for (const tabla of ['leagues', 'matches', 'fixtures', 'betting_profiles']) {
      counts[tabla] = Number((comprobar.prepare(`SELECT COUNT(*) AS n FROM ${tabla}`).get() as { n: number }).n);
    }
  } catch (e) {
    comprobar.close();
    rmSync(provisional, { force: true });
    throw new Error(`La base subida no tiene las tablas esperadas: ${(e as Error).message}`);
  }
  comprobar.close();

  almacen?.close();
  almacen = null;
  rmSync(`${RUTA_BASE}-wal`, { force: true });
  rmSync(`${RUTA_BASE}-shm`, { force: true });
  renameSync(provisional, RUTA_BASE);
  return counts;
}
