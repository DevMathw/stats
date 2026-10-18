import { describe, expect, it } from 'vitest';
import { compareLeagues, ORDEN_COMPETICIONES, sortLeagues } from './leagueOrder';

const liga = (name: string) => ({ id: name, name });

describe('orden de las competiciones', () => {
  it('no tiene nombres repetidos', () => {
    expect(new Set(ORDEN_COMPETICIONES).size).toBe(ORDEN_COMPETICIONES.length);
  });

  it('empieza por las cinco grandes y acaba en América', () => {
    expect(ORDEN_COMPETICIONES.slice(0, 5)).toEqual(['Premier League', 'LaLiga', 'Serie A', 'Bundesliga', 'Ligue 1']);
    expect(ORDEN_COMPETICIONES.at(-1)).toBe('MLS');
  });

  it('ordena por la lista, no alfabéticamente', () => {
    const desordenadas = [liga('MLS'), liga('Allsvenskan'), liga('Premier League'), liga('UEFA Champions League'), liga('LaLiga')];
    expect(sortLeagues(desordenadas).map((l) => l.name)).toEqual([
      'Premier League',
      'LaLiga',
      'Allsvenskan',
      'UEFA Champions League',
      'MLS',
    ]);
  });

  /*
   * Lo que de verdad protege: una competición nueva que nadie haya metido en el orden tiene que seguir
   * viéndose. Si cayera fuera de la lista y además desapareciera, el fallo pasaría desapercibido hasta que
   * alguien buscara esa liga y no estuviera.
   */
  it('una competición desconocida va al final, pero no se pierde', () => {
    const r = sortLeagues([liga('Liga Nueva'), liga('MLS'), liga('Premier League'), liga('Otra Liga')]);
    expect(r.map((l) => l.name)).toEqual(['Premier League', 'MLS', 'Liga Nueva', 'Otra Liga']);
  });

  it('no toca el array que recibe', () => {
    const original = [liga('MLS'), liga('Premier League')];
    const copia = [...original];
    sortLeagues(original);
    expect(original).toEqual(copia);
  });

  it('vale para Array.sort: nunca devuelve undefined', () => {
    expect(typeof compareLeagues(liga('MLS'), liga('MLS'))).toBe('number');
    expect(compareLeagues(liga('MLS'), liga('MLS'))).toBe(0);
  });
});
