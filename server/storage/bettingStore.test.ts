import { describe, expect, it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { openStore } from './appStore.ts';
import { clearBetting, handleBettingRequest, importBettingFromBrowser, readBetting, writeBetting } from './bettingStore.ts';

const movimiento = (id: string, type: string, amount: number) => ({
  id, cycle: 1, at: '2026-09-13T10:00:00.000Z', type, amount, balanceAfter: 1000 + amount, betId: null, note: '',
});

const RIESGO = { score: 40, level: 'medio', components: { datos: 10, modelo: 10, mercado: 10, varianza: 10, correlacion: 0 }, notes: [] };

const PICK = {
  id: 'pick-1', fixtureId: 'f1', providerId: null, leagueId: 'LaLiga', season: '2026/27', date: '2026-09-20', kickoffTime: '21:00',
  round: 6, homeTeamId: 'LaLiga|Getafe', awayTeamId: 'LaLiga|Real Madrid', homeTeamName: 'Getafe', awayTeamName: 'Real Madrid',
  cycle: 1, createdAt: '2026-09-14T09:00:00.000Z', selection: { market: 'goles', side: 'over', line: 2.5 }, odds: 1.9,
  probability: 0.58, impliedProbability: 0.526, edge: 0.054, fairOdds: 1.72, expectedValue: 0.1, kellyFull: 0.11,
  kellyMultiplier: 0.5, stakeFraction: 0.02, confidence: 0.7, dataQuality: 'media', risk: RIESGO, explanation: ['Over 2.5'],
  stake: 20, bankrollBefore: 1000, status: 'pendiente', settledAt: null, matchId: null, resultNote: null, grossReturn: null,
  netProfit: null, bankrollAfter: null,
};

const TICKET = {
  id: 'ticket-1', number: 1, cycle: 1, createdAt: '2026-09-14T09:05:00.000Z',
  legs: [{ fixtureId: 'f3', selection: { market: 'btts', outcome: 'si' }, odds: 1.8, probability: 0.55, status: 'ganado', matchId: 'p:1', resultNote: 'Ambos marcan' }],
  combinedOdds: 1.8, probability: 0.55, probabilityLow: 0.55, probabilityHigh: 0.55, method: 'exacta', kellyProbability: 0.55,
  kellyFull: 0.05, stake: 10, bankrollBefore: 980, risk: RIESGO, status: 'ganado', settledAt: '2026-09-15T00:00:00.000Z',
  settledOdds: 1.8, grossReturn: 18, netProfit: 8, bankrollAfter: 988,
};

const PERFIL = {
  id: 'perfil-1', name: 'Mi perfil', createdAt: '2026-09-13T10:00:00.000Z', settings: { currencyName: 'Moneda', coinValue: 30 }, cycle: 1,
  movements: [movimiento('m1', 'inicial', 1000), movimiento('m2', 'stake', -20)], picks: [PICK], tickets: [TICKET], ticketCounter: 1,
  ticketDraft: [{ fixtureId: 'f2', selection: { market: 'btts', outcome: 'si' }, odds: null }], deOtraVersion: { campo: true },
};

/** Lo que había en IndexedDB, con la forma que guarda zustand. */
const NAVEGADOR = {
  state: { profiles: { 'perfil-1': PERFIL }, activeProfileId: 'perfil-1', modelValidation: { at: '2026-09-13T12:00:00.000Z', leagues: 19, markets: {} } },
  version: 3,
};
const RAW = JSON.stringify(NAVEGADOR);
const copias = (db: DatabaseSync) => db.prepare("SELECT payload FROM storage_backups WHERE source LIKE 'indexeddb:%'").all();

describe('picks y bankroll en SQLite', () => {
  it('copia IndexedDB sin perder nada, con cada pick en su fila', () => {
    const db = openStore(':memory:');
    expect(importBettingFromBrowser(db, RAW)).toEqual({ profiles: 1, movements: 2, picks: 1, tickets: 1 });
    expect(readBetting(db)).toEqual({ value: NAVEGADOR, initialized: true });
    expect(db.prepare('SELECT market, stake, status FROM betting_picks').all()).toEqual([{ market: 'goles', stake: 20, status: 'pendiente' }]);
    expect(copias(db)).toHaveLength(1);
  });

  it('una lista sin ids viaja dentro del perfil, y dos perfiles pueden repetir id de pick', () => {
    const db = openStore(':memory:');
    const valor = {
      state: {
        profiles: {
          a: { id: 'a', name: 'A', movements: [{ amount: 5 }], picks: [PICK], tickets: [] },
          b: { id: 'b', name: 'B', movements: [], picks: [PICK], tickets: [] },
        },
        activeProfileId: 'b',
      },
      version: 3,
    };
    expect(writeBetting(db, valor)).toEqual({ profiles: 2, movements: 0, picks: 2, tickets: 0 });
    expect(readBetting(db).value).toEqual(valor);
  });

  it('el perfil recién creado no estrena la base', () => {
    const db = openStore(':memory:');
    writeBetting(db, { state: { profiles: { p: { id: 'p', movements: [movimiento('m1', 'inicial', 1000)], picks: [], tickets: [] } } }, version: 3 });
    expect(readBetting(db)).toEqual({ value: null, initialized: false });
    expect(importBettingFromBrowser(db, RAW)).not.toBeNull();
  });

  it('no copia dos veces, y vaciar conserva la copia', () => {
    const db = openStore(':memory:');
    importBettingFromBrowser(db, RAW);
    expect(importBettingFromBrowser(db, RAW)).toBeNull();
    expect(handleBettingRequest(db, 'POST', '/migrate', { raw: RAW }).status).toBe(409);
    expect(clearBetting(db)).toEqual({ profiles: 0, movements: 0, picks: 0, tickets: 0 });
    expect(readBetting(db)).toEqual({ value: { state: { profiles: {} }, version: 3 }, initialized: true });
    expect(copias(db)).toHaveLength(1);
  });

  it('rechaza un formato no válido y rutas desconocidas', () => {
    const db = openStore(':memory:');
    expect(handleBettingRequest(db, 'POST', '/', { state: 3 }).status).toBe(400);
    expect(handleBettingRequest(db, 'GET', '/otra', null).status).toBe(404);
  });
});
