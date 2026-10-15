/**
 * Picks, tickets y bankroll virtual en SQLite, en la misma base que los datos (antes vivían en el IndexedDB del
 * navegador).
 *
 * Cada perfil, movimiento, pick y ticket es una fila con las columnas por las que se consulta (perfil, fecha, estado,
 * mercado, cuota, stake) y el objeto completo en `data`, así que nada se pierde aunque cambie su forma. Son pocos
 * datos: cada escritura sustituye todo en una transacción.
 */
import type { DatabaseSync, SQLOutputValue } from 'node:sqlite';
import { fijarMeta, leerMeta, transaccion } from './appStore.ts';
import { bettingHasData } from '../../src/store/storeSync.ts';

type Registro = Record<string, SQLOutputValue>;
type Objeto = Record<string, unknown>;

export interface BettingValue {
  state: Objeto;
  version?: number;
}

export interface BettingCounts {
  profiles: number;
  movements: number;
  picks: number;
  tickets: number;
}

const esObjeto = (x: unknown): x is Objeto => typeof x === 'object' && x !== null && !Array.isArray(x);
const numero = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const texto = (v: unknown) => (typeof v === 'string' ? v : null);
const esValor = (v: unknown): v is BettingValue => esObjeto(v) && esObjeto(v.state);

type ConId = Objeto & { id: string };

/** Una lista va a su tabla solo si cada elemento tiene id propio y único; si no, se guarda tal cual dentro del perfil. */
function separable(v: unknown): v is ConId[] {
  if (!Array.isArray(v)) return false;
  const ids = new Set<string>();
  for (const x of v) {
    if (!esObjeto(x) || typeof x.id !== 'string' || ids.has(x.id)) return false;
    ids.add(x.id);
  }
  return true;
}

const LISTAS = ['movements', 'picks', 'tickets'] as const;

function contar(db: DatabaseSync): BettingCounts {
  const n = (tabla: string) => Number((db.prepare(`SELECT COUNT(*) AS n FROM ${tabla}`).get() as Registro).n);
  return { profiles: n('betting_profiles'), movements: n('betting_movements'), picks: n('betting_picks'), tickets: n('betting_tickets') };
}

function escribir(db: DatabaseSync, valor: BettingValue): BettingCounts {
  db.exec('DELETE FROM betting_profiles; DELETE FROM betting_movements; DELETE FROM betting_picks; DELETE FROM betting_tickets; DELETE FROM betting_settings;');
  const perfil = db.prepare('INSERT INTO betting_profiles (id, position, name, created_at, cycle, data) VALUES (?, ?, ?, ?, ?, ?)');
  const movimiento = db.prepare(
    'INSERT INTO betting_movements (profile_id, id, position, cycle, at, type, amount, balance_after, bet_id, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  );
  const pick = db.prepare(
    'INSERT INTO betting_picks (profile_id, id, position, cycle, created_at, league_id, fixture_id, market, odds, stake, status, settled_at, net_profit, data) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  );
  const ticket = db.prepare(
    'INSERT INTO betting_tickets (profile_id, id, position, number, cycle, created_at, combined_odds, stake, status, settled_at, net_profit, data) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  );

  const vistos = new Set<string>();
  const perfiles = Object.values(esObjeto(valor.state.profiles) ? valor.state.profiles : {}).filter(
    (p): p is ConId => esObjeto(p) && typeof p.id === 'string' && !vistos.has(p.id) && Boolean(vistos.add(p.id)),
  );
  perfiles.forEach((p, i) => {
    const resto: Objeto = { ...p };
    for (const k of LISTAS) if (separable(p[k])) delete resto[k];
    perfil.run(p.id, i, texto(p.name), texto(p.createdAt), numero(p.cycle), JSON.stringify(resto));
    const { movements, picks, tickets } = p;
    if (separable(movements)) {
      movements.forEach((m, j) =>
        movimiento.run(p.id, m.id, j, numero(m.cycle), texto(m.at), texto(m.type), numero(m.amount), numero(m.balanceAfter), texto(m.betId), JSON.stringify(m)),
      );
    }
    if (separable(picks)) {
      picks.forEach((k, j) =>
        pick.run(
          p.id, k.id, j, numero(k.cycle), texto(k.createdAt), texto(k.leagueId), texto(k.fixtureId),
          esObjeto(k.selection) ? texto(k.selection.market) : null, numero(k.odds), numero(k.stake), texto(k.status),
          texto(k.settledAt), numero(k.netProfit), JSON.stringify(k),
        ),
      );
    }
    if (separable(tickets)) {
      tickets.forEach((t, j) =>
        ticket.run(
          p.id, t.id, j, numero(t.number), numero(t.cycle), texto(t.createdAt), numero(t.combinedOdds), numero(t.stake),
          texto(t.status), texto(t.settledAt), numero(t.netProfit), JSON.stringify(t),
        ),
      );
    }
  });

  const ajuste = db.prepare('INSERT INTO betting_settings (key, value) VALUES (?, ?)');
  for (const [clave, v] of Object.entries(valor.state)) if (clave !== 'profiles' && v !== undefined) ajuste.run(clave, JSON.stringify(v));

  fijarMeta(db, 'betting_version', String(valor.version ?? 0));
  // Un perfil recién creado no estrena la base: taparía la copia de IndexedDB que aún no se ha hecho.
  if (!leerMeta(db, 'betting_initialized_at') && bettingHasData(valor.state)) fijarMeta(db, 'betting_initialized_at', new Date().toISOString());
  return contar(db);
}

/** Sustituye todo en una transacción. */
export const writeBetting = (db: DatabaseSync, valor: BettingValue): BettingCounts => transaccion(db, () => escribir(db, valor));

/** Lo guardado, con los perfiles rearmados, o `value: null` si la base aún no tiene picks. */
export function readBetting(db: DatabaseSync): { value: BettingValue | null; initialized: boolean } {
  const initialized = leerMeta(db, 'betting_initialized_at') !== null;
  if (!initialized) return { value: null, initialized };

  const state: Objeto = {};
  for (const r of db.prepare('SELECT key, value FROM betting_settings').all() as Registro[]) state[String(r.key)] = JSON.parse(String(r.value));

  const hijos = Object.fromEntries(
    LISTAS.map((k) => {
      const porPerfil = new Map<string, unknown[]>();
      for (const r of db.prepare(`SELECT profile_id, data FROM betting_${k} ORDER BY profile_id, position`).all() as Registro[]) {
        const lista = porPerfil.get(String(r.profile_id));
        const fila = JSON.parse(String(r.data));
        if (lista) lista.push(fila);
        else porPerfil.set(String(r.profile_id), [fila]);
      }
      return [k, porPerfil];
    }),
  ) as Record<(typeof LISTAS)[number], Map<string, unknown[]>>;

  const profiles: Objeto = {};
  for (const r of db.prepare('SELECT id, data FROM betting_profiles ORDER BY position').all() as Registro[]) {
    const id = String(r.id);
    const perfil = JSON.parse(String(r.data)) as Objeto;
    for (const k of LISTAS) if (!(k in perfil)) perfil[k] = hijos[k].get(id) ?? [];
    profiles[id] = perfil;
  }
  state.profiles = profiles;
  return { value: { state, version: Number(leerMeta(db, 'betting_version') ?? 0) }, initialized };
}

/** Copia única de IndexedDB: guarda el texto original y no hace nada si la base ya tiene picks. */
export function importBettingFromBrowser(db: DatabaseSync, raw: string): BettingCounts | null {
  const valor: unknown = JSON.parse(raw);
  if (!esValor(valor)) throw new TypeError('La copia del navegador no tiene el formato esperado.');
  return transaccion(db, () => {
    if (leerMeta(db, 'betting_initialized_at')) return null;
    const ahora = new Date().toISOString();
    db.prepare('INSERT INTO storage_backups (source, created_at, payload) VALUES (?, ?, ?)').run('indexeddb:analisis-futbol-picks', ahora, raw);
    const n = escribir(db, valor);
    fijarMeta(db, 'betting_migrated_from_indexeddb_at', ahora);
    // Copiado aunque no tuviera picks: no se vuelve a copiar.
    if (!leerMeta(db, 'betting_initialized_at')) fijarMeta(db, 'betting_initialized_at', ahora);
    return n;
  });
}

/** Borra perfiles, picks, tickets y movimientos (no las copias). La base sigue estrenada. */
export function clearBetting(db: DatabaseSync): BettingCounts {
  return transaccion(db, () => {
    db.exec('DELETE FROM betting_profiles; DELETE FROM betting_movements; DELETE FROM betting_picks; DELETE FROM betting_tickets; DELETE FROM betting_settings;');
    return contar(db);
  });
}

/** `/api/betting`: GET lee, POST sustituye, DELETE vacía y POST `/migrate` copia IndexedDB una sola vez. */
export function handleBettingRequest(db: DatabaseSync, method: string, path: string, body: unknown): { status: number; body: unknown } {
  try {
    if (path === '/migrate') {
      if (method !== 'POST') return { status: 405, body: { error: 'Usa POST.' } };
      const raw = esObjeto(body) ? body.raw : undefined;
      if (typeof raw !== 'string') return { status: 400, body: { error: 'Falta la copia del navegador.' } };
      const counts = importBettingFromBrowser(db, raw);
      return counts
        ? { status: 200, body: { counts } }
        : { status: 409, body: { error: 'La base de datos ya tiene picks: no se sobrescriben con los del navegador.' } };
    }
    if (path !== '/' && path !== '') return { status: 404, body: { error: 'Ruta desconocida.' } };
    if (method === 'GET') return { status: 200, body: readBetting(db) };
    if (method === 'POST') {
      if (!esValor(body)) return { status: 400, body: { error: 'Picks con un formato no válido.' } };
      return { status: 200, body: { counts: writeBetting(db, body) } };
    }
    if (method === 'DELETE') return { status: 200, body: { counts: clearBetting(db) } };
    return { status: 405, body: { error: 'Usa GET, POST o DELETE.' } };
  } catch (e) {
    return { status: 500, body: { error: (e as Error).message } };
  }
}
