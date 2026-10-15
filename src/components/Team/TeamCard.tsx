/**
 * Tarjeta de un equipo. Es la fila de la tabla de Equipos cuando la pantalla es un teléfono.
 *
 * Las 13 columnas no caben, y recortarlas a las que entran deja fuera precisamente lo que se va a comparar.
 * Aquí manda el equipo, con su posición delante y su competición debajo, y las seis cifras van en una
 * rejilla de tres: cada una con su rótulo, que es lo que daba la cabecera de la tabla y una fila suelta
 * pierde.
 *
 * Todo sale de `TeamStats`. `fmt` y `fmtPct` enseñan «N/D» cuando no hay dato; nunca un cero inventado.
 */
import { Link } from 'react-router-dom';
import type { TeamStats } from '../../types';
import { TeamLabel } from '../TeamLabel';
import { LeagueLabel } from '../LeagueLabel';
import { fmt, fmtPct } from '../../utils/format';

function Cifra({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0" title={title}>
      <div className="t-label truncate text-[10px] text-faint">{label}</div>
      <div className="truncate font-display text-[14px] font-semibold tabular-nums">{children}</div>
    </div>
  );
}

export function TeamCard({ s }: { s: TeamStats }) {
  const f = s.form.last5;

  return (
    <Link
      to={`/equipos/${encodeURIComponent(s.teamId)}`}
      aria-label={`Ver la ficha de ${s.teamName}`}
      className="card-interactive flex h-full flex-col rounded-card border border-border bg-surface shadow-card focus-visible:outline-offset-0"
    >
      {/* Competición debajo del nombre y no al lado: en una sola línea, a 375 px, el nombre se quedaba en «Indepen…». */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-control bg-surface-2 font-display text-[12px] font-semibold tabular-nums"
          title="Posición en su competición"
        >
          {s.position}
        </span>
        <span className="flex min-w-0 flex-col">
          <TeamLabel teamId={s.teamId} name={s.teamName} size={20} className="min-w-0 text-[13px] font-medium" />
          <LeagueLabel leagueId={s.leagueId} size="sm" className="min-w-0 pl-[1.625rem] text-[10px] text-faint" />
        </span>
      </div>

      <div className="grid flex-1 grid-cols-3 gap-x-3 gap-y-2 px-3 py-2.5">
        <Cifra label="Pts" title="Puntos">
          {s.points}
        </Cifra>
        <Cifra label="PJ" title="Partidos jugados">
          {s.played}
        </Cifra>
        <Cifra label="PPG" title="Puntos por partido">
          {fmt(s.ppg)}
        </Cifra>
        <Cifra label="Prom GF" title="Goles a favor por partido">
          {fmt(s.avgGoalsFor)}
        </Cifra>
        <Cifra label="Prom GC" title="Goles en contra por partido">
          {fmt(s.avgGoalsAgainst)}
        </Cifra>
        <Cifra label="O2.5" title="% de partidos con 3 o más goles">
          {fmtPct(s.over25Pct, 0)}
        </Cifra>
      </div>

      {/* Solo si ha jugado algo en las últimas cinco: sin partidos no hay forma que enseñar. */}
      {f.played > 0 && (
        <div className="flex items-center gap-2 border-t border-border px-3 py-1.5 text-[11px] text-muted">
          <span className="t-label text-[10px] text-faint">Forma 5</span>
          <span className="tabular-nums" title={`${f.won} ganados, ${f.drawn} empatados, ${f.lost} perdidos`}>
            {f.won}-{f.drawn}-{f.lost}
          </span>
          <span className="ml-auto font-medium text-text tabular-nums" title="Puntos en las últimas 5 jornadas">
            {f.points} pts
          </span>
        </div>
      )}
    </Link>
  );
}
