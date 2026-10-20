import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Calculator, CalendarClock, LayoutGrid, Sparkles, Table2 } from 'lucide-react';
import { FilterBar } from '../components/Filters/FilterBar';
import { Badge, Button, ButtonLink, Card, IconButton, Modal, PageHeader, ProbBadge, SegmentedControl, Stat, StatRow } from '../components/ui';
import { DataTable, type Column } from '../components/DataTable';
import { LeagueLabel } from '../components/LeagueLabel';
import { ModelPickCard, ModelPickCell } from '../components/Betting/ModelPick';
import { useModelPicks } from '../components/Betting/useFixtureData';
import { NA, fmt, fmtInt, fmtPct } from '../utils/format';
import { KickoffTime } from '../components/Kickoff';
import { shortDate } from '../utils/matchTime';
import { RoundLabel } from '../components/RoundLabel';
import { describeLeagueRounds } from '../domain/statistics/leagueRounds';
import type { ModelPick } from '../domain/betting/modelPick';
import type { MatchProjection, OutcomePick } from '../types';
import { useStore } from '../store/useStore';
import { MatchTeams, TeamLabel } from '../components/TeamLabel';
import { ModelComposition } from '../components/Match/ModelComposition';
import { AiInsight } from '../components/Match/AiInsight';
import { MatchCard } from '../components/Match/MatchCard';
import { PESO_LIBRO } from '../domain/projections/matchProjection';

/** Cómo se enseña cada resultado. MODEL_MAPPING.md DIFF-03. */
const RESULTADOS: Record<OutcomePick, { corto: string; texto: string; tono: 'accent' | 'neutral' | 'warning' }> = {
  '1': { corto: '1', texto: 'Gana el local (favorito con 55 % o más)', tono: 'accent' },
  '1X': { corto: '1X', texto: 'Local o empate (local favorito, entre 45 y 55 %)', tono: 'accent' },
  sinFavorito: { corto: '—', texto: 'Sin favorito claro: ningún equipo llega al 45 %', tono: 'neutral' },
  '2X': { corto: 'X2', texto: 'Visitante o empate (visitante favorito, entre 45 y 55 %)', tono: 'warning' },
  '2': { corto: '2', texto: 'Gana el visitante (favorito con 55 % o más)', tono: 'warning' },
};

function AnalysisCard({ p, pick, onClose }: { p: MatchProjection | null; pick: ModelPick | undefined; onClose: () => void }) {
  return (
    <Modal
      open={p !== null}
      onClose={onClose}
      title={
        p && (
          <span className="flex flex-wrap items-center gap-2">
            <TeamLabel teamId={p.homeTeamId} name={p.homeTeamName} size={20} />
            <span className="text-faint">–</span>
            <TeamLabel teamId={p.awayTeamId} name={p.awayTeamName} size={20} />
          </span>
        )
      }
      subtitle={
        p && (
          <span className="flex flex-wrap items-center gap-x-2">
            {p.leagueId} · <KickoffTime match={p} variant="linea" /> · <RoundLabel match={p} />
          </span>
        )
      }
      actions={
        p && (
          <ButtonLink to={`/proyecciones/${encodeURIComponent(p.fixtureId)}`} size="sm">
            Ficha completa y picks
          </ButtonLink>
        )
      }
    >
      {p && (
        // Si la pantalla es estrecha, cada tabla se desplaza dentro de su bloque y no fuera del diálogo.
        <div className="grid gap-4 p-4 lg:grid-cols-2 [&>div]:min-w-0 [&>div]:overflow-x-auto">
          {pick && (
            <div className="lg:col-span-2">
              <ModelPickCard result={pick} fixtureId={p.fixtureId} />
            </div>
          )}

          <div className="lg:col-span-2">
            <h3 className="t-label mb-2 text-muted">Por qué el modelo proyecta esto</h3>
            <AiInsight projection={p} />
          </div>

          <div>
            <h3 className="t-label mb-2 text-muted">Composición del modelo</h3>
            <ModelComposition p={p} />
          </div>

          <div>
            <h3 className="t-label mb-2 text-muted">Proyección</h3>
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">Métrica</th>
                  <th scope="col" className="num">Local</th>
                  <th scope="col" className="num">Visitante</th>
                  <th scope="col" className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Goles</td>
                  <td className="num">{fmt(p.expectedGoalsHome)}</td>
                  <td className="num">{fmt(p.expectedGoalsAway)}</td>
                  <td className="num font-semibold">{fmt(p.expectedGoalsTotal)}</td>
                </tr>
                <tr>
                  <td>Goles 1.ª parte</td>
                  <td className="num text-faint">—</td>
                  <td className="num text-faint">—</td>
                  <td className="num">{fmt(p.expectedGoalsFirstHalf)}</td>
                </tr>
                <tr>
                  <td>Goles 2.ª parte</td>
                  <td className="num text-faint">—</td>
                  <td className="num text-faint">—</td>
                  <td className="num">{fmt(p.expectedGoalsSecondHalf)}</td>
                </tr>
                <tr>
                  <td>Corners</td>
                  <td className="num">{fmt(p.expectedCornersHome, 1)}</td>
                  <td className="num">{fmt(p.expectedCornersAway, 1)}</td>
                  <td className="num">{fmt(p.expectedCornersTotal, 1)}</td>
                </tr>
                <tr>
                  <td>Tarjetas</td>
                  <td className="num">{fmt(p.expectedCardsHome, 1)}</td>
                  <td className="num">{fmt(p.expectedCardsAway, 1)}</td>
                  <td className="num">{fmt(p.expectedCardsTotal, 1)}</td>
                </tr>
                <tr>
                  <td>Tiros</td>
                  <td className="num">{fmt(p.expectedShotsHome, 1)}</td>
                  <td className="num">{fmt(p.expectedShotsAway, 1)}</td>
                  <td className="num">{fmt(p.expectedShotsTotal, 1)}</td>
                </tr>
                <tr>
                  <td>Tiros a puerta</td>
                  <td className="num">{fmt(p.expectedSotHome, 1)}</td>
                  <td className="num">{fmt(p.expectedSotAway, 1)}</td>
                  <td className="num">{fmt(p.expectedSotTotal, 1)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* A todo el ancho: etiquetas largas y tres badges por fila no caben en media columna. */}
          <div className="lg:col-span-2">
            <h3 className="t-label mb-2 text-muted">Probabilidades</h3>
            <table className="data">
              <tbody>
                <tr>
                  <td>Over 1.5 / 2.5 / 3.5</td>
                  <td className="num">
                    <ProbBadge value={p.probOver15} /> <ProbBadge value={p.probOver25} /> <ProbBadge value={p.probOver35} />
                  </td>
                </tr>
                <tr>
                  <td>1.ª parte: Over 0.5 / 1.5</td>
                  <td className="num">
                    <ProbBadge value={p.probOver05FirstHalf} /> <ProbBadge value={p.probOver15FirstHalf} />
                  </td>
                </tr>
                <tr>
                  <td>2.ª parte: Over 0.5 / 1.5</td>
                  <td className="num">
                    <ProbBadge value={p.probOver05SecondHalf} /> <ProbBadge value={p.probOver15SecondHalf} />
                  </td>
                </tr>
                <tr>
                  <td>Ambos marcan</td>
                  <td className="num">
                    <ProbBadge value={p.probBtts} />
                  </td>
                </tr>
                <tr>
                  <td>Portería a cero (L / V)</td>
                  <td className="num">
                    <ProbBadge value={p.probCleanSheetHome} /> <ProbBadge value={p.probCleanSheetAway} />
                  </td>
                </tr>
                <tr>
                  <td>1 / X / 2</td>
                  <td className="num">
                    <ProbBadge value={p.probs1x2.home} /> <ProbBadge value={p.probs1x2.draw} /> <ProbBadge value={p.probs1x2.away} />
                  </td>
                </tr>
                <tr>
                  <td>Resultado</td>
                  <td className="num font-semibold">
                    {RESULTADOS[p.resultPick].corto} · {RESULTADOS[p.resultPick].texto}
                  </td>
                </tr>
                <tr>
                  <td>Marcador más probable (dentro del resultado, si hay favorito)</td>
                  <td className="num font-semibold">{p.mostLikelyScoreline}</td>
                </tr>
                <tr>
                  <td>Suma 1X2</td>
                  <td className="num text-muted">{fmtPct(p.probs1x2.home + p.probs1x2.draw + p.probs1x2.away, 2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}

/**
 * Estado de los modelos, en un botón con su contador.
 *
 * Era una franja de aviso a todo lo ancho encima de la tabla. Ocupaba tres líneas para decir un número y
 * ofrecer un botón, y estaba permanentemente ahí aunque no hubiera nada que hacer: eso es un aviso que se
 * deja de leer. Ahora el dato vive en la insignia (`552/570`), la acción es el propio botón, y la
 * explicación completa —qué mezcla se usa, qué pasa con el resto de partidos y si la medición se ha
 * quedado vieja— está en su tooltip, que es donde se busca cuando hace falta.
 *
 * El botón se pone en primario solo cuando hay algo que hacer: nunca calculado, o calculado con menos
 * partidos de los que hay ahora.
 */
function EstadoDeLosModelos() {
  const fuente = useStore((s) => s.params.projectionSource);
  const predicciones = useStore((s) => s.modelPredictions);
  const calculadasCon = useStore((s) => s.modelPredictionsMatches);
  const partidos = useStore((s) => s.matches.length);
  const pendientes = useStore((s) => s.fixtures.length);
  const calculando = useStore((s) => s.predictingFixtures);
  const recalcular = useStore((s) => s.refreshModelPredictions);

  // Con el libro como fuente no hay nada que calcular: el botón no pinta nada aquí.
  if (fuente === 'libro') return null;

  const conPrediccion = Object.keys(predicciones).length;
  const vieja = calculadasCon !== partidos;
  const hayQueHacer = conPrediccion === 0 || vieja;

  const mezcla =
    fuente === 'mixto'
      ? `${Math.round(PESO_LIBRO * 100)} % del modelo del libro + ${Math.round((1 - PESO_LIBRO) * 100)} % de los siete modelos`
      : 'los siete modelos';

  const explicacion =
    conPrediccion === 0
      ? `Todavía no hay ninguna predicción de los modelos, así que las ${pendientes} proyecciones salen solo del modelo del libro. Pulsa para entrenarlos y calcularlas con ${mezcla}.`
      : `${conPrediccion} de ${pendientes} partidos pendientes se proyectan con ${mezcla}. Los otros ${pendientes - conPrediccion} salen solo del modelo del libro, porque sus equipos no tienen partidos suficientes.` +
        (vieja ? ` Se calcularon con ${calculadasCon} partidos y ahora hay ${partidos}: conviene recalcular.` : '');

  return (
    <Button
      size="sm"
      variant={hayQueHacer ? 'primary' : 'default'}
      onClick={() => void recalcular()}
      loading={calculando}
      disabled={calculando}
      title={explicacion}
    >
      {!calculando && <Sparkles size={13} aria-hidden />}
      {calculando ? 'Entrenando…' : conPrediccion === 0 ? 'Calcular con los modelos' : vieja ? 'Recalcular modelos' : 'Modelos'}
      {/* `bg-current/15` se adapta al botón: sobre el primario tiñe en claro y sobre el normal en oscuro. */}
      {!calculando && conPrediccion > 0 && (
        <span className="rounded-pill bg-current/15 px-1.5 text-[11px] tabular-nums">
          {conPrediccion}/{pendientes}
        </span>
      )}
    </Button>
  );
}

export function ProjectionsPage() {
  const projections = useStore((s) => s.derived.projections);
  const roundsByLeague = useStore((s) => s.derived.roundsByLeague);
  const filters = useStore((s) => s.filters);
  const teams = useStore((s) => s.derived.teams);
  const [selected, setSelected] = useState<MatchProjection | null>(null);
  const [onlyNextRound, setOnlyNextRound] = useState(false);
  /** La lista de partidos es lo primero; la tabla queda para comparar una cifra entre muchos. */
  const [vista, setVista] = useState<'tarjetas' | 'tabla'>('tarjetas');

  const rows = useMemo(() => {
    const teamName = filters.teamId ? teams.find((t) => t.id === filters.teamId)?.name : null;
    return (
      projections
        .filter((p) => !filters.leagueId || p.leagueId === filters.leagueId)
        .filter((p) => filters.round === null || p.round === filters.round)
        // "Próxima jornada" es por liga: cada una va por su cuenta.
        // La jornada solo es única dentro de su fase: el hexagonal vuelve a empezar por la 1.
        .filter((p) => {
          const r = roundsByLeague.get(p.leagueId);
          return !onlyNextRound || (p.round === r?.nextRound && (p.phase ?? null) === (r?.nextPhase ?? null));
        })
        .filter((p) => !filters.dateFrom || p.date >= filters.dateFrom)
        .filter((p) => !filters.dateTo || p.date <= filters.dateTo)
        .filter((p) => !teamName || p.homeTeamName === teamName || p.awayTeamName === teamName)
        .sort((a, b) => a.date.localeCompare(b.date))
    );
  }, [projections, filters, teams, onlyNextRound, roundsByLeague]);

  const ids = useMemo(() => rows.map((p) => p.fixtureId), [rows]);
  const picks = useModelPicks(ids);

  const focusLeague = filters.leagueId ? roundsByLeague.get(filters.leagueId) : null;

  /**
   * El resumen de la banda: recuentos sobre las filas que ya están en la tabla.
   *
   * Una pasada más por `rows` no se nota al lado de las 2.479 proyecciones y los picks que ya hay montados,
   * y evita que haya que paginar 248 páginas para saber cuántos partidos tienen pick.
   */
  const resumen = useMemo(() => {
    const ligas = new Set(rows.map((r) => r.leagueId));
    const conPick = rows.reduce((n, r) => n + (picks.get(r.fixtureId)?.best ? 1 : 0), 0);
    const totales = rows.map((r) => r.expectedGoalsTotal).filter((v) => Number.isFinite(v));
    const desde = rows[0]?.date ?? null;
    const hasta = rows.at(-1)?.date ?? null;
    return {
      ligas: ligas.size,
      conPick,
      golesMedios: totales.length === 0 ? null : totales.reduce((a, b) => a + b, 0) / totales.length,
      // `rows` sale ordenado por fecha, así que el periodo son sus extremos.
      desde,
      /*
       * El pie del periodo. Con el calendario entero cargado el rango cruza de año y «hasta vie 9 ene»
       * engaña, así que entonces se dice el año; con el año del primero basta si no cambia. Sin segundo
       * extremo no hay pie: una sola fecha no es un periodo.
       */
      periodoHasta:
        desde === null || hasta === null || hasta === desde
          ? undefined
          : `hasta ${shortDate(hasta)}${hasta.slice(0, 4) === desde.slice(0, 4) ? '' : ` de ${hasta.slice(0, 4)}`}`,
    };
  }, [rows, picks]);

  const columns: Column<MatchProjection>[] = [
    { id: 'fecha', header: 'Fecha', title: 'Fecha y hora de Colombia', cell: (p) => <KickoffTime match={p} />, sortValue: (p) => p.kickoffUtc ?? p.date },
    {
      id: 'liga', group: 'Contexto',
      header: 'Competición',
      hideOnMobile: true,
      cell: (p) => <LeagueLabel leagueId={p.leagueId} size="sm" />,
      sortValue: (p) => p.leagueId,
    },
    {
      id: 'j', group: 'Contexto',
      header: 'J',
      title: 'Jornada',
      numeric: true,
      width: '3.5rem',
      hideOnMobile: true,
      cell: (p) => <RoundLabel match={p} />,
      sortValue: (p) => p.round,
    },
    {
      id: 'partido',
      header: 'Partido',
      align: 'center',
      cell: (p) => (
        <MatchTeams homeTeamId={p.homeTeamId} homeTeamName={p.homeTeamName} awayTeamId={p.awayTeamId} awayTeamName={p.awayTeamName} middle={<span className="text-faint">vs</span>} />
      ),
      sortValue: (p) => p.homeTeamName,
    },
    {
      id: 'golesEsperados', group: 'Goles',
      header: 'Goles esp.',
      title: 'Goles esperados del local – del visitante (λ del modelo)',
      numeric: true,
      hideOnMobile: true,
      cell: (p) => (
        <span className="tabular-nums">
          {p.expectedGoalsHome.toFixed(2)} <span className="text-faint">–</span> {p.expectedGoalsAway.toFixed(2)}
        </span>
      ),
      sortValue: (p) => p.expectedGoalsTotal,
    },
    {
      id: 'tot', group: 'Goles',
      header: 'Total',
      title: 'Goles esperados en el partido',
      numeric: true,
      cell: (p) => <span className="font-semibold">{p.expectedGoalsTotal.toFixed(2)}</span>,
      sortValue: (p) => p.expectedGoalsTotal,
    },
    { id: 'o15', group: 'Goles', header: 'O1.5', title: 'Probabilidad de 2 o más goles', numeric: true, hideOnMobile: true, cell: (p) => <ProbBadge value={p.probOver15} />, sortValue: (p) => p.probOver15 },
    { id: 'o25', group: 'Goles', header: 'O2.5', title: 'Probabilidad de 3 o más goles', numeric: true, cell: (p) => <ProbBadge value={p.probOver25} />, sortValue: (p) => p.probOver25 },
    { id: 'o35', group: 'Goles', header: 'O3.5', title: 'Probabilidad de 4 o más goles', numeric: true, hideOnMobile: true, cell: (p) => <ProbBadge value={p.probOver35} />, sortValue: (p) => p.probOver35 },
    { id: 'o05p1', group: 'Goles por parte', header: '1T O0.5', title: 'Probabilidad de al menos un gol en la 1.ª parte', numeric: true, hideOnMobile: true, cell: (p) => <ProbBadge value={p.probOver05FirstHalf} />, sortValue: (p) => p.probOver05FirstHalf },
    { id: 'o05p2', group: 'Goles por parte', header: '2T O0.5', title: 'Probabilidad de al menos un gol en la 2.ª parte', numeric: true, hideOnMobile: true, cell: (p) => <ProbBadge value={p.probOver05SecondHalf} />, sortValue: (p) => p.probOver05SecondHalf },
    { id: 'btts', group: 'Porterías', header: 'BTTS', title: 'Probabilidad de que marquen los dos', numeric: true, cell: (p) => <ProbBadge value={p.probBtts} />, sortValue: (p) => p.probBtts },
    { id: 'csl', group: 'Porterías', header: 'CS L', title: 'Portería a cero del local', numeric: true, hideOnMobile: true, cell: (p) => <ProbBadge value={p.probCleanSheetHome} />, sortValue: (p) => p.probCleanSheetHome },
    { id: 'csv', group: 'Porterías', header: 'CS V', title: 'Portería a cero del visitante', numeric: true, hideOnMobile: true, cell: (p) => <ProbBadge value={p.probCleanSheetAway} />, sortValue: (p) => p.probCleanSheetAway },
    { id: '1', group: 'Resultado', header: '1', title: 'Gana el local', numeric: true, cell: (p) => <ProbBadge value={p.probs1x2.home} />, sortValue: (p) => p.probs1x2.home },
    { id: 'x', group: 'Resultado', header: 'X', title: 'Empate', numeric: true, cell: (p) => <ProbBadge value={p.probs1x2.draw} />, sortValue: (p) => p.probs1x2.draw },
    { id: '2', group: 'Resultado', header: '2', title: 'Gana el visitante', numeric: true, cell: (p) => <ProbBadge value={p.probs1x2.away} />, sortValue: (p) => p.probs1x2.away },
    {
      id: 'resultado', group: 'Resultado',
      header: 'Resultado',
      title: 'Favorito con 55 % o más: gana (1 o 2). Entre 45 y 55 %: él o el empate (1X o X2). Por debajo: sin favorito claro (—)',
      align: 'center',
      hideOnMobile: true,
      cell: (p) => (
        <Badge tone={RESULTADOS[p.resultPick].tono} title={RESULTADOS[p.resultPick].texto}>
          {RESULTADOS[p.resultPick].corto}
        </Badge>
      ),
      sortValue: (p) => p.resultPick,
    },
    {
      id: 'marcador', group: 'Resultado',
      header: 'Marcador',
      title: 'Marcador más probable dentro del resultado proyectado',
      numeric: true,
      hideOnMobile: true,
      cell: (p) => <span className="font-semibold">{p.mostLikelyScoreline}</span>,
    },
    {
      id: 'pick',
      header: 'Pick del modelo',
      title: 'Mercado favorito que más se sale de lo habitual en su liga, ajustado por confianza. Sin cuotas: es una estimación, no un pronóstico seguro',
      cell: (p) => <ModelPickCell result={picks.get(p.fixtureId)} />,
      sortValue: (p) => picks.get(p.fixtureId)?.best?.score ?? null,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Proyecciones"
        description="Una fila por partido pendiente con las probabilidades del modelo y su pick. Son estimaciones, no pronósticos seguros: pulsa una fila para ver de dónde salen."
        actions={
          <>
            <EstadoDeLosModelos />
            <SegmentedControl
              size="sm"
              label="Vista"
              value={vista}
              onChange={setVista}
              options={[
                { value: 'tarjetas' as const, label: <LayoutGrid size={14} />, title: 'Ver como lista de partidos' },
                { value: 'tabla' as const, label: <Table2 size={14} />, title: 'Ver como tabla, para comparar cifras entre partidos' },
              ]}
            />
            <SegmentedControl
              size="sm"
              label="Alcance"
              value={onlyNextRound ? 'next' : 'all'}
              onChange={(v) => setOnlyNextRound(v === 'next')}
              options={[
                { value: 'all', label: 'Todas' },
                { value: 'next', label: 'Próxima jornada' },
              ]}
            />
          </>
        }
      />
      {/* Misma banda de resumen que el resto de pantallas: una cifra manda y las demás la sitúan. */}
      <div className="mb-3">
        <StatRow>
          <Stat
            label="Partidos pendientes"
            value={fmtInt(rows.length)}
            hint={onlyNextRound ? 'de la próxima jornada de cada competición' : 'con proyección del modelo'}
            icon={<CalendarClock />}
            hero
          />
          <Stat
            label="Con pick"
            value={fmtInt(resumen.conPick)}
            hint={rows.length > 0 ? fmtPct(resumen.conPick / rows.length, 0) : undefined}
            tip="Partidos en los que algún mercado pasa los seis criterios. Están en Oportunidades."
          />
          <Stat label="Competiciones" value={fmtInt(resumen.ligas)} />
          <Stat
            label="Goles esperados"
            value={fmt(resumen.golesMedios)}
            hint="media por partido"
            tip="Media de los goles esperados totales (λ local + λ visitante) de los partidos de la tabla."
          />
          <Stat
            label="Periodo"
            value={resumen.desde === null ? NA : <span className="whitespace-nowrap">{shortDate(resumen.desde)}</span>}
            hint={resumen.periodoHasta}
            tip="Fechas del primer y del último partido de la tabla."
          />
        </StatRow>
      </div>
      <FilterBar show={['country', 'league', 'team', 'round', 'dates']} />
      <Card>
        {focusLeague && (
          <p className="border-b border-border bg-surface-2 px-4 py-2 text-[12px] text-muted">
            <strong>{focusLeague.leagueId}</strong>: {describeLeagueRounds(focusLeague)} · {focusLeague.pendingFixtures}{' '}
            {focusLeague.pendingFixtures === 1 ? 'pendiente' : 'pendientes'} en total
          </p>
        )}
        <DataTable
          rows={rows}
          columns={columns}
          getRowId={(p) => p.fixtureId}
          onRowClick={setSelected}
          rowLabel={(p) => `Ver análisis de ${p.homeTeamName} – ${p.awayTeamName}`}
          searchable={(p) => `${p.homeTeamName} ${p.awayTeamName} ${p.leagueId}`}
          searchPlaceholder="Buscar partido…"
          pageSize={10}
          initialSort={{ id: 'fecha', dir: 'asc' }}
          // En un teléfono la tabla no cabe: las 20 columnas se cambian por la misma tarjeta del dashboard.
          card={(p) => <MatchCard p={p} pick={picks.get(p.fixtureId)} />}
          vista={vista}
          // Las 20 columnas ocupan 2395 px: ni a 1920 caben. El selector de bloques deja elegir; por
          // defecto se siguen viendo todas, porque esconder datos sin que nadie lo pida no es ayudar.
          tableId="proyecciones"
          // Sin el ojo: hacía exactamente lo mismo que pulsar la fila, y en un móvil de 375 px la columna de
          // acciones se llevaba 120 px de los 349 disponibles mientras los nombres de equipo se cortaban.
          actions={(p) => (
            <>
              <IconButton icon={<BarChart3 size={16} />} label="Abrir ficha con todos los mercados" to={`/proyecciones/${encodeURIComponent(p.fixtureId)}`} />
              <IconButton icon={<Calculator size={16} />} label="Evaluar un pick" tone="accent" to={`/picks?f=${encodeURIComponent(p.fixtureId)}`} />
            </>
          )}
          empty={
            <>
              No hay partidos pendientes con proyección. Añádelos en{' '}
              <Link className="text-accent-text hover:underline" to="/partidos">
                Partidos → Pendientes
              </Link>{' '}
              o pulsa «Actualizar partidos».
            </>
          }
        />
      </Card>

      <AnalysisCard p={selected} pick={selected ? picks.get(selected.fixtureId) : undefined} onClose={() => setSelected(null)} />
    </div>
  );
}
