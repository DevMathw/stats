/**
 * Orquestador del recálculo completo. MODEL_MAPPING.md §17.
 *
 * PARTIDOS → EQUIPOS → PPG rival → SoS → HOME/AWAY + FORMA → TABLA → medias de liga
 *          → PROYECCIONES → PROYECCION FINAL
 *
 * Todo en una pasada por partido + una por equipo: 998 partidos × 308 equipos se
 * recalculan en milisegundos, así que no hay caché ni invalidación selectiva.
 */
import type {
  Fixture,
  League,
  LeagueAverages,
  Match,
  MatchProjection,
  ModelParams,
  RecentForm,
  SeasonProjection,
  SplitStats,
  StandingRow,
  Team,
  TeamStats,
} from '../types';
import { countsForAnalysis } from './calculations/matchDerived';
import { estimateDispersion, type Dispersion } from './probability/negativeBinomial';
// El mismo mínimo que exige el mercado para usar la dispersión: por debajo, la de la temporada no sirve.
import {
  COUNT_MARKET_IDS,
  COUNT_TEAM,
  COUNT_TOTAL,
  MIN_LEAGUE_COUNT_SAMPLE,
  teamDispersionKey,
  type CountDispersionKey,
} from './betting/markets';
import { buildTeamId } from './models/ids';
import { currentSeasons, isCurrentSeason } from './models/seasonScope';
import { calculateMatchProjection } from './projections/matchProjection';
import type { EnginePrediction } from './prediction/engine';
import { calculateSeasonProjection } from './projections/seasonProjection';
import type { TeamMatch } from './statistics/aggregate';
import { calculateForm } from './statistics/form';
import { blendLeagueAverages, calculateLeagueAverages } from './statistics/leagueAverages';
import { calculateLeagueRounds, type LeagueRounds } from './statistics/leagueRounds';
import { attachStrengthOfSchedule } from './statistics/sos';
import { calculateSplitStats } from './statistics/splitStats';
import { calculateStandings } from './statistics/standings';
import { calculateTeamStats } from './statistics/teamStats';

export interface Dataset {
  leagues: League[];
  matches: Match[];
  fixtures: Fixture[];
  params: ModelParams;
  /**
   * Predicción del motor de los siete modelos por partido pendiente. Solo se usa si
   * `params.projectionSource === 'ensemble'`; entrenarlos es caro, así que se calculan aparte y se
   * pasan hechas. Ver PREDICTION_ENGINE.md.
   */
  predictions?: Map<string, EnginePrediction>;
}

export interface Derived {
  teams: Team[];
  teamsById: Map<string, Team>;
  /**
   * Referencia global de **cada** equipo que aparece en los datos, también los que solo están en el
   * histórico.
   *
   * Hace falta porque `teamsById` es solo de la temporada en curso, y de la referencia cuelgan el nombre
   * oficial y el escudo: un club descendido (Envigado, Unión Magdalena en la BetPlay) salía en la tabla de
   * Partidos con las iniciales y con el nombre de los datos, aunque su escudo estuviera en el catálogo.
   */
  refByTeamId: Map<string, string>;
  statsByTeamId: Map<string, TeamStats>;
  homeStatsByTeamId: Map<string, SplitStats>;
  awayStatsByTeamId: Map<string, SplitStats>;
  formByTeamId: Map<string, RecentForm>;
  standingsByLeague: Map<string, StandingRow[]>;
  averagesByLeague: Map<string, LeagueAverages>;
  /** En qué jornada va cada liga y cuál es la siguiente pendiente. */
  roundsByLeague: Map<string, LeagueRounds>;
  projections: MatchProjection[];
  projectionsByFixtureId: Map<string, MatchProjection>;
  seasonProjections: SeasonProjection[];
  /** PARTIDOS!AX/AY — PPG del rival, por id de partido. */
  opponentPpg: Map<string, { home: number | null; away: number | null }>;
  /**
   * Lo que cada equipo hizo en las TEMPORADAS ANTERIORES de su competición, en casa y fuera.
   *
   * No entra en la tabla ni en las medias: es el prior de la contracción bayesiana de las proyecciones
   * (`params.priorMode`). Se expone para poder decir en pantalla sobre cuántos partidos se apoya cada
   * proyección, que es la trazabilidad que pide tener el histórico. Vacío si no hay histórico cargado.
   */
  historyByTeamId: Map<string, { home: SplitStats; away: SplitStats; matches: number }>;
  /**
   * Varianza y media por partido de cada mercado de conteo en cada liga, para sus Over/Under
   * (binomial negativa). Las claves son las del mercado (`COUNT_MARKETS`). `null` si la liga tiene
   * menos de 2 partidos con el dato.
   */
  dispersionByLeague: Map<string, Partial<Record<CountDispersionKey, Dispersion | null>>>;
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const arr = map.get(key);
  if (arr) arr.push(value);
  else map.set(key, [value]);
}

/** EQUIPOS: la lista de equipos sale de los propios partidos (y de los fixtures). */
export function deriveTeams(leagues: League[], matches: Match[], fixtures: Fixture[]): Team[] {
  const leagueById = new Map(leagues.map((l) => [l.id, l]));
  const teams = new Map<string, Team>();

  const add = (leagueId: string, name: string, season: string, ref: string | null | undefined) => {
    const id = buildTeamId(leagueId, name);
    const ya = teams.get(id);
    if (ya) {
      if (!ya.ref && ref) ya.ref = ref;
      return;
    }
    teams.set(id, {
      id,
      leagueId,
      name,
      country: leagueById.get(leagueId)?.country ?? '',
      season: leagueById.get(leagueId)?.season ?? season,
      ref: ref ?? null,
    });
  };

  for (const m of matches) {
    add(m.leagueId, m.homeTeamName, m.season, m.homeTeamRef);
    add(m.leagueId, m.awayTeamName, m.season, m.awayTeamRef);
  }
  for (const f of fixtures) {
    add(f.leagueId, f.homeTeamName, f.season, f.homeTeamRef);
    add(f.leagueId, f.awayTeamName, f.season, f.awayTeamRef);
  }
  return [...teams.values()].sort((a, b) =>
    a.leagueId === b.leagueId ? a.name.localeCompare(b.name) : a.leagueId.localeCompare(b.leagueId),
  );
}

export function recalculateAll(data: Dataset): Derived {
  /*
   * Solo la temporada vigente. Tabla, forma, medias, dispersión y proyecciones describen la temporada que
   * se está jugando: mezclarles un histórico sumaría dos torneos en la misma tabla y promediaría dos
   * plantillas distintas en el mismo PPG. El histórico se guarda entero y lo consume el motor de
   * predicción, que recorre por fecha y no puede mirar hacia delante. Ver `models/seasonScope.ts`.
   */
  const vigentes = currentSeasons(data.leagues);
  const deLaTemporada = data.matches.filter((m) => isCurrentSeason(m, vigentes));
  const fixturesDeLaTemporada = data.fixtures.filter((f) => isCurrentSeason(f, vigentes));

  // Los resultados adjudicados se ven en Partidos, pero no cuentan en ninguna cifra del análisis (DIFF-09).
  const played = deLaTemporada.filter(countsForAnalysis);

  /*
   * El histórico: todo lo que NO es de la temporada vigente.
   *
   * Sigue fuera de la tabla, de la forma, de las medias y de la dispersión, por lo que dice
   * `models/seasonScope.ts`. Lo único que hace es dar un punto de partida mejor que «la media de la liga» a
   * la contracción de las proyecciones. No hay fuga de información posible: son temporadas cerradas, todas
   * anteriores a cualquier partido pendiente de la que se está jugando.
   */
  const historicos = data.matches.filter((m) => !isCurrentSeason(m, vigentes) && countsForAnalysis(m));
  const historicosPorLiga = new Map<string, Match[]>();
  for (const m of historicos) push(historicosPorLiga, m.leagueId, m);
  /** Si el histórico participa. `liga` deja el modelo exactamente como el libro. */
  const conPrior = data.params.priorMode !== 'liga';

  const teams = deriveTeams(data.leagues, deLaTemporada, fixturesDeLaTemporada);
  const teamsById = new Map(teams.map((t) => [t.id, t]));

  // Sobre TODAS las filas, no solo las de la temporada vigente: ver `refByTeamId`.
  const refByTeamId = new Map<string, string>();
  for (const filas of [data.matches, data.fixtures]) {
    for (const r of filas) {
      if (r.homeTeamRef) refByTeamId.set(r.homeTeamId, r.homeTeamRef);
      if (r.awayTeamRef) refByTeamId.set(r.awayTeamId, r.awayTeamRef);
    }
  }

  // --- índices en una sola pasada -----------------------------------------
  const rowsByTeam = new Map<string, TeamMatch[]>();
  const matchesByLeague = new Map<string, Match[]>();
  for (const m of played) {
    push(rowsByTeam, m.homeTeamId, { match: m, isHome: true });
    push(rowsByTeam, m.awayTeamId, { match: m, isHome: false });
    push(matchesByLeague, m.leagueId, m);
  }
  const teamsByLeague = new Map<string, Team[]>();
  for (const t of teams) push(teamsByLeague, t.leagueId, t);

  // --- EQUIPOS + FORMA + HOME/AWAY ----------------------------------------
  const statsByTeamId = new Map<string, TeamStats>();
  const homeStatsByTeamId = new Map<string, SplitStats>();
  const awayStatsByTeamId = new Map<string, SplitStats>();
  const formByTeamId = new Map<string, RecentForm>();

  for (const t of teams) {
    const rows = rowsByTeam.get(t.id) ?? [];
    const leagueMatches = matchesByLeague.get(t.leagueId) ?? [];
    const form = calculateForm(leagueMatches, t.leagueId, t.name, data.params.formWindowMode ?? 'fecha');
    formByTeamId.set(t.id, form);
    const mode = data.params.statAverageMode ?? 'excel';
    statsByTeamId.set(t.id, calculateTeamStats(t, rows, form, mode));
    homeStatsByTeamId.set(t.id, calculateSplitStats(t, rows, 'home', mode));
    awayStatsByTeamId.set(t.id, calculateSplitStats(t, rows, 'away', mode));
  }

  /*
   * Histórico por equipo, con el MISMO cálculo que la temporada en curso: así el prior y el dato actual son
   * comparables cifra a cifra, y un cambio de `statAverageMode` los mueve a los dos igual.
   */
  const historyByTeamId: Derived['historyByTeamId'] = new Map();
  /** Medias de las temporadas anteriores de cada liga, para que las de la actual no arranquen de cero. */
  const historicalAverages = new Map<string, LeagueAverages>();
  if (conPrior && historicos.length > 0) {
    const previos = new Map<string, TeamMatch[]>();
    for (const m of historicos) {
      push(previos, m.homeTeamId, { match: m, isHome: true });
      push(previos, m.awayTeamId, { match: m, isHome: false });
    }
    const mode = data.params.statAverageMode ?? 'excel';
    /*
     * Los equipos salen de los propios partidos del histórico y no de la temporada en curso: si no, la media
     * de liga de 2025 se calcularía sin los tres clubes que bajaron, que es justo la parte baja de la tabla.
     */
    const equiposHistoricos = deriveTeams(data.leagues, historicos, []);
    const porLiga = new Map<string, { home: SplitStats; away: SplitStats }[]>();
    for (const t of equiposHistoricos) {
      const rows = previos.get(t.id);
      if (!rows?.length) continue;
      const home = calculateSplitStats(t, rows, 'home', mode);
      const away = calculateSplitStats(t, rows, 'away', mode);
      historyByTeamId.set(t.id, { home, away, matches: rows.length });
      push(porLiga, t.leagueId, { home, away });
    }
    for (const [leagueId, equipos] of porLiga) {
      historicalAverages.set(
        leagueId,
        calculateLeagueAverages(
          leagueId,
          equipos.map((e) => e.home),
          equipos.map((e) => e.away),
          // PPG del equipo en el histórico, de sus dos condiciones juntas.
          equipos.map((e) => {
            const pj = e.home.played + e.away.played;
            return pj === 0 ? null : (e.home.points + e.away.points) / pj;
          }),
          historicosPorLiga.get(leagueId) ?? [],
        ),
      );
    }
  }

  // --- SoS (segunda pasada) ------------------------------------------------
  attachStrengthOfSchedule([...statsByTeamId.values()], rowsByTeam);

  // PARTIDOS!AX/AY para la vista de detalle de partido.
  const ppgById = new Map([...statsByTeamId].map(([id, s]) => [id, s.ppg]));
  const opponentPpg = new Map<string, { home: number | null; away: number | null }>();
  for (const m of played) {
    opponentPpg.set(m.id, {
      home: ppgById.get(m.awayTeamId) ?? null,
      away: ppgById.get(m.homeTeamId) ?? null,
    });
  }

  // --- TABLA DE POSICIONES + medias de liga -------------------------------
  const standingsByLeague = new Map<string, StandingRow[]>();
  const averagesByLeague = new Map<string, LeagueAverages>();

  for (const [leagueId, leagueTeams] of teamsByLeague) {
    const stats = leagueTeams.map((t) => statsByTeamId.get(t.id)!);
    standingsByLeague.set(leagueId, calculateStandings(stats));
    const deLaLiga = matchesByLeague.get(leagueId) ?? [];
    const medias = calculateLeagueAverages(
      leagueId,
      leagueTeams.map((t) => homeStatsByTeamId.get(t.id)!),
      leagueTeams.map((t) => awayStatsByTeamId.get(t.id)!),
      stats.map((s) => s.ppg),
      deLaLiga,
    );
    averagesByLeague.set(
      leagueId,
      conPrior ? blendLeagueAverages(medias, historicalAverages.get(leagueId) ?? null, deLaLiga.length, data.params.kPrior) : medias,
    );
  }

  /*
   * Partidos con los que se miran los enfrentamientos directos: la temporada en curso y, con prior histórico,
   * las anteriores.
   *
   * Sin el histórico el ajuste H2H estaba prácticamente apagado: en un torneo de 19 jornadas la mayoría de las
   * parejas se han visto 0 o 1 vez, y `W_H2H` = 0,10 no tenía de dónde salir. Se prepara una vez por liga y no
   * por partido, que serían 91 copias de 719 partidos en la BetPlay.
   */
  const h2hByLeague = new Map<string, Match[]>();
  for (const [leagueId, ms] of matchesByLeague) {
    h2hByLeague.set(leagueId, conPrior ? [...ms, ...(historicosPorLiga.get(leagueId) ?? [])] : ms);
  }

  // --- PROYECCIONES --------------------------------------------------------
  const projections: MatchProjection[] = [];
  for (const f of fixturesDeLaTemporada) {
    if (f.status === 'Cancelado') continue;
    const homeSplit = homeStatsByTeamId.get(f.homeTeamId);
    const awaySplit = awayStatsByTeamId.get(f.awayTeamId);
    const averages = averagesByLeague.get(f.leagueId);
    if (!homeSplit || !awaySplit || !averages) continue;
    projections.push(
      calculateMatchProjection(f, {
        homeSplit,
        awaySplit,
        homeForm: formByTeamId.get(f.homeTeamId)!,
        awayForm: formByTeamId.get(f.awayTeamId)!,
        homeSos: statsByTeamId.get(f.homeTeamId)?.sos ?? null,
        awaySos: statsByTeamId.get(f.awayTeamId)?.sos ?? null,
        averages,
        leagueMatches: h2hByLeague.get(f.leagueId) ?? [],
        params: data.params,
        homeHistory: historyByTeamId.get(f.homeTeamId)?.home ?? null,
        awayHistory: historyByTeamId.get(f.awayTeamId)?.away ?? null,
        prediction: data.predictions?.get(f.id) ?? null,
      }),
    );
  }

  /*
   * Dispersión (φ = varianza / media) de córners y tarjetas, con el histórico incluido.
   *
   * Aquí sí entra el histórico entero, y no choca con que el prior por equipo de córners se descartara: lo que
   * se saca de estos partidos NO es el nivel de córners de nadie, es solo cuánto varían de un partido a otro
   * (`countDistribution` toma φ y la media la pone la proyección). La variabilidad es una propiedad de la
   * competición, no de la temporada.
   *
   * Lo que arregla: estos mercados exigen 20 partidos de liga con el dato (`MIN_LEAGUE_COUNT_SAMPLE`), así que
   * al empezar cada temporada no se podían evaluar. Con el histórico de la BetPlay hay 617 desde la jornada 1.
   *
   * El histórico entra SOLO como respaldo, cuando la temporada no llega a esos 20 partidos. Se probó mezclarlo
   * siempre y salía peor donde ya había datos: medido el 27/09/2026 sobre los 250 partidos que el libro ya
   * podía evaluar, la log loss del Over 9.5 córners subía 0,0019 ± 0,0007 (el φ de la temporada pasaba de 1,38
   * a 1,25, y probabilidades algo menos extremas es el lado seguro del error). Como respaldo no cuesta nada:
   * esos 250 se quedan igual y se pueden evaluar 37 más.
   */
  const dispersionByLeague: Derived['dispersionByLeague'] = new Map();
  const conDato = (v: number | null): v is number => v !== null;
  for (const [leagueId, ms] of matchesByLeague) {
    const conHistorico = conPrior ? [...ms, ...(historicosPorLiga.get(leagueId) ?? [])] : ms;
    /** La de la temporada si llega al mínimo; si no, la del histórico, que es la única que lo alcanza. */
    const respaldoDe = (valores: (xs: Match[]) => number[]) => {
      const suya = estimateDispersion(valores(ms));
      if (suya && suya.n >= MIN_LEAGUE_COUNT_SAMPLE) return suya;
      return estimateDispersion(valores(conHistorico)) ?? suya;
    };
    const respaldo = (pick: (m: Match) => number | null) => respaldoDe((xs) => xs.map(pick).filter(conDato));
    /*
     * Dos dispersiones por mercado: la del TOTAL del partido y la de UN equipo, que no son la misma.
     * Medido sobre los 26.921 partidos de la base: en corners, phi 1,19 en el total y 1,65 por equipo;
     * en tiros, 1,42 y 2,18. Usar la del total para el mercado de un equipo daria probabilidades
     * demasiado estrechas.
     */
    const porEquipo = (pick: (m: Match, t: 'home' | 'away') => number | null) =>
      respaldoDe((xs) => xs.flatMap((m) => [pick(m, 'home'), pick(m, 'away')]).filter(conDato));
    dispersionByLeague.set(leagueId, {
      ...Object.fromEntries(COUNT_MARKET_IDS.map((k) => [k, respaldo(COUNT_TOTAL[k])])),
      ...Object.fromEntries(COUNT_MARKET_IDS.map((k) => [teamDispersionKey(k), porEquipo(COUNT_TEAM[k])])),
    } as Partial<Record<CountDispersionKey, Dispersion | null>>);
  }

  const seasonProjections = calculateSeasonProjection(
    [...statsByTeamId.values()],
    fixturesDeLaTemporada,
    projections,
  );

  return {
    teams,
    teamsById,
    refByTeamId,
    statsByTeamId,
    homeStatsByTeamId,
    awayStatsByTeamId,
    formByTeamId,
    standingsByLeague,
    averagesByLeague,
    roundsByLeague: calculateLeagueRounds(deLaTemporada, fixturesDeLaTemporada),
    projections,
    projectionsByFixtureId: new Map(projections.map((p) => [p.fixtureId, p])),
    seasonProjections,
    opponentPpg,
    historyByTeamId,
    dispersionByLeague,
  };
}
