/**
 * Una fila completa de PROYECCIONES. MODEL_MAPPING.md §12–14.
 */
import type {
  Fixture,
  LeagueAverages,
  Match,
  MatchProjection,
  ModelParams,
  RecentForm,
  SplitStats,
} from '../../types';
import {
  calculate1X2Probabilities,
  poisson1X2Probabilities,
  resultPick,
} from '../probability/matchProbabilities';
import {
  calculateBTTSProbability,
  calculateCleanSheetProbability,
  calculateOverProbability,
  mostLikelyScoreline,
} from '../probability/poisson';
import { calculateExpectedGoals } from './expectedGoals';
import type { EnginePrediction } from '../prediction/engine';
import { normalize1X2 } from '../prediction/types';

/**
 * Cuánto pesa el modelo del libro en la fuente `mixto`. Medido el 20/09/2026 sobre 1.628 partidos: con
 * 0,7 la log loss baja a 1,0416 (libro solo 1,0434, modelos solos 1,0486) y el acierto sube al 47,6 %.
 * La diferencia entre 0,5 y 0,7 es ruido; se elige la mejor de las tres probadas.
 */
export const PESO_LIBRO = 0.7;
import {
  calculateExpectedCards,
  calculateExpectedCorners,
  calculateExpectedShots,
  calculateExpectedShotsOnTarget,
} from './expectedValues';

export interface ProjectionContext {
  homeSplit: SplitStats;
  awaySplit: SplitStats;
  homeForm: RecentForm;
  awayForm: RecentForm;
  homeSos: number | null;
  awaySos: number | null;
  averages: LeagueAverages;
  /** Partidos de la competición con los que se busca el H2H. Con prior histórico incluyen las temporadas anteriores. */
  leagueMatches: Match[];
  params: ModelParams;
  /**
   * Lo que estos dos equipos hicieron en las temporadas anteriores de la competición, el local en casa y el
   * visitante fuera. Es el prior de la contracción bayesiana de los **goles y el xG**, y con ellos del 1X2,
   * el Over, el BTTS y el marcador más probable. Sin histórico, la contracción va a la media de la liga
   * como siempre, así que una competición sin temporadas cargadas da exactamente los mismos números.
   */
  homeHistory?: SplitStats | null;
  awayHistory?: SplitStats | null;
  /**
   * Predicción del motor de los siete modelos para ESTE partido, si la hay. Solo se usa cuando
   * `params.projectionSource === 'ensemble'`. Ver PREDICTION_ENGINE.md.
   */
  prediction?: EnginePrediction | null;
}

export function calculateMatchProjection(
  fixture: Fixture,
  ctx: ProjectionContext,
): MatchProjection {
  const historico = { home: ctx.homeHistory ?? null, away: ctx.awayHistory ?? null };
  const libro = calculateExpectedGoals({
    homeSplit: ctx.homeSplit,
    awaySplit: ctx.awaySplit,
    homeForm: ctx.homeForm,
    awayForm: ctx.awayForm,
    homeSos: ctx.homeSos,
    awaySos: ctx.awaySos,
    averages: ctx.averages,
    leagueMatches: ctx.leagueMatches,
    params: ctx.params,
    history: historico,
  });
  const breakdown = libro.breakdown;

  /**
   * Los modelos entran en lo que saben: los goles esperados y el 1X2. Corners, tarjetas, tiros y el
   * reparto por partes siguen saliendo del libro, que es quien los modela. Un partido sin predicción
   * (equipo nuevo, competición sin datos) se queda con el libro entero, y lo dice en `source`.
   *
   * `mixto` pesa 70 % libro y 30 % modelos: es lo que mejor salió en la comparación del 20/09/2026
   * sobre 1.628 partidos, mejor que cualquiera de los dos por separado. Ver PREDICTION_ENGINE.md §7.
   */
  const fuente = ctx.prediction ? ctx.params.projectionSource : 'libro';
  const pesoLibro = fuente === 'mixto' ? PESO_LIBRO : fuente === 'ensemble' ? 0 : 1;
  const golesModelos = fuente === 'libro' ? null : (ctx.prediction!.expectedGoals ?? null);
  const mezcla = (a: number, b: number) => pesoLibro * a + (1 - pesoLibro) * b;
  const lambdaHome = golesModelos ? mezcla(libro.lambdaHome, golesModelos.home) : libro.lambdaHome;
  const lambdaAway = golesModelos ? mezcla(libro.lambdaAway, golesModelos.away) : libro.lambdaAway;

  const lambdaTotal = lambdaHome + lambdaAway;
  // El prior histórico no entra en estos cuatro: ver `expectedValues.ts`, `calculateExpectedMetric`.
  const corners = calculateExpectedCorners(ctx.homeSplit, ctx.awaySplit, ctx.averages, ctx.params);
  const cards = calculateExpectedCards(ctx.homeSplit, ctx.awaySplit, ctx.averages, ctx.params);
  const shots = calculateExpectedShots(ctx.homeSplit, ctx.awaySplit, ctx.averages, ctx.params);
  const sot = calculateExpectedShotsOnTarget(ctx.homeSplit, ctx.awaySplit, ctx.averages, ctx.params);

  // 1X2 del libro: la matriz Poisson, o la logística si se elige (DIFF-11). Después entra la mezcla.
  const delLibro =
    ctx.params.oneXTwoMode === 'excel'
      ? calculate1X2Probabilities(libro.lambdaHome, libro.lambdaAway, ctx.averages.drawRate, ctx.params)
      : poisson1X2Probabilities(libro.lambdaHome, libro.lambdaAway);
  const probs1x2 =
    fuente === 'libro'
      ? delLibro
      : normalize1X2(
          mezcla(delLibro.home, ctx.prediction!.probs1x2.home),
          mezcla(delLibro.draw, ctx.prediction!.probs1x2.draw),
          mezcla(delLibro.away, ctx.prediction!.probs1x2.away),
        );
  const pick = resultPick(probs1x2);

  // Por partes: la λ total repartida con la proporción de goles de la 1.ª parte de la liga (DIFF-10).
  const share = ctx.averages.firstHalfShare ?? null;
  const lambdaFirst = share === null ? null : lambdaTotal * share;
  const lambdaSecond = share === null ? null : lambdaTotal * (1 - share);
  const over = (lambda: number | null, line: number) => (lambda === null ? null : calculateOverProbability(lambda, line));

  return {
    fixtureId: fixture.id,
    leagueId: fixture.leagueId,
    date: fixture.date,
    kickoffTime: fixture.kickoffTime ?? null,
    kickoffUtc: fixture.kickoffUtc ?? null,
    phase: fixture.phase ?? null,
    round: fixture.round,
    homeTeamId: fixture.homeTeamId,
    awayTeamId: fixture.awayTeamId,
    homeTeamName: fixture.homeTeamName,
    awayTeamName: fixture.awayTeamName,

    expectedGoalsHome: lambdaHome,
    expectedGoalsAway: lambdaAway,
    expectedGoalsTotal: lambdaTotal,

    expectedCornersHome: corners.home,
    expectedCornersAway: corners.away,
    expectedCornersTotal: corners.total,

    expectedCardsHome: cards.home,
    expectedCardsAway: cards.away,
    expectedCardsTotal: cards.total,

    expectedShotsHome: shots.home,
    expectedShotsAway: shots.away,
    expectedShotsTotal: shots.total,

    expectedSotHome: sot.home,
    expectedSotAway: sot.away,
    expectedSotTotal: sot.total,

    probOver15: calculateOverProbability(lambdaTotal, 1.5),
    probOver25: calculateOverProbability(lambdaTotal, 2.5),
    probOver35: calculateOverProbability(lambdaTotal, 3.5),
    expectedGoalsFirstHalf: lambdaFirst,
    expectedGoalsSecondHalf: lambdaSecond,
    probOver05FirstHalf: over(lambdaFirst, 0.5),
    probOver15FirstHalf: over(lambdaFirst, 1.5),
    probOver05SecondHalf: over(lambdaSecond, 0.5),
    probOver15SecondHalf: over(lambdaSecond, 1.5),
    probBtts: calculateBTTSProbability(lambdaHome, lambdaAway),
    probCleanSheetHome: calculateCleanSheetProbability(lambdaAway),
    probCleanSheetAway: calculateCleanSheetProbability(lambdaHome),
    probs1x2,

    resultPick: pick,
    mostLikelyScoreline: mostLikelyScoreline(lambdaHome, lambdaAway, pick),

    source: fuente,
    modelsUsed: fuente === 'libro' ? null : ctx.prediction!.used,
    modelConfidence: fuente === 'libro' ? null : ctx.prediction!.confidence,

    breakdown,
  };
}
