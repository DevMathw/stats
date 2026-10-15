/**
 * Agregador común de las hojas EQUIPOS / ESTADISTICAS HOME / ESTADISTICAS AWAY.
 *
 * Replica la pareja `SUMIFS` + `IFERROR(suma/PJ,"N/A")` del Excel:
 *  - `SUMIFS` ignora las celdas vacías (equivale a sumar 0), así que la suma nunca es null.
 *  - El promedio divide entre **PJ**, no entre el número de partidos con el dato.
 *  - Con PJ = 0 el Excel devuelve "N/A"; aquí `null`.
 *
 * Extra sobre el Excel: se guarda `sample` (partidos con el dato realmente reportado) para
 * poder mostrar "N/D" en lugar de un 0 engañoso. Ver MODEL_MAPPING.md §4 y DIFF-01.
 */
import type { Match, StatAggregate } from '../../types';

export interface TeamMatch {
  match: Match;
  isHome: boolean;
}

/** Devuelve [aFavor, enContra] del equipo en ese partido, o null si no hay dato. */
export type StatPicker = (m: Match, isHome: boolean) => [number | null, number | null];

export type StatAverageMode = 'muestra' | 'excel';

/**
 * @param mode `excel` divide entre PJ (DIFF-07); `muestra` divide cada lado entre los partidos en
 *             los que ese lado está reportado, así un partido sin corners no cuenta como 0.
 */
export function aggregateStat(
  rows: TeamMatch[],
  pick: StatPicker,
  played: number,
  mode: StatAverageMode = 'excel',
): StatAggregate {
  let forSum = 0;
  let againstSum = 0;
  let sample = 0;
  let sampleAgainst = 0;

  for (const { match, isHome } of rows) {
    const [f, a] = pick(match, isHome);
    if (f !== null) {
      forSum += f;
      sample++;
    }
    if (a !== null) {
      againstSum += a;
      sampleAgainst++;
    }
  }

  if (mode === 'muestra') {
    const avgFor = sample > 0 ? forSum / sample : null;
    const avgAgainst = sampleAgainst > 0 ? againstSum / sampleAgainst : null;
    return {
      for: forSum,
      against: againstSum,
      total: forSum + againstSum,
      avgFor,
      avgAgainst,
      avgTotal: avgFor === null || avgAgainst === null ? null : avgFor + avgAgainst,
      sample,
    };
  }

  const avg = (v: number) => (played > 0 && sample > 0 ? v / played : null);

  return {
    for: forSum,
    against: againstSum,
    total: forSum + againstSum,
    avgFor: avg(forSum),
    avgAgainst: avg(againstSum),
    avgTotal: avg(forSum + againstSum),
    sample,
  };
}

/** Picker "favor/contra" a partir de la pareja de columnas local/visitante. */
export function sidePicker(
  home: (m: Match) => number | null,
  away: (m: Match) => number | null,
): StatPicker {
  return (m, isHome) => (isHome ? [home(m), away(m)] : [away(m), home(m)]);
}

export const cornersPicker = sidePicker(
  (m) => m.cornersHome,
  (m) => m.cornersAway,
);

/**
 * "Tarjetas" en el Excel = amarillas (columnas Z / AA). Las rojas viven en AC/AD y no entran
 * en las columnas `Tarjetas Favor/Contra` de EQUIPOS.
 */
export const cardsPicker = sidePicker(
  (m) => m.yellowCardsHome,
  (m) => m.yellowCardsAway,
);

export const shotsPicker = sidePicker(
  (m) => m.shotsHome,
  (m) => m.shotsAway,
);

export const sotPicker = sidePicker(
  (m) => m.shotsOnTargetHome,
  (m) => m.shotsOnTargetAway,
);

export const xgPicker = sidePicker(
  (m) => m.xGHome,
  (m) => m.xGAway,
);

export const goalsPicker = sidePicker(
  (m) => m.homeGoals,
  (m) => m.awayGoals,
);

/** `IFERROR(x/y,"N/A")` */
export function safeDiv(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}
