/**
 * Jornada de un partido, con la fase a la que pertenece cuando la competición tiene varias.
 *
 * «J12» en una liga corrida; «Championship Round · J1» en la fase final de la LigaPro; «2.ª etapa · J1»
 * en su segunda etapa, que la fuente numera como la 16. Ver `src/domain/models/competitionFormat.ts`.
 */
import { roundLabel, roundTitle } from '../domain/models/competitionFormat';
import { useStore } from '../store/useStore';
import type { Fixture, Match } from '../types';

type Jugado = Pick<Match | Fixture, 'round' | 'leagueId'> & { phase?: string | null };

export function RoundLabel({ match, className = 'text-muted' }: { match: Jugado; className?: string }) {
  const league = useStore((s) => s.leagues.find((l) => l.id === match.leagueId));
  return (
    <span className={className} title={roundTitle(match, league)}>
      {roundLabel(match, league)}
    </span>
  );
}
