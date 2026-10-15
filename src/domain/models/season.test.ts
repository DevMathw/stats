import { describe, expect, it } from 'vitest';
import { compareSeasons, parseSeasonLabel, sameSeason, seasonKey } from './season';

describe('clave canónica de temporada', () => {
  it('normaliza las formas que escribe cada fuente', () => {
    // Etiquetas reales, medidas el 21/09/2026 contra las fuentes que usa el proyecto.
    expect(seasonKey('2026/2027')).toBe('2026-27'); // FotMob europeo
    expect(seasonKey('2026/27')).toBe('2026-27'); // bundesliga.com, laliga.com
    expect(seasonKey('2024/25')).toBe('2024-25');
    expect(seasonKey('English Premier League Season 2026/2027')).toBe('2026-27'); // Pulselive
    expect(seasonKey('2026')).toBe('2026'); // FotMob sudamericano
    expect(seasonKey('2024')).toBe('2024');
  });

  it('ignora el asterisco del libro original', () => {
    // 1.303 partidos guardados llevan `2026/27*`: la marca no es parte del nombre.
    expect(seasonKey('2026/27*')).toBe('2026-27');
    expect(seasonKey('2026/27')).toBe(seasonKey('2026/27*'));
  });

  it('separa el torneo de la temporada en vez de meterlo en la clave', () => {
    // La fase ya vive en `Match.phase`; si entrase aquí, partiría en dos la tabla de una misma temporada.
    expect(parseSeasonLabel('2026 - Clausura')).toMatchObject({ key: '2026', phase: 'Clausura' });
    expect(parseSeasonLabel('2025 - Apertura')).toMatchObject({ key: '2025', phase: 'Apertura' });
    expect(parseSeasonLabel('2026/2027')).toMatchObject({ key: '2026-27', phase: null });
  });

  it('no acepta un rango que no sean dos años seguidos', () => {
    expect(seasonKey('2026/2030')).toBe('2026'); // cae al año suelto, no inventa un rango
    expect(seasonKey('2026/2025')).toBe('2026');
  });

  it('devuelve null cuando no hay ningún año reconocible', () => {
    expect(seasonKey('')).toBeNull();
    expect(seasonKey(null)).toBeNull();
    expect(seasonKey('Clausura')).toBeNull();
    expect(seasonKey('12/13')).toBeNull(); // dos cifras no son un año
  });
});

describe('comprobación de que la fuente devolvió lo que se le pidió', () => {
  it('acepta la misma temporada aunque venga escrita de otra forma', () => {
    expect(sameSeason('2024/2025', '2024/25')).toBe(true);
    expect(sameSeason('2026/27*', 'English Premier League Season 2026/2027')).toBe(true);
    expect(sameSeason('2024 - Clausura', '2024 - Apertura')).toBe(true); // misma temporada, otra fase
  });

  it('rechaza el fallo silencioso de FotMob y de laliga.com', () => {
    // Medido: pedir `2024/2025` a Colombia devuelve 200 con `2026 - Clausura`, y `laLigaSource(2024)`
    // devuelve `2026/27`. Sin esta comprobación se guardarían con la etiqueta pedida.
    expect(sameSeason('2024/2025', '2026 - Clausura')).toBe(false);
    expect(sameSeason('2024', '2026/27')).toBe(false);
  });

  it('nunca da por buena una etiqueta sin año', () => {
    expect(sameSeason('2026', '')).toBe(false);
    expect(sameSeason('', '')).toBe(false);
    expect(sameSeason(null, null)).toBe(false);
  });
});

describe('orden de temporadas', () => {
  it('coloca una temporada a caballo después del año natural en que empieza', () => {
    expect([...['2025', '2024-25', '2024', '2026-27']].sort(compareSeasons)).toEqual([
      '2024',
      '2024-25',
      '2025',
      '2026-27',
    ]);
  });
});
