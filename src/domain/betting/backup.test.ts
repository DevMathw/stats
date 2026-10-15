import { describe, expect, it } from 'vitest';
import { sanitizeProfile } from './backup';

describe('Perfiles guardados antes de las centésimas de moneda', () => {
  it('el saldo inicial y el tope se llevan a 0.01 monedas sin descartar la configuración', () => {
    const issues: string[] = [];
    const p = sanitizeProfile({ id: 'p', name: 'P', cycle: 1, settings: { initialBankroll: 1_000_000, maxStakePerPick: 45_100 } }, issues);
    expect(p?.settings.initialBankroll).toBe(999_900); // 33.3333 → 33.33 monedas
    expect(p?.settings.maxStakePerPick).toBe(45_000); // 1.5033 → 1.5 monedas
    expect(issues).toEqual([]);
  });
});
