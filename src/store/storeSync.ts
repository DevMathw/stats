/**
 * Qué cambió en el estado guardado del store de datos desde la última escritura en SQLite.
 *
 * El store sigue teniendo todo en memoria (el motor recalcula con todos los partidos), pero ya no reescribe
 * el conjunto entero en cada cambio: solo viajan los partidos y pendientes nuevos, modificados o borrados, y
 * la configuración que cambió. Sin estado previo, el parche es la sustitución completa.
 *
 * Es código puro: lo usan el navegador (`sqliteStorage.ts`) y el servidor (`server/storage/appStore.ts`).
 */

/** Lo que persiste zustand: el estado parcial y la versión de su esquema. */
export interface PersistedValue {
  state: Record<string, unknown>;
  version?: number;
}

/** Una fila de una colección: cualquier objeto con `id` de texto. */
export type Row = Record<string, unknown> & { id: string };

export interface RowChange {
  upsert: Row[];
  remove: string[];
  /** Orden completo de ids, solo si cambió. */
  order?: string[];
  /** Vaciar la tabla antes de aplicar. */
  replace?: boolean;
}

export interface StorePatch {
  version: number;
  /** Las ligas son pocas: viajan enteras cuando cambia alguna. */
  leagues?: Row[];
  matches?: RowChange;
  fixtures?: RowChange;
  teamAliases?: Record<string, Record<string, string>>;
  identityAliases?: Record<string, string>;
  /** El resto de claves del estado guardado, cada una como JSON. */
  settings?: Record<string, unknown>;
  removeSettings?: string[];
}

/** Claves con tabla propia; todo lo demás va a `settings`. */
export const TABLE_KEYS = ['leagues', 'matches', 'fixtures', 'teamAliases', 'identityAliases'] as const;
const EN_TABLA = new Set<string>(TABLE_KEYS);

/** Lo último que se escribió, para comparar. Las referencias evitan recorrer lo que no cambió. */
export interface Snapshot {
  version: number;
  refs: Map<string, unknown>;
  json: Map<string, string>;
  rows: Map<string, Map<string, string>>;
  order: Map<string, string>;
}

export const esFila = (v: unknown): v is Row =>
  typeof v === 'object' && v !== null && typeof (v as { id?: unknown }).id === 'string';

const filas = (v: unknown): Row[] => (Array.isArray(v) ? v.filter(esFila) : []);

function cambiosDeFilas(clave: string, lista: Row[], prev: Snapshot | null, next: Snapshot): RowChange | null {
  const antes = prev?.rows.get(clave);
  const ahora = new Map<string, string>();
  const upsert: Row[] = [];
  for (const r of lista) {
    const s = JSON.stringify(r);
    ahora.set(r.id, s);
    if (antes?.get(r.id) !== s) upsert.push(r);
  }
  const remove = antes ? [...antes.keys()].filter((id) => !ahora.has(id)) : [];
  const orden = lista.map((r) => r.id).join('\n');
  next.rows.set(clave, ahora);
  next.order.set(clave, orden);
  const ordenCambia = prev?.order.get(clave) !== orden;
  if (antes && !upsert.length && !remove.length && !ordenCambia) return null;
  return {
    upsert,
    remove,
    ...(ordenCambia || !antes ? { order: lista.map((r) => r.id) } : {}),
    ...(antes ? {} : { replace: true }),
  };
}

/**
 * El parche que lleva SQLite de `prev` a `value`, y la foto nueva. `patch` es `null` si no cambió nada.
 * Sin `prev` sale la sustitución completa.
 */
export function diffStore(prev: Snapshot | null, value: PersistedValue): { patch: StorePatch | null; snapshot: Snapshot } {
  const version = value.version ?? 0;
  const next: Snapshot = { version, refs: new Map(), json: new Map(), rows: new Map(), order: new Map() };
  const patch: StorePatch = { version };
  let cambia = !prev || prev.version !== version;
  const estado = value.state;

  for (const clave of ['matches', 'fixtures'] as const) {
    const v = estado[clave];
    next.refs.set(clave, v);
    if (prev && prev.refs.get(clave) === v && prev.rows.has(clave)) {
      next.rows.set(clave, prev.rows.get(clave)!);
      next.order.set(clave, prev.order.get(clave)!);
      continue;
    }
    const c = cambiosDeFilas(clave, filas(v), prev, next);
    if (c) {
      patch[clave] = c;
      cambia = true;
    }
  }

  const leagues = filas(estado.leagues);
  const leaguesJson = JSON.stringify(leagues);
  next.json.set('leagues', leaguesJson);
  if (prev?.json.get('leagues') !== leaguesJson) {
    patch.leagues = leagues;
    cambia = true;
  }

  for (const clave of ['teamAliases', 'identityAliases'] as const) {
    const v = estado[clave];
    const s = JSON.stringify(v ?? {});
    next.json.set(clave, s);
    if (prev?.json.get(clave) !== s) {
      Object.assign(patch, { [clave]: v ?? {} });
      cambia = true;
    }
  }

  const settings: Record<string, unknown> = {};
  for (const [clave, v] of Object.entries(estado)) {
    if (EN_TABLA.has(clave) || v === undefined) continue;
    const s = JSON.stringify(v);
    next.json.set(`setting:${clave}`, s);
    if (prev?.json.get(`setting:${clave}`) !== s) settings[clave] = v;
  }
  const removeSettings = prev
    ? [...prev.json.keys()].filter((k) => k.startsWith('setting:') && !next.json.has(k)).map((k) => k.slice(8))
    : [];
  if (Object.keys(settings).length) {
    patch.settings = settings;
    cambia = true;
  }
  if (removeSettings.length) {
    patch.removeSettings = removeSettings;
    cambia = true;
  }

  return { patch: cambia ? patch : null, snapshot: next };
}

/**
 * ¿Hay picks de verdad? Picks, tickets, movimientos además del saldo inicial o más de un perfil. El perfil que se crea
 * al arrancar no cuenta: escribirlo en una base sin estrenar taparía la copia del navegador.
 */
export function bettingHasData(state: Record<string, unknown>): boolean {
  const perfiles = typeof state.profiles === 'object' && state.profiles !== null ? Object.values(state.profiles) : [];
  const largo = (p: unknown, clave: string) => {
    const v = (p as Record<string, unknown> | null)?.[clave];
    return Array.isArray(v) ? v.length : 0;
  };
  return perfiles.length > 1 || perfiles.some((p) => largo(p, 'picks') + largo(p, 'tickets') > 0 || largo(p, 'movements') > 1);
}

/** Ids distintos de una colección: lo que debe contar SQLite después de escribir. */
export const idsDistintos = (v: unknown): number => new Set(filas(v).map((r) => r.id)).size;
