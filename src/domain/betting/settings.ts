import type { RiskSettings } from '../../types/betting';
import { isOnCoinGrid } from './coins';

/**
 * Configuración inicial de riesgo. Half Kelly recomendado, topes conservadores. Todo editable en
 * Bankroll → Gestión de riesgo.
 */
export const DEFAULT_RISK_SETTINGS: RiskSettings = {
  currencyName: 'SportCoins',
  currencyCode: 'SC',
  coinValue: 30_000,
  // 30 monedas.
  initialBankroll: 900_000,
  unitPct: 0.01,
  kellyMode: 'half',
  customFraction: 0.33,
  maxKellyPct: 0.05,
  maxStakePerPick: null,
  maxDailyExposurePct: 0.15,
  maxMatchExposurePct: 0.05,
  maxCompetitionExposurePct: 0.2,
  minProbability: 0.25,
  minEdge: 0.02,
  maxOdds: 10,
  minSample: 3,
};

const fraccion = (x: number, lo: number, hi: number) => Number.isFinite(x) && x >= lo && x <= hi;

/** Lista de problemas; vacía si la configuración es coherente. */
export function validateSettings(s: RiskSettings): string[] {
  const out: string[] = [];
  if (!s.currencyName.trim()) out.push('La moneda necesita un nombre.');
  if (!/^[A-Za-z]{1,5}$/.test(s.currencyCode)) out.push('El código de la moneda: de 1 a 5 letras.');
  const monedaValida = Number.isInteger(s.coinValue) && s.coinValue >= 1 && s.coinValue <= 1e9;
  if (!monedaValida) out.push('El valor de 1 moneda: un número entero de SC entre 1 y 1.000.000.000.');
  // Importes en múltiplos de 0.01 monedas. Sin un valor de moneda válido, esa parte no se comprueba.
  const importe = (x: number) => Number.isFinite(x) && x > 0 && x <= 1e9 && (!monedaValida || isOnCoinGrid(x, s.coinValue));
  if (!importe(s.initialBankroll))
    out.push('El saldo inicial: mayor que 0, con 2 decimales como mucho en monedas y hasta 1.000.000.000 SC.');
  if (!fraccion(s.unitPct, 0.001, 0.2)) out.push('La unidad: entre el 0,1 % y el 20 % del saldo inicial.');
  if (!fraccion(s.customFraction, 0.01, 0.5))
    out.push('La fracción de Kelly personalizada: entre 0,01 y 0,5 (Kelly completo solo en análisis).');
  if (!fraccion(s.maxKellyPct, 0.001, 0.25)) out.push('El stake máximo por pick: entre el 0,1 % y el 25 % del bankroll.');
  if (s.maxStakePerPick !== null && !importe(s.maxStakePerPick))
    out.push('El tope absoluto por pick: mayor que 0 y con 2 decimales como mucho en monedas.');
  if (!fraccion(s.maxDailyExposurePct, 0.001, 1)) out.push('La exposición diaria: entre el 0,1 % y el 100 %.');
  if (!fraccion(s.maxMatchExposurePct, 0.001, 1)) out.push('La exposición por partido: entre el 0,1 % y el 100 %.');
  if (!fraccion(s.maxCompetitionExposurePct, 0.001, 1))
    out.push('La exposición por competición: entre el 0,1 % y el 100 %.');
  if (s.maxMatchExposurePct < s.maxKellyPct)
    out.push('La exposición por partido no puede ser menor que el stake máximo por pick.');
  if (!fraccion(s.minProbability, 0.01, 0.95)) out.push('La probabilidad mínima: entre el 1 % y el 95 %.');
  if (!fraccion(s.minEdge, 0, 0.5)) out.push('El edge mínimo: entre 0 y 50 puntos.');
  if (!Number.isFinite(s.maxOdds) || s.maxOdds <= 1.01 || s.maxOdds > 1000) out.push('La cuota máxima: entre 1,01 y 1000.');
  if (!Number.isInteger(s.minSample) || s.minSample < 1 || s.minSample > 30)
    out.push('La muestra mínima: un entero entre 1 y 30 partidos.');
  return out;
}
