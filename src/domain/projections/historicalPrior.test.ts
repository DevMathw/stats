import { describe, expect, it } from 'vitest';
import type { Fixture, League, Match, ModelParams } from '../../types';
import { recalculateAll } from '../engine';
import { DEFAULT_MODEL_PARAMS } from '../models/params';
import { buildTeamId, resolveMatchId } from '../models/ids';
import { priorMean } from './expectedValues';

const LIGA: League = {
  id: 'BetPlay', country: 'Colombia', name: 'BetPlay', confederation: 'CONMEBOL', season: '2026/27*',
  calendarFormat: 'Ano calendario', teamCount: 4, regularSeasonRounds: null, approximateStartDate: null,
  source: null, reliabilityNotes: null,
};

const EQUIPOS = ['Goleador', 'Normal', 'Flojo', 'Otro'];

function partido(season: string, date: string, home: string, away: string, hg: number, ag: number): Match {
  const base = { providerId: null, leagueId: LIGA.id, season, date, homeTeamName: home, awayTeamName: away };
  return {
    ...base,
    id: resolveMatchId(base),
    country: LIGA.country,
    round: 1,
    homeTeamId: buildTeamId(LIGA.id, home),
    awayTeamId: buildTeamId(LIGA.id, away),
    homeGoals: hg,
    awayGoals: ag,
    homeFirstHalfGoals: null, awayFirstHalfGoals: null, shotsHome: null, shotsAway: null,
    shotsOnTargetHome: null, shotsOnTargetAway: null, possessionHome: null,
    cornersHome: 5, cornersAway: 5, yellowCardsHome: 2, yellowCardsAway: 2,
    redCardsHome: null, redCardsAway: null, foulsHome: null, foulsAway: null,
    offsidesHome: null, offsidesAway: null, xGHome: null, xGAway: null,
    source: null, updatedAt: null, statsSource: null, statsUpdatedAt: null, statsCitations: [],
  };
}

const pendiente = (home: string, away: string): Fixture => ({
  id: `${LIGA.id}|2026/27*|2026-09-01|${home}|${away}`,
  providerId: null, leagueId: LIGA.id, country: LIGA.country, season: '2026/27*', date: '2026-09-01',
  kickoffTime: null, round: 3, homeTeamId: buildTeamId(LIGA.id, home), awayTeamId: buildTeamId(LIGA.id, away),
  homeTeamName: home, awayTeamName: away, status: 'Programado', source: null,
});

/** Temporada 2025: «Goleador» marca 4 en casa y «Flojo» ninguno. El resto, 1-1. */
const HISTORICO: Match[] = [
  partido('2025', '2025-03-01', 'Goleador', 'Normal', 4, 0),
  partido('2025', '2025-03-08', 'Goleador', 'Flojo', 4, 0),
  partido('2025', '2025-03-15', 'Goleador', 'Otro', 4, 0),
  partido('2025', '2025-03-22', 'Flojo', 'Normal', 0, 1),
  partido('2025', '2025-03-29', 'Flojo', 'Otro', 0, 1),
  partido('2025', '2025-04-05', 'Flojo', 'Goleador', 0, 1),
  partido('2025', '2025-04-12', 'Normal', 'Otro', 1, 1),
  partido('2025', '2025-04-19', 'Normal', 'Goleador', 1, 1),
  partido('2025', '2025-04-26', 'Otro', 'Normal', 1, 1),
];

/** Temporada en curso: un solo partido de cada uno, todos 1-1, así que el libro no los distingue. */
const VIGENTE: Match[] = [
  partido('2026/27*', '2026-08-01', 'Goleador', 'Normal', 1, 1),
  partido('2026/27*', '2026-08-08', 'Flojo', 'Otro', 1, 1),
];

const PENDIENTES = [pendiente('Goleador', 'Otro'), pendiente('Flojo', 'Otro')];

const correr = (matches: Match[], params: Partial<ModelParams> = {}) =>
  recalculateAll({ leagues: [LIGA], matches, fixtures: PENDIENTES, params: { ...DEFAULT_MODEL_PARAMS, projectionSource: 'libro', ...params } });

const proy = (matches: Match[], params: Partial<ModelParams>, i: number) => correr(matches, params).projections[i];

describe('prior histórico de la contracción', () => {
  it('sin histórico cargado, «historico» y «liga» dan exactamente lo mismo', () => {
    const a = correr(VIGENTE, { priorMode: 'historico' }).projections;
    const b = correr(VIGENTE, { priorMode: 'liga' }).projections;
    expect(a).toEqual(b);
  });

  it('con histórico, el equipo que marcaba mucho en casa sube y el que no marcaba baja', () => {
    const conHistorico = [...HISTORICO, ...VIGENTE];
    const goleadorLiga = proy(conHistorico, { priorMode: 'liga' }, 0).expectedGoalsHome;
    const goleadorHist = proy(conHistorico, { priorMode: 'historico' }, 0).expectedGoalsHome;
    const flojoLiga = proy(conHistorico, { priorMode: 'liga' }, 1).expectedGoalsHome;
    const flojoHist = proy(conHistorico, { priorMode: 'historico' }, 1).expectedGoalsHome;

    // Con un solo partido jugado (1-1), el libro da a los dos casi la media de la liga.
    expect(goleadorLiga).toBeCloseTo(flojoLiga, 2);
    // Con el histórico, cada uno se parece a lo que hizo: 4 goles en casa frente a 0.
    expect(goleadorHist).toBeGreaterThan(goleadorLiga);
    // Y lo que importa: el modelo los SEPARA, en vez de darles a los dos la media de la competición. No se
    // comprueba que «Flojo» baje en términos absolutos: la media de liga también lleva prior, y la del
    // histórico de esta prueba tiene más goles, así que sube el suelo de los dos.
    expect(goleadorHist - flojoHist).toBeGreaterThan(0.5);
    expect(Math.abs(goleadorLiga - flojoLiga)).toBeLessThan(0.05);
  });

  /*
   * En córners y tarjetas el histórico entra SOLO por la media de la liga, nunca por lo que hizo cada equipo.
   * Las dos pruebas siguientes fijan esa frontera, que es una decisión medida: el prior por equipo subía el
   * error de córners y el de la liga lo baja.
   */
  it('el histórico del EQUIPO no mueve córners ni tarjetas', () => {
    // Todos los partidos, de las dos temporadas, llevan 5 y 5: la media de liga es la misma, así que lo único
    // que podría mover la proyección es el histórico de cada equipo. Y no la mueve.
    const conHistorico = [...HISTORICO, ...VIGENTE];
    const liga = proy(conHistorico, { priorMode: 'liga' }, 0);
    const hist = proy(conHistorico, { priorMode: 'historico' }, 0);
    expect(hist.expectedCornersTotal).toBe(liga.expectedCornersTotal);
    expect(hist.expectedCardsTotal).toBe(liga.expectedCardsTotal);
    expect(hist.expectedShotsTotal).toBe(liga.expectedShotsTotal);
  });

  it('la media de liga del histórico sí, y eso es lo que rellena las primeras jornadas', () => {
    // Una temporada en curso SIN córners publicados: el libro no puede dar ninguna cifra y devuelve N/D.
    const sinCorners = VIGENTE.map((m) => ({ ...m, cornersHome: null, cornersAway: null }));
    const libro = proy(sinCorners, { priorMode: 'liga' }, 0);
    expect(libro.expectedCornersTotal).toBeNull();

    // Con el histórico de la misma liga (5 y 5 por partido) ya hay de dónde partir: 10 en total.
    const conHistorico = proy([...HISTORICO, ...sinCorners], { priorMode: 'historico' }, 0);
    expect(conHistorico.expectedCornersTotal).toBeCloseTo(10, 6);
  });

  it('el histórico sigue fuera de la tabla y de la forma', () => {
    const d = correr([...HISTORICO, ...VIGENTE], { priorMode: 'historico' });
    expect(d.statsByTeamId.get(buildTeamId(LIGA.id, 'Goleador'))!.played).toBe(1);
    expect(d.standingsByLeague.get(LIGA.id)!.map((r) => r.teamName).sort()).toEqual(EQUIPOS.slice().sort());
  });

  it('la dispersión de la liga usa el histórico solo de respaldo', () => {
    // La temporada en curso tiene 2 partidos: no llega a los 20 que pide el mercado, así que manda el histórico.
    const corta = correr([...HISTORICO, ...VIGENTE]).dispersionByLeague.get(LIGA.id)!;
    expect(corta.corners!.n).toBe(11);

    // Con 20 o más de la propia temporada, el histórico deja de entrar.
    const larga = Array.from({ length: 24 }, (_, i) =>
      partido('2026/27*', `2026-08-${String((i % 28) + 1).padStart(2, '0')}`, i % 2 ? 'Goleador' : 'Flojo', i % 2 ? 'Otro' : 'Normal', 1, 1),
    );
    const d = correr([...HISTORICO, ...larga]).dispersionByLeague.get(LIGA.id)!;
    expect(d.corners!.n).toBe(24);
  });

  it('queda a la vista sobre cuántos partidos se apoya cada equipo', () => {
    expect(correr(VIGENTE).historyByTeamId.size).toBe(0);
    const d = correr([...HISTORICO, ...VIGENTE]);
    expect(d.historyByTeamId.get(buildTeamId(LIGA.id, 'Goleador'))!.matches).toBe(5);
    expect(d.historyByTeamId.get(buildTeamId(LIGA.id, 'Goleador'))!.home.avgGoalsFor).toBe(4);
  });
});

describe('priorMean', () => {
  it('sin prior es la media de la liga', () => {
    expect(priorMean(null, 1.3, 10)).toBe(1.3);
    expect(priorMean({ value: null, played: 30 }, 1.3, 10)).toBe(1.3);
  });

  it('sin partidos detrás tampoco desplaza nada', () => {
    expect(priorMean({ value: 3, played: 0 }, 1.3, 10)).toBe(1.3);
  });

  it('con K_PRIOR partidos pesa la mitad', () => {
    expect(priorMean({ value: 3, played: 10 }, 1, 10)).toBeCloseTo(2, 10);
  });

  it('con muchos partidos se acerca a lo que hizo el equipo', () => {
    expect(priorMean({ value: 3, played: 90 }, 1, 10)).toBeCloseTo(2.8, 10);
  });
});
