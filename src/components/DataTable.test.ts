import { describe, expect, it } from 'vitest';
import { pageNumbers } from './DataTable';

describe('números de página', () => {
  it('con pocas páginas se enseñan todas', () => {
    expect(pageNumbers(0, 5)).toEqual([0, 1, 2, 3, 4]);
  });

  it('en la primera página la ventana se pega al principio', () => {
    // «1 2 3 4 5 … 295», que es lo que se espera de una paginación.
    expect(pageNumbers(0, 295)).toEqual([0, 1, 2, 3, 4, null, 294]);
  });

  it('en medio, cinco alrededor de la actual entre dos huecos', () => {
    expect(pageNumbers(10, 30)).toEqual([0, null, 8, 9, 10, 11, 12, null, 29]);
  });

  it('al final la ventana se pega al final', () => {
    expect(pageNumbers(29, 30)).toEqual([0, null, 25, 26, 27, 28, 29]);
  });

  it('una sola página es una sola', () => {
    expect(pageNumbers(0, 1)).toEqual([0]);
  });
});
