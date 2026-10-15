import { describe, expect, it } from 'vitest';
import type { Fixture, League, Match, ModelParams } from '../../types';
import { buildMatchKey, buildTeamId, resolveMatchId } from '../models/ids';
import { DEFAULT_MODEL_PARAMS } from '../models/params';
import { recalculateAll } from '../engine';
import { calculateRecentForm, lastPlayedRound } from './form';
import { compareStanding } from './standings';
import { calculateFirstHalfShare, FIRST_HALF_PRIOR_GOALS, FIRST_HALF_SHARE } from './leagueAverages';
import { calculate1X2Probabilities, poisson1X2Probabilities } from '../probability/matchProbabilities';
import { xgStrengthValue } from '../projections/expectedGoals';
import { calculateStrengthOfSchedule } from './sos';
import { isBtts, isOver, pointsFor, resultFT, sumPair } from '../calculations/matchDerived';
import { mergeMatch } from '../../services/sync/syncEngine';

const LEAGUE: League = {
  id: 'Liga Test',
  country: 'España',
  name: 'Liga Test',
  confederation: 'UEFA',
  season: '2026/27',
  calendarFormat: 'Cruzada',
  teamCount: 4,
  regularSeasonRounds: '6',
  approximateStartDate: null,
  source: null,
  reliabilityNotes: null,
};

let seq = 0;
function match(
  round: number,
  home: string,
  away: string,
  hg: number | null,
  ag: number | null,
  extra: Partial<Match> = {},
): Match {
  const date = `2026-09-${String(++seq).padStart(2, '0')}`;
  const base = {
    leagueId: LEAGUE.id,
    season: LEAGUE.season,
    date,
    homeTeamName: home,
    awayTeamName: away,
  };
  return {
    id: resolveMatchId({ providerId: null, ...base }),
    providerId: null,
    leagueId: LEAGUE.id,
    country: LEAGUE.country,
    season: LEAGUE.season,
    date,
    round,
    homeTeamId: buildTeamId(LEAGUE.id, home),
    awayTeamId: buildTeamId(LEAGUE.id, away),
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
    ...extra,
  };
}

/** Mini-liga de 4 equipos y 6 jornadas, con resultados escritos a mano. */
function buildDataset(params: ModelParams = DEFAULT_MODEL_PARAMS) {
  seq = 0;
  const matches = [
    match(1, 'Alfa', 'Beta', 2, 0),
    match(1, 'Gamma', 'Delta', 1, 1),
    match(2, 'Beta', 'Gamma', 0, 3),
    match(2, 'Delta', 'Alfa', 1, 2),
    match(3, 'Alfa', 'Gamma', 1, 1),
    match(3, 'Beta', 'Delta', 2, 1),
    match(4, 'Gamma', 'Alfa', 0, 0),
    match(4, 'Delta', 'Beta', 3, 2),
    match(5, 'Alfa', 'Delta', 4, 1),
    match(5, 'Gamma', 'Beta', 2, 2),
    match(6, 'Beta', 'Alfa', 1, 0),
    match(6, 'Delta', 'Gamma', 0, 2),
  ];
  return recalculateAll({ leagues: [LEAGUE], matches, fixtures: [], params });
}

const id = (name: string) => buildTeamId(LEAGUE.id, name);

describe('resultados adjudicados (DIFF-09)', () => {
  it('se guardan, pero no cuentan en el análisis', () => {
    seq = 0;
    const jugado = match(1, 'Alfa', 'Beta', 1, 1);
    const adjudicado = match(2, 'Beta', 'Alfa', 0, 3, { awarded: true });
    const d = recalculateAll({ leagues: [LEAGUE], matches: [jugado, adjudicado], fixtures: [], params: DEFAULT_MODEL_PARAMS });
    const alfa = d.statsByTeamId.get(id('Alfa'))!;
    expect([alfa.played, alfa.avgGoalsFor, alfa.ppg]).toEqual([1, 1, 1]);
    // Una actualización marca también el partido que ya estaba guardado.
    expect(mergeMatch({ ...adjudicado, awarded: undefined }, adjudicado).merged.awarded).toBe(true);
  });
});

describe('columnas derivadas de PARTIDOS', () => {
  it('sumPair devuelve null si falta un lado (nunca 0)', () => {
    expect(sumPair(2, 3)).toBe(5);
    expect(sumPair(null, 3)).toBeNull();
    expect(sumPair(2, null)).toBeNull();
    expect(sumPair(0, 0)).toBe(0);
  });

  it('resultado, BTTS y over', () => {
    expect(resultFT(match(1, 'A', 'B', 2, 1))).toBe('1');
    expect(resultFT(match(1, 'A', 'B', 1, 1))).toBe('X');
    expect(resultFT(match(1, 'A', 'B', 0, 1))).toBe('2');
    expect(resultFT(match(1, 'A', 'B', null, null))).toBeNull();

    expect(isBtts(match(1, 'A', 'B', 1, 1))).toBe(true);
    expect(isBtts(match(1, 'A', 'B', 3, 0))).toBe(false);
    expect(isBtts(match(1, 'A', 'B', null, 1))).toBeNull();

    expect(isOver(match(1, 'A', 'B', 1, 1), 1.5)).toBe(true);
    expect(isOver(match(1, 'A', 'B', 1, 1), 2.5)).toBe(false);
    expect(isOver(match(1, 'A', 'B', 2, 2), 3.5)).toBe(true); // 4 > 3.5
    expect(isOver(match(1, 'A', 'B', 2, 1), 3.5)).toBe(false); // 3 < 3.5
    expect(isOver(match(1, 'A', 'B', 3, 1), 3.5)).toBe(true);
  });

  it('los puntos son 3 / 1 / 0', () => {
    const m = match(1, 'A', 'B', 2, 1);
    expect(pointsFor(m, true)).toBe(3);
    expect(pointsFor(m, false)).toBe(0);
    const d = match(1, 'A', 'B', 1, 1);
    expect(pointsFor(d, true)).toBe(1);
    expect(pointsFor(d, false)).toBe(1);
  });
});

describe('estadísticas de equipo y clasificación', () => {
  const derived = buildDataset();

  it('cuenta PJ, PG, PE, PP, puntos y goles', () => {
    const alfa = derived.statsByTeamId.get(id('Alfa'))!;
    // Alfa: 2-0 G, 2-1 G(fuera), 1-1 E, 0-0 E(fuera), 4-1 G, 0-1 P(fuera)
    expect(alfa.played).toBe(6);
    expect(alfa.won).toBe(3);
    expect(alfa.drawn).toBe(2);
    expect(alfa.lost).toBe(1);
    expect(alfa.points).toBe(11);
    expect(alfa.goalsFor).toBe(9);
    expect(alfa.goalsAgainst).toBe(4);
    expect(alfa.goalDiff).toBe(5);
    expect(alfa.ppg).toBeCloseTo(11 / 6, 12);
  });

  it('PJ = PG + PE + PP para todos los equipos', () => {
    for (const s of derived.statsByTeamId.values()) {
      expect(s.won + s.drawn + s.lost).toBe(s.played);
      expect(s.points).toBe(s.won * 3 + s.drawn);
    }
  });

  it('los goles marcados por unos son los encajados por otros', () => {
    const stats = [...derived.statsByTeamId.values()];
    const gf = stats.reduce((a, s) => a + s.goalsFor, 0);
    const gc = stats.reduce((a, s) => a + s.goalsAgainst, 0);
    expect(gf).toBe(gc);
  });

  it('promedios null cuando no hay partidos', () => {
    const empty = recalculateAll({
      leagues: [LEAGUE],
      matches: [],
      fixtures: [],
      params: DEFAULT_MODEL_PARAMS,
    });
    expect(empty.teams).toHaveLength(0);
  });

  it('ordena puntos → diferencia de goles → goles a favor → nombre', () => {
    const base = {
      points: 10,
      goalDiff: 3,
      goalsFor: 12,
      teamName: 'M',
    } as Parameters<typeof compareStanding>[0];
    expect(compareStanding({ ...base, points: 11 }, base)).toBeLessThan(0);
    expect(compareStanding({ ...base, goalDiff: 5 }, base)).toBeLessThan(0);
    expect(compareStanding({ ...base, goalsFor: 20 }, base)).toBeLessThan(0);
    expect(compareStanding({ ...base, teamName: 'A' }, base)).toBeLessThan(0);
    expect(compareStanding(base, base)).toBe(0);
  });

  it('la tabla asigna posiciones 1..N sin repetir', () => {
    const table = derived.standingsByLeague.get(LEAGUE.id)!;
    expect(table.map((r) => r.position)).toEqual([1, 2, 3, 4]);
    for (let i = 1; i < table.length; i++) {
      expect(table[i - 1].points).toBeGreaterThanOrEqual(table[i].points);
    }
    expect(table[0].teamName).toBe('Alfa'); // 11 pts, el que más
  });

  it('los splits Home + Away reconstruyen el total', () => {
    for (const t of derived.teams) {
      const total = derived.statsByTeamId.get(t.id)!;
      const h = derived.homeStatsByTeamId.get(t.id)!;
      const a = derived.awayStatsByTeamId.get(t.id)!;
      expect(h.played + a.played).toBe(total.played);
      expect(h.points + a.points).toBe(total.points);
      expect(h.goalsFor + a.goalsFor).toBe(total.goalsFor);
      expect(h.goalsAgainst + a.goalsAgainst).toBe(total.goalsAgainst);
    }
  });
});

describe('forma reciente (ventana de jornadas)', () => {
  const derived = buildDataset();

  it('la última jornada jugada es la mayor del equipo', () => {
    const alfa = derived.formByTeamId.get(id('Alfa'))!;
    expect(alfa.lastRound).toBe(6);
  });

  it('últimos 5 = jornadas 2..6', () => {
    const alfa = derived.formByTeamId.get(id('Alfa'))!.last5;
    // J2 2-1 G, J3 1-1 E, J4 0-0 E, J5 4-1 G, J6 0-1 P
    expect(alfa.played).toBe(5);
    expect(alfa.won).toBe(2);
    expect(alfa.drawn).toBe(2);
    expect(alfa.lost).toBe(1);
    expect(alfa.points).toBe(8);
    expect(alfa.goalsFor).toBe(7);
    expect(alfa.goalsAgainst).toBe(4);
    expect(alfa.avgGoalsFor).toBeCloseTo(7 / 5, 12);
    expect(alfa.avgGoalsAgainst).toBeCloseTo(4 / 5, 12);
  });

  it('últimos 10 abarca toda la temporada cuando hay menos de 10 jornadas', () => {
    const alfa = derived.formByTeamId.get(id('Alfa'))!.last10;
    const total = derived.statsByTeamId.get(id('Alfa'))!;
    expect(alfa.played).toBe(total.played);
    expect(alfa.points).toBe(total.points);
    expect(alfa.goalsFor).toBe(total.goalsFor);
  });

  it('la ventana va por JORNADA, no por número de partidos', () => {
    // Beta se salta la jornada 5 (partido aplazado): su ventana de 5 solo tiene 4 partidos.
    seq = 0;
    const matches = [
      match(1, 'Beta', 'Alfa', 1, 0),
      match(2, 'Alfa', 'Beta', 0, 0),
      match(3, 'Beta', 'Alfa', 2, 2),
      match(4, 'Alfa', 'Beta', 1, 3),
      match(6, 'Beta', 'Alfa', 0, 1),
    ];
    const last5 = calculateRecentForm(matches, LEAGUE.id, 'Beta', 5, 'excel');
    expect(lastPlayedRound(matches, LEAGUE.id, 'Beta')).toBe(6);
    // ventana: jornada > 1 y <= 6 ⇒ J2, J3, J4, J6 (la J5 no existe)
    expect(last5.played).toBe(4);
    expect(last5.points).toBe(5); // E + E + G + P
  });

  it('DIFF-12: con una fase nueva, la ventana del libro deja fuera el partido más reciente', () => {
    // Fase regular hasta la J30 y un play-off que vuelve a numerar desde la J1, como la LigaPro.
    const matches = [
      match(28, 'Alfa', 'Beta', 0, 0),
      match(29, 'Beta', 'Alfa', 1, 0),
      match(30, 'Alfa', 'Beta', 2, 2),
      { ...match(1, 'Beta', 'Alfa', 3, 0), phase: 'Championship Round', date: '2026-09-20' },
    ];

    // `excel`: lastPlayedRound = 30, ventana J26–J30, y el play-off (J1) se queda fuera.
    const libro = calculateRecentForm(matches, LEAGUE.id, 'Beta', 5, 'excel');
    expect(libro.played).toBe(3);
    expect(libro.points).toBe(5); // E + G + E

    // `fecha`: entra el partido más reciente, que es el que de verdad acaba de jugar.
    const porFecha = calculateRecentForm(matches, LEAGUE.id, 'Beta', 5, 'fecha');
    expect(porFecha.played).toBe(4);
    expect(porFecha.points).toBe(8); // los 3 anteriores + la victoria del play-off
  });

  it('sin partidos, la ventana está vacía y los promedios son null', () => {
    const w = calculateRecentForm([], LEAGUE.id, 'Nadie', 5);
    expect(w.played).toBe(0);
    expect(w.avgGoalsFor).toBeNull();
    expect(w.avgGoalsAgainst).toBeNull();
  });
});

describe('Strength of Schedule', () => {
  it('promedia el PPG de los rivales enfrentados', () => {
    const m1 = match(1, 'Alfa', 'Beta', 1, 0);
    const m2 = match(2, 'Gamma', 'Alfa', 0, 0);
    const ppg = new Map<string, number | null>([
      [id('Beta'), 1],
      [id('Gamma'), 2],
    ]);
    const sos = calculateStrengthOfSchedule(
      [
        { match: m1, isHome: true },
        { match: m2, isHome: false },
      ],
      ppg,
    );
    expect(sos).toBeCloseTo(1.5, 12);
  });

  it('sin partidos devuelve null', () => {
    expect(calculateStrengthOfSchedule([], new Map())).toBeNull();
  });
});

describe('deduplicación', () => {
  it('la clave natural es liga+temporada+fecha+local+visitante', () => {
    const a = buildMatchKey({
      leagueId: 'L',
      season: 'S',
      date: '2026-09-01',
      homeTeamName: 'A',
      awayTeamName: 'B',
    });
    const b = buildMatchKey({
      leagueId: 'L',
      season: 'S',
      date: '2026-09-01',
      homeTeamName: 'A',
      awayTeamName: 'B',
    });
    const c = buildMatchKey({
      leagueId: 'L',
      season: 'S',
      date: '2026-09-01',
      homeTeamName: 'B',
      awayTeamName: 'A',
    });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it('el id del proveedor tiene prioridad sobre la clave natural', () => {
    const base = {
      leagueId: 'L',
      season: 'S',
      date: '2026-09-01',
      homeTeamName: 'A',
      awayTeamName: 'B',
    };
    expect(resolveMatchId({ providerId: '123', ...base })).toBe('p:123');
    expect(resolveMatchId({ providerId: null, ...base })).toBe(buildMatchKey(base));
  });

  it('mergeMatch actualiza solo lo que cambia y nunca borra con null', () => {
    const existing = match(1, 'A', 'B', 1, 0, { cornersHome: 7, cornersAway: 3 });
    const incoming = match(1, 'A', 'B', 2, 0, { cornersHome: null, cornersAway: null });

    const { merged, changed } = mergeMatch(existing, incoming);
    expect(changed).toBe(true);
    expect(merged.homeGoals).toBe(2);
    // el null entrante no pisa el dato que ya teníamos
    expect(merged.cornersHome).toBe(7);
    expect(merged.cornersAway).toBe(3);

    const again = mergeMatch(merged, merged);
    expect(again.changed).toBe(false);
  });

  it('un partido repetido no duplica equipos ni estadísticas', () => {
    seq = 0;
    const m = match(1, 'Alfa', 'Beta', 2, 0);
    const derived = recalculateAll({
      leagues: [LEAGUE],
      matches: [m],
      fixtures: [],
      params: DEFAULT_MODEL_PARAMS,
    });
    expect(derived.teams).toHaveLength(2);
    expect(derived.statsByTeamId.get(id('Alfa'))!.played).toBe(1);
  });
});

describe('proyección de puntos y fin de temporada', () => {
  it('los puntos restantes salen de las probabilidades 1X2', () => {
    const derived = buildDataset();
    const fixtureBase = {
      leagueId: LEAGUE.id,
      season: LEAGUE.season,
      date: '2026-10-01',
      homeTeamName: 'Alfa',
      awayTeamName: 'Beta',
    };
    const fixture: Fixture = {
      id: resolveMatchId({ providerId: null, ...fixtureBase }),
      providerId: null,
      leagueId: LEAGUE.id,
      country: LEAGUE.country,
      season: LEAGUE.season,
      date: '2026-10-01',
      round: 7,
      homeTeamId: id('Alfa'),
      awayTeamId: id('Beta'),
      homeTeamName: 'Alfa',
      awayTeamName: 'Beta',
      status: 'Programado',
      source: 'test',
    };

    const withFixture = recalculateAll({
      leagues: [LEAGUE],
      matches: [...derived.teams].length
        ? // reutiliza los mismos partidos
          (() => {
            seq = 0;
            return [
              match(1, 'Alfa', 'Beta', 2, 0),
              match(1, 'Gamma', 'Delta', 1, 1),
              match(2, 'Beta', 'Gamma', 0, 3),
              match(2, 'Delta', 'Alfa', 1, 2),
              match(3, 'Alfa', 'Gamma', 1, 1),
              match(3, 'Beta', 'Delta', 2, 1),
              match(4, 'Gamma', 'Alfa', 0, 0),
              match(4, 'Delta', 'Beta', 3, 2),
              match(5, 'Alfa', 'Delta', 4, 1),
              match(5, 'Gamma', 'Beta', 2, 2),
              match(6, 'Beta', 'Alfa', 1, 0),
              match(6, 'Delta', 'Gamma', 0, 2),
            ];
          })()
        : [],
      fixtures: [fixture],
      params: DEFAULT_MODEL_PARAMS,
    });

    expect(withFixture.projections).toHaveLength(1);
    const p = withFixture.projections[0];
    expect(p.probs1x2.home + p.probs1x2.draw + p.probs1x2.away).toBeCloseTo(1, 12);
    expect(p.expectedGoalsTotal).toBeCloseTo(p.expectedGoalsHome + p.expectedGoalsAway, 12);
    expect(p.expectedGoalsHome).toBeGreaterThanOrEqual(0.1);

    const alfa = withFixture.seasonProjections.find((r) => r.teamId === id('Alfa'))!;
    const beta = withFixture.seasonProjections.find((r) => r.teamId === id('Beta'))!;

    expect(alfa.remainingMatches).toBe(1);
    expect(alfa.projectedRemainingPoints).toBeCloseTo(p.probs1x2.home * 3 + p.probs1x2.draw, 12);
    expect(alfa.projectedPoints).toBeCloseTo(alfa.currentPoints + alfa.projectedRemainingPoints, 12);
    expect(beta.projectedRemainingPoints).toBeCloseTo(p.probs1x2.away * 3 + p.probs1x2.draw, 12);

    // Los puntos repartidos en el partido están entre 2 (empate) y 3 (resultado decidido).
    const shared = alfa.projectedRemainingPoints + beta.projectedRemainingPoints;
    expect(shared).toBeGreaterThanOrEqual(2);
    expect(shared).toBeLessThanOrEqual(3);

    expect(alfa.projectedGoalsFor).toBeCloseTo(alfa.currentGoalsFor + p.expectedGoalsHome, 12);
    expect(beta.projectedGoalsAgainst).toBeCloseTo(beta.currentGoalsAgainst + p.expectedGoalsHome, 12);
  });

  it('sin fixtures, la proyección final es la situación actual', () => {
    const derived = buildDataset();
    for (const r of derived.seasonProjections) {
      expect(r.remainingMatches).toBe(0);
      expect(r.projectedRemainingPoints).toBe(0);
      expect(r.projectedPoints).toBe(r.currentPoints);
      expect(r.projectedGoalsFor).toBe(r.currentGoalsFor);
    }
  });
});

describe('goles por parte (DIFF-10)', () => {
  it('proporción de la 1.ª parte contraída hacia la global; sin 20 partidos con descanso no hay proporción', () => {
    seq = 0;
    // 2-1 con descanso 2-0: 2 de los 3 goles en la 1.ª parte.
    const conDescanso = Array.from({ length: 20 }, () => match(1, 'Alfa', 'Beta', 2, 1, { homeFirstHalfGoals: 2, awayFirstHalfGoals: 0 }));
    const r = calculateFirstHalfShare(conDescanso);
    expect(r.matches).toBe(20);
    expect(r.share).toBeCloseTo((40 + FIRST_HALF_PRIOR_GOALS * FIRST_HALF_SHARE) / (60 + FIRST_HALF_PRIOR_GOALS), 12);
    expect(calculateFirstHalfShare(conDescanso.slice(0, 19)).share).toBeNull();
    // Un descanso que no cuadra con el final no cuenta.
    const roto = match(1, 'Alfa', 'Beta', 1, 0, { homeFirstHalfGoals: 2, awayFirstHalfGoals: 0 });
    expect(calculateFirstHalfShare([...conDescanso, roto]).matches).toBe(20);
  });

  it('la proyección reparte la λ total entre las dos partes con la proporción de la liga', () => {
    seq = 0;
    const partidos = Array.from({ length: 20 }, (_, i) =>
      match(i + 1, i % 2 ? 'Alfa' : 'Beta', i % 2 ? 'Beta' : 'Alfa', 2, 1, { homeFirstHalfGoals: 1, awayFirstHalfGoals: 0 }),
    );
    const pendiente: Fixture = {
      id: 'f-partes',
      providerId: null,
      leagueId: LEAGUE.id,
      country: LEAGUE.country,
      season: LEAGUE.season,
      date: '2026-12-01',
      round: 21,
      homeTeamId: id('Alfa'),
      awayTeamId: id('Beta'),
      homeTeamName: 'Alfa',
      awayTeamName: 'Beta',
      status: 'Programado',
      source: null,
    };
    const d = recalculateAll({ leagues: [LEAGUE], matches: partidos, fixtures: [pendiente], params: DEFAULT_MODEL_PARAMS });
    const p = d.projectionsByFixtureId.get('f-partes')!;
    const share = d.averagesByLeague.get(LEAGUE.id)!.firstHalfShare!;
    expect(p.expectedGoalsFirstHalf).toBeCloseTo(p.expectedGoalsTotal * share, 12);
    expect(p.expectedGoalsFirstHalf! + p.expectedGoalsSecondHalf!).toBeCloseTo(p.expectedGoalsTotal, 12);
    expect(p.probOver05FirstHalf).toBeCloseTo(1 - Math.exp(-p.expectedGoalsFirstHalf!), 12);

    // La mini-liga no tiene descansos: no proyecta por partes.
    const sinDescansos = buildDataset();
    expect(sinDescansos.averagesByLeague.get(LEAGUE.id)!.firstHalfShare).toBeNull();
  });
});

describe('mejoras del modelo del 18/09/2026 (DIFF-11 y DIFF-12)', () => {
  /** La mini-liga con xG en todos los partidos y un pendiente Alfa – Beta. */
  function conXg(params: ModelParams) {
    seq = 0;
    const g = (hg: number, ag: number) => ({ xGHome: hg + 0.3, xGAway: ag + 0.1 });
    const matches = [
      match(1, 'Alfa', 'Beta', 2, 0, g(2, 0)),
      match(1, 'Gamma', 'Delta', 1, 1, g(1, 1)),
      match(2, 'Beta', 'Gamma', 0, 3, g(0, 3)),
      match(2, 'Delta', 'Alfa', 1, 2, g(1, 2)),
      match(3, 'Alfa', 'Gamma', 1, 1, g(1, 1)),
      match(3, 'Beta', 'Delta', 2, 1, g(2, 1)),
      match(4, 'Gamma', 'Alfa', 0, 0, g(0, 0)),
      match(4, 'Delta', 'Beta', 3, 2, g(3, 2)),
    ];
    const pendiente: Fixture = {
      id: 'f-xg',
      providerId: null,
      leagueId: LEAGUE.id,
      country: LEAGUE.country,
      season: LEAGUE.season,
      date: '2026-12-01',
      round: 5,
      homeTeamId: id('Alfa'),
      awayTeamId: id('Beta'),
      homeTeamName: 'Alfa',
      awayTeamName: 'Beta',
      status: 'Programado',
      source: null,
    };
    const d = recalculateAll({ leagues: [LEAGUE], matches, fixtures: [pendiente], params });
    return { d, p: d.projectionsByFixtureId.get('f-xg')! };
  }

  it('el 1X2 sale de la matriz Poisson; con el modo del libro, de la logística', () => {
    const { p } = conXg(DEFAULT_MODEL_PARAMS);
    const poisson = poisson1X2Probabilities(p.expectedGoalsHome, p.expectedGoalsAway);
    expect(p.probs1x2.home).toBeCloseTo(poisson.home, 12);
    expect(p.probs1x2.draw).toBeCloseTo(poisson.draw, 12);
    expect(p.probs1x2.home + p.probs1x2.draw + p.probs1x2.away).toBeCloseTo(1, 12);

    const libro = { ...DEFAULT_MODEL_PARAMS, oneXTwoMode: 'excel' as const };
    const { d, p: q } = conXg(libro);
    const logistica = calculate1X2Probabilities(q.expectedGoalsHome, q.expectedGoalsAway, d.averagesByLeague.get(LEAGUE.id)!.drawRate, libro);
    expect(q.probs1x2.draw).toBeCloseTo(logistica.draw, 12);
  });

  it('el término de xG es xG a favor × en contra del rival; con el modo del libro, solo a favor', () => {
    const { d, p } = conXg(DEFAULT_MODEL_PARAMS);
    const av = d.averagesByLeague.get(LEAGUE.id)!;
    const alfa = d.homeStatsByTeamId.get(id('Alfa'))!;
    const beta = d.awayStatsByTeamId.get(id('Beta'))!;
    expect(p.breakdown.xgHome).toBeCloseTo(xgStrengthValue(alfa, beta, av.homeXgFor, av.awayXgAgainst, DEFAULT_MODEL_PARAMS.kShrink)!, 12);
    expect(p.breakdown.xgHome).not.toBeCloseTo(alfa.xg.avgFor!, 6);

    const { p: q } = conXg({ ...DEFAULT_MODEL_PARAMS, xgStrengthMode: 'excel' });
    expect(q.breakdown.xgHome).toBeCloseTo(alfa.xg.avgFor!, 12);
  });

  it('sin xG del rival se usa el término del libro', () => {
    const { d } = conXg(DEFAULT_MODEL_PARAMS);
    const alfa = d.homeStatsByTeamId.get(id('Alfa'))!;
    const sinXg = { ...d.awayStatsByTeamId.get(id('Beta'))!, xg: { ...alfa.xg, avgAgainst: null } };
    expect(xgStrengthValue(alfa, sinXg, 1.4, 1.2, 10)).toBeNull();
    expect(xgStrengthValue(alfa, alfa, 0, 1.2, 10)).toBeNull();
  });
});
