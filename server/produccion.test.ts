import { describe, expect, it } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join, resolve } from 'node:path';
import { pila, rutaEstatica } from './produccion.ts';

const peticion = (url: string) => ({ url }) as IncomingMessage;
const respuesta = () => ({}) as ServerResponse;

describe('servidor de producción', () => {
  /*
   * Lo que de verdad puede fallar del router: `montarApi` está escrito para `connect`, que ENTREGA el
   * `req.url` sin el prefijo del montaje. `conBase` compara contra `'/'` y `'/migrate'`, así que si el
   * prefijo no se recorta, ninguna ruta de la base responde y la aplicación arranca vacía.
   */
  it('entrega la url sin el prefijo del montaje, como connect', () => {
    const { middlewares, atender } = pila();
    const vistas: string[] = [];
    middlewares.use('/api/store', (req) => vistas.push(req.url ?? ''));

    for (const url of ['/api/store', '/api/store/', '/api/store/migrate', '/api/store?x=1']) {
      expect(atender(peticion(url), respuesta()), url).toBe(true);
    }
    expect(vistas).toEqual(['/', '/', '/migrate', '/?x=1']);
  });

  it('no confunde una ruta que solo empieza igual', () => {
    const { middlewares, atender } = pila();
    middlewares.use('/api/store', () => {});
    // `/api/storeroom` no es `/api/store`: detrás del prefijo solo vale el final, una barra o la query.
    expect(atender(peticion('/api/storeroom'), respuesta())).toBe(false);
    expect(atender(peticion('/api/betting'), respuesta())).toBe(false);
  });

  it('gana la primera capa que encaja, en el orden en que se montaron', () => {
    const { middlewares, atender } = pila();
    const vistas: string[] = [];
    middlewares.use('/api/football-data/key', () => vistas.push('clave'));
    middlewares.use('/api', () => vistas.push('generica'));
    atender(peticion('/api/football-data/key'), respuesta());
    expect(vistas).toEqual(['clave']);
  });

  describe('archivos estáticos', () => {
    const DIST = resolve(process.cwd(), 'dist');

    it('devuelve index.html para una ruta de la aplicación', () => {
      // React Router resuelve `/partidos` en el navegador: recargar ahí tiene que servir el index.
      expect(rutaEstatica('/partidos')).toBe(join(DIST, 'index.html'));
      expect(rutaEstatica('/equipos/LaLiga%7CGetafe')).toBe(join(DIST, 'index.html'));
    });

    it('no sale de dist', () => {
      for (const url of ['/../.env', '/../../data/analisis-futbol.sqlite', '/..%2F.env', '/%2e%2e/%2e%2e/.env']) {
        expect(rutaEstatica(url), url).toBe(join(DIST, 'index.html'));
      }
    });
  });
});
