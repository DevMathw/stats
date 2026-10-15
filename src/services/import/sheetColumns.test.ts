import { describe, expect, it } from 'vitest';
import { cell, mapColumns, normalizeHeader } from './sheetColumns';

const COLS = {
  local: ['Equipo Local', 'Local'],
  visitante: ['Equipo Visitante', 'Visitante'],
  corners: ['Corners Local'],
  amarillas: ['Amarillas Local'],
  xg: ['xG Local'],
} as const;

describe('normalizeHeader', () => {
  it('iguala acentos, mayúsculas, espacios y signos', () => {
    expect(normalizeHeader('Posesión Local')).toBe(normalizeHeader('posesion local'));
    expect(normalizeHeader('Tiros a Puerta  LOCAL')).toBe(normalizeHeader('Tiros a Puerta (Local)'));
    expect(normalizeHeader('Fuera de Juego')).toBe(normalizeHeader('Fuera-de-juego'));
    expect(normalizeHeader(null)).toBe('');
  });
});

describe('mapColumns', () => {
  it('encuentra cada campo por su cabecera', () => {
    const { map, missing } = mapColumns(['Equipo Local', 'Equipo Visitante', 'Corners Local', 'Amarillas Local', 'xG Local'], COLS);
    expect(missing).toEqual([]);
    expect(map).toEqual({ local: 0, visitante: 1, corners: 2, amarillas: 3, xg: 4 });
  });

  it('el motivo de existir: una columna insertada ya no desplaza los datos', () => {
    // Con índices fijos, meter «Estadio» en medio metía los córners donde iban las amarillas, sin fallar.
    const cabecera = ['Equipo Local', 'Equipo Visitante', 'Estadio', 'Corners Local', 'Arbitro', 'Amarillas Local', 'xG Local'];
    const { map, unknown } = mapColumns(cabecera, COLS);
    const fila = ['Millonarios', 'Nacional', 'El Campín', 7, 'Pérez', 3, 1.42];

    expect(cell(fila, map, 'corners')).toBe(7);
    expect(cell(fila, map, 'amarillas')).toBe(3);
    expect(cell(fila, map, 'xg')).toBe(1.42);
    expect(unknown).toEqual(['Estadio', 'Arbitro']);
  });

  it('acepta el orden cambiado', () => {
    const { map } = mapColumns(['xG Local', 'Amarillas Local', 'Equipo Visitante', 'Equipo Local', 'Corners Local'], COLS);
    const fila = [0.9, 2, 'Nacional', 'Millonarios', 5];
    expect(cell(fila, map, 'local')).toBe('Millonarios');
    expect(cell(fila, map, 'corners')).toBe(5);
  });

  it('usa el sinónimo cuando falta el nombre preferido', () => {
    const { map, missing } = mapColumns(['Local', 'Visitante'], COLS);
    expect(map.local).toBe(0);
    expect(map.visitante).toBe(1);
    expect(missing).toEqual(['corners', 'amarillas', 'xg']);
  });

  it('una columna que no está se declara ausente y nunca se adivina', () => {
    const { map, missing } = mapColumns(['Equipo Local', 'Equipo Visitante'], COLS);
    expect(missing).toContain('xg');
    // `null`, no el valor de la columna de al lado y no 0.
    expect(cell(['Millonarios', 'Nacional'], map, 'xg')).toBeNull();
  });

  it('con la cabecera repetida se queda con la primera', () => {
    const { map } = mapColumns(['Corners Local', 'Corners Local'], { corners: ['Corners Local'] } as const);
    expect(map.corners).toBe(0);
  });
});
