import type { StateStorage } from 'zustand/middleware';

/**
 * Almacenamiento clave-valor en IndexedDB para el store de picks.
 *
 * No va a `localStorage` porque ahí ya vive el store de datos (miles de partidos) y el navegador da
 * unos 5 MB por origen: un historial de picks que creciera podría hacer fallar a los dos. IndexedDB
 * tiene cuota propia y mucho mayor. Si no está disponible (algunos modos privados), se usa
 * `localStorage` como último recurso.
 */
const DB_NAME = 'analisis-futbol';
const STORE = 'kv';

let conexion: Promise<IDBDatabase> | null = null;

function abrir(): Promise<IDBDatabase> {
  conexion ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return conexion;
}

function peticion<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

const hayIdb = () => typeof indexedDB !== 'undefined';

export const idbStorage: StateStorage = {
  getItem: async (key) => {
    if (!hayIdb()) return globalThis.localStorage?.getItem(key) ?? null;
    const db = await abrir();
    const v = await peticion(db.transaction(STORE, 'readonly').objectStore(STORE).get(key));
    return typeof v === 'string' ? v : null;
  },
  setItem: async (key, value) => {
    if (!hayIdb()) return globalThis.localStorage?.setItem(key, value);
    const db = await abrir();
    await peticion(db.transaction(STORE, 'readwrite').objectStore(STORE).put(value, key));
  },
  removeItem: async (key) => {
    if (!hayIdb()) return globalThis.localStorage?.removeItem(key);
    const db = await abrir();
    await peticion(db.transaction(STORE, 'readwrite').objectStore(STORE).delete(key));
  },
};
