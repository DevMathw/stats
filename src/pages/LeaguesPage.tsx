import { Link, useParams } from 'react-router-dom';
import { useMemo, useRef } from 'react';
import { Eye, FileUp, RefreshCw, Trophy } from 'lucide-react';
import { fmtInt } from '../utils/format';
import { Badge, Card, Empty, IconButton, PageHeader, Stat, StatRow } from '../components/ui';
import { DataTable, type Column } from '../components/DataTable';
import { CountryFlag } from '../components/LeagueLabel';
import { countryName } from '../domain/models/countries';
import type { League, StandingRow } from '../types';
import { fmt } from '../utils/format';
import { formatRound } from '../domain/models/ids';
import { describeLeagueRounds } from '../domain/statistics/leagueRounds';
import { competitionFormat, describeFormat, SHAPE_LABEL } from '../domain/models/competitionFormat';
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
      sortValue: (l) => l.name,
    },
    {
      id: 'partidos',
      header: 'Partidos',
      numeric: true,
      cell: (l) => {
        const n = countByLeague.get(l.id) ?? 0;
        return n === 0 ? <span className="text-negative-text">0</span> : n;
      },
      sortValue: (l) => countByLeague.get(l.id) ?? 0,
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
      sortValue: (l) => roundsByLeague.get(l.id)?.currentRound ?? null,
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
      sortValue: (l) => teamsByLeague.get(l.id) ?? 0,
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
      sortValue: (l) => competitionFormat(l).structure,
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
          initialSort={{ id: 'partidos', dir: 'desc' }}
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

/** Un dato del formato: etiqueta pequeña y valor legible. */
function Dato({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`min-w-0 ${wide ? 'col-span-2 lg:col-span-4' : ''}`}>
      <dt className="text-[11px] tracking-wide text-faint uppercase">{label}</dt>
      <dd className="mt-0.5 break-words">{value}</dd>
    </div>
  );
}

export function LeagueDetailPage() {
  const { leagueId = '' } = useParams();
  const id = decodeURIComponent(leagueId);
  const league = useStore((s) => s.leagues.find((l) => l.id === id));
  // Los selectores devuelven SIEMPRE referencias estables. Un `.filter()` o un `?? []`
  // dentro del selector crea un array nuevo en cada render y zustand entra en bucle
  // ("Maximum update depth exceeded"): lo derivado va en useMemo, no en el selector.
  const standingsByLeague = useStore((s) => s.derived.standingsByLeague);
  const rounds = useStore((s) => s.derived.roundsByLeague.get(id));
  const averages = useStore((s) => s.derived.averagesByLeague.get(id));
  const allMatches = useStore((s) => s.matches);

  const standings = useMemo(() => standingsByLeague.get(id) ?? [], [standingsByLeague, id]);
  const matches = useMemo(() => allMatches.filter((m) => m.leagueId === id), [allMatches, id]);

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
  const equipos = new Set(matches.flatMap((m) => [m.homeTeamId, m.awayTeamId])).size;
  // Con fases, la tabla de jornadas lleva una fila más que dice a qué fase pertenece cada columna.
  const conFases = (rounds?.breakdown ?? []).some((b) => b.phase);
  const posicionActual = rounds
    ? rounds.breakdown.findIndex((b) => (b.phase ?? null) === rounds.currentPhase && b.round === rounds.currentRound) + 1
    : 0;

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
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <CountryFlag country={league.country} /> {league.name}
          </span>
        }
        description={`${countryName(league.country)} · ${league.season} · ${formato.structure || league.calendarFormat || 'formato sin medir'}`}
      />

      <StatRow cols={4}>
        <Stat label="Partidos cargados" value={matches.length} />
        <Stat label="Equipos" value={standings.length} />
        <Stat label="% empates" value={averages ? `${(averages.drawRate * 100).toFixed(1)} %` : '—'} tip="Partidos que acabaron en empate sobre los jugados. Es la base del empate del modelo 1X2." />
        <Stat label="PPG medio" value={fmt(averages?.ppg ?? null)} tip="Puntos por partido medios de la liga: la referencia del ajuste por calidad de rivales (SoS)." />
      </StatRow>

      <Card title="Formato de la competición" subtitle="Lo medido en su fuente y lo que publica la propia competición">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 p-4 text-[13px] lg:grid-cols-4">
          <Dato label="Tipo" value={formato.kind === 'continental' ? 'Competición continental de clubes' : 'Liga nacional'} />
          <Dato label="Temporada" value={SHAPE_LABEL[formato.shape]} />
          <Dato label="Equipos" value={`${equipos} con partidos cargados`} />
          <Dato label="Fase regular" value={formato.regularRounds === null ? 'Sin numeración estable en la fuente' : `${formato.regularRounds} jornadas`} />
          <Dato label="Grupos o conferencias" value={formato.groups ? 'Sí' : 'No'} />
          <Dato label="Fase final" value={formato.finalStage ?? 'No tiene'} />
          <Dato label="Ascenso" value={formato.promotion === null ? 'Sin documentar' : formato.promotion ? 'Sí' : 'No'} />
          <Dato label="Descenso" value={formato.relegation === null ? 'Sin documentar' : formato.relegation ? 'Sí' : 'No'} />
          {formato.stages && (
            <Dato
              label="Etapas de la fase regular"
              value={formato.stages.map((e) => `${e.name} (${e.rounds} jornadas)`).join(' · ')}
              wide
            />
          )}
          {formato.note && <Dato label="Particularidad" value={formato.note} wide />}
        </dl>
      </Card>

      <Card title="Tabla de posiciones" subtitle="Puntos → diferencia de goles → goles a favor">
        <DataTable
          rows={standings}
          columns={standingCols}
          getRowId={(r) => r.teamId}
          initialSort={{ id: 'pos', dir: 'asc' }}
          maxHeight="none"
          empty="Esta liga no tiene partidos cargados."
        />
      </Card>

      <Card title="Jornadas cargadas" subtitle={rounds ? describeLeagueRounds(rounds) : 'Sin partidos ni calendario'}>
        {!rounds || rounds.breakdown.length === 0 ? (
          <Empty>Esta competición no tiene partidos ni calendario cargados.</Empty>
        ) : (
          <div className="overflow-x-auto p-3">
            <table className="data w-auto">
              <thead>
                {conFases && (
                  <tr>
                    <th scope="col">Fase</th>
                    {rounds.breakdown.map((b, i) => (
                      <th scope="col" key={`f-${b.phase ?? ''}|${b.round}`} className="num text-[11px] font-normal text-muted">
                        {i === 0 || rounds.breakdown[i - 1].phase !== b.phase ? (b.phase ?? 'Regular') : ''}
                      </th>
                    ))}
                  </tr>
                )}
                <tr>
                  <th scope="col">Jornada</th>
                  {rounds.breakdown.map((b) => (
                    <th scope="col" key={`${b.phase ?? ''}|${b.round}`} className="num" title={b.phase ? `Fase «${b.phase}», jornada ${b.round}` : `Jornada ${b.round}`}>
                      {b.round}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="whitespace-nowrap">Jugados</td>
                  {rounds.breakdown.map((b) => (
                    <td key={`${b.phase ?? ''}|${b.round}`} className="num">
                      {b.played || <span className="text-faint">·</span>}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="whitespace-nowrap">Pendientes</td>
                  {rounds.breakdown.map((b, i) => (
                    <td key={`${b.phase ?? ''}|${b.round}`} className={`num ${b.pending && i < posicionActual ? 'font-semibold text-warning-text' : ''}`}>
                      {b.pending || <span className="text-faint">·</span>}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
            <p className="mt-2 text-[12px] text-muted">
              En ámbar, los partidos pendientes de jornadas que <strong>ya empezaron</strong>: aplazados o rezagados. Un hueco entre la jornada
              actual y la próxima con pendientes significa que esas jornadas no están cargadas, no que no existan.
            </p>
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Fuente" padded>
          <p className="text-[13px]">{league.source ?? '—'}</p>
        </Card>
        <Card title="Confiabilidad" padded>
          <p className="text-[13px]">{league.reliabilityNotes ?? '—'}</p>
        </Card>
      </div>
    </div>
  );
}
