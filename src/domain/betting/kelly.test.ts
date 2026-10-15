import { describe, expect, it } from 'vitest';
import type { RiskSettings } from '../../types/betting';
import { kellyFraction, recommendStake, type StakeContext } from './kelly';
import { DEFAULT_RISK_SETTINGS, validateSettings } from './settings';

/** Topes holgados: así cada prueba controla el único límite que quiere comprobar. */
const HOLGADO: RiskSettings = {
  ...DEFAULT_RISK_SETTINGS,
  // 1 moneda = 100 SC: el importe mínimo es 1 SC, así los stakes de estas pruebas son enteros.
  coinValue: 100,
  maxKellyPct: 0.25,
  maxDailyExposurePct: 1,
  maxMatchExposurePct: 1,
  maxCompetitionExposurePct: 1,
};

function ctx(over: Partial<StakeContext> = {}, settings: Partial<RiskSettings> = {}): StakeContext {
  return {
    probability: 0.55,
    odds: 2,
    settings: { ...HOLGADO, ...settings },
    bankroll: 10_000,
    available: 10_000,
    exposure: { day: 0, match: 0, competition: 0 },
    correlation: 'ninguna',
    dataQuality: 'alta',
    ...over,
  };
}

describe('Fórmula de Kelly', () => {
  it('ejemplo: cuota 2.00 y p = 55 % → f* = 10 %', () => {
    expect(kellyFraction(0.55, 2)).toBeCloseTo(0.1, 12);
  });

  it('coincide con (b·p − q) / b en otros casos', () => {
    const [p, odds] = [0.6, 1.85];
    const b = odds - 1;
    expect(kellyFraction(p, odds)).toBeCloseTo((b * p - (1 - p)) / b, 12);
  });

  it('Kelly negativo sin edge', () => {
    expect(kellyFraction(0.45, 2)).toBeLessThan(0);
  });
});

describe('Recomendación de stake', () => {
  it('Half Kelly por defecto: 10 % × 0,5 = 5 % de 10.000 = 500', () => {
    const r = recommendStake(ctx());
    expect(r.status).toBe('recomendado');
    expect(r.kellyFull).toBeCloseTo(0.1, 12);
    expect(r.kellyHalf).toBeCloseTo(0.05, 12);
    expect(r.kellyQuarter).toBeCloseTo(0.025, 12);
    expect(r.stake).toBe(500);
    expect(r.bindingLimit).toBe('kelly');
  });

  it('Quarter y fracción personalizada', () => {
    expect(recommendStake(ctx({}, { kellyMode: 'quarter' })).stake).toBe(250);
    expect(recommendStake(ctx({}, { kellyMode: 'custom', customFraction: 0.2 })).stake).toBe(200);
  });

  it('el máximo registrable nunca pasa de Kelly completo', () => {
    expect(recommendStake(ctx()).maxAllowedStake).toBe(1000);
  });

  it('1. Kelly negativo: sin valor y sin stake', () => {
    const r = recommendStake(ctx({ probability: 0.45 }));
    expect(r.status).toBe('sin-valor');
    expect(r.stake).toBe(0);
    expect(r.reasons[0]).toContain('Sin valor estadístico suficiente');
  });

  it('2. Probabilidad 0 %: sin valor, nunca stake negativo', () => {
    const r = recommendStake(ctx({ probability: 0 }));
    expect(r.status).toBe('sin-valor');
    expect(r.stake).toBe(0);
    expect(r.kellyFull).toBeLessThan(0);
  });

  it('3. Probabilidad 100 %: bloqueado', () => {
    const r = recommendStake(ctx({ probability: 1 }));
    expect(r.status).toBe('bloqueado');
    expect(r.stake).toBe(0);
  });

  it.each([[Number.NaN], [Number.POSITIVE_INFINITY], [1], [0.8], [0]])('4-5. cuota no válida (%s): bloqueado', (odds) => {
    const r = recommendStake(ctx({ odds }));
    expect(r.status).toBe('bloqueado');
    expect(r.stake).toBe(0);
  });

  it('6. Bankroll vacío: bloqueado', () => {
    const r = recommendStake(ctx({ bankroll: 0, available: 0 }));
    expect(r.status).toBe('bloqueado');
    expect(r.reasons[0]).toContain('Bankroll vacío');
  });

  it('7. Stake superior al saldo: se limita al disponible', () => {
    const r = recommendStake(ctx({ available: 120 }));
    expect(r.stake).toBe(120);
    expect(r.bindingLimit).toBe('saldo');
  });

  it('11. Datos insuficientes: no evalúa', () => {
    expect(recommendStake(ctx({ probability: null })).status).toBe('datos-insuficientes');
    expect(recommendStake(ctx({ dataQuality: 'insuficiente' })).status).toBe('datos-insuficientes');
  });

  it('edge por debajo del mínimo: sin valor', () => {
    const r = recommendStake(ctx({ probability: 0.51 }));
    expect(r.status).toBe('sin-valor');
    expect(r.kellyFull).toBeGreaterThan(0);
  });

  it('probabilidad por debajo del mínimo: bloqueado aunque haya edge', () => {
    const r = recommendStake(ctx({ probability: 0.2, odds: 6 }));
    expect(r.kellyFull).toBeGreaterThan(0);
    expect(r.status).toBe('bloqueado');
  });

  it('cuota por encima de la máxima: bloqueado', () => {
    const r = recommendStake(ctx({ probability: 0.3, odds: 12 }));
    expect(r.status).toBe('bloqueado');
    expect(r.reasons[0]).toContain('no factible');
  });
});

describe('Límites de exposición', () => {
  it('Kelly máximo permitido por pick', () => {
    const r = recommendStake(ctx({}, { maxKellyPct: 0.02 }));
    expect(r.stake).toBe(200);
    expect(r.bindingLimit).toBe('maxKelly');
  });

  it('tope absoluto por pick', () => {
    const r = recommendStake(ctx({}, { maxStakePerPick: 150 }));
    expect(r.stake).toBe(150);
    expect(r.bindingLimit).toBe('maxStake');
  });

  it('exposición diaria: solo queda lo que falta hasta el tope', () => {
    const r = recommendStake(ctx({ exposure: { day: 1400, match: 0, competition: 0 } }, { maxDailyExposurePct: 0.15 }));
    expect(r.stake).toBe(100);
    expect(r.bindingLimit).toBe('diario');
  });

  it('exposición por partido agotada: bloqueado', () => {
    const r = recommendStake(ctx({ exposure: { day: 0, match: 500, competition: 0 } }, { maxMatchExposurePct: 0.05 }));
    expect(r.status).toBe('bloqueado');
    expect(r.bindingLimit).toBe('partido');
  });

  it('exposición por competición', () => {
    const r = recommendStake(ctx({ exposure: { day: 0, match: 0, competition: 1_900 } }, { maxCompetitionExposurePct: 0.2 }));
    expect(r.stake).toBe(100);
    expect(r.bindingLimit).toBe('competicion');
  });
});

describe('Protección contra correlación', () => {
  it('correlación alta: Kelly a la mitad', () => {
    const r = recommendStake(ctx({ correlation: 'alta' }));
    expect(r.stake).toBe(250);
    expect(r.bindingLimit).toBe('correlacion');
  });

  it('correlación media: Kelly al 75 %', () => {
    expect(recommendStake(ctx({ correlation: 'media' })).stake).toBe(375);
  });

  it('pick duplicado o excluyente: bloqueado', () => {
    expect(recommendStake(ctx({ correlation: 'identica' })).status).toBe('bloqueado');
    expect(recommendStake(ctx({ correlation: 'excluyente' })).status).toBe('bloqueado');
  });
});

describe('Configuración de riesgo', () => {
  it('la configuración por defecto es válida', () => {
    expect(validateSettings(DEFAULT_RISK_SETTINGS)).toEqual([]);
  });

  it('Kelly completo no se puede usar como fracción personalizada', () => {
    expect(validateSettings({ ...DEFAULT_RISK_SETTINGS, customFraction: 1 })).not.toEqual([]);
  });

  it('1 moneda = 30.000 SC por defecto, y su valor es un entero positivo', () => {
    expect(DEFAULT_RISK_SETTINGS.coinValue).toBe(30_000);
    expect(validateSettings({ ...DEFAULT_RISK_SETTINGS, coinValue: 0 })).not.toEqual([]);
    expect(validateSettings({ ...DEFAULT_RISK_SETTINGS, coinValue: 1.5 })).not.toEqual([]);
  });

  it('rechaza saldos y topes incoherentes', () => {
    expect(validateSettings({ ...DEFAULT_RISK_SETTINGS, initialBankroll: -5 })).not.toEqual([]);
    expect(validateSettings({ ...DEFAULT_RISK_SETTINGS, maxMatchExposurePct: 0.01, maxKellyPct: 0.05 })).not.toEqual([]);
  });

  it('saldo inicial y tope por pick en múltiplos de 0.01 monedas', () => {
    expect(DEFAULT_RISK_SETTINGS.initialBankroll).toBe(900_000); // 30 monedas
    expect(validateSettings({ ...DEFAULT_RISK_SETTINGS, initialBankroll: 1_000_000 })).not.toEqual([]); // 33.3333…
    expect(validateSettings({ ...DEFAULT_RISK_SETTINGS, initialBankroll: 999_900 })).toEqual([]); // 33.33
    expect(validateSettings({ ...DEFAULT_RISK_SETTINGS, maxStakePerPick: 150 })).not.toEqual([]);
    expect(validateSettings({ ...DEFAULT_RISK_SETTINGS, maxStakePerPick: 45_000 })).toEqual([]); // 1.5
  });
});

describe('Stake en centésimas de moneda (1 moneda = 30.000 SC)', () => {
  const monedas = (over: Partial<StakeContext>) => ctx(over, { coinValue: 30_000 });

  it('se redondea hacia abajo a 0.01 monedas', () => {
    // Half Kelly: 5 % de 1.000.000 SC = 50.000 SC = 1.6667 monedas → 1.66
    const r = recommendStake(monedas({ bankroll: 1_000_000, available: 1_000_000 }));
    expect(r.stake).toBe(49_800);
    // Kelly completo: 100.000 SC = 3.3333 monedas → 3.33
    expect(r.maxAllowedStake).toBe(99_900);
  });

  it('stake mínimo de 1 moneda: si los límites dejan menos, el pick queda bloqueado', () => {
    // Caso real: 15 % de 990.000 SC = 148.500; con 120.000 ya pendientes hoy solo quedan 28.500 SC = 0.95 monedas.
    const r = recommendStake(
      ctx({ bankroll: 990_000, available: 870_000, exposure: { day: 120_000, match: 0, competition: 0 } }, { coinValue: 30_000, maxDailyExposurePct: 0.15 }),
    );
    expect(r.status).toBe('bloqueado');
    expect(r.stake).toBe(0);
    expect(r.bindingLimit).toBe('diario');
    expect(r.reasons[0]).toContain('0.95 monedas');
  });

  it('la fracción de Kelly por debajo de 1 moneda sube al mínimo si Kelly completo y los topes lo cubren', () => {
    // Half Kelly: 5 % de 400.000 SC = 20.000 SC (0.67 monedas); Kelly completo 40.000 SC (1.33 monedas).
    const r = recommendStake(monedas({ bankroll: 400_000, available: 400_000 }));
    expect(r.status).toBe('recomendado');
    expect(r.stake).toBe(30_000);
    expect(r.bindingLimit).toBe('minimo');
  });

  it('ni Kelly completo llega a 1 moneda: no se recomienda stake', () => {
    // Kelly completo: 10 % de 250.000 SC = 25.000 SC (0.83 monedas).
    const r = recommendStake(monedas({ bankroll: 250_000, available: 250_000 }));
    expect(r.status).toBe('sin-valor');
    expect(r.stake).toBe(0);
  });
});
