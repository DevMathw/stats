/**
 * Goles esperados. PROYECCIONES!F5 y G5. MODEL_MAPPING.md §12.
 *
 *   blend = (W_BASE·base + W_FORM5·(promGF5 ?? base) + W_FORM10·(promGF10 ?? base)
 *            + W_XG·(promXG ?? base)) / (W_BASE+W_FORM5+W_FORM10+W_XG)
 *
 *   λL = MAX(0.1, (blendL + h2h) · (1 + sosL))
 *   λV = MAX(0.1, (blendV - h2h) · (1 + sosV))
 */
import type {
  LeagueAverages,
  Match,
  ModelParams,
  ProjectionBreakdown,
  RecentForm,
  SplitStats,
} from '../../types';
import { hasResult } from '../calculations/matchDerived';
import { clamp } from '../probability/shrink';
import { expectedFromStrengths, type MetricHistory, type Prior } from './expectedValues';

export interface H2HResult {
  /** Ajuste en goles, ya acotado y escalado. Se SUMA al local y se RESTA al visitante. */
  adjustment: number;
  matches: number;
  /** Diferencia media de goles del equipo local en los enfrentamientos directos. */
  averageDiff: number;
}

/**
 * PROYECCIONES!F5, bloque H2H:
 *   difMedia = (GF_local − GC_local en los duelos directos) / nº duelos
 *   ajuste   = clamp(difMedia, −2, +2) · (W_H2H / 2)
 */
export function calculateH2HAdjustment(
  leagueMatches: Match[],
  homeTeamName: string,
  awayTeamName: string,
  wH2h: number,
): H2HResult {
  let diff = 0;
  let count = 0;
  for (const m of leagueMatches) {
    if (!hasResult(m)) continue;
    if (m.homeTeamName === homeTeamName && m.awayTeamName === awayTeamName) {
      diff += m.homeGoals! - m.awayGoals!;
      count++;
    } else if (m.homeTeamName === awayTeamName && m.awayTeamName === homeTeamName) {
      diff += m.awayGoals! - m.homeGoals!;
      count++;
    }
  }
  if (count === 0) return { adjustment: 0, matches: 0, averageDiff: 0 };
  const averageDiff = diff / count;
  return { adjustment: clamp(averageDiff, -2, 2) * (wH2h / 2), matches: count, averageDiff };
}

/**
 * PROYECCIONES!F5, bloque SoS (multiplicativo):
 *   ratio = SoS(equipo) / mediaLiga(PPG)   ; sin dato → 1
 *   ajuste = clamp(ratio − 1, −0.5, +0.5) · W_SOS
 */
export function calculateSosAdjustment(
  teamSos: number | null,
  leagueAvgPpg: number,
  wSos: number,
): number {
  if (teamSos === null || leagueAvgPpg === 0) return 0;
  return clamp(teamSos / leagueAvgPpg - 1, -0.5, 0.5) * wSos;
}

/** El valor de xG que entra en el modelo, según el modo elegido (DIFF-01). */
export function xgTermValue(split: SplitStats, mode: ModelParams['xgMissingMode']): number | null {
  if (split.xg.avgFor !== null) return split.xg.avgFor;
  // 'excel': el SUMIFS del libro devuelve 0 y 0/PJ = 0 es un número ⇒ el término vale 0.
  return mode === 'excel' && split.played > 0 ? 0 : null;
}

/**
 * Fuerza de xG (DIFF-12): xG a favor del equipo × xG en contra del rival relativo a la liga, contraídos como la fuerza
 * base de goles. `null` si falta el xG de alguno de los dos o la liga no tiene medias de xG: entonces se usa el término
 * del libro (`xgTermValue`).
 */
export function xgStrengthValue(
  attack: SplitStats,
  defense: SplitStats,
  leagueFor: number,
  leagueAgainst: number,
  kShrink: number,
  /** Temporadas anteriores de los mismos dos equipos, en el mismo lado del campo. */
  history?: { attack?: SplitStats | null; defense?: SplitStats | null; kPrior?: number },
): number | null {
  if (attack.xg.avgFor === null || defense.xg.avgAgainst === null || !(leagueFor > 0) || !(leagueAgainst > 0)) return null;
  return expectedFromStrengths(attack.xg.avgFor, attack.xg.sample, leagueFor, defense.xg.avgAgainst, defense.xg.sample, leagueAgainst, kShrink, {
    attack: history?.attack ? { value: history.attack.xg.avgFor, played: history.attack.xg.sample } : null,
    defense: history?.defense ? { value: history.defense.xg.avgAgainst, played: history.defense.xg.sample } : null,
    kPrior: history?.kPrior,
  });
}

export interface ExpectedGoalsInput {
  homeSplit: SplitStats;
  awaySplit: SplitStats;
  homeForm: RecentForm;
  awayForm: RecentForm;
  homeSos: number | null;
  awaySos: number | null;
  averages: LeagueAverages;
  leagueMatches: Match[];
  params: ModelParams;
  /**
   * Temporadas anteriores del local en casa y del visitante fuera, en la misma competición. Es el prior de
   * la contracción: sin ellas se contrae hacia la media de la liga, que es lo que hace el libro.
   */
  history?: MetricHistory;
}

export interface ExpectedGoalsResult {
  lambdaHome: number;
  lambdaAway: number;
  breakdown: ProjectionBreakdown;
}

function blend(
  base: number,
  form5: number | null,
  form10: number | null,
  xg: number | null,
  p: ModelParams,
): number {
  const weightSum = p.wBase + p.wForm5 + p.wForm10 + p.wXg;
  if (weightSum === 0) return base;
  return (
    (p.wBase * base +
      p.wForm5 * (form5 ?? base) +
      p.wForm10 * (form10 ?? base) +
      p.wXg * (xg ?? base)) /
    weightSum
  );
}

export function calculateExpectedGoals(input: ExpectedGoalsInput): ExpectedGoalsResult {
  const { homeSplit, awaySplit, homeForm, awayForm, averages, params: p } = input;

  // Histórico del propio equipo como punto de partida de la contracción. «liga» lo desactiva.
  const histLocal = p.priorMode === 'liga' ? null : (input.history?.home ?? null);
  const histVisita = p.priorMode === 'liga' ? null : (input.history?.away ?? null);
  const kPrior = p.kPrior;
  const golesAFavor = (x: SplitStats | null): Prior | null => (x ? { value: x.avgGoalsFor, played: x.played } : null);
  const golesEnContra = (x: SplitStats | null): Prior | null => (x ? { value: x.avgGoalsAgainst, played: x.played } : null);

  // Fuerza base: ataque del local en casa × defensa relativa del visitante fuera.
  const baseHome = expectedFromStrengths(
    homeSplit.avgGoalsFor,
    homeSplit.played,
    averages.homeGoalsFor,
    awaySplit.avgGoalsAgainst,
    awaySplit.played,
    averages.awayGoalsAgainst,
    p.kShrink,
    { attack: golesAFavor(histLocal), defense: golesEnContra(histVisita), kPrior },
  );
  const baseAway = expectedFromStrengths(
    awaySplit.avgGoalsFor,
    awaySplit.played,
    averages.awayGoalsFor,
    homeSplit.avgGoalsAgainst,
    homeSplit.played,
    averages.homeGoalsAgainst,
    p.kShrink,
    { attack: golesAFavor(histVisita), defense: golesEnContra(histLocal), kPrior },
  );

  // Por defecto, xG a favor × xG en contra del rival; solo el xG a favor si se elige el término del libro.
  const xgTerm = (
    attack: SplitStats,
    defense: SplitStats,
    leagueFor: number,
    leagueAgainst: number,
    histAtaque: SplitStats | null,
    histDefensa: SplitStats | null,
  ) =>
    (p.xgStrengthMode === 'excel'
      ? null
      : xgStrengthValue(attack, defense, leagueFor, leagueAgainst, p.kShrink, { attack: histAtaque, defense: histDefensa, kPrior })) ??
    xgTermValue(attack, p.xgMissingMode);
  const xgHome = xgTerm(homeSplit, awaySplit, averages.homeXgFor, averages.awayXgAgainst, histLocal, histVisita);
  const xgAway = xgTerm(awaySplit, homeSplit, averages.awayXgFor, averages.homeXgAgainst, histVisita, histLocal);

  const blendHome = blend(
    baseHome,
    homeForm.last5.avgGoalsFor,
    homeForm.last10.avgGoalsFor,
    xgHome,
    p,
  );
  const blendAway = blend(
    baseAway,
    awayForm.last5.avgGoalsFor,
    awayForm.last10.avgGoalsFor,
    xgAway,
    p,
  );

  const h2h = calculateH2HAdjustment(
    input.leagueMatches,
    homeSplit.teamName,
    awaySplit.teamName,
    p.wH2h,
  );
  const sosHome = calculateSosAdjustment(input.homeSos, averages.ppg, p.wSos);
  const sosAway = calculateSosAdjustment(input.awaySos, averages.ppg, p.wSos);

  return {
    lambdaHome: Math.max(0.1, (blendHome + h2h.adjustment) * (1 + sosHome)),
    lambdaAway: Math.max(0.1, (blendAway - h2h.adjustment) * (1 + sosAway)),
    breakdown: {
      baseHome,
      baseAway,
      form5Home: homeForm.last5.avgGoalsFor,
      form5Away: awayForm.last5.avgGoalsFor,
      form10Home: homeForm.last10.avgGoalsFor,
      form10Away: awayForm.last10.avgGoalsFor,
      xgHome,
      xgAway,
      h2hAdjustment: h2h.adjustment,
      h2hMatches: h2h.matches,
      sosAdjustmentHome: sosHome,
      sosAdjustmentAway: sosAway,
      xgFellBackHome: xgHome === null,
      xgFellBackAway: xgAway === null,
      priorMatchesHome: histLocal?.played ?? 0,
      priorMatchesAway: histVisita?.played ?? 0,
    },
  };
}
