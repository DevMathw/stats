/**
 * Evaluación completa de un pick o de un ticket: probabilidad → cuota → correlación → Kelly con
 * límites → riesgo → explicación. Es lo que muestra la interfaz y lo que se vuelve a calcular al
 * registrar, así la interfaz no puede registrar algo que las reglas no permiten.
 */
import type { Fixture, MatchProjection, ModelParams, SplitStats } from '../../types';
import type {
  CorrelationLevel,
  DataQuality,
  EventRef,
  MarketFamily,
  Profile,
  RiskAssessment,
  Selection,
} from '../../types/betting';
import type { Dispersion } from '../probability/negativeBinomial';
import { formatAmount } from './coins';
import { CORRELATION_LABEL, RISK_LABEL } from './labels';
import { recommendStake, limitText, type Exposure, type StakeRecommendation } from './kelly';
import {
  canPush,
  correlationBetween,
  COUNT_MARKETS,
  estimateMarket,
  HALF_LABEL,
  isCountMarket,
  maxCorrelation,
  selectionLabel,
  type CountMarket,
  type MarketContext,
  type MarketEstimate,
} from './markets';
import { assessOdds, roundMoney, validateOdds, type OddsAssessment } from './odds';
import { assessPickRisk, assessTicketRisk } from './risk';
import { combinedOdds, jointProbability, type JointResult } from './tickets';
import { availableBalance, bankrollOf, settleAmounts } from './wallet';

export interface DataContext {
  fixture: Fixture;
  projection: MatchProjection;
  homeSplit?: SplitStats;
  awaySplit?: SplitStats;
  /** Temporadas anteriores de los dos equipos: entran en la confianza de cada mercado. */
  homeHistory?: SplitStats | null;
  awayHistory?: SplitStats | null;
  dispersion?: Partial<Record<CountMarket, Dispersion | null>>;
  params: Partial<Pick<ModelParams, 'oneXTwoMode'>>;
}

/**
 * El contexto que necesita `estimateMarket`, sacado de los datos del partido.
 *
 * Existe porque lo armaban a mano **siete** sitios distintos (esta pantalla, el pick del modelo, el
 * evaluador, los tickets, la ficha del partido…) y añadir un campo obligaba a acordarse de los siete. Al
 * añadir el histórico se olvidaron dos, y el síntoma fue de los malos: no fallaba nada, simplemente el
 * histórico no contaba en la confianza de los picks y la lista de oportunidades seguía saliendo vacía.
 */
export function marketContextOf(data: DataContext, minSample: number): MarketContext {
  return {
    projection: data.projection,
    homeSplit: data.homeSplit,
    awaySplit: data.awaySplit,
    homeHistory: data.homeHistory,
    awayHistory: data.awayHistory,
    dispersion: data.dispersion,
    params: data.params,
    minSample,
  };
}

export function eventRefOf(f: Fixture): EventRef {
  return {
    fixtureId: f.id,
    providerId: f.providerId,
    leagueId: f.leagueId,
    season: f.season,
    date: f.date,
    kickoffTime: f.kickoffTime ?? null,
    round: f.round,
    homeTeamId: f.homeTeamId,
    awayTeamId: f.awayTeamId,
    homeTeamName: f.homeTeamName,
    awayTeamName: f.awayTeamName,
  };
}

/** Stake pendiente que comparte partido, competición o día. Un ticket cuenta entero en cada uno. */
export function exposureFor(p: Profile, ev: Pick<EventRef, 'fixtureId' | 'leagueId' | 'date'>): Exposure {
  const e: Exposure = { day: 0, match: 0, competition: 0 };
  for (const x of p.picks) {
    if (x.cycle !== p.cycle || x.status !== 'pendiente') continue;
    if (x.fixtureId === ev.fixtureId) e.match += x.stake;
    if (x.leagueId === ev.leagueId) e.competition += x.stake;
    if (x.date === ev.date) e.day += x.stake;
  }
  for (const t of p.tickets) {
    if (t.cycle !== p.cycle || t.status !== 'pendiente') continue;
    if (t.legs.some((l) => l.fixtureId === ev.fixtureId)) e.match += t.stake;
    if (t.legs.some((l) => l.leagueId === ev.leagueId)) e.competition += t.stake;
    if (t.legs.some((l) => l.date === ev.date)) e.day += t.stake;
  }
  return { day: roundMoney(e.day), match: roundMoney(e.match), competition: roundMoney(e.competition) };
}

/** Correlación de una selección con lo que ya está pendiente en ese partido. */
export function openCorrelation(p: Profile, fixtureId: string, sel: Selection): { level: CorrelationLevel; with: string[] } {
  const niveles: CorrelationLevel[] = [];
  const con: string[] = [];
  const mirar = (s: Selection, home: string, away: string, donde: string) => {
    const l = correlationBetween(sel, s);
    if (l === 'ninguna' || l === 'baja') return;
    niveles.push(l);
    con.push(`${selectionLabel(s, home, away)} (${donde}, correlación ${CORRELATION_LABEL[l]})`);
  };
  for (const x of p.picks) {
    if (x.cycle === p.cycle && x.status === 'pendiente' && x.fixtureId === fixtureId)
      mirar(x.selection, x.homeTeamName, x.awayTeamName, 'pick');
  }
  for (const t of p.tickets) {
    if (t.cycle !== p.cycle || t.status !== 'pendiente') continue;
    for (const l of t.legs) if (l.fixtureId === fixtureId) mirar(l.selection, l.homeTeamName, l.awayTeamName, `ticket #${t.number}`);
  }
  return { level: maxCorrelation(niveles), with: con };
}

export function familyOf(s: Selection): MarketFamily {
  return s.market;
}

const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)} %`;
const pp = (x: number) => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(2)} pp`;

export interface PickEvaluation {
  event: EventRef;
  selection: Selection;
  label: string;
  family: MarketFamily;
  estimate: MarketEstimate;
  oddsError: string | null;
  odds: OddsAssessment | null;
  stake: StakeRecommendation;
  risk: RiskAssessment | null;
  correlation: CorrelationLevel;
  correlatedWith: string[];
  exposure: Exposure;
  bankroll: number;
  available: number;
  explanation: string[];
}

/** Resultado del último backtest por mercado (clave = `selectionLabel(sel)` sin nombres de equipo). */
export type ModelValidation = Record<string, { n: number; skill: number | null; ece: number | null }>;

export function evaluatePick(input: {
  data: DataContext;
  selection: Selection;
  odds: number;
  profile: Profile;
  validation?: ModelValidation | null;
}): PickEvaluation {
  const { data, selection, odds, profile } = input;
  const validacion = input.validation?.[selectionLabel(selection)];
  const s = profile.settings;
  const event = eventRefOf(data.fixture);
  const label = selectionLabel(selection, event.homeTeamName, event.awayTeamName);
  const estimate = estimateMarket(selection, marketContextOf(data, s.minSample));
  const oddsError = validateOdds(odds);
  const oddsInfo = oddsError ? null : assessOdds(estimate.probability, odds, s.minEdge, estimate.push);
  const corr = openCorrelation(profile, event.fixtureId, selection);
  const exposure = exposureFor(profile, event);
  const bankroll = bankrollOf(profile);
  const available = availableBalance(profile);

  const stake = recommendStake({
    probability: estimate.probability,
    odds,
    settings: s,
    bankroll,
    available,
    exposure,
    correlation: corr.level,
    dataQuality: estimate.dataQuality,
  });

  const risk =
    estimate.probability !== null && oddsInfo?.edge != null
      ? assessPickRisk({
          probability: estimate.probability,
          odds,
          edge: oddsInfo.edge,
          family: familyOf(selection),
          evidence: estimate.evidence,
          coverage: estimate.coverage,
          dataQuality: estimate.dataQuality,
          correlation: corr.level,
          validation: validacion,
        })
      : null;

  const explanation: string[] = [];
  if (estimate.reason) explanation.push(estimate.reason);
  else {
    // Los mercados de conteo solo cuentan los partidos en los que la fuente publicó el dato, y conviene decirlo.
    const porDato = selection.market === 'conteoEquipo' || isCountMarket(selection.market);
    const muestra = porDato
      ? `${estimate.sampleHome} partidos del local en casa y ${estimate.sampleAway} del visitante fuera con el dato publicado`
      : `${estimate.sampleHome} partidos del local en casa y ${estimate.sampleAway} del visitante fuera`;
    if (estimate.expected !== null) {
      /*
       * Qué cuenta el mercado, con su nombre. Sale de `COUNT_MARKETS` para los de conteo: cuando estaban
       * escritos a mano aquí, «over 6.5 tiros a puerta» se explicaba como «el modelo espera 5,20 goles en el
       * partido», que no es lo que mide.
       */
      const que =
        selection.market === 'conteoEquipo'
          ? `${COUNT_MARKETS[selection.stat].unidad} de ${selection.team === 'home' ? event.homeTeamName : event.awayTeamName}`
          : isCountMarket(selection.market)
            ? `${COUNT_MARKETS[selection.market].unidad} en el partido`
            : selection.market === 'equipo'
              ? `goles de ${selection.team === 'home' ? event.homeTeamName : event.awayTeamName}`
                : selection.market === 'cero'
                  ? `goles de ${selection.team === 'home' ? event.awayTeamName : event.homeTeamName}`
                  : selection.market === 'mitad'
                    ? `goles en la ${HALF_LABEL[selection.half]}`
                    : 'goles en el partido';
      explanation.push(`El modelo espera ${estimate.expected.toFixed(2)} ${que}, con ${muestra}.`);
    } else {
      explanation.push(`Goles esperados ${data.projection.expectedGoalsHome.toFixed(2)} – ${data.projection.expectedGoalsAway.toFixed(2)}, con ${muestra}.`);
    }
    explanation.push(`Método: ${estimate.method}.`);
    if (estimate.push > 0 && estimate.probability !== null) {
      explanation.push(
        `Línea entera: gana ${pct(estimate.probability * (1 - estimate.push), 2)}, se devuelve el stake ${pct(estimate.push, 2)} y pierde ${pct((1 - estimate.probability) * (1 - estimate.push), 2)}. Edge, cuota justa y Kelly usan ${pct(estimate.probability, 2)}, la probabilidad de ganar sin contar la devolución.`,
      );
    }
    if (estimate.range80) explanation.push(`Rango probable (80 % central de la distribución): ${estimate.range80[0]}–${estimate.range80[1]}.`);
  }
  if (oddsError) explanation.push(oddsError);
  if (oddsInfo && estimate.probability !== null && oddsInfo.edge !== null) {
    explanation.push(
      `Probabilidad estimada ${pct(estimate.probability, 2)} frente a ${pct(oddsInfo.impliedProbability, 2)} implícita en la cuota ${odds.toFixed(2)}: edge ${pp(oddsInfo.edge)}, cuota justa ${oddsInfo.fairOdds?.toFixed(2) ?? '—'}.`,
    );
  }
  if (stake.kellyFull !== null) {
    explanation.push(
      stake.status === 'recomendado'
        ? `Kelly completo ${pct(stake.kellyFull, 2)} × ${stake.multiplier} → ${pct(stake.kellyApplied ?? 0, 2)} del bankroll → stake ${formatAmount(stake.stake, s)}${stake.bindingLimit && stake.bindingLimit !== 'kelly' ? ` (limitado por ${limitText(stake.bindingLimit)})` : ''}.`
        : `Kelly completo ${pct(stake.kellyFull, 2)}: ${stake.reasons[0] ?? 'sin stake recomendado'}`,
    );
  }
  if (corr.with.length) explanation.push(`Pendiente en el mismo partido: ${corr.with.join('; ')}.`);
  if (validacion && validacion.skill !== null) {
    explanation.push(
      `Backtest de este mercado: skill ${(validacion.skill * 100).toFixed(1)} % sobre ${validacion.n} predicciones${validacion.ece !== null ? `, error de calibración ${(validacion.ece * 100).toFixed(1)} pp` : ''}.`,
    );
  }
  if (risk) {
    const c = risk.components;
    explanation.push(
      `Riesgo ${RISK_LABEL[risk.level]} (${risk.score}/100): datos ${c.datos} · modelo ${c.modelo} · mercado ${c.mercado} · varianza ${c.varianza} · correlación ${c.correlacion}.`,
    );
  }

  return {
    event,
    selection,
    label,
    family: familyOf(selection),
    estimate,
    oddsError,
    odds: oddsInfo,
    stake,
    risk,
    correlation: corr.level,
    correlatedWith: corr.with,
    exposure,
    bankroll,
    available,
    explanation,
  };
}

/** Impacto de un stake sobre el bankroll: si gana y si pierde, con el mismo redondeo que la liquidación. */
export function simulateOutcome(bankroll: number, stake: number, odds: number, coinValue: number) {
  const { grossReturn, netProfit } = settleAmounts(stake, odds, 'ganado', coinValue);
  return {
    grossReturn,
    netWin: netProfit,
    bankrollIfWin: roundMoney(bankroll + netProfit),
    bankrollIfLose: roundMoney(bankroll - stake),
  };
}

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------

export interface TicketLegEvaluation {
  event: EventRef;
  selection: Selection;
  label: string;
  odds: number | null;
  oddsError: string | null;
  estimate: MarketEstimate;
  risk: RiskAssessment | null;
}

export interface TicketEvaluation {
  legs: TicketLegEvaluation[];
  errors: string[];
  warnings: string[];
  combinedOdds: number | null;
  /** Producto de cuotas, o la cuota ofrecida si se introdujo. */
  productOdds: number | null;
  joint: JointResult | null;
  kellyProbability: number | null;
  kellyBasis: 'conjunta' | 'cota-inferior' | null;
  stake: StakeRecommendation | null;
  risk: RiskAssessment | null;
  dataQuality: DataQuality;
  bankroll: number;
  available: number;
}

const PEOR: DataQuality[] = ['alta', 'media', 'baja', 'insuficiente'];

export function evaluateTicket(input: {
  legs: { data: DataContext; selection: Selection; odds: number | null }[];
  profile: Profile;
  /** Cuota combinada que ofrece la casa, si difiere del producto (combinadas del mismo partido). */
  offeredOdds?: number | null;
}): TicketEvaluation {
  const { profile } = input;
  const s = profile.settings;
  const errors: string[] = [];
  const warnings: string[] = [];
  const bankroll = bankrollOf(profile);
  const available = availableBalance(profile);

  const legs: TicketLegEvaluation[] = input.legs.map(({ data, selection, odds }) => {
    const event = eventRefOf(data.fixture);
    const estimate = estimateMarket(selection, marketContextOf(data, s.minSample));
    const oddsError = odds === null ? 'Falta la cuota.' : validateOdds(odds);
    const corr = openCorrelation(profile, event.fixtureId, selection).level;
    const risk =
      !oddsError && odds !== null && estimate.probability !== null
        ? assessPickRisk({
            probability: estimate.probability,
            odds,
            edge: estimate.probability - 1 / odds,
            family: selection.market,
            evidence: estimate.evidence,
            coverage: estimate.coverage,
            dataQuality: estimate.dataQuality,
            correlation: corr === 'identica' ? 'alta' : corr,
          })
        : null;
    return { event, selection, label: selectionLabel(selection, event.homeTeamName, event.awayTeamName), odds, oddsError, estimate, risk };
  });

  const vacio = (dataQuality: DataQuality): TicketEvaluation => ({
    legs, errors, warnings, combinedOdds: null, productOdds: null, joint: null, kellyProbability: null, kellyBasis: null, stake: null, risk: null, dataQuality, bankroll, available,
  });

  if (legs.length < 2) errors.push('Un ticket combinado necesita al menos 2 selecciones.');
  legs.forEach((l, i) => {
    // Una selección devuelta cambiaría la cuota del ticket y su probabilidad a la vez: no se simula todavía.
    if (canPush(l.selection)) errors.push(`Selección ${i + 1}: ${l.label} puede acabar en devolución del stake (línea entera). Los tickets todavía no admiten devoluciones: usa una línea .5 o regístrala como pick simple.`);
    if (l.oddsError) errors.push(`Selección ${i + 1}: ${l.oddsError}`);
    if (l.estimate.probability === null) errors.push(`Selección ${i + 1}: ${l.estimate.reason ?? 'datos insuficientes'}`);
  });
  const dataQuality = legs.reduce<DataQuality>((w, l) => (PEOR.indexOf(l.estimate.dataQuality) > PEOR.indexOf(w) ? l.estimate.dataQuality : w), 'alta');
  if (errors.length) return vacio(dataQuality);

  const joint = jointProbability(
    input.legs.map(({ data, selection, odds }, i) => ({
      fixtureId: data.fixture.id,
      selection,
      odds: odds!,
      probability: legs[i].estimate.probability!,
      lambdaHome: data.projection.expectedGoalsHome,
      lambdaAway: data.projection.expectedGoalsAway,
      probs1x2: data.projection.probs1x2,
      distribution: legs[i].estimate.distribution,
    })),
  );
  if (joint.invalid) {
    errors.push(joint.invalid);
    return { ...vacio(dataQuality), joint };
  }

  const productOdds = combinedOdds(legs.map((l) => l.odds!));
  let odds = productOdds;
  if (input.offeredOdds != null) {
    const e = validateOdds(input.offeredOdds);
    if (e) errors.push(`Cuota combinada ofrecida: ${e}`);
    else odds = input.offeredOdds;
  }
  if (errors.length) return { ...vacio(dataQuality), joint };

  const mismoPartido = new Set(legs.map((l) => l.event.fixtureId)).size < legs.length;
  if (mismoPartido && input.offeredOdds == null)
    warnings.push('Hay selecciones del mismo partido: la cuota combinada real de una casa no suele ser el producto de cuotas. Introduce la que te ofrezcan.');

  let kellyProbability: number | null = null;
  let kellyBasis: TicketEvaluation['kellyBasis'] = null;
  if (joint.probability !== null) {
    kellyProbability = joint.probability;
    kellyBasis = 'conjunta';
  } else if (joint.low * odds - 1 > 0) {
    kellyProbability = joint.low;
    kellyBasis = 'cota-inferior';
    warnings.push('Kelly calculado con la cota inferior de la probabilidad combinada: el stake es conservador.');
  }

  // Exposición: la del partido, competición y día más cargados de las selecciones.
  const exposiciones = legs.map((l) => exposureFor(profile, l.event));
  const exposure: Exposure = {
    day: Math.max(...exposiciones.map((e) => e.day)),
    match: Math.max(...exposiciones.map((e) => e.match)),
    competition: Math.max(...exposiciones.map((e) => e.competition)),
  };
  const abiertas = legs.map((l) => openCorrelation(profile, l.event.fixtureId, l.selection).level);
  const correlation = maxCorrelation(abiertas.map((c) => (c === 'identica' ? 'alta' : c)));

  const stake =
    kellyProbability === null
      ? {
          status: 'sin-valor' as const,
          reasons: [
            joint.high * odds - 1 <= 0
              ? 'Sin valor estadístico suficiente ni en el mejor caso del rango de probabilidad.'
              : 'La probabilidad combinada no es estimable y su cota inferior no da valor: no se recomienda stake.',
          ],
          kellyFull: null,
          kellyHalf: null,
          kellyQuarter: null,
          multiplier: 0,
          kellyApplied: null,
          stake: 0,
          maxAllowedStake: 0,
          bindingLimit: null,
        }
      : recommendStake({ probability: kellyProbability, odds, settings: s, bankroll, available, exposure, correlation, dataQuality });

  const risk = assessTicketRisk({
    legs: legs.map((l) => l.risk!).filter(Boolean),
    combinedOdds: odds,
    probabilityLow: joint.low,
    correlation: maxCorrelation([joint.correlation, correlation]),
  });

  if (legs.length >= 4) warnings.push(`Concentración de riesgo: ${legs.length} selecciones.`);
  if (odds >= 6) warnings.push(`Cuota combinada ${odds.toFixed(2)}: alta volatilidad.`);
  if (1 - joint.low >= 0.75) warnings.push(`Probabilidad de que falle al menos una selección: ${pct(1 - joint.high)}${joint.probability === null ? `–${pct(1 - joint.low)}` : ''}.`);
  const porLiga = new Map<string, number>();
  for (const l of legs) porLiga.set(l.event.leagueId, (porLiga.get(l.event.leagueId) ?? 0) + 1);
  for (const [liga, n] of porLiga) if (n >= 3) warnings.push(`${n} selecciones de ${liga}: riesgo concentrado en una competición.`);

  return { legs, errors, warnings, combinedOdds: odds, productOdds, joint, kellyProbability, kellyBasis, stake, risk, dataQuality, bankroll, available };
}
