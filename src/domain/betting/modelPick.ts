/**
 * Pick del modelo de un partido, sin cuotas. PICKS_METHODOLOGY.md §2, «Pick del modelo».
 *
 * La plataforma no recibe las cuotas de ninguna casa, así que la referencia es la frecuencia de cada mercado en los
 * partidos jugados de la liga: el pick es el mercado favorito en el que el modelo ve este partido más por encima de
 * lo habitual en su competición, con esa ventaja rebajada por la confianza. Queda descartado, con su motivo, el que:
 *   1. no tenga probabilidad, tenga calidad de datos baja o confianza menor que MIN_CONFIDENCE;
 *   2. tenga la probabilidad fuera de PICK_PROBABILITY o por debajo de la mínima del perfil;
 *   3. haya dado skill negativo en el último backtest;
 *   4. no tenga en la liga MIN_LEAGUE_COUNT_SAMPLE partidos con el dato para medir su frecuencia;
 *   5. no supere esa frecuencia en al menos el edge mínimo del perfil;
 *   6. tenga riesgo alto a su cuota justa.
 * Del resto gana la mayor ventaja ajustada; empate → menor riesgo → mayor probabilidad. Sin ninguno, no hay pick.
 */
import type { Match } from '../../types';
import type { RiskAssessment, RiskSettings, Selection } from '../../types/betting';
import { countsForAnalysis } from '../calculations/matchDerived';
import { marketContextOf, type DataContext, type ModelValidation } from './evaluation';
import { QUALITY_LABEL, RISK_LABEL } from './labels';
import { COUNT_MARKETS, estimateMarket, MIN_LEAGUE_COUNT_SAMPLE, outcomeOnScore, selectionKey, selectionLabel, settleSelection, type MarketEstimate } from './markets';
import { minAcceptableOdds } from './odds';
import { assessPickRisk, negativeSkill } from './risk';

/**
 * Confianza mínima (0–10). Con CONFIDENCE_K = 5, unos 15 partidos de cada equipo en su condición con el dato completo:
 * `10 · muestra/(muestra + 5)`, así que un 8 pediría 20 de cada uno, 40 jornadas, más de lo que dura una liga.
 */
export const MIN_CONFIDENCE = 7.5;

/**
 * Probabilidad de un pick: por encima del 80 % y con cuota justa de al menos 1.18. Por encima del 85 % la cuota que
 * paga una casa, con su margen, casi nunca compensa el riesgo de fallar, así que el margen útil es 1.18–1.25.
 */
export const PICK_PROBABILITY = { min: 0.8, max: 0.85 } as const;

const LADOS = ['over', 'under'] as const;
const EQUIPOS = ['home', 'away'] as const;

/**
 * Mercados que compiten. Sin líneas enteras (pueden devolver el stake) ni hándicaps: los ±0.5 son el 1X2 y la doble
 * oportunidad con otro nombre, y los demás añaden un supuesto sin validar sobre el tamaño del margen (§2).
 *
 * Qué NO compite, medido el 21/10/2026 con `runBacktest` sobre 20.906 partidos y 663.610 predicciones, mirando la
 * calibración en la zona donde se hace un pick (probabilidad ≥ 75 %, las dos colas):
 *
 *   - **Corners, totales y por equipo.** El modelo se pasa 9,88 pp (dice 78,8 %, pasa 68,9 %) y en Over 9.5 llega a
 *     15,68 pp. Ninguna casa se equivoca tanto como para cubrir ese lastre. Y se los llevaba el 21,3 % de los picks
 *     (15,0 % por equipo + 6,3 % totales), o sea el mercado peor calibrado era el más jugado.
 *   - **Las líneas de goles que no son 1.5.** Over 1.5 está calibrado (−0,65 pp); Over 2.5 se pasa 6,31 pp, Over 3.5
 *     4,59 pp. Las de 0.5 y 4.5 no llegan a 300 casos en esa zona, así que no hay con qué defenderlas.
 *   - **Tiros y tiros a puerta TOTALES**, que no es lo mismo que por equipo. Los totales se pasan 2,65 pp y 4,10 pp;
 *     los de un solo equipo se quedan CORTOS (`Local: Over 12.5 tiros` dice 79,6 % y pasa 87,6 %, +8,04 pp), que es
 *     ventaja a favor. Sumar los dos equipos suma también sus dos errores, y ahí se pierde la señal.
 *   - **Goles por equipo** (`equipo`). Se pasa 3,17 pp sobre 8.808 casos, y `Local: Over 1.5 goles` llega a 5,59 pp.
 *     Es el mismo patrón que en los conteos, pero aquí no se corrige con la contracción: los goles esperados vienen
 *     de `expectedGoals`, que ya lleva su propio prior histórico, y nadie ha medido un L para ellos.
 *   - **Ambos marcan** (`btts`). Se pasa 8,93 pp, el peor de lo que quedaba, y su skill contra la frecuencia de la
 *     liga es negativo (−0,0023). Son solo 81 casos en la zona de pick, muy pocos para estar seguro del tamaño, pero
 *     no hay nada que lo defienda: el signo es el mismo por las dos medidas.
 *
 * Los mercados siguen existiendo en `COUNT_MARKETS` y en el evaluador: lo que se quita es que el modelo los elija solo.
 */
export const PICK_MARKETS: Selection[] = [
  { market: 'resultado', outcome: 'home' },
  { market: 'resultado', outcome: 'draw' },
  { market: 'resultado', outcome: 'away' },
  { market: 'doble', outcome: '1X' },
  { market: 'doble', outcome: 'X2' },
  { market: 'doble', outcome: '12' },
  ...[1.5].flatMap((line) => LADOS.map((side): Selection => ({ market: 'goles', side, line }))),
  ...([1, 2] as const).flatMap((half) => [0.5, 1.5].flatMap((line) => LADOS.map((side): Selection => ({ market: 'mitad', half, side, line })))),
  ...[2.5, 3.5, 4.5, 5.5].flatMap((line) => LADOS.map((side): Selection => ({ market: 'tarjetas', side, line }))),
  // Por equipo: las lineas de `COUNT_MARKETS[stat].teamLines`, alrededor de la mediana de cada variable.
  ...(['tarjetas', 'tiros', 'sot'] as const).flatMap((stat) =>
    EQUIPOS.flatMap((team) =>
      COUNT_MARKETS[stat].teamLines.flatMap((line) => LADOS.map((side): Selection => ({ market: 'conteoEquipo', stat, team, side, line }))),
    ),
  ),
];

/** Frecuencia de cada mercado en una liga: `selectionKey` → acertados / partidos con el dato. */
export type LeagueRates = Map<string, { rate: number; n: number }>;

/**
 * Mercados que se resuelven SOLO con el marcador. Todo lo demás (conteos del partido, conteos por equipo y
 * los goles por parte) necesita un dato que la fuente puede no haber publicado, y por tanto se liquida con
 * `settleSelection`, que sabe decir «sin datos».
 *
 * Está escrito al revés (los del marcador, no los otros) a propósito. La lista anterior enumeraba los que
 * necesitan dato —corners, tarjetas y mitad— y al añadir tiros, tiros a puerta y los mercados por equipo
 * se quedó corta sin que nada fallara: esos tres caían en la rama del marcador, que mide «over 6.5 tiros a
 * puerta» contra los GOLES. En MLS daba 0,0 % sobre los 1.990 partidos (contando los que no tenían el dato
 * como fallados), y como la ventaja es probabilidad − frecuencia, esos mercados salían con +85 pp y ganaban
 * el pick. Así, un mercado nuevo que no se añada aquí va a `settleSelection`, que es el lado seguro.
 */
const POR_MARCADOR = new Set<Selection['market']>(['resultado', 'doble', 'goles', 'btts', 'equipo', 'cero']);

/** Frecuencia de los PICK_MARKETS en los partidos de una liga que cuentan para el análisis (sin adjudicados). */
export function leagueRates(matches: Match[]): LeagueRates {
  const jugados = matches.filter(countsForAnalysis);
  const out: LeagueRates = new Map();
  for (const sel of PICK_MARKETS) {
    let aciertos = 0;
    let n = 0;
    for (const m of jugados) {
      let gana: boolean;
      if (!POR_MARCADOR.has(sel.market)) {
        // Misma regla que la liquidación: sin el dato, el partido no cuenta (ni como acierto ni como fallo).
        const r = settleSelection(sel, m);
        if (r.status === 'sin-datos') continue;
        gana = r.status === 'ganado';
      } else {
        gana = outcomeOnScore(sel, m.homeGoals!, m.awayGoals!) === 'gana';
      }
      n++;
      if (gana) aciertos++;
    }
    out.set(selectionKey(sel), { rate: n ? aciertos / n : 0, n });
  }
  return out;
}

export type ReasonCategory = 'datos' | 'probabilidad' | 'backtest' | 'liga' | 'ventaja' | 'riesgo';

const pct = (x: number) => `${(x * 100).toFixed(1)} %`;
const pp = (x: number) => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1)} pp`;
const PROB = `${PICK_PROBABILITY.min * 100}–${PICK_PROBABILITY.max * 100} %`;

export const REASON_LABEL: Record<ReasonCategory, string> = {
  datos: 'datos insuficientes o poca confianza',
  probabilidad: `probabilidad fuera del ${PROB}`,
  backtest: 'skill negativo en el backtest',
  liga: `menos de ${MIN_LEAGUE_COUNT_SAMPLE} partidos de la liga con el dato`,
  ventaja: 'sin ventaja suficiente sobre la frecuencia de la liga',
  riesgo: 'riesgo alto',
};

export interface PickCandidate {
  selection: Selection;
  key: string;
  /** Con los nombres de los equipos. */
  label: string;
  estimate: MarketEstimate;
  /** Frecuencia del mercado en la liga y partidos con el dato. */
  league: { rate: number; n: number } | null;
  /** Probabilidad del modelo − frecuencia en la liga. `null` sin probabilidad o sin muestra de liga. */
  lift: number | null;
  /** lift · confianza / 10. */
  score: number | null;
  /** Riesgo a la cuota justa, con la ventaja sobre la liga como edge. */
  risk: RiskAssessment | null;
  /** Cuota a partir de la cual tendría el edge mínimo del perfil. */
  minOdds: number | null;
  /** Por qué no es el pick; `null` si cumple todos los criterios. */
  reason: { category: ReasonCategory; text: string } | null;
}

export interface ModelPick {
  best: PickCandidate | null;
  /** Por qué se eligió, o por qué no hay pick. */
  summary: string[];
  /** Todos los mercados: primero los que cumplen, por ventaja ajustada; después los descartados. */
  candidates: PickCandidate[];
}

type Ajustes = Pick<RiskSettings, 'minProbability' | 'minEdge' | 'minSample'>;

function motivo(c: Omit<PickCandidate, 'reason'>, s: Ajustes, validation?: ModelValidation | null): PickCandidate['reason'] {
  const e = c.estimate;
  const p = e.probability;
  if (p === null) return { category: 'datos', text: e.reason ?? 'Datos insuficientes.' };
  if (e.dataQuality === 'baja') return { category: 'datos', text: 'Calidad de datos baja.' };
  if (e.confidence < MIN_CONFIDENCE) return { category: 'datos', text: `Confianza ${e.confidence.toFixed(1)}/10, por debajo del mínimo de ${MIN_CONFIDENCE}.` };
  const minima = Math.max(PICK_PROBABILITY.min, s.minProbability);
  if (p < minima || p > PICK_PROBABILITY.max) {
    return { category: 'probabilidad', text: `Probabilidad ${pct(p)}, fuera del ${minima * 100}–${PICK_PROBABILITY.max * 100} %.` };
  }
  const v = validation?.[selectionLabel(c.selection)];
  if (v && negativeSkill(v)) return { category: 'backtest', text: `En el último backtest el modelo no mejoró a la frecuencia base en este mercado (skill ${pct(v.skill!)}).` };
  if (c.lift === null) {
    return { category: 'liga', text: `La liga tiene ${c.league?.n ?? 0} partidos con el dato: hacen falta ${MIN_LEAGUE_COUNT_SAMPLE} para medir su frecuencia.` };
  }
  if (c.lift < s.minEdge) {
    return { category: 'ventaja', text: `${pct(p)} frente a ${pct(c.league!.rate)} en la liga: ${pp(c.lift)}, por debajo del mínimo de ${pp(s.minEdge)}.` };
  }
  if (c.risk?.level === 'alto') return { category: 'riesgo', text: `Riesgo alto (${c.risk.score}/100).` };
  return null;
}

const orden = (a: PickCandidate, b: PickCandidate) =>
  (a.reason ? 1 : 0) - (b.reason ? 1 : 0) ||
  (b.score ?? -1) - (a.score ?? -1) ||
  (a.risk?.score ?? 100) - (b.risk?.score ?? 100) ||
  (b.estimate.probability ?? 0) - (a.estimate.probability ?? 0) ||
  a.key.localeCompare(b.key);

export function selectModelPick(input: { data: DataContext; rates: LeagueRates; settings: Ajustes; validation?: ModelValidation | null }): ModelPick {
  const { data, rates, settings: s, validation } = input;
  const f = data.fixture;
  const ctx = marketContextOf(data, s.minSample);

  const candidates = PICK_MARKETS.map((selection): PickCandidate => {
    const key = selectionKey(selection);
    const estimate = estimateMarket(selection, ctx);
    const p = estimate.probability;
    const league = rates.get(key) ?? null;
    const lift = p !== null && league && league.n >= MIN_LEAGUE_COUNT_SAMPLE ? p - league.rate : null;
    const risk =
      p !== null && lift !== null && p > 0 && p < 1
        ? assessPickRisk({
            probability: p,
            odds: 1 / p,
            edge: lift,
            family: selection.market,
            evidence: estimate.evidence,
            coverage: estimate.coverage,
            dataQuality: estimate.dataQuality,
            correlation: 'ninguna',
            validation: validation?.[selectionLabel(selection)],
          })
        : null;
    const sinMotivo = {
      selection,
      key,
      label: selectionLabel(selection, f.homeTeamName, f.awayTeamName),
      estimate,
      league,
      lift,
      score: lift === null ? null : lift * (estimate.confidence / 10),
      risk,
      minOdds: p === null ? null : minAcceptableOdds(p, s.minEdge),
    };
    return { ...sinMotivo, reason: motivo(sinMotivo, s, validation) };
  }).sort(orden);

  const validos = candidates.filter((c) => !c.reason);
  const best = validos[0] ?? null;

  if (!best) {
    const porMotivo = new Map<ReasonCategory, number>();
    for (const c of candidates) if (c.reason) porMotivo.set(c.reason.category, (porMotivo.get(c.reason.category) ?? 0) + 1);
    return {
      best,
      candidates,
      summary: [
        `Sin selección recomendada: ninguno de los ${candidates.length} mercados cumple todos los criterios.`,
        `Descartados por ${[...porMotivo].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${REASON_LABEL[k]} (${n})`).join(', ')}.`,
      ],
    };
  }

  const e = best.estimate;
  const p = e.probability!;
  const summary = [
    `${best.label}: el modelo le da ${pct(p)} y en la liga se ha dado en el ${pct(best.league!.rate)} de ${best.league!.n} partidos (${pp(best.lift!)}). ` +
      (validos.length === 1
        ? `Es el único de los ${candidates.length} mercados que cumple todos los criterios.`
        : `Es la mayor ventaja ajustada por confianza de los ${validos.length} mercados que cumplen todos los criterios (de ${candidates.length}).`),
    `Confianza ${e.confidence.toFixed(1)}/10 · datos de calidad ${QUALITY_LABEL[e.dataQuality].toLowerCase()} · riesgo ${RISK_LABEL[best.risk!.level].toLowerCase()} (${best.risk!.score}/100, a la cuota justa).`,
    `Cuota justa ${(1 / p).toFixed(2)}${best.minOdds ? `: tiene valor si te pagan ${best.minOdds.toFixed(2)} o más` : ''}. Sin la cuota de tu casa no se puede asegurar el valor.`,
  ];
  const segundo = validos[1];
  if (segundo) summary.push(`Siguiente: ${segundo.label} (${pct(segundo.estimate.probability!)}, ${pp(segundo.lift!)} sobre la liga).`);
  return { best, summary, candidates };
}
