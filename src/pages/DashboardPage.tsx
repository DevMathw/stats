import { lazy, Suspense, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarClock, Database, Flame, Target, Trophy } from 'lucide-react';
import { FilterBar } from '../components/Filters/FilterBar';
import { CountryFlag, LeagueLabel } from '../components/LeagueLabel';
import { DataTable, type Column } from '../components/DataTable';
import { Badge, ButtonLink, Card, Empty, PageHeader, SectionTitle, Skeleton, Stat, StatRow } from '../components/ui';
import { fmt, fmtInt, fmtPct } from '../utils/format';
import { applyFilters, calculateKpis, calculateLeagueSummary, roundTrend, type LeagueSummaryRow } from '../domain/statistics/dashboard';
import { describeLeagueRounds } from '../domain/statistics/leagueRounds';
import type { StandingRow, TeamStats } from '../types';
import { useStore } from '../store/useStore';
import { TeamLabel } from '../components/TeamLabel';
import { MatchCard } from '../components/Match/MatchCard';

// El unico grafico del dashboard, y queda bajo la primera pantalla: su libreria no tiene por que entrar en el arranque.
const TrendChart = lazy(() => import('../components/Charts/TrendChart'));

export function DashboardPage() {
  const matches = useStore((s) => s.matches);
  const filters = useStore((s) => s.filters);
  const derived = useStore((s) => s.derived);
  const leagues = useStore((s) => s.leagues);
  const status = useStore((s) => s.status);
  const navigate = useNavigate();

  const filtered = useMemo(() => applyFilters(matches, filters), [matches, filters]);
  const kpis = useMemo(() => calculateKpis(filtered), [filtered]);
  const leagueSummary = useMemo(() => calculateLeagueSummary(matches), [matches]);
  const trend = useMemo(() => roundTrend(filters.leagueId ? matches.filter((m) => m.leagueId === filters.leagueId) : matches), [matches, filters.leagueId]);

  // Sin competición elegida se muestra la primera con datos: una tabla vacía no enseña nada.
  const focusLeague = filters.leagueId ?? leagueSummary.find((l) => l.matches > 0)?.leagueId ?? leagues[0]?.id ?? null;
  const standings = focusLeague ? (derived.standingsByLeague.get(focusLeague) ?? []) : [];
  const rounds = focusLeague ? derived.roundsByLeague.get(focusLeague) : undefined;

  const upcoming = useMemo(
    () =>
      [...derived.projections]
        .filter((p) => !filters.leagueId || p.leagueId === filters.leagueId)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 6),
    [derived.projections, filters.leagueId],
  );

  const inForm = useMemo(
    () =>
      [...derived.statsByTeamId.values()]
        .filter((s) => (!filters.leagueId || s.leagueId === filters.leagueId) && s.form.last5.played > 0)
        .sort((a, b) => b.form.last5.points - a.form.last5.points || b.form.last5.goalsFor - a.form.last5.goalsFor)
        .slice(0, 8),
    [derived.statsByTeamId, filters.leagueId],
  );

  if (matches.length === 0) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <Card>
          <Empty icon={<Database />} title="Todavía no hay partidos cargados" action={<ButtonLink to="/configuracion" variant="primary">Importar el Excel</ButtonLink>}>
            Importa el libro de la temporada desde Configuración para empezar.
          </Empty>
        </Card>
      </>
    );
  }

  const leagueCols: Column<LeagueSummaryRow>[] = [
    { id: 'league', header: 'Competición', cell: (r) => <LeagueLabel leagueId={r.leagueId} link />, sortValue: (r) => r.leagueId },
    { id: 'pj', header: 'PJ', title: 'Partidos jugados cargados', numeric: true, cell: (r) => r.matches, sortValue: (r) => r.matches },
    { id: 'goles', header: 'Goles', title: 'Goles por partido', numeric: true, cell: (r) => fmt(r.avgGoals.value), sortValue: (r) => r.avgGoals.value },
    { id: 'corners', header: 'Corners', title: 'Corners por partido, entre los que tienen el dato', numeric: true, hideOnMobile: true, cell: (r) => fmt(r.avgCorners.value), sortValue: (r) => r.avgCorners.value },
    { id: 'tarjetas', header: 'Amarillas', title: 'Amarillas por partido, entre los que tienen el dato', numeric: true, hideOnMobile: true, cell: (r) => fmt(r.avgCards.value), sortValue: (r) => r.avgCards.value },
  ];

  const standingCols: Column<StandingRow>[] = [
    { id: 'pos', header: '#', title: 'Posición', numeric: true, width: '3rem', cell: (r) => r.position },
    {
      id: 'team',
      header: 'Equipo',
      cell: (r) => (
        <Link className="font-medium hover:text-accent-text" to={`/equipos/${encodeURIComponent(r.teamId)}`} onClick={(e) => e.stopPropagation()}>
          <TeamLabel teamId={r.teamId} name={r.teamName} />
        </Link>
      ),
      sortValue: (r) => r.teamName,
    },
    { id: 'pj', header: 'PJ', title: 'Partidos jugados', numeric: true, cell: (r) => r.played, sortValue: (r) => r.played },
    {
      id: 'dg',
      header: 'DG',
      title: 'Diferencia de goles',
      numeric: true,
      hideOnMobile: true,
      cell: (r) => <span className={r.goalDiff > 0 ? 'text-positive-text' : r.goalDiff < 0 ? 'text-negative-text' : ''}>{r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}</span>,
      sortValue: (r) => r.goalDiff,
    },
    { id: 'pts', header: 'Pts', title: 'Puntos', numeric: true, cell: (r) => <span className="font-semibold">{r.points}</span>, sortValue: (r) => r.points },
  ];

  const formCols: Column<TeamStats>[] = [
    {
      // El panel es estrecho: la competición va como bandera junto al nombre, no en su
      // propia columna, que obligaba a hacer scroll horizontal.
      id: 'team',
      header: 'Equipo',
      cell: (s) => (
        <span className="flex items-center gap-2 font-medium">
          <CountryFlag country={s.country} />
          <TeamLabel teamId={s.teamId} name={s.teamName} />
        </span>
      ),
    },
    {
      id: 'pts',
      header: 'Pts (5)',
      title: 'Puntos en la ventana de las últimas 5 jornadas',
      numeric: true,
      cell: (s) => <Badge tone={s.form.last5.points >= 10 ? 'positive' : 'neutral'}>{s.form.last5.points}</Badge>,
      sortValue: (s) => s.form.last5.points,
    },
    {
      id: 'gf',
      header: 'GF–GC',
      title: 'Goles a favor – en contra en esa ventana',
      numeric: true,
      cell: (s) => `${s.form.last5.goalsFor}–${s.form.last5.goalsAgainst}`,
      sortValue: (s) => s.form.last5.goalsFor - s.form.last5.goalsAgainst,
    },
  ];

  const irEquipo = (teamId: string) => navigate(`/equipos/${encodeURIComponent(teamId)}`);

  return (
    <div className="space-y-5">
      <div>
        <PageHeader
          title="Dashboard"
          description={`${fmtInt(kpis.matches)} partidos con resultado en ${leagues.length} competiciones. Medias por partido, clasificación, forma y próximos partidos.`}
          actions={
            <ButtonLink to="/proyecciones">
              Ver proyecciones <ArrowRight size={14} aria-hidden />
            </ButtonLink>
          }
        />
        <FilterBar />
      </div>

      {/*
        * UNA cifra manda, y es la media de goles: es la que se mira siempre y la que mueve casi todos los
        * mercados. Las otras cinco son contexto y van iguales entre sí.
        *
        * Antes destacaban dos (partidos y goles). Dos cifras grandes compitiendo no son jerarquía: hay que
        * leer las dos para saber cuál importa. Y «partidos» es volumen, no un hallazgo: dice cuánto hay
        * detrás, no qué pasa en los partidos.
        */}
      <StatRow>
        <Stat
          label="Goles / partido"
          value={fmt(kpis.avgGoals.value)}
          hint={`${fmtInt(kpis.avgGoals.sample)} partidos con marcador`}
          icon={<Target />}
          hero
        />
        <Stat label="Corners / partido" value={fmt(kpis.avgCorners.value)} hint={`${kpis.avgCorners.sample} con dato`} tip="Media entre los partidos cuya fuente publicó corners. Los que no, no cuentan como 0." />
        <Stat label="Amarillas / partido" value={fmt(kpis.avgCards.value)} hint={`${kpis.avgCards.sample} con dato`} tip="Media entre los partidos cuya fuente publicó tarjetas. Varias ligas sudamericanas publican 0 cuando no las registran." />
        <Stat label="Ambos marcan" value={fmtPct(kpis.bttsPct.value)} hint={`${kpis.bttsPct.sample} con dato`} tip="Partidos en los que marcaron los dos equipos, sobre los que tienen marcador." />
        <Stat label="Over 2.5" value={fmtPct(kpis.over25Pct.value)} hint={`${kpis.over25Pct.sample} con dato`} tip="Partidos con 3 o más goles, sobre los que tienen marcador." />
      </StatRow>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* La clasificación es lo que más se consulta: ocupa dos tercios. */}
        <Card
          className="xl:col-span-2"
          title={
            focusLeague ? (
              <span className="flex items-center gap-2">
                <Trophy size={14} className="text-faint" aria-hidden />
                <LeagueLabel leagueId={focusLeague} />
              </span>
            ) : (
              'Clasificación'
            )
          }
          subtitle={rounds ? describeLeagueRounds(rounds) : undefined}
          right={
            focusLeague && (
              <ButtonLink to={`/ligas/${encodeURIComponent(focusLeague)}`} size="sm" variant="ghost">
                Ver ficha <ArrowRight size={12} aria-hidden />
              </ButtonLink>
            )
          }
        >
          <DataTable
            rows={standings}
            columns={standingCols}
            getRowId={(r) => r.teamId}
            onRowClick={(r) => irEquipo(r.teamId)}
            rowLabel={(r) => `Ver ficha de ${r.teamName}`}
            loading={status === 'importing'}
            maxHeight="26rem"
            empty="Esta competición no tiene partidos cargados."
          />
        </Card>

        <Card
          title={
            <span className="flex items-center gap-2">
              <Flame size={14} className="text-faint" aria-hidden />
              En forma
            </span>
          }
          subtitle="Puntos en la ventana de las últimas 5 jornadas"
        >
          <DataTable
            rows={inForm}
            columns={formCols}
            getRowId={(s) => s.teamId}
            onRowClick={(s) => irEquipo(s.teamId)}
            rowLabel={(s) => `Ver ficha de ${s.teamName}`}
            loading={status === 'importing'}
            maxHeight="26rem"
            empty="Sin partidos suficientes."
          />
        </Card>
      </div>

      {/*
        * Tarjetas y no una tabla: un partido es un enfrentamiento, no un registro, y en la tabla había que
        * leer ocho columnas para reconstruir lo que aquí se ve de un vistazo. La tabla completa, con sus
        * filtros y su paginación, sigue en Proyecciones.
        */}
      <div>
        <SectionTitle
          right={
            <Link to="/proyecciones" className="rounded text-[12px] font-medium text-accent-text hover:underline">
              Ver las {derived.projections.length} proyecciones
            </Link>
          }
        >
          Próximos partidos
        </SectionTitle>
        {upcoming.length === 0 ? (
          <Card>
            <Empty icon={<CalendarClock />} title="No hay partidos pendientes cargados">
              Añádelos en{' '}
              <Link to="/partidos" className="text-accent-text hover:underline">
                Partidos → Pendientes
              </Link>{' '}
              o pulsa «Actualizar partidos» con una competición elegida.
            </Empty>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((p) => (
              <MatchCard key={p.fixtureId} p={p} />
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Card title="Resumen por competición" subtitle="Todas las ligas, sin filtrar" className="xl:col-span-2">
          <DataTable
            rows={leagueSummary}
            columns={leagueCols}
            getRowId={(r) => r.leagueId}
            searchable={(r) => r.leagueId}
            searchPlaceholder="Buscar competición…"
            isRowHighlighted={(r) => r.leagueId === focusLeague}
            maxHeight="24rem"
            initialSort={{ id: 'pj', dir: 'desc' }}
          />
        </Card>

        <Card title="Tendencia por jornada" subtitle="Goles y corners por partido" className="xl:col-span-3">
          <Suspense fallback={<Skeleton className="m-3 h-[17rem]" />}>
            <TrendChart data={trend} />
          </Suspense>
        </Card>
      </div>
    </div>
  );
}
