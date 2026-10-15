import { describe, expect, it } from 'vitest';
import type { Fixture, Match } from '../../types';
import { DEFAULT_MODEL_PARAMS } from '../models/params';
import { recalculateAll } from '../engine';
import type { EnginePrediction } from './engine';

let n = 0;
const partido = (date: string, home: string, away: string, hg: number, ag: number): Match => ({
  id: `m${++n}`, providerId: null, leagueId: 'L', country: 'ES', season: '2026', date, round: 1,
  homeTeamId: `L|${home}`, awayTeamId: `L|${away}`, homeTeamName: home, awayTeamName: away,
  homeGoals: hg, awayGoals: ag, homeFirstHalfGoals: null, awayFirstHalfGoals: null,
  shotsHome: null, shotsAway: null, shotsOnTargetHome: null, shotsOnTargetAway: null, possessionHome: null,
  cornersHome: null, cornersAway: null, yellowCardsHome: null, yellowCardsAway: null, redCardsHome: null, redCardsAway: null,
  foulsHome: null, foulsAway: null, offsidesHome: null, offsidesAway: null, xGHome: null, xGAway: null,
  source: null, updatedAt: null, statsSource: null, statsUpdatedAt: null, statsCitations: [],
});

const pendiente: Fixture = {
  id: 'f1', providerId: null, leagueId: 'L', country: 'ES', season: '2026', date: '2026-05-01', round: 9,
  homeTeamId: 'L|A', awayTeamId: 'L|B', homeTeamName: 'A', awayTeamName: 'B', status: 'Programado', source: null,
};

const liga: Match[] = [];
for (let i = 0; i < 8; i++) {
  liga.push(partido(`2026-03-0${i + 1}`, 'A', 'C', 2, 1), partido(`2026-03-0${i + 1}`, 'B', 'D', 1, 1), partido(`2026-04-0${i + 1}`, 'C', 'B', 0, 2), partido(`2026-04-0${i + 1}`, 'D', 'A', 1, 3));
}

const prediccion: EnginePrediction = {
  probs1x2: { home: 0.7, draw: 0.2, away: 0.1 },
  expectedGoals: { home: 2.4, away: 0.6 },
  used: ['elo', 'boosting'],
  confidence: 7.2,
};

const proyeccion = (source: 'libro' | 'mixto' | 'ensemble', predictions?: Map<string, EnginePrediction>) =>
  recalculateAll({
    leagues: [{ id: 'L', country: 'ES', name: 'L', confederation: 'UEFA', season: '2026', calendarFormat: '', teamCount: 4, regularSeasonRounds: null, approximateStartDate: null, source: null, reliabilityNotes: null }],
    matches: liga,
    fixtures: [pendiente],
    params: { ...DEFAULT_MODEL_PARAMS, projectionSource: source },
    predictions,
  }).projectionsByFixtureId.get('f1')!;

describe('el ensemble como fuente de la proyección', () => {
  it('con «libro» no cambia nada aunque haya predicción', () => {
    const p = proyeccion('libro', new Map([['f1', prediccion]]));
    expect(p.source).toBe('libro');
    expect(p.probs1x2.home).not.toBeCloseTo(0.7, 6);
    expect(p.modelsUsed).toBeNull();
  });

  it('con «ensemble» manda la predicción: 1X2 y goles esperados', () => {
    const p = proyeccion('ensemble', new Map([['f1', prediccion]]));
    expect(p.source).toBe('ensemble');
    // Pasa por la mezcla con peso 0 y una normalización: la igualdad es hasta el último bit.
    expect(p.probs1x2.home).toBeCloseTo(prediccion.probs1x2.home, 12);
    expect(p.probs1x2.draw).toBeCloseTo(prediccion.probs1x2.draw, 12);
    expect(p.probs1x2.away).toBeCloseTo(prediccion.probs1x2.away, 12);
    expect(p.expectedGoalsHome).toBe(2.4);
    expect(p.expectedGoalsAway).toBe(0.6);
    expect(p.modelsUsed).toEqual(['elo', 'boosting']);
    expect(p.modelConfidence).toBe(7.2);
  });

  it('los mercados derivados cuadran con los goles del ensemble', () => {
    const p = proyeccion('ensemble', new Map([['f1', prediccion]]));
    // Over y BTTS salen de las nuevas λ, no de las del libro.
    expect(p.probOver25).toBeGreaterThan(0.3);
    expect(p.probBtts).toBeLessThan(0.6); // 0,6 goles esperados del visitante
    // El marcador más probable no contradice al pick.
    expect(p.mostLikelyScoreline).toBe('2 - 0');
    expect(p.resultPick).toBe('1');
  });

  it('un partido sin predicción se queda con el libro y lo dice', () => {
    const p = proyeccion('ensemble', new Map());
    expect(p.source).toBe('libro');
    expect(p.modelsUsed).toBeNull();
  });

  it('«mixto» queda entre los dos: 70 % libro y 30 % modelos', () => {
    const libro = proyeccion('libro');
    const ensemble = proyeccion('ensemble', new Map([['f1', prediccion]]));
    const mixto = proyeccion('mixto', new Map([['f1', prediccion]]));

    expect(mixto.source).toBe('mixto');
    // Los goles esperados caen entre los dos, más cerca del libro.
    expect(mixto.expectedGoalsHome).toBeCloseTo(0.7 * libro.expectedGoalsHome + 0.3 * ensemble.expectedGoalsHome, 6);
    expect(mixto.expectedGoalsAway).toBeCloseTo(0.7 * libro.expectedGoalsAway + 0.3 * ensemble.expectedGoalsAway, 6);
    // Y el 1X2 también, sumando 1.
    expect(mixto.probs1x2.home).toBeGreaterThan(Math.min(libro.probs1x2.home, ensemble.probs1x2.home));
    expect(mixto.probs1x2.home).toBeLessThan(Math.max(libro.probs1x2.home, ensemble.probs1x2.home));
    expect(mixto.probs1x2.home + mixto.probs1x2.draw + mixto.probs1x2.away).toBeCloseTo(1, 9);
  });

  it('corners y tarjetas siguen siendo del libro: los modelos no los modelan', () => {
    const conModelos = proyeccion('ensemble', new Map([['f1', prediccion]]));
    const conLibro = proyeccion('libro');
    expect(conModelos.expectedCornersTotal).toBe(conLibro.expectedCornersTotal);
    expect(conModelos.expectedCardsTotal).toBe(conLibro.expectedCardsTotal);
  });
});
