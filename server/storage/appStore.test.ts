import { describe, expect, it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import {
  applyPatch,
  clearStore,
  footballDataKey,
  handleFootballDataKeyRequest,
  handleStoreRequest,
  importFromBrowser,
  openStore,
  readStore,
} from './appStore.ts';
import { diffStore, type PersistedValue } from '../../src/store/storeSync.ts';

const LIGA = {
  id: 'LaLiga', country: 'Espana', name: 'LaLiga', confederation: 'UEFA', season: '2026/27', calendarFormat: 'Agosto-Mayo',
  teamCount: 20, regularSeasonRounds: '38', approximateStartDate: '2026-08-15', source: 'laliga.com', reliabilityNotes: null,
};

const PARTIDO = {
  id: 'p:fotmob:1', providerId: 'fotmob:1', leagueId: 'LaLiga', country: 'Espana', season: '2026/27', date: '2026-09-13',
  kickoffTime: '21:00', round: 5, homeTeamId: 'LaLiga|Real Madrid', awayTeamId: 'LaLiga|Getafe', homeTeamName: 'Real Madrid',
  awayTeamName: 'Getafe', homeGoals: 2, awayGoals: 1, homeFirstHalfGoals: 1, awayFirstHalfGoals: 0, shotsHome: 17, shotsAway: 6,
  shotsOnTargetHome: 7, shotsOnTargetAway: 2, possessionHome: 0.64, cornersHome: 8, cornersAway: 2, yellowCardsHome: 1,
  yellowCardsAway: 3, redCardsHome: 0, redCardsAway: null, foulsHome: 9, foulsAway: 14, offsidesHome: 2, offsidesAway: 1,
  xGHome: 2.31, xGAway: 0.44, source: 'laliga.com', updatedAt: '2026-09-14T10:00:00.000Z', statsSource: 'laliga.com + FotMob',
  statsUpdatedAt: '2026-09-14T10:00:00.000Z', statsCitations: ['https://www.laliga.com/partido/x'], homeTeamRef: 'espn-86',
  awayTeamRef: null, manualFields: ['xGAway'],
};

const PENDIENTE = {
  id: 'LaLiga|2026/27|2026-09-20|Getafe|Real Madrid', providerId: null, leagueId: 'LaLiga', country: 'Espana', season: '2026/27',
  date: '2026-09-20', kickoffTime: null, round: 6, homeTeamId: 'LaLiga|Getafe', awayTeamId: 'LaLiga|Real Madrid',
  homeTeamName: 'Getafe', awayTeamName: 'Real Madrid', status: 'Programado', source: 'laliga.com', homeTeamRef: null, awayTeamRef: 'espn-86',
};

/** Lo que había en `localStorage`: con un partido antiguo sin `manualFields` y con una clave que ya no existe. */
const NAVEGADOR: PersistedValue = {
  state: {
    leagues: [LIGA],
    matches: [PARTIDO, { ...PARTIDO, id: 'antiguo', manualFields: undefined, legado: { campo: 'de otra versión' } }],
    fixtures: [PENDIENTE],
    params: { wBase: 0.45, kShrink: 5, xgMissingMode: 'documented' },
    seasonIds: {},
    fixtureHorizon: 1,
    apiKey: 'clave-secreta',
    teamAliases: { LaLiga: { 'real madrid cf': 'Real Madrid' } },
    identityAliases: { marsella: '176' },
    lastUpdate: '2026-09-14T10:00:00.000Z',
    importIssues: [],
    updateLog: [{ leagueId: 'LaLiga', ok: true, notes: ['2 partidos'] }],
  },
  version: 4,
};
const RAW = JSON.stringify(NAVEGADOR);
const copias = (db: DatabaseSync) => db.prepare('SELECT payload FROM storage_backups').all().map((r) => r.payload);

describe('almacén SQLite', () => {
  it('copia el navegador sin perder nada y guarda el texto original', () => {
    const db = openStore(':memory:');
    expect(importFromBrowser(db, RAW)).toEqual({ leagues: 1, matches: 2, fixtures: 1 });
    const { apiKey, ...sinClave } = NAVEGADOR.state;
    expect(apiKey).toBe('clave-secreta');
    expect(readStore(db)).toEqual({ value: { version: 4, state: JSON.parse(JSON.stringify(sinClave)) }, initialized: true });
    expect(copias(db)).toEqual([RAW]);
  });

  it('la clave de football-data.org se queda en el servidor y nunca vuelve con los datos', () => {
    const db = openStore(':memory:');
    importFromBrowser(db, RAW);
    expect(readStore(db).value?.state).not.toHaveProperty('apiKey');
    expect(footballDataKey(db)).toBe('clave-secreta');
    expect(handleFootballDataKeyRequest(db, 'GET', null)).toEqual({ status: 200, body: { configured: true } });
    expect(handleFootballDataKeyRequest(db, 'POST', { key: '  otra  ' }).status).toBe(200);
    expect(footballDataKey(db)).toBe('otra');
    expect(handleFootballDataKeyRequest(db, 'POST', { key: ' ' }).status).toBe(400);
    expect(handleFootballDataKeyRequest(db, 'DELETE', null).body).toEqual({ configured: false });
    expect(footballDataKey(db)).toBeNull();
  });

  it('no copia dos veces ni pisa lo que ya hay', () => {
    const db = openStore(':memory:');
    importFromBrowser(db, RAW);
    expect(importFromBrowser(db, JSON.stringify({ state: { matches: [] }, version: 4 }))).toBeNull();
    expect(handleStoreRequest(db, 'POST', '/migrate', { raw: RAW }).status).toBe(409);
    expect(readStore(db).value?.state.matches).toHaveLength(2);
    expect(copias(db)).toHaveLength(1);
  });

  it('un parche solo toca lo que cambió y respeta el orden', () => {
    const db = openStore(':memory:');
    importFromBrowser(db, RAW);
    const guardado = readStore(db).value!;
    const [partido, antiguo] = guardado.state.matches as Record<string, unknown>[];
    const siguiente: PersistedValue = {
      version: 4,
      state: {
        ...guardado.state,
        matches: [antiguo, { ...partido, homeGoals: 3, manualFields: ['homeGoals'] }, { ...partido, id: 'nuevo', xGHome: null }],
        fixtures: [],
        fixtureHorizon: 2,
      },
    };
    const { patch } = diffStore(diffStore(null, guardado).snapshot, siguiente);
    expect(patch?.matches?.upsert.map((r) => r.id)).toEqual(['p:fotmob:1', 'nuevo']);
    expect(patch?.fixtures?.remove).toEqual([PENDIENTE.id]);
    expect(applyPatch(db, patch!)).toEqual({ leagues: 1, matches: 3, fixtures: 0 });
    expect(readStore(db).value).toEqual(siguiente);
  });

  it('una base sin estrenar no devuelve datos, y un estado vacío no la estrena', () => {
    const db = openStore(':memory:');
    expect(readStore(db)).toEqual({ value: null, initialized: false });
    applyPatch(db, diffStore(null, { state: { leagues: [], matches: [], fixtures: [] }, version: 4 }).patch!);
    expect(readStore(db).initialized).toBe(false);
    expect(importFromBrowser(db, RAW)).not.toBeNull();
  });

  it('vaciar borra los datos, conserva la copia y no vuelve a migrar', () => {
    const db = openStore(':memory:');
    importFromBrowser(db, RAW);
    expect(clearStore(db)).toEqual({ leagues: 0, matches: 0, fixtures: 0 });
    expect(readStore(db).initialized).toBe(true);
    expect(copias(db)).toHaveLength(1);
    expect(importFromBrowser(db, RAW)).toBeNull();
  });

  /*
   * El GET guarda lo leído para no rehacer 26.937 objetos en cada recarga. Lo que se comprueba aquí es que
   * se tira cuando toca: un caché que sirve datos viejos es peor que no tenerlo.
   */
  it('el GET devuelve lo guardado y no lo de antes del último cambio', () => {
    const db = openStore(':memory:');
    importFromBrowser(db, RAW);
    const partidos = (base: DatabaseSync) => {
      const r = handleStoreRequest(base, 'GET', '/', null);
      return (JSON.parse(r.texto!) as { value: PersistedValue }).value.state.matches as { id: string }[];
    };
    const leido = () => partidos(db);
    expect(leido()).toHaveLength(2);

    // Escribir invalida: el mismo GET ya ve el partido nuevo.
    applyPatch(db, { version: 4, matches: { upsert: [{ ...PARTIDO, id: 'p:fotmob:2' }], remove: [] } });
    expect(leido().map((m) => m.id)).toContain('p:fotmob:2');

    // Y vaciar también.
    clearStore(db);
    expect(leido()).toHaveLength(0);

    // Otra base no hereda el caché de la anterior.
    const otra = openStore(':memory:');
    importFromBrowser(otra, RAW);
    expect(partidos(otra)).toHaveLength(2);
    expect(leido()).toHaveLength(0);
  });

  it('rechaza cambios con formato no válido y rutas desconocidas', () => {
    const db = openStore(':memory:');
    expect(handleStoreRequest(db, 'POST', '/', { version: '4' }).status).toBe(400);
    expect(handleStoreRequest(db, 'POST', '/', { version: 4, matches: { upsert: [{ sinId: true }], remove: [] } }).status).toBe(400);
    expect(handleStoreRequest(db, 'GET', '/otra', null).status).toBe(404);
  });
});
