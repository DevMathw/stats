import { describe, expect, it } from 'vitest';
import {
  coinStep,
  coinsInputValue,
  formatAmount,
  formatCoins,
  formatSc,
  fromCoins,
  isOnCoinGrid,
  parseCoinsInput,
  toCoinGrid,
  toCoins,
} from './coins';

const S = { coinValue: 30_000, currencyCode: 'SC' };
/** Espacio fino de miles. */
const M = ' ';

describe('Monedas (1 moneda = 30.000 SC)', () => {
  it('conversión en los dos sentidos', () => {
    expect(toCoins(30_000, 30_000)).toBe(1);
    expect(toCoins(315, 30_000)).toBeCloseTo(0.0105, 12);
    expect(fromCoins(0.5, 30_000)).toBe(15_000);
    // Se redondea a céntimos de SC.
    expect(fromCoins(0.016667, 30_000)).toBe(500.01);
  });

  it('formato con 2 decimales como mucho', () => {
    expect(formatCoins(900_000, 30_000)).toBe('30 monedas');
    expect(formatCoins(910_000, 30_000)).toBe('30.33 monedas');
    expect(formatCoins(30_000, 30_000)).toBe('1 moneda');
    expect(formatCoins(39_000, 30_000)).toBe('1.3 monedas');
    expect(formatCoins(500, 30_000)).toBe('0.02 monedas');
    expect(formatCoins(30_000_000, 30_000)).toBe(`1${M}000 monedas`);
    expect(formatCoins(0, 30_000)).toBe('0 monedas');
  });

  it('un importe que no es 0 no se muestra como 0', () => {
    expect(formatCoins(100, 30_000)).toBe('<0.01 monedas');
  });

  it('ganancias y pérdidas con signo', () => {
    expect(formatCoins(27_000, 30_000, true)).toBe('+0.9 monedas');
    expect(formatCoins(-9_900, 30_000)).toBe('−0.33 monedas');
  });

  it('SC con espacio fino de miles y céntimos solo si los hay', () => {
    expect(formatSc(10_000, 'SC')).toBe(`10${M}000 SC`);
    expect(formatSc(622.71, 'SC')).toBe('622.71 SC');
    expect(formatSc(-350, 'SC')).toBe('−350 SC');
  });

  it('importe completo: monedas y su equivalencia en SC', () => {
    expect(formatAmount(27_000, S, true)).toBe(`+0.9 monedas (+27${M}000 SC)`);
    expect(formatAmount(30_000, S)).toBe(`1 moneda (30${M}000 SC)`);
  });

  it('lo escrito en monedas se guarda en SC', () => {
    expect(parseCoinsInput('0,5', 30_000)).toBe(15_000);
    expect(parseCoinsInput(' 2 ', 30_000)).toBe(60_000);
    expect(parseCoinsInput('', 30_000)).toBeNaN();
    expect(parseCoinsInput('abc', 30_000)).toBeNaN();
  });

  it('valor de un campo editable: 2 decimales como mucho', () => {
    expect(coinsInputValue(49_800, 30_000)).toBe('1.66');
    expect(coinsInputValue(1_000_000, 30_000)).toBe('33.33');
    expect(coinsInputValue(37_035_000, 30_000)).toBe('1234.5');
  });
});

describe('Importe mínimo: 0.01 monedas', () => {
  it('con 1 moneda = 30.000 SC son 300 SC', () => {
    expect(coinStep(30_000)).toBe(300);
    expect(isOnCoinGrid(15_000, 30_000)).toBe(true);
    expect(isOnCoinGrid(350, 30_000)).toBe(false);
  });

  it('redondeo al más cercano y hacia abajo', () => {
    // 0.6845 monedas → 0.68
    expect(toCoinGrid(20_535, 30_000)).toBe(20_400);
    // 1.6667 monedas → 1.66 hacia abajo
    expect(toCoinGrid(50_000, 30_000, 'floor')).toBe(49_800);
    expect(toCoinGrid(49_800, 30_000, 'floor')).toBe(49_800);
  });

  it('con 1 moneda = 1 SC el mínimo es el céntimo', () => {
    expect(toCoinGrid(1.666, 1, 'floor')).toBe(1.66);
    expect(toCoinGrid(0.29, 1, 'floor')).toBe(0.29);
    expect(isOnCoinGrid(12.5, 1)).toBe(true);
  });
});
