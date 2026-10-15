/**
 * Zona horaria oficial de cada competición, y la de presentación de la aplicación.
 *
 * La aplicación guarda la fecha y la hora OFICIALES de la competición (`Match.date`, `Match.kickoffTime`):
 * un partido de la Liga BetPlay a las 20:00 en Bogotá es la 01:00 UTC del día siguiente, y guardar la
 * fecha UTC lo movería de jornada. Lo que se enseña, en cambio, es SIEMPRE la hora de Colombia.
 *
 * Para convertir hace falta el instante: lo trae `kickoffUtc` desde que las fuentes lo guardan (todas lo
 * publican). Los partidos cargados antes no lo tienen, y entonces se reconstruye con esta tabla, porque la
 * hora guardada es la de esta zona. Eso vale para las ligas de un solo país; en las competiciones cuya
 * sede cambia de país (las tres de la UEFA) la hora guardada es la del estadio y no se puede reconstruir
 * sin adivinar: esas se marcan en `VENUE_ZONE_PER_MATCH` y se enseñan como hora local del estadio hasta
 * que una actualización traiga su `kickoffUtc`.
 *
 * Lo comparten el cliente (presentación) y el servidor (`server/matches/registry.ts`): una sola tabla.
 */

/** Zona en la que se enseña TODO en la aplicación. */
export const DISPLAY_TIME_ZONE = 'America/Bogota';

/** Zona oficial de cada competición, por identificador de ESPN (`espnLeagueId`). */
export const LEAGUE_TIME_ZONES: Record<string, string> = {
  'eng.1': 'Europe/London',
  'eng.2': 'Europe/London',
  'esp.1': 'Europe/Madrid',
  'ita.1': 'Europe/Rome',
  'ger.1': 'Europe/Berlin',
  'fra.1': 'Europe/Paris',
  'ned.1': 'Europe/Amsterdam',
  'por.1': 'Europe/Lisbon',
  'den.1': 'Europe/Copenhagen',
  'bel.1': 'Europe/Brussels',
  'tur.1': 'Europe/Istanbul',
  'aut.1': 'Europe/Vienna',
  'gre.1': 'Europe/Athens',
  'nor.1': 'Europe/Oslo',
  'pol.1': 'Europe/Warsaw',
  'sco.1': 'Europe/London',
  'sui.1': 'Europe/Zurich',
  'swe.1': 'Europe/Stockholm',
  'bra.1': 'America/Sao_Paulo',
  'arg.1': 'America/Argentina/Buenos_Aires',
  'col.1': 'America/Bogota',
  'chi.1': 'America/Santiago',
  'par.1': 'America/Asuncion',
  'uru.1': 'America/Montevideo',
  'ven.1': 'America/Caracas',
  'bol.1': 'America/La_Paz',
  'ecu.1': 'America/Guayaquil',
  'mex.1': 'America/Mexico_City',
  // ponytail: hora del Este para toda la liga; un partido que empiece después de las 21:00 del Pacífico
  // quedaría con la fecha del día siguiente. Usar la zona de cada estadio si pasa.
  'usa.1': 'America/New_York',
  'uefa.champions': 'Europe/Paris',
  'uefa.europa': 'Europe/Paris',
  'uefa.europa.conf': 'Europe/Paris',
};

/**
 * Competiciones cuya hora guardada es la del estadio, que cambia de país cada jornada: no se puede
 * deshacer la conversión con una zona fija. Con `kickoffUtc` sí se convierte, porque es el instante real.
 */
export const VENUE_ZONE_PER_MATCH = new Set(['uefa.champions', 'uefa.europa', 'uefa.europa.conf']);

/** Fecha y hora de un instante en una zona: `2026-09-19T18:30:00Z` en `America/Bogota` → 13:30 del 19. */
export function zonedDateTime(instant: Date | number, timeZone: string): { date: string; time: string; seconds: string } {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(instant))
      .map((x) => [x.type, x.value]),
  );
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}`, seconds: p.second };
}

/** La misma hora, leída en otra zona, como si fuese UTC. Sirve para medir el desfase de la zona. */
function wallClock(instant: number, timeZone: string): number {
  const { date, time, seconds } = zonedDateTime(instant, timeZone);
  return Date.parse(`${date}T${time}:${seconds}Z`);
}

/**
 * Instante UTC de una fecha y hora locales de una zona (`2026-09-20`, `20:00`, `America/Bogota`).
 *
 * Es la inversa de `localDateTime`: se parte de suponer que la hora local es UTC y se corrige con el
 * desfase medido de la zona. Dos pasadas, porque el desfase del instante corregido puede ser otro si en
 * medio hay un cambio de hora. `null` si la fecha o la hora no son válidas.
 */
export function utcFromLocalTime(date: string, time: string, timeZone: string): string | null {
  const supuesto = Date.parse(`${date}T${time}:00Z`);
  if (Number.isNaN(supuesto)) return null;
  let t = supuesto;
  for (let i = 0; i < 2; i++) {
    const zona = wallClock(t, timeZone);
    if (Number.isNaN(zona)) return null;
    t = supuesto + (t - zona);
  }
  return new Date(t).toISOString();
}
