/**
 * La hora que ve el usuario: SIEMPRE la de Colombia (`America/Bogota`).
 *
 * Dentro, la aplicación guarda la fecha y la hora OFICIALES de cada competición (`date`, `kickoffTime`),
 * porque son las que ordenan jornadas y temporadas, más el instante del saque inicial (`kickoffUtc`)
 * desde que las fuentes lo conservan. La conversión ocurre solo aquí, al presentar.
 *
 * Tres casos, y ninguno inventa una hora:
 *   - con `kickoffUtc`: hora exacta de Colombia, venga el partido de donde venga;
 *   - sin él, en una competición de un solo país: se reconstruye el instante con la zona de esa
 *     competición, que es la que usó la fuente al guardar la hora;
 *   - sin él, en una competición que cambia de país cada jornada (las tres de la UEFA): se enseña la
 *     hora del estadio, marcada como tal, hasta que una actualización traiga el instante.
 */
import {
  DISPLAY_TIME_ZONE,
  LEAGUE_TIME_ZONES,
  VENUE_ZONE_PER_MATCH,
  utcFromLocalTime,
  zonedDateTime,
} from '../domain/models/leagueTimeZones';
import { espnLeagueId } from '../domain/models/espnLeagues';
import type { Fixture, League, Match } from '../types';

/** Lo que hace falta de una competición para convertir sus horas. */
export interface LeagueZone {
  timeZone: string;
  /** La sede cambia de país: la hora guardada no basta para reconstruir el instante. */
  venueVaries: boolean;
}

export function leagueZone(league: Pick<League, 'name' | 'country'> | undefined): LeagueZone | null {
  const slug = league ? espnLeagueId(league.name, league.country) : null;
  const timeZone = slug ? LEAGUE_TIME_ZONES[slug] : undefined;
  return timeZone ? { timeZone, venueVaries: VENUE_ZONE_PER_MATCH.has(slug!) } : null;
}

/** Zona de cada competición, por `leagueId`. */
export const leagueZones = (leagues: League[]): Map<string, LeagueZone> =>
  new Map(leagues.flatMap((l) => { const z = leagueZone(l); return z ? [[l.id, z] as const] : []; }));

/** Lo mínimo que hace falta de un partido para situarlo en el tiempo. */
export type Timed = Pick<Match | Fixture, 'date' | 'kickoffTime' | 'kickoffUtc'>;

export interface Kickoff {
  /** Día en Colombia, o el oficial de la competición si no hay hora que convertir. */
  date: string;
  /** Hora `HH:mm`, o `null` si la fuente no publicó ninguna. */
  time: string | null;
  /** `colombia`: la hora es la de Colombia. `sede`: la del estadio, sin convertir. `sinHora`: no hay. */
  zone: 'colombia' | 'sede' | 'sinHora';
  /** Instante del saque inicial, si se conoce. */
  utc: string | null;
  /** El día en Colombia no coincide con la fecha oficial de la competición. */
  otherDay: boolean;
}

export function kickoffOf(m: Timed, zone: LeagueZone | null): Kickoff {
  const hora = m.kickoffTime ?? null;
  const utc =
    m.kickoffUtc ??
    (hora && zone && !zone.venueVaries ? utcFromLocalTime(m.date, hora, zone.timeZone) : null);

  if (!hora) return { date: m.date, time: null, zone: 'sinHora', utc: utc ?? null, otherDay: false };
  if (!utc) return { date: m.date, time: hora, zone: 'sede', utc: null, otherDay: false };

  const { date, time } = zonedDateTime(new Date(utc), DISPLAY_TIME_ZONE);
  return { date, time, zone: 'colombia', utc, otherDay: date !== m.date };
}

/**
 * `2026-09-19` → `sáb 19 sep`. Para las tarjetas de partido, donde un `2026-09-19` se lee como un volcado
 * de base de datos. La fecha completa sigue en el `title` y en las tablas, que sí comparan fechas.
 */
export function shortDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  // Se arma por partes: `format` en es-CO devuelve «dom, 20 de sept.», con coma, «de» y punto, que en una
  // tarjeta estrecha son tres caracteres de ruido.
  const partes = new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).formatToParts(d);
  const de = (t: Intl.DateTimeFormatPartTypes) => partes.find((p) => p.type === t)?.value.replace('.', '') ?? '';
  return `${de('weekday')} ${de('day')} ${de('month')}`.trim();
}

/**
 * `2026-09-19` → `sep 2026`. Para un periodo: `shortDate` no lleva año, y en Partidos el rango va de 2023 a
 * 2026, así que «vie 20 ene» no dice de qué año habla. El día sobra cuando lo que se mira son años.
 */
export function monthYear(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  const partes = new Intl.DateTimeFormat('es-CO', { month: 'short', year: 'numeric', timeZone: 'UTC' }).formatToParts(d);
  const de = (t: Intl.DateTimeFormatPartTypes) => partes.find((x) => x.type === t)?.value.replace('.', '') ?? '';
  return `${de('month')} ${de('year')}`.trim();
}

/** `2026-09-19` → `sábado, 19 de septiembre de 2026`. Se usa en las explicaciones de la hora. */
export function longDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
}
