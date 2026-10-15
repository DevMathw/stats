import { describe, expect, it } from 'vitest';
import type { Fixture, League, Match } from '../../types';
import { buildTeamId, resolveMatchId } from '../../domain/models/ids';
import type { FootballDataProvider, FixtureQueryOptions, MatchStatistics } from '../providers/types';
import { EMPTY_STATISTICS } from '../providers/types';
import { applyStatistics, selectFixtureHorizon, syncFromProvider } from './syncEngine';

const L = 'Liga Test';

const LEAGUE: League = {
  id: L,
  name: L,
  country: 'España',
  confederation: 'UEFA',
  season: '2026/27',
  calendarFormat: '',
  teamCount: null,
  regularSeasonRounds: null,
  approximateStartDate: null,
  source: null,
  reliabilityNotes: null,
};

function base(date: string, home: string, away: string) {
  return { leagueId: L, season: LEAGUE.season, date, homeTeamName: home, awayTeamName: away };
}

function match(
  round: number,
  date: string,
  home: string,
  away: string,
  hg: number | null,
  ag: number | null,
  providerId: string | null = null,
): Match {
  return {
    id: resolveMatchId({ providerId, ...base(date, home, away) }),
    providerId,
    leagueId: L,
    country: LEAGUE.country,
    season: LEAGUE.season,
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
    source: 'test',
    updatedAt: null,
    statsSource: null,
    statsUpdatedAt: null,
    statsCitations: [],
  };
}

function fixture(
  round: number,
  date: string,
  home: string,
  away: string,
  providerId: string | null = null,
  source = 'SofaScore',
): Fixture {
  return {
    id: resolveMatchId({ providerId, ...base(date, home, away) }),
    providerId,
    leagueId: L,
    country: LEAGUE.country,
    season: LEAGUE.season,
    date,
    round,
    homeTeamId: buildTeamId(L, home),
    awayTeamId: buildTeamId(L, away),
    homeTeamName: home,
    awayTeamName: away,
    status: 'Programado',
    source,
  };
}

/** Proveedor de mentira: devuelve lo que se le pase, sin red. */
function fakeProvider(matches: Match[], fixtures: Fixture[]): FootballDataProvider {
  return {
    id: 'fake',
    name: 'Fake',
    getLeagues: async () => [],
    getTeams: async () => [],
    getMatches: async () => matches,
    getFixtures: async (_l: string, _s: string, _o?: FixtureQueryOptions) => fixtures,
    getMatchStatistics: async (): Promise<MatchStatistics | null> => null,
  };
}

const run = (
  provider: FootballDataProvider,
  existingMatches: Match[],
  existingFixtures: Fixture[],
  horizon = 1,
) =>
  syncFromProvider({
    provider,
    leagues: [LEAGUE],
    seasonIds: { [L]: '1' },
    existingMatches,
    existingFixtures,
    fixtureHorizonRounds: horizon,
    statisticsLimit: 0,
  });

describe('otro nombre del mismo club', () => {
  // LigaPro, 17/09/2026: «CSD Macará» de FotMob abrió una segunda ficha al lado de «Macará» y duplicó sus partidos.
  it('lo reconoce por su identidad en la competición aunque no empiece igual', async () => {
    const ECU: League = { ...LEAGUE, id: 'LigaPro Serie A', name: 'LigaPro Serie A', country: 'Ecuador' };
    const enEcuador = (m: Match): Match => ({ ...m, leagueId: ECU.id, homeTeamId: buildTeamId(ECU.id, m.homeTeamName), awayTeamId: buildTeamId(ECU.id, m.awayTeamName) });
    const guardado = enEcuador(match(1, '2026-02-22', 'Macará', 'Leones del Norte', 0, 0));
    const deFotmob = enEcuador(match(1, '2026-02-22', 'CSD Macará', 'Leones del Norte', 0, 0, 'FotMob:1000008880'));
    const r = await syncFromProvider({
      provider: fakeProvider([deFotmob], []),
      leagues: [ECU],
      seasonIds: {},
      existingMatches: [guardado],
      existingFixtures: [],
      fixtureHorizonRounds: 1,
      statisticsLimit: 0,
    });
    expect(r.matches).toHaveLength(1);
    expect(r.matches[0]).toMatchObject({ homeTeamName: 'Macará', providerId: 'FotMob:1000008880' });
  });
});

describe('selectFixtureHorizon', () => {
  const fx = [
    fixture(4, '2026-10-01', 'A', 'B'),
    fixture(4, '2026-10-01', 'C', 'D'),
    fixture(5, '2026-10-08', 'B', 'C'),
    fixture(6, '2026-10-15', 'A', 'D'),
  ];

  it('con horizonte 1 deja solo la próxima jornada', () => {
    const kept = selectFixtureHorizon(fx, 3, 1);
    expect(kept.map((f) => f.round)).toEqual([4, 4]);
  });

  it('con horizonte 2 deja dos jornadas', () => {
    expect(selectFixtureHorizon(fx, 3, 2).map((f) => f.round)).toEqual([4, 4, 5]);
  });

  it('con horizonte 0 no descarta nada', () => {
    expect(selectFixtureHorizon(fx, 3, 0)).toHaveLength(4);
  });

  it('los aplazados de jornadas ya jugadas se conservan y no gastan horizonte', () => {
    // La J2 quedó pendiente (aplazado) y se juega antes que la J4.
    const conAplazado = [fixture(2, '2026-09-25', 'A', 'C'), ...fx];
    const kept = selectFixtureHorizon(conAplazado, 3, 1);
    // Se queda el aplazado de la J2 Y la próxima jornada completa (la 4).
    expect(kept.map((f) => f.round).sort()).toEqual([2, 4, 4]);
  });

  it('sin partidos jugados, la próxima jornada es la más baja', () => {
    expect(selectFixtureHorizon(fx, null, 1).map((f) => f.round)).toEqual([4, 4]);
  });
});

describe('datos escritos a mano', () => {
  it('«Actualizar partidos» y las estadísticas de la fuente no sustituyen lo escrito a mano', async () => {
    const guardado: Match = {
      ...match(3, '2026-09-24', 'A', 'B', 2, 1, '800'),
      xGHome: 1.7,
      cornersHome: 6,
      shotsHome: 10,
      homeFirstHalfGoals: 1,
      awayFirstHalfGoals: 0,
      manualFields: ['xGHome', 'cornersHome', 'homeFirstHalfGoals', 'awayFirstHalfGoals'],
    };
    const delProveedor: Match = {
      ...match(3, '2026-09-24', 'A', 'B', 2, 1, '800'),
      xGHome: 2.4,
      cornersHome: 9,
      shotsHome: 14,
      homeFirstHalfGoals: 0,
      awayFirstHalfGoals: 0,
    };

    const r = await run(fakeProvider([delProveedor], []), [guardado], []);
    expect(r.matches).toHaveLength(1);
    // Lo escrito a mano se queda; lo demás (los tiros) sí se actualiza desde la fuente.
    expect(r.matches[0]).toMatchObject({ xGHome: 1.7, cornersHome: 6, homeFirstHalfGoals: 1, awayFirstHalfGoals: 0, shotsHome: 14 });
    expect(r.matches[0].manualFields).toEqual(guardado.manualFields);

    const conCifras = applyStatistics(r.matches[0], { ...EMPTY_STATISTICS, xGHome: 3, cornersHome: 11, foulsHome: 12 });
    expect(conCifras).toMatchObject({ xGHome: 1.7, cornersHome: 6, foulsHome: 12 });
  });
});

describe('sincronización: pendientes ↔ disputados', () => {
  it('un pendiente pasa a disputado solo cuando el partido está FINALIZADO', async () => {
    const pending = fixture(4, '2026-10-01', 'A', 'B', '900');

    // 1ª pasada: el proveedor aún no da resultado ⇒ sigue pendiente.
    const sinResultado = await run(fakeProvider([], [pending]), [], [pending]);
    expect(sinResultado.fixtures).toHaveLength(1);
    expect(sinResultado.summary.removedFixtures).toBe(0);

    // 2ª pasada: ya hay marcador ⇒ pasa a disputados y sale de pendientes.
    const finished = match(4, '2026-10-01', 'A', 'B', 2, 1, '900');
    const conResultado = await run(fakeProvider([finished], []), [], sinResultado.fixtures);
    expect(conResultado.summary.removedFixtures).toBe(1);
    expect(conResultado.fixtures).toHaveLength(0);
    expect(conResultado.matches).toHaveLength(1);
  });

  it('un partido cargado SIN marcador no retira el pendiente', async () => {
    const pending = fixture(4, '2026-10-01', 'A', 'B', '900');
    const sinMarcador = match(4, '2026-10-01', 'A', 'B', null, null, '900');
    const r = await run(fakeProvider([], []), [sinMarcador], [pending]);
    expect(r.summary.removedFixtures).toBe(0);
    expect(r.fixtures).toHaveLength(1);
  });

  it('no duplica un pendiente que ya existe, aunque cambie de fecha', async () => {
    const original = fixture(4, '2026-10-01', 'A', 'B', '900');
    const aplazadoAOtroDia = fixture(4, '2026-10-03', 'A', 'B', '900');
    const r = await run(fakeProvider([], [aplazadoAOtroDia]), [], [original]);
    expect(r.fixtures).toHaveLength(1);
    expect(r.fixtures[0].date).toBe('2026-10-03');
    expect(r.summary.newFixtures).toBe(0);
    expect(r.summary.updatedFixtures).toBe(1);
  });

  it('no duplica un pendiente cargado a mano que luego llega del proveedor', async () => {
    const manual = fixture(4, '2026-10-01', 'A', 'B', null, 'Manual');
    const delProveedor = fixture(4, '2026-10-01', 'A', 'B', '900');
    const r = await run(fakeProvider([], [delProveedor]), [], [manual]);
    expect(r.fixtures).toHaveLength(1);
    expect(r.fixtures[0].providerId).toBe('900');
  });

  it('cada actualización deja en pendientes solo la jornada que toca', async () => {
    const jugados = [match(3, '2026-09-24', 'A', 'B', 1, 0, '800')];
    const calendario = [
      fixture(4, '2026-10-01', 'A', 'C', '901'),
      fixture(5, '2026-10-08', 'A', 'D', '902'),
      fixture(6, '2026-10-15', 'A', 'B', '903'),
    ];

    const primera = await run(fakeProvider(jugados, calendario), [], []);
    expect(primera.fixtures.map((f) => f.round)).toEqual([4]);

    // Se juega la J4: el proveedor ya la devuelve como partido finalizado.
    const jugadosJ4 = [...jugados, match(4, '2026-10-01', 'A', 'C', 2, 2, '901')];
    const segunda = await run(
      fakeProvider(jugadosJ4, calendario),
      primera.matches,
      primera.fixtures,
    );
    expect(segunda.summary.removedFixtures).toBe(1);
    expect(segunda.fixtures.map((f) => f.round)).toEqual([5]);
    expect(segunda.matches).toHaveLength(2);
  });

  it('poda los pendientes que quedan fuera del horizonte', async () => {
    const viejos = [
      fixture(4, '2026-10-01', 'A', 'C', '901'),
      fixture(5, '2026-10-08', 'A', 'D', '902'),
      fixture(6, '2026-10-15', 'A', 'B', '903'),
    ];
    const r = await run(fakeProvider([], viejos), [], viejos, 1);
    expect(r.fixtures.map((f) => f.round)).toEqual([4]);
    expect(r.summary.prunedFixtures).toBe(2);
  });

  it('un pendiente cargado a mano no se poda por el horizonte', async () => {
    const manual = fixture(9, '2026-11-20', 'A', 'D', null, 'Manual');
    const delProveedor = fixture(4, '2026-10-01', 'A', 'C', '901');
    const r = await run(fakeProvider([], [delProveedor]), [], [manual], 1);
    expect(r.fixtures.map((f) => f.round).sort((a, b) => a - b)).toEqual([4, 9]);
    expect(r.summary.prunedFixtures).toBe(0);
  });

  it('con la plantilla completa, un nombre desconocido se descarta y se informa', async () => {
    // La liga declara 2 equipos y ya conocemos A y B: "Aston Villa" solo puede ser un
    // nombre distinto de algo que ya tenemos, no un equipo nuevo.
    const liga2: League = { ...LEAGUE, teamCount: 2 };
    const r = await syncFromProvider({
      provider: fakeProvider([match(1, '2026-09-01', 'A', 'Aston Villa', 1, 0, '700')], []),
      leagues: [liga2],
      seasonIds: { [L]: '1' },
      existingMatches: [match(1, '2026-08-25', 'A', 'B', 0, 0)],
      existingFixtures: [],
      fixtureHorizonRounds: 1,
      statisticsLimit: 0,
    });
    expect(r.summary.newMatches).toBe(0);
    expect(r.summary.unresolvedTeams).toEqual([{ leagueId: L, providerName: 'Aston Villa' }]);
  });

  it('con la plantilla incompleta, un equipo nuevo sí entra', async () => {
    const liga4: League = { ...LEAGUE, teamCount: 4 };
    const r = await syncFromProvider({
      provider: fakeProvider([match(1, '2026-09-01', 'A', 'C', 1, 0, '700')], []),
      leagues: [liga4],
      seasonIds: { [L]: '1' },
      existingMatches: [match(1, '2026-08-25', 'A', 'B', 0, 0)],
      existingFixtures: [],
      fixtureHorizonRounds: 1,
      statisticsLimit: 0,
    });
    expect(r.summary.newMatches).toBe(1);
    expect(r.summary.unresolvedTeams).toEqual([]);
  });

  it('reconoce el mismo equipo escrito de otra forma y no lo duplica', async () => {
    const liga2: League = { ...LEAGUE, teamCount: 2 };
    const existente = match(1, '2026-08-25', 'Manchester City', 'Arsenal', 0, 0);
    const delProveedor = match(1, '2026-08-25', 'Manchester City FC', 'Arsenal FC', 2, 1, '700');
    const r = await syncFromProvider({
      provider: fakeProvider([delProveedor], []),
      leagues: [liga2],
      seasonIds: { [L]: '1' },
      existingMatches: [existente],
      existingFixtures: [],
      fixtureHorizonRounds: 1,
      statisticsLimit: 0,
    });
    expect(r.summary.newMatches).toBe(0);
    expect(r.summary.updatedMatches).toBe(1);
    expect(r.matches).toHaveLength(1);
    expect(r.matches[0].homeTeamName).toBe('Manchester City');
    expect(r.matches[0].homeGoals).toBe(2);
    // Y ahora lleva el id del proveedor, asi que ya se le pueden pedir estadisticas.
    expect(r.matches[0].providerId).toBe('700');
  });

  it('casa un partido aunque el proveedor lo fecha un dia despues (UTC)', async () => {
    // 21:00 en Argentina = 00:00 UTC del dia siguiente.
    const existente = match(1, '2026-08-25', 'A', 'B', null, null);
    const delProveedor = match(1, '2026-08-26', 'A', 'B', 3, 1, '700');
    const r = await syncFromProvider({
      provider: fakeProvider([delProveedor], []),
      leagues: [LEAGUE],
      seasonIds: { [L]: '1' },
      existingMatches: [existente],
      existingFixtures: [],
      fixtureHorizonRounds: 1,
      statisticsLimit: 0,
    });
    expect(r.matches).toHaveLength(1);
    expect(r.matches[0].homeGoals).toBe(3);
    // La fecha del Excel manda: el proveedor da UTC y no sabemos su huso.
    expect(r.matches[0].date).toBe('2026-08-25');
  });

  it('con fechas oficiales, la fecha de la fuente manda y el partido que ya estaba no se duplica', async () => {
    const existente = match(1, '2026-08-25', 'A', 'B', 3, 1);
    const oficial: Match = { ...match(1, '2026-08-26', 'A', 'B', 3, 1, 'laliga.com:7'), kickoffTime: '21:00' };

    // La fuente repite el partido: se reconoce las dos veces.
    const r = await run({ ...fakeProvider([oficial, oficial], []), officialLocalDates: true }, [existente], []);
    expect(r.matches).toHaveLength(1);
    expect(r.matches[0]).toMatchObject({ date: '2026-08-26', kickoffTime: '21:00', providerId: 'laliga.com:7' });
    expect(r.summary).toMatchObject({
      foundMatches: 2,
      newMatches: 0,
      updatedMatches: 1,
      unchangedMatches: 0,
      duplicatesAvoided: 2,
    });

    // Segunda pasada: ya lleva su id oficial y ningún dato cambia.
    const r2 = await run({ ...fakeProvider([oficial], []), officialLocalDates: true }, r.matches, []);
    expect(r2.summary).toMatchObject({ updatedMatches: 0, unchangedMatches: 1, duplicatesAvoided: 0 });
  });

  it('no duplica un partido que otra fuente guardó con otra fecha o con la localía invertida', async () => {
    const guardados = [match(1, '2026-02-24', 'Orense', 'LDU', 1, 2), match(6, '2026-03-22', 'Manta', 'LDU', 0, 1)];
    const r = await run(
      fakeProvider(
        [
          match(1, '2026-02-08', 'Orense', 'LDU', 1, 2, 'fm:1'), // 16 días antes (aplazado)
          match(6, '2026-03-21', 'LDU', 'Manta', 1, 0, 'fm:2'), // localía invertida
          match(7, '2026-03-28', 'LDU', 'Orense', 2, 0, 'fm:3'), // nuevo de verdad
        ],
        [],
      ),
      guardados,
      [],
    );
    expect(r.matches).toHaveLength(3);
    expect(r.summary).toMatchObject({ newMatches: 1, duplicatesAvoided: 2 });
    expect(r.summary.warnings.filter((w) => w.includes('Revisa cuál es el correcto'))).toHaveLength(2);
  });

  it('informa de la jornada en la que queda cada liga', async () => {
    const r = await run(
      fakeProvider(
        [match(3, '2026-09-24', 'A', 'B', 1, 0, '800')],
        [fixture(4, '2026-10-01', 'A', 'C', '901'), fixture(4, '2026-10-01', 'B', 'D', '904')],
      ),
      [],
      [],
    );
    expect(r.summary.rounds).toEqual([
      {
        leagueId: L,
        currentRound: 3,
        nextRound: 4,
        nextNewRound: 4,
        pendingInStartedRounds: 0,
        fixturesInNextRound: 2,
        pendingFixtures: 2,
        description: 'va por J3 · próxima nueva J4 (2)',
      },
    ]);
  });
});
