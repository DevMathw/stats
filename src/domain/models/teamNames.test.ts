import { describe, expect, it } from 'vitest';
import { unifyTeamNames } from './teamNames';
import type { Fixture, League, Match } from '../../types';

const LIGA: League = {
  id: 'BetPlay', country: 'Colombia', name: 'BetPlay', confederation: 'CONMEBOL', season: '2026/27*',
  calendarFormat: 'Ano calendario', teamCount: 20, regularSeasonRounds: '19', approximateStartDate: null,
  source: null, reliabilityNotes: null,
};

let n = 0;
const partido = (season: string, date: string, home: string, away: string, refs: [string | null, string | null]): Match =>
  ({
    id: `BetPlay|${season}|${date}|${home}|${away}`, providerId: null, leagueId: 'BetPlay', country: 'Colombia',
    season, date, round: ++n, homeTeamId: `BetPlay|${home}`, awayTeamId: `BetPlay|${away}`,
    homeTeamName: home, awayTeamName: away, homeGoals: 1, awayGoals: 0, homeTeamRef: refs[0], awayTeamRef: refs[1],
  }) as Match;

const pendiente = (home: string, away: string, refs: [string | null, string | null], providerId: string | null = null): Fixture =>
  ({
    id: providerId ? `p:${providerId}` : `BetPlay|2026/27*|2026-11-06|${home}|${away}`, providerId, leagueId: 'BetPlay',
    country: 'Colombia', season: '2026/27*', date: '2026-11-06', round: 18, homeTeamId: `BetPlay|${home}`,
    awayTeamId: `BetPlay|${away}`, homeTeamName: home, awayTeamName: away, status: 'Programado',
    homeTeamRef: refs[0], awayTeamRef: refs[1],
  }) as Fixture;

describe('un club, un nombre', () => {
  it('renombra el histórico con el nombre de la temporada en curso, no al revés', () => {
    const matches = [
      // Histórico: 2 filas con el nombre viejo.
      partido('2025', '2025-03-01', 'Fortaleza FC', 'Millonarios', ['espn-4928', 'espn-5484']),
      partido('2025', '2025-04-01', 'Millonarios', 'Fortaleza FC', ['espn-5484', 'espn-4928']),
      // Temporada en curso: 1 fila con el nombre nuevo.
      partido('2026/27*', '2026-08-01', 'Fortaleza CEIF', 'Millonarios', ['espn-4928', 'espn-5484']),
    ];
    const r = unifyTeamNames({ leagues: [LIGA], matches, fixtures: [] });
    expect(r.renamed).toEqual([{ leagueId: 'BetPlay', from: 'Fortaleza FC', to: 'Fortaleza CEIF', rows: 2 }]);
    expect(r.matches.map((m) => `${m.homeTeamName} - ${m.awayTeamName}`)).toEqual([
      'Fortaleza CEIF - Millonarios',
      'Millonarios - Fortaleza CEIF',
      'Fortaleza CEIF - Millonarios',
    ]);
    // El id y la clave de equipo acompañan al nombre: si no, la fila queda descolgada de su equipo.
    expect(r.matches[0].homeTeamId).toBe('BetPlay|Fortaleza CEIF');
    expect(r.matches[0].id).toBe('BetPlay|2025|2025-03-01|Fortaleza CEIF|Millonarios');
  });

  it('gana la temporada en curso aunque el nombre viejo tenga muchas más filas', () => {
    const matches = [
      ...Array.from({ length: 30 }, (_, i) => partido('2025', `2025-03-${String(i + 1).padStart(2, '0')}`, 'Alianza Valledupar', 'Millonarios', ['espn-9761', 'espn-5484'])),
      partido('2026/27*', '2026-08-01', 'Alianza FC', 'Millonarios', ['espn-9761', 'espn-5484']),
    ];
    const r = unifyTeamNames({ leagues: [LIGA], matches, fixtures: [] });
    expect(r.renamed).toEqual([{ leagueId: 'BetPlay', from: 'Alianza Valledupar', to: 'Alianza FC', rows: 30 }]);
  });

  it('un club que solo está en el histórico conserva su nombre', () => {
    const matches = [partido('2025', '2025-03-01', 'Envigado', 'Millonarios', ['espn-5481', 'espn-5484'])];
    const r = unifyTeamNames({ leagues: [LIGA], matches, fixtures: [] });
    expect(r.renamed).toEqual([]);
    expect(r.matches).toBe(matches);
  });

  it('sin referencia global no se toca nada: el parecido de nombre no decide', () => {
    const matches = [
      partido('2025', '2025-03-01', 'Deportivo Cali', 'Millonarios', [null, null]),
      partido('2026/27*', '2026-08-01', 'Cali', 'Millonarios', [null, null]),
    ];
    const r = unifyTeamNames({ leagues: [LIGA], matches, fixtures: [] });
    expect(r.renamed).toEqual([]);
    expect(r.matches).toBe(matches);
  });

  it('un pendiente con id de proveedor se renombra sin perder su id, que es lo que enlaza los picks', () => {
    const fixtures = [
      pendiente('Fortaleza FC', 'Millonarios', ['espn-4928', 'espn-5484'], 'FotMob:1000014220'),
      pendiente('Fortaleza CEIF', 'Junior', ['espn-4928', 'espn-4815']),
      pendiente('Deportes Tolima', 'Fortaleza CEIF', ['espn-5489', 'espn-4928']),
    ];
    const r = unifyTeamNames({ leagues: [LIGA], matches: [], fixtures });
    expect(r.fixtures[0].homeTeamName).toBe('Fortaleza CEIF');
    expect(r.fixtures[0].id).toBe('p:FotMob:1000014220');
  });

  it('es idempotente', () => {
    const matches = [
      partido('2025', '2025-03-01', 'Santa Fe', 'Millonarios', ['espn-5488', 'espn-5484']),
      partido('2026/27*', '2026-08-01', 'Independiente Santa Fe', 'Millonarios', ['espn-5488', 'espn-5484']),
    ];
    const una = unifyTeamNames({ leagues: [LIGA], matches, fixtures: [] });
    const dos = unifyTeamNames({ leagues: [LIGA], matches: una.matches, fixtures: una.fixtures });
    expect(dos.renamed).toEqual([]);
    expect(dos.matches).toBe(una.matches);
  });
});
