import { useMemo, useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Empty, inputClass } from '../ui';
import { fmt, fmtPct } from '../../utils/format';
import type { TeamStats } from '../../types';
import { TeamLabel } from '../TeamLabel';
import { teamDisplay } from '../../domain/models/teamDisplay';

interface Metric {
  label: string;
  get: (s: TeamStats) => number | null;
  format: (v: number | null) => React.ReactNode;
  /** true = más alto es mejor. Para GC o tarjetas es al revés. */
  higherIsBetter: boolean;
}

const METRICS: Metric[] = [
  { label: 'Puntos por partido', get: (s) => s.ppg, format: (v) => fmt(v), higherIsBetter: true },
  { label: 'Prom. goles a favor', get: (s) => s.avgGoalsFor, format: (v) => fmt(v), higherIsBetter: true },
  {
    label: 'Prom. goles en contra',
    get: (s) => s.avgGoalsAgainst,
    format: (v) => fmt(v),
    higherIsBetter: false,
  },
  {
    label: 'Corners a favor',
    get: (s) => s.corners.avgFor,
    format: (v) => fmt(v, 1),
    higherIsBetter: true,
  },
  {
    label: 'Tarjetas recibidas',
    get: (s) => s.cards.avgFor,
    format: (v) => fmt(v, 1),
    higherIsBetter: false,
  },
  {
    label: 'Tiros a puerta',
    get: (s) => s.shotsOnTarget.avgFor,
    format: (v) => fmt(v, 1),
    higherIsBetter: true,
  },
  { label: 'BTTS', get: (s) => s.bttsPct, format: (v) => fmtPct(v, 0), higherIsBetter: true },
  { label: 'Over 2.5', get: (s) => s.over25Pct, format: (v) => fmtPct(v, 0), higherIsBetter: true },
  {
    label: 'Porterías a cero',
    get: (s) => s.cleanSheetPct,
    format: (v) => fmtPct(v, 0),
    higherIsBetter: true,
  },
  {
    label: 'Forma (pts últimos 5)',
    get: (s) => s.form.last5.points,
    format: (v) => (v === null ? '—' : String(v)),
    higherIsBetter: true,
  },
  {
    label: 'Calidad de rivales (SoS)',
    get: (s) => s.sos,
    format: (v) => fmt(v),
    higherIsBetter: true,
  },
];

/**
 * Comparación de dos equipos métrica a métrica.
 *
 * Poner los dos en columnas y marcar quién gana cada fila evita el trabajo mental de ir y
 * venir entre dos fichas. La barra central muestra el reparto, no un valor absoluto: lo que
 * importa aquí es la distancia entre ambos.
 */
export function TeamCompare({ team }: { team: TeamStats }) {
  const stats = useStore((s) => s.derived.statsByTeamId);
  const teamsById = useStore((s) => s.derived.teamsById);
  const [rivalId, setRivalId] = useState('');

  const rivals = useMemo(
    () =>
      [...stats.values()]
        .filter((s) => s.leagueId === team.leagueId && s.teamId !== team.teamId)
        .sort((a, b) => a.teamName.localeCompare(b.teamName)),
    [stats, team],
  );

  const rival = rivalId ? stats.get(rivalId) : undefined;

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <ArrowLeftRight size={15} className="text-faint" />
        <TeamLabel teamId={team.teamId} name={team.teamName} className="text-[13px] font-medium" />
        <span className="text-[13px] text-faint">contra</span>
        <select
          className={inputClass}
          value={rivalId}
          onChange={(e) => setRivalId(e.target.value)}
          aria-label="Equipo con el que comparar"
        >
          <option value="">Elegir rival…</option>
          {rivals.map((r) => (
            <option key={r.teamId} value={r.teamId}>
              {teamDisplay(teamsById.get(r.teamId)?.ref, r.teamName).name}
            </option>
          ))}
        </select>
      </div>

      {!rival ? (
        <Empty icon={<ArrowLeftRight size={24} />}>
          Elige un rival de la misma competición para comparar las dos plantillas métrica a
          métrica.
        </Empty>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center gap-3 border-b border-border pb-2 text-[12px] font-semibold">
            <TeamLabel teamId={team.teamId} name={team.teamName} align="right" className="w-24 sm:w-32" />
            <span className="flex-1 text-center text-[11px] font-medium tracking-wide text-muted uppercase">
              Métrica
            </span>
            <TeamLabel teamId={rival.teamId} name={rival.teamName} className="w-24 sm:w-32" />
          </div>

          {METRICS.map((m) => {
            const a = m.get(team);
            const b = m.get(rival);
            // Sin dato en alguno de los dos no hay ganador: no se inventa una comparación.
            const comparable = a !== null && b !== null && a !== b;
            const aWins = comparable && (m.higherIsBetter ? a > b : a < b);
            const bWins = comparable && !aWins;

            const total = (a ?? 0) + (b ?? 0);
            const aShare = total > 0 ? ((a ?? 0) / total) * 100 : 50;

            return (
              <div key={m.label} className="flex items-center gap-3 py-1.5">
                <span
                  className={`w-24 text-right text-[13px] tabular-nums sm:w-32 ${
                    aWins ? 'font-semibold text-positive-text' : ''
                  }`}
                >
                  {m.format(a)}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-center text-[12px] text-muted">
                    {m.label}
                  </span>
                  <span className="mt-1 flex h-1.5 overflow-hidden rounded-pill bg-surface-2">
                    <span
                      className={aWins ? 'bg-positive' : 'bg-border-strong'}
                      style={{ width: `${aShare}%` }}
                    />
                    <span
                      className={bWins ? 'bg-positive' : 'bg-border-strong'}
                      style={{ width: `${100 - aShare}%` }}
                    />
                  </span>
                </span>

                <span
                  className={`w-24 text-[13px] tabular-nums sm:w-32 ${
                    bWins ? 'font-semibold text-positive-text' : ''
                  }`}
                >
                  {m.format(b)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
