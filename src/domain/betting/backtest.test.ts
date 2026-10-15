import { describe, expect, it } from 'vitest';
import type { League, Match } from '../../types';
import { DEFAULT_MODEL_PARAMS } from '../models/params';
import { backtestLeague, summarizePredictions } from './backtest';

const LIGA: League = {
  id: 'Mini',
  country: 'ES',
  name: 'Mini',
  confederation: 'UEFA',
  season: '2026',
  calendarFormat: 'Anual',
  teamCount: 4,
  regularSeasonRounds: null,
  approximateStartDate: null,
  source: null,
  reliabilityNotes: null,
};

const EQUIPOS = ['A', 'B', 'C', 'D'];
const CRUCES = [
  [[0, 1], [2, 3]],
  [[0, 2], [3, 1]],
  [[0, 3], [1, 2]],
];

function partido(round: number, h: string, a: string, hg: number, ag: number): Match {
  const date = new Date(Date.UTC(2026, 0, 1 + round * 7)).toISOString().slice(0, 10);
  return {
    id: `${round}-${h}-${a}`,
    providerId: null,
    leagueId: 'Mini',
    country: 'ES',
    season: '2026',
    date,
    round,
    homeTeamId: `Mini|${h}`,
    awayTeamId: `Mini|${a}`,
    homeTeamName: h,
    awayTeamName: a,
    homeGoals: hg,
    awayGoals: ag,
    homeFirstHalfGoals: null,
    awayFirstHalfGoals: null,
    shotsHome: null,
    shotsAway: null,
    shotsOnTargetHome: null,
    shotsOnTargetAway: null,
    possessionHome: null,
    cornersHome: 4 + ((round * 3 + hg) % 5),
    cornersAway: 3 + ((round + ag) % 4),
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

/** 24 jornadas: cada equipo juega 12 en casa. Goles pseudoaleatorios pero fijos. */
function temporada(): Match[] {
  const out: Match[] = [];
  for (let r = 1; r <= 24; r++) {
    for (const [i, j] of CRUCES[r % 3]) {
      const [h, a] = r % 2 ? [i, j] : [j, i];
      out.push(partido(r, EQUIPOS[h], EQUIPOS[a], (r * 7 + h * 3) % 4, (r * 5 + a) % 3));
    }
  }
  return out;
}

describe('Backtest walk-forward', () => {
  const matches = temporada();

  it('solo evalúa partidos con muestra previa suficiente', () => {
    const r = backtestLeague(LIGA, matches, DEFAULT_MODEL_PARAMS, 3);
    expect(r.evaluated).toBeGreaterThan(0);
    expect(r.skipped).toBeGreaterThan(0);
    expect(r.evaluated + r.skipped).toBe(matches.length);
    for (const p of r.predictions) {
      expect(p.probability).toBeGreaterThan(0);
      expect(p.probability).toBeLessThan(1);
      expect([0, 1]).toContain(p.outcome);
    }
  });

  it('no usa información futura: cambiar el último partido no altera predicciones anteriores', () => {
    const base = backtestLeague(LIGA, matches, DEFAULT_MODEL_PARAMS, 3);
    const alterados = matches.map((m, i) => (i === matches.length - 1 ? { ...m, homeGoals: 9, awayGoals: 0 } : m));
    const otra = backtestLeague(LIGA, alterados, DEFAULT_MODEL_PARAMS, 3);
    const ultimaFecha = matches.at(-1)!.date;
    const antes = (ps: typeof base.predictions) => ps.filter((p) => p.date < ultimaFecha).map((p) => p.probability);
    expect(antes(otra.predictions)).toEqual(antes(base.predictions));
  });

  it('el resultado de cada predicción sale del marcador real', () => {
    const r = backtestLeague(LIGA, matches, DEFAULT_MODEL_PARAMS, 3);
    const byId = new Map(matches.map((m) => [m.id, m]));
    for (const p of r.predictions.filter((x) => x.market === 'Over 2.5 goles')) {
      const m = byId.get(p.matchId)!;
      expect(p.outcome).toBe(m.homeGoals! + m.awayGoals! > 2.5 ? 1 : 0);
    }
  });

  it('sin tarjetas publicadas no hay predicciones de tarjetas', () => {
    const r = backtestLeague(LIGA, matches, DEFAULT_MODEL_PARAMS, 3);
    expect(r.predictions.some((p) => p.family === 'tarjetas')).toBe(false);
  });

  it('resumen: métricas solo con muestra suficiente', () => {
    const r = backtestLeague(LIGA, matches, DEFAULT_MODEL_PARAMS, 3);
    const pocas = r.predictions.filter((p) => p.market === 'Over 2.5 goles').slice(0, 10);
    const over = summarizePredictions(pocas, (p) => ({ key: p.market, label: p.market }))[0];
    expect(over.n).toBe(10);
    expect(over.brier).toBeNull();
    expect(over.skill).toBeNull();
    const todas = summarizePredictions(r.predictions, () => ({ key: 'todo', label: 'Todo' }))[0];
    expect(todas.n).toBeGreaterThanOrEqual(30);
    expect(todas.brier).not.toBeNull();
    expect(todas.skill).not.toBeNull();
  });
});
