/**
 * Tarjeta de un partido pendiente.
 *
 * En el dashboard sustituye a una fila de tabla porque el partido no es un registro: es un encuentro entre
 * dos equipos, y la tabla obligaba a leer ocho columnas para reconstruir algo que el ojo capta de golpe.
 * Aquí manda el enfrentamiento; el 1X2 va debajo como una sola barra partida, no como tres cifras sueltas.
 *
 * Todo lo que enseña sale de la proyección: no hay ni un número escrito a mano ni ninguno inventado. Lo que
 * el modelo no ha podido calcular simplemente no aparece.
 */
import { Link } from 'react-router-dom';
import { Award, Sparkles } from 'lucide-react';
import type { MatchProjection } from '../../types';
import type { ModelPick } from '../../domain/betting/modelPick';
import { pct } from '../Betting/BetUi';
import { TeamLabel } from '../TeamLabel';
import { MatchCardHeader } from './MatchCardHeader';
import { ProbSplit } from '../ui';

/** Los tres tramos de la barra, con el color de serie que les corresponde en toda la aplicación. */
function tramos(p: MatchProjection) {
  return [
    { label: 'Gana el local', value: p.probs1x2.home, color: 'var(--series-3)' },
    { label: 'Empate', value: p.probs1x2.draw, color: 'var(--series-2)' },
    { label: 'Gana el visitante', value: p.probs1x2.away, color: 'var(--series-1)' },
  ];
}

export function MatchCard({ p, pick }: { p: MatchProjection; /** Solo en Proyecciones: el dashboard no lo pasa. */ pick?: ModelPick }) {
  const t = tramos(p);
  const favorito = Math.max(p.probs1x2.home, p.probs1x2.draw, p.probs1x2.away);

  return (
    <Link
      to={`/proyecciones/${encodeURIComponent(p.fixtureId)}`}
      aria-label={`Ver el análisis de ${p.homeTeamName} contra ${p.awayTeamName}`}
      className="card-interactive flex flex-col rounded-card border border-border bg-surface shadow-card focus-visible:outline-offset-0"
    >
      <MatchCardHeader match={p} />

      {/* El enfrentamiento: lo primero que se mira. Los goles esperados van a la derecha, como un marcador. */}
      <div className="flex-1 space-y-1.5 px-3 py-2.5">
        {(
          [
            ['home', p.homeTeamId, p.homeTeamName, p.expectedGoalsHome],
            ['away', p.awayTeamId, p.awayTeamName, p.expectedGoalsAway],
          ] as const
        ).map(([lado, id, nombre, goles]) => (
          <div key={lado} className="flex items-center justify-between gap-2">
            <TeamLabel teamId={id} name={nombre} size={20} className="min-w-0 text-[13px] font-medium" />
            <span
              className="shrink-0 font-display text-[13px] font-semibold tabular-nums"
              title={`Goles esperados del ${lado === 'home' ? 'local' : 'visitante'}`}
            >
              {goles.toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {/* Reparto del 1X2 y el marcador más probable dentro de él. */}
      <div className="space-y-1.5 px-3 pb-3">
        <ProbSplit parts={t} />
        <div className="flex items-center justify-between gap-2 text-[11px] text-muted">
          <span className="flex gap-2 tabular-nums">
            {t.map((x, i) => (
              <span key={x.label} className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: x.color }} aria-hidden />
                {['1', 'X', '2'][i]} {(x.value * 100).toFixed(0)}%
              </span>
            ))}
          </span>
          <span className="shrink-0 font-medium text-text tabular-nums" title="Marcador más probable dentro del resultado proyectado">
            {p.mostLikelyScoreline}
          </span>
        </div>
      </div>

      {/*
       * El pick, solo si lo hay. De 542 partidos pendientes solo 37 tienen uno, así que pintar «Sin
       * selección» en las otras 505 tarjetas sería repetir un no 505 veces: que no aparezca la línea ES la
       * respuesta. En la tabla sí tiene columna fija, porque allí una celda vacía descuadraría la rejilla.
       */}
      {pick?.best && (
        <div className="flex items-center gap-1.5 border-t border-border px-3 py-1.5 text-[11px]" title={pick.summary.join(' ')}>
          <Award size={12} className="shrink-0 text-ai" aria-hidden />
          <span className="truncate font-medium text-positive-text">{pick.best.label}</span>
          <span className="ml-auto shrink-0 text-muted tabular-nums" title="Probabilidad estimada del pick">
            {pct(pick.best.estimate.probability, 0)}
          </span>
        </div>
      )}

      {/*
       * Solo si los modelos han participado de verdad en ESTA proyección. Cuando no llegan a entrenarse,
       * `modelConfidence` es null y la tarjeta no dice nada: no se rellena con un valor por defecto.
       */}
      {p.modelConfidence !== null && (
        <div className="flex items-center gap-1.5 border-t border-border px-3 py-1.5 text-[11px] text-ai-text">
          <Sparkles size={12} aria-hidden />
          <span className="truncate">
            {p.modelsUsed?.length ?? 0} modelos · confianza {p.modelConfidence.toFixed(1)}/10
          </span>
          <span className="ml-auto shrink-0 tabular-nums" title="Probabilidad del resultado más probable">
            {(favorito * 100).toFixed(0)} %
          </span>
        </div>
      )}
    </Link>
  );
}
