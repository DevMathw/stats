/**
 * Las dos tarjetas de la pantalla de Partidos, para cuando la pantalla es un teléfono.
 *
 * Son dos listados distintos y no se parecen: en los **disputados** lo que importa es el marcador y lo que
 * midió la fuente; en los **pendientes**, cuándo se juega y en qué estado está. Por eso son dos tarjetas y
 * no una con condicionales.
 *
 * Lo que la fuente no publicó sale como «N/D» —nunca como cero—, igual que en la tabla.
 */
import { Link } from 'react-router-dom';
import type { Fixture, Match } from '../../types';
import { TeamLabel } from '../TeamLabel';
import { MatchCardHeader } from './MatchCardHeader';
import { Badge } from '../ui';
import { fmtInt, fmtPair, fmtPct, NA } from '../../utils/format';
import { awayPossession } from '../../domain/calculations/matchDerived';

/** Un dato del partido con su rótulo. `null` en los dos lados se enseña como «N/D». */
function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="t-label truncate text-[10px] text-faint">{label}</div>
      <div className="truncate text-[13px] font-medium tabular-nums">{children}</div>
    </div>
  );
}

/** Los dos equipos, uno por línea, con una cifra a la derecha de cada uno. */
function Enfrentamiento({
  homeTeamId,
  homeTeamName,
  awayTeamId,
  awayTeamName,
  derecha,
}: {
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  derecha?: [React.ReactNode, React.ReactNode];
}) {
  return (
    <div className="flex-1 space-y-1.5 px-3 py-2.5">
      {(
        [
          [homeTeamId, homeTeamName, derecha?.[0]],
          [awayTeamId, awayTeamName, derecha?.[1]],
        ] as const
      ).map(([id, nombre, valor]) => (
        <div key={id} className="flex items-center justify-between gap-2">
          <TeamLabel teamId={id} name={nombre} size={20} className="min-w-0 text-[13px] font-medium" />
          {valor !== undefined && <span className="shrink-0 font-display text-[15px] font-semibold tabular-nums">{valor}</span>}
        </div>
      ))}
    </div>
  );
}

export function PlayedMatchCard({ m }: { m: Match }) {
  return (
    <Link
      to={`/partidos/${encodeURIComponent(m.id)}`}
      aria-label={`Ver la ficha de ${m.homeTeamName} contra ${m.awayTeamName}`}
      className="card-interactive flex h-full flex-col rounded-card border border-border bg-surface shadow-card focus-visible:outline-offset-0"
    >
      <MatchCardHeader match={m} />
      <Enfrentamiento
        homeTeamId={m.homeTeamId}
        homeTeamName={m.homeTeamName}
        awayTeamId={m.awayTeamId}
        awayTeamName={m.awayTeamName}
        derecha={[fmtInt(m.homeGoals), fmtInt(m.awayGoals)]}
      />

      {m.awarded && (
        <div className="px-3 pb-2">
          <Badge tone="warning" title="Resultado adjudicado por decisión: no cuenta en ninguna cifra del análisis">
            Adjudicado
          </Badge>
        </div>
      )}

      {/* Las cuatro que la tabla enseña en columnas propias. Las demás están en la ficha del partido. */}
      <div className="grid grid-cols-4 gap-x-2 border-t border-border px-3 py-2">
        <Dato label="Posesión">
          {m.possessionHome === null ? (
            NA
          ) : (
            <>
              {fmtPct(m.possessionHome, 0)}
              <span className="text-faint">–</span>
              {fmtPct(awayPossession(m), 0)}
            </>
          )}
        </Dato>
        <Dato label="Córners">{fmtPair(m.cornersHome, m.cornersAway)}</Dato>
        <Dato label="Tiros">{fmtPair(m.shotsHome, m.shotsAway)}</Dato>
        <Dato label="Amarillas">{fmtPair(m.yellowCardsHome, m.yellowCardsAway)}</Dato>
      </div>
    </Link>
  );
}

export function FixtureCard({ f, conProyeccion }: { f: Fixture; conProyeccion: boolean }) {
  // Enlaza a su proyección solo si existe; si no, no hay adónde ir y la tarjeta no es un enlace roto.
  const contenido = (
    <>
      <MatchCardHeader match={f} />
      <Enfrentamiento homeTeamId={f.homeTeamId} homeTeamName={f.homeTeamName} awayTeamId={f.awayTeamId} awayTeamName={f.awayTeamName} />
      <div className="flex items-center gap-2 border-t border-border px-3 py-1.5 text-[11px]">
        <Badge tone={f.status === 'Programado' ? 'neutral' : 'warning'}>{f.status}</Badge>
        {!conProyeccion && (
          <span className="text-faint" title="Faltan partidos jugados de alguno de los dos equipos">
            Sin proyección
          </span>
        )}
        <span className="ml-auto shrink-0 truncate text-faint" title="Fuente del calendario">
          {f.source ?? '—'}
        </span>
      </div>
    </>
  );

  const clases = 'flex h-full flex-col rounded-card border border-border bg-surface shadow-card';
  return conProyeccion ? (
    <Link
      to={`/proyecciones/${encodeURIComponent(f.id)}`}
      aria-label={`Ver las probabilidades de ${f.homeTeamName} contra ${f.awayTeamName}`}
      className={`card-interactive focus-visible:outline-offset-0 ${clases}`}
    >
      {contenido}
    </Link>
  ) : (
    <div className={clases}>{contenido}</div>
  );
}
