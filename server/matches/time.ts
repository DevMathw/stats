/**
 * Fecha y hora OFICIALES del partido: las de la competición, no las del ordenador ni UTC.
 *
 * Importa más de lo que parece: un partido de la Liga BetPlay a las 20:00 en Bogotá es la 01:00
 * UTC del día siguiente. Guardar la fecha UTC lo movería de jornada en el calendario.
 *
 * Además del par fecha+hora se devuelve el instante (`utc`): la aplicación lo enseña TODO en hora de
 * Colombia, y sin el instante habría que suponer en qué zona se jugó.
 */
import { zonedDateTime } from '../../src/domain/models/leagueTimeZones.ts';

/**
 * A partir de un instante UTC y la zona horaria de la competición.
 *
 * Devuelve también el propio instante (`utc`): es lo único que permite después enseñar la hora de
 * Colombia sin suponer nada, y todas las fuentes lo publican.
 */
export function localDateTime(utcIso: string, timeZone: string): { date: string; time: string; utc: string } {
  const d = new Date(utcIso);
  if (Number.isNaN(d.getTime())) throw new Error(`fecha no válida: ${utcIso}`);
  const { date, time } = zonedDateTime(d, timeZone);
  return { date, time, utc: d.toISOString() };
}

/** A partir de un instante UTC y el desfase en horas que publica la propia fuente. */
export function offsetDateTime(utcIso: string, offsetHours: number): { date: string; time: string; utc: string } {
  const d = new Date(utcIso);
  if (Number.isNaN(d.getTime())) throw new Error(`fecha no válida: ${utcIso}`);
  const iso = new Date(d.getTime() + offsetHours * 3_600_000).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16), utc: d.toISOString() };
}
