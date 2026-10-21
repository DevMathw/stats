import { describe, expect, it } from 'vitest';
import { bandaDe, fraccionDeStake, importeDeStake, stakeDeFraccion, stakeDeImporte } from './stakeScale';

describe('escala de stake 1–100', () => {
  it('un punto de la escala es un 1 % del bank', () => {
    // Los mismos números del sistema: bank de 1.000.000, stake 1 → 10.000.
    expect(importeDeStake(1, 1_000_000)).toBe(10_000);
    expect(importeDeStake(5, 1_000_000)).toBe(50_000);
    expect(importeDeStake(10, 1_000_000)).toBe(100_000);
    expect(importeDeStake(100, 1_000_000)).toBe(1_000_000);
    // Y con otro bank, la misma escala da otros importes.
    expect(importeDeStake(1, 5_000_000)).toBe(50_000);
    expect(importeDeStake(70, 5_000_000)).toBe(3_500_000);
  });

  it('va y vuelve entre fracción y escala', () => {
    expect(stakeDeFraccion(0.03)).toBeCloseTo(3, 10);
    expect(fraccionDeStake(3)).toBeCloseTo(0.03, 10);
    expect(stakeDeFraccion(fraccionDeStake(42))).toBeCloseTo(42, 10);
  });

  it('el stake de un importe sale del bank de ESE momento', () => {
    expect(stakeDeImporte(25_000, 1_000_000)).toBeCloseTo(2.5, 10);
    // El mismo importe con el bank al doble es la mitad de stake: por eso se guarda `bankrollBefore`.
    expect(stakeDeImporte(25_000, 2_000_000)).toBeCloseTo(1.25, 10);
  });

  /*
   * Sin bank no hay escala. Devolver 0 o Infinity aquí acabaría pintando «stake 0» o «stake ∞» en una
   * pantalla de dinero, que es justo donde un número inventado hace daño.
   */
  it('sin bank no hay stake que calcular', () => {
    expect(stakeDeImporte(10_000, 0)).toBeNull();
    expect(stakeDeImporte(10_000, -5)).toBeNull();
    expect(stakeDeImporte(Number.NaN, 1_000)).toBeNull();
  });

  it('las bandas son las que recomienda el sistema', () => {
    expect(bandaDe(1)).toBe('conservador');
    expect(bandaDe(10)).toBe('conservador');
    expect(bandaDe(10.1)).toBe('moderado');
    expect(bandaDe(19)).toBe('moderado');
    expect(bandaDe(20)).toBe('agresivo');
    expect(bandaDe(100)).toBe('agresivo');
    // Más del bank entero: el sistema lo lista como error, no como una banda más.
    expect(bandaDe(100.5)).toBe('excesivo');
  });
});
