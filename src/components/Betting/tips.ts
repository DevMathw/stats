import { MIN_LEAGUE_COUNT_SAMPLE } from '../../domain/betting/markets';
import { MIN_CONFIDENCE, PICK_MARKETS, PICK_PROBABILITY } from '../../domain/betting/modelPick';

/** Textos de los tooltips: qué significa cada número y qué NO significa. */
export const TIPS = {
  probEstimada:
    'Estimación del modelo, no un hecho: en partidos con estas cifras, el evento ocurriría esta proporción de veces si el modelo estuviera bien calibrado. Compruébalo en Historial → Backtesting.',
  probImplicita:
    'Probabilidad que paga la cuota: 1 / cuota. Incluye el margen de la casa, así que suele quedar algo por encima de la real.',
  edge:
    'Probabilidad estimada menos implícita, en puntos porcentuales. «Edge +5.4 pp» significa que el modelo ve el evento 5.4 puntos más probable de lo que paga la cuota. No garantiza ganar: solo compara dos probabilidades.',
  cuotaJusta: 'Cuota que haría el pick neutro según el modelo: 1 / probabilidad estimada. Por encima hay valor potencial; por debajo, no.',
  cuotaMinima: 'Cuota más baja que alcanza el edge mínimo de tu configuración de riesgo: 1 / (probabilidad − edge mínimo).',
  valorEsperado:
    'Beneficio medio por cada unidad apostada si la probabilidad estimada fuera la verdadera: p · cuota − 1. Es una media a largo plazo, no lo que va a pasar en este pick.',
  kellyCompleto:
    'Fracción del bankroll que maximiza el crecimiento a largo plazo SI la probabilidad fuera exacta: (b·p − q) / b. Como la probabilidad es una estimación, solo se muestra como análisis: nunca fija el stake.',
  kellyAplicado:
    'Kelly completo × la fracción elegida (Half 0,5 · Quarter 0,25) y reducido si hay correlación con otro pick del mismo partido. Después se aplican los topes de riesgo.',
  stake: 'Importe virtual recomendado tras Kelly y todos los límites (por pick, diario, por partido, por competición y saldo), en monedas y su equivalencia en SC. Mínimo 1 moneda: si los límites no dejan ni eso, no hay stake. Moneda interna sin valor real.',
  moneda:
    'Unidad en la que se leen stakes, ganancias y pérdidas. 1 moneda = el número de SC configurado (30 000 por defecto), y el importe mínimo es 0.01 monedas. Entre paréntesis va siempre la equivalencia en SC, que es lo que se guarda.',
  confianza:
    'De 0 a 10: cuánta evidencia respalda la estimación (partidos de cada equipo en su condición y cobertura del dato). No es la probabilidad de acertar. No llega a 10: ninguna muestra da certeza.',
  calidad:
    'Alta: 10 o más partidos de cada equipo y el dato en el 90 % o más. Media: 5 o más y el 60 % o más. Baja: por debajo. Insuficiente: menos que la muestra mínima configurada.',
  riesgo:
    'Score de 0 a 100 = 25 % datos + 20 % modelo + 15 % mercado + 25 % varianza + 15 % correlación. Bajo < 40 ≤ medio < 65 ≤ alto.',
  rango: 'Intervalo que contiene el 80 % central de la distribución del modelo. No es un pronóstico de que acabe dentro.',
  acierto:
    'Picks ganados / (ganados + perdidos). Los anulados no cuentan. Un 64 % de acierto no significa rentabilidad: con cuotas bajas se puede acertar mucho y perder dinero.',
  yield: 'Beneficio neto / total apostado en picks liquidados. Rentabilidad por unidad apostada.',
  roi: 'Beneficio neto / capital aportado (saldo inicial + depósitos del ciclo). Rentabilidad sobre el bankroll.',
  eficacia:
    'Eficacia vs cuota = 1 − Brier del modelo / Brier de la probabilidad implícita, sobre los mismos picks. Positiva: las probabilidades del modelo estuvieron más cerca de los resultados que las de las cuotas. Negativa: peor que fiarse de la cuota. Exige 20 picks liquidados.',
  brier: 'Media de (probabilidad − resultado)², con resultado 1 si ganó y 0 si perdió. 0 es perfecto; 0,25 es lo que da decir siempre 50 %.',
  logLoss: 'Penaliza mucho las probabilidades altas que fallan. Más bajo es mejor; 0,693 equivale a decir siempre 50 %.',
  ece: 'Error de calibración: diferencia media entre la probabilidad estimada y la frecuencia real, por tramos de 10 puntos. Exige 50 picks.',
  drawdown: 'Mayor caída del beneficio acumulado desde su máximo, en moneda virtual y en % del bankroll en ese máximo.',
  profitFactor: 'Ganancias acumuladas / pérdidas acumuladas. Por encima de 1, se ganó más de lo que se perdió.',
  sharpe:
    'Rentabilidad media por pick / su desviación típica. No está anualizado: sirve para comparar estrategias del simulador entre sí. Exige 20 picks.',
  comprometido: 'Stake de picks y tickets pendientes: ya no está disponible, pero tampoco se ha perdido.',
  unidad: 'Valor de 1 unidad = el % configurado del saldo inicial. Permite comparar resultados con bankrolls distintos.',
  probCombinada:
    'Probabilidad de que acierten todas. Entre partidos distintos se multiplican; en el mismo partido se usa la conjunta exacta del modelo o, si no es estimable, el rango posible para cualquier dependencia.',
  pickModelo: `Sin cuotas, la referencia es con qué frecuencia se ha dado cada mercado en los partidos jugados de la liga. Compiten ${PICK_MARKETS.length} mercados. Queda fuera, con su motivo, el que tenga datos insuficientes, calidad baja o confianza menor que ${MIN_CONFIDENCE}/10; probabilidad fuera del ${PICK_PROBABILITY.min * 100}–${PICK_PROBABILITY.max * 100} % o por debajo de tu mínima; skill negativo en el backtest; menos de ${MIN_LEAGUE_COUNT_SAMPLE} partidos de la liga con el dato; una ventaja sobre la liga menor que tu edge mínimo; o riesgo alto. Gana la mayor ventaja ajustada por confianza, (probabilidad − frecuencia en la liga) · confianza / 10. Si no queda ninguno, no hay pick.`,
  ventajaLiga:
    'Probabilidad del modelo para este partido menos la frecuencia con la que ese mercado se ha dado en los partidos jugados de la liga. Mide cuánto se sale este partido de lo habitual; no es el edge frente a la cuota de una casa.',
} as const;
