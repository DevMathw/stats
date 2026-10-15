import { describe, expect, it } from 'vitest';
import type { LeagueAverages, MatchProjection } from '../../types';
import { projectionDrivers } from './drivers';

const averages = {
  leagueId: 'L', homeGoalsFor: 1.5, homeGoalsAgainst: 1.1, awayGoalsFor: 1.1, awayGoalsAgainst: 1.5,
  homeCornersFor: 5, homeCornersAgainst: 4, awayCornersFor: 4, awayCornersAgainst: 5,
  homeCardsFor: 2, homeCardsAgainst: 2, awayCardsFor: 2, awayCardsAgainst: 2,
  homeShotsFor: 13, homeShotsAgainst: 11, awayShotsFor: 11, awayShotsAgainst: 13,
  homeSotFor: 5, homeSotAgainst: 4, awaySotFor: 4, awaySotAgainst: 5,
  ppg: 1.35, drawRate: 0.25, firstHalfShare: 0.45, halfTimeMatches: 100,
  homeXgFor: 1.4, homeXgAgainst: 1.1, awayXgFor: 1.1, awayXgAgainst: 1.4,
} satisfies LeagueAverages;

const proyeccion = (over: Partial<MatchProjection['breakdown']>, goles = { home: 2.1, away: 1.0 }): MatchProjection =>
  ({
    fixtureId: 'f', leagueId: 'L', date: '2026-09-20', kickoffTime: null, kickoffUtc: null, phase: null, round: 5,
    homeTeamId: 'A', awayTeamId: 'B', homeTeamName: 'A', awayTeamName: 'B',
    expectedGoalsHome: goles.home, expectedGoalsAway: goles.away, expectedGoalsTotal: goles.home + goles.away,
    expectedCornersHome: null, expectedCornersAway: null, expectedCornersTotal: null,
    expectedCardsHome: null, expectedCardsAway: null, expectedCardsTotal: null,
    expectedShotsHome: null, expectedShotsAway: null, expectedShotsTotal: null,
    expectedSotHome: null, expectedSotAway: null, expectedSotTotal: null,
    expectedGoalsFirstHalf: null, expectedGoalsSecondHalf: null,
    probOver15: 0.7, probOver25: 0.5, probOver35: 0.3,
    probOver05FirstHalf: null, probOver15FirstHalf: null, probOver05SecondHalf: null, probOver15SecondHalf: null,
    probBtts: 0.5, probCleanSheetHome: 0.3, probCleanSheetAway: 0.2,
    probs1x2: { home: 0.5, draw: 0.25, away: 0.25 }, resultPick: '1', mostLikelyScoreline: '2 - 1',
    source: 'libro', modelsUsed: null, modelConfidence: null,
    breakdown: {
      baseHome: 1.5, baseAway: 1.1, form5Home: null, form5Away: null, form10Home: null, form10Away: null,
      xgHome: null, xgAway: null, h2hAdjustment: 0, h2hMatches: 0, sosAdjustmentHome: 0, sosAdjustmentAway: 0,
      xgFellBackHome: false, xgFellBackAway: false, ...over,
    },
  }) as MatchProjection;

describe('por qué el modelo proyecta esto', () => {
  it('sin medias de liga no se inventa una explicación', () => {
    expect(projectionDrivers(proyeccion({}), undefined)).toEqual([]);
  });

  it('el factor principal es la diferencia de goles esperados', () => {
    const d = projectionDrivers(proyeccion({}), averages);
    expect(d[0].label).toBe('Diferencia de goles esperados');
    expect(d[0].side).toBe('home');
    expect(d[0].value).toContain('+1.10');
  });

  it('una forma muy por encima de la temporada aparece; una igual, no', () => {
    const conForma = projectionDrivers(proyeccion({ form5Home: 2.4, baseHome: 1.5 }), averages);
    expect(conForma.some((x) => x.label.includes('Forma del local'))).toBe(true);
    const sinCambio = projectionDrivers(proyeccion({ form5Home: 1.52, baseHome: 1.5 }), averages);
    expect(sinCambio.some((x) => x.label.includes('Forma del local'))).toBe(false);
  });

  it('el H2H solo sale si hay enfrentamientos en la base', () => {
    expect(projectionDrivers(proyeccion({ h2hMatches: 0, h2hAdjustment: 0 }), averages).some((x) => x.label.includes('directos'))).toBe(false);
    expect(projectionDrivers(proyeccion({ h2hMatches: 3, h2hAdjustment: 0.25 }), averages).some((x) => x.label.includes('directos'))).toBe(true);
  });

  it('no se enseñan más de cuatro factores', () => {
    const d = projectionDrivers(
      proyeccion({ form5Home: 2.4, form5Away: 0.5, xgHome: 2.2, xgAway: 0.6, h2hMatches: 4, h2hAdjustment: 0.3, sosAdjustmentHome: 0.05, sosAdjustmentAway: -0.04 }),
      averages,
    );
    expect(d.length).toBe(4);
    // Y vienen ordenados de más a menos peso.
    expect(d[0].weight).toBeGreaterThanOrEqual(d[3].weight);
  });
});
