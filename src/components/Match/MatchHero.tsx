/**
 * Cabecera de la ficha de un partido.
 *
 * Antes esto era una línea de texto con los dos nombres seguidos de puntos y guiones, y la pantalla más
 * importante de la aplicación abría sin que se viera de qué partido se trataba. Aquí el enfrentamiento
 * ocupa el sitio que le corresponde: los dos escudos grandes, los goles esperados en el centro como un
 * marcador y, debajo, el reparto del 1X2 en una sola barra.
 *
 * Todo sale de la proyección. Los goles del centro son ESPERADOS, no un resultado: van con su rótulo y en
 * el color de IA para que nadie los lea como un marcador real.
 */
import type { Fixture, MatchProjection } from '../../types';
import { TeamCrest } from '../TeamLabel';
import { LeagueLabel } from '../LeagueLabel';
import { KickoffTime } from '../Kickoff';
import { RoundLabel } from '../RoundLabel';
import { Badge, ProbSplit } from '../ui';
import { useStore } from '../../store/useStore';
import { teamDisplay } from '../../domain/models/teamDisplay';

function useTeam(teamId: string, name: string) {
  const ref = useStore((s) => s.derived.refByTeamId.get(teamId) ?? null);
  return teamDisplay(ref, name, teamId);
}

function Lado({ teamId, name, goles, lado }: { teamId: string; name: string; goles: number; lado: 'local' | 'visitante' }) {
  const d = useTeam(teamId, name);
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
      <TeamCrest url={d.crestUrl} name={d.name} size={44} />
      <div className="min-w-0">
        <div className="t-h2 line-clamp-2 text-[15px] sm:text-[17px]">{d.name}</div>
        <div className="t-label mt-0.5 text-faint">{lado}</div>
      </div>
      <div className="font-display text-[15px] font-semibold text-ai-text tabular-nums" title={`Goles esperados del ${lado}`}>
        {goles.toFixed(2)}
      </div>
    </div>
  );
}

export function MatchHero({ fixture: f, projection: p }: { fixture: Fixture; projection: MatchProjection }) {
  const tramos = [
    { label: `Gana ${f.homeTeamName}`, value: p.probs1x2.home, color: 'var(--series-3)' },
    { label: 'Empate', value: p.probs1x2.draw, color: 'var(--series-2)' },
    { label: `Gana ${f.awayTeamName}`, value: p.probs1x2.away, color: 'var(--series-1)' },
  ];

  return (
    <section className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
      {/* Contexto del partido: competición, jornada, cuándo y en qué estado está. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border bg-surface-2 px-4 py-2.5 text-[12px] text-muted">
        <LeagueLabel leagueId={f.leagueId} size="sm" link />
        <span className="text-faint" aria-hidden>
          ·
        </span>
        <RoundLabel match={f} />
        <span className="text-faint" aria-hidden>
          ·
        </span>
        <KickoffTime match={f} variant="tarjeta" />
        <span className="ml-auto">
          <Badge tone={f.status === 'Programado' ? 'neutral' : 'accent'}>{f.status}</Badge>
        </span>
      </div>

      <div className="px-4 py-5">
        <div className="flex items-start gap-3 sm:gap-6">
          <Lado teamId={f.homeTeamId} name={f.homeTeamName} goles={p.expectedGoalsHome} lado="local" />

          {/* El «marcador» del centro es la proyección, no un resultado: se dice con todas las letras. */}
          <div className="flex shrink-0 flex-col items-center gap-1 pt-2">
            <span className="t-label text-faint">Goles esperados</span>
            <span className="font-display text-[26px] leading-none font-semibold tabular-nums sm:text-[32px]">
              {p.expectedGoalsHome.toFixed(1)}
              <span className="mx-1.5 text-faint">–</span>
              {p.expectedGoalsAway.toFixed(1)}
            </span>
            <span className="t-meta text-faint" title="Marcador más probable dentro del resultado proyectado">
              más probable {p.mostLikelyScoreline}
            </span>
          </div>

          <Lado teamId={f.awayTeamId} name={f.awayTeamName} goles={p.expectedGoalsAway} lado="visitante" />
        </div>

        {/* Reparto del 1X2: una barra en vez de tres cifras que hay que comparar a mano. */}
        <div className="mt-5 space-y-1.5">
          <ProbSplit parts={tramos} height="h-2.5" />
          <div className="flex justify-between gap-2 text-[12px] text-muted tabular-nums">
            {tramos.map((t, i) => (
              <span key={t.label} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm" style={{ background: t.color }} aria-hidden />
                <span className="font-medium text-text">{['1', 'X', '2'][i]}</span>
                {(t.value * 100).toFixed(1)} %
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
