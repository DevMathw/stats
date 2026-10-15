import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleStoreRequest, openStore, readStore } from '../../server/storage/appStore.ts';
import { handleBettingRequest, readBetting } from '../../server/storage/bettingStore.ts';
import { bettingSqliteStorage, sqliteStorage } from './sqliteStorage';
import type { StorePatch } from './storeSync';

const CLAVE = 'analisis-futbol';
const VALOR = {
  state: { leagues: [{ id: 'LaLiga' }], matches: [{ id: 'm1', leagueId: 'LaLiga', homeGoals: 1 }], fixtures: [] },
  version: 4,
};

/** El navegador contra el manejador real de `/api/store`, sin HTTP. `localStorage` solo se puede leer. */
function montar(navegador: Record<string, string> = {}) {
  const db = openStore(':memory:');
  const peticiones: { method: string; path: string; body: unknown }[] = [];
  vi.stubGlobal('localStorage', { getItem: (k: string) => navegador[k] ?? null });
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    const path = url.slice('/api/store'.length) || '/';
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    peticiones.push({ method, path, body });
    const r = handleStoreRequest(db, method, path, body);
    // Igual que `json()` en vite.config.ts: el GET trae el cuerpo ya serializado.
    return new Response(r.texto ?? JSON.stringify(r.body), { status: r.status });
  });
  const escrituras = () => peticiones.filter((p) => p.method === 'POST' && p.path === '/').map((p) => p.body as StorePatch);
  return { db, peticiones, escrituras, crear: () => sqliteStorage<typeof VALOR.state>(() => {}) };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('sqliteStorage', () => {
  it('copia el localStorage una sola vez y no lo toca', async () => {
    const navegador = { [CLAVE]: JSON.stringify(VALOR) };
    const m = montar(navegador);
    expect(await m.crear().getItem(CLAVE)).toEqual(VALOR);
    expect(await m.crear().getItem(CLAVE)).toMatchObject({ version: 4, state: { matches: [{ id: 'm1', homeGoals: 1 }] } });
    expect(m.peticiones.filter((p) => p.path === '/migrate')).toHaveLength(1);
    expect(navegador[CLAVE]).toBe(JSON.stringify(VALOR));
  });

  it('no escribe antes de leer, y después solo lo que cambió', async () => {
    const m = montar({ [CLAVE]: JSON.stringify(VALOR) });
    const storage = m.crear();
    storage.setItem(CLAVE, { ...VALOR, state: { ...VALOR.state, matches: [] } });
    await storage.getItem(CLAVE);
    storage.setItem(CLAVE, {
      ...VALOR,
      state: { ...VALOR.state, matches: [{ id: 'm1', leagueId: 'LaLiga', homeGoals: 3 }, { id: 'm2', leagueId: 'LaLiga', homeGoals: 0 }] },
    });
    await vi.waitFor(() => expect(readStore(m.db).value?.state.matches).toMatchObject([{ id: 'm1', homeGoals: 3 }, { id: 'm2' }]));
    expect(m.escrituras()).toHaveLength(1);
    expect(m.escrituras()[0].matches?.upsert.map((r) => r.id)).toEqual(['m1', 'm2']);
    expect(m.escrituras()[0].leagues).toBeUndefined();
  });

  it('una base sin estrenar no recibe un estado vacío', async () => {
    const m = montar();
    const storage = m.crear();
    expect(await storage.getItem(CLAVE)).toBeNull();
    storage.setItem(CLAVE, { state: { leagues: [], matches: [], fixtures: [] }, version: 4 });
    await new Promise((r) => setTimeout(r, 20));
    expect(m.escrituras()).toEqual([]);
    storage.setItem(CLAVE, VALOR);
    await vi.waitFor(() => expect(readStore(m.db).initialized).toBe(true));
  });

  it('sin servidor local muestra el navegador en solo lectura', async () => {
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify(VALOR) });
    const fetchFalso = vi.fn(async () => new Response('no existe', { status: 404 }));
    vi.stubGlobal('fetch', fetchFalso);
    const avisos: string[] = [];
    const storage = sqliteStorage<typeof VALOR.state>((m) => avisos.push(m));
    expect(await storage.getItem(CLAVE)).toEqual(VALOR);
    storage.setItem(CLAVE, VALOR);
    await new Promise((r) => setTimeout(r, 20));
    expect(fetchFalso).toHaveBeenCalledTimes(1);
    expect(avisos[0]).toContain('no se guardan');
  });
});

describe('bettingSqliteStorage', () => {
  const PICKS = 'analisis-futbol-picks';
  const perfil = (picks: unknown[] = []) => ({ id: 'p1', name: 'Mi perfil', movements: [{ id: 'm1', type: 'inicial', amount: 1000 }], picks, tickets: [] });
  const CON_PICKS = {
    state: { profiles: { p1: perfil([{ id: 'k1', stake: 20, selection: { market: 'btts', outcome: 'si' } }]) }, activeProfileId: 'p1', modelValidation: null },
    version: 3,
  };

  /** Sin IndexedDB (Node), `idbStorage` lee `localStorage`: aquí hace de IndexedDB. */
  function montarPicks(navegador: Record<string, string> = {}) {
    const db = openStore(':memory:');
    const peticiones: string[] = [];
    vi.stubGlobal('localStorage', { getItem: (k: string) => navegador[k] ?? null });
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      const path = url.slice('/api/betting'.length) || '/';
      peticiones.push(`${method} ${path}`);
      const r = handleBettingRequest(db, method, path, init?.body ? JSON.parse(String(init.body)) : null);
      return new Response(JSON.stringify(r.body), { status: r.status });
    });
    return { db, peticiones, crear: () => bettingSqliteStorage<typeof CON_PICKS.state>(() => {}) };
  }

  it('copia los picks del navegador una sola vez', async () => {
    const m = montarPicks({ [PICKS]: JSON.stringify(CON_PICKS) });
    expect(await m.crear().getItem(PICKS)).toEqual(CON_PICKS);
    expect(await m.crear().getItem(PICKS)).toEqual(CON_PICKS);
    expect(m.peticiones.filter((p) => p === 'POST /migrate')).toHaveLength(1);
  });

  it('el perfil recién creado no estrena la base; el primer pick sí', async () => {
    const m = montarPicks();
    const storage = m.crear();
    expect(await storage.getItem(PICKS)).toBeNull();
    storage.setItem(PICKS, { state: { profiles: { p1: perfil() }, activeProfileId: 'p1', modelValidation: null }, version: 3 });
    await new Promise((r) => setTimeout(r, 20));
    expect(m.peticiones.filter((p) => p === 'POST /')).toEqual([]);
    storage.setItem(PICKS, CON_PICKS);
    await vi.waitFor(() => expect(readBetting(m.db).value).toEqual(CON_PICKS));
  });

  it('un navegador con solo el perfil recién creado no estrena la base: la copia la hace el que tiene picks', async () => {
    const vacio = { state: { profiles: { p1: perfil() }, activeProfileId: 'p1', modelValidation: null }, version: 3 };
    const navegador: Record<string, string> = { [PICKS]: JSON.stringify(vacio) };
    const m = montarPicks(navegador);
    expect(await m.crear().getItem(PICKS)).toEqual(vacio);
    expect(m.peticiones).not.toContain('POST /migrate');
    navegador[PICKS] = JSON.stringify(CON_PICKS);
    expect(await m.crear().getItem(PICKS)).toEqual(CON_PICKS);
    expect(readBetting(m.db).value).toEqual(CON_PICKS);
  });

  // La base devuelve `activeProfileId` antes que `profiles`. Comparando el texto tal cual, cada apertura reescribía los
  // picks, y Tailwind recargaba la página con cada escritura: la app se recargaba sin parar.
  it('abrir la app no reescribe los picks aunque la base devuelva las claves en otro orden', async () => {
    const m = montarPicks({ [PICKS]: JSON.stringify(CON_PICKS) });
    await m.crear().getItem(PICKS);
    const storage = m.crear();
    await storage.getItem(PICKS);
    storage.setItem(PICKS, CON_PICKS);
    await new Promise((r) => setTimeout(r, 20));
    expect(m.peticiones.filter((p) => p === 'POST /')).toEqual([]);
  });
});
