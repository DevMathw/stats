/**
 * Clasificación de riesgo 0–100 con cinco componentes. PICKS_METHODOLOGY.md §7.
 *
 * Es una regla fija y visible, no un modelo aprendido: cada componente dice de dónde sale.
 *
 *   datos       100 · (1 − evidencia · cobertura)
 *   modelo      tamaño del edge (uno enorme suele ser error del modelo) + limitación del mercado
 *   mercado     nivel de la cuota (cuanto más alta, más volátil)
 *   varianza    100 · probabilidad estimada de perder
 *   correlación con los picks pendientes del mismo partido
 *
 *   score = 0,25·datos + 0,20·modelo + 0,15·mercado + 0,25·varianza + 0,15·correlación
 *   bajo < 40 ≤ medio < 65 ≤ alto
 *
 * Reglas encima del score: tres componentes ≥ 60 → alto; calidad de datos baja → al menos medio;
 * correlación alta con un pick pendiente → alto.
 */
import type {
  CorrelationLevel,
  DataQuality,
  MarketFamily,
  RiskAssessment,
  RiskComponents,
  RiskLevel,
} from '../../types/betting';

export const RISK_WEIGHTS: RiskComponents = {
  datos: 0.25,
  modelo: 0.2,
  mercado: 0.15,
  varianza: 0.25,
  correlacion: 0.15,
};

/**
 * Lo que el modelo no ve de cada mercado. Los hándicaps añaden al 1X2 un supuesto sin validar: que el
 * tamaño del margen sigue a Poisson. Los goles por parte, uno pequeño: que cada partido reparte sus goles
 * como su liga (encaja en la muestra; el backtest dirá si predice).
 */
const FAMILY_PENALTY: Record<MarketFamily, number> = {
  goles: 0,
  mitad: 5,
  btts: 0,
  equipo: 0,
  cero: 0,
  resultado: 5,
  doble: 5,
  asiatico: 10,
  europeo: 10,
  corners: 15,
  tarjetas: 25,
  // Mismo método que corners (fuerzas por condición + binomial negativa con el φ de la liga), así que
  // de momento el mismo castigo. El backtest de `/historial` dirá si merecen otro.
  tiros: 15,
  sot: 15,
  /**
   * El conteo de UN equipo añade un supuesto que el total no tiene: que el reparto entre los dos
   * equipos sigue a las fuerzas por condición. Y su dispersión es mayor (φ 2,18 en tiros por equipo
   * frente a 1,42 en el total), así que la probabilidad es menos fiable. 25, como las tarjetas.
   */
  conteoEquipo: 25,
};

const CORRELATION_RISK: Record<CorrelationLevel, number> = {
  ninguna: 0,
  baja: 15,
  media: 40,
  alta: 75,
  excluyente: 100,
  identica: 100,
};

const clamp = (x: number) => Math.max(0, Math.min(100, Math.round(x)));

export function riskLevel(score: number): RiskLevel {
  return score < 40 ? 'bajo' : score < 65 ? 'medio' : 'alto';
}

export function marketRisk(odds: number): number {
  const implied = 1 / odds;
  return implied >= 0.6 ? 15 : implied >= 0.45 ? 30 : implied >= 0.3 ? 50 : implied >= 0.2 ? 70 : 90;
}

function edgeRisk(edge: number): number {
  const e = Math.abs(edge);
  return e < 0.03 ? 15 : e < 0.06 ? 30 : e < 0.1 ? 50 : 75;
}

function score(c: RiskComponents): number {
  return clamp(
    c.datos * RISK_WEIGHTS.datos +
      c.modelo * RISK_WEIGHTS.modelo +
      c.mercado * RISK_WEIGHTS.mercado +
      c.varianza * RISK_WEIGHTS.varianza +
      c.correlacion * RISK_WEIGHTS.correlacion,
  );
}

const ORDEN: RiskLevel[] = ['bajo', 'medio', 'alto'];
const alMenos = (l: RiskLevel, min: RiskLevel): RiskLevel => (ORDEN.indexOf(l) < ORDEN.indexOf(min) ? min : l);

export interface PickRiskInput {
  probability: number;
  odds: number;
  edge: number;
  family: MarketFamily;
  evidence: number;
  coverage: number | null;
  dataQuality: DataQuality;
  correlation: CorrelationLevel;
  /** Último backtest de este mercado, si se ha ejecutado. */
  validation?: { n: number; skill: number | null };
}

/** Con skill negativo en el backtest el modelo no ha demostrado aportar en ese mercado. */
export const NEGATIVE_SKILL_PENALTY = 25;

/** Skill negativo con al menos 30 predicciones: con menos, el backtest no dice nada del mercado. */
export function negativeSkill(v?: { n: number; skill: number | null }): boolean {
  return v?.skill != null && v.n >= 30 && v.skill < 0;
}

export function assessPickRisk(i: PickRiskInput): RiskAssessment {
  const sinSkill = negativeSkill(i.validation);
  const components: RiskComponents = {
    datos: clamp(100 * (1 - i.evidence * (i.coverage ?? 1))),
    modelo: clamp(edgeRisk(i.edge) + FAMILY_PENALTY[i.family] + (sinSkill ? NEGATIVE_SKILL_PENALTY : 0)),
    mercado: clamp(marketRisk(i.odds) + (i.family === 'tarjetas' ? 10 : 0)),
    varianza: clamp(100 * (1 - i.probability)),
    correlacion: CORRELATION_RISK[i.correlation],
  };
  const s = score(components);
  let level = riskLevel(s);
  const notes: string[] = [];
  const altos = [components.datos, components.modelo, components.mercado, components.varianza].filter((c) => c >= 60).length;
  if (altos >= 3) {
    level = 'alto';
    notes.push('Tres o más componentes altos (≥ 60): pocos datos, cuota volátil o probabilidad baja a la vez.');
  }
  if (i.dataQuality === 'baja') {
    level = alMenos(level, 'medio');
    notes.push('Calidad de datos baja: el riesgo no baja de medio.');
  }
  if (i.correlation === 'alta') {
    level = 'alto';
    notes.push('Correlación alta con un pick pendiente del mismo partido.');
  }
  if (sinSkill) notes.push(`En el último backtest este mercado tuvo skill ${(i.validation!.skill! * 100).toFixed(1)} % (n = ${i.validation!.n}): el modelo no mejoró a la frecuencia base.`);
  if (Math.abs(i.edge) >= 0.1) notes.push('Edge de 10 pp o más: con más frecuencia es un error del modelo que valor real.');
  if (i.family === 'tarjetas') notes.push('Las tarjetas dependen del árbitro, que el modelo no conoce.');
  return { score: s, level, components, notes };
}

export function assessTicketRisk(input: {
  legs: RiskAssessment[];
  combinedOdds: number;
  /** Probabilidad conjunta conservadora (la cota inferior si no es estimable). */
  probabilityLow: number;
  correlation: CorrelationLevel;
}): RiskAssessment {
  const max = (k: keyof RiskComponents) => Math.max(0, ...input.legs.map((l) => l.components[k]));
  const components: RiskComponents = {
    datos: max('datos'),
    modelo: max('modelo'),
    mercado: marketRisk(input.combinedOdds),
    varianza: clamp(100 * (1 - input.probabilityLow)),
    correlacion: CORRELATION_RISK[input.correlation],
  };
  const extraSelecciones = Math.max(0, input.legs.length - 2) * 3;
  const s = clamp(score(components) + extraSelecciones);
  let level = riskLevel(s);
  const notes: string[] = [];
  if (1 - input.probabilityLow >= 0.75) {
    level = 'alto';
    notes.push('Tres de cada cuatro tickets así fallarían al menos una selección.');
  }
  if (input.legs.some((l) => l.level === 'alto')) {
    level = alMenos(level, 'medio');
    notes.push('Incluye una selección de riesgo alto.');
  }
  if (extraSelecciones) notes.push(`${input.legs.length} selecciones: cada una añade una forma de perder el ticket.`);
  return { score: s, level, components, notes };
}
