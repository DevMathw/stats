import { describe, expect, it } from 'vitest';
import type { League, Match } from '../../types';
import { countBySeason, currentSeasons, isCurrentSeason, splitBySeason } from './seasonScope';
import { recalculateAll } from '../engine';
import { DEFAULT_MODEL_PARAMS } from './params';
import { buildTeamId, resolveMatchId } from './ids';

const LIGA: League = {
  id: 'Primera A (Liga BetPlay Dimayor)',
  country: 'Colombia',
  name: 'Primera A',
  confederation: 'CONMEBOL',
  season: '2026/27*',
  calendarFormat: 'Ano calendario, Apertura/Finalizacion + cuadrangulares',
  teamCount: 20,
  regularSeasonRounds: null,
  approximateStartDate: null,
  source: null,
  reliabilityNotes: null,
};

function partido(season: string, date: string, home: string, away: string, hg: number, ag: number): Match {
  const base = { leagueId: LIGA.id, season, date, homeTeamName: home, awayTeamName: away };
  return {
    id: resolveMatchId({ providerId: null, ...base }),
    providerId: null,
    leagueId: LIGA.id,
    country: LIGA.country,
    season,
    date,
    round: 1,
    homeTeamId: buildTeamId(LIGA.id, home),
    awayTeamId: buildTeamId(LIGA.id, away),
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
  };
}

describe('qué es temporada vigente', () => {
  const vigentes = currentSeasons([LIGA]);

  it('compara por clave canónica, no por el texto guardado', () => {
    // En la base conviven «2026/27» y «2026/27*» para lo mismo, y un libro puede traer «2026/2027».
    expect(isCurrentSeason({ leagueId: LIGA.id, season: '2026/27' }, vigentes)).toBe(true);
    expect(isCurrentSeason({ leagueId: LIGA.id, season: '2026/2027' }, vigentes)).toBe(true);
    expect(isCurrentSeason({ leagueId: LIGA.id, season: '2025' }, vigentes)).toBe(false);
  });

  it('una liga que no está dada de alta no se descarta en silencio', () => {
    expect(isCurrentSeason({ leagueId: 'Liga desconocida', season: '2019' }, vigentes)).toBe(true);
  });

  it('una temporada sin año legible tampoco se descarta', () => {
    expect(isCurrentSeason({ leagueId: LIGA.id, season: '' }, vigentes)).toBe(true);
  });
});

describe('el histórico no contamina la temporada en curso', () => {
  // Dos torneos del mismo club en la misma liga: 2025 (histórico) y 2026/27 (vigente).
  const historico = [
    partido('2025', '2025-02-01', 'Millonarios', 'Nacional', 3, 0),
    partido('2025', '2025-02-08', 'Millonarios', 'Cali', 2, 0),
  ];
  const vigente = [partido('2026/27', '2026-08-01', 'Millonarios', 'Nacional', 0, 1)];

  it('splitBySeason los reparte', () => {
    const { current, history } = splitBySeason([...historico, ...vigente], [LIGA]);
    expect(current).toHaveLength(1);
    expect(history).toHaveLength(2);
  });

  it('la tabla y el PPG solo cuentan la temporada vigente', () => {
    const solo = recalculateAll({ leagues: [LIGA], matches: vigente, fixtures: [], params: DEFAULT_MODEL_PARAMS });
    const conHistorico = recalculateAll({
      leagues: [LIGA],
      matches: [...historico, ...vigente],
      fixtures: [],
      params: DEFAULT_MODEL_PARAMS,
    });

    const id = buildTeamId(LIGA.id, 'Millonarios');
    const a = solo.statsByTeamId.get(id)!;
    const b = conHistorico.statsByTeamId.get(id)!;

    // Sin el filtro, Millonarios tendría 3 partidos, 6 puntos y 5 goles a favor de dos temporadas distintas.
    expect(a.played).toBe(1);
    expect(b.played).toBe(1);
    expect(b.points).toBe(a.points);
    expect(b.goalsFor).toBe(a.goalsFor);
    expect(b.ppg).toBe(a.ppg);
  });

  it('la clasificación tampoco crece con los equipos que solo jugaron en el histórico', () => {
    const conHistorico = recalculateAll({
      leagues: [LIGA],
      matches: [...historico, ...vigente],
      fixtures: [],
      params: DEFAULT_MODEL_PARAMS,
    });
    const tabla = conHistorico.standingsByLeague.get(LIGA.id) ?? [];
    // Cali solo aparece en 2025: no debe estar en la tabla de 2026/27.
    expect(tabla.map((r) => r.teamName).sort()).toEqual(['Millonarios', 'Nacional']);
  });
});

describe('recuento por temporada', () => {
  it('agrupa con la clave canónica', () => {
    const n = countBySeason([
      partido('2026/27', '2026-08-01', 'A', 'B', 1, 0),
      partido('2026/27*', '2026-08-02', 'A', 'C', 1, 0),
      partido('2025', '2025-08-02', 'A', 'C', 1, 0),
    ]);
    expect(n.get(LIGA.id)).toEqual(new Map([['2026-27', 2], ['2025', 1]]));
  });
});
