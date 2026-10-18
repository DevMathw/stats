import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMemo, useRef } from 'react';
import { Eye, FileUp, RefreshCw, Trophy } from 'lucide-react';
import { fmtInt } from '../utils/format';
import { Badge, BackLink, Button, Callout, Card, Empty, IconButton, inputClass, PageHeader, Stat, StatRow } from '../components/ui';
import { DataTable, type Column } from '../components/DataTable';
import { CountryFlag } from '../components/LeagueLabel';
import { countryName } from '../domain/models/countries';
import type { League, Match, StandingRow } from '../types';
import { fmt } from '../utils/format';
import { formatRound } from '../domain/models/ids';
import { describeLeagueRounds } from '../domain/statistics/leagueRounds';
import { seasonTable } from '../domain/statistics/seasonTable';
import { compareSeasons, seasonKey } from '../domain/models/season';
import { shortDate } from '../utils/matchTime';
import { competitionFormat, describeFormat } from '../domain/models/competitionFormat';
import { useStore } from '../store/useStore';
import { TeamLabel } from '../components/TeamLabel';
import { UpdateLogPanel } from '../components/UpdateLogPanel';
import { Tooltip } from '../components/Tooltip';

/**
 * Carga el Excel base de UNA competición.
 *
 * El `<input type="file">` va oculto y lo dispara el botón: así se usa el mismo botón de icono que las
 * demás acciones y no aparece el control gris del navegador en cada fila.
 */
function ExcelAction({ league, disabled, onFile }: { league: League; disabled: boolean; onFile: (leagueId: string, file: File) => Promise<void> }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={input}
        type="file"
        accept=".xlsx,.xlsm,.xls"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Se limpia el valor para poder recargar el MISMO archivo dos veces seguidas.
          e.target.value = '';
          if (file) void onFile(league.id, file);
        }}
      />
      <IconButton
        icon={<FileUp size={16} />}
        label={`Cargar el Excel de ${league.name}`}
        tooltip={`Cargar el Excel de ${league.name}: fusiona sus partidos y pendientes sin tocar las demás competiciones`}
        onClick={() => input.current?.click()}
        disabled={disabled}
        disabledReason="Espera a que termine la actualización en curso"
      />
    </>
  );
}

export function LeaguesPage() {
  const leagues = useStore((s) => s.leagues);
  const matches = useStore((s) => s.matches);
  const fixtures = useStore((s) => s.fixtures);
  const roundsByLeague = useStore((s) => s.derived.roundsByLeague);
  const refreshLeague = useStore((s) => s.refreshLeague);
  const importLeagueExcel = useStore((s) => s.importLeagueExcel);
  const status = useStore((s) => s.status);

  // Equipos por competición: los que aparecen como local o visitante en algo cargado.
  const teamsByLeague = useMemo(() => {
    const porLiga = new Map<string, Set<string>>();
    const anotar = (leagueId: string, ...ids: string[]) => {
      const s = porLiga.get(leagueId) ?? new Set<string>();
      for (const id of ids) s.add(id);
      porLiga.set(leagueId, s);
    };
    for (const m of matches) anotar(m.leagueId, m.homeTeamId, m.awayTeamId);
    for (const f of fixtures) anotar(f.leagueId, f.homeTeamId, f.awayTeamId);
    return new Map([...porLiga].map(([id, s]) => [id, s.size]));
  }, [matches, fixtures]);

  const countByLeague = useMemo(() => {
    const m = new Map<string, number>();
    for (const x of matches) m.set(x.leagueId, (m.get(x.leagueId) ?? 0) + 1);
    return m;
  }, [matches]);

  if (leagues.length === 0)
    return (
      <>
        <PageHeader title="Competiciones" />
        <Card>
          <Empty
            icon={<Trophy />}
            title="Todavía no hay competiciones"
            action={
              <Link to="/configuracion" className="text-[13px] font-medium text-accent-text hover:underline">
                Importar el Excel en Configuración
              </Link>
            }
          >
            Se cargan con el libro base de la temporada.
          </Empty>
        </Card>
      </>
    );

  /** Lo que resume la tabla: todo sale de los mismos mapas que pintan sus columnas. */
  const resumen = {
    partidos: matches.length,
    pendientes: fixtures.length,
    equipos: new Set([...matches.flatMap((m) => [m.homeTeamId, m.awayTeamId]), ...fixtures.flatMap((f) => [f.homeTeamId, f.awayTeamId])]).size,
    paises: new Set(leagues.map((l) => l.country).filter(Boolean)).size,
  };

  const ocupado = status !== 'idle';
  const columns: Column<League>[] = [
    {
      id: 'liga',
      header: 'Competición',
      cell: (l) => {
        const r = roundsByLeague.get(l.id);
        return (
          <span className="flex items-center gap-2">
            <CountryFlag country={l.country} />
            <span className="min-w-0">
              <Link className="block truncate font-medium hover:text-accent-text" to={`/ligas/${encodeURIComponent(l.id)}`}>
                {l.name}
              </Link>
              <span className="block truncate text-[11px] text-faint">
                {countryName(l.country)} · {l.confederation}
              </span>
            </span>
            {r && r.pendingInStartedRounds > 0 && (
              <Badge tone="warning" title="Partidos sin jugar de jornadas ya empezadas: aplazados o rezagados">
                +{r.pendingInStartedRounds}
              </Badge>
            )}
          </span>
        );
      },
    },
    {
      id: 'partidos',
      header: 'Partidos',
      numeric: true,
      cell: (l) => {
        const n = countByLeague.get(l.id) ?? 0;
        return n === 0 ? <span className="text-negative-text">0</span> : n;
      },
    },
    {
      id: 'jornada',
      header: 'Jornada',
      cell: (l) => {
        const r = roundsByLeague.get(l.id);
        if (!r || r.currentRound === null) return <span className="text-faint">Sin partidos</span>;
        return (
          <Tooltip content={describeLeagueRounds(r)}>
            <span className="whitespace-nowrap">
              {r.currentPhase ? `${r.currentPhase} · ` : ''}
              {formatRound(r.currentRound)}
              {r.nextNewRound === null ? <span className="text-faint"> → sin calendario</span> : <span className="text-muted"> → {formatRound(r.nextNewRound)}</span>}
            </span>
          </Tooltip>
        );
      },
    },
    {
      id: 'equipos',
      header: 'Equipos',
      numeric: true,
      hideOnMobile: true,
      // Los equipos que de verdad juegan en la base, no el número declarado en el Excel (que faltaba
      // en 14 de las 32 y salía como «Confirmar»).
      cell: (l) => {
        const n = teamsByLeague.get(l.id) ?? 0;
        if (n === 0) return <span className="text-faint">Sin equipos</span>;
        const declarado = l.teamCount;
        return declarado !== null && declarado !== n ? (
          <Tooltip content={`${n} equipos con partidos cargados; el Excel declaraba ${declarado}`}>
            <span className="border-b border-dotted border-border-strong">{n}</span>
          </Tooltip>
        ) : (
          n
        );
      },
    },
    {
      id: 'formato',
      header: 'Formato',
      hideOnMobile: true,
      cell: (l) => {
        const f = competitionFormat(l);
        if (!f.structure) return <span className="text-faint">—</span>;
        return (
          <Tooltip content={describeFormat(f)}>
            <span className="block max-w-64 truncate text-muted">{f.structure}</span>
          </Tooltip>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Competiciones"
        description="Cada competición se actualiza desde su fuente oficial o con su Excel base. El registro de la última actualización está debajo."
      />
      {/* Misma banda de resumen que el resto de pantallas: una cifra manda y las demás la sitúan. */}
      <StatRow>
        <Stat label="Competiciones" value={fmtInt(leagues.length)} hint={`en ${resumen.paises} países`} icon={<Trophy />} hero />
        <Stat label="Partidos cargados" value={fmtInt(resumen.partidos)} tip="Partidos con resultado, de todas las competiciones y temporadas." />
        <Stat label="Pendientes" value={fmtInt(resumen.pendientes)} tip="Partidos del calendario que aún no se han jugado." />
        <Stat label="Equipos" value={fmtInt(resumen.equipos)} tip="Equipos que aparecen en algún partido cargado o pendiente." />
        <Stat label="Sin partidos" value={fmtInt(leagues.filter((l) => (countByLeague.get(l.id) ?? 0) === 0).length)} tip="Competiciones dadas de alta a las que aún no se les ha cargado ningún partido." />
      </StatRow>
      <Card>
        <DataTable
          rows={leagues}
          columns={columns}
          getRowId={(l) => l.id}
          searchable={(l) => `${l.name} ${countryName(l.country)} ${l.confederation}`}
          searchPlaceholder="Buscar competición o país…"
          maxHeight="none"
          actions={(l) => (
            <>
              <IconButton icon={<Eye size={16} />} label={`Ver ficha de ${l.name}`} to={`/ligas/${encodeURIComponent(l.id)}`} />
              <IconButton
                icon={<RefreshCw size={16} />}
                label={`Actualizar partidos de ${l.name}`}
                tooltip={`Actualizar los partidos de ${l.name} desde su fuente oficial y guardar su Excel en data/ligas/`}
                tone="accent"
                onClick={() => void refreshLeague(l.id)}
                disabled={ocupado}
                disabledReason="Hay una actualización en marcha"
              />
              <ExcelAction league={l} disabled={ocupado} onFile={importLeagueExcel} />
            </>
          )}
        />
      </Card>
      <UpdateLogPanel />
    </div>
  );
}

/**
 * La temporada que se esta viendo, en la direccion.
 *
 * NO se llama `temporada`: esa clave es la del filtro global de temporada (`useFiltersInUrl`), que al
 * sincronizar los filtros del store la reescribia y la borraba al instante. El selector se quedaba un
 * fotograma en la temporada elegida y volvia solo a la vigente.
 */
const CLAVE_TEMPORADA = 'edicion';

export function LeagueDetailPage() {
  const { leagueId = '' } = useParams();
  const id = decodeURIComponent(leagueId);
  const league = useStore((s) => s.leagues.find((l) => l.id === id));
  // Los selectores devuelven SIEMPRE referencias estables. Un `.filter()` o un `?? []`
  // dentro del selector crea un array nuevo en cada render y zustand entra en bucle
  // ("Maximum update depth exceeded"): lo derivado va en useMemo, no en el selector.
  const standingsByLeague = useStore((s) => s.derived.standingsByLeague);
  const averagesVigentes = useStore((s) => s.derived.averagesByLeague.get(id));
  const allMatches = useStore((s) => s.matches);
  const params = useStore((s) => s.params);
  const setFilters = useStore((s) => s.setFilters);
  const navigate = useNavigate();
  const [busqueda, setBusqueda] = useSearchParams();

  const deLaLiga = useMemo(() => allMatches.filter((m) => m.leagueId === id), [allMatches, id]);

  /**
   * Las temporadas que esta competicion tiene CARGADAS, de la mas reciente a la mas antigua.
   *
   * Solo las que existen de verdad en la base: un selector con temporadas vacias haria creer que faltan
   * datos cuando lo que pasa es que nunca se importaron.
   */
  const temporadas = useMemo(() => {
    const cuenta = new Map<string, number>();
    for (const m of deLaLiga) {
      const k = seasonKey(m.season) ?? m.season;
      cuenta.set(k, (cuenta.get(k) ?? 0) + 1);
    }
    return [...cuenta].sort(([a], [b]) => compareSeasons(b, a) || b.localeCompare(a));
  }, [deLaLiga]);

  const vigente = seasonKey(league?.season) ?? league?.season ?? '';
  const pedida = busqueda.get(CLAVE_TEMPORADA);
  /** La pedida por la direccion si existe; si no, la vigente; y si tampoco, la mas reciente cargada. */
  const temporada = temporadas.some(([k]) => k === pedida) ? pedida! : temporadas.some(([k]) => k === vigente) ? vigente : (temporadas[0]?.[0] ?? vigente);
  const esVigente = temporada === vigente;

  const elegirTemporada = (k: string) => {
    // En la direccion: asi el enlace a una temporada concreta se puede compartir y el boton atras funciona.
    const siguiente = new URLSearchParams(busqueda);
    if (k === vigente) siguiente.delete(CLAVE_TEMPORADA);
    else siguiente.set(CLAVE_TEMPORADA, k);
    setBusqueda(siguiente, { replace: true });
  };

  const matches = useMemo(() => deLaLiga.filter((m) => (seasonKey(m.season) ?? m.season) === temporada), [deLaLiga, temporada]);

  /*
   * La tabla. Para la temporada en curso se usa la del motor, que es la que ve el resto de la aplicacion;
   * para una cerrada se calcula aqui con la MISMA cadena (`seasonTable`, probado contra el motor).
   */
  const deLaTemporada = useMemo(
    () => (esVigente || !league ? null : seasonTable(league, matches, params)),
    [esVigente, league, matches, params],
  );
  const standings = useMemo(
    () => (deLaTemporada ? deLaTemporada.standings : (standingsByLeague.get(id) ?? [])),
    [deLaTemporada, standingsByLeague, id],
  );
  const averages = deLaTemporada ? deLaTemporada.averages : averagesVigentes;

  if (!league) {
    return (
      <Card>
        <Empty
          icon={<Trophy />}
          title="Competición no encontrada"
          action={
            <Link to="/ligas" className="text-[13px] font-medium text-accent-text hover:underline">
              Volver a Competiciones
            </Link>
          }
        />
      </Card>
    );
  }

  const formato = competitionFormat(league);

  const resultadoCols: Column<Match>[] = [
    { id: 'fecha', header: 'Fecha', cell: (m) => <span className="whitespace-nowrap">{shortDate(m.date)}</span>, sortValue: (m) => m.date },
    { id: 'jornada', header: 'J', title: 'Jornada', numeric: true, hideOnMobile: true, cell: (m) => m.round, sortValue: (m) => m.round },
    {
      id: 'partido',
      header: 'Partido',
      cell: (m) => (
        <span className="flex items-center gap-2">
          <TeamLabel teamId={m.homeTeamId} name={m.homeTeamName} />
          <span className="shrink-0 font-semibold tabular-nums">
            {m.homeGoals === null || m.awayGoals === null ? <span className="text-faint">—</span> : `${m.homeGoals}–${m.awayGoals}`}
          </span>
          <TeamLabel teamId={m.awayTeamId} name={m.awayTeamName} />
        </span>
      ),
      sortValue: (m) => m.homeTeamName,
    },
  ];

  const standingCols: Column<StandingRow>[] = [
    { id: 'pos', header: '#', title: 'Posición', numeric: true, width: '3rem', cell: (r) => r.position, sortValue: (r) => r.position },
    {
      id: 'equipo',
      header: 'Equipo',
      cell: (r) => (
        <Link className="font-medium hover:text-accent-text" to={`/equipos/${encodeURIComponent(r.teamId)}`}>
          <TeamLabel teamId={r.teamId} name={r.teamName} />
        </Link>
      ),
      sortValue: (r) => r.teamName,
    },
    { id: 'pj', header: 'PJ', title: 'Partidos jugados', numeric: true, cell: (r) => r.played, sortValue: (r) => r.played },
    { id: 'pg', header: 'PG', title: 'Ganados', numeric: true, hideOnMobile: true, cell: (r) => r.won, sortValue: (r) => r.won },
    { id: 'pe', header: 'PE', title: 'Empatados', numeric: true, hideOnMobile: true, cell: (r) => r.drawn, sortValue: (r) => r.drawn },
    { id: 'pp', header: 'PP', title: 'Perdidos', numeric: true, hideOnMobile: true, cell: (r) => r.lost, sortValue: (r) => r.lost },
    { id: 'gf', header: 'GF', title: 'Goles a favor', numeric: true, hideOnMobile: true, cell: (r) => r.goalsFor, sortValue: (r) => r.goalsFor },
    { id: 'gc', header: 'GC', title: 'Goles en contra', numeric: true, hideOnMobile: true, cell: (r) => r.goalsAgainst, sortValue: (r) => r.goalsAgainst },
    {
      id: 'dg',
      header: 'DG',
      title: 'Diferencia de goles',
      numeric: true,
      cell: (r) => <span className={r.goalDiff > 0 ? 'text-positive-text' : r.goalDiff < 0 ? 'text-negative-text' : ''}>{r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}</span>,
      sortValue: (r) => r.goalDiff,
    },
    { id: 'pts', header: 'Pts', title: 'Puntos', numeric: true, cell: (r) => <span className="font-semibold">{r.points}</span>, sortValue: (r) => r.points },
    { id: 'ppg', header: 'PPG', title: 'Puntos por partido', numeric: true, hideOnMobile: true, cell: (r) => fmt(r.ppg), sortValue: (r) => r.ppg },
  ];

  return (
    <div className="space-y-4">
      <BackLink to="/ligas">Competiciones</BackLink>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <CountryFlag country={league.country} /> {league.name}
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5">
            <span>
              {countryName(league.country)} · {formato.structure || league.calendarFormat || 'formato sin medir'}
            </span>
            {/* Antes eran dos tarjetas al pie de la pagina para dos lineas de texto. */}
            {league.source && <Badge title={`Fuente de los datos: ${league.source}`}>{league.source}</Badge>}
            {league.reliabilityNotes && (
              <Badge tone="warning" title={league.reliabilityNotes}>
                Confiabilidad
              </Badge>
            )}
          </span>
        }
        actions={
          temporadas.length > 1 && (
            <label className="flex items-center gap-2 text-[13px]">
              <span className="text-muted">Temporada</span>
              <select className={`${inputClass} max-w-56`} value={temporada} onChange={(e) => elegirTemporada(e.target.value)}>
                {temporadas.map(([k, n]) => (
                  <option key={k} value={k}>
                    {k === vigente ? `${k} · en curso` : k} ({n})
                  </option>
                ))}
              </select>
            </label>
          )
        }
      />

      {/*
        * Todo lo de abajo es de la temporada ELEGIDA, no de las cuatro juntas. Antes esta pantalla contaba
        * los partidos de todas las temporadas cargadas y los enseñaba al lado de una tabla que solo era de
        * la vigente: «1.218 partidos» y veinte equipos con seis jornadas.
        */}
      <StatRow>
        <Stat
          label="Temporada"
          value={<span className="whitespace-nowrap">{temporada}</span>}
          hint={esVigente ? 'en curso' : 'cerrada'}
          icon={<Trophy />}
          hero
        />
        <Stat label="Partidos" value={matches.length} hint={temporadas.length > 1 ? `de ${deLaLiga.length} en total` : undefined} />
        <Stat label="Equipos" value={standings.length} />
        <Stat label="% empates" value={averages ? `${(averages.drawRate * 100).toFixed(1)} %` : '—'} tip="Partidos que acabaron en empate sobre los jugados. Es la base del empate del modelo 1X2." />
        <Stat label="PPG medio" value={fmt(averages?.ppg ?? null)} tip="Puntos por partido medios de la liga: la referencia del ajuste por calidad de rivales (SoS)." />
      </StatRow>

      {!esVigente && (
        <Callout tone="neutral">
          Estás viendo la temporada <strong>{temporada}</strong>, ya cerrada. La tabla y las medias salen solo de sus
          partidos. Las proyecciones y los picks de la aplicación siempre usan la temporada en curso
          (<button type="button" className="font-medium text-accent-text hover:underline" onClick={() => elegirTemporada(vigente)}>volver a {vigente}</button>).
        </Callout>
      )}

      <Card title={`Tabla de posiciones · ${temporada}`} subtitle="Puntos → diferencia de goles → goles a favor">
        <DataTable
          rows={standings}
          columns={standingCols}
          getRowId={(r) => r.teamId}
          initialSort={{ id: 'pos', dir: 'asc' }}
          maxHeight="none"
          empty={`No hay partidos cargados de la temporada ${temporada}.`}
        />
      </Card>

      {/* Los partidos de la temporada elegida, con enlace a la ficha de cada uno. */}
      <Card
        title={`Resultados · ${temporada}`}
        subtitle={`${matches.length} ${matches.length === 1 ? 'partido cargado' : 'partidos cargados'}`}
        right={
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              // Partidos ya sabe filtrar por competición y temporada: se reutiliza en vez de repetir aquí
              // la tabla con todas sus columnas y su control de datos que faltan.
              setFilters({ leagueId: id, season: temporada, teamId: null, round: null });
              navigate('/partidos');
            }}
          >
            Ver en Partidos
          </Button>
        }
      >
        <DataTable
          rows={matches}
          columns={resultadoCols}
          getRowId={(m) => m.id}
          searchable={(m) => `${m.homeTeamName} ${m.awayTeamName} ${m.date}`}
          searchPlaceholder="Buscar equipo o fecha…"
          pageSize={10}
          initialSort={{ id: 'fecha', dir: 'desc' }}
          empty={`No hay partidos cargados de la temporada ${temporada}.`}
          actions={(m) => <IconButton icon={<Eye size={16} />} label={`Ver ficha de ${m.homeTeamName} – ${m.awayTeamName}`} to={`/partidos/${encodeURIComponent(m.id)}`} />}
        />
      </Card>

    </div>
  );
}
