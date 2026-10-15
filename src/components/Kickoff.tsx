// oxlint-disable react/only-export-components -- los hooks de zona van con el componente que los usa
/**
 * Fecha y hora de un partido, SIEMPRE en hora de Colombia.
 *
 * Es el único sitio de la interfaz que pinta la hora de un partido: así no hay dos conversiones
 * distintas. Lo que se enseña y lo que se guarda están explicados en `src/utils/matchTime.ts`.
 */
import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { kickoffOf, leagueZones, longDate, shortDate, type Kickoff, type LeagueZone, type Timed } from '../utils/matchTime';

/** Zona de cada competición cargada. */
export function useLeagueZones(): Map<string, LeagueZone> {
  const leagues = useStore((s) => s.leagues);
  return useMemo(() => leagueZones(leagues), [leagues]);
}

export function useKickoff(match: Timed & { leagueId: string }): Kickoff {
  const zonas = useLeagueZones();
  return kickoffOf(match, zonas.get(match.leagueId) ?? null);
}

/** Explicación para el `title`: qué hora se está enseñando y de dónde sale. */
export function kickoffTitle(k: Kickoff, oficial: Timed): string {
  if (k.zone === 'sinHora') return 'La fuente no publica la hora de este partido';
  if (k.zone === 'sede') {
    return `${k.time} hora local del estadio. Esta competición cambia de país cada jornada y su fuente aún no ha dado el instante exacto: actualiza la competición para verla en hora de Colombia.`;
  }
  const mismo = oficial.date === k.date && oficial.kickoffTime === k.time;
  return (
    `${k.time} del ${longDate(k.date)}, hora de Colombia` +
    (mismo ? '' : ` · ${oficial.kickoffTime} del ${longDate(oficial.date)} en la hora oficial de la competición`)
  );
}

interface Props {
  match: Timed & { leagueId: string };
  /**
   * `tabla`: día y mes en móvil, fecha entera en pantalla grande (se comparan fechas entre filas).
   * `linea`: fecha y hora seguidas. `tarjeta`: `sáb 20 sep · 12:45`, para leer un partido suelto.
   */
  variant?: 'tabla' | 'linea' | 'tarjeta';
  className?: string;
}

export function KickoffTime({ match, variant = 'tabla', className = '' }: Props) {
  const k = useKickoff(match);
  const title = kickoffTitle(k, match);
  const hora = k.time && (
    <span className={k.zone === 'sede' ? 'ml-1 text-warning-text' : 'ml-1 text-faint'}>
      {k.time}
      {k.zone === 'sede' && <span aria-hidden> ·sede</span>}
    </span>
  );

  if (variant === 'tarjeta') {
    return (
      <span className={`whitespace-nowrap tabular-nums ${className}`} title={title}>
        {shortDate(k.date)}
        {k.time && <span className="mx-1 text-faint" aria-hidden>·</span>}
        {k.time && (
          <span className={k.zone === 'sede' ? 'font-medium text-warning-text' : 'font-medium'}>
            {k.time}
            {k.zone === 'sede' && <span aria-hidden> ·sede</span>}
          </span>
        )}
      </span>
    );
  }

  if (variant === 'linea') {
    return (
      <span className={`tabular-nums ${className}`} title={title}>
        {k.date}
        {hora}
      </span>
    );
  }
  return (
    <span className={`tabular-nums ${className}`} title={title}>
      <span className="md:hidden">{`${k.date.slice(8, 10)}/${k.date.slice(5, 7)}`}</span>
      <span className="hidden md:inline">{k.date}</span>
      {hora}
    </span>
  );
}
