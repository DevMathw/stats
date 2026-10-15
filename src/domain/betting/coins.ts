/**
 * Monedas: la unidad en la que se leen y se escriben los importes del simulador.
 * 1 moneda = `coinValue` SC (30.000 por defecto). Todo se guarda y se calcula en SC; las monedas
 * cambian cómo se muestra e introduce un importe.
 *
 * La unidad mínima es 0.01 monedas (`coinStep`), como el céntimo de una moneda real: depósitos,
 * saldo inicial, tope por pick, stakes y retornos son múltiplos de ella. PICKS_METHODOLOGY.md §6.
 */
import type { RiskSettings } from '../../types/betting';

export type MoneySettings = Pick<RiskSettings, 'coinValue' | 'currencyCode'>;

/** Espacio fino de miles: con punto de miles «10.000» se confundiría con 10, y no parte la cifra. */
const MILES = ' ';

function numero(x: number, decimales: number): string {
  const [ent, dec = ''] = Math.abs(x).toFixed(decimales).split('.');
  const d = dec.replace(/0+$/, '');
  return `${ent.replace(/\B(?=(\d{3})+(?!\d))/g, MILES)}${d ? `.${d}` : ''}`;
}

export function toCoins(sc: number, coinValue: number): number {
  return sc / coinValue;
}

/** SC de un importe en monedas, redondeado a céntimos. */
export function fromCoins(coins: number, coinValue: number): number {
  return Math.round(coins * coinValue * 100) / 100;
}

/** SC de 0.01 monedas: el importe mínimo. */
export function coinStep(coinValue: number): number {
  return coinValue / 100;
}

/**
 * Un importe en SC llevado a múltiplo de 0.01 monedas: al más cercano (retornos) o hacia abajo
 * (stakes, que nunca pueden pasar de lo que permiten Kelly y los topes).
 */
export function toCoinGrid(sc: number, coinValue: number, modo: 'round' | 'floor' = 'round'): number {
  const paso = coinStep(coinValue);
  // El margen evita que 0.29 / 0.01 = 28.999… baje un paso entero al redondear hacia abajo.
  const n = modo === 'floor' ? Math.floor(sc / paso + 1e-9) : Math.round(sc / paso);
  return Math.round(n * paso * 100) / 100;
}

export function isOnCoinGrid(sc: number, coinValue: number): boolean {
  return Math.abs(toCoinGrid(sc, coinValue) - sc) < 1e-6;
}

export function formatSc(sc: number, code: string, signed = false): string {
  const r = Math.round(sc * 100) / 100;
  return `${r < 0 ? '−' : signed && r > 0 ? '+' : ''}${numero(r, 2)} ${code}`;
}

/** Con 2 decimales como mucho. Un importe que no es 0 nunca se muestra como 0: «<0.01 monedas». */
export function formatCoins(sc: number, coinValue: number, signed = false): string {
  const c = sc / coinValue;
  const signo = c < 0 ? '−' : signed && c > 0 ? '+' : '';
  const r = Math.round(c * 100) / 100;
  const texto = r === 0 && sc !== 0 ? '<0.01' : numero(r, 2);
  return `${signo}${texto} ${texto === '1' ? 'moneda' : 'monedas'}`;
}

/** «+0.9 monedas (+27 000 SC)». */
export function formatAmount(sc: number, s: MoneySettings, signed = false): string {
  return `${formatCoins(sc, s.coinValue, signed)} (${formatSc(sc, s.currencyCode, signed)})`;
}

/** Un importe en SC escrito en monedas para un campo editable: hasta 2 decimales, sin separador de miles. */
export function coinsInputValue(sc: number, coinValue: number): string {
  return numero(sc / coinValue, 2).replaceAll(MILES, '');
}

/** SC de lo escrito en monedas (acepta coma decimal). `NaN` si no es un número. */
export function parseCoinsInput(text: string, coinValue: number): number {
  const t = text.trim().replace(',', '.');
  if (!t) return Number.NaN;
  const n = Number(t);
  return Number.isFinite(n) ? fromCoins(n, coinValue) : Number.NaN;
}
