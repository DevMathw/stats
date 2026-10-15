import { describe, expect, it } from 'vitest';
import { utcFromLocalTime } from '../domain/models/leagueTimeZones';
import { kickoffOf, shortDate } from './matchTime';

const BOGOTA = { timeZone: 'America/Bogota', venueVaries: false };
const MADRID = { timeZone: 'Europe/Madrid', venueVaries: false };
const UEFA = { timeZone: 'Europe/Paris', venueVaries: true };

describe('instante a partir de la hora local', () => {
  it('Colombia no cambia de hora: siempre UTC-5', () => {
    expect(utcFromLocalTime('2026-09-19', '20:00', 'America/Bogota')).toBe('2026-09-20T01:00:00.000Z');
    expect(utcFromLocalTime('2026-01-19', '20:00', 'America/Bogota')).toBe('2026-01-20T01:00:00.000Z');
  });

  it('respeta el horario de verano de cada país', () => {
    // Madrid va en UTC+2 en septiembre y en UTC+1 en enero.
    expect(utcFromLocalTime('2026-09-19', '21:00', 'Europe/Madrid')).toBe('2026-09-19T19:00:00.000Z');
    expect(utcFromLocalTime('2026-01-19', '21:00', 'Europe/Madrid')).toBe('2026-01-19T20:00:00.000Z');
  });

  it('una fecha imposible no devuelve un instante inventado', () => {
    expect(utcFromLocalTime('no-es-fecha', '21:00', 'Europe/Madrid')).toBeNull();
  });
});

describe('hora que se enseña', () => {
  it('convierte el instante publicado por la fuente a hora de Colombia', () => {
    const k = kickoffOf({ date: '2026-09-19', kickoffTime: '21:00', kickoffUtc: '2026-09-19T19:00:00.000Z' }, MADRID);
    expect(k).toMatchObject({ date: '2026-09-19', time: '14:00', zone: 'colombia', otherDay: false });
  });

  it('sin instante, lo reconstruye con la zona de la competición', () => {
    const k = kickoffOf({ date: '2026-09-19', kickoffTime: '21:00', kickoffUtc: null }, MADRID);
    expect(k).toMatchObject({ time: '14:00', zone: 'colombia' });
  });

  it('un partido de madrugada en Europa cae el día anterior en Colombia, y se avisa', () => {
    const k = kickoffOf({ date: '2026-09-20', kickoffTime: '01:00', kickoffUtc: null }, MADRID);
    expect(k).toMatchObject({ date: '2026-09-19', time: '18:00', otherDay: true });
  });

  it('una competición que cambia de país no se convierte a ojo: se marca como hora del estadio', () => {
    const k = kickoffOf({ date: '2026-10-13', kickoffTime: '21:00', kickoffUtc: null }, UEFA);
    expect(k).toMatchObject({ time: '21:00', zone: 'sede', utc: null });
  });

  it('con el instante, esa misma competición sí se convierte', () => {
    const k = kickoffOf({ date: '2026-10-13', kickoffTime: '21:00', kickoffUtc: '2026-10-13T19:00:00.000Z' }, UEFA);
    expect(k).toMatchObject({ time: '14:00', zone: 'colombia' });
  });

  it('sin hora publicada no se inventa ninguna', () => {
    expect(kickoffOf({ date: '2026-09-19', kickoffTime: null, kickoffUtc: null }, BOGOTA)).toMatchObject({
      time: null,
      zone: 'sinHora',
      date: '2026-09-19',
    });
  });
});

describe('shortDate', () => {
  it('deja la fecha sin coma, sin «de» y sin punto: es lo que cabe en una tarjeta', () => {
    expect(shortDate('2026-09-20')).toBe('dom 20 sept');
    expect(shortDate('2026-01-05')).toBe('lun 5 ene');
  });

  it('una fecha que no se entiende se devuelve tal cual en vez de dar «Invalid Date»', () => {
    expect(shortDate('no-es-fecha')).toBe('no-es-fecha');
  });
});
