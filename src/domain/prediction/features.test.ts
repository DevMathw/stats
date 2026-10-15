import { describe, expect, it } from 'vitest';
import type { Match } from '../../types';
import { buildDatasetWithState, featuresForFixture } from './features';
import { ELO_INICIAL } from './elo';

let contador = 0;
function partido(date: string, home: string, away: string, hg: number, ag: number, extra: Partial<Match> = {}): Match {
  contador++;
  return {
    id: `m${contador}`,
    providerId: null,
    leagueId: 'L',
    country: 'ES',
    season: '2026',
    date,
    round: 1,
    homeTeamId: home,
    awayTeamId: away,
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
  };
}

describe('dataset sin fuga temporal', () => {
  it('la primera fila no sabe nada: ningún partido anterior', () => {
    const { rows } = buildDatasetWithState([partido('2026-03-01', 'A', 'B', 2, 0)]);
    expect(rows).toHaveLength(1);
    expect(rows[0].features.playedHome).toBe(0);
    expect(rows[0].features.eloHome).toBe(ELO_INICIAL);
    expect(rows[0].features.ppgHome).toBeNull();
    expect(rows[0].features.leagueGoals).toBeNull();
    // La etiqueta sí es el resultado real: es lo que se predice.
    expect(rows[0].labels).toMatchObject({ result: '1', totalGoals: 2, btts: 0 });
  });

  it('dos partidos del MISMO día no se ven entre ellos', () => {
    const { rows } = buildDatasetWithState([
      partido('2026-03-01', 'A', 'B', 3, 0),
      partido('2026-03-01', 'C', 'D', 1, 1),
      partido('2026-03-08', 'B', 'C', 0, 0),
    ]);
    // El segundo partido del día 1 no ve al primero.
    expect(rows[1].features.leagueGoals).toBeNull();
    expect(rows[1].features.playedHome).toBe(0);
    // El del día 8 sí ve los dos del día 1: (3+0+1+1)/2 = 2.5 goles por partido.
    expect(rows[2].features.leagueGoals).toBe(2.5);
    expect(rows[2].features.playedHome).toBe(1);
  });

  it('la forma y el descanso salen de los partidos anteriores', () => {
    const { rows } = buildDatasetWithState([
      partido('2026-03-01', 'A', 'B', 2, 0),
      partido('2026-03-08', 'A', 'C', 1, 1),
      partido('2026-03-15', 'A', 'D', 0, 1),
      partido('2026-03-18', 'A', 'E', 0, 0),
    ]);
    const ultima = rows[3].features;
    // A llevaba 3 partidos: ganar, empatar y perder → 4 puntos en 3 partidos.
    expect(ultima.playedHome).toBe(3);
    expect(ultima.ppgHome).toBeCloseTo(4 / 3, 6);
    expect(ultima.form5Home).toBeCloseTo(4 / 3, 6);
    // Del 15 al 18 hay 3 días de descanso.
    expect(ultima.restHome).toBe(3);
  });

  it('el Elo sube al que gana y baja al que pierde, y no antes de jugar', () => {
    const { rows } = buildDatasetWithState([partido('2026-03-01', 'A', 'B', 3, 0), partido('2026-03-08', 'A', 'B', 0, 0)]);
    expect(rows[0].features.eloDiff).toBe(0);
    expect(rows[1].features.eloHome).toBeGreaterThan(ELO_INICIAL);
    expect(rows[1].features.eloAway).toBeLessThan(ELO_INICIAL);
  });

  it('el xG solo entra cuando la fuente lo publica', () => {
    const { rows } = buildDatasetWithState([
      partido('2026-03-01', 'A', 'B', 1, 0, { xGHome: 1.4, xGAway: 0.6 }),
      partido('2026-03-08', 'A', 'C', 1, 0),
      partido('2026-03-15', 'A', 'D', 1, 0),
    ]);
    expect(rows[1].features.xgForHome).toBe(1.4);
    // El segundo partido no trae xG: la media sigue siendo la del único que lo tenía, no baja a 0.
    expect(rows[2].features.xgForHome).toBe(1.4);
    expect(rows[0].features.xgForHome).toBeNull();
  });

  it('un partido por jugar usa TODO el histórico', () => {
    const { state } = buildDatasetWithState([partido('2026-03-01', 'A', 'B', 2, 0), partido('2026-03-08', 'B', 'A', 1, 1)]);
    const f = featuresForFixture(state, { leagueId: 'L', homeTeamId: 'A', awayTeamId: 'B', date: '2026-03-15' });
    expect(f).not.toBeNull();
    expect(f!.playedHome).toBe(2);
    expect(f!.h2hMatches).toBe(2);
    expect(f!.eloHome).toBeGreaterThan(f!.eloAway);
  });

  it('un equipo del que no se sabe nada no tiene variables que inventar', () => {
    const { state } = buildDatasetWithState([partido('2026-03-01', 'A', 'B', 2, 0)]);
    expect(featuresForFixture(state, { leagueId: 'L', homeTeamId: 'A', awayTeamId: 'Z', date: '2026-03-15' })).toBeNull();
    expect(featuresForFixture(state, { leagueId: 'OTRA', homeTeamId: 'A', awayTeamId: 'B', date: '2026-03-15' })).toBeNull();
  });
});
