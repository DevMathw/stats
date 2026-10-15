/**
 * Dónde vive la API.
 *
 * Vacío, que es lo normal, significa «el mismo sitio que la página»: así funciona en casa con
 * `npm run dev` y así funciona cuando el backend sirve también la web compilada (Railway, Render o
 * `npm start`). Las direcciones salen relativas, tal y como estaban escritas.
 *
 * Con el frontend en Vercel y el backend en otro sitio son dos dominios distintos, y entonces
 * `VITE_API_URL` apunta al backend. Vercel la inyecta al compilar, así que su valor queda dentro del
 * paquete: tiene que ser una dirección pública, nunca un secreto.
 *
 * No se usa un «rewrite» de Vercel haciendo de proxy a propósito: `/api/store` son 3,1 MB comprimidos con
 * 26.954 partidos y el límite de respuesta de Vercel está en 4,5 MB. Hoy pasaría; dentro de unos miles de
 * partidos, no, y fallaría justo en la petición de la que depende todo.
 */

/*
 * `import.meta.env` solo existe cuando el código lo compila Vite. El dominio y los scripts se ejecutan
 * también con node a pelo (pruebas, `medirPrior`, `buildOfficialTeams`), donde `import.meta.env` es
 * `undefined`: de ahí el acceso defensivo en vez de dar por hecho que está.
 */
const entorno = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;

/** Sin barra final: las rutas que se le pegan ya empiezan por `/`. */
export const API_BASE = (entorno?.VITE_API_URL ?? '').replace(/\/+$/, '');

/** `api('/api/store')` → `/api/store` en casa, `https://backend/api/store` con `VITE_API_URL` puesta. */
export const api = (ruta: string) => `${API_BASE}${ruta}`;
