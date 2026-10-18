import { describe, expect, it } from 'vitest';
import type { Selection } from '../../types/betting';
import { MARKET_FAMILIES, marketFamily } from './marketFamily';
import { PICK_MARKETS } from './modelPick';

describe('familia de un mercado', () => {
  it('agrupa por la variable, no por el nombre del mercado', () => {
    const casos: [Selection, string][] = [
      [{ market: 'resultado', outcome: 'home' }, 'resultado'],
      [{ market: 'doble', outcome: '1X' }, 'resultado'],
      [{ market: 'goles', side: 'over', line: 2.5 }, 'goles'],
      [{ market: 'btts', outcome: 'si' }, 'goles'],
      [{ market: 'mitad', half: 1, side: 'over', line: 0.5 }, 'goles'],
      [{ market: 'equipo', team: 'home', side: 'over', line: 1.5 }, 'goles'],
      [{ market: 'cero', team: 'home', outcome: 'si' }, 'goles'],
      [{ market: 'corners', side: 'over', line: 9.5 }, 'corners'],
      [{ market: 'tarjetas', side: 'under', line: 4.5 }, 'tarjetas'],
      [{ market: 'tiros', side: 'over', line: 24.5 }, 'tiros'],
      [{ market: 'sot', side: 'under', line: 8.5 }, 'tiros'],
    ];
    for (const [sel, esperada] of casos) expect(marketFamily(sel), sel.market).toBe(esperada);
  });

  it('un conteo por equipo va con su variable, que vive en `stat`', () => {
    const porEquipo = (stat: 'corners' | 'tarjetas' | 'tiros' | 'sot'): Selection => ({
      market: 'conteoEquipo',
      stat,
      team: 'home',
      side: 'over',
      line: 4.5,
    });
    expect(marketFamily(porEquipo('corners'))).toBe('corners');
    expect(marketFamily(porEquipo('tarjetas'))).toBe('tarjetas');
    expect(marketFamily(porEquipo('tiros'))).toBe('tiros');
    // Los tiros a puerta son tiros: separarlos daría una familia de un solo mercado.
    expect(marketFamily(porEquipo('sot'))).toBe('tiros');
  });

  /*
   * Lo que de verdad protege esta prueba: si alguien añade un mercado a `PICK_MARKETS` y no lo clasifica,
   * el filtro de Oportunidades lo metería en «Goles» sin avisar, y el usuario no lo encontraría nunca.
   */
  it('todos los mercados que compiten por el pick caen en una familia conocida', () => {
    for (const sel of PICK_MARKETS) {
      expect(MARKET_FAMILIES, JSON.stringify(sel)).toContain(marketFamily(sel));
    }
  });
});
