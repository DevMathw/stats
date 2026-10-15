import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RETRY_AFTER_MS, createCrestCache, isAllowedCrestUrl } from './crestProxy.ts';

/**
 * Dos garantías: no es un proxy abierto, y no insiste contra un CDN que ya ha cortado el acceso.
 */

describe('isAllowedCrestUrl', () => {
  it('acepta solo https de dominios oficiales de la lista', () => {
    expect(isAllowedCrestUrl('https://img.uefa.com/imgml/TP/teams/logos/240x240/50051.png')).not.toBeNull();
    expect(isAllowedCrestUrl('http://img.uefa.com/logo.png')).toBeNull();
    expect(isAllowedCrestUrl('https://evil.example.com/logo.png')).toBeNull();
    expect(isAllowedCrestUrl('https://img.uefa.com.evil.com/logo.png')).toBeNull();
    expect(isAllowedCrestUrl('file:///etc/passwd')).toBeNull();
    expect(isAllowedCrestUrl('no es una url')).toBeNull();
  });

  it('en un dominio compartido solo acepta la ruta de la fuente, también tras normalizar', () => {
    expect(isAllowedCrestUrl('https://s3.eu-west-1.amazonaws.com/image.mpg/assets/clubs/logo/om.png')).not.toBeNull();
    expect(isAllowedCrestUrl('https://s3.eu-west-1.amazonaws.com/otro-bucket/logo.png')).toBeNull();
    expect(isAllowedCrestUrl('https://s3.eu-west-1.amazonaws.com/image.mpg/assets/clubs/../../../otro-bucket/x.png')).toBeNull();
    expect(isAllowedCrestUrl('https://s3.eu-west-1.amazonaws.com/image.mpg/assets/clubs/%2e%2e/%2e%2e/%2e%2e/otro/x.png')).toBeNull();
  });
});

describe('createCrestCache', () => {
  const dirs: string[] = [];
  afterEach(() => {
    vi.unstubAllGlobals();
    for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
  });
  const tmp = () => {
    const d = mkdtempSync(join(tmpdir(), 'crests-'));
    dirs.push(d);
    return d;
  };
  const URL_OK = 'https://img.uefa.com/imgml/TP/teams/logos/240x240/50051.png';

  it('descarga una vez y después sirve desde disco', async () => {
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/png' } }));
    vi.stubGlobal('fetch', fetchMock);
    const obtener = createCrestCache(tmp());

    const a = await obtener(URL_OK);
    const b = await obtener(URL_OK);
    expect(a?.type).toBe('image/png');
    expect([...(b?.body ?? [])]).toEqual([1, 2, 3]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('no reintenta un escudo que falló hasta pasado el plazo', async () => {
    const fetchMock = vi.fn(async () => new Response('bloqueado', { status: 403 }));
    vi.stubGlobal('fetch', fetchMock);
    let reloj = 0;
    const obtener = createCrestCache(tmp(), () => reloj);

    expect(await obtener(URL_OK)).toBeNull();
    expect(await obtener(URL_OK)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    reloj += RETRY_AFTER_MS + 1;
    await obtener(URL_OK);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rechaza lo que no es una imagen y nunca pide dominios fuera de la lista', async () => {
    const fetchMock = vi.fn(async () => new Response('<html>', { headers: { 'content-type': 'text/html' } }));
    vi.stubGlobal('fetch', fetchMock);
    const obtener = createCrestCache(tmp());

    expect(await obtener(URL_OK)).toBeNull();
    expect(await obtener('https://evil.example.com/logo.png')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
