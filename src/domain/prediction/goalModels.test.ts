import { describe, expect, it } from 'vitest';
import type { Match } from '../../types';
import { poissonModel, xgModel } from './models';
import { DEFAULT_MODEL_PARAMS } from '../models/params';

let n = 0;
const partido = (home: string, away: string, hg: number, ag: number, xg?: [number, number]): Match => ({
  id: `m${++n}`, providerId: null, leagueId: 'L', country: 'ES', season: '2026', date: `2026-03-${String((n % 28) + 1).padStart(2, '0')}`,
  round: 1, homeTeamId: home, awayTeamId: away, homeTeamName: home, awayTeamName: away,
  homeGoals: hg, awayGoals: ag, homeFirstHalfGoals: null, awayFirstHalfGoals: null,
  shotsHome: null, shotsAway: null, shotsOnTargetHome: null, shotsOnTargetAway: null, possessionHome: null,
  cornersHome: null, cornersAway: null, yellowCardsHome: null, yellowCardsAway: null, redCardsHome: null, redCardsAway: null,
  foulsHome: null, foulsAway: null, offsidesHome: null, offsidesAway: null,
  xGHome: xg?.[0] ?? null, xGAway: xg?.[1] ?? null,
  source: null, updatedAt: null, statsSource: null, statsUpdatedAt: null, statsCitations: [],
});

/** Liga de 4 equipos con ~2,5 goles por partido: lo normal en el fútbol. */
const liga = (): Match[] => {
  const equipos = ['A', 'B', 'C', 'D'];
  const out: Match[] = [];
  for (let v = 0; v < 6; v++) {
    for (const l of equipos) for (const vi of equipos) if (l !== vi) out.push(partido(l, vi, (v + l.charCodeAt(0)) % 3, (v + vi.charCodeAt(0)) % 2, [1.3, 1.0]));
  }
  return out;
};

const ctx = (matches: Match[]) => ({ rows: [], matches, leagues: [], params: DEFAULT_MODEL_PARAMS, cutoff: '2026-06-01' });
const input = { leagueId: 'L', homeTeamId: 'A', awayTeamId: 'B', date: '2026-06-01', features: {} as never };

describe('modelos de goles', () => {
  it('los goles esperados se parecen a los de la liga, no se disparan', () => {
    const matches = liga();
    const media = matches.reduce((a, m) => a + m.homeGoals! + m.awayGoals!, 0) / matches.length;
    const p = poissonModel.fit(ctx(matches))!.predict(input)!;
    const total = p.expectedGoals!.home + p.expectedGoals!.away;
    // Con equipos parecidos, el total esperado no puede alejarse del de la liga.
    expect(total).toBeGreaterThan(media * 0.5);
    expect(total).toBeLessThan(media * 2);
  });

  it('las probabilidades 1X2 suman 1 y el Over baja al subir la línea', () => {
    const p = poissonModel.fit(ctx(liga()))!.predict(input)!;
    expect(p.probs1x2.home + p.probs1x2.draw + p.probs1x2.away).toBeCloseTo(1, 9);
    expect(p.over[1.5]!).toBeGreaterThan(p.over[2.5]!);
    expect(p.over[2.5]!).toBeGreaterThan(p.over[3.5]!);
    expect(p.scorelines![0].probability).toBeGreaterThanOrEqual(p.scorelines![1].probability);
  });

  it('el modelo xG usa la escala de goles de la liga', () => {
    const matches = liga();
    const p = xgModel.fit(ctx(matches))!.predict(input)!;
    const total = p.expectedGoals!.home + p.expectedGoals!.away;
    const media = matches.reduce((a, m) => a + m.homeGoals! + m.awayGoals!, 0) / matches.length;
    expect(total).toBeGreaterThan(media * 0.5);
    expect(total).toBeLessThan(media * 2);
  });

  it('un equipo que no está en la liga no recibe una predicción inventada', () => {
    const fit = poissonModel.fit(ctx(liga()))!;
    expect(fit.predict({ ...input, homeTeamId: 'Z' })).toBeNull();
    expect(fit.predict({ ...input, leagueId: 'OTRA' })).toBeNull();
  });
});
