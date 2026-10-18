import { describe, expect, it } from 'vitest';
import type { League, Match, ModelParams } from '../../types';
import { buildTeamId, resolveMatchId } from '../models/ids';
import { DEFAULT_MODEL_PARAMS } from '../models/params';
import { recalculateAll } from '../engine';
import { seasonTable } from './seasonTable';

const LIGA: League = {
  id: 'Liga Test',
  country: 'España',
  name: 'Liga Test',
  confederation: 'UEFA',
  season: '2026/27',
  calendarFormat: 'Cruzada',
  teamCount: 4,
  regularSeasonRounds: '6',
  approximateStartDate: null,
  source: null,
  reliabilityNotes: null,
};

let seq = 0;
function partido(season: string, round: number, home: string, away: string, hg: number | null, ag: number | null, extra: Partial<Match> = {}): Match {
  const date = `${season.slice(0, 4)}-09-${String(++seq % 28 || 1).padStart(2, '0')}`;
  const base = { leagueId: LIGA.id, season, date, homeTeamName: home, awayTeamName: away };
  return {
    id: resolveMatchId({ providerId: null, ...base }),
    providerId: null,
    leagueId: LIGA.id,
    country: LIGA.country,
    season,
    date,
    round,
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
    source: 'test',
    updatedAt: null,
    statsSource: null,
    statsUpdatedAt: null,
    statsCitations: [],
    ...extra,
  };
}

/** Los mismos doce partidos de `statistics.test.ts`, parametrizados por temporada. */
const temporada = (season: string, goles = 0): Match[] => {
  seq = 0;
  return [
    partido(season, 1, 'Alfa', 'Beta', 2 + goles, 0),
    partido(season, 1, 'Gamma', 'Delta', 1, 1),
    partido(season, 2, 'Beta', 'Gamma', 0, 3),
    partido(season, 2, 'Delta', 'Alfa', 1, 2),
    partido(season, 3, 'Alfa', 'Gamma', 1, 1),
    partido(season, 3, 'Beta', 'Delta', 2, 1),
    partido(season, 4, 'Gamma', 'Alfa', 0, 0),
    partido(season, 4, 'Delta', 'Beta', 3, 2),
    partido(season, 5, 'Alfa', 'Delta', 4, 1),
    partido(season, 5, 'Gamma', 'Beta', 2, 2),
    partido(season, 6, 'Beta', 'Alfa', 1, 0),
    partido(season, 6, 'Delta', 'Gamma', 0, 2),
  ];
};

const params: ModelParams = DEFAULT_MODEL_PARAMS;

describe('tabla de una temporada concreta', () => {
  /*
   * La razón de ser de la prueba: `seasonTable` duplica la cadena de cálculo del motor para poder
   * aplicarla a una temporada cerrada. Si las dos se separan, la pantalla de la competición enseñaría
   * una tabla distinta de la que usa el resto de la aplicación, y nada lo avisaría.
   */
  it('da exactamente la misma tabla que el motor para la temporada vigente', () => {
    const vigente = temporada(LIGA.season);
    const delMotor = recalculateAll({ leagues: [LIGA], matches: vigente, fixtures: [], params }).standingsByLeague.get(LIGA.id)!;
    const deAqui = seasonTable(LIGA, vigente, params).standings;
    expect(deAqui).toEqual(delMotor);
  });

  it('y las mismas medias de liga', () => {
    const vigente = temporada(LIGA.season);
    const delMotor = recalculateAll({ leagues: [LIGA], matches: vigente, fixtures: [], params }).averagesByLeague.get(LIGA.id)!;
    expect(seasonTable(LIGA, vigente, params).averages).toEqual(delMotor);
  });

  it('una temporada cerrada se calcula sola, sin contagiarse de las demás', () => {
    // Alfa marca un gol más en la 2024-25: su tabla tiene que salir distinta de la de 2026/27.
    const pasada = temporada('2024-25', 1);
    const vigente = temporada(LIGA.season);

    const soloPasada = seasonTable(LIGA, pasada, params);
    const mezcladas = seasonTable(LIGA, [...pasada, ...vigente], params);

    expect(soloPasada.played).toHaveLength(12);
    expect(soloPasada.standings).toHaveLength(4);
    // Mezclar duplica los partidos por equipo: es justo lo que la pantalla no debe hacer.
    expect(mezcladas.played).toHaveLength(24);
    expect(soloPasada.standings[0].played).toBe(6);
    expect(mezcladas.standings[0].played).toBe(12);

    const golesPasada = soloPasada.standings.find((r) => r.teamName === 'Alfa')!.goalsFor;
    const golesVigente = seasonTable(LIGA, vigente, params).standings.find((r) => r.teamName === 'Alfa')!.goalsFor;
    expect(golesPasada).toBe(golesVigente + 1);
  });

  it('sin partidos no inventa una tabla vacía con medias de cero', () => {
    const r = seasonTable(LIGA, [], params);
    expect(r.standings).toEqual([]);
    expect(r.averages).toBeNull();
  });
});
