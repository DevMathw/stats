/**
 * Datos de la app en SQLite, en el servidor local. Sustituye al `localStorage` del navegador: ~5 MB de límite,
 * reescrito entero en cada cambio y perdido si se borran los datos del sitio.
 *
 * `node:sqlite` viene con Node 24: sin dependencias. Una tabla por colección, con una columna por dato para lo
 * que se consulta (ligas, partidos, pendientes, alias); la configuración va en `settings` como JSON. Las claves
 * sin columna van a `extra`, así que la copia desde el navegador no pierde nada. Cada escritura es una
 * transacción: entra entera o no entra.
 *
 * Sin claves foráneas a propósito: una fila huérfana haría fallar la transacción y se perderían los cambios que
 * traía. La integridad la sigue garantizando el store, como hasta ahora.
 */
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync, type SQLOutputValue } from 'node:sqlite';
import { diffStore, esFila } from '../../src/store/storeSync.ts';
import type { PersistedValue, Row, RowChange, StorePatch } from '../../src/store/storeSync.ts';

type Registro = Record<string, SQLOutputValue>;

interface Columna {
  clave: string;
  columna: string;
  tipo: string;
  json?: true;
}
interface Tabla {
  nombre: 'leagues' | 'matches' | 'fixtures';
  columnas: Columna[];
}

const col = (clave: string, columna: string, tipo = 'TEXT'): Columna => ({ clave, columna, tipo });
const entero = (clave: string, columna: string) => col(clave, columna, 'INTEGER');
const json = (clave: string, columna: string): Columna => ({ clave, columna, tipo: 'TEXT', json: true });
const ID = col('id', 'id', 'TEXT PRIMARY KEY');

const LEAGUES: Tabla = {
  nombre: 'leagues',
  columnas: [
    ID,
    col('country', 'country'),
    col('name', 'name'),
    col('confederation', 'confederation'),
    col('season', 'season'),
    col('calendarFormat', 'calendar_format'),
    entero('teamCount', 'team_count'),
    col('regularSeasonRounds', 'regular_season_rounds'),
    col('approximateStartDate', 'approximate_start_date'),
    col('source', 'source'),
    col('reliabilityNotes', 'reliability_notes'),
  ],
};

/** Lo común a un partido disputado y a uno pendiente. */
const PARTIDO = [
  ID,
  col('providerId', 'provider_id'),
  col('leagueId', 'league_id'),
  col('country', 'country'),
  col('season', 'season'),
  col('date', 'date'),
  col('kickoffTime', 'kickoff_time'),
  entero('round', 'round'),
  col('homeTeamId', 'home_team_id'),
  col('awayTeamId', 'away_team_id'),
  col('homeTeamName', 'home_team_name'),
  col('awayTeamName', 'away_team_name'),
];
const REFERENCIAS = [col('homeTeamRef', 'home_team_ref'), col('awayTeamRef', 'away_team_ref')];

const MATCHES: Tabla = {
  nombre: 'matches',
  columnas: [
    ...PARTIDO,
    entero('homeGoals', 'home_goals'),
    entero('awayGoals', 'away_goals'),
    entero('homeFirstHalfGoals', 'home_first_half_goals'),
    entero('awayFirstHalfGoals', 'away_first_half_goals'),
    entero('shotsHome', 'shots_home'),
    entero('shotsAway', 'shots_away'),
    entero('shotsOnTargetHome', 'shots_on_target_home'),
    entero('shotsOnTargetAway', 'shots_on_target_away'),
    col('possessionHome', 'possession_home', 'REAL'),
    entero('cornersHome', 'corners_home'),
    entero('cornersAway', 'corners_away'),
    entero('yellowCardsHome', 'yellow_cards_home'),
    entero('yellowCardsAway', 'yellow_cards_away'),
    entero('redCardsHome', 'red_cards_home'),
    entero('redCardsAway', 'red_cards_away'),
    entero('foulsHome', 'fouls_home'),
    entero('foulsAway', 'fouls_away'),
    entero('offsidesHome', 'offsides_home'),
    entero('offsidesAway', 'offsides_away'),
    col('xGHome', 'xg_home', 'REAL'),
    col('xGAway', 'xg_away', 'REAL'),
    col('source', 'source'),
    col('updatedAt', 'updated_at'),
    col('statsSource', 'stats_source'),
    col('statsUpdatedAt', 'stats_updated_at'),
    json('statsCitations', 'stats_citations'),
    ...REFERENCIAS,
    json('manualFields', 'manual_fields'),
  ],
};

const FIXTURES: Tabla = {
  nombre: 'fixtures',
  columnas: [...PARTIDO, col('status', 'status'), col('source', 'source'), ...REFERENCIAS],
};

const TABLAS = [LEAGUES, MATCHES, FIXTURES];

const crear = (t: Tabla) =>
  `CREATE TABLE ${t.nombre} (${t.columnas.map((c) => `${c.columna} ${c.tipo}`).join(', ')}, position INTEGER NOT NULL, extra TEXT)`;

/**
 * Esquema por versiones (`PRAGMA user_version`): cada entrada lleva la base de la versión anterior a la suya. Una
 * versión ya aplicada no se toca. La v1 sale de las columnas de arriba; si una columna cambia, primero se congela
 * su SQL aquí y el cambio va en una entrada nueva (ALTER TABLE…), o las bases existentes no se actualizarían.
 */
const MIGRACIONES: string[] = [
  [
    crear(LEAGUES),
    crear(MATCHES),
    crear(FIXTURES),
    'CREATE INDEX matches_league ON matches (league_id, season, date)',
    'CREATE INDEX fixtures_league ON fixtures (league_id, date)',
    'CREATE TABLE team_aliases (league_id TEXT NOT NULL, provider_name TEXT NOT NULL, canonical TEXT NOT NULL, PRIMARY KEY (league_id, provider_name))',
    'CREATE TABLE identity_aliases (name TEXT PRIMARY KEY, espn_id TEXT NOT NULL)',
    'CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)',
    'CREATE TABLE store_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)',
    'CREATE TABLE storage_backups (id INTEGER PRIMARY KEY AUTOINCREMENT, source TEXT NOT NULL, created_at TEXT NOT NULL, payload TEXT NOT NULL)',
  ].join(';\n'),
  // v2 (15/09/2026): picks y bankroll (antes en IndexedDB) y secretos del servidor, que nunca vuelven al navegador.
  [
    'CREATE TABLE server_secrets (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL)',
    'CREATE TABLE betting_profiles (id TEXT PRIMARY KEY, position INTEGER NOT NULL, name TEXT, created_at TEXT, cycle INTEGER, data TEXT NOT NULL)',
    'CREATE TABLE betting_movements (profile_id TEXT NOT NULL, id TEXT NOT NULL, position INTEGER NOT NULL, cycle INTEGER, at TEXT, type TEXT, amount REAL, balance_after REAL, bet_id TEXT, data TEXT NOT NULL, PRIMARY KEY (profile_id, id))',
    'CREATE TABLE betting_picks (profile_id TEXT NOT NULL, id TEXT NOT NULL, position INTEGER NOT NULL, cycle INTEGER, created_at TEXT, league_id TEXT, fixture_id TEXT, market TEXT, odds REAL, stake REAL, status TEXT, settled_at TEXT, net_profit REAL, data TEXT NOT NULL, PRIMARY KEY (profile_id, id))',
    'CREATE TABLE betting_tickets (profile_id TEXT NOT NULL, id TEXT NOT NULL, position INTEGER NOT NULL, number INTEGER, cycle INTEGER, created_at TEXT, combined_odds REAL, stake REAL, status TEXT, settled_at TEXT, net_profit REAL, data TEXT NOT NULL, PRIMARY KEY (profile_id, id))',
    'CREATE INDEX betting_picks_created ON betting_picks (profile_id, created_at)',
    'CREATE INDEX betting_tickets_created ON betting_tickets (profile_id, created_at)',
    'CREATE TABLE betting_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)',
  ].join(';\n'),
];

/**
 * La respuesta del GET de `/api/store`, ya serializada.
 *
 * Montar el estado son 26.937 objetos sacados de SQLite fila a fila (**3,2 s medidos el 14/10/2026**) más
 * 0,9 s de `JSON.stringify`, y se pagaban enteros en cada recarga del navegador aunque no hubiera cambiado
 * ni un partido. Con el dev server y HMR eso son varias recargas por minuto.
 *
 * Se guarda el TEXTO y no los objetos: es lo que se manda, y 27 MB de cadena ocupan bastante menos en
 * memoria que el grafo de 26.937 objetos.
 *
 * Se tira solo, y por dos vías, porque olvidarse de invalidar un caché es devolver datos viejos:
 *   - `transaccion`, por donde pasa toda escritura nuestra que `readStore` pueda ver;
 *   - `PRAGMA data_version`, que SQLite sube cuando escribe OTRA conexión (la base abierta a mano, otra app).
 * Y se guarda junto a su `db`: las pruebas abren una base en memoria por caso y el caché de una no vale
 * para la siguiente.
 */
let cacheLectura: { db: DatabaseSync; dataVersion: number; texto: string } | null = null;

const dataVersion = (db: DatabaseSync) => Number((db.prepare('PRAGMA data_version').get() as Registro).data_version);

/** El estado guardado como texto JSON, reutilizando el de la última lectura si la base no ha cambiado. */
export function readStoreJson(db: DatabaseSync): string {
  const v = dataVersion(db);
  if (cacheLectura && cacheLectura.db === db && cacheLectura.dataVersion === v) return cacheLectura.texto;
  const texto = JSON.stringify(readStore(db));
  cacheLectura = { db, dataVersion: v, texto };
  return texto;
}

export function transaccion<T>(db: DatabaseSync, fn: () => T): T {
  cacheLectura = null;
  db.exec('BEGIN IMMEDIATE');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

/** Abre (o crea) la base y la pone al día. `:memory:` para las pruebas. */
/**
 * Respuesta de un manejador. `texto` es el cuerpo YA serializado, para los que lo tienen hecho (el GET de
 * `/api/store`, que son 27 MB): con `body` habría que volver a pasarlo por `JSON.stringify`.
 */
export interface Respuesta {
  status: number;
  body?: unknown;
  texto?: string;
}

export function openStore(archivo: string): DatabaseSync {
  if (archivo !== ':memory:') mkdirSync(dirname(archivo), { recursive: true });
  const db = new DatabaseSync(archivo);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  const actual = Number((db.prepare('PRAGMA user_version').get() as Registro).user_version);
  for (let v = actual; v < MIGRACIONES.length; v++) {
    transaccion(db, () => db.exec(`${MIGRACIONES[v]};\nPRAGMA user_version = ${v + 1}`));
  }
  return db;
}

export const leerMeta = (db: DatabaseSync, clave: string): string | null => {
  const r = db.prepare('SELECT value FROM store_meta WHERE key = ?').get(clave) as Registro | undefined;
  return r ? String(r.value) : null;
};
export const fijarMeta = (db: DatabaseSync, clave: string, valor: string) =>
  db.prepare('INSERT INTO store_meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value').run(clave, valor);

/** Valores de una fila en el orden de sus columnas, más `position` y `extra`. */
function parametros(t: Tabla, fila: Row, posicion: number): (string | number | null)[] {
  const extra: Record<string, unknown> = {};
  const valores = t.columnas.map((c) => {
    const v = fila[c.clave];
    if (c.json) return v === undefined ? null : JSON.stringify(v);
    if (v === undefined || v === null) return null;
    if (typeof v === 'string' || (typeof v === 'number' && Number.isFinite(v))) return v;
    extra[c.clave] = v; // un tipo inesperado se conserva tal cual en `extra`
    return null;
  });
  const conocidas = new Set(t.columnas.map((c) => c.clave));
  for (const [k, v] of Object.entries(fila)) if (!conocidas.has(k) && v !== undefined) extra[k] = v;
  return [...valores, posicion, Object.keys(extra).length ? JSON.stringify(extra) : null];
}

/** La fila como objeto. Un campo sin valor vuelve como `null`; uno JSON ausente (p. ej. `manualFields`), ausente. */
function objeto(t: Tabla, r: Registro): Row {
  const o: Record<string, unknown> = {};
  for (const c of t.columnas) {
    const v = r[c.columna];
    if (!c.json) o[c.clave] = v;
    else if (v !== null) o[c.clave] = JSON.parse(String(v));
  }
  if (r.extra !== null && r.extra !== undefined) Object.assign(o, JSON.parse(String(r.extra)));
  return o as Row;
}

function aplicarFilas(db: DatabaseSync, t: Tabla, cambio: RowChange) {
  if (cambio.replace) db.exec(`DELETE FROM ${t.nombre}`);
  const borrar = db.prepare(`DELETE FROM ${t.nombre} WHERE id = ?`);
  for (const id of cambio.remove) borrar.run(id);

  const columnas = [...t.columnas.map((c) => c.columna), 'position', 'extra'];
  const actualizar = columnas.filter((c) => c !== 'id' && c !== 'position').map((c) => `${c} = excluded.${c}`);
  const guardar = db.prepare(
    `INSERT INTO ${t.nombre} (${columnas.join(', ')}) VALUES (${columnas.map(() => '?').join(', ')}) ` +
      `ON CONFLICT (id) DO UPDATE SET ${actualizar.join(', ')}`,
  );
  let siguiente = Number((db.prepare(`SELECT COALESCE(MAX(position), -1) + 1 AS p FROM ${t.nombre}`).get() as Registro).p);
  for (const fila of cambio.upsert) guardar.run(...parametros(t, fila, siguiente++));

  if (cambio.order) {
    const posicion = db.prepare(`UPDATE ${t.nombre} SET position = ? WHERE id = ?`);
    cambio.order.forEach((id, i) => posicion.run(i, id));
  }
}

export interface StoreCounts {
  leagues: number;
  matches: number;
  fixtures: number;
}

function contar(db: DatabaseSync): StoreCounts {
  const n = (tabla: string) => Number((db.prepare(`SELECT COUNT(*) AS n FROM ${tabla}`).get() as Registro).n);
  return { leagues: n('leagues'), matches: n('matches'), fixtures: n('fixtures') };
}

function aplicarParche(db: DatabaseSync, p: StorePatch): StoreCounts {
  if (p.leagues) aplicarFilas(db, LEAGUES, { upsert: p.leagues, remove: [], order: p.leagues.map((l) => l.id), replace: true });
  if (p.matches) aplicarFilas(db, MATCHES, p.matches);
  if (p.fixtures) aplicarFilas(db, FIXTURES, p.fixtures);

  if (p.teamAliases) {
    db.exec('DELETE FROM team_aliases');
    const alias = db.prepare('INSERT OR REPLACE INTO team_aliases (league_id, provider_name, canonical) VALUES (?, ?, ?)');
    for (const [liga, nombres] of Object.entries(p.teamAliases)) {
      for (const [nombre, canonico] of Object.entries(nombres ?? {})) alias.run(liga, nombre, String(canonico));
    }
  }
  if (p.identityAliases) {
    db.exec('DELETE FROM identity_aliases');
    const alias = db.prepare('INSERT OR REPLACE INTO identity_aliases (name, espn_id) VALUES (?, ?)');
    for (const [nombre, espnId] of Object.entries(p.identityAliases)) alias.run(nombre, String(espnId));
  }

  // La clave de football-data.org no va con los ajustes, que vuelven al navegador: se guarda aparte y la añade el proxy.
  const { apiKey, ...ajustes } = p.settings ?? {};
  if (typeof apiKey === 'string' && apiKey.trim() && !footballDataKey(db)) guardarClave(db, apiKey.trim());
  const ajuste = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value');
  for (const [clave, valor] of Object.entries(ajustes)) ajuste.run(clave, JSON.stringify(valor));
  const quitar = db.prepare('DELETE FROM settings WHERE key = ?');
  for (const clave of p.removeSettings ?? []) quitar.run(clave);

  fijarMeta(db, 'persist_version', String(p.version));
  const n = contar(db);
  // Hasta que no entra algún dato, la base está «sin estrenar»: así una pestaña vacía no tapa la copia del navegador.
  if (!leerMeta(db, 'initialized_at') && n.leagues + n.matches + n.fixtures > 0) fijarMeta(db, 'initialized_at', new Date().toISOString());
  return n;
}

/** Aplica un parche en una transacción y devuelve cuántas filas quedan. */
export const applyPatch = (db: DatabaseSync, p: StorePatch): StoreCounts => transaccion(db, () => aplicarParche(db, p));

/** El estado guardado, o `value: null` si la base aún no tiene datos. */
export function readStore(db: DatabaseSync): { value: PersistedValue | null; initialized: boolean } {
  const initialized = leerMeta(db, 'initialized_at') !== null;
  const version = leerMeta(db, 'persist_version');
  if (!initialized || version === null) return { value: null, initialized };

  const state: Record<string, unknown> = {};
  for (const r of db.prepare('SELECT key, value FROM settings').all() as Registro[]) state[String(r.key)] = JSON.parse(String(r.value));
  for (const t of TABLAS) {
    state[t.nombre] = (db.prepare(`SELECT * FROM ${t.nombre} ORDER BY position`).all() as Registro[]).map((r) => objeto(t, r));
  }
  const alias: Record<string, Record<string, string>> = {};
  for (const r of db.prepare('SELECT league_id, provider_name, canonical FROM team_aliases').all() as Registro[]) {
    (alias[String(r.league_id)] ??= {})[String(r.provider_name)] = String(r.canonical);
  }
  state.teamAliases = alias;
  state.identityAliases = Object.fromEntries(
    (db.prepare('SELECT name, espn_id FROM identity_aliases').all() as Registro[]).map((r) => [String(r.name), String(r.espn_id)]),
  );
  return { value: { state, version: Number(version) }, initialized };
}

const CLAVE_FOOTBALL_DATA = 'football-data.org';

/** Clave de football-data.org, solo para el servidor: ni `readStore` ni ninguna ruta la devuelven. */
export function footballDataKey(db: DatabaseSync): string | null {
  const r = db.prepare('SELECT value FROM server_secrets WHERE key = ?').get(CLAVE_FOOTBALL_DATA) as Registro | undefined;
  return r ? String(r.value) : null;
}

function guardarClave(db: DatabaseSync, valor: string | null) {
  if (!valor) {
    db.prepare('DELETE FROM server_secrets WHERE key = ?').run(CLAVE_FOOTBALL_DATA);
    return;
  }
  db.prepare(
    'INSERT INTO server_secrets (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
  ).run(CLAVE_FOOTBALL_DATA, valor, new Date().toISOString());
}

/** `/api/football-data/key`: GET dice si hay clave (nunca cuál), POST la guarda y DELETE la quita. */
export function handleFootballDataKeyRequest(db: DatabaseSync, method: string, body: unknown): { status: number; body: unknown } {
  if (method === 'GET') return { status: 200, body: { configured: footballDataKey(db) !== null } };
  if (method === 'DELETE') {
    guardarClave(db, null);
    return { status: 200, body: { configured: false } };
  }
  if (method !== 'POST') return { status: 405, body: { error: 'Usa GET, POST o DELETE.' } };
  const clave = esObjeto(body) && esTexto(body.key) ? body.key.trim() : '';
  if (!clave || clave.length > 200) return { status: 400, body: { error: 'Escribe la clave de football-data.org.' } };
  guardarClave(db, clave);
  return { status: 200, body: { configured: true } };
}

const esObjeto = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const esTexto = (x: unknown): x is string => typeof x === 'string';
const listaDe = <T>(x: unknown, f: (y: unknown) => y is T): x is T[] => Array.isArray(x) && x.every(f);

const esPersistido = (v: unknown): v is PersistedValue => esObjeto(v) && esObjeto(v.state);

/**
 * Copia única del `localStorage` del navegador. Guarda el texto original en `storage_backups` y no hace nada si la
 * base ya tiene datos (otra pestaña llegó antes): nunca sobrescribe. `null` en ese caso.
 */
export function importFromBrowser(db: DatabaseSync, raw: string): StoreCounts | null {
  const valor: unknown = JSON.parse(raw);
  if (!esPersistido(valor)) throw new TypeError('La copia del navegador no tiene el formato esperado.');
  return transaccion(db, () => {
    if (leerMeta(db, 'initialized_at')) return null;
    const ahora = new Date().toISOString();
    db.prepare('INSERT INTO storage_backups (source, created_at, payload) VALUES (?, ?, ?)').run('localStorage:analisis-futbol', ahora, raw);
    const n = aplicarParche(db, diffStore(null, valor).patch!);
    fijarMeta(db, 'migrated_from_local_storage_at', ahora);
    // Un navegador sin datos también queda migrado: no se vuelve a copiar.
    if (!leerMeta(db, 'initialized_at')) fijarMeta(db, 'initialized_at', ahora);
    return n;
  });
}

/** Borra los datos (no las copias de seguridad). La base sigue estrenada: no se vuelve a copiar del navegador. */
export function clearStore(db: DatabaseSync): StoreCounts {
  return transaccion(db, () => {
    db.exec('DELETE FROM leagues; DELETE FROM matches; DELETE FROM fixtures; DELETE FROM team_aliases; DELETE FROM identity_aliases; DELETE FROM settings;');
    return contar(db);
  });
}

const esCambio = (x: unknown): x is RowChange =>
  esObjeto(x) &&
  listaDe(x.upsert, esFila) &&
  listaDe(x.remove, esTexto) &&
  (x.order === undefined || listaDe(x.order, esTexto)) &&
  (x.replace === undefined || typeof x.replace === 'boolean');

export function isStorePatch(v: unknown): v is StorePatch {
  return (
    esObjeto(v) &&
    typeof v.version === 'number' &&
    (v.leagues === undefined || listaDe(v.leagues, esFila)) &&
    (v.matches === undefined || esCambio(v.matches)) &&
    (v.fixtures === undefined || esCambio(v.fixtures)) &&
    (v.teamAliases === undefined || (esObjeto(v.teamAliases) && Object.values(v.teamAliases).every(esObjeto))) &&
    (v.identityAliases === undefined || esObjeto(v.identityAliases)) &&
    (v.settings === undefined || esObjeto(v.settings)) &&
    (v.removeSettings === undefined || listaDe(v.removeSettings, esTexto))
  );
}

/**
 * `/api/store`: GET lee, POST aplica un parche, DELETE vacía y POST `/migrate` copia el `localStorage`. Sin HTTP
 * dentro, para que las pruebas lo llamen igual que el servidor.
 */
export function handleStoreRequest(db: DatabaseSync, method: string, path: string, body: unknown): Respuesta {
  try {
    if (path === '/migrate') {
      if (method !== 'POST') return { status: 405, body: { error: 'Usa POST.' } };
      const raw = esObjeto(body) ? body.raw : undefined;
      if (!esTexto(raw)) return { status: 400, body: { error: 'Falta la copia del navegador.' } };
      const counts = importFromBrowser(db, raw);
      return counts
        ? { status: 200, body: { counts } }
        : { status: 409, body: { error: 'La base de datos ya tiene datos: no se sobrescriben con los del navegador.' } };
    }
    if (path !== '/' && path !== '') return { status: 404, body: { error: 'Ruta desconocida.' } };
    // Ya serializado: es el cuerpo grande y el caché lo guarda hecho. Ver `readStoreJson`.
    if (method === 'GET') return { status: 200, texto: readStoreJson(db) };
    if (method === 'POST') {
      if (!isStorePatch(body)) return { status: 400, body: { error: 'Cambios con un formato no válido.' } };
      return { status: 200, body: { counts: applyPatch(db, body) } };
    }
    if (method === 'DELETE') return { status: 200, body: { counts: clearStore(db) } };
    return { status: 405, body: { error: 'Usa GET, POST o DELETE.' } };
  } catch (e) {
    return { status: 500, body: { error: (e as Error).message } };
  }
}
