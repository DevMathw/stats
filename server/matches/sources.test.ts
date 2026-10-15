import { describe, expect, it } from 'vitest';
import { parseUefaMatches, parseUefaStats } from './sources/uefa.ts';
import { parsePremierLeague, parsePremierLeagueStats } from './sources/premierLeague.ts';
import { ligue1Status, parseLigue1Stats, parseLigue1Week } from './sources/ligue1.ts';
import { parseLaLigaMatches, readLaLigaPage } from './sources/laliga.ts';
import {
  parseBundesligaMatches,
  parseBundesligaStats,
  readBundesligaMatchday,
  readBundesligaStats,
} from './sources/bundesliga.ts';
import { parseTffWeek } from './sources/tff.ts';
import { fotmobCardMinimums, parseFotmobLeague, parseFotmobStats, splitRound, type FmMatch } from './sources/fotmob.ts';
import { AllSourcesFailed, fetchLeague, sameSeason } from './fetchLeague.ts';
import { SourceError, type MatchSource, type SourceMatch, type SourceResult } from './types.ts';

const sinDescanso = { homeHalfTime: null, awayHalfTime: null };

describe('UEFA', () => {
  it('solo toma la fase liga, con la hora local de la sede', () => {
    const { matches, notes } = parseUefaMatches([
      {
        id: 1,
        status: 'FINISHED',
        round: { metaData: { type: 'GROUP_STANDINGS' } },
        matchday: { sequenceNumber: '2' },
        kickOffTime: { dateTime: '2026-09-30T19:00:00Z', utcOffsetInHours: 2 },
        homeTeam: { internationalName: 'Arsenal' },
        awayTeam: { internationalName: 'Inter' },
        score: { total: { home: 2, away: 1 } },
      },
      {
        id: 2,
        status: 'FINISHED',
        round: { metaData: { type: 'FIRST_QUALIFYING' } },
        matchday: { sequenceNumber: '1' },
        kickOffTime: { dateTime: '2026-07-08T18:00:00Z', utcOffsetInHours: 2 },
        homeTeam: { internationalName: 'X' },
        awayTeam: { internationalName: 'Y' },
        score: { total: { home: 0, away: 0 } },
      },
    ]);
    expect(matches).toEqual([
      // La hora es la del estadio (UTC+2); el instante se guarda tal cual lo publica la UEFA.
      { sourceId: '1', round: 2, date: '2026-09-30', time: '21:00', utc: '2026-09-30T19:00:00.000Z', phase: null, homeTeam: 'Arsenal', awayTeam: 'Inter', homeGoals: 2, awayGoals: 1, ...sinDescanso, status: 'finished' },
    ]);
    expect(notes).toHaveLength(1);
  });
});

describe('Premier League', () => {
  it('marcador solo en los completados y hora británica', () => {
    const [jugado, pendiente] = parsePremierLeague([
      { id: 10, gameweek: { gameweek: 1 }, kickoff: { millis: Date.UTC(2026, 7, 21, 19), gmtOffset: 1 }, teams: [{ team: { name: 'Arsenal' }, score: 2 }, { team: { name: 'Chelsea' }, score: 0 }], status: 'C' },
      { id: 11, gameweek: { gameweek: 5 }, kickoff: { millis: Date.UTC(2026, 8, 19, 14), gmtOffset: 1 }, teams: [{ team: { name: 'Everton' }, score: 0 }, { team: { name: 'Fulham' }, score: 0 }], status: 'U' },
    ]);
    expect(jugado).toMatchObject({ sourceId: '10', round: 1, date: '2026-08-21', time: '20:00', homeGoals: 2, awayGoals: 0, status: 'finished' });
    // Un 0-0 «por jugar» no es un resultado.
    expect(pendiente).toMatchObject({ round: 5, homeGoals: null, awayGoals: null, status: 'scheduled' });
  });
});

describe('Ligue 1', () => {
  it('convierte UTC a la hora de París', () => {
    const [p] = parseLigue1Week([
      { matchId: 'l1_1', gameWeekNumber: 3, date: '2026-08-30T18:45:00.000Z', period: 'fullTime', home: { score: 1, clubIdentity: { name: 'Olympique de Marseille' } }, away: { score: 1, clubIdentity: { name: 'Paris Saint-Germain' } } },
    ]);
    expect(p).toMatchObject({ round: 3, date: '2026-08-30', time: '20:45', homeGoals: 1, awayGoals: 1, status: 'finished' });
    expect(ligue1Status('preMatch')).toBe('scheduled');
    expect(ligue1Status('secondHalf')).toBe('live');
  });
});

describe('LaLiga', () => {
  it('lee los datos incrustados de la página de una jornada', () => {
    const props = {
      season: '2026',
      gameweek: { week: 4 },
      matches: [
        { id: 5, date: '2026-09-06T19:00:00+00:00', home_score: 2, away_score: 0, status: 'FullTime', home_team: { nickname: 'Sevilla FC', name: 'Sevilla Fútbol Club SAD' }, away_team: { nickname: 'Real Betis' } },
        { id: 6, date: '2026-09-13T16:15:00+00:00', home_score: 0, away_score: 0, status: 'PreMatch', home_team: { nickname: 'Getafe CF' }, away_team: { nickname: 'Villarreal CF' } },
      ],
    };
    const html = `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: props } })}</script></html>`;
    const [jugado, pendiente] = parseLaLigaMatches(readLaLigaPage(html)!);
    expect(jugado).toMatchObject({ sourceId: '5', round: 4, date: '2026-09-06', time: '21:00', homeTeam: 'Sevilla FC', homeGoals: 2, status: 'finished' });
    expect(pendiente).toMatchObject({ homeGoals: null, awayGoals: null, status: 'scheduled' });
    expect(readLaLigaPage('<html></html>')).toBeNull();
  });
});

describe('Bundesliga', () => {
  it('lee el estado incrustado, con marcador al descanso', () => {
    const estado = {
      abc: {
        b: {
          'DFL-MAT-J03WQ1': {
            matchId: 'DFL-MAT-J03WQ1', matchday: 3, plannedKickOff: '2026-09-12T13:30:00+0000', kickOff: '2026-09-12T13:32:08+0000', matchStatus: 'FINAL_WHISTLE',
            score: { home: { fulltime: 2, halftime: 1 }, away: { fulltime: 0, halftime: 0 } },
            teams: { home: { nameFull: 'Borussia Dortmund' }, away: { nameFull: 'SC Paderborn 07' } },
          },
          'DFL-MAT-J03WQ2': {
            matchId: 'DFL-MAT-J03WQ2', matchday: 3, kickOff: '2026-09-12T16:30:00+0000', matchStatus: 'FIRST_HALF',
            score: { home: { fulltime: 0 }, away: { fulltime: 0 } },
            teams: { home: { nameFull: 'FC Bayern München' }, away: { nameFull: 'Hamburger SV' } },
          },
        },
      },
    };
    const html = `<script id="ng-state" type="application/json">${JSON.stringify(estado)}</script>`;
    const [final, enJuego] = parseBundesligaMatches(readBundesligaMatchday(html));
    expect(final).toMatchObject({ sourceId: 'DFL-MAT-J03WQ1', round: 3, date: '2026-09-12', time: '15:30', homeGoals: 2, awayGoals: 0, homeHalfTime: 1, awayHalfTime: 0, status: 'finished' });
    // Un partido en juego nunca se da por terminado ni lleva marcador.
    expect(enJuego).toMatchObject({ homeGoals: null, status: 'live' });
  });
});

describe('Süper Lig (TFF)', () => {
  const fila = (fecha: string, local: string, marcador: string, visitante: string, macId: number) => `
    <tr class="haftaninMaclariTr"> <td align="left" class="haftaninMaclariTarih"> <b> <span id="x_lblTarih">${fecha}</span> <span id="x_lblSaat">20:00</span> </b> </td>
    <td align="right" class="haftaninMaclariEv"> <a href="Default.aspx?pageId=28&kulupID=1"> <span id="x_Label4">${local}</span></a> </td>
    <td align="center" class="haftaninMaclariSkor"> <b><a href="Default.aspx?pageId=29&macId=${macId}"> ${marcador}</a> </td>
    <td class="haftaninMaclariDeplasman"> <a href="Default.aspx?pageId=28&kulupID=2"> <span>${visitante}</span></a> </td> </tr>`;

  it('lee fecha, hora, equipos y marcador de cada fila', () => {
    const html =
      '<span>Trendyol Süper Lig 2026-2027 Sezonu Fikstürü « 4.Hafta »</span>' +
      fila('04.09.2026', 'İSTANBUL BAŞAKŞEHİR FK', '<span>2</span> - <span>3</span>', 'GALATASARAY A.Ş.', 317813) +
      fila('19.09.2026', 'BEŞİKTAŞ A.Ş.', '-', 'GÖZTEPE A.Ş.', 317900);
    const { season, matches } = parseTffWeek(html, 4);
    expect(season).toBe('2026/2027');
    expect(matches).toEqual([
      // Turquía va en UTC+3 todo el año: las 20:00 de Estambul son las 17:00Z.
      { sourceId: '317813', round: 4, date: '2026-09-04', time: '20:00', utc: '2026-09-04T17:00:00.000Z', phase: null, homeTeam: 'İSTANBUL BAŞAKŞEHİR FK', awayTeam: 'GALATASARAY A.Ş.', homeGoals: 2, awayGoals: 3, ...sinDescanso, status: 'finished' },
      { sourceId: '317900', round: 4, date: '2026-09-19', time: '20:00', utc: '2026-09-19T17:00:00.000Z', phase: null, homeTeam: 'BEŞİKTAŞ A.Ş.', awayTeam: 'GÖZTEPE A.Ş.', homeGoals: null, awayGoals: null, ...sinDescanso, status: 'scheduled' },
    ]);
  });
});

describe('FotMob (secundaria)', () => {
  it('separa el torneo de la jornada', () => {
    expect(splitRound('Clausura - Round 10')).toEqual({ phase: 'Clausura', round: 10 });
    expect(splitRound('5')).toEqual({ phase: '', round: 5 });
  });

  // Anzoátegui 0-3 Táchira (Liga FUTVE, 31/07/2026): FotMob lo publica terminado, «Awarded win» y sin estadísticas.
  it('marca los resultados adjudicados', () => {
    const r = parseFotmobLeague(
      {
        fixtures: {
          allMatches: [
            { id: 1, round: '1', home: { name: 'Anzoátegui FC' }, away: { name: 'Deportivo Táchira' }, status: { utcTime: '2026-07-31T22:30:00Z', finished: true, awarded: true, scoreStr: '0 - 3' } },
            { id: 2, round: '1', home: { name: 'Caracas' }, away: { name: 'Zamora' }, status: { utcTime: '2026-07-31T23:30:00Z', finished: true, awarded: false, scoreStr: '1 - 0' } },
          ],
        },
      },
      'America/Caracas',
    );
    expect(r.matches.map((m) => [m.homeGoals, m.awayGoals, m.awarded])).toEqual([
      [0, 3, true],
      [1, 0, undefined],
    ]);
  });

  it('solo toma el torneo vigente y usa la hora local de la liga', () => {
    const r = parseFotmobLeague(
      {
        details: { selectedSeason: '2026' },
        fixtures: {
          firstUnplayedMatch: { firstUnplayedMatchId: '3' },
          allMatches: [
            { id: 1, round: '11', home: { name: 'Nacional' }, away: { name: 'Millonarios' }, status: { utcTime: '2026-06-01T23:00:00Z', finished: true, scoreStr: '1 - 0' } },
            { id: 2, roundName: 'Clausura - Round 1', home: { name: 'Santa Fe' }, away: { name: 'América' }, status: { utcTime: '2026-07-19T01:00:00Z', finished: true, scoreStr: '2 - 2' } },
            { id: 3, roundName: 'Clausura - Round 2', home: { name: 'América' }, away: { name: 'Nacional' }, status: { utcTime: '2026-09-20T20:00:00Z', started: false } },
          ],
        },
      },
      'America/Bogota',
    );
    expect(r.season).toBe('2026');
    expect(r.matches.map((m) => [m.sourceId, m.round, m.date, m.time, m.homeGoals, m.status])).toEqual([
      ['2', 1, '2026-07-18', '20:00', 2, 'finished'],
      ['3', 2, '2026-09-20', '15:00', null, 'scheduled'],
    ]);
    expect(r.notes).toHaveLength(1);
  });

  it('separa dos torneos con la misma numeración (Apertura y Clausura en Argentina)', () => {
    const p = (id: number, fecha: string, local: string, visitante: string, round: string, marcador?: string): FmMatch => ({
      id,
      round,
      home: { name: local },
      away: { name: visitante },
      status: { utcTime: fecha, finished: marcador !== undefined, scoreStr: marcador },
    });
    const r = parseFotmobLeague(
      {
        details: { selectedSeason: '2026' },
        fixtures: {
          firstUnplayedMatch: { firstUnplayedMatchId: '4' },
          allMatches: [
            p(1, '2026-01-22T20:00:00Z', 'Aldosivi', 'Defensa y Justicia', '1', '0 - 0'),
            p(2, '2026-01-29T20:00:00Z', 'Defensa y Justicia', 'Boca Juniors', '2', '1 - 1'),
            p(3, '2026-07-24T20:00:00Z', 'Defensa y Justicia', 'Aldosivi', '1', '1 - 1'),
            p(4, '2026-07-31T20:00:00Z', 'Boca Juniors', 'Defensa y Justicia', '2'),
          ],
        },
      },
      'America/Argentina/Buenos_Aires',
    );
    expect(r.matches.map((m) => [m.sourceId, m.round])).toEqual([['3', 1], ['4', 2]]);
    expect(r.notes).toHaveLength(1);
  });

  it('un torneo corto en medio no se queda con las jornadas altas del siguiente (Uruguay)', () => {
    const p = (id: number, fecha: string, local: string, round: string, jugado: boolean): FmMatch => ({
      id,
      round,
      home: { name: local },
      away: { name: local === 'Nacional' ? 'Peñarol' : 'Nacional' },
      status: { utcTime: fecha, finished: jugado, scoreStr: jugado ? '1 - 0' : undefined },
    });
    const r = parseFotmobLeague(
      {
        details: { selectedSeason: '2026' },
        fixtures: {
          firstUnplayedMatch: { firstUnplayedMatchId: '5' },
          allMatches: [
            p(1, '2026-02-06T22:00:00Z', 'Nacional', '1', true), // Apertura
            p(2, '2026-02-13T22:00:00Z', 'Peñarol', '2', true),
            p(3, '2026-05-17T22:00:00Z', 'Nacional', '1', true), // Intermedio: solo la J1
            p(4, '2026-08-07T22:00:00Z', 'Peñarol', '1', true), // Clausura
            // J2 del Clausura: sus equipos solo la habían jugado una vez (el Intermedio no tuvo J2).
            p(5, '2026-08-14T22:00:00Z', 'Nacional', '2', false),
          ],
        },
      },
      'America/Montevideo',
    );
    expect(r.matches.map((m) => m.sourceId)).toEqual(['4', '5']);
  });

  it('la fase final en grupos paralelos entra entera, con su fase y su numeración (LigaPro)', () => {
    const p = (id: number, fecha: string, local: string, visitante: string, round: string, jugado: boolean): FmMatch => ({
      id,
      roundName: round,
      home: { name: local },
      away: { name: visitante },
      status: { utcTime: fecha, finished: jugado, scoreStr: jugado ? '2 - 0' : undefined },
    });
    const r = parseFotmobLeague(
      {
        details: { selectedSeason: '2026' },
        fixtures: {
          firstUnplayedMatch: { firstUnplayedMatchId: '11' },
          allMatches: [
            // Las 30 jornadas de las dos etapas, numeradas de corrido.
            p(1, '2026-02-21T20:00:00Z', 'Barcelona SC', 'Emelec', '1', true),
            p(2, '2026-09-12T20:00:00Z', 'Emelec', 'Barcelona SC', '30', true),
            // Fase final: tres grupos a la vez, cada uno numerando desde 1 y sin equipos comunes.
            p(10, '2026-09-19T20:00:00Z', 'Barcelona SC', 'Emelec', 'Championship Round - Round 1', true),
            p(11, '2026-10-11T20:00:00Z', 'Emelec', 'Barcelona SC', 'Championship Round - Round 2', false),
            p(20, '2026-09-20T20:00:00Z', 'Macará', 'Mushuc Runa', 'Relegation Round - Round 1', true),
            p(21, '2026-10-11T20:00:00Z', 'Mushuc Runa', 'Macará', 'Relegation Round - Round 2', false),
            p(30, '2026-09-19T20:00:00Z', 'Orense', 'Técnico U.', 'Copa Sudamericana Play-off - Round 1', true),
          ],
        },
      },
      'America/Guayaquil',
    );
    expect(r.matches.map((m) => [m.sourceId, m.phase, m.round])).toEqual([
      ['10', 'Championship Round', 1],
      ['11', 'Championship Round', 2],
      ['20', 'Relegation Round', 1],
      ['21', 'Relegation Round', 2],
      ['30', 'Copa Sudamericana Play-off', 1],
    ]);
  });

  it('un Apertura y un Clausura no son grupos paralelos: van seguidos y repiten equipos', () => {
    const p = (id: number, fecha: string, local: string, round: string, jugado: boolean): FmMatch => ({
      id,
      roundName: round,
      home: { name: local },
      away: { name: local === 'Cerro' ? 'Olimpia' : 'Cerro' },
      status: { utcTime: fecha, finished: jugado, scoreStr: jugado ? '1 - 0' : undefined },
    });
    const r = parseFotmobLeague(
      {
        details: { selectedSeason: '2026' },
        fixtures: {
          firstUnplayedMatch: { firstUnplayedMatchId: '3' },
          allMatches: [
            p(1, '2026-01-23T22:00:00Z', 'Cerro', 'Apertura - Round 1', true),
            p(2, '2026-07-24T22:00:00Z', 'Olimpia', 'Clausura - Round 1', true),
            p(3, '2026-07-28T22:00:00Z', 'Cerro', 'Clausura - Round 2', false),
          ],
        },
      },
      'America/Asuncion',
    );
    expect(r.matches.map((m) => m.sourceId)).toEqual(['2', '3']);
  });
});

describe('orden de fuentes', () => {
  const partido: SourceMatch = { sourceId: '1', round: 1, date: '2026-08-15', time: null, utc: null, phase: null, homeTeam: 'A', awayTeam: 'B', homeGoals: 1, awayGoals: 0, ...sinDescanso, status: 'finished' };
  const fuente = (name: string, secondary: boolean, r: Partial<SourceResult> | Error): MatchSource => ({
    name,
    secondary,
    fetch: async () => {
      if (r instanceof Error) throw r;
      return { season: '2026/2027', url: `https://${name}`, matches: [partido], notes: [], ...r };
    },
  });

  it('usa la oficial cuando sirve y no toca las secundarias', async () => {
    const r = await fetchLeague([fuente('oficial', false, {}), fuente('FotMob', true, new Error('no debería llamarse'))], '2026/27');
    expect(r).toMatchObject({ source: 'oficial', secondary: false });
    expect(r.attempts).toHaveLength(1);
  });

  it('si la oficial falla, prueba las secundarias en orden y deja constancia de cada intento', async () => {
    const r = await fetchLeague(
      [
        fuente('oficial', false, new SourceError('respondió 403', 'https://oficial')),
        fuente('FBref', true, new SourceError('respondió 403', 'https://fbref')),
        fuente('FotMob', true, {}),
      ],
      '2026/27',
    );
    expect(r).toMatchObject({ source: 'FotMob', secondary: true });
    expect(r.attempts.map((a) => [a.source, a.ok, a.error])).toEqual([
      ['oficial', false, 'respondió 403'],
      ['FBref', false, 'respondió 403'],
      ['FotMob', true, null],
    ]);
  });

  it('rechaza una fuente que publica otra temporada o no devuelve partidos', async () => {
    const e = await fetchLeague(
      [fuente('oficial', false, { season: '2025/2026' }), fuente('FotMob', true, { matches: [] })],
      '2026/27',
    ).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(AllSourcesFailed);
    expect((e as AllSourcesFailed).attempts.map((a) => a.error)).toEqual([
      'publica la temporada «2025/2026», no la 2026/27',
      'no devolvió ningún partido',
    ]);
  });

  it('compara temporadas por sus años', () => {
    expect(sameSeason('2026/27', '2026/2027')).toBe(true);
    expect(sameSeason('2026/27*', '2026 - Clausura')).toBe(true);
    expect(sameSeason('2026/27', '2025/2026')).toBe(false);
    expect(sameSeason('2026/27', '')).toBe(false);
  });
});

describe('estadísticas por partido', () => {
  it('Opta (Premier League): las cifras de cada equipo; las omitidas quedan vacías, no a 0; el descanso de la ficha', () => {
    const v = parsePremierLeagueStats(
      { id: 1, status: 'C', halfTimeScore: { homeScore: 1, awayScore: 0 }, teams: [{ team: { id: 1, name: 'Arsenal' }, score: 3 }, { team: { id: 5, name: 'Coventry City' }, score: 0 }] },
      {
        data: {
          '1': { M: [{ name: 'possession_percentage', value: 64.1 }, { name: 'won_corners', value: 8 }, { name: 'total_scoring_att', value: 20 }, { name: 'ontarget_scoring_att', value: 6 }, { name: 'fk_foul_lost', value: 10 }, { name: 'total_offside', value: 5 }, { name: 'total_yel_card', value: 1 }] },
          '5': { M: [{ name: 'possession_percentage', value: 35.9 }, { name: 'won_corners', value: 2 }, { name: 'total_scoring_att', value: 4 }, { name: 'ontarget_scoring_att', value: 1 }, { name: 'fk_foul_lost', value: 13 }, { name: 'total_yel_card', value: 1 }] },
        },
      },
    );
    expect(v).toEqual({
      scoreHomeFound: 3, scoreAwayFound: 0, shotsHome: 20, shotsAway: 4, shotsOnTargetHome: 6, shotsOnTargetAway: 1,
      possessionHomePct: 64.1, cornersHome: 8, cornersAway: 2, yellowCardsHome: 1, yellowCardsAway: 1,
      redCardsHome: null, redCardsAway: null, foulsHome: 10, foulsAway: 13, offsidesHome: 5, offsidesAway: null,
      xGHome: null, xGAway: null, halfTimeHome: 1, halfTimeAway: 0,
    });
  });

  it('UEFA: empareja las cifras de cada equipo por su id', () => {
    const cifras = (tiros: string, posesion: string, faltas: string) => [
      { name: 'attempts', value: tiros }, { name: 'ball_possession', value: posesion }, { name: 'red_cards', value: '0' }, { name: 'fouls_committed', value: faltas },
    ];
    const v = parseUefaStats(
      { id: 1, status: 'FINISHED', homeTeam: { id: '50043' }, awayTeam: { id: '52683' }, score: { total: { home: 2, away: 3 } } },
      [{ teamId: '52683', statistics: cifras('21', '44', '14') }, { teamId: '50043', statistics: cifras('14', '56', '17') }],
    );
    expect(v).toMatchObject({ scoreHomeFound: 2, scoreAwayFound: 3, shotsHome: 14, shotsAway: 21, possessionHomePct: 56, redCardsHome: 0, foulsAway: 14, cornersHome: null });
  });

  it('FotMob: cada clave una vez, sin las filas de título ni los textos; xG y el descanso del evento «HT»', () => {
    const v = parseFotmobStats({
      header: { teams: [{ score: 2 }, { score: 0 }], status: { finished: true } },
      content: {
        stats: {
          Periods: {
            All: {
              stats: [
                { stats: [{ key: 'BallPossesion', stats: [53, 47] }, { key: 'expected_goals', stats: ['1.84', '0.61'] }, { key: 'total_shots', stats: [14, 11] }, { key: 'corners', stats: [7, 4] }] },
                { stats: [{ key: 'shots', stats: [null, null] }, { key: 'ShotsOnTarget', stats: [5, 3] }] },
                { stats: [{ key: 'discipline', stats: [null, null] }, { key: 'yellow_cards', stats: [1, 3] }, { key: 'red_cards', stats: [0, 0] }, { key: 'fouls', stats: [4, 17] }] },
                { stats: [{ key: 'Offsides', stats: [4, 3] }, { key: 'accurate_passes', stats: ['420 (86%)', '350 (81%)'] }] },
              ],
            },
          },
        },
        matchFacts: {
          events: {
            events: [
              { type: 'Goal' },
              { type: 'Half', halfStrKey: 'halftime_short', homeScore: 1, awayScore: 0 },
              { type: 'Half', halfStrKey: 'fulltime_short', homeScore: 2, awayScore: 0 },
            ],
          },
        },
      },
    });
    expect(v).toEqual({
      scoreHomeFound: 2, scoreAwayFound: 0, shotsHome: 14, shotsAway: 11, shotsOnTargetHome: 5, shotsOnTargetAway: 3,
      possessionHomePct: 53, cornersHome: 7, cornersAway: 4, yellowCardsHome: 1, yellowCardsAway: 3,
      redCardsHome: 0, redCardsAway: 0, foulsHome: 4, foulsAway: 17, offsidesHome: 4, offsidesAway: 3,
      xGHome: 1.84, xGAway: 0.61, halfTimeHome: 1, halfTimeAway: 0,
    });
  });

  it('FotMob: la cronología da un mínimo de tarjetas por equipo, sin la doble amarilla', () => {
    const eventos = [
      { type: 'Card', card: 'Yellow', isHome: true },
      { type: 'Card', card: 'Yellow', isHome: true },
      { type: 'Card', card: 'YellowRed', isHome: false },
      { type: 'Card', card: 'Red', isHome: false },
      { type: 'Goal', isHome: true },
    ];
    expect(fotmobCardMinimums({ content: { matchFacts: { events: { events: eventos } } } })).toEqual({
      yellowCardsHome: 2,
      yellowCardsAway: 0,
      redCardsHome: 0,
      redCardsAway: 1,
    });
  });

  it('Ligue 1: las cifras de cada club, con las tarjetas de bookingsData y su xG', () => {
    const v = parseLigue1Stats({
      period: 'fullTime',
      home: { score: 4, stats: { possessionPercentage: 66.7, expectedGoals: 2.31, scoringAttempts: 14, ontargetScoringAttempts: 8, offsides: 0, corners: 3, fouls: 6, bookingsData: { yellow: 1, red: 0 } } },
      away: { score: 0, stats: { possessionPercentage: 33.3, expectedGoals: 0.4, scoringAttempts: 5, ontargetScoringAttempts: 2, offsides: 0, corners: 4, fouls: 12, bookingsData: { yellow: 3, red: 1 } } },
    });
    expect(v).toEqual({
      scoreHomeFound: 4, scoreAwayFound: 0, shotsHome: 14, shotsAway: 5, shotsOnTargetHome: 8, shotsOnTargetAway: 2,
      possessionHomePct: 66.7, cornersHome: 3, cornersAway: 4, yellowCardsHome: 1, yellowCardsAway: 3,
      redCardsHome: 0, redCardsAway: 1, foulsHome: 6, foulsAway: 12, offsidesHome: 0, offsidesAway: 0,
      xGHome: 2.31, xGAway: 0.4, halfTimeHome: null, halfTimeAway: null,
    });
  });

  it('Bundesliga: lee el bloque del partido; sin tiros totales ni tarjetas, con xG y descanso', () => {
    const estado = {
      '_getDataFromFirebase-/all/DFL-COM-000001/seasons/S/matchdays/D/DFL-MAT-J043GB/stats': {
        ballPossessionRatio: { homeValue: 59, awayValue: 41 },
        cornerKicks: { homeValue: 9, awayValue: 3 },
        shotsOnTarget: { homeValue: 9, awayValue: 4 },
        fouls: { homeValue: 10, awayValue: 12 },
        offsides: { homeValue: 3, awayValue: 1 },
        xGoals: { homeValue: 2.0319, awayValue: 0.6512 },
      },
    };
    const html = `<script id="ng-state" type="application/json">${JSON.stringify(estado)}</script>`;
    const v = parseBundesligaStats(
      { matchId: 'DFL-MAT-J043GB', score: { home: { fulltime: 5, halftime: 2 }, away: { fulltime: 1, halftime: 0 } } },
      readBundesligaStats(html, 'DFL-MAT-J043GB')!,
    );
    expect(v).toMatchObject({
      scoreHomeFound: 5, scoreAwayFound: 1, shotsHome: null, shotsOnTargetHome: 9, possessionHomePct: 59,
      cornersAway: 3, yellowCardsHome: null, redCardsAway: null, foulsAway: 12, offsidesHome: 3,
      xGHome: 2.0319, xGAway: 0.6512, halfTimeHome: 2, halfTimeAway: 0,
    });
    expect(readBundesligaStats(html, 'DFL-MAT-OTRO')).toBeNull();
  });
});
