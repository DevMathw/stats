import { describe, expect, it } from 'vitest';
import type { Fixture, Match } from '../../types';
import { buildTeamId, resolveMatchId } from '../models/ids';
import { calculateLeagueRounds, describeLeagueRounds } from './leagueRounds';

const L = 'Liga Test';

function match(round: number, home: string, away: string, hg: number | null, ag: number | null): Match {
  const date = `2026-09-${String(round).padStart(2, '0')}`;
  const base = { leagueId: L, season: '2026', date, homeTeamName: home, awayTeamName: away };
  return {
    id: resolveMatchId({ providerId: null, ...base }),
    providerId: null,
    leagueId: L,
    country: 'ES',
    season: '2026',
    date,
    round,
    homeTeamId: buildTeamId(L, home),
    awayTeamId: buildTeamId(L, away),
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

function fixture(round: number, home: string, away: string, status: Fixture['status'] = 'Programado'): Fixture {
  const date = `2026-10-${String(round).padStart(2, '0')}`;
  const base = { leagueId: L, season: '2026', date, homeTeamName: home, awayTeamName: away };
  return {
    id: resolveMatchId({ providerId: null, ...base }),
    providerId: null,
    leagueId: L,
    country: 'ES',
    season: '2026',
    date,
    round,
    homeTeamId: buildTeamId(L, home),
    awayTeamId: buildTeamId(L, away),
    homeTeamName: home,
    awayTeamName: away,
    status,
    source: null,
  };
}

describe('jornada actual y siguiente por liga', () => {
  it('la jornada actual es la mayor DISPUTADA', () => {
    const r = calculateLeagueRounds(
      [match(1, 'A', 'B', 1, 0), match(2, 'A', 'C', 2, 2), match(3, 'A', 'D', null, null)],
      [],
    ).get(L)!;
    // La J3 está cargada pero sin marcador: no cuenta como disputada.
    expect(r.currentRound).toBe(2);
    expect(r.nextRound).toBeNull();
  });

  it('la próxima jornada es la primera PENDIENTE, no currentRound + 1', () => {
    // J3 tiene un partido aplazado que sigue pendiente: la próxima sigue siendo la 3.
    const r = calculateLeagueRounds(
      [match(1, 'A', 'B', 1, 0), match(2, 'A', 'C', 0, 0), match(3, 'B', 'C', 1, 1)],
      [fixture(3, 'A', 'D', 'Aplazado'), fixture(4, 'A', 'B'), fixture(4, 'C', 'D')],
    ).get(L)!;
    expect(r.currentRound).toBe(3);
    expect(r.nextRound).toBe(3);
    expect(r.fixturesInNextRound).toBe(1);
    expect(r.pendingFixtures).toBe(3);
    expect(r.pendingRounds).toEqual([3, 4]);
  });

  it('cuenta los partidos de la próxima jornada', () => {
    const r = calculateLeagueRounds(
      [match(1, 'A', 'B', 1, 0)],
      [fixture(2, 'A', 'C'), fixture(2, 'B', 'D'), fixture(3, 'A', 'D')],
    ).get(L)!;
    expect(r.currentRound).toBe(1);
    expect(r.nextRound).toBe(2);
    expect(r.fixturesInNextRound).toBe(2);
    expect(r.pendingFixtures).toBe(3);
  });

  it('ignora los partidos cancelados', () => {
    const r = calculateLeagueRounds(
      [match(1, 'A', 'B', 1, 0)],
      [fixture(2, 'A', 'C', 'Cancelado'), fixture(3, 'B', 'D')],
    ).get(L)!;
    expect(r.nextRound).toBe(3);
    expect(r.pendingFixtures).toBe(1);
  });

  it('una liga sin partidos no tiene jornada actual', () => {
    const r = calculateLeagueRounds([], [fixture(1, 'A', 'B')]).get(L)!;
    expect(r.currentRound).toBeNull();
    expect(r.nextRound).toBe(1);
  });

  it('distingue lo que falta de la jornada en curso de la próxima jornada nueva', () => {
    // Caso real: la liga va por la J6, quedan 2 partidos de la J6 sin jugar, y la siguiente
    // jornada cargada es la J13 (las 7-12 no se han descargado).
    const r = calculateLeagueRounds(
      [match(5, 'A', 'B', 1, 0), match(6, 'A', 'C', 2, 1)],
      [fixture(6, 'B', 'C'), fixture(6, 'A', 'D'), fixture(13, 'C', 'D')],
    ).get(L)!;

    expect(r.currentRound).toBe(6);
    // Lo que falta de la jornada en curso NO se anuncia como "próxima jornada".
    expect(r.pendingInStartedRounds).toBe(2);
    expect(r.nextRound).toBe(6);
    expect(r.nextNewRound).toBe(13);
    expect(describeLeagueRounds(r)).toBe(
      'va por J6 · quedan 2 de jornadas ya empezadas · próxima nueva J13 (1)',
    );
  });

  it('el desglose por jornada muestra jugados y pendientes', () => {
    const r = calculateLeagueRounds(
      [match(1, 'A', 'B', 1, 0), match(1, 'C', 'D', 0, 0)],
      [fixture(2, 'A', 'C'), fixture(2, 'B', 'D')],
    ).get(L)!;
    expect(r.breakdown).toEqual([
      { phase: null, round: 1, played: 2, pending: 0 },
      { phase: null, round: 2, played: 0, pending: 2 },
    ]);
  });

  it('sin nada pendiente lo dice, en vez de inventar una próxima jornada', () => {
    const r = calculateLeagueRounds([match(3, 'A', 'B', 1, 1)], []).get(L)!;
    expect(r.nextRound).toBeNull();
    expect(r.nextNewRound).toBeNull();
    expect(describeLeagueRounds(r)).toBe('va por J3 · sin jornadas nuevas cargadas');
  });

  it('separa las ligas entre sí', () => {
    const other = { ...match(7, 'X', 'Y', 1, 1), leagueId: 'Otra' };
    const map = calculateLeagueRounds([match(2, 'A', 'B', 1, 0), other], []);
    expect(map.get(L)!.currentRound).toBe(2);
    expect(map.get('Otra')!.currentRound).toBe(7);
  });
});

describe('competiciones con fases', () => {
  /** Una fase con nombre propio vuelve a numerar desde la jornada 1 (LigaPro: «Championship Round»). */
  const conFase = <T extends Match | Fixture>(m: T, phase: string, date: string): T => ({ ...m, phase, date });

  it('no mezcla la jornada 1 de una fase final con la 1 de la fase regular', () => {
    const r = calculateLeagueRounds(
      [
        match(1, 'A', 'B', 1, 0),
        match(2, 'A', 'C', 1, 1),
        conFase(match(1, 'A', 'D', 2, 0), 'Championship Round', '2026-09-19'),
      ],
      [conFase(fixture(2, 'D', 'A'), 'Championship Round', '2026-10-11')],
    ).get(L)!;

    expect(r.breakdown).toEqual([
      { phase: null, round: 1, played: 1, pending: 0 },
      { phase: null, round: 2, played: 1, pending: 0 },
      { phase: 'Championship Round', round: 1, played: 1, pending: 0 },
      { phase: 'Championship Round', round: 2, played: 0, pending: 1 },
    ]);
    // La liga va por la J1 DE LA FASE FINAL, no por la J2 de la regular.
    expect(r.currentPhase).toBe('Championship Round');
    expect(r.currentRound).toBe(1);
    expect(r.nextPhase).toBe('Championship Round');
    expect(r.nextRound).toBe(2);
    expect(r.nextNewRound).toBe(2);
    expect(r.pendingInStartedRounds).toBe(0);
    expect(describeLeagueRounds(r)).toBe('va por Championship Round · J1 · próxima nueva J2 (1)');
  });
});
