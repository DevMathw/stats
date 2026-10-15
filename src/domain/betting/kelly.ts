/**
 * Criterio de Kelly para cuotas decimales y límites de riesgo. PICKS_METHODOLOGY.md §4.
 *
 *   f* = (b · p − q) / b     con  b = cuota − 1,  q = 1 − p
 *
 * f* es la fracción del bankroll que maximiza el crecimiento logarítmico SI p fuese la probabilidad
 * verdadera. Como p es una estimación con error, el stake nunca usa f* completo: se aplica una
 * fracción (Half = 0,5, Quarter = 0,25) y después los topes. Kelly ≤ 0 ⇒ no se recomienda stake.
 */
import type {
  BindingLimit,
  CorrelationLevel,
  DataQuality,
  RiskSettings,
} from '../../types/betting';
import { formatAmount, toCoinGrid } from './coins';
import { isProbability, validateOdds } from './odds';
import { CORRELATION_LABEL } from './labels';

export function kellyFraction(p: number, odds: number): number {
  const b = odds - 1;
  return (b * p - (1 - p)) / b;
}

export function kellyMultiplier(s: RiskSettings): number {
  return s.kellyMode === 'half' ? 0.5 : s.kellyMode === 'quarter' ? 0.25 : s.customFraction;
}

/** Reducción de Kelly por un pick abierto correlacionado en el mismo partido. */
export const CORRELATION_FACTOR: Record<CorrelationLevel, number> = {
  ninguna: 1,
  baja: 1,
  media: 0.75,
  alta: 0.5,
  excluyente: 0,
  identica: 0,
};

/** Stake ya comprometido en picks pendientes que comparten día, partido o competición. */
export interface Exposure {
  day: number;
  match: number;
  competition: number;
}

export interface StakeContext {
  probability: number | null;
  odds: number;
  settings: RiskSettings;
  /** Disponible + comprometido. Base de todos los porcentajes. */
  bankroll: number;
  available: number;
  exposure: Exposure;
  correlation: CorrelationLevel;
  dataQuality: DataQuality;
}

export type StakeStatus = 'recomendado' | 'sin-valor' | 'bloqueado' | 'datos-insuficientes';

export interface StakeRecommendation {
  status: StakeStatus;
  reasons: string[];
  kellyFull: number | null;
  kellyHalf: number | null;
  kellyQuarter: number | null;
  multiplier: number;
  /** f* · fracción · correlación, antes de los topes. */
  kellyApplied: number | null;
  /** Stake recomendado en SC: múltiplo de 0.01 monedas y de al menos 1 moneda. 0 si no se recomienda. */
  stake: number;
  /** Máximo que las reglas permiten registrar (múltiplo de 0.01 monedas): nunca por encima de Kelly completo ni de los topes. */
  maxAllowedStake: number;
  bindingLimit: BindingLimit | null;
}

const LIMIT_TEXT: Record<BindingLimit, string> = {
  kelly: 'la fracción de Kelly',
  maxKelly: 'el stake máximo por pick',
  maxStake: 'el tope absoluto por pick',
  diario: 'la exposición diaria',
  partido: 'la exposición por partido',
  competicion: 'la exposición por competición',
  saldo: 'el saldo disponible',
  correlacion: 'la correlación con otro pick',
  minimo: 'el stake mínimo de 1 moneda',
};

export function limitText(l: BindingLimit): string {
  return LIMIT_TEXT[l];
}

function vacio(status: StakeStatus, reasons: string[], m: number, full: number | null = null): StakeRecommendation {
  return {
    status,
    reasons,
    kellyFull: full,
    kellyHalf: full === null ? null : full * 0.5,
    kellyQuarter: full === null ? null : full * 0.25,
    multiplier: m,
    kellyApplied: null,
    stake: 0,
    maxAllowedStake: 0,
    bindingLimit: null,
  };
}

export function recommendStake(ctx: StakeContext): StakeRecommendation {
  const { settings: s, odds } = ctx;
  const m = kellyMultiplier(s);

  const oddsError = validateOdds(odds);
  if (oddsError) return vacio('bloqueado', [oddsError], m);

  if (ctx.dataQuality === 'insuficiente' || ctx.probability === null || !isProbability(ctx.probability)) {
    return vacio('datos-insuficientes', ['Datos insuficientes: no hay probabilidad estimada fiable para este mercado.'], m);
  }
  const p = ctx.probability;

  if (p >= 1) {
    return vacio('bloqueado', ['Probabilidad del 100 %: un modelo estadístico no puede asegurar un resultado. No se recomienda stake.'], m);
  }
  if (ctx.correlation === 'identica') {
    return vacio('bloqueado', ['Pick duplicado: ya tienes este mercado pendiente en este partido.'], m);
  }
  if (ctx.correlation === 'excluyente') {
    return vacio('bloqueado', ['Contradice un pick pendiente del mismo partido: no pueden ganar los dos.'], m);
  }

  const full = kellyFraction(p, odds);
  if (full <= 0) {
    return vacio('sin-valor', ['Sin valor estadístico suficiente: Kelly ≤ 0 con esta cuota.'], m, full);
  }
  if (p - 1 / odds < s.minEdge) {
    return vacio('sin-valor', [`Sin valor estadístico suficiente: el edge no llega al mínimo de ${(s.minEdge * 100).toFixed(1)} pp.`], m, full);
  }
  if (p < s.minProbability) {
    return vacio('bloqueado', [`Probabilidad estimada insuficiente: ${(p * 100).toFixed(1)} % por debajo del mínimo de ${(s.minProbability * 100).toFixed(0)} %.`], m, full);
  }
  if (odds > s.maxOdds) {
    return vacio('bloqueado', [`Cuota no factible para la gestión de riesgo: ${odds.toFixed(2)} supera la máxima de ${s.maxOdds.toFixed(2)}.`], m, full);
  }
  if (!(ctx.bankroll > 0) || !(ctx.available > 0)) {
    return vacio('bloqueado', ['Bankroll vacío: no hay saldo disponible para ningún stake.'], m, full);
  }

  const corr = CORRELATION_FACTOR[ctx.correlation];
  const applied = full * m * corr;
  const B = ctx.bankroll;
  const topes: [BindingLimit, number][] = [
    ['maxKelly', s.maxKellyPct * B],
    ['maxStake', s.maxStakePerPick ?? Infinity],
    ['diario', s.maxDailyExposurePct * B - ctx.exposure.day],
    ['partido', s.maxMatchExposurePct * B - ctx.exposure.match],
    ['competicion', s.maxCompetitionExposurePct * B - ctx.exposure.competition],
    ['saldo', ctx.available],
  ];
  const [topeLimite, topeValor] = topes.reduce((a, b) => (b[1] < a[1] ? b : a));

  // Stake mínimo: 1 moneda. Si los topes no dejan ni eso, no hay stake posible sin romper uno.
  const minimo = s.coinValue;
  if (topeValor < minimo) {
    const margen = toCoinGrid(Math.max(0, topeValor), s.coinValue, 'floor');
    return {
      ...vacio('bloqueado', [`Límite alcanzado: ${LIMIT_TEXT[topeLimite]} solo deja ${formatAmount(margen, s)} y el stake mínimo es 1 moneda.`], m, full),
      bindingLimit: topeLimite,
    };
  }

  const kellyStake = applied * B;
  const binding: BindingLimit = kellyStake <= topeValor ? (corr < 1 ? 'correlacion' : 'kelly') : topeLimite;
  // Hacia abajo a la centésima de moneda: al más cercano podría pasar de Kelly o de un tope.
  let stake = toCoinGrid(Math.max(0, Math.min(kellyStake, topeValor)), s.coinValue, 'floor');
  const maxAllowedStake = toCoinGrid(Math.max(0, Math.min(full * B, topeValor)), s.coinValue, 'floor');

  const reasons: string[] = [];
  if (corr < 1) reasons.push(`Kelly reducido al ${(corr * 100).toFixed(0)} % por correlación ${CORRELATION_LABEL[ctx.correlation]} con un pick pendiente del mismo partido.`);
  if (binding !== 'kelly' && binding !== 'correlacion') reasons.push(`Stake limitado por ${LIMIT_TEXT[binding]}.`);

  let limite = binding;
  if (stake < minimo) {
    // La fracción de Kelly da menos de 1 moneda: se sube al mínimo solo si Kelly completo también lo cubre.
    if (maxAllowedStake < minimo) {
      return vacio('sin-valor', [...reasons, 'Ni Kelly completo llega a 1 moneda, el stake mínimo: no se recomienda stake.'], m, full);
    }
    reasons.push(`Subido al stake mínimo de 1 moneda: la fracción de Kelly daba ${formatAmount(stake, s)}.`);
    stake = minimo;
    limite = 'minimo';
  }

  return {
    status: 'recomendado',
    reasons,
    kellyFull: full,
    kellyHalf: full * 0.5,
    kellyQuarter: full * 0.25,
    multiplier: m,
    kellyApplied: applied,
    stake,
    maxAllowedStake: Math.max(stake, maxAllowedStake),
    bindingLimit: limite,
  };
}
