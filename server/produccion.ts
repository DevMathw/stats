/**
 * El servidor desplegado: la MISMA API que en casa, más los archivos compilados.
 *
 *   node --experimental-strip-types --import ./scripts/tsResolve.mjs server/produccion.ts
 *
 * No hay nada aquí que decida qué hace la aplicación: monta `montarApi` tal cual y sirve `dist/`. Si algo
 * funciona con `npm run dev` y no funciona desplegado, el fallo está en estas cien líneas, no en la API.
 *
 * Lo que añade sobre el servidor de Vite, porque Vite lo daba hecho:
 *   - los archivos de `dist/`, con el `index.html` de vuelta para cualquier ruta que no sea un archivo
 *     (React Router resuelve `/partidos` en el navegador: sin esto, recargar ahí daría 404);
 *   - el proxy de football-data.org, que en `vite.config.ts` vive en `server.proxy` y por tanto solo
 *     existe en desarrollo.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseDeDatos, montarApi, type Middlewares } from './api.ts';
import { footballDataKey } from './storage/appStore.ts';

/**
 * Pila de middlewares con la forma que espera `montarApi`, que es la de `connect`.
 *
 * Lo importante, y lo que más fácil es equivocar: al entrar en un middleware montado en `/api/store`, el
 * `req.url` llega SIN ese prefijo. `conBase` compara contra `'/'` y `'/migrate'`, así que sin recortarlo
 * ninguna ruta de la base respondería. El original se guarda para restaurarlo si el middleware no era el
 * bueno y la petición sigue camino.
 */
export function pila() {
  const capas: { ruta: string; fn: (req: IncomingMessage, res: ServerResponse) => void }[] = [];
  const middlewares: Middlewares = { use: (ruta, fn) => capas.push({ ruta, fn }) };

  const atender = (req: IncomingMessage, res: ServerResponse): boolean => {
    const url = req.url ?? '/';
    for (const capa of capas) {
      if (!url.startsWith(capa.ruta)) continue;
      // `/api/storealgo` no es `/api/store`: detrás del prefijo solo vale el final, una barra o la query.
      const siguiente = url[capa.ruta.length];
      if (siguiente !== undefined && siguiente !== '/' && siguiente !== '?') continue;
      const resto = url.slice(capa.ruta.length);
      // `/api/store?x=1` deja `?x=1`, y connect entrega `/?x=1`. La barra no es adorno: sin ella,
      // `split('?')[0]` da cadena vacía en vez de `/`.
      req.url = resto === '' ? '/' : resto.startsWith('?') ? `/${resto}` : resto;
      capa.fn(req, res);
      return true;
    }
    return false;
  };
  return { middlewares, atender };
}

/** Proxy de football-data.org: pone la clave, que vive en el servidor y nunca llega al navegador. */
async function proxyFootballData(req: IncomingMessage, res: ServerResponse) {
  const destino = `https://api.football-data.org${req.url ?? '/'}`;
  const cabeceras: Record<string, string> = { accept: 'application/json' };
  try {
    const clave = footballDataKey(baseDeDatos());
    if (clave) cabeceras['X-Auth-Token'] = clave;
  } catch {
    // Sin base de datos no hay clave: football-data.org responde 401 y la aplicación lo explica.
  }
  try {
    const r = await fetch(destino, { headers: cabeceras });
    const cuerpo = Buffer.from(await r.arrayBuffer());
    res.statusCode = r.status;
    res.setHeader('content-type', r.headers.get('content-type') ?? 'application/json');
    res.end(cuerpo);
  } catch (e) {
    res.statusCode = 502;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: `No se pudo consultar football-data.org: ${(e as Error).message}` }));
  }
}

const TIPOS: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

const DIST = resolve(process.cwd(), 'dist');

/**
 * Un archivo de `dist/`, o `index.html` para cualquier otra ruta.
 *
 * `normalize` + la comprobación de que sigue dentro de `dist` es lo que impide que `GET /../.env` salga de
 * la carpeta servida.
 */
export function rutaEstatica(url: string): string {
  const pedido = decodeURIComponent(url.split('?')[0]);
  const candidato = resolve(DIST, `.${normalize(pedido)}`);
  // `startsWith(DIST)` a secas dejaría pasar `…/dist-otra/x`: hace falta el separador.
  const dentro = (candidato === DIST || candidato.startsWith(DIST + sep)) && existsSync(candidato) && statSync(candidato).isFile();
  return dentro ? candidato : join(DIST, 'index.html');
}

function estatico(req: IncomingMessage, res: ServerResponse) {
  const url = req.url ?? '/';
  const archivo = rutaEstatica(url);
  if (!existsSync(archivo)) {
    res.statusCode = 500;
    return res.end('Falta dist/. Ejecuta «npm run build» antes de arrancar.');
  }
  res.setHeader('content-type', TIPOS[extname(archivo)] ?? 'application/octet-stream');
  // Lo de `assets/` lleva un hash en el nombre: cambia de nombre cuando cambia, así que puede cachearse
  // para siempre. `index.html` nunca, o tras un despliegue el navegador seguiría con la versión anterior.
  res.setHeader('cache-control', url.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache');
  createReadStream(archivo).pipe(res);
}

export function arrancar(puerto = Number(process.env.PORT ?? 8080)) {
  const { middlewares, atender } = pila();
  const servidor = createServer((req, res) => {
    if ((req.url ?? '').startsWith('/football-data')) {
      req.url = (req.url ?? '').slice('/football-data'.length) || '/';
      return void proxyFootballData(req, res);
    }
    // `atender` recorta el prefijo del `req.url`; si ninguna capa era la buena hay que devolverlo entero,
    // o el archivo estático se buscaría con la ruta mutilada.
    const original = req.url;
    if (atender(req, res)) return;
    req.url = original;

    /*
     * Una ruta de `/api/` que no ha cogido nadie es un 404, no el `index.html`.
     *
     * Sin esto el fallback de la SPA responde 200 con HTML a CUALQUIER cosa, y un `/api/` mal escrito
     * —o una ruta que solo existe con `TOKEN_ADMIN` puesto— devolvería una página en lugar de decir que
     * no existe. El cliente lo vería como un JSON corrupto y habría que adivinar por qué.
     */
    if ((original ?? '').startsWith('/api/')) {
      res.statusCode = 404;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ error: 'Ruta desconocida.' }));
    }
    estatico(req, res);
  });
  montarApi(middlewares, servidor);
  servidor.listen(puerto, () => console.log(`Análisis de Fútbol escuchando en el puerto ${puerto}`));
  return servidor;
}

// Importar este módulo desde una prueba no debe abrir un puerto: solo arranca si se ejecuta directamente.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) arrancar();
