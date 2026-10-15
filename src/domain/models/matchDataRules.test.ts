import { describe, expect, it } from 'vitest';
import { MANUAL_FIELDS, MATCH_DATA, errorsForChanges, manualDataNames, validateMatchData, zeroMissing, type MatchDataValues } from './matchDataRules';
import type { Match } from '../../types';

const vacio = (): MatchDataValues => Object.fromEntries(MANUAL_FIELDS.map((k) => [k, null])) as MatchDataValues;
const GOLES = { home: 2, away: 1 };

describe('datos del partido escritos a mano', () => {
  it('vacío es «sin dato»: no hay nada que validar', () => {
    expect(validateMatchData(vacio(), GOLES)).toEqual({});
  });

  it('acepta un partido posible', () => {
    const v = {
      ...vacio(),
      possessionHome: 0.547,
      shotsHome: 14,
      shotsAway: 9,
      shotsOnTargetHome: 5,
      shotsOnTargetAway: 3,
      cornersHome: 6,
      redCardsAway: 0,
      xGHome: 1.84,
      xGAway: 0.61,
      homeFirstHalfGoals: 1,
      awayFirstHalfGoals: 1,
    };
    expect(validateMatchData(v, GOLES)).toEqual({});
  });

  it('rechaza lo imposible con el mismo criterio que a las fuentes', () => {
    const e = validateMatchData(
      {
        ...vacio(),
        cornersHome: 31,
        yellowCardsAway: 1.5,
        foulsHome: -1,
        possessionHome: 1.2,
        xGHome: Number.NaN,
        shotsHome: 4,
        shotsOnTargetHome: 6, // más que los tiros
        shotsAway: 10,
        shotsOnTargetAway: 0, // menos que el gol del visitante: vale, puede ser un autogol
      },
      GOLES,
    );
    expect(Object.keys(e).sort()).toEqual(
      ['cornersHome', 'foulsHome', 'possessionHome', 'shotsOnTargetHome', 'xGHome', 'yellowCardsAway'].sort(),
    );
  });

  it('el descanso lleva los dos lados y no supera el final', () => {
    expect(validateMatchData({ ...vacio(), homeFirstHalfGoals: 1 }, GOLES)).toHaveProperty('awayFirstHalfGoals');
    expect(validateMatchData({ ...vacio(), homeFirstHalfGoals: 3, awayFirstHalfGoals: 0 }, GOLES)).toHaveProperty('homeFirstHalfGoals');
  });

  it('un dato antiguo dudoso no impide escribir otro, pero cambiar los tiros sí revisa sus tiros a puerta', () => {
    const e = validateMatchData({ ...vacio(), shotsHome: 4, shotsOnTargetHome: 6 }, GOLES);
    expect(errorsForChanges(e, ['xGHome'])).toEqual({});
    expect(errorsForChanges(e, ['shotsHome'])).toHaveProperty('shotsOnTargetHome');
  });

  it('nombra los datos escritos a mano sin repetir local y visitante', () => {
    expect(manualDataNames(['xGHome', 'xGAway', 'homeFirstHalfGoals', 'awayFirstHalfGoals'])).toEqual(['xG', 'descanso']);
  });
});

/**
 * El botón «asignar 0» de Partidos. Lo que se fija aquí es que un 0 a bulto no pueda estropear nada:
 * que no pise un dato que ya estaba, que no entre donde el 0 es imposible y que quede como Manual.
 */
describe('asignar 0 al dato que falta', () => {
  const DATO = (id: string) => MATCH_DATA.find((d) => d.id === id)!;
  const AHORA = '2026-10-12T00:00:00.000Z';

  const partido = (extra: Partial<Match> = {}): Match =>
    ({
      id: 'x',
      providerId: null,
      leagueId: 'L',
      country: 'C',
      season: '2026',
      date: '2026-03-01',
      round: 1,
      homeTeamId: 'L|A',
      awayTeamId: 'L|B',
      homeTeamName: 'A',
      awayTeamName: 'B',
      homeGoals: 2,
      awayGoals: 1,
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

  it('rellena los dos lados y los marca como Manual', () => {
    const r = zeroMissing(partido(), DATO('redCards'), AHORA)!;
    expect([r.redCardsHome, r.redCardsAway]).toEqual([0, 0]);
    expect(r.manualFields).toEqual(['redCardsHome', 'redCardsAway']);
    expect(r.updatedAt).toBe(AHORA);
  });

  it('no pisa el lado que ya tenia dato', () => {
    const r = zeroMissing(partido({ redCardsHome: 1 }), DATO('redCards'), AHORA)!;
    expect([r.redCardsHome, r.redCardsAway]).toEqual([1, 0]);
    expect(r.manualFields).toEqual(['redCardsAway']);
  });

  it('no hace nada si el dato ya esta completo', () => {
    expect(zeroMissing(partido({ redCardsHome: 0, redCardsAway: 2 }), DATO('redCards'), AHORA)).toBeNull();
  });

  it('se niega cuando el 0 dejaria el partido imposible', () => {
    // 0 tiros con 3 tiros a puerta ya cargados no es un partido: se queda sin escribir.
    expect(zeroMissing(partido({ shotsOnTargetHome: 3, shotsAway: 8, shotsOnTargetAway: 2 }), DATO('shots'), AHORA)).toBeNull();
  });

  it('nunca toca el marcador, el descanso, la posesion ni el xG', () => {
    for (const id of ['score', 'halfTime', 'possession', 'xg']) {
      expect(zeroMissing(partido({ homeGoals: null, awayGoals: null }), DATO(id), AHORA)).toBeNull();
    }
  });
});
