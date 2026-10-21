import { describe, expect, it } from 'vitest';
import type { Fixture, Match, MatchProjection, SplitStats } from '../../types';
import type { DataContext } from './evaluation';
import { selectionKey } from './markets';
import { leagueRates, selectModelPick } from './modelPick';
import { DEFAULT_RISK_SETTINGS } from './settings';

const FIXTURE = {
  id: 'f1',
  leagueId: 'Liga',
  homeTeamName: 'A',
  awayTeamName: 'B',
} as Fixture;

const PROY = {
  expectedGoalsHome: 1.6,
  expectedGoalsAway: 1.1,
  expectedGoalsTotal: 2.7,
  expectedCornersTotal: null,
  expectedCardsTotal: null,
  probs1x2: { home: 0.6, draw: 0.22, away: 0.18 },
} as unknown as MatchProjection;

const split = (played: number) => ({ played, corners: { sample: 0 }, cards: { sample: 0 } }) as SplitStats;
const datos = (played = 10): DataContext => ({ fixture: FIXTURE, projection: PROY, homeSplit: split(played), awaySplit: split(played), params: {} });

let n = 0;
/*
 * Un partido con marcador y SIN ningún conteo publicado, que es como llegan de la base: `null` explícito,
 * no el campo ausente. Con el campo ausente, `sumPair` suma `undefined` y devuelve `NaN` en vez de `null`,
 * y el partido contaría como fallado en vez de no contar.
 */
const partido = (homeGoals: number, awayGoals: number) =>
  ({
    id: `m${++n}`,
    leagueId: 'Liga',
    homeGoals,
    awayGoals,
    cornersHome: null,
    cornersAway: null,
    yellowCardsHome: null,
    yellowCardsAway: null,
    shotsHome: null,
    shotsAway: null,
    shotsOnTargetHome: null,
    shotsOnTargetAway: null,
    homeFirstHalfGoals: null,
    awayFirstHalfGoals: null,
  }) as Match;
/** 20 partidos: el local gana 8 (2-1), 6 empates (1-1) y el visitante gana 6 (1-2). */
const LIGA = [...Array(8)].map(() => partido(2, 1)).concat([...Array(6)].map(() => partido(1, 1)), [...Array(6)].map(() => partido(1, 2)));

/** 20 partidos de cada equipo en su condición: la confianza justa para el mínimo de 8/10. */
const pick = (played = 20, liga = LIGA) => selectModelPick({ data: datos(played), rates: leagueRates(liga), settings: DEFAULT_RISK_SETTINGS });

describe('Pick del modelo', () => {
  it('mide la frecuencia de cada mercado en la liga', () => {
    const r = leagueRates(LIGA);
    expect(r.get(selectionKey({ market: 'resultado', outcome: 'home' }))).toEqual({ rate: 0.4, n: 20 });
    expect(r.get(selectionKey({ market: 'doble', outcome: '1X' }))).toEqual({ rate: 0.7, n: 20 });
    // Sin tarjetas publicadas no hay frecuencia.
    expect(r.get(selectionKey({ market: 'tarjetas', side: 'over', line: 4.5 }))).toEqual({ rate: 0, n: 0 });
  });

  /*
   * Lo que fallaba: la frecuencia de tiros, tiros a puerta y los mercados por equipo se medía con el
   * MARCADOR, así que contaba los 20 partidos (ninguno con el dato) y daba 0 %. Como la ventaja es
   * probabilidad − frecuencia, esos mercados salían con +85 pp y se llevaban el pick.
   */
  it('un mercado de conteo sin el dato publicado no tiene frecuencia, ni siquiera 0 sobre los partidos jugados', () => {
    const r = leagueRates(LIGA);
    for (const sel of [
      { market: 'tarjetas', side: 'over', line: 3.5 },
      { market: 'conteoEquipo', stat: 'tiros', team: 'home', side: 'over', line: 12.5 },
      { market: 'conteoEquipo', stat: 'sot', team: 'home', side: 'under', line: 6.5 },
      { market: 'conteoEquipo', stat: 'tarjetas', team: 'away', side: 'over', line: 1.5 },
    ] as const) {
      expect(r.get(selectionKey(sel)), selectionKey(sel)).toEqual({ rate: 0, n: 0 });
    }
  });

  it('con el dato publicado, la frecuencia del conteo sale del dato y no del marcador', () => {
    // 10 partidos con 4 tiros a puerta del local y 10 con 8. «Under 6.5 del local» se da en la mitad.
    const conSot = [...Array(10)].map(() => ({ ...partido(1, 1), shotsOnTargetHome: 4, shotsOnTargetAway: 3, yellowCardsHome: 3, yellowCardsAway: 1 }) as Match).concat(
      [...Array(10)].map(() => ({ ...partido(1, 1), shotsOnTargetHome: 8, shotsOnTargetAway: 3, yellowCardsHome: 1, yellowCardsAway: 1 }) as Match),
    );
    const r = leagueRates(conSot);
    expect(r.get(selectionKey({ market: 'conteoEquipo', stat: 'sot', team: 'home', side: 'under', line: 6.5 }))).toEqual({ rate: 0.5, n: 20 });
    // El visitante hace 3 siempre: su under 6.5 se da en los 20.
    expect(r.get(selectionKey({ market: 'conteoEquipo', stat: 'sot', team: 'away', side: 'under', line: 6.5 }))).toEqual({ rate: 1, n: 20 });
    // Y el total del partido también sale de su dato: 4 o 2 amarillas, así que over 2.5 se da en la mitad.
    expect(r.get(selectionKey({ market: 'tarjetas', side: 'over', line: 2.5 }))).toEqual({ rate: 0.5, n: 20 });
  });

  it('solo elige por encima del 80 %, con la mayor ventaja sobre la liga rebajada por la confianza', () => {
    // 1X: 82 % frente al 70 % de la liga (+12 pp). Gana A se queda en el 60 %: no llega al 80 %.
    const r = pick();
    expect(r.best?.key).toBe(selectionKey({ market: 'doble', outcome: '1X' }));
    expect(r.best?.lift).toBeCloseTo(0.12, 12);
    expect(r.best?.score).toBeCloseTo(0.12 * 0.8, 12);
    expect(r.summary[0]).toContain('único');
    expect(r.candidates.find((c) => c.key === selectionKey({ market: 'resultado', outcome: 'home' }))?.reason?.category).toBe('probabilidad');
  });

  it('por arriba también se corta: lo que pasa del 85 % paga demasiado poco', () => {
    // Con 0.5 goles esperados el under 1.5 sale al 91 %: cuota justa 1.10, que con margen no compensa fallar.
    const flojo = { ...PROY, expectedGoalsHome: 0.3, expectedGoalsAway: 0.2, expectedGoalsTotal: 0.5 } as MatchProjection;
    const r = selectModelPick({
      data: { ...datos(20), projection: flojo },
      rates: leagueRates(LIGA),
      settings: DEFAULT_RISK_SETTINGS,
    });
    expect(r.candidates.find((c) => c.key === selectionKey({ market: 'goles', side: 'under', line: 1.5 }))?.reason?.text).toContain(
      'fuera del 80–85 %',
    );
  });

  it('las temporadas anteriores llegan hasta el pick, no se quedan por el camino', () => {
    // 6 partidos de cada equipo no bastan: ni calidad de datos ni confianza.
    const sinHistorico = pick(6);
    expect(sinHistorico.best).toBeNull();
    expect(sinHistorico.candidates.every((c) => c.reason?.category === 'datos')).toBe(true);

    /*
     * Los mismos 6, con 30 de temporadas anteriores. Tenía que ser una prueba sobre `selectModelPick` y no
     * sobre `estimateMarket`: el fallo real fue que el histórico sí llegaba a `estimateMarket` desde unos
     * sitios y no desde otros, porque cada pantalla armaba su contexto a mano (`marketContextOf`).
     */
    const conHistorico = selectModelPick({
      data: { ...datos(6), homeHistory: split(30), awayHistory: split(30) },
      rates: leagueRates(LIGA),
      settings: DEFAULT_RISK_SETTINGS,
    });
    expect(conHistorico.best?.key).toBe(selectionKey({ market: 'doble', outcome: '1X' }));
  });

  it('no fuerza un pick: con poca confianza o sin muestra de liga, «Sin selección recomendada»', () => {
    // 10 partidos de cada equipo: confianza 6.7/10, por debajo del mínimo de 8.
    const pocos = pick(10);
    expect(pocos.best).toBeNull();
    expect(pocos.summary[0]).toContain('Sin selección recomendada');
    expect(pocos.summary[1]).toContain('datos insuficientes o poca confianza');

    const sinLiga = pick(20, LIGA.slice(0, 19));
    expect(sinLiga.best).toBeNull();
    expect(sinLiga.candidates.some((c) => c.reason?.category === 'liga')).toBe(true);
  });
});
