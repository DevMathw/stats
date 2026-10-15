import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Eye, Users } from 'lucide-react';
import { FilterBar } from '../components/Filters/FilterBar';
import { Badge, Card, Empty, FormBadges, IconButton, MiniBar, PageHeader, Stat, StatRow, Tabs } from '../components/ui';
import { DataTable, type Column } from '../components/DataTable';
import { LeagueLabel } from '../components/LeagueLabel';
import { useChartStyle } from '../components/Charts/chartStyle';
import { TeamCompare } from '../components/Team/TeamCompare';
import { TeamCard } from '../components/Team/TeamCard';
import { fmt, fmtInt, fmtPct } from '../utils/format';
import { formatRound } from '../domain/models/ids';
import { RoundLabel } from '../components/RoundLabel';
import { awayPossession, resultFT, scoreline } from '../domain/calculations/matchDerived';
import type { FormWindow, Match, SplitStats, StatAggregate, TeamStats } from '../types';
import { useStore } from '../store/useStore';
import { matchesInWindow } from '../domain/statistics/form';
import { TeamLabel } from '../components/TeamLabel';

export function TeamsPage() {
  const stats = useStore((s) => s.derived.statsByTeamId);
  const filters = useStore((s) => s.filters);
  const status = useStore((s) => s.status);
  const navigate = useNavigate();

  const rows = useMemo(
    () =>
      [...stats.values()]
        .filter((s) => !filters.leagueId || s.leagueId === filters.leagueId)
        .filter((s) => !filters.country || s.country === filters.country)
        .filter((s) => !filters.teamId || s.teamId === filters.teamId),
    [stats, filters],
  );

  // El máximo del conjunto visible da la escala de las barras: comparar es el objetivo.
  const max = useMemo(
    () => ({
      ppg: Math.max(...rows.map((r) => r.ppg ?? 0), 0.01),
      gf: Math.max(...rows.map((r) => r.avgGoalsFor ?? 0), 0.01),
    }),
    [rows],
  );

  /**
   * Lo que resume la tabla. Las medias salen solo de los equipos que tienen el dato y son `null` si no hay
   * ninguno: un equipo sin partidos no es un equipo con 0 puntos por partido.
   */
  const resumen = useMemo(() => {
    const media = (xs: (number | null)[]) => {
      const v = xs.filter((x): x is number => x !== null && Number.isFinite(x));
      return v.length === 0 ? null : v.reduce((a, b) => a + b, 0) / v.length;
    };
    return {
      ligas: new Set(rows.map((r) => r.leagueId)).size,
      partidos: rows.reduce((n, r) => n + r.played, 0),
      ppg: media(rows.map((r) => r.ppg)),
      gf: media(rows.map((r) => r.avgGoalsFor)),
    };
  }, [rows]);

  const columns: Column<TeamStats>[] = [
    { id: 'pos', header: '#', title: 'Posición en su competición', numeric: true, width: '3rem', cell: (s) => s.position, sortValue: (s) => s.position },
    {
      id: 'team',
      header: 'Equipo',
      cell: (s) => (
        <Link className="font-medium hover:text-accent-text" to={`/equipos/${encodeURIComponent(s.teamId)}`} onClick={(e) => e.stopPropagation()}>
          <TeamLabel teamId={s.teamId} name={s.teamName} />
        </Link>
      ),
      sortValue: (s) => s.teamName,
    },
    { id: 'liga', header: 'Competición', hideOnMobile: true, cell: (s) => <LeagueLabel leagueId={s.leagueId} size="sm" />, sortValue: (s) => s.leagueId },
    { id: 'pj', header: 'PJ', title: 'Partidos jugados', numeric: true, cell: (s) => s.played, sortValue: (s) => s.played },
    { id: 'pts', header: 'Pts', title: 'Puntos', numeric: true, cell: (s) => <span className="font-semibold">{s.points}</span>, sortValue: (s) => s.points },
    { id: 'ppg', header: 'PPG', title: 'Puntos por partido', numeric: true, cell: (s) => <MiniBar value={s.ppg} max={max.ppg} />, sortValue: (s) => s.ppg },
    { id: 'gf', header: 'Prom GF', title: 'Goles a favor por partido', numeric: true, cell: (s) => <MiniBar value={s.avgGoalsFor} max={max.gf} />, sortValue: (s) => s.avgGoalsFor },
    { id: 'gc', header: 'Prom GC', title: 'Goles en contra por partido', numeric: true, hideOnMobile: true, cell: (s) => fmt(s.avgGoalsAgainst), sortValue: (s) => s.avgGoalsAgainst },
    { id: 'btts', header: 'BTTS', title: '% de partidos en los que marcaron los dos', numeric: true, hideOnMobile: true, cell: (s) => fmtPct(s.bttsPct, 0), sortValue: (s) => s.bttsPct },
    { id: 'o25', header: 'O2.5', title: '% de partidos con 3 o más goles', numeric: true, hideOnMobile: true, cell: (s) => fmtPct(s.over25Pct, 0), sortValue: (s) => s.over25Pct },
    { id: 'cs', header: 'Portería 0', title: '% de partidos sin encajar', numeric: true, hideOnMobile: true, cell: (s) => fmtPct(s.cleanSheetPct, 0), sortValue: (s) => s.cleanSheetPct },
    { id: 'sos', header: 'SoS', title: 'Calidad de los rivales: media de sus puntos por partido', numeric: true, hideOnMobile: true, cell: (s) => fmt(s.sos), sortValue: (s) => s.sos },
    {
      id: 'f5',
      header: 'Forma',
      title: 'Puntos en las últimas 5 jornadas',
      numeric: true,
      cell: (s) => <Badge tone={s.form.last5.points >= 10 ? 'positive' : 'neutral'}>{s.form.last5.points}</Badge>,
      sortValue: (s) => s.form.last5.points,
    },
  ];

  return (
    <div>
      <PageHeader title="Equipos" description="Rendimiento de cada equipo en su competición. Ordena por cualquier columna para comparar; pulsa una fila para abrir su ficha." />
      {/* Misma banda de resumen que el resto de pantallas. */}
      <div className="mb-3">
        <StatRow>
          <Stat label="Equipos" value={fmtInt(rows.length)} hint={`en ${resumen.ligas} ${resumen.ligas === 1 ? 'competición' : 'competiciones'}`} icon={<Users />} hero />
          <Stat label="Partidos jugados" value={fmtInt(resumen.partidos)} tip="Suma de los partidos de los equipos seleccionados. Cada partido cuenta por sus dos equipos." />
          <Stat label="PPG medio" value={fmt(resumen.ppg)} hint="puntos por partido" tip="Media de los puntos por partido de los equipos seleccionados." />
          <Stat label="Goles a favor" value={fmt(resumen.gf)} hint="media por partido" />
          <Stat label="Máximo PPG" value={fmt(max.ppg)} tip="El mejor puntos por partido de la selección: es la escala de las barras de la tabla." />
        </StatRow>
      </div>
      <FilterBar show={['country', 'league', 'team']} />
      <Card>
        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(s) => s.teamId}
          onRowClick={(s) => navigate(`/equipos/${encodeURIComponent(s.teamId)}`)}
          rowLabel={(s) => `Ver ficha de ${s.teamName}`}
          searchable={(s) => `${s.teamName} ${s.leagueId}`}
          searchPlaceholder="Buscar equipo…"
          pageSize={15}
          loading={status === 'importing'}
          initialSort={{ id: 'pts', dir: 'desc' }}
          // Las 13 columnas no caben en un teléfono: por debajo de `md` cada equipo es una tarjeta.
          card={(s) => <TeamCard s={s} />}
          empty="Sin equipos. Importa el Excel desde Configuración."
        />
      </Card>
    </div>
  );
}

function AggRow({ label, agg }: { label: string; agg: StatAggregate }) {
  return (
    <tr>
      <td>{label}</td>
      <td className="num">{agg.sample === 0 ? <span className="text-faint">N/D</span> : agg.for}</td>
      <td className="num">{agg.sample === 0 ? <span className="text-faint">N/D</span> : agg.against}</td>
      <td className="num">{fmt(agg.avgFor)}</td>
      <td className="num">{fmt(agg.avgAgainst)}</td>
      <td className="num">{fmt(agg.avgTotal)}</td>
      <td className="num text-faint">{agg.sample}</td>
    </tr>
  );
}

function Fila({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr>
      <td className="text-muted">{label}</td>
      <td className="num">{children}</td>
    </tr>
  );
}

function SplitTable({ split }: { split: SplitStats }) {
  return (
    <table className="data">
      <tbody>
        <Fila label="PJ / PG / PE / PP">
          {split.played} / {split.won} / {split.drawn} / {split.lost}
        </Fila>
        <Fila label="Puntos">
          <span className="font-semibold">{split.points}</span>
        </Fila>
        <Fila label="GF / GC">
          {split.goalsFor} / {split.goalsAgainst}
        </Fila>
        <Fila label="Prom GF / Prom GC">
          {fmt(split.avgGoalsFor)} / {fmt(split.avgGoalsAgainst)}
        </Fila>
        <Fila label="Corners (favor / contra)">
          {fmt(split.corners.avgFor, 1)} / {fmt(split.corners.avgAgainst, 1)}
        </Fila>
        <Fila label="Tarjetas (favor / contra)">
          {fmt(split.cards.avgFor, 1)} / {fmt(split.cards.avgAgainst, 1)}
        </Fila>
        <Fila label="Tiros (favor / contra)">
          {fmt(split.shots.avgFor, 1)} / {fmt(split.shots.avgAgainst, 1)}
        </Fila>
        <Fila label="Tiros a puerta (favor / contra)">
          {fmt(split.shotsOnTarget.avgFor, 1)} / {fmt(split.shotsOnTarget.avgAgainst, 1)}
        </Fila>
        <Fila label="BTTS / Over 2.5 / Portería a cero">
          {fmtPct(split.bttsPct, 0)} / {fmtPct(split.over25Pct, 0)} / {fmtPct(split.cleanSheetPct, 0)}
        </Fila>
      </tbody>
    </table>
  );
}

function FormTable({ w }: { w: FormWindow }) {
  return (
    <table className="data">
      <tbody>
        <Fila label="PJ">{w.played}</Fila>
        <Fila label="V / E / D">
          {w.won} / {w.drawn} / {w.lost}
        </Fila>
        <Fila label="Puntos">
          <span className="font-semibold">{w.points}</span>
        </Fila>
        <Fila label="GF / GC">
          {w.goalsFor} / {w.goalsAgainst}
        </Fila>
        <Fila label="Prom GF / Prom GC">
          {fmt(w.avgGoalsFor)} / {fmt(w.avgGoalsAgainst)}
        </Fila>
      </tbody>
    </table>
  );
}

type Tab = 'resumen' | 'comparar' | 'homeaway' | 'forma' | 'metricas' | 'partidos';

export function TeamDetailPage() {
  const { teamId = '' } = useParams();
  const id = decodeURIComponent(teamId);
  const [tab, setTab] = useState<Tab>('resumen');

  const stats = useStore((s) => s.derived.statsByTeamId.get(id));
  const home = useStore((s) => s.derived.homeStatsByTeamId.get(id));
  const away = useStore((s) => s.derived.awayStatsByTeamId.get(id));
  const allMatches = useStore((s) => s.matches);
  /** Equipos de su competición: da sentido a la posición («3.º de 20» dice más que «3.º»). */
  const plantilla = useStore((s) => (stats ? (s.derived.standingsByLeague.get(stats.leagueId)?.length ?? 0) : 0));
  const formWindowMode = useStore((s) => s.params.formWindowMode ?? 'fecha');

  const teamMatches = useMemo(
    () => allMatches.filter((m) => m.homeTeamId === id || m.awayTeamId === id).sort((a, b) => b.round - a.round || b.date.localeCompare(a.date)),
    [allMatches, id],
  );

  const last5Badges = useMemo(() => {
    if (!stats) return [];
    // La ventana la decide el dominio, no esta pantalla: si aquí se repite la fórmula, las insignias y la
    // tabla de forma acaban contando partidos distintos en cuanto cambia el método (DIFF-12).
    return matchesInWindow(teamMatches, stats.leagueId, stats.teamName, 5, formWindowMode)
      .map((m) => {
        const r = resultFT(m);
        if (r === null) return 'D' as const;
        if (r === 'X') return 'D' as const;
        const isHome = m.homeTeamId === id;
        return (r === '1') === isHome ? ('W' as const) : ('L' as const);
      });
  }, [teamMatches, stats, id, formWindowMode]);

  // Los hooks van antes de cualquier return: si no, el orden cambia entre renders.
  const { chart, rejilla, ejeX, ejeY, tooltip } = useChartStyle();

  if (!stats || !home || !away)
    return (
      <Card>
        <Empty
          icon={<Users />}
          title="Equipo no encontrado"
          action={
            <Link to="/equipos" className="text-[13px] font-medium text-accent-text hover:underline">
              Volver a Equipos
            </Link>
          }
        />
      </Card>
    );

  // Sin dato, sin barra: un 0 aparentaría un promedio real.
  const chartData = [
    { name: 'Goles', Local: home.avgGoalsFor, Visitante: away.avgGoalsFor },
    { name: 'Encajados', Local: home.avgGoalsAgainst, Visitante: away.avgGoalsAgainst },
    { name: 'Corners', Local: home.corners.avgFor, Visitante: away.corners.avgFor },
    { name: 'Tarjetas', Local: home.cards.avgFor, Visitante: away.cards.avgFor },
  ];

  const partidoCols: Column<Match>[] = [
    { id: 'fecha', header: 'Fecha', cell: (m) => <span className="tabular-nums">{m.date}</span>, sortValue: (m) => m.date },
    { id: 'j', header: 'J', title: 'Jornada', numeric: true, hideOnMobile: true, cell: (m) => <RoundLabel match={m} />, sortValue: (m) => m.round },
    {
      id: 'rival',
      header: 'Rival',
      cell: (m) => {
        const isHome = m.homeTeamId === id;
        return (
          <Link className="hover:text-accent-text" to={`/equipos/${encodeURIComponent(isHome ? m.awayTeamId : m.homeTeamId)}`}>
            <TeamLabel teamId={isHome ? m.awayTeamId : m.homeTeamId} name={isHome ? m.awayTeamName : m.homeTeamName} />
          </Link>
        );
      },
    },
    { id: 'sede', header: 'Sede', cell: (m) => <Badge>{m.homeTeamId === id ? 'Local' : 'Visitante'}</Badge> },
    {
      id: 'resultado',
      header: 'Resultado',
      numeric: true,
      cell: (m) => {
        const r = resultFT(m);
        const isHome = m.homeTeamId === id;
        const tono = r === null ? 'neutral' : r === 'X' ? 'neutral' : (r === '1') === isHome ? 'positive' : 'negative';
        return (
          <span className="inline-flex items-center gap-2">
            <span className="font-semibold tabular-nums">{scoreline(m) ?? '—'}</span>
            {r !== null && <Badge tone={tono}>{r === 'X' ? 'E' : tono === 'positive' ? 'V' : 'D'}</Badge>}
          </span>
        );
      },
    },
    { id: 'posesion', header: 'Posesión', numeric: true, hideOnMobile: true, cell: (m) => fmtPct(m.homeTeamId === id ? m.possessionHome : awayPossession(m), 0) },
  ];

  return (
    <div className="grid gap-4">
      <PageHeader title={<TeamLabel teamId={stats.teamId} name={stats.teamName} size={28} />} description={<LeagueLabel leagueId={stats.leagueId} link size="sm" />} />

      {/* La posición es lo primero que se mira de un equipo; la liga ya la dice la cabecera, así que el
          `hint` que la repetía sobraba. */}
      <StatRow cols={5}>
        <Stat label="Posición" value={fmtInt(stats.position)} hint={`de ${plantilla} equipos`} hero />
        <Stat label="Puntos" value={fmtInt(stats.points)} hint={`${stats.played} PJ`} />
        <Stat label="PPG" value={fmt(stats.ppg)} tip="Puntos por partido." />
        <Stat label="GF / GC" value={`${stats.goalsFor} / ${stats.goalsAgainst}`} />
        <Stat label="Forma últimos 5" value={<FormBadges results={last5Badges} />} />
        <Stat label="SoS" value={fmt(stats.sos)} tip="Calidad de los rivales: media de los puntos por partido de los equipos contra los que ha jugado." />
      </StatRow>

      <Card>
        <Tabs
          tabs={[
            { id: 'resumen' as const, label: 'Resumen' },
            { id: 'comparar' as const, label: 'Comparar' },
            { id: 'homeaway' as const, label: 'Local / visitante' },
            { id: 'forma' as const, label: 'Forma' },
            { id: 'metricas' as const, label: 'Métricas' },
            { id: 'partidos' as const, label: 'Partidos', count: teamMatches.length },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === 'resumen' && (
          <div className="grid gap-4 p-4 lg:grid-cols-2">
            <table className="data">
              <tbody>
                <Fila label="PJ / PG / PE / PP">
                  {stats.played} / {stats.won} / {stats.drawn} / {stats.lost}
                </Fila>
                <Fila label="GF / GC / DG">
                  {stats.goalsFor} / {stats.goalsAgainst} / {stats.goalDiff}
                </Fila>
                <Fila label="Prom GF / GC / totales">
                  {fmt(stats.avgGoalsFor)} / {fmt(stats.avgGoalsAgainst)} / {fmt(stats.avgGoalsTotal)}
                </Fila>
                <Fila label="Prom goles como local / visitante">
                  {fmt(stats.avgGoalsAsHome)} / {fmt(stats.avgGoalsAsAway)}
                </Fila>
                <Fila label="Ambos marcan">{fmtPct(stats.bttsPct)}</Fila>
                <Fila label="Over 1.5 / 2.5 / 3.5">
                  {fmtPct(stats.over15Pct, 0)} / {fmtPct(stats.over25Pct, 0)} / {fmtPct(stats.over35Pct, 0)}
                </Fila>
                <Fila label="Under 2.5">{fmtPct(stats.under25Pct)}</Fila>
                <Fila label="Porterías a cero">{fmtPct(stats.cleanSheetPct)}</Fila>
                <Fila label="Strength of Schedule">{fmt(stats.sos)}</Fila>
              </tbody>
            </table>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid {...rejilla} />
                  <XAxis dataKey="name" {...ejeX} />
                  <YAxis width={34} {...ejeY} />
                  <Tooltip {...tooltip} formatter={(v) => (typeof v === 'number' ? v.toFixed(2) : 'N/D')} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Local" fill={chart.series[0]} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Visitante" fill={chart.series[1]} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {tab === 'comparar' && <TeamCompare team={stats} />}

        {tab === 'homeaway' && (
          <div className="grid gap-4 p-4 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold">Como local</h3>
              <SplitTable split={home} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold">Como visitante</h3>
              <SplitTable split={away} />
            </div>
          </div>
        )}

        {tab === 'forma' && (
          <div className="p-4">
            <p className="mb-3 text-xs text-muted">
              {formWindowMode === 'fecha' ? (
                <>
                  Se toman los <strong>últimos N partidos que el equipo ha jugado</strong>, por fecha. La jornada más alta
                  que tiene jugada es {formatRound(stats.form.lastRound)}, pero no manda: en una competición por fases el
                  play-off vuelve a numerar desde la J1 y esa numeración dejaría fuera lo más reciente (DIFF-12).
                </>
              ) : (
                <>
                  Ventana del Excel: los partidos cuya <strong>jornada</strong> está entre {'>'} (última jornada − N) y ≤
                  última jornada (última jugada: {formatRound(stats.form.lastRound)}). No es «los últimos N por fecha», y
                  con una fase nueva deja fuera los partidos más recientes. Se cambia en Configuración.
                </>
              )}
            </p>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-semibold">Últimos 5</h3>
                <FormTable w={stats.form.last5} />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold">Últimos 10</h3>
                <FormTable w={stats.form.last10} />
              </div>
            </div>
          </div>
        )}

        {tab === 'metricas' && (
          <div className="overflow-x-auto">
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">Métrica</th>
                  <th scope="col" className="num">Favor</th>
                  <th scope="col" className="num">Contra</th>
                  <th scope="col" className="num">Prom favor</th>
                  <th scope="col" className="num">Prom contra</th>
                  <th scope="col" className="num">Prom total</th>
                  <th scope="col" className="num">Muestra</th>
                </tr>
              </thead>
              <tbody>
                <AggRow label="Corners" agg={stats.corners} />
                <AggRow label="Tarjetas" agg={stats.cards} />
                <AggRow label="Tiros" agg={stats.shots} />
                <AggRow label="Tiros a puerta" agg={stats.shotsOnTarget} />
              </tbody>
            </table>
          </div>
        )}

        {tab === 'partidos' && (
          <DataTable
            rows={teamMatches}
            columns={partidoCols}
            getRowId={(m) => m.id}
            initialSort={{ id: 'fecha', dir: 'desc' }}
            pageSize={15}
            empty="Sin partidos cargados."
            actions={(m) => <IconButton icon={<Eye size={16} />} label="Ver ficha del partido" to={`/partidos/${encodeURIComponent(m.id)}`} />}
          />
        )}
      </Card>
    </div>
  );
}
