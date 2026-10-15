import { describe, expect, it } from 'vitest';
import { applyStatsTxt, labelMatches, parseStatsTxt } from './statsTxt';
import { MATCH_DATA } from '../../domain/models/matchDataRules';
import type { League, Match } from '../../types';

/**
 * Lo que se prueba: que cargar un dato desde un .txt escriba solo donde debe. El emparejado por alias
 * («FC Salzburg» -> «Salzburg») y la comprobación del marcador son el motivo de que esto exista: sin
 * ellas, una línea de otro partido entraría como si fuera de este.
 */

const DATO = (id: string) => MATCH_DATA.find((d) => d.id === id)!;
const AHORA = '2026-10-12T00:00:00.000Z';

const LIGA: League = {
  id: 'Bundesliga Austria',
  country: 'Austria',
  name: 'Bundesliga Austria',
  confederation: 'UEFA',
  season: '2026/27',
  calendarFormat: '',
  teamCount: 12,
  regularSeasonRounds: null,
  approximateStartDate: null,
  source: null,
  reliabilityNotes: null,
};

const partido = (date: string, home: string, away: string, hg: number, ag: number, extra: Partial<Match> = {}): Match =>
  ({
    id: `${LIGA.id}|2025-26|${date}|${home}|${away}`,
    providerId: null,
    leagueId: LIGA.id,
    country: LIGA.country,
    season: '2025-26',
    date,
    round: 1,
    homeTeamId: `${LIGA.id}|${home}`,
    awayTeamId: `${LIGA.id}|${away}`,
    homeTeamName: home,
    awayTeamName: away,
    homeGoals: hg,
    awayGoals: ag,
    homeFirstHalfGoals: null,
    awayFirstHalfGoals: null,
    shotsHome: null,
    shotsAway: null,
    shotsOnTargetHome: null,
    shotsOnTargetAway: null,
    possessionHome: null,
    cornersHome: null,
    cornersAway: null,
    yellowCardsHome: null,
    yellowCardsAway: null,
    redCardsHome: null,
    redCardsAway: null,
    foulsHome: null,
    foulsAway: null,
    offsidesHome: null,
    offsidesAway: null,
    xGHome: null,
    xGAway: null,
    source: null,
    updatedAt: null,
    statsSource: null,
    statsUpdatedAt: null,
    statsCitations: [],
    ...extra,
  }) as Match;

/** Tal cual salen del archivo que trajo este caso, con su cabecera y su separador. */
const TXT = `REGISTRO COMPLETO DE GOLES ESPERADOS (xG) - BUNDESLIGA AUSTRÍACA
======================================================================
Fecha: 2025-05-24 | SK Sturm Graz 1-1 Wolfsberger AC              | xG: 1.42 - 1.35
Fecha: 2025-05-24 | FC Salzburg 4-2 SK Rapid Wien                 | xG: 2.89 - 1.64
`;

const correr = (matches: Match[], text: string, datumId = 'xg') =>
  applyStatsTxt({ matches, target: new Set(matches.map((m) => m.id)), leagues: [LIGA], datum: DATO(datumId), text, now: AHORA });

describe('parseStatsTxt', () => {
  it('lee las líneas de partido y cuenta las que no lo son', () => {
    const r = parseStatsTxt(TXT);
    expect(r.rows).toHaveLength(2);
    expect(r.ignored).toBe(2); // la cabecera y los «====»
    expect(r.label).toBe('xG');
    expect(r.rows[0]).toEqual({
      date: '2025-05-24',
      home: 'SK Sturm Graz',
      away: 'Wolfsberger AC',
      homeGoals: 1,
      awayGoals: 1,
      label: 'xG',
      values: [1.42, 1.35],
    });
  });

  it('un número en el nombre del club no se confunde con el marcador', () => {
    const r = parseStatsTxt('Fecha: 2025-03-01 | Bayer 04 Leverkusen 2-1 Mainz 05 | xG: 1.80 - 0.95');
    expect(r.rows[0].home).toBe('Bayer 04 Leverkusen');
    expect(r.rows[0].away).toBe('Mainz 05');
    expect([r.rows[0].homeGoals, r.rows[0].awayGoals]).toEqual([2, 1]);
  });
});

describe('labelMatches', () => {
  it('acepta el nombre corto y el largo del mismo dato', () => {
    expect(labelMatches('xG', DATO('xg'))).toBe(true);
    expect(labelMatches('Tarjetas rojas', DATO('redCards'))).toBe(true);
    expect(labelMatches('Rojas', DATO('redCards'))).toBe(true);
    expect(labelMatches('Córners', DATO('corners'))).toBe(true);
  });

  it('rechaza un archivo de otro dato', () => {
    expect(labelMatches('xG', DATO('corners'))).toBe(false);
  });
});

describe('applyStatsTxt', () => {
  it('encuentra el partido aunque el archivo escriba el club de otra forma', () => {
    // El archivo dice «SK Sturm Graz» y «FC Salzburg»; la base, «Sturm Graz» y «Salzburg».
    const ms = [partido('2025-05-24', 'Sturm Graz', 'Wolfsberger AC', 1, 1), partido('2025-05-24', 'Salzburg', 'SK Rapid Wien', 4, 2)];
    const r = correr(ms, TXT);
    expect(r.error).toBeNull();
    expect(r.written).toBe(2);
    expect([r.matches[0].xGHome, r.matches[0].xGAway]).toEqual([1.42, 1.35]);
    expect([r.matches[1].xGHome, r.matches[1].xGAway]).toEqual([2.89, 1.64]);
    expect(r.matches[0].manualFields).toEqual(['xGHome', 'xGAway']);
  });

  /*
   * «SK Rapid Wien» (libro histórico) y «Rapid Wien» (fuente en vivo) son el mismo club, y el 12/10/2026
   * los dos entraron en `teamAliasSeed`. Antes de eso el emparejado fallaba aquí, así que esta prueba
   * vigila el alias: si alguien lo quita, se ve.
   */
  it('empareja el nombre largo del libro histórico con el corto de la base', () => {
    const ms = [partido('2025-05-24', 'Salzburg', 'Rapid Wien', 4, 2)];
    const r = correr(ms, 'Fecha: 2025-05-24 | FC Salzburg 4-2 SK Rapid Wien | xG: 2.89 - 1.64');
    expect(r.written).toBe(1);
    expect(r.matches[0].xGHome).toBe(2.89);
  });

  /*
   * El límite del emparejado, dicho aquí para que nadie lo descubra en producción: se apoya en
   * `sameClub`, que solo sabe de los clubes del catálogo. Lo importante es que un club que no reconoce
   * NO escribe nada en el partido equivocado: la línea cae en `notFound` y el aviso lo dice.
   */
  it('una línea cuyo club no resuelve el catálogo se cuenta, no se adivina', () => {
    const ms = [partido('2025-05-24', 'Salzburg', 'Rapid Wien', 4, 2)];
    const r = correr(ms, 'Fecha: 2025-05-24 | Club Inventado 4-2 Otro Club Inventado | xG: 2.89 - 1.64');
    expect(r.written).toBe(0);
    expect(r.notFound).toBe(1);
    expect(ms[0].xGHome).toBeNull();
  });

  it('no escribe una línea cuyo marcador no cuadra', () => {
    const ms = [partido('2025-05-24', 'Sturm Graz', 'Wolfsberger AC', 3, 0)];
    const r = correr(ms, TXT);
    expect(r.written).toBe(0);
    expect(r.wrongScore).toBe(1);
    expect(r.matches[0].xGHome).toBeNull();
  });

  it('no sale de los partidos que se están viendo', () => {
    const dentro = partido('2025-05-24', 'Sturm Graz', 'Wolfsberger AC', 1, 1);
    const fuera = partido('2025-05-24', 'Salzburg', 'Rapid Wien', 4, 2);
    const r = applyStatsTxt({
      matches: [dentro, fuera],
      target: new Set([dentro.id]),
      leagues: [LIGA],
      datum: DATO('xg'),
      text: TXT,
      now: AHORA,
    });
    expect(r.written).toBe(1);
    expect(r.notFound).toBe(1);
    expect(r.matches[1].xGHome).toBeNull();
  });

  it('no pisa el dato que ya estaba', () => {
    const ms = [partido('2025-05-24', 'Sturm Graz', 'Wolfsberger AC', 1, 1, { xGHome: 0.9, xGAway: 0.8 })];
    const r = correr(ms, TXT);
    expect(r.written).toBe(0);
    expect(r.already).toBe(1);
    expect(r.matches[0].xGHome).toBe(0.9);
  });

  it('se niega entero si el archivo habla de otro dato', () => {
    const ms = [partido('2025-05-24', 'Sturm Graz', 'Wolfsberger AC', 1, 1)];
    const r = correr(ms, TXT, 'corners');
    expect(r.error).toContain('xG');
    expect(r.written).toBe(0);
  });

  it('avisa cuando ninguna línea tiene el formato', () => {
    const r = correr([partido('2025-05-24', 'Sturm Graz', 'Wolfsberger AC', 1, 1)], 'Sturm Graz 1-1 Wolfsberger AC xG 1.42 1.35');
    expect(r.error).toContain('formato');
    expect(r.written).toBe(0);
  });

  it('rechaza un valor imposible para ese dato', () => {
    const ms = [partido('2025-05-24', 'Sturm Graz', 'Wolfsberger AC', 1, 1)];
    const r = correr(ms, 'Fecha: 2025-05-24 | SK Sturm Graz 1-1 Wolfsberger AC | xG: 44.0 - 1.35');
    expect(r.written).toBe(0);
    expect(r.rejected).toBe(1);
  });

  it('la posesión del archivo viene en % y se guarda en fracción', () => {
    const ms = [partido('2025-05-24', 'Sturm Graz', 'Wolfsberger AC', 1, 1)];
    const r = correr(ms, 'Fecha: 2025-05-24 | SK Sturm Graz 1-1 Wolfsberger AC | Posesión: 54.7 - 45.3', 'possession');
    expect(r.written).toBe(1);
    expect(r.matches[0].possessionHome).toBeCloseTo(0.547, 6);
  });
});
