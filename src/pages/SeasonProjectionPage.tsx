import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarRange } from 'lucide-react';
import { FilterBar } from '../components/Filters/FilterBar';
import { Badge, Callout, Card, PageHeader, Stat, StatRow } from '../components/ui';
import { DataTable, type Column } from '../components/DataTable';
import { LeagueLabel } from '../components/LeagueLabel';
import type { SeasonProjection } from '../types';
import { fmt, fmtInt, fmtSigned } from '../utils/format';
import { useStore } from '../store/useStore';
import { TeamLabel } from '../components/TeamLabel';

export function SeasonProjectionPage() {
  const rows = useStore((s) => s.derived.seasonProjections);
  const filters = useStore((s) => s.filters);
  const fixtures = useStore((s) => s.fixtures.length);
  const fixtureHorizon = useStore((s) => s.fixtureHorizon);
  const navigate = useNavigate();

  const filtered = useMemo(
    () =>
      rows
        .filter((r) => !filters.leagueId || r.leagueId === filters.leagueId)
        .filter((r) => !filters.country || r.country === filters.country)
        .sort((a, b) => a.leagueId.localeCompare(b.leagueId) || a.projectedPosition - b.projectedPosition),
    [rows, filters],
  );

  /**
   * Lo que resume la tabla. Los puestos que cambian salen de la misma resta que pinta la columna Δ.
   *
   * Si no hay partidos pendientes cargados, los puntos restantes son 0 de verdad (no un dato que falte):
   * no queda nada por jugar en la base, y el aviso de arriba ya lo explica.
   */
  const resumen = useMemo(() => {
    let suben = 0;
    let bajan = 0;
    let restantes = 0;
    let puntos = 0;
    for (const r of filtered) {
      const d = r.currentPosition - r.projectedPosition;
      if (d > 0) suben += 1;
      else if (d < 0) bajan += 1;
      restantes += r.remainingMatches;
      puntos += r.projectedRemainingPoints;
    }
    return { suben, bajan, restantes, puntos };
  }, [filtered]);

  const columns: Column<SeasonProjection>[] = [
    { id: 'liga', header: 'Competición', hideOnMobile: true, cell: (r) => <LeagueLabel leagueId={r.leagueId} size="sm" />, sortValue: (r) => r.leagueId },
    {
      id: 'equipo',
      header: 'Equipo',
      cell: (r) => (
        <Link className="font-medium hover:text-accent-text" to={`/equipos/${encodeURIComponent(r.teamId)}`} onClick={(e) => e.stopPropagation()}>
          <TeamLabel teamId={r.teamId} name={r.teamName} />
        </Link>
      ),
      sortValue: (r) => r.teamName,
    },
    { id: 'pos', header: 'Pos', title: 'Posición actual', numeric: true, cell: (r) => r.currentPosition, sortValue: (r) => r.currentPosition },
    { id: 'pts', header: 'Pts', title: 'Puntos actuales', numeric: true, cell: (r) => r.currentPoints, sortValue: (r) => r.currentPoints },
    { id: 'pj', header: 'PJ', title: 'Partidos jugados', numeric: true, hideOnMobile: true, cell: (r) => r.currentPlayed, sortValue: (r) => r.currentPlayed },
    { id: 'rest', header: 'Rest.', title: 'Partidos pendientes cargados', numeric: true, hideOnMobile: true, cell: (r) => r.remainingMatches, sortValue: (r) => r.remainingMatches },
    { id: 'ptsRest', header: 'Pts rest.', title: 'Puntos esperados en los partidos pendientes cargados', numeric: true, hideOnMobile: true, cell: (r) => fmt(r.projectedRemainingPoints, 1), sortValue: (r) => r.projectedRemainingPoints },
    { id: 'ptsProy', header: 'Pts proy.', title: 'Puntos actuales + esperados', numeric: true, cell: (r) => <span className="font-semibold">{fmt(r.projectedPoints, 1)}</span>, sortValue: (r) => r.projectedPoints },
    { id: 'gf', header: 'GF proy.', title: 'Goles a favor proyectados', numeric: true, hideOnMobile: true, cell: (r) => fmt(r.projectedGoalsFor, 1), sortValue: (r) => r.projectedGoalsFor },
    { id: 'gc', header: 'GC proy.', title: 'Goles en contra proyectados', numeric: true, hideOnMobile: true, cell: (r) => fmt(r.projectedGoalsAgainst, 1), sortValue: (r) => r.projectedGoalsAgainst },
    { id: 'corners', header: 'Corners proy.', numeric: true, hideOnMobile: true, cell: (r) => fmt(r.projectedCorners, 1), sortValue: (r) => r.projectedCorners },
    { id: 'tarjetas', header: 'Tarj. proy.', title: 'Tarjetas amarillas proyectadas', numeric: true, hideOnMobile: true, cell: (r) => fmt(r.projectedCards, 1), sortValue: (r) => r.projectedCards },
    { id: 'posProy', header: 'Pos proy.', title: 'Posición proyectada', numeric: true, cell: (r) => <span className="font-semibold">{r.projectedPosition}</span>, sortValue: (r) => r.projectedPosition },
    {
      id: 'delta',
      header: 'Δ',
      title: 'Puestos que sube (+) o baja (−) según la proyección',
      numeric: true,
      cell: (r) => {
        const d = r.currentPosition - r.projectedPosition;
        if (d === 0) return <span className="text-faint">—</span>;
        return <Badge tone={d > 0 ? 'positive' : 'negative'}>{fmtSigned(d)}</Badge>;
      },
      sortValue: (r) => r.currentPosition - r.projectedPosition,
    },
  ];

  return (
    <div>
      <PageHeader title="Fin de temporada" description="Puntos restantes = Σ (P(victoria) · 3 + P(empate) · 1) de cada partido pendiente cargado. Es una proyección del modelo, no un resultado." />
      {/* Misma banda de resumen que el resto de pantallas. */}
      <div className="mb-3">
        <StatRow>
          <Stat
            label="Equipos proyectados"
            value={fmtInt(filtered.length)}
            hint={`en ${new Set(filtered.map((r) => r.leagueId)).size} ${new Set(filtered.map((r) => r.leagueId)).size === 1 ? 'competición' : 'competiciones'}`}
            icon={<CalendarRange />}
            hero
          />
          <Stat label="Suben de puesto" value={fmtInt(resumen.suben)} tone={resumen.suben > 0 ? 'positive' : undefined} tip="Equipos cuya posición proyectada es mejor que la actual." />
          <Stat label="Bajan de puesto" value={fmtInt(resumen.bajan)} tone={resumen.bajan > 0 ? 'negative' : undefined} tip="Equipos cuya posición proyectada es peor que la actual." />
          <Stat
            label="Partidos por jugar"
            // Cada pendiente se cuenta en sus dos equipos; con un filtro que deje fuera a uno de ellos la mitad
            // no es exacta, así que se redondea en vez de enseñar un «partido y medio».
            value={fmtInt(Math.round(resumen.restantes / 2))}
            hint="pendientes cargados"
            tip="Cada partido pendiente aparece en los dos equipos: aquí se cuenta una sola vez."
          />
          <Stat label="Puntos por repartir" value={fmt(resumen.puntos, 1)} hint="esperados, no jugados" tip="Suma de los puntos esperados de todos los partidos pendientes cargados." />
        </StatRow>
      </div>
      <FilterBar show={['country', 'league']} />
      <div className="mb-3 space-y-3">
        {fixtures === 0 && (
          <Callout tone="warning" title="Sin partidos pendientes">
            Los <strong>puntos proyectados restantes son 0</strong> y la proyección coincide con la situación actual, igual que en el Excel. Carga el calendario o
            pulsa «Actualizar partidos».
          </Callout>
        )}

        {fixtures > 0 && fixtureHorizon > 0 && (
          <Callout tone="accent">
            Estás cargando solo <strong>{fixtureHorizon === 1 ? 'la próxima jornada' : `las próximas ${fixtureHorizon} jornadas`}</strong> de cada liga, así que lo
            proyectado cubre esos partidos, no lo que queda de temporada. Para una proyección a final de temporada de verdad, cambia el horizonte a «todo el
            calendario restante» en Configuración → Proveedor.
          </Callout>
        )}
      </div>

      <Card>
        <DataTable
          rows={filtered}
          columns={columns}
          getRowId={(r) => r.teamId}
          onRowClick={(r) => navigate(`/equipos/${encodeURIComponent(r.teamId)}`)}
          rowLabel={(r) => `Ver ficha de ${r.teamName}`}
          searchable={(r) => `${r.teamName} ${r.leagueId}`}
          searchPlaceholder="Buscar equipo…"
          pageSize={50}
          initialSort={{ id: 'ptsProy', dir: 'desc' }}
          empty="Sin equipos."
        />
      </Card>
    </div>
  );
}
