/**
 * Métricas de rendimiento calculadas SOLO con el historial registrado. PICKS_METHODOLOGY.md §8.
 *
 * Una métrica que no se puede calcular con los datos que hay devuelve `value: null` y la interfaz
 * muestra «Datos insuficientes». Nunca se rellena.
 *
 *   % acierto  = ganados / (ganados + perdidos)            (los anulados no cuentan)
 *   Yield      = beneficio neto / total apostado (liquidado, sin anulados)
 *   ROI        = beneficio neto / capital aportado (saldo inicial + depósitos del ciclo)
 *   Brier      = media de (p − resultado)²                   (0 perfecto; 0,25 = decir siempre 50 %)
 *   Log loss   = −media de [o·ln p + (1−o)·ln(1−p)]
 *   Eficacia   = 1 − Brier(modelo) / Brier(probabilidad implícita de la cuota)
 *   ECE        = Σ (n_bin / N) · |frecuencia real − probabilidad media|
 */
import type { BetStatus, MarketFamily, Profile, RiskLevel } from '../../types/betting';
import { FAMILY_LABEL, selectionLabel } from './markets';
import { roundMoney } from './odds';

export const MIN_PROBABILITY_SAMPLE = 20;
export const MIN_CALIBRATION_SAMPLE = 50;
export const MIN_SHARPE_SAMPLE = 20;

export interface Metric {
  value: number | null;
  n: number;
  /** Mínimo de muestra que exige la métrica (si lo hay). */
  min?: number;
}

export interface BetView {
  id: string;
  kind: 'simple' | 'ticket';
  cycle: number;
  label: string;
  event: string;
  createdAt: string;
  settledAt: string | null;
  /** Fecha del partido (la primera, en un ticket). */
  date: string;
  leagueIds: string[];
  teamIds: string[];
  /** Equipo del lado apostado cuando el mercado lo tiene (1X2): 'local' | 'visitante'. */
  side: 'local' | 'visitante' | null;
  family: MarketFamily | 'combinada';
  familyLabel: string;
  odds: number;
  probability: number | null;
  stake: number;
  kellyFull: number | null;
  stakeFraction: number;
  riskLevel: RiskLevel;
  riskScore: number;
  status: BetStatus;
  netProfit: number | null;
}

export function betViews(p: Profile): BetView[] {
  const picks: BetView[] = p.picks.map((x) => ({
    id: x.id,
    kind: 'simple',
    cycle: x.cycle,
    label: selectionLabel(x.selection, x.homeTeamName, x.awayTeamName),
    event: `${x.homeTeamName} – ${x.awayTeamName}`,
    createdAt: x.createdAt,
    settledAt: x.settledAt,
    date: x.date,
    leagueIds: [x.leagueId],
    teamIds: [x.homeTeamId, x.awayTeamId],
    side:
      x.selection.market === 'resultado' && x.selection.outcome !== 'draw'
        ? x.selection.outcome === 'home'
          ? 'local'
          : 'visitante'
        : null,
    family: x.selection.market,
    familyLabel: FAMILY_LABEL[x.selection.market],
    odds: x.odds,
    probability: x.probability,
    stake: x.stake,
    kellyFull: x.kellyFull,
    stakeFraction: x.stakeFraction,
    riskLevel: x.risk.level,
    riskScore: x.risk.score,
    status: x.status,
    netProfit: x.netProfit,
  }));
  const tickets: BetView[] = p.tickets.map((t) => ({
    id: t.id,
    kind: 'ticket',
    cycle: t.cycle,
    label: `Ticket #${String(t.number).padStart(3, '0')} · ${t.legs.length} selecciones`,
    event: [...new Set(t.legs.map((l) => `${l.homeTeamName} – ${l.awayTeamName}`))].join(' · '),
    createdAt: t.createdAt,
    settledAt: t.settledAt,
    date: t.legs.map((l) => l.date).sort()[0],
    leagueIds: [...new Set(t.legs.map((l) => l.leagueId))],
    teamIds: t.legs.flatMap((l) => [l.homeTeamId, l.awayTeamId]),
    side: null,
    family: 'combinada',
    familyLabel: 'Combinadas',
    odds: t.combinedOdds,
    probability: t.probability,
    stake: t.stake,
    kellyFull: t.kellyFull,
    stakeFraction: t.bankrollBefore > 0 ? t.stake / t.bankrollBefore : 0,
    riskLevel: t.risk.level,
    riskScore: t.risk.score,
    status: t.status,
    netProfit: t.netProfit,
  }));
  return [...picks, ...tickets].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

const resolved = (b: BetView) => b.status === 'ganado' || b.status === 'perdido';

export function brierScore(preds: { p: number; o: 0 | 1 }[]): number | null {
  return preds.length ? preds.reduce((a, x) => a + (x.p - x.o) ** 2, 0) / preds.length : null;
}

export function logLoss(preds: { p: number; o: 0 | 1 }[]): number | null {
  if (!preds.length) return null;
  const eps = 1e-6;
  return (
    -preds.reduce((a, x) => {
      const p = Math.min(1 - eps, Math.max(eps, x.p));
      return a + (x.o ? Math.log(p) : Math.log(1 - p));
    }, 0) / preds.length
  );
}

export interface CalibrationBin {
  lo: number;
  hi: number;
  n: number;
  meanProbability: number | null;
  frequency: number | null;
}

export function calibration(preds: { p: number; o: 0 | 1 }[], bins = 10): { bins: CalibrationBin[]; ece: number | null } {
  const out: CalibrationBin[] = Array.from({ length: bins }, (_, i) => ({ lo: i / bins, hi: (i + 1) / bins, n: 0, meanProbability: null, frequency: null }));
  const sums = out.map(() => ({ p: 0, o: 0 }));
  for (const x of preds) {
    const i = Math.min(bins - 1, Math.floor(x.p * bins));
    out[i].n++;
    sums[i].p += x.p;
    sums[i].o += x.o;
  }
  let ece = 0;
  for (let i = 0; i < bins; i++) {
    if (!out[i].n) continue;
    out[i].meanProbability = sums[i].p / out[i].n;
    out[i].frequency = sums[i].o / out[i].n;
    ece += (out[i].n / preds.length) * Math.abs(out[i].frequency! - out[i].meanProbability!);
  }
  return { bins: out, ece: preds.length ? ece : null };
}

/** Mayor caída desde un máximo de beneficio acumulado. `pct` sobre el bankroll en ese máximo. */
export function maxDrawdown(profits: number[], capital: number): { amount: number; pct: number | null } {
  let pnl = 0;
  let pico = 0;
  let amount = 0;
  let pct: number | null = null;
  for (const x of profits) {
    pnl += x;
    if (pnl > pico) pico = pnl;
    const caida = pico - pnl;
    if (caida > amount) {
      amount = caida;
      pct = capital + pico > 0 ? caida / (capital + pico) : null;
    }
  }
  return { amount: roundMoney(amount), pct: amount > 0 ? pct : 0 };
}

export interface PerformanceSummary {
  total: number;
  pending: number;
  won: number;
  lost: number;
  voided: number;
  resolved: number;
  wonPct: Metric;
  lostPct: Metric;
  hitRate: Metric;
  staked: number;
  netProfit: number;
  grossWins: number;
  grossLosses: number;
  roi: Metric;
  yield: Metric;
  profitFactor: Metric;
  avgOdds: Metric;
  avgStake: Metric;
  avgKelly: Metric;
  avgStakeFraction: Metric;
  unitsProfit: Metric;
  drawdown: { amount: number; pct: number | null; n: number };
  brier: Metric;
  brierMarket: Metric;
  efficacy: Metric;
  logLoss: Metric;
  ece: Metric;
  calibration: CalibrationBin[];
  sharpe: Metric;
}

const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function summarize(bets: BetView[], ctx: { capital: number; unit: number }): PerformanceSummary {
  const res = bets.filter(resolved).sort((a, b) => (a.settledAt ?? '').localeCompare(b.settledAt ?? ''));
  const won = res.filter((b) => b.status === 'ganado').length;
  const lost = res.length - won;
  const voided = bets.filter((b) => b.status === 'anulado').length;
  const pending = bets.filter((b) => b.status === 'pendiente').length;
  const liquidados = won + lost + voided;

  const staked = roundMoney(res.reduce((a, b) => a + b.stake, 0));
  const profits = res.map((b) => b.netProfit ?? 0);
  const netProfit = roundMoney(profits.reduce((a, b) => a + b, 0));
  const grossWins = roundMoney(profits.filter((x) => x > 0).reduce((a, b) => a + b, 0));
  const grossLosses = roundMoney(-profits.filter((x) => x < 0).reduce((a, b) => a + b, 0));

  const preds = res.filter((b) => b.probability !== null).map((b) => ({ p: b.probability!, o: (b.status === 'ganado' ? 1 : 0) as 0 | 1 }));
  const market = res.filter((b) => b.probability !== null).map((b) => ({ p: 1 / b.odds, o: (b.status === 'ganado' ? 1 : 0) as 0 | 1 }));
  const suficiente = preds.length >= MIN_PROBABILITY_SAMPLE;
  const brier = brierScore(preds);
  const brierM = brierScore(market);
  const cal = calibration(preds);

  const retornos = res.map((b) => (b.netProfit ?? 0) / b.stake);
  const r = media(retornos);
  const sd =
    retornos.length > 1 && r !== null
      ? Math.sqrt(retornos.reduce((a, x) => a + (x - r) ** 2, 0) / (retornos.length - 1))
      : null;

  return {
    total: bets.length,
    pending,
    won,
    lost,
    voided,
    resolved: res.length,
    wonPct: { value: liquidados ? won / liquidados : null, n: liquidados },
    lostPct: { value: liquidados ? lost / liquidados : null, n: liquidados },
    hitRate: { value: res.length ? won / res.length : null, n: res.length },
    staked,
    netProfit,
    grossWins,
    grossLosses,
    roi: { value: res.length && ctx.capital > 0 ? netProfit / ctx.capital : null, n: res.length },
    yield: { value: staked > 0 ? netProfit / staked : null, n: res.length },
    profitFactor: { value: grossLosses > 0 && grossWins > 0 ? grossWins / grossLosses : null, n: res.length },
    avgOdds: { value: media(res.map((b) => b.odds)), n: res.length },
    avgStake: { value: media(res.map((b) => b.stake)), n: res.length },
    avgKelly: { value: media(res.filter((b) => b.kellyFull !== null).map((b) => b.kellyFull!)), n: res.length },
    avgStakeFraction: { value: media(res.map((b) => b.stakeFraction)), n: res.length },
    unitsProfit: { value: res.length && ctx.unit > 0 ? netProfit / ctx.unit : null, n: res.length },
    drawdown: { ...maxDrawdown(profits, ctx.capital), n: res.length },
    brier: { value: suficiente ? brier : null, n: preds.length, min: MIN_PROBABILITY_SAMPLE },
    brierMarket: { value: suficiente ? brierM : null, n: market.length, min: MIN_PROBABILITY_SAMPLE },
    efficacy: { value: suficiente && brier !== null && brierM ? 1 - brier / brierM : null, n: preds.length, min: MIN_PROBABILITY_SAMPLE },
    logLoss: { value: suficiente ? logLoss(preds) : null, n: preds.length, min: MIN_PROBABILITY_SAMPLE },
    ece: { value: preds.length >= MIN_CALIBRATION_SAMPLE ? cal.ece : null, n: preds.length, min: MIN_CALIBRATION_SAMPLE },
    calibration: cal.bins,
    sharpe: {
      value: retornos.length >= MIN_SHARPE_SAMPLE && sd ? r! / sd : null,
      n: retornos.length,
      min: MIN_SHARPE_SAMPLE,
    },
  };
}

export interface GroupRow {
  key: string;
  label: string;
  bets: number;
  resolved: number;
  hitRate: Metric;
  staked: number;
  netProfit: number;
  yield: Metric;
  avgOdds: Metric;
  avgRiskScore: number | null;
}

export function groupPerformance(bets: BetView[], keyOf: (b: BetView) => { key: string; label: string }[]): GroupRow[] {
  const grupos = new Map<string, { label: string; bets: BetView[] }>();
  for (const b of bets) {
    for (const { key, label } of keyOf(b)) {
      const g = grupos.get(key) ?? { label, bets: [] };
      g.bets.push(b);
      grupos.set(key, g);
    }
  }
  return [...grupos].map(([key, g]) => {
    const res = g.bets.filter(resolved);
    const staked = roundMoney(res.reduce((a, b) => a + b.stake, 0));
    const net = roundMoney(res.reduce((a, b) => a + (b.netProfit ?? 0), 0));
    return {
      key,
      label: g.label,
      bets: g.bets.length,
      resolved: res.length,
      hitRate: { value: res.length ? res.filter((b) => b.status === 'ganado').length / res.length : null, n: res.length },
      staked,
      netProfit: net,
      yield: { value: staked > 0 ? net / staked : null, n: res.length },
      avgOdds: { value: media(res.map((b) => b.odds)), n: res.length },
      avgRiskScore: media(g.bets.map((b) => b.riskScore)),
    };
  });
}

/** Capital aportado en los ciclos indicados: saldos iniciales, reinicios y depósitos. */
export function capitalOf(p: Profile, cycles: number[]): number {
  return roundMoney(
    p.movements
      .filter((m) => cycles.includes(m.cycle) && (m.type === 'inicial' || m.type === 'reinicio' || m.type === 'deposito'))
      .reduce((a, m) => a + m.amount, 0),
  );
}

export interface BankrollPoint {
  at: string;
  bankroll: number;
  label: string;
}

/**
 * Evolución del bankroll de un ciclo: capital aportado + beneficio realizado, punto a punto en cada
 * depósito y cada liquidación. Los stakes pendientes no mueven la curva: no son pérdida todavía.
 */
export function bankrollSeries(p: Profile, cycle: number): BankrollPoint[] {
  const neto = new Map<string, number>();
  for (const b of betViews(p)) if (b.netProfit !== null) neto.set(b.id, b.netProfit);
  let valor = 0;
  const out: BankrollPoint[] = [];
  for (const m of p.movements) {
    if (m.cycle !== cycle) continue;
    if (m.type === 'inicial' || m.type === 'reinicio' || m.type === 'deposito') valor += m.amount;
    else if (m.type === 'retorno' || m.type === 'perdida' || m.type === 'reembolso') valor += neto.get(m.betId ?? '') ?? 0;
    else continue;
    out.push({ at: m.at, bankroll: roundMoney(valor), label: m.note });
  }
  return out;
}

/** Beneficio neto por fecha de partido. */
export function dailyProfit(bets: BetView[]): Map<string, { net: number; bets: number }> {
  const out = new Map<string, { net: number; bets: number }>();
  for (const b of bets) {
    if (!resolved(b)) continue;
    const d = out.get(b.date) ?? { net: 0, bets: 0 };
    d.net = roundMoney(d.net + (b.netProfit ?? 0));
    d.bets++;
    out.set(b.date, d);
  }
  return out;
}
