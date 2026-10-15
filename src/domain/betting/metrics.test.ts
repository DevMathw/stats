import { describe, expect, it } from 'vitest';
import type { BetStatus } from '../../types/betting';
import {
  brierScore,
  calibration,
  groupPerformance,
  logLoss,
  maxDrawdown,
  MIN_PROBABILITY_SAMPLE,
  summarize,
  type BetView,
} from './metrics';

let n = 0;
function bet(status: BetStatus, stake: number, odds: number, probability: number | null = 0.55, family: BetView['family'] = 'goles'): BetView {
  n++;
  const net = status === 'ganado' ? stake * (odds - 1) : status === 'perdido' ? -stake : status === 'anulado' ? 0 : null;
  return {
    id: `b${n}`,
    kind: 'simple',
    cycle: 1,
    label: 'x',
    event: 'A – B',
    createdAt: `2026-09-${String(n).padStart(2, '0')}T10:00:00Z`,
    settledAt: status === 'pendiente' ? null : `2026-09-${String(n).padStart(2, '0')}T20:00:00Z`,
    date: `2026-09-${String(n).padStart(2, '0')}`,
    leagueIds: ['Liga'],
    teamIds: [],
    side: null,
    family,
    familyLabel: family,
    odds,
    probability,
    stake,
    kellyFull: 0.08,
    stakeFraction: stake / 10_000,
    riskLevel: 'medio',
    riskScore: 50,
    status,
    netProfit: net,
  };
}

const CTX = { capital: 10_000, unit: 100 };

describe('Métricas generales', () => {
  it('% de acierto excluye anulados y pendientes', () => {
    const s = summarize([bet('ganado', 100, 2), bet('perdido', 100, 2), bet('perdido', 100, 2), bet('anulado', 100, 2), bet('pendiente', 100, 2)], CTX);
    expect(s.hitRate.value).toBeCloseTo(1 / 3, 12);
    expect(s.resolved).toBe(3);
    expect(s.pending).toBe(1);
    expect(s.voided).toBe(1);
    expect(s.wonPct.value).toBeCloseTo(1 / 4, 12);
  });

  it('70 % de acierto con cuotas malas pierde dinero: el ROI negativo se queda negativo', () => {
    const bets = [...Array.from({ length: 7 }, () => bet('ganado', 100, 1.3)), ...Array.from({ length: 3 }, () => bet('perdido', 100, 1.3))];
    const s = summarize(bets, CTX);
    expect(s.hitRate.value).toBeCloseTo(0.7, 12);
    expect(s.netProfit).toBe(-90); // 7·30 − 300
    expect(s.yield.value).toBeCloseTo(-0.09, 12);
    expect(s.roi.value).toBeCloseTo(-0.009, 12);
    expect(s.yield.value!).toBeLessThan(0);
  });

  it('ganancia, pérdida acumulada, profit factor y unidades', () => {
    const s = summarize([bet('ganado', 200, 2.5), bet('perdido', 100, 2)], CTX);
    expect(s.grossWins).toBe(300);
    expect(s.grossLosses).toBe(100);
    expect(s.profitFactor.value).toBe(3);
    expect(s.unitsProfit.value).toBe(2);
    expect(s.avgOdds.value).toBeCloseTo(2.25, 12);
    expect(s.avgStake.value).toBe(150);
  });

  it('sin pérdidas el profit factor no se inventa', () => {
    expect(summarize([bet('ganado', 100, 2)], CTX).profitFactor.value).toBeNull();
  });

  it('sin picks liquidados: datos insuficientes', () => {
    const s = summarize([bet('pendiente', 100, 2)], CTX);
    expect(s.hitRate.value).toBeNull();
    expect(s.yield.value).toBeNull();
    expect(s.roi.value).toBeNull();
  });

  it('Brier y eficacia exigen muestra mínima', () => {
    const pocos = summarize([bet('ganado', 100, 2, 0.6), bet('perdido', 100, 2, 0.6)], CTX);
    expect(pocos.brier.value).toBeNull();
    expect(pocos.brier.min).toBe(MIN_PROBABILITY_SAMPLE);
    expect(pocos.efficacy.value).toBeNull();
  });

  it('eficacia = 1 − Brier(modelo) / Brier(cuota)', () => {
    const bets = Array.from({ length: 20 }, (_, i) => bet(i < 12 ? 'ganado' : 'perdido', 100, 2, 0.6));
    const s = summarize(bets, CTX);
    const modelo = (12 * 0.4 ** 2 + 8 * 0.6 ** 2) / 20;
    const cuota = 0.25; // implícita 50 %
    expect(s.brier.value).toBeCloseTo(modelo, 12);
    expect(s.brierMarket.value).toBeCloseTo(cuota, 12);
    expect(s.efficacy.value).toBeCloseTo(1 - modelo / cuota, 12);
  });
});

describe('Fórmulas de probabilidad', () => {
  it('Brier y log loss con valores cerrados', () => {
    const preds = [
      { p: 0.8, o: 1 as const },
      { p: 0.3, o: 0 as const },
    ];
    expect(brierScore(preds)).toBeCloseTo((0.04 + 0.09) / 2, 12);
    expect(logLoss(preds)).toBeCloseTo(-(Math.log(0.8) + Math.log(0.7)) / 2, 12);
    expect(brierScore([])).toBeNull();
  });

  it('log loss no explota con p = 0 o 1', () => {
    expect(Number.isFinite(logLoss([{ p: 0, o: 1 }])!)).toBe(true);
    expect(Number.isFinite(logLoss([{ p: 1, o: 0 }])!)).toBe(true);
  });

  it('calibración por tramos y ECE', () => {
    const preds = [
      { p: 0.62, o: 1 as const },
      { p: 0.68, o: 0 as const },
      { p: 0.15, o: 0 as const },
    ];
    const c = calibration(preds);
    const tramo = c.bins[6];
    expect(tramo.n).toBe(2);
    expect(tramo.meanProbability).toBeCloseTo(0.65, 12);
    expect(tramo.frequency).toBeCloseTo(0.5, 12);
    expect(c.ece).toBeCloseTo((2 / 3) * 0.15 + (1 / 3) * 0.15, 12);
  });
});

describe('Drawdown', () => {
  it('mayor caída desde el máximo, en importe y en % del bankroll en ese máximo', () => {
    const d = maxDrawdown([500, -200, -400, 300, -100], 10_000);
    expect(d.amount).toBe(600);
    expect(d.pct).toBeCloseTo(600 / 10_500, 12);
  });

  it('sin caídas: 0', () => {
    expect(maxDrawdown([100, 50], 10_000)).toEqual({ amount: 0, pct: 0 });
  });
});

describe('Rendimiento por mercado', () => {
  it('separa por familia y mantiene el signo del yield', () => {
    const bets = [bet('ganado', 100, 1.9, 0.55, 'corners'), bet('perdido', 100, 1.9, 0.55, 'tarjetas'), bet('perdido', 100, 2, 0.5, 'tarjetas')];
    const rows = groupPerformance(bets, (b) => [{ key: b.family, label: b.familyLabel }]);
    const corners = rows.find((r) => r.key === 'corners')!;
    const tarjetas = rows.find((r) => r.key === 'tarjetas')!;
    expect(corners.yield.value).toBeCloseTo(0.9, 12);
    expect(tarjetas.yield.value).toBe(-1);
    expect(tarjetas.hitRate.value).toBe(0);
  });
});
