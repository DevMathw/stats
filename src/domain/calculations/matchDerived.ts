/**
 * Columnas calculadas de PARTIDOS (J, M, N, Q, T, V, Y, AB, AE, AH, AM–AU).
 * MODEL_MAPPING.md §3.
 *
 * Todas devuelven `null` cuando falta alguno de los operandos, replicando el `""`
 * del Excel. Nunca 0.
 */
import type { EmptyStat, Match } from '../../types';
import { MATCH_DATA, isMissing } from '../models/matchDataRules';

/** `=IF(OR(a="",b=""),"",a+b)` */
export function sumPair(a: number | null, b: number | null): number | null {
  return a === null || b === null ? null : a + b;
}

export function totalGoals(m: Match): number | null {
  return sumPair(m.homeGoals, m.awayGoals);
}

export function firstHalfTotal(m: Match): number | null {
  return sumPair(m.homeFirstHalfGoals, m.awayFirstHalfGoals);
}

export function secondHalfTotal(m: Match): number | null {
  const ft = totalGoals(m);
  const ht = firstHalfTotal(m);
  return ft === null || ht === null ? null : ft - ht;
}

export const shotsTotal = (m: Match) => sumPair(m.shotsHome, m.shotsAway);
export const shotsOnTargetTotal = (m: Match) => sumPair(m.shotsOnTargetHome, m.shotsOnTargetAway);
export const cornersTotal = (m: Match) => sumPair(m.cornersHome, m.cornersAway);
export const yellowCardsTotal = (m: Match) => sumPair(m.yellowCardsHome, m.yellowCardsAway);
export const redCardsTotal = (m: Match) => sumPair(m.redCardsHome, m.redCardsAway);
export const foulsTotal = (m: Match) => sumPair(m.foulsHome, m.foulsAway);

/** `=IF(U="","",1-U)` */
export function awayPossession(m: Match): number | null {
  return m.possessionHome === null ? null : 1 - m.possessionHome;
}

/** ¿Falta ese dato del partido (con `any`, alguno de los 10)? Basta con que falte un lado. */
export function hasEmptyStat(m: Match, col: EmptyStat): boolean {
  return MATCH_DATA.some((d) => (col === 'any' || d.id === col) && isMissing(m, d));
}

export function isBtts(m: Match): boolean | null {
  if (m.homeGoals === null || m.awayGoals === null) return null;
  return m.homeGoals > 0 && m.awayGoals > 0;
}

/** `=IF(J>line,"Si","No")` con line ∈ {1.5, 2.5, 3.5}. */
export function isOver(m: Match, line: number): boolean | null {
  const t = totalGoals(m);
  return t === null ? null : t > line;
}

export function homeCleanSheet(m: Match): boolean | null {
  return m.awayGoals === null ? null : m.awayGoals === 0;
}

export function awayCleanSheet(m: Match): boolean | null {
  return m.homeGoals === null ? null : m.homeGoals === 0;
}

export type ResultCode = '1' | 'X' | '2';

function outcome(home: number | null, away: number | null): ResultCode | null {
  if (home === null || away === null) return null;
  if (home > away) return '1';
  if (home < away) return '2';
  return 'X';
}

export function resultHT(m: Match): ResultCode | null {
  return outcome(m.homeFirstHalfGoals, m.awayFirstHalfGoals);
}

export function resultFT(m: Match): ResultCode | null {
  return outcome(m.homeGoals, m.awayGoals);
}

export function scoreline(m: Match): string | null {
  if (m.homeGoals === null || m.awayGoals === null) return null;
  return `${m.homeGoals}-${m.awayGoals}`;
}

/** Un partido cuenta para las estadísticas solo si tiene marcador. Ver DIFF-02. */
export function hasResult(m: Match): boolean {
  return m.homeGoals !== null && m.awayGoals !== null;
}

/**
 * Cuenta en el análisis (estadísticas, forma, tabla, H2H, SoS, proyecciones y validación del modelo): tiene marcador y
 * no es un resultado adjudicado. Liquidar picks y el avance de jornadas siguen con `hasResult`. Ver DIFF-09.
 */
export function countsForAnalysis(m: Match): boolean {
  return hasResult(m) && !m.awarded;
}

/** Puntos obtenidos por un equipo en un partido concreto. */
export function pointsFor(m: Match, isHome: boolean): number | null {
  const r = resultFT(m);
  if (r === null) return null;
  if (r === 'X') return 1;
  return (r === '1') === isHome ? 3 : 0;
}
