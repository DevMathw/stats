import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BarChart3, Calculator, Database, ExternalLink, Eye, RefreshCw, Table2, Trash2, Upload } from 'lucide-react';
import { FilterBar } from '../components/Filters/FilterBar';
import { FixtureForm } from '../components/Match/FixtureForm';
import { MatchDataAction } from '../components/Match/MatchDataForm';
import { MatchMomentum } from '../components/Match/MatchMomentum';
import { FixtureCard, PlayedMatchCard } from '../components/Match/MatchListCards';
import { Tooltip } from '../components/Tooltip';
import { MATCH_DATA, isMissing, manualDataNames, ZERO_PLAUSIBLE, type MatchDatum } from '../domain/models/matchDataRules';
import { Badge, Button, Card, Empty, IconButton, PageHeader, Stat, StatRow, Tabs } from '../components/ui';
import { DataTable, type Column } from '../components/DataTable';
import { LeagueLabel } from '../components/LeagueLabel';
import { toast } from '../components/Toast';
import { fmt, fmtInt, fmtPair, fmtPct, NA } from '../utils/format';
import {
  awayPossession,
  cornersTotal,
  firstHalfTotal,
  hasEmptyStat,
  hasResult,
  isBtts,
  resultFT,
  resultHT,
  scoreline,
  secondHalfTotal,
  shotsOnTargetTotal,
  shotsTotal,
  totalGoals,
  yellowCardsTotal,
} from '../domain/calculations/matchDerived';
import { applyFilters } from '../domain/statistics/dashboard';
import type { EmptyStat, Filters, Fixture, League, Match } from '../types';
import { useStore } from '../store/useStore';
import { MatchTeams, TeamLabel } from '../components/TeamLabel';
import { seasonKey } from '../domain/models/season';
import { paraNombreDeArchivo } from '../utils/download';
import { teamDisplay } from '../domain/models/teamDisplay';
import { KickoffTime } from '../components/Kickoff';
import { monthYear } from '../utils/matchTime';
import { RoundLabel } from '../components/RoundLabel';

export function MatchesPage() {
  const [tab, setTab] = useState<'played' | 'pending'>('played');
  const matches = useStore((s) => s.matches);
  const fixtures = useStore((s) => s.fixtures);
  const filters = useStore((s) => s.filters);
  const setFilters = useStore((s) => s.setFilters);
  const leagues = useStore((s) => s.leagues);
  const projections = useStore((s) => s.derived.projectionsByFixtureId);
  const removeFixture = useStore((s) => s.removeFixture);
  const refreshMatchStats = useStore((s) => s.refreshMatchStats);
  const statsBusyId = useStore((s) => s.statsBusyId);
  const status = useStore((s) => s.status);
  const fillMissingWithZero = useStore((s) => s.fillMissingWithZero);

  /** El dato concreto que se está filtrando, si lo hay: es el que se puede cargar desde un .txt. */
  const datoFiltrado = useMemo(() => MATCH_DATA.find((d) => d.id === filters.emptyStat), [filters.emptyStat]);

  // Sin el filtro de dato que falta: sobre estos se cuenta qué falta en la liga (o selección) actual.
  const sinFiltroDeDato = useMemo(() => applyFilters(matches, filters), [matches, filters]);
  const filtered = useMemo(
    () =>
      sinFiltroDeDato
        .filter((m) => !filters.emptyStat || hasEmptyStat(m, filters.emptyStat))
        // La temporada se aplica aquí y no en `applyFilters`, igual que el dato que falta: es un filtro de
        // esta pantalla, y en las de análisis (que son de la temporada en curso) no filtraría nada.
        .filter((m) => !filters.season || seasonKey(m.season) === filters.season)
        .sort((a, b) => b.date.localeCompare(a.date) || b.round - a.round),
    [sinFiltroDeDato, filters.emptyStat, filters.season],
  );

  const filteredFixtures = useMemo(
    () =>
      fixtures
      .filter((f) => {
        if (filters.country && f.country !== filters.country) return false;
        if (filters.leagueId && f.leagueId !== filters.leagueId) return false;
        if (filters.round !== null && f.round !== filters.round) return false;
        if (filters.dateFrom && f.date < filters.dateFrom) return false;
        if (filters.dateTo && f.date > filters.dateTo) return false;
        if (filters.teamId && f.homeTeamId !== filters.teamId && f.awayTeamId !== filters.teamId) return false;
        if (filters.season && seasonKey(f.season) !== filters.season) return false;
        return true;
      })
        .sort((a, b) => a.date.localeCompare(b.date)),
    [fixtures, filters],
  );

  /**
   * El resumen de la banda: recuentos sobre los partidos que ya están filtrados.
   *
   * Una pasada por `filtered` (26.937 en el caso peor, sin filtros) cuesta milisegundos y es la única forma
   * de saber qué hay seleccionado sin recorrer 2.694 páginas de diez en diez.
   *
   * La media de goles sale solo de los partidos CON marcador, y es `null` si no hay ninguno: un partido sin
   * resultado no es un 0-0.
   */
  const resumen = useMemo(() => {
    const ligas = new Set<string>();
    let conMarcador = 0;
    let goles = 0;
    for (const m of filtered) {
      ligas.add(m.leagueId);
      if (m.homeGoals !== null && m.awayGoals !== null) {
        conMarcador += 1;
        goles += m.homeGoals + m.awayGoals;
      }
    }
    return {
      ligas: ligas.size,
      conMarcador,
      golesMedios: conMarcador === 0 ? null : goles / conMarcador,
      // `filtered` va de más reciente a más antiguo.
      desde: filtered.at(-1)?.date ?? null,
      hasta: filtered[0]?.date ?? null,
    };
  }, [filtered]);

  const playedCols: Column<Match>[] = [
    {
      id: 'fecha',
      header: 'Fecha',
      cell: (m) => <KickoffTime match={m} />,
      sortValue: (m) => m.date,
    },
    {
      id: 'jornada',
      header: 'J',
      title: 'Jornada',
      numeric: true,
      width: '3.5rem',
      hideOnMobile: true,
      cell: (m) => <RoundLabel match={m} />,
      sortValue: (m) => m.round,
    },
    {
      id: 'temporada',
      header: 'Temp.',
      title: 'Temporada a la que pertenece el partido',
      hideOnMobile: true,
      width: '5rem',
      // Con históricos cargados, sin esta columna no había forma de saber de qué temporada era una fila.
      cell: (m) => <span className="tabular-nums text-muted">{seasonKey(m.season) ?? m.season}</span>,
      sortValue: (m) => seasonKey(m.season) ?? m.season,
    },
    {
      id: 'liga',
      header: 'Competición',
      hideOnMobile: true,
      cell: (m) => <LeagueLabel leagueId={m.leagueId} size="sm" />,
      sortValue: (m) => m.leagueId,
    },
    {
      id: 'partido',
      header: 'Partido',
      align: 'center',
      cell: (m) => (
        <Link to={`/partidos/${encodeURIComponent(m.id)}`} className="flex min-w-0 rounded hover:text-accent-text">
          <MatchTeams
            homeTeamId={m.homeTeamId}
            homeTeamName={m.homeTeamName}
            awayTeamId={m.awayTeamId}
            awayTeamName={m.awayTeamName}
            middle={
              <>
                <span className="rounded-control bg-surface-2 px-2 py-0.5 font-semibold tabular-nums">{scoreline(m) ?? '—'}</span>
                {m.awarded && (
                  <Badge tone="warning" title="Resultado adjudicado por decisión: no cuenta en el análisis">
                    Adjudicado
                  </Badge>
                )}
              </>
            }
          />
        </Link>
      ),
      sortValue: (m) => m.homeTeamName,
    },
    {
      id: 'posesion',
      header: 'Posesión',
      numeric: true,
      hideOnMobile: true,
      cell: (m) =>
        m.possessionHome === null ? (
          NA
        ) : (
          <span className="whitespace-nowrap">
            {fmtPct(m.possessionHome, 0)} <span className="text-faint">–</span> {fmtPct(awayPossession(m), 0)}
          </span>
        ),
      sortValue: (m) => m.possessionHome,
    },
    {
      id: 'corners',
      header: 'Corners',
      numeric: true,
      hideOnMobile: true,
      cell: (m) => fmtPair(m.cornersHome, m.cornersAway),
      // Se ordena por el total: es el criterio con el que se compara un partido con otro.
      sortValue: (m) => cornersTotal(m),
    },
    {
      id: 'tarjetas',
      header: 'Amarillas',
      numeric: true,
      hideOnMobile: true,
      cell: (m) => fmtPair(m.yellowCardsHome, m.yellowCardsAway),
      sortValue: (m) => yellowCardsTotal(m),
    },
  ];

  const fixtureCols: Column<Fixture>[] = [
    {
      id: 'fecha',
      header: 'Fecha',
      cell: (f) => <KickoffTime match={f} />,
      sortValue: (f) => f.date,
    },
    {
      id: 'jornada',
      header: 'J',
      title: 'Jornada',
      numeric: true,
      width: '3.5rem',
      hideOnMobile: true,
      cell: (f) => <RoundLabel match={f} />,
      sortValue: (f) => f.round,
    },
    {
      id: 'liga',
      header: 'Competición',
      hideOnMobile: true,
      cell: (f) => <LeagueLabel leagueId={f.leagueId} size="sm" />,
      sortValue: (f) => f.leagueId,
    },
    {
      id: 'partido',
      header: 'Partido',
      align: 'center',
      cell: (f) => (
        <MatchTeams homeTeamId={f.homeTeamId} homeTeamName={f.homeTeamName} awayTeamId={f.awayTeamId} awayTeamName={f.awayTeamName} middle={<span className="text-faint">vs</span>} />
      ),
    },
    {
      id: 'estado',
      header: 'Estado',
      cell: (f) => <Badge tone={f.status === 'Programado' ? 'neutral' : 'warning'}>{f.status}</Badge>,
      sortValue: (f) => f.status,
    },
    {
      id: 'fuente',
      header: 'Fuente',
      hideOnMobile: true,
      cell: (f) => <span className="text-muted">{f.source ?? '—'}</span>,
    },
  ];

  return (
    <div>
      <PageHeader title="Partidos" description="Resultados y estadísticas de lo ya jugado, y el calendario pendiente con su proyección. N/D: la fuente no publicó el dato." />
      {/* Misma banda de resumen que el resto de pantallas. */}
      <div className="mb-3">
        <StatRow>
          <Stat
            label="Partidos disputados"
            value={fmtInt(filtered.length)}
            hint={filtered.length === matches.length ? 'todos los de la base' : `de ${fmtInt(matches.length)} en la base`}
            icon={<Database />}
            hero
          />
          <Stat label="Pendientes" value={fmtInt(filteredFixtures.length)} tip="Partidos del calendario que aún no se han jugado, con los mismos filtros." />
          <Stat label="Competiciones" value={fmtInt(resumen.ligas)} />
          <Stat
            label="Goles / partido"
            value={fmt(resumen.golesMedios)}
            hint={`${fmtInt(resumen.conMarcador)} con marcador`}
            tip="Media de goles de los partidos seleccionados que tienen marcador. Los que no lo tienen no cuentan."
          />
          <Stat
            label="Periodo"
            value={resumen.desde === null ? NA : <span className="whitespace-nowrap">{monthYear(resumen.desde)}</span>}
            hint={resumen.hasta === null || resumen.hasta === resumen.desde ? undefined : `hasta ${monthYear(resumen.hasta)}`}
            tip="Fechas del partido más antiguo y del más reciente de la selección."
          />
        </StatRow>
      </div>
      <FilterBar show={['country', 'league', 'team', 'season', 'round', 'dates', 'empty']} />
      <Card>
        <Tabs
          tabs={[
            { id: 'played' as const, label: 'Disputados', count: filtered.length },
            { id: 'pending' as const, label: 'Pendientes', count: filteredFixtures.length },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === 'played' ? (
          <>
            <MissingDataBar
              matches={sinFiltroDeDato}
              filtrados={filtered}
              active={filters.emptyStat}
              onPick={(id) => setFilters({ emptyStat: filters.emptyStat === id ? null : id })}
              onCero={fillMissingWithZero}
            />
            <DataTable
              rows={filtered}
              columns={playedCols}
              toolbar={datoFiltrado && <CargarDatoTxt datum={datoFiltrado} matches={filtered} />}
              getRowId={(m) => m.id}
              searchable={(m) => `${m.homeTeamName} ${m.awayTeamName} ${m.leagueId} ${m.date}`}
              searchPlaceholder="Buscar equipo, competición o fecha…"
              pageSize={10}
              loading={status === 'importing'}
              initialSort={{ id: 'fecha', dir: 'desc' }}
              exportTxt={{
                fileName: nombreExportacion(filters, leagues),
                /*
                 * `-Llaneros F.C. 1-3 Deportes Tolima 2025-05-19`.
                 *
                 * Los nombres salen de `teamDisplay`, que es el mismo que pinta la tabla: el guardado puede
                 * ser el abreviado de la fuente («Llaneros», «Once Caldas») mientras en pantalla se lee el
                 * oficial («Llaneros F.C.», «Once Caldas DAF»), y el archivo debe decir lo que se ve.
                 *
                 * Un partido sin marcador no tiene línea: se devuelve `null` y se salta, en vez de escribir
                 * un `0-0` que no ha ocurrido.
                 */
                line: (m) =>
                  m.homeGoals === null || m.awayGoals === null
                    ? null
                    : `-${teamDisplay(m.homeTeamRef, m.homeTeamName, m.homeTeamId).name} ${m.homeGoals}-${m.awayGoals} ` +
                      `${teamDisplay(m.awayTeamRef, m.awayTeamName, m.awayTeamId).name} ${m.date}`,
              }}
              // Las 8 columnas no caben en un teléfono: por debajo de `md`, cada partido es una tarjeta.
              card={(m) => <PlayedMatchCard m={m} />}
              empty="Ningún partido con estos filtros."
              actions={(m) => (
                <>
                  <IconButton icon={<Eye size={16} />} label="Ver ficha del partido" to={`/partidos/${encodeURIComponent(m.id)}`} />
                  <StatsAction match={m} busyId={statsBusyId} onClick={refreshMatchStats} />
                  <MatchDataAction match={m} />
                </>
              )}
            />
          </>
        ) : (
          <>
            <FixtureForm />
            <DataTable
              rows={filteredFixtures}
              columns={fixtureCols}
              getRowId={(f) => f.id}
              searchable={(f) => `${f.homeTeamName} ${f.awayTeamName} ${f.leagueId}`}
              searchPlaceholder="Buscar partido pendiente…"
              pageSize={10}
              initialSort={{ id: 'fecha', dir: 'asc' }}
              card={(f) => <FixtureCard f={f} conProyeccion={projections.has(f.id)} />}
              empty="No hay partidos pendientes. Añádelos arriba, cárgalos con el Excel de su competición o pulsa «Actualizar partidos». Cada uno genera su proyección."
              actions={(f) => {
                const conProyeccion = projections.has(f.id);
                const sinProyeccion = 'Sin proyección: faltan partidos jugados de alguno de los dos equipos';
                return (
                  <>
                    <IconButton
                      icon={<BarChart3 size={16} />}
                      label="Ver probabilidades del partido"
                      to={`/proyecciones/${encodeURIComponent(f.id)}`}
                      disabled={!conProyeccion}
                      disabledReason={sinProyeccion}
                    />
                    <IconButton
                      icon={<Calculator size={16} />}
                      label="Evaluar un pick de este partido"
                      to={`/picks?f=${encodeURIComponent(f.id)}`}
                      disabled={!conProyeccion}
                      disabledReason={sinProyeccion}
                    />
                    <IconButton
                      icon={<Trash2 size={16} />}
                      label="Eliminar partido pendiente"
                      tone="danger"
                      confirm="Pulsa otra vez para eliminarlo"
                      onClick={() => {
                        removeFixture(f.id);
                        toast(`${f.homeTeamName} – ${f.awayTeamName} eliminado de pendientes.`);
                      }}
                    />
                  </>
                );
              }}
            />
          </>
        )}
      </Card>
    </div>
  );
}

/**
 * Nombre del .txt, con lo que hay filtrado: `partidos-primera-a-liga-betplay-dimayor-2025.txt`.
 * Así dos exportaciones distintas no se pisan en la carpeta de descargas.
 */
function nombreExportacion(filters: Filters, leagues: League[]): string {
  const liga = filters.leagueId ? (leagues.find((l) => l.id === filters.leagueId)?.name ?? filters.leagueId) : null;
  const partes = ['partidos', liga, filters.season, filters.round !== null ? `j${filters.round}` : null].filter(Boolean);
  return `${paraNombreDeArchivo(partes.join(' '))}.txt`;
}

/** «córners» → «Córners»; «xG» se queda como está. */
const enMayuscula = (s: string) => (/^[a-z][A-Z]/.test(s) ? s : s[0].toUpperCase() + s.slice(1));

/**
 * Cuántos disputados de la selección actual (liga, equipo, fechas…) no tienen cada uno de los datos.
 * Pulsar uno filtra la tabla por él; pulsarlo otra vez lo quita.
 *
 * Se cuenta sobre TODAS las filas, no solo las que tienen marcador. Filtrarlas por `hasResult` dejaba el
 * contador de «marcador» en 0 por construcción: los partidos a los que les falta son justo los que se
 * estaban descartando, y el único camino para encontrarlos era escribir el filtro en la dirección.
 */
/**
 * Carga de un dato que falta desde un .txt, al lado de Exportar.
 *
 * Solo sale con un dato concreto filtrado, por la misma razón que el botón de asignar 0: con «alguno de
 * los 11» no se sabría qué columna rellenar. El archivo es el que exporta esta pantalla con el dato
 * añadido al final, y lo que no cuadre se cuenta en el aviso en vez de entrar a medias.
 */
function CargarDatoTxt({ datum, matches }: { datum: MatchDatum; matches: Match[] }) {
  const loadStatsTxt = useStore((st) => st.loadStatsTxt);
  const input = useRef<HTMLInputElement>(null);
  const [leyendo, setLeyendo] = useState(false);

  const elegir = async (f: File) => {
    setLeyendo(true);
    try {
      loadStatsTxt(matches.map((m) => m.id), datum.id, await f.text());
    } finally {
      setLeyendo(false);
      // Sin esto, volver a elegir el MISMO archivo no dispara `change` y parece que el botón no hace nada.
      if (input.current) input.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={input}
        type="file"
        accept=".txt,text/plain"
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void elegir(f);
        }}
      />
      <Button
        size="sm"
        loading={leyendo}
        disabled={matches.length === 0}
        onClick={() => input.current?.click()}
        title={`Carga ${datum.name} desde un .txt con una linea por partido: «Fecha: AAAA-MM-DD | Local n-n Visitante | ${datum.name}: a - b». Solo escribe en los ${matches.length} partidos que se estan viendo, comprueba el marcador de cada linea y no pisa lo que ya tenga dato.`}
      >
        <Upload size={14} aria-hidden /> Cargar {datum.name}
        <span className="rounded-pill bg-current/15 px-1.5 text-[11px] tabular-nums">{matches.length}</span>
      </Button>
    </>
  );
}

function MissingDataBar({
  matches,
  filtrados,
  active,
  onPick,
  onCero,
}: {
  matches: Match[];
  /** Las filas que se están viendo: son a las que se les asigna el 0. */
  filtrados: Match[];
  active: EmptyStat | null;
  onPick: (id: EmptyStat) => void;
  onCero: (matchIds: readonly string[], datumId: MatchDatum['id']) => void;
}) {
  const opciones = useMemo(
    () => [
      { id: 'any' as EmptyStat, nombre: `Alguno de los ${MATCH_DATA.length}`, n: matches.filter((m) => hasEmptyStat(m, 'any')).length },
      ...MATCH_DATA.map((d) => ({ id: d.id as EmptyStat, nombre: enMayuscula(d.name), n: matches.filter((m) => isMissing(m, d)).length })),
    ],
    [matches],
  );
  /*
   * El dato activo, si admite un 0 a bulto. Solo sale con un dato concreto elegido: con «alguno de los 11»
   * no se sabe qué rellenar, y el marcador, el descanso, la posesión y el xG no entran nunca
   * (`ZERO_PLAUSIBLE` explica por qué).
   */
  const paraCero = MATCH_DATA.find((d) => d.id === active && ZERO_PLAUSIBLE.has(d.id));
  const cuantos = paraCero ? filtrados.filter((m) => isMissing(m, paraCero)).length : 0;

  if (!matches.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-3 py-2 text-[12px]">
      <span className="mr-1 text-muted">Faltan datos · {matches.length} disputados:</span>
      {opciones.map((o) => {
        const activo = active === o.id;
        const boton = (
          <button
            type="button"
            aria-pressed={activo}
            disabled={o.n === 0 && !activo}
            onClick={() => onPick(o.id)}
            className={`inline-flex min-h-11 items-center gap-1 rounded-pill border px-2.5 py-1 transition-colors disabled:opacity-60 sm:min-h-7 ${
              activo ? 'border-accent bg-accent-soft text-accent-text' : 'border-border-strong bg-surface text-muted hover:text-text'
            }`}
          >
            {o.nombre}
            <span className={`tabular-nums ${o.n ? 'font-semibold text-text' : 'text-positive-text'}`}>{o.n || '✓'}</span>
          </button>
        );
        return o.n === 0 && !activo ? (
          <span key={o.id}>{boton}</span>
        ) : (
          <Tooltip key={o.id} content={activo ? 'Quitar este filtro' : `Ver los ${o.n} partidos a los que les falta: ${o.nombre.toLowerCase()}`}>
            {boton}
          </Tooltip>
        );
      })}

      {paraCero && cuantos > 0 && (
        <Button
          size="sm"
          variant="ghost"
          confirm={`Escribir 0 en ${cuantos}`}
          title={`Escribe 0 en ${paraCero.name} de los ${cuantos} partidos que se están viendo, solo en el lado que falta. Queda como dato Manual, así que una actualización posterior de la fuente no lo pisa.`}
          onClick={() => onCero(filtrados.map((m) => m.id), paraCero.id)}
        >
          Asignar 0 a {paraCero.name} ({cuantos})
        </Button>
      )}
    </div>
  );
}

/**
 * Estadísticas de ESTE partido desde la fuente de su liga: la oficial y, si no las publica, las
 * secundarias autorizadas. De uno en uno: mientras hay una consulta en marcha, el resto espera.
 */
function StatsAction({ match, busyId, onClick }: { match: Match; busyId: string | null; onClick: (id: string) => Promise<void> }) {
  const label = 'Actualizar estadísticas del partido';
  // Sin marcador no hay forma de comprobar que la página leída es este partido.
  if (!hasResult(match)) {
    return <IconButton icon={<RefreshCw size={16} />} label={label} disabled disabledReason="Sin marcador: no se puede comprobar que las cifras leídas sean de este partido" />;
  }
  const busy = busyId === match.id;
  return (
    <IconButton
      icon={<RefreshCw size={16} />}
      label={label}
      tone="accent"
      tooltip={
        busy
          ? 'Consultando la fuente…'
          : match.statsUpdatedAt
            ? `Actualizar corners, tarjetas, tiros y posesión · última consulta ${match.statsUpdatedAt.slice(0, 16).replace('T', ' ')}`
            : 'Actualizar corners, tarjetas, tiros y posesión desde la fuente oficial de la liga'
      }
      loading={busy}
      disabled={busyId !== null && !busy}
      disabledReason="Espera: hay otra consulta en marcha"
      onClick={() => void onClick(match.id)}
    />
  );
}

/** Una estadística del partido, local frente a visitante, con la barra del reparto. */
function StatCompare({ label, home, away, format = (v) => String(v) }: { label: string; home: number | null; away: number | null; format?: (v: number) => ReactNode }) {
  const hay = home !== null && away !== null;
  const total = hay ? home + away : 0;
  const cuotaLocal = hay && total > 0 ? (home / total) * 100 : 50;
  const lider = (a: number | null, b: number | null) => (a !== null && b !== null && a > b ? 'font-semibold text-text' : 'text-muted');
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-[13px] tabular-nums">
        <span className={`w-14 ${lider(home, away)}`}>{home === null ? NA : format(home)}</span>
        <span className="text-center text-[12px] text-muted">{label}</span>
        <span className={`w-14 text-right ${lider(away, home)}`}>{away === null ? NA : format(away)}</span>
      </div>
      <div className="flex h-1.5 gap-1" aria-hidden>
        <div className="flex flex-1 justify-end overflow-hidden rounded-pill bg-surface-3">
          {hay && <div className="h-full rounded-pill bg-accent" style={{ width: `${cuotaLocal}%`, opacity: home! >= away! ? 1 : 0.45 }} />}
        </div>
        <div className="flex flex-1 overflow-hidden rounded-pill bg-surface-3">
          {hay && <div className="h-full rounded-pill" style={{ width: `${100 - cuotaLocal}%`, background: 'var(--series-2)', opacity: away! >= home! ? 1 : 0.45 }} />}
        </div>
      </div>
    </div>
  );
}

export function MatchDetailPage() {
  const { matchId = '' } = useParams();
  const id = decodeURIComponent(matchId);
  const match = useStore((s) => s.matches.find((m) => m.id === id));
  const ppg = useStore((s) => s.derived.opponentPpg.get(id));

  if (!match) {
    return (
      <Card>
        <Empty
          icon={<Table2 />}
          title="Partido no encontrado"
          action={
            <Link to="/partidos" className="text-[13px] font-medium text-accent-text hover:underline">
              Volver a Partidos
            </Link>
          }
        >
          Puede que su clave haya cambiado al actualizar los datos de la competición.
        </Empty>
      </Card>
    );
  }

  const m = match;
  const na = <span className="text-faint">N/D</span>;
  const hayDescanso = m.homeFirstHalfGoals !== null && m.awayFirstHalfGoals !== null;

  return (
    <div className="space-y-4">
      <h1 className="sr-only">
        {m.homeTeamName} {m.homeGoals ?? ''} – {m.awayGoals ?? ''} {m.awayTeamName}
      </h1>
      <Card>
        <div className="flex flex-col items-center gap-3 px-4 py-6">
          <div className="flex flex-wrap items-center justify-center gap-x-2 text-[12px] text-muted">
            <LeagueLabel leagueId={m.leagueId} size="sm" link /> · <KickoffTime match={m} variant="linea" /> · <RoundLabel match={m} />
          </div>
          <div className="grid w-full max-w-2xl grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
            <TeamLabel teamId={m.homeTeamId} name={m.homeTeamName} size={36} align="right" className="justify-self-end text-[15px] font-semibold" />
            <div className="rounded-card bg-surface-2 px-4 py-2 text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
              {m.homeGoals ?? '–'}
              <span className="px-2 text-faint">-</span>
              {m.awayGoals ?? '–'}
            </div>
            <TeamLabel teamId={m.awayTeamId} name={m.awayTeamName} size={36} className="text-[15px] font-semibold" />
          </div>
          <div className="text-[12px] text-muted">{hayDescanso ? `Descanso ${m.homeFirstHalfGoals}-${m.awayFirstHalfGoals}` : 'Marcador al descanso no publicado'}</div>
          {m.awarded && (
            <Badge tone="warning" title="Resultado adjudicado por decisión (incomparecencia, sanción): no se jugó entero">
              Adjudicado: no cuenta en el análisis
            </Badge>
          )}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Estadísticas del partido" subtitle="Local a la izquierda, visitante a la derecha. N/D: la fuente no lo publicó">
          <div className="space-y-3.5 p-4">
            <StatCompare label="Posesión" home={m.possessionHome} away={awayPossession(m)} format={(v) => fmtPct(v, 0)} />
            <StatCompare label="Tiros" home={m.shotsHome} away={m.shotsAway} />
            <StatCompare label="Tiros a puerta" home={m.shotsOnTargetHome} away={m.shotsOnTargetAway} />
            <StatCompare label="Corners" home={m.cornersHome} away={m.cornersAway} />
            <StatCompare label="Faltas" home={m.foulsHome} away={m.foulsAway} />
            <StatCompare label="Fuera de juego" home={m.offsidesHome} away={m.offsidesAway} />
            <StatCompare label="Tarjetas amarillas" home={m.yellowCardsHome} away={m.yellowCardsAway} />
            <StatCompare label="Tarjetas rojas" home={m.redCardsHome} away={m.redCardsAway} />
            <StatCompare label="xG (goles esperados)" home={m.xGHome} away={m.xGAway} format={(v) => fmt(v, 2)} />
            <div className="flex items-center justify-between border-t border-border pt-3 text-[13px] tabular-nums">
              <span className="w-14">{fmt(ppg?.home ?? null)}</span>
              <span className="text-[12px] text-muted">Puntos por partido del rival</span>
              <span className="w-14 text-right">{fmt(ppg?.away ?? null)}</span>
            </div>
          </div>
        </Card>

        <Card title="Derivados y procedencia" subtitle="Calculados a partir del marcador y las estadísticas">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 p-4 text-[13px]">
            <Def label="Goles totales" value={fmtInt(totalGoals(m))} />
            <Def label="Goles 1.ª parte" value={fmtInt(firstHalfTotal(m))} />
            <Def label="Goles 2.ª parte" value={fmtInt(secondHalfTotal(m))} />
            <Def label="Tiros totales" value={fmtInt(shotsTotal(m))} />
            <Def label="Tiros a puerta totales" value={fmtInt(shotsOnTargetTotal(m))} />
            <Def label="Corners totales" value={fmtInt(cornersTotal(m))} />
            <Def label="Amarillas totales" value={fmtInt(yellowCardsTotal(m))} />
            <Def label="Ambos marcan" value={isBtts(m) === null ? na : isBtts(m) ? 'Sí' : 'No'} />
            <Def label="Over 2.5" value={totalGoals(m) === null ? na : totalGoals(m)! > 2.5 ? 'Sí' : 'No'} />
            <Def label="Resultado al descanso" value={resultHT(m) ?? na} />
            <Def label="Resultado final" value={resultFT(m) ?? na} />
            <Def label="Fuente del marcador" value={m.source ?? na} />
            <Def label="Fuente de estadísticas" value={m.statsSource ?? na} />
            <Def label="Escritos a mano" value={m.manualFields?.length ? manualDataNames(m.manualFields).join(', ') : na} />
            <Def label="Actualizado" value={m.updatedAt?.slice(0, 16).replace('T', ' ') ?? na} />
            <Def label="Estadísticas buscadas" value={m.statsUpdatedAt?.slice(0, 16).replace('T', ' ') ?? na} />
            <Def label="Id del proveedor" value={m.providerId ?? na} />
          </dl>

          {m.statsCitations?.length > 0 && (
            <div className="border-t border-border p-4">
              <p className="mb-2 text-[12px] text-muted">De dónde salieron estas cifras. Cualquiera se puede comprobar abriendo su fuente.</p>
              <ul className="space-y-1">
                {m.statsCitations.map((url) => (
                  <li key={url}>
                    <a href={url} target="_blank" rel="noreferrer noopener" className="flex items-start gap-1.5 rounded text-[12px] break-all text-accent-text hover:underline">
                      <ExternalLink size={12} className="mt-0.5 shrink-0" aria-hidden />
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      <MatchMomentum match={m} />
    </div>
  );
}

function Def({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium tracking-wide text-muted uppercase">{label}</dt>
      <dd className="mt-0.5 truncate font-medium">{value}</dd>
    </div>
  );
}
