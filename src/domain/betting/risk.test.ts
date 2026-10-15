import { describe, expect, it } from 'vitest';
import { assessPickRisk, assessTicketRisk, riskLevel, type PickRiskInput } from './risk';

const base: PickRiskInput = {
  probability: 0.62,
  odds: 1.8,
  edge: 0.064,
  family: 'goles',
  evidence: 0.75,
  coverage: null,
  dataQuality: 'alta',
  correlation: 'ninguna',
};

describe('Clasificación de riesgo', () => {
  it('umbrales: bajo < 40 ≤ medio < 65 ≤ alto', () => {
    expect(riskLevel(39)).toBe('bajo');
    expect(riskLevel(40)).toBe('medio');
    expect(riskLevel(64)).toBe('medio');
    expect(riskLevel(65)).toBe('alto');
  });

  it('componentes con su fórmula', () => {
    const r = assessPickRisk(base);
    expect(r.components.datos).toBe(25); // 100 · (1 − 0,75)
    expect(r.components.varianza).toBe(38); // 100 · (1 − 0,62)
    expect(r.components.mercado).toBe(30); // implícita 55,6 %
    expect(r.components.modelo).toBe(50); // edge 6,4 pp
    expect(r.components.correlacion).toBe(0);
    expect(r.score).toBe(Math.round(0.25 * 25 + 0.2 * 50 + 0.15 * 30 + 0.25 * 38));
  });

  it('pocos datos, cuota alta y probabilidad baja: alto', () => {
    const r = assessPickRisk({ ...base, probability: 0.3, odds: 4.5, edge: 0.078, evidence: 0.3, dataQuality: 'baja' });
    expect(r.level).toBe('alto');
  });

  it('calidad de datos baja: nunca riesgo bajo', () => {
    const r = assessPickRisk({ ...base, probability: 0.8, odds: 1.3, edge: 0.03, evidence: 0.9, dataQuality: 'baja' });
    expect(r.level).not.toBe('bajo');
  });

  it('correlación alta con un pick pendiente: alto', () => {
    expect(assessPickRisk({ ...base, correlation: 'alta' }).level).toBe('alto');
  });

  it('skill negativo en el backtest sube el riesgo de modelo; sin muestra suficiente no cuenta', () => {
    const sin = assessPickRisk(base);
    const negativo = assessPickRisk({ ...base, validation: { n: 700, skill: -0.05 } });
    expect(negativo.components.modelo).toBe(sin.components.modelo + 25);
    expect(negativo.notes.join(' ')).toContain('backtest');
    expect(assessPickRisk({ ...base, validation: { n: 12, skill: -0.3 } }).components.modelo).toBe(sin.components.modelo);
    expect(assessPickRisk({ ...base, validation: { n: 700, skill: 0.04 } }).components.modelo).toBe(sin.components.modelo);
  });

  it('tarjetas penalizan modelo y mercado', () => {
    const goles = assessPickRisk(base);
    const tarjetas = assessPickRisk({ ...base, family: 'tarjetas' });
    expect(tarjetas.components.modelo).toBeGreaterThan(goles.components.modelo);
    expect(tarjetas.components.mercado).toBeGreaterThan(goles.components.mercado);
  });

  it('ticket con alta probabilidad de fallo: alto', () => {
    const leg = assessPickRisk(base);
    const r = assessTicketRisk({ legs: [leg, leg, leg], combinedOdds: 5.8, probabilityLow: 0.2, correlation: 'ninguna' });
    expect(r.level).toBe('alto');
    expect(r.components.varianza).toBe(80);
  });
});
