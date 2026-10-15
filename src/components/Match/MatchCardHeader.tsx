/**
 * Cabecera de una tarjeta de partido: competición y jornada a la izquierda, hora a la derecha.
 *
 * La usan las tres tarjetas que sustituyen a una fila de tabla en el móvil —proyección, partido disputado y
 * partido pendiente—, que necesitan exactamente el mismo encabezado. Estaba escrita dentro de `MatchCard`;
 * al aparecer el segundo y el tercer caso se saca aquí en vez de copiarla.
 *
 * Dos líneas y no una: en una sola, el nombre de la competición se quedaba en «Pri…» para dejar sitio a la
 * jornada y a la hora.
 */
import type { Fixture, Match } from '../../types';
import { LeagueLabel } from '../LeagueLabel';
import { KickoffTime } from '../Kickoff';
import { RoundLabel } from '../RoundLabel';

type Partido = Pick<Match | Fixture, 'leagueId' | 'round' | 'date'> & { phase?: string | null; kickoffUtc?: string | null };

export function MatchCardHeader({ match }: { match: Partido }) {
  return (
    <div className="flex items-start justify-between gap-2 border-b border-border px-3 py-2">
      <span className="flex min-w-0 flex-col">
        <LeagueLabel leagueId={match.leagueId} size="sm" className="min-w-0 text-muted" />
        <RoundLabel match={match} className="truncate pl-[1.375rem] text-[10px] text-faint" />
      </span>
      <KickoffTime match={match} variant="tarjeta" className="shrink-0 text-[11px] text-faint" />
    </div>
  );
}
