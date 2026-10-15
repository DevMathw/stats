import { afterEach, describe, expect, it, vi } from 'vitest';
import type { League } from '../../types';
import { OfficialSourcesProvider, type OfficialFetch, type OfficialMatch } from './officialSources';

const LALIGA: League = {
  id: 'LaLiga',
  name: 'LaLiga',
  country: 'Espana',
  confederation: 'UEFA',
  season: '2026/27',
  calendarFormat: '',
  teamCount: 20,
  regularSeasonRounds: null,
  approximateStartDate: null,
  source: null,
  reliabilityNotes: null,
};

const partido = (over: Partial<OfficialMatch>): OfficialMatch => ({
  sourceId: '1',
  round: 4,
  date: '2026-09-06',
  time: '21:00',
  utc: '2026-09-06T19:00:00.000Z',
  phase: null,
  homeTeam: 'Sevilla FC',
  awayTeam: 'Real Betis',
  homeGoals: 2,
  awayGoals: 0,
  homeHalfTime: null,
  awayHalfTime: null,
  status: 'finished',
  ...over,
});

afterEach(() => vi.unstubAllGlobals());

describe('OfficialSourcesProvider', () => {
  it('solo los terminados con marcador pasan a disputados; lo demás, a pendientes', async () => {
    const body: OfficialFetch = {
      league: { name: 'LaLiga', file: 'LaLiga.xlsx', officialUrl: 'https://www.laliga.com/' },
      source: 'laliga.com',
      url: 'https://www.laliga.com/es-ES/laliga-easports/resultados',
      secondary: false,
      season: '2026/27',
      notes: [],
      attempts: [],
      matches: [
        partido({}),
        partido({ sourceId: '2', status: 'postponed', homeGoals: null, awayGoals: null, homeTeam: 'Getafe CF' }),
        partido({ sourceId: '3', status: 'live', homeGoals: 1, awayGoals: 1, homeTeam: 'Girona FC' }),
        partido({ sourceId: '4', round: null, homeTeam: 'Villarreal CF' }),
      ],
    };
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(body)));
    vi.stubGlobal('fetch', fetchMock);

    const p = new OfficialSourcesProvider([LALIGA]);
    const jugados = await p.getMatches('LaLiga');
    const pendientes = await p.getFixtures('LaLiga');

    expect(jugados.map((m) => [m.homeTeamName, m.providerId, m.kickoffTime, m.source])).toEqual([
      ['Sevilla FC', 'laliga.com:1', '21:00', 'laliga.com'],
    ]);
    // Un partido en juego con 1-1 NO es un resultado: sigue pendiente.
    expect(pendientes.map((f) => [f.homeTeamName, f.status])).toEqual([
      ['Getafe CF', 'Aplazado'],
      ['Girona FC', 'Programado'],
    ]);
    expect(p.takeWarnings()).toEqual(['Villarreal CF - Real Betis (2026-09-06) descartado: la fuente no publica su jornada']);
    // Una sola consulta por liga, identificada por su clave interna.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ slug: 'esp.1', season: '2026/27' });
  });

  it('si ninguna fuente sirve, guarda los intentos para el registro', async () => {
    const attempts = [{ source: 'laliga.com', url: null, secondary: false, ok: false, error: 'respondió 500' }];
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ error: 'Ninguna fuente', file: 'LaLiga.xlsx', attempts }), { status: 502 }));
    const p = new OfficialSourcesProvider([LALIGA]);
    await expect(p.getMatches('LaLiga')).rejects.toThrow('Ninguna fuente');
    expect(p.failures.get('LaLiga')).toEqual({ file: 'LaLiga.xlsx', attempts });
  });
});
