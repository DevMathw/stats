import { describe, expect, it } from 'vitest';
import type { Fixture, Match, MatchProjection, SplitStats } from '../../types';
import type { EventRef, Selection } from '../../types/betting';
import { calculateBTTSProbability, calculateOverProbability, poissonPmf } from '../probability/poisson';
import { countDistribution, countOverProbability, type Dispersion } from '../probability/negativeBinomial';
import { goalDifferenceDistribution, MAX_GOALS } from '../probability/goalDifference';
import {
  canPush,
  correlationBetween,
  describeSelection,
  estimateMarket,
  parseSelectionKey,
  resolveEvent,
  selectionKey,
  selectionLabel,
  settleSelection,
  type MarketContext,
} from './markets';

const PROY = {
  expectedGoalsHome: 1.6,
  expectedGoalsAway: 1.1,
  expectedGoalsTotal: 2.7,
  expectedCornersTotal: 10,
  expectedCardsTotal: 4.4,
  probs1x2: { home: 0.45, draw: 0.27, away: 0.28 },
} as MatchProjection;

function split(played: number, sample = played): SplitStats {
  return { played, corners: { sample }, cards: { sample }, shots: { sample }, shotsOnTarget: { sample } } as SplitStats;
}

const DISP: Dispersion = { n: 60, mean: 10, variance: 14, index: 1.4 };

function ctx(over: Partial<MarketContext> = {}): MarketContext {
  return {
    projection: PROY,
    homeSplit: split(10),
    awaySplit: split(10),
    dispersion: { corners: DISP, tarjetas: { n: 60, mean: 4.5, variance: 6.3, index: 1.4 } },
    params: {},
    minSample: 3,
    ...over,
  };
}

const p = (s: Selection, c = ctx()) => estimateMarket(s, c).probability!;

describe('Probabilidad por mercado', () => {
  it('1X2 = probabilidades de la proyección', () => {
    expect(p({ market: 'resultado', outcome: 'home' })).toBe(0.45);
    expect(p({ market: 'resultado', outcome: 'draw' })).toBe(0.27);
  });

  it('doble oportunidad = sumas de 1X2', () => {
    const d = (o: '1X' | 'X2' | '12') => p({ market: 'doble', outcome: o });
    expect(d('1X')).toBeCloseTo(0.72, 12);
    expect(d('X2')).toBeCloseTo(0.55, 12);
    expect(d('12')).toBeCloseTo(0.73, 12);
    expect(d('1X') + d('X2') + d('12')).toBeCloseTo(2, 12);
  });

  it('goles: Over = Poisson sobre la λ total y Over + Under = 1', () => {
    const over = p({ market: 'goles', side: 'over', line: 2.5 });
    expect(over).toBeCloseTo(calculateOverProbability(2.7, 2.5), 12);
    expect(over + p({ market: 'goles', side: 'under', line: 2.5 })).toBeCloseTo(1, 12);
  });

  it('ambos marcan: sí + no = 1', () => {
    const si = p({ market: 'btts', outcome: 'si' });
    expect(si).toBeCloseTo(calculateBTTSProbability(1.6, 1.1), 12);
    expect(si + p({ market: 'btts', outcome: 'no' })).toBeCloseTo(1, 12);
  });

  it('corners: binomial negativa con la dispersión de la liga', () => {
    const over = p({ market: 'corners', side: 'over', line: 9.5 });
    expect(over).toBeCloseTo(countOverProbability(countDistribution(10, DISP), 9.5), 12);
    // Monótona en la línea.
    expect(p({ market: 'corners', side: 'over', line: 8.5 })).toBeGreaterThan(over);
    expect(p({ market: 'corners', side: 'over', line: 10.5 })).toBeLessThan(over);
  });

  it('corners: la sobredispersión ensancha las colas frente a Poisson', () => {
    const nb = p({ market: 'corners', side: 'over', line: 13.5 });
    const poisson = countOverProbability({ mean: 10, size: null }, 13.5);
    expect(nb).toBeGreaterThan(poisson);
  });

  it('el rango probable contiene el valor esperado', () => {
    const e = estimateMarket({ market: 'corners', side: 'over', line: 9.5 }, ctx());
    expect(e.range80![0]).toBeLessThanOrEqual(10);
    expect(e.range80![1]).toBeGreaterThanOrEqual(10);
  });
});

describe('Hándicaps, empate no válido, goles por equipo y portería a cero', () => {
  it('hándicap asiático ±0.5 = 1X2 del modelo: el mismo evento no tiene dos probabilidades', () => {
    expect(p({ market: 'asiatico', team: 'home', line: -0.5 })).toBeCloseTo(0.45, 12);
    expect(p({ market: 'asiatico', team: 'home', line: 0.5 })).toBeCloseTo(0.72, 12);
    expect(p({ market: 'asiatico', team: 'away', line: -0.5 })).toBeCloseTo(0.28, 12);
    expect(estimateMarket({ market: 'asiatico', team: 'home', line: -0.5 }, ctx()).push).toBe(0);
  });

  it('empate no válido: gana / (gana + pierde), y el empate devuelve el stake', () => {
    const e = estimateMarket({ market: 'asiatico', team: 'home', line: 0 }, ctx());
    expect(e.probability).toBeCloseTo(0.45 / 0.73, 12);
    expect(e.push).toBeCloseTo(0.27, 12);
  });

  it('hándicap asiático −1: gana por 2 o más, devuelve con 1 exacto; las líneas son monótonas', () => {
    const d = goalDifferenceDistribution(1.6, 1.1, PROY.probs1x2)!;
    const gana = d.slice(MAX_GOALS + 2).reduce((a, b) => a + b, 0);
    const e = estimateMarket({ market: 'asiatico', team: 'home', line: -1 }, ctx());
    expect(e.push).toBeCloseTo(d[MAX_GOALS + 1], 12);
    expect(e.probability).toBeCloseTo(gana / (1 - d[MAX_GOALS + 1]), 12);
    expect(p({ market: 'asiatico', team: 'home', line: -1.5 })).toBeLessThan(p({ market: 'asiatico', team: 'home', line: -0.5 }));
    expect(p({ market: 'asiatico', team: 'away', line: 1.5 })).toBeGreaterThan(p({ market: 'asiatico', team: 'away', line: 0.5 }));
  });

  it('hándicap europeo: los tres resultados de una línea suman 1', () => {
    const e = (o: 'home' | 'draw' | 'away') => p({ market: 'europeo', line: -1, outcome: o });
    expect(e('home') + e('draw') + e('away')).toBeCloseTo(1, 12);
    // Local −1 gana = hándicap asiático local −1.5.
    expect(e('home')).toBeCloseTo(p({ market: 'asiatico', team: 'home', line: -1.5 }), 12);
  });

  it('goles por equipo: Poisson con la λ del equipo; portería a cero = e^(−λ rival)', () => {
    expect(p({ market: 'equipo', team: 'home', side: 'over', line: 1.5 })).toBeCloseTo(calculateOverProbability(1.6, 1.5), 12);
    expect(p({ market: 'cero', team: 'home', outcome: 'si' })).toBeCloseTo(Math.exp(-1.1), 12);
    expect(p({ market: 'cero', team: 'home', outcome: 'si' })).toBeCloseTo(p({ market: 'equipo', team: 'away', side: 'under', line: 0.5 }), 12);
  });

  it('línea asiática de goles: con el total exacto se devuelve el stake', () => {
    const over = estimateMarket({ market: 'goles', side: 'over', line: 2 }, ctx());
    const under = estimateMarket({ market: 'goles', side: 'under', line: 2 }, ctx());
    expect(over.push).toBeCloseTo(poissonPmf(2, 2.7), 12);
    expect(over.probability).toBeCloseTo(calculateOverProbability(2.7, 2.5) / (1 - poissonPmf(2, 2.7)), 12);
    expect(over.probability! + under.probability!).toBeCloseTo(1, 12);
  });

  it('solo las líneas enteras de goles y del hándicap asiático pueden devolver', () => {
    expect(canPush({ market: 'goles', side: 'over', line: 2 })).toBe(true);
    expect(canPush({ market: 'asiatico', team: 'away', line: 0 })).toBe(true);
    expect(canPush({ market: 'asiatico', team: 'away', line: 0.5 })).toBe(false);
    expect(canPush({ market: 'europeo', line: -1, outcome: 'draw' })).toBe(false);
  });

  it('describe cuándo gana y cuándo se devuelve el stake', () => {
    expect(describeSelection({ market: 'asiatico', team: 'home', line: -1 }, 'Flamengo', 'Vasco')).toEqual({
      gana: 'Flamengo gana por 2 o más goles',
      devuelve: 'Flamengo gana por 1 gol exacto',
    });
    expect(describeSelection({ market: 'asiatico', team: 'away', line: 1.5 }, 'Flamengo', 'Vasco').gana).toBe('Vasco no pierde por 2 o más goles');
    expect(describeSelection({ market: 'europeo', line: -1, outcome: 'draw' }, 'Flamengo', 'Vasco').gana).toBe('Flamengo gana por 1 gol exacto');
    expect(describeSelection({ market: 'goles', side: 'under', line: 2 }).devuelve).toBe('hay exactamente 2 goles');
  });
});

describe('Datos insuficientes y calidad de datos', () => {
  it('11. muestra por debajo del mínimo: sin probabilidad', () => {
    const e = estimateMarket({ market: 'goles', side: 'over', line: 2.5 }, ctx({ homeSplit: split(2) }));
    expect(e.probability).toBeNull();
    expect(e.dataQuality).toBe('insuficiente');
    expect(e.reason).toContain('Muestra insuficiente');
    expect(e.confidence).toBe(0);
  });

  it('corners con pocos partidos con el dato, aunque haya muchos jugados', () => {
    const e = estimateMarket({ market: 'corners', side: 'over', line: 9.5 }, ctx({ homeSplit: split(10, 2) }));
    expect(e.probability).toBeNull();
  });

  it('12. la liga no publica el mercado: sin probabilidad', () => {
    const sinCorners = { ...PROY, expectedCornersTotal: null } as MatchProjection;
    expect(estimateMarket({ market: 'corners', side: 'over', line: 9.5 }, ctx({ projection: sinCorners })).probability).toBeNull();
    const pocaLiga = ctx({ dispersion: { corners: { ...DISP, n: 12 }, tarjetas: null } });
    expect(estimateMarket({ market: 'corners', side: 'over', line: 9.5 }, pocaLiga).reason).toContain('dispersión');
  });

  it('una liga con 0 tarjetas en casi todos los partidos no se evalúa: son ceros de la fuente', () => {
    const ceros = ctx({ dispersion: { corners: DISP, tarjetas: { n: 149, mean: 0, variance: 0, index: 1, zeroShare: 1 } } });
    const e = estimateMarket({ market: 'tarjetas', side: 'under', line: 3.5 }, ceros);
    expect(e.probability).toBeNull();
    expect(e.reason).toContain('Datos inconsistentes');
    // Un 0 aislado sí se acepta.
    const pocos = ctx({ dispersion: { corners: { ...DISP, zeroShare: 0.02 }, tarjetas: null } });
    expect(estimateMarket({ market: 'corners', side: 'over', line: 9.5 }, pocos).probability).not.toBeNull();
  });

  it('niveles de calidad', () => {
    const q = (h: SplitStats, a: SplitStats) => estimateMarket({ market: 'goles', side: 'over', line: 2.5 }, ctx({ homeSplit: h, awaySplit: a })).dataQuality;
    expect(q(split(10), split(12))).toBe('alta');
    expect(q(split(6), split(12))).toBe('media');
    expect(q(split(3), split(12))).toBe('baja');
    // Cobertura parcial de corners baja la calidad.
    expect(estimateMarket({ market: 'corners', side: 'over', line: 9.5 }, ctx({ homeSplit: split(12, 8) })).dataQuality).toBe('media');
  });

  it('confianza = 10 · evidencia · cobertura (nunca llega a 10)', () => {
    const e = estimateMarket({ market: 'goles', side: 'over', line: 2.5 }, ctx());
    // n = 10, K = 5 → peso 10/15.
    expect(e.confidence).toBeCloseTo(6.7, 1);
    expect(e.confidence).toBeLessThan(10);
  });

  it('las temporadas anteriores cuentan en la confianza, a mitad de precio', () => {
    const sinHistorico = estimateMarket({ market: 'goles', side: 'over', line: 2.5 }, ctx({ homeSplit: split(4), awaySplit: split(4) }));
    // 4 partidos de esta temporada: 4/9 de evidencia, y con eso ningún pick pasa el mínimo de 7,5.
    expect(sinHistorico.confidence).toBeCloseTo(4.4, 1);
    expect(sinHistorico.historySampleHome).toBe(0);

    const conHistorico = estimateMarket(
      { market: 'goles', side: 'over', line: 2.5 },
      ctx({ homeSplit: split(4), awaySplit: split(4), homeHistory: split(30), awayHistory: split(30) }),
    );
    // 4 + 30·0,5 = 19 → 19/24. La muestra que se ENSEÑA sigue siendo la de esta temporada.
    expect(conHistorico.confidence).toBeCloseTo(7.9, 1);
    expect(conHistorico.sampleHome).toBe(4);
    expect(conHistorico.historySampleHome).toBe(30);
  });

  it('los mercados nuevos siguen la misma regla de muestra mínima', () => {
    const e = estimateMarket({ market: 'asiatico', team: 'home', line: -1 }, ctx({ awaySplit: split(1) }));
    expect(e.probability).toBeNull();
    expect(e.push).toBe(0);
  });
});

describe('Claves de selección', () => {
  it('ida y vuelta', () => {
    const sels: Selection[] = [
      { market: 'resultado', outcome: 'away' },
      { market: 'doble', outcome: 'X2' },
      { market: 'btts', outcome: 'no' },
      { market: 'corners', side: 'over', line: 9.5 },
      { market: 'goles', side: 'under', line: 3 },
      { market: 'asiatico', team: 'away', line: -1.5 },
      { market: 'asiatico', team: 'home', line: 0 },
      { market: 'europeo', line: 2, outcome: 'draw' },
      { market: 'equipo', team: 'home', side: 'over', line: 1.5 },
      { market: 'cero', team: 'away', outcome: 'si' },
    ];
    for (const s of sels) expect(parseSelectionKey(selectionKey(s))).toEqual(s);
  });

  it('rechaza cuartos de línea, líneas que su mercado no admite y claves desconocidas', () => {
    expect(parseSelectionKey('goles:over:2.25')).toBeNull();
    expect(parseSelectionKey('corners:over:9')).toBeNull();
    expect(parseSelectionKey('asiatico:home:-0.75')).toBeNull();
    expect(parseSelectionKey('europeo:0:home')).toBeNull();
    expect(parseSelectionKey('equipo:home:over:1')).toBeNull();
    expect(parseSelectionKey('goles:over:2.5:extra')).toBeNull();
    expect(parseSelectionKey('corners:mas:9.5')).toBeNull();
    expect(parseSelectionKey('ruleta:rojo')).toBeNull();
  });
});

function partido(over: Partial<Match> = {}): Match {
  return {
    id: 'm1',
    providerId: null,
    leagueId: 'Liga',
    date: '2026-09-20',
    homeTeamId: 'Liga|A',
    awayTeamId: 'Liga|B',
    homeGoals: 2,
    awayGoals: 1,
    cornersHome: 6,
    cornersAway: 5,
    yellowCardsHome: 2,
    yellowCardsAway: 1,
    ...over,
  } as Match;
}

describe('Liquidación con resultados reales', () => {
  const m = partido();
  const s = (sel: Selection, x = m) => settleSelection(sel, x).status;

  it('1X2, doble oportunidad y ambos marcan', () => {
    expect(s({ market: 'resultado', outcome: 'home' })).toBe('ganado');
    expect(s({ market: 'resultado', outcome: 'draw' })).toBe('perdido');
    expect(s({ market: 'doble', outcome: 'X2' })).toBe('perdido');
    expect(s({ market: 'doble', outcome: '12' })).toBe('ganado');
    expect(s({ market: 'btts', outcome: 'si' })).toBe('ganado');
  });

  it('líneas de goles, corners y tarjetas', () => {
    expect(s({ market: 'goles', side: 'over', line: 2.5 })).toBe('ganado');
    expect(s({ market: 'goles', side: 'under', line: 2.5 })).toBe('perdido');
    expect(s({ market: 'corners', side: 'over', line: 10.5 })).toBe('ganado');
    expect(s({ market: 'tarjetas', side: 'over', line: 3.5 })).toBe('perdido');
  });

  it('hándicaps, goles por equipo y portería a cero con 2-1; justo en la línea se devuelve', () => {
    expect(s({ market: 'asiatico', team: 'home', line: -1 })).toBe('anulado');
    expect(s({ market: 'asiatico', team: 'home', line: -1.5 })).toBe('perdido');
    expect(s({ market: 'asiatico', team: 'away', line: 1.5 })).toBe('ganado');
    expect(s({ market: 'asiatico', team: 'away', line: 0 })).toBe('perdido');
    expect(s({ market: 'europeo', line: -1, outcome: 'draw' })).toBe('ganado');
    expect(s({ market: 'equipo', team: 'away', side: 'over', line: 0.5 })).toBe('ganado');
    expect(s({ market: 'cero', team: 'home', outcome: 'si' })).toBe('perdido');
    expect(s({ market: 'goles', side: 'over', line: 3 })).toBe('anulado');
    expect(settleSelection({ market: 'goles', side: 'over', line: 3 }, m).note).toContain('se devuelve el stake');
  });

  it('12. la fuente no publicó corners: no se liquida', () => {
    const r = settleSelection({ market: 'corners', side: 'over', line: 9.5 }, partido({ cornersHome: null }));
    expect(r.status).toBe('sin-datos');
  });

  it('goles por parte: con el descanso; la 2.ª parte es el final menos el descanso', () => {
    const conDescanso = partido({ homeFirstHalfGoals: 1, awayFirstHalfGoals: 0 }); // 2-1, descanso 1-0
    const mitad = (half: 1 | 2, side: 'over' | 'under', line: number) => s({ market: 'mitad', half, side, line }, conDescanso);
    expect(mitad(1, 'over', 0.5)).toBe('ganado');
    expect(mitad(1, 'over', 1.5)).toBe('perdido');
    expect(mitad(2, 'over', 1.5)).toBe('ganado');
    expect(mitad(2, 'under', 1.5)).toBe('perdido');
    expect(settleSelection({ market: 'mitad', half: 2, side: 'over', line: 1.5 }, conDescanso).note).toContain('2 goles en la 2.ª parte');
  });

  it('goles por parte sin descanso publicado, o con uno que no cuadra con el final: no se liquida', () => {
    const sel: Selection = { market: 'mitad', half: 1, side: 'over', line: 0.5 };
    expect(settleSelection(sel, partido({ homeFirstHalfGoals: null, awayFirstHalfGoals: null })).status).toBe('sin-datos');
    expect(settleSelection(sel, partido({ homeFirstHalfGoals: 3, awayFirstHalfGoals: 0 })).status).toBe('sin-datos');
  });
});

describe('Goles por parte', () => {
  const conPartes = ctx({ projection: { ...PROY, expectedGoalsFirstHalf: 1.2, expectedGoalsSecondHalf: 1.5 } });

  it('Poisson con la λ de cada parte de la proyección', () => {
    expect(p({ market: 'mitad', half: 1, side: 'over', line: 0.5 }, conPartes)).toBeCloseTo(1 - Math.exp(-1.2), 12);
    expect(p({ market: 'mitad', half: 2, side: 'over', line: 1.5 }, conPartes)).toBeCloseTo(calculateOverProbability(1.5, 1.5), 12);
    expect(p({ market: 'mitad', half: 2, side: 'under', line: 1.5 }, conPartes)).toBeCloseTo(1 - calculateOverProbability(1.5, 1.5), 12);
  });

  it('sin resultados al descanso en la liga: sin probabilidad', () => {
    const e = estimateMarket({ market: 'mitad', half: 1, side: 'over', line: 0.5 }, ctx());
    expect(e.probability).toBeNull();
    expect(e.reason).toContain('descanso');
  });

  it('clave, ida y vuelta, y líneas no admitidas', () => {
    const sel: Selection = { market: 'mitad', half: 2, side: 'under', line: 1.5 };
    expect(parseSelectionKey(selectionKey(sel))).toEqual(sel);
    expect(parseSelectionKey('mitad:3:over:0.5')).toBeNull();
    expect(parseSelectionKey('mitad:1:over:1')).toBeNull();
    expect(describeSelection({ market: 'mitad', half: 1, side: 'under', line: 0.5 }).gana).toBe('no hay goles en la 1.ª parte');
  });

  it('correlación: excluyente en la misma parte, alta con los goles del partido, baja entre partes', () => {
    const o = (half: 1 | 2, side: 'over' | 'under', line: number): Selection => ({ market: 'mitad', half, side, line });
    expect(correlationBetween(o(1, 'over', 1.5), o(1, 'under', 1.5))).toBe('excluyente');
    expect(correlationBetween(o(1, 'over', 0.5), o(1, 'over', 1.5))).toBe('alta');
    expect(correlationBetween(o(1, 'over', 0.5), { market: 'goles', side: 'over', line: 2.5 })).toBe('alta');
    expect(correlationBetween(o(1, 'over', 0.5), { market: 'resultado', outcome: 'home' })).toBe('media');
    expect(correlationBetween(o(1, 'over', 0.5), o(2, 'over', 0.5))).toBe('baja');
  });
});

describe('Qué fue del partido de un pick', () => {
  const ev: EventRef = {
    fixtureId: 'm1',
    providerId: null,
    leagueId: 'Liga',
    season: '2026',
    date: '2026-09-20',
    kickoffTime: null,
    round: 5,
    homeTeamId: 'Liga|A',
    awayTeamId: 'Liga|B',
    homeTeamName: 'A',
    awayTeamName: 'B',
  };
  const fixture = (status: Fixture['status']) => ({ id: 'm1', status }) as Fixture;

  it('mismo id con marcador: jugado', () => {
    expect(resolveEvent(ev, [partido()], []).kind).toBe('jugado');
  });

  it('9. sin resultado todavía: pendiente', () => {
    expect(resolveEvent(ev, [partido({ homeGoals: null, awayGoals: null })], [fixture('Programado')]).kind).toBe('pendiente');
  });

  it('10. cancelado', () => {
    expect(resolveEvent(ev, [], [fixture('Cancelado')]).kind).toBe('cancelado');
  });

  it('aplazado sigue esperando', () => {
    expect(resolveEvent(ev, [], [fixture('Aplazado')]).kind).toBe('aplazado');
  });

  it('aplazado y jugado otro día (clave distinta): lo encuentra por equipos', () => {
    const r = resolveEvent(ev, [partido({ id: 'otra-clave', date: '2026-10-02' })], []);
    expect(r.kind).toBe('jugado');
  });

  it('dos candidatos: no adivina', () => {
    const r = resolveEvent(ev, [partido({ id: 'x', date: '2026-09-22' }), partido({ id: 'y', date: '2026-09-25' })], []);
    expect(r.kind).toBe('ambiguo');
  });

  it('fuera de ±21 días no es el mismo partido', () => {
    expect(resolveEvent(ev, [partido({ id: 'x', date: '2027-03-01' })], []).kind).toBe('pendiente');
  });
});

describe('Correlación en el mismo partido', () => {
  const c = correlationBetween;
  it('idéntica y excluyentes', () => {
    expect(c({ market: 'btts', outcome: 'si' }, { market: 'btts', outcome: 'si' })).toBe('identica');
    expect(c({ market: 'resultado', outcome: 'home' }, { market: 'resultado', outcome: 'away' })).toBe('excluyente');
    expect(c({ market: 'doble', outcome: '1X' }, { market: 'resultado', outcome: 'away' })).toBe('excluyente');
    expect(c({ market: 'goles', side: 'over', line: 2.5 }, { market: 'goles', side: 'under', line: 2.5 })).toBe('excluyente');
    expect(c({ market: 'btts', outcome: 'si' }, { market: 'btts', outcome: 'no' })).toBe('excluyente');
  });

  it('alta dentro de la misma variable, media resultado–goles, baja el resto', () => {
    expect(c({ market: 'goles', side: 'over', line: 1.5 }, { market: 'goles', side: 'under', line: 3.5 })).toBe('alta');
    expect(c({ market: 'goles', side: 'over', line: 2.5 }, { market: 'btts', outcome: 'si' })).toBe('alta');
    expect(c({ market: 'resultado', outcome: 'home' }, { market: 'doble', outcome: '1X' })).toBe('alta');
    expect(c({ market: 'resultado', outcome: 'home' }, { market: 'goles', side: 'over', line: 2.5 })).toBe('media');
    expect(c({ market: 'corners', side: 'over', line: 9.5 }, { market: 'goles', side: 'over', line: 2.5 })).toBe('baja');
  });

  it('mercados equivalentes son idénticos y los imposibles a la vez, excluyentes', () => {
    expect(c({ market: 'resultado', outcome: 'home' }, { market: 'asiatico', team: 'home', line: -0.5 })).toBe('identica');
    expect(c({ market: 'asiatico', team: 'home', line: -1.5 }, { market: 'europeo', line: -1, outcome: 'home' })).toBe('identica');
    expect(c({ market: 'cero', team: 'home', outcome: 'si' }, { market: 'equipo', team: 'away', side: 'under', line: 0.5 })).toBe('identica');
    expect(c({ market: 'goles', side: 'under', line: 1.5 }, { market: 'btts', outcome: 'si' })).toBe('excluyente');
    expect(c({ market: 'resultado', outcome: 'home' }, { market: 'cero', team: 'away', outcome: 'si' })).toBe('excluyente');
    expect(c({ market: 'asiatico', team: 'home', line: -1 }, { market: 'equipo', team: 'home', side: 'over', line: 1.5 })).toBe('media');
  });
});

/**
 * Los mercados de conteo añadidos el 14/10/2026: tiros y tiros a puerta como total, y los cuatro
 * conteos por equipo. Lo que se fija aquí es la frontera que los hace fiables: que cada uno lee SU
 * media y SU dispersión, que un equipo no hereda la varianza del total y que sin el dato no hay
 * probabilidad.
 */
describe('Mercados de conteo nuevos', () => {
  const DISP_TOTAL: Dispersion = { n: 400, mean: 26, variance: 36.8, index: 1.417, zeroShare: 0 };
  const DISP_EQUIPO: Dispersion = { n: 800, mean: 13, variance: 28.3, index: 2.181, zeroShare: 0 };

  const conTiros = (over: Partial<MarketContext> = {}) =>
    ctx({
      projection: { ...PROY, expectedShotsTotal: 26, expectedShotsHome: 14, expectedShotsAway: 12 } as MatchProjection,
      dispersion: { tiros: DISP_TOTAL, tirosEquipo: DISP_EQUIPO },
      ...over,
    });

  it('el total usa la media del partido y la dispersión del total', () => {
    const e = estimateMarket({ market: 'tiros', side: 'over', line: 24.5 }, conTiros());
    expect(e.probability).not.toBeNull();
    expect(e.expected).toBe(26);
    expect(e.method).toContain('1.42');
  });

  it('el de un equipo usa la media de ESE equipo y la dispersión por equipo', () => {
    const local = estimateMarket({ market: 'conteoEquipo', stat: 'tiros', team: 'home', side: 'over', line: 12.5 }, conTiros());
    const visitante = estimateMarket({ market: 'conteoEquipo', stat: 'tiros', team: 'away', side: 'over', line: 12.5 }, conTiros());
    expect(local.expected).toBe(14);
    expect(visitante.expected).toBe(12);
    // La dispersión por equipo (2,18) no es la del total (1,42): si se confundieran, saldría 1.42.
    expect(local.method).toContain('2.18');
    expect(local.method).toContain('POR EQUIPO');
    // El local tira más, así que supera su línea más a menudo.
    expect(local.probability!).toBeGreaterThan(visitante.probability!);
  });

  it('over y under del mismo equipo y línea suman 1', () => {
    const base = { market: 'conteoEquipo', stat: 'sot', team: 'home' } as const;
    const d = { sot: DISP_TOTAL, sotEquipo: { n: 800, mean: 4.4, variance: 6.1, index: 1.375, zeroShare: 0.023 } };
    const c = ctx({ projection: { ...PROY, expectedSotHome: 4.6, expectedSotAway: 4.2 } as MatchProjection, dispersion: d });
    const over = estimateMarket({ ...base, side: 'over', line: 4.5 }, c).probability!;
    const under = estimateMarket({ ...base, side: 'under', line: 4.5 }, c).probability!;
    expect(over + under).toBeCloseTo(1, 12);
  });

  it('sin la dispersión por equipo no inventa una probabilidad', () => {
    // Está la del total pero no la del equipo: el mercado por equipo se queda sin estimar.
    const c = conTiros({ dispersion: { tiros: DISP_TOTAL } });
    const e = estimateMarket({ market: 'conteoEquipo', stat: 'tiros', team: 'home', side: 'over', line: 12.5 }, c);
    expect(e.probability).toBeNull();
    expect(e.reason).toContain('dispersión');
  });

  it('liquida con el conteo de ese equipo, y sin el dato lo dice', () => {
    const m = partido({ shotsHome: 15, shotsAway: 9, cornersHome: 6, cornersAway: 3 });
    const sel = { market: 'conteoEquipo', stat: 'tiros', team: 'home', side: 'over', line: 12.5 } as const;
    expect(settleSelection(sel, m).status).toBe('ganado');
    expect(settleSelection({ ...sel, team: 'away' }, m).status).toBe('perdido');
    expect(settleSelection({ ...sel, stat: 'corners', team: 'away', line: 4.5 }, m).status).toBe('perdido');
    expect(settleSelection(sel, partido({ shotsHome: null })).status).toBe('sin-datos');
  });

  it('la clave sobrevive al ida y vuelta, y la etiqueta dice de quién es', () => {
    const sel = { market: 'conteoEquipo', stat: 'corners', team: 'away', side: 'under', line: 3.5 } as const;
    expect(parseSelectionKey(selectionKey(sel))).toEqual(sel);
    expect(selectionKey(sel)).toBe('conteoEquipo:corners:away:under:3.5');
    expect(selectionLabel(sel, 'Nacional', 'Cali')).toContain('Cali');
    expect(selectionLabel(sel, 'Nacional', 'Cali')).toContain('corners');
  });

  it('los conteos de un equipo y los del otro no son el mismo grupo', () => {
    const local = { market: 'conteoEquipo', stat: 'corners', team: 'home', side: 'over', line: 4.5 } as const;
    const visitante = { market: 'conteoEquipo', stat: 'corners', team: 'away', side: 'over', line: 4.5 } as const;
    // Mismo equipo y líneas incompatibles: no pueden ganar las dos.
    expect(correlationBetween(local, { ...local, side: 'under', line: 3.5 })).toBe('excluyente');
    // Equipos distintos: relacionados, pero ni idénticos ni excluyentes.
    expect(['baja', 'media', 'alta']).toContain(correlationBetween(local, visitante));
  });
});
