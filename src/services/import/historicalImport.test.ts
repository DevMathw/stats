import { describe, expect, it } from 'vitest';
import type { ImportResult } from './excelImport';
import type { League, Match } from '../../types';
import { canonicalPhase, prepararHistorico, proponerTemporada, seasonsOf } from './historicalImport';
import { buildTeamId, resolveMatchId } from '../../domain/models/ids';
import { mergeLeagueImport } from './mergeLeague';
import { recalculateAll } from '../../domain/engine';
import { DEFAULT_MODEL_PARAMS } from '../../domain/models/params';

const LIGA: League = {
  id: 'Primera A (Liga BetPlay Dimayor)',
  country: 'Colombia',
  name: 'Primera A',
  confederation: 'CONMEBOL',
  season: '2026/27*',
  calendarFormat: 'Ano calendario, Apertura/Finalizacion',
  teamCount: 20,
  regularSeasonRounds: null,
  approximateStartDate: null,
  source: null,
  reliabilityNotes: null,
};

function partido(date: string, home: string, away: string, extra: Partial<Match> = {}): Match {
  const base = { leagueId: 'X', season: 'Temporada 2026/27', date, homeTeamName: home, awayTeamName: away };
  return {
    id: resolveMatchId({ providerId: null, ...base }),
    providerId: null,
    leagueId: 'X',
    country: '',
    season: 'Temporada 2026/27',
    date,
    round: 1,
    phase: null,
    homeTeamId: buildTeamId('X', home),
    awayTeamId: buildTeamId('X', away),
    homeTeamName: home,
    awayTeamName: away,
    homeGoals: 1,
    awayGoals: 0,
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
    ...extra,
  };
}

const resultado = (matches: Match[]): ImportResult => ({
  leagues: [],
  matches,
  fixtures: [],
  params: {} as ImportResult['params'],
  issues: [],
  stats: { leagues: 0, matches: matches.length, fixtures: 0, duplicatesSkipped: 0, teams: 0 },
});

describe('nombre canónico de la fase', () => {
  it('«Finalización» y «Clausura» son el mismo torneo', () => {
    // Dimayor lo llama Finalización y FotMob Clausura. Los 96 partidos ya guardados vienen de FotMob, así
    // que manda el nombre en vivo: si no, la misma competición tendría dos fases y se partiría la tabla.
    expect(canonicalPhase('Finalización')).toBe('Clausura');
    expect(canonicalPhase('finalizacion')).toBe('Clausura');
    expect(canonicalPhase('Torneo Finalización')).toBe('Clausura');
    expect(canonicalPhase('Clausura')).toBe('Clausura');
  });

  it('una fase que no está en la tabla se respeta tal cual', () => {
    expect(canonicalPhase('Championship Round')).toBe('Championship Round');
    expect(canonicalPhase('')).toBeNull();
    expect(canonicalPhase(null)).toBeNull();
  });
});

describe('propuesta de temporada', () => {
  const enero2025 = [partido('2025-01-24', 'A', 'B'), partido('2025-06-29', 'C', 'D')];

  it('saca año y fase del nombre del archivo', () => {
    // La columna «Temporada» del libro viene vacía en los 15 archivos medidos, y LIGAS dice siempre
    // «Temporada 2026/27» aunque el archivo sea de 2025: el nombre es lo único que los distingue.
    const p = proponerTemporada('Primera_A_BetPlay_2025_Apertura.xlsx', enero2025);
    expect(p).toMatchObject({ season: '2025', phase: 'Apertura', from: { season: 'nombre', phase: 'nombre' } });
    expect(p.warnings).toEqual([]);
  });

  it('canoniza la fase ya en la propuesta', () => {
    expect(proponerTemporada('Primera_A_BetPlay_2025_Finalizacion.xlsx', enero2025).phase).toBe('Clausura');
  });

  it('reconoce una temporada cruzada', () => {
    const p = proponerTemporada('UEFA_Europa_League_2026_27.xlsx', [partido('2026-09-01', 'A', 'B')]);
    expect(p.season).toBe('2026-27');
  });

  it('sin fase en el nombre, cae a la que traigan los datos', () => {
    const p = proponerTemporada('LigaPro_SerieA_Ecuador_2026.xlsx', [partido('2026-03-01', 'A', 'B', { phase: 'Relegation Round' })]);
    expect(p).toMatchObject({ season: '2026', phase: 'Relegation Round', from: { phase: 'datos' } });
  });

  it('avisa si el nombre y las fechas no coinciden', () => {
    const p = proponerTemporada('Liga_2025_Apertura.xlsx', [partido('2026-03-01', 'A', 'B')]);
    expect(p.season).toBe('2025'); // el nombre manda…
    expect(p.warnings[0]).toContain('2026'); // …pero se avisa en vez de aceptarlo callando
  });

  it('sin fechas ni año, no inventa una temporada', () => {
    const p = proponerTemporada('historico.xlsx', []);
    expect(p.season).toBeNull();
    expect(p.warnings.join(' ')).toContain('elígela a mano');
  });
});

describe('preparación del histórico', () => {
  const imported = resultado([partido('2025-01-24', 'Millonarios', 'Nacional'), partido('2025-06-29', 'Cali', 'Tolima', { xGHome: 1.2 })]);

  it('reetiqueta temporada, fase y competición', () => {
    const { matches } = prepararHistorico(imported, LIGA, { season: '2025', phase: 'Finalización' }, 'f.xlsx');
    expect(matches.every((m) => m.season === '2025')).toBe(true);
    expect(matches.every((m) => m.phase === 'Clausura')).toBe(true);
    expect(matches.every((m) => m.leagueId === LIGA.id && m.country === 'Colombia')).toBe(true);
  });

  it('el id lleva la temporada, así que dos torneos no se pisan', () => {
    const a = prepararHistorico(imported, LIGA, { season: '2025', phase: 'Apertura' }, 'a.xlsx').matches;
    const b = prepararHistorico(imported, LIGA, { season: '2026', phase: 'Apertura' }, 'b.xlsx').matches;
    expect(new Set([...a, ...b].map((m) => m.id)).size).toBe(4);
  });

  it('el resumen dice qué trae el archivo y qué no, sin rellenarlo', () => {
    const { summary } = prepararHistorico(imported, LIGA, { season: '2025', phase: null }, 'f.xlsx', '2026-09-25T00:00:00Z');
    expect(summary).toMatchObject({ matches: 2, teams: 4, firstDate: '2025-01-24', lastDate: '2025-06-29', rejected: 0 });
    expect(summary.coverage.Marcador).toBe(2);
    expect(summary.coverage.xG).toBe(1);
    // El archivo no trae córners: se informa con 0 partidos, no se inventa un valor.
    expect(summary.coverage['Córners']).toBe(0);
  });
});

describe('temporadas presentes por competición', () => {
  it('agrupa por temporada y fase, de la más nueva a la más vieja', () => {
    const ms = [
      ...prepararHistorico(resultado([partido('2025-02-01', 'A', 'B')]), LIGA, { season: '2025', phase: 'Apertura' }, 'x').matches,
      ...prepararHistorico(resultado([partido('2025-08-01', 'A', 'B')]), LIGA, { season: '2025', phase: 'Finalización' }, 'x').matches,
      ...prepararHistorico(resultado([partido('2026-02-01', 'A', 'B')]), LIGA, { season: '2026', phase: 'Apertura' }, 'x').matches,
    ];
    expect(seasonsOf(ms, LIGA.id)).toEqual([
      { season: '2026', phase: 'Apertura', matches: 1 },
      { season: '2025', phase: 'Apertura', matches: 1 },
      { season: '2025', phase: 'Clausura', matches: 1 },
    ]);
  });
});

describe('la ruta completa: preparar + fusionar', () => {
  /*
   * Esta es la prueba que faltaba y por la que el fallo llegó a los datos reales. Las de arriba comprueban
   * `prepararHistorico` en aislamiento, y ahí la temporada salía bien; pero `mergeLeagueImport` volvía a
   * estampar `season: league.season` sobre cada fila y deshacía el trabajo. Al cargar la BetPlay 2025 en la
   * aplicación de verdad, sus 200 partidos entraron como 2026/27: América de Cali pasó de 24 puntos en 11
   * partidos a 69 en 33 y la tabla creció de 20 equipos a 27.
   */
  // La fusión localiza la competición en la hoja LIGAS del archivo: sin ella no hay nada que fusionar.
  const historico: ImportResult = {
    ...resultado([partido('2025-02-01', 'Millonarios', 'Nacional'), partido('2025-02-08', 'Cali', 'Tolima')]),
    leagues: [LIGA],
  };
  const enCurso = [
    { ...partido('2026-08-01', 'Millonarios', 'Nacional'), leagueId: LIGA.id, country: 'Colombia', season: '2026/27*' },
  ];

  const fusionar = () => {
    const { matches: historicos } = prepararHistorico(historico, LIGA, { season: '2025', phase: 'Apertura' }, 'f.xlsx');
    return mergeLeagueImport({
      league: LIGA,
      imported: { ...historico, matches: historicos, fixtures: [] },
      existingMatches: enCurso,
      existingFixtures: [],
      season: '2025',
    });
  };

  it('los partidos históricos conservan su temporada tras la fusión', () => {
    const { matches } = fusionar();
    const de2025 = matches.filter((m) => m.season === '2025');
    expect(de2025).toHaveLength(2);
    expect(matches.filter((m) => m.season === '2026/27*')).toHaveLength(1);
  });

  it('y la tabla de la temporada en curso no se mueve', () => {
    const { matches } = fusionar();
    const antes = recalculateAll({ leagues: [LIGA], matches: enCurso, fixtures: [], params: DEFAULT_MODEL_PARAMS });
    const despues = recalculateAll({ leagues: [LIGA], matches, fixtures: [], params: DEFAULT_MODEL_PARAMS });
    const tabla = (d: ReturnType<typeof recalculateAll>) =>
      (d.standingsByLeague.get(LIGA.id) ?? []).map((r) => `${r.teamName} ${r.points}/${r.played}`);
    expect(tabla(despues)).toEqual(tabla(antes));
    expect(tabla(despues)).toHaveLength(2); // Cali y Tolima solo jugaron en 2025: no entran
  });

  it('sin el parámetro `season`, la fusión vuelve a pisar la temporada', () => {
    // Deja constancia del comportamiento por defecto, que es el correcto para el archivo de la temporada
    // en curso y el que causó el fallo al reutilizarlo para el histórico.
    const { matches: historicos } = prepararHistorico(historico, LIGA, { season: '2025', phase: 'Apertura' }, 'f.xlsx');
    const { matches } = mergeLeagueImport({
      league: LIGA,
      imported: { ...historico, matches: historicos, fixtures: [] },
      existingMatches: [],
      existingFixtures: [],
    });
    expect(matches.every((m) => m.season === LIGA.season)).toBe(true);
  });
});

describe('ida y vuelta de una eliminatoria', () => {
  /*
   * `findTwin` daba por hecho que «en una jornada dos clubes no se enfrentan dos veces». En los
   * cuadrangulares colombianos sí: la ida y la vuelta llevan el mismo número de jornada, se juegan con
   * pocos días de diferencia y con la localía invertida. Al cargar la BetPlay 2025 la vuelta desaparecía.
   */
  const ida = { ...partido('2025-06-24', 'Independiente Santa Fe', 'Independiente Medellín', { homeGoals: 0, awayGoals: 0 }), round: 24 };
  const vuelta = { ...partido('2025-06-29', 'Independiente Medellín', 'Independiente Santa Fe', { homeGoals: 1, awayGoals: 2 }), round: 24 };

  const cargar = () => {
    const archivo: ImportResult = { ...resultado([ida, vuelta]), leagues: [LIGA] };
    const { matches: historicos } = prepararHistorico(archivo, LIGA, { season: '2025', phase: 'Apertura' }, 'f.xlsx');
    return mergeLeagueImport({
      league: LIGA,
      imported: { ...archivo, matches: historicos, fixtures: [] },
      existingMatches: [],
      existingFixtures: [],
      season: '2025',
    }).matches;
  };

  it('los dos partidos se conservan', () => {
    const matches = cargar();
    expect(matches).toHaveLength(2);
    expect(matches.map((m) => `${m.date} ${m.homeTeamName} ${m.homeGoals}-${m.awayGoals}`).sort()).toEqual([
      '2025-06-24 Independiente Santa Fe 0-0',
      '2025-06-29 Independiente Medellín 1-2',
    ]);
  });

  it('pero el mismo partido de dos fuentes con la localía al revés sigue fundiéndose', () => {
    // La otra cara de la regla: a dos días o menos, la localía invertida es un desacuerdo entre fuentes
    // sobre el MISMO partido (LigaPro J29, Aucas - Barcelona SC), no dos encuentros.
    const unaFuente = { ...partido('2025-06-24', 'Independiente Santa Fe', 'Independiente Medellín', { homeGoals: 0, awayGoals: 0 }), round: 24 };
    const otraFuente = { ...partido('2025-06-25', 'Independiente Medellín', 'Independiente Santa Fe', { homeGoals: 0, awayGoals: 0 }), round: 24 };
    const archivo: ImportResult = { ...resultado([otraFuente]), leagues: [LIGA] };
    const { matches: historicos } = prepararHistorico(archivo, LIGA, { season: '2025', phase: 'Apertura' }, 'f.xlsx');
    const { matches } = mergeLeagueImport({
      league: LIGA,
      imported: { ...archivo, matches: historicos, fixtures: [] },
      existingMatches: [{ ...unaFuente, leagueId: LIGA.id, season: '2025' }],
      existingFixtures: [],
      season: '2025',
    });
    expect(matches).toHaveLength(1);
  });
});
