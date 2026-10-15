// oxlint-disable react/only-export-components -- el hook del registro va con los badges que lo pintan
/**
 * Fuentes de datos a la vista: las que consulta cada competición y la procedencia guardada en cada partido.
 *
 * Las fuentes configuradas vienen del registro del servidor (`GET /api/official-matches`), no de una copia
 * en el cliente: se enseña exactamente lo que se consulta. La procedencia de cada partido es la que se guardó
 * al cargarlo; si no se guardó, se dice, no se supone.
 */
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { BadgeCheck, ExternalLink } from 'lucide-react';
import { Badge, IconButton, Skeleton } from './ui';
import { DataTable } from './DataTable';
import { Tooltip } from './Tooltip';
import { NA } from '../utils/format';
import type { Fixture, League, Match } from '../types';
import { espnLeagueId } from '../domain/models/espnLeagues';
import { EMPTY_STATISTICS } from '../services/providers/types';
import { manualDataNames } from '../domain/models/matchDataRules';
import { fetchOfficialLeagues, type ConfiguredSource, type OfficialLeague } from '../services/providers/officialSources';
import { useStore } from '../store/useStore';

export interface SourceRegistry {
  /** Por competición (id de ESPN). `null` mientras carga o si falló. */
  leagues: Map<string, OfficialLeague> | null;
  error: string | null;
}

export function useSourceRegistry(): SourceRegistry {
  const [registro, setRegistro] = useState<SourceRegistry>({ leagues: null, error: null });
  useEffect(() => {
    let vivo = true;
    fetchOfficialLeagues()
      .then((ls) => {
        if (!ls.every((l) => Array.isArray(l.sources))) throw new Error('El servidor local no envía las fuentes de cada competición: reinicia npm run dev.');
        if (vivo) setRegistro({ leagues: new Map(ls.map((l) => [l.slug, l])), error: null });
      })
      .catch((e: Error) => {
        if (vivo) setRegistro({ leagues: null, error: e.message });
      });
    return () => {
      vivo = false;
    };
  }, []);
  return registro;
}

type Variante = 'oficial' | 'secundaria' | 'inactiva' | 'otra';

const VARIANTE: Record<Variante, { clase: string; tipo: string }> = {
  oficial: { clase: 'border-transparent bg-accent-soft text-accent-text', tipo: 'web oficial' },
  secundaria: { clase: 'border-border bg-surface text-text', tipo: 'secundaria autorizada' },
  inactiva: { clase: 'border-dashed border-border-strong text-faint', tipo: 'sin datos' },
  otra: { clase: 'border-transparent bg-neutral-soft text-neutral-text', tipo: 'procedencia anotada' },
};

/** Una fuente como badge: enlaza su web, si la tiene, y el tooltip explica qué aporta. */
function SourceBadge({ name, url, variante, tip, count }: { name: string; url?: string | null; variante: Variante; tip: ReactNode; count?: number }) {
  const { clase, tipo } = VARIANTE[variante];
  const base = `inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${clase}`;
  const contenido = (
    <>
      {variante === 'oficial' && <BadgeCheck size={12} aria-hidden />}
      {name}
      <span className="sr-only">, {tipo}</span>
      {count !== undefined && <span className="tabular-nums opacity-70">· {count}</span>}
      {url && <ExternalLink size={11} aria-hidden className="opacity-60" />}
    </>
  );
  return (
    <Tooltip content={tip}>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer noopener" className={`${base} transition-colors hover:border-accent`}>
          {contenido}
          <span className="sr-only"> (se abre en otra pestaña)</span>
        </a>
      ) : (
        <span tabIndex={0} className={base}>
          {contenido}
        </span>
      )}
    </Tooltip>
  );
}

function entradaDe(league: League, registro: SourceRegistry): OfficialLeague | undefined {
  const slug = espnLeagueId(league.name, league.country);
  return slug ? registro.leagues?.get(slug) : undefined;
}

/**
 * Fuentes que consulta una competición para un tipo de dato, en su orden. Se usa la primera que da datos
 * utilizables; las que se consultan sin aportar nada se agrupan, con su motivo en el tooltip.
 */
export function ConfiguredSources({ league, rol, registro }: { league: League; rol: 'partidos' | 'estadisticas'; registro: SourceRegistry }) {
  if (registro.error) return <span className="text-faint">—</span>;
  if (!registro.leagues) return <Skeleton className="h-5 w-36" />;
  const entrada = entradaDe(league, registro);
  if (!entrada) {
    return (
      <Badge tone="warning" title="No está en el registro de fuentes del servidor: «Actualizar partidos» la omite y no hay de dónde traer sus estadísticas.">
        Sin fuente configurada
      </Badge>
    );
  }

  const lista = entrada.sources;
  const antes = (s: ConfiguredSource) =>
    lista
      .slice(0, lista.indexOf(s))
      .map((x) => x.name)
      .join(' → ');

  if (rol === 'estadisticas') {
    const conCifras = lista.filter((s) => s.stats);
    if (conCifras.length === 0) return <Badge title="Ninguna de sus fuentes publica estadísticas por partido que la app sepa leer.">Ninguna</Badge>;
    return (
      <span className="flex flex-wrap items-center gap-1">
        {conCifras.map((s) => (
          <SourceBadge
            key={s.name}
            name={s.name}
            url={s.url}
            variante={s.secondary ? 'secundaria' : 'oficial'}
            tip={
              s.secondary
                ? antes(s)
                  ? `Secundaria autorizada: completa solo los datos que no publica ${antes(s)}.`
                  : 'Secundaria autorizada: única fuente de estadísticas de esta competición, xG y marcador al descanso incluidos.'
                : 'Web oficial: tiros, posesión, corners, tarjetas, faltas y fueras de juego de cada partido, según lo que publique.'
            }
          />
        ))}
      </span>
    );
  }

  const sinDatos = lista.filter((s) => s.secondary && !s.matches);
  return (
    <span className="flex flex-wrap items-center gap-1">
      {lista
        .filter((s) => !s.secondary || s.matches)
        .map((s) => (
          <SourceBadge
            key={s.name}
            name={s.name}
            url={s.url}
            variante={s.secondary ? 'secundaria' : s.matches ? 'oficial' : 'inactiva'}
            tip={
              s.secondary
                ? antes(s)
                  ? `Secundaria autorizada: se usa si antes ninguna devuelve partidos utilizables (${antes(s)}).`
                  : 'Secundaria autorizada: única fuente de partidos y calendario de esta competición.'
                : s.matches
                  ? `Web oficial de ${league.name}: se consulta primero y de aquí salen los partidos y el calendario.`
                  : `Web oficial de ${league.name}: se consulta primero, pero ${s.reason}. Los partidos llegan de la primera secundaria que responda.`
            }
          />
        ))}
      {sinDatos.length > 0 && (
        <SourceBadge
          name={`+${sinDatos.length} sin datos`}
          variante="inactiva"
          tip={
            <>
              Se consultan en su turno, pero hoy no aportan datos:
              <ul className="mt-1 list-disc pl-4">
                {sinDatos.map((s) => (
                  <li key={s.name}>
                    {s.name}: {s.reason}
                  </li>
                ))}
              </ul>
            </>
          }
        />
      )}
    </span>
  );
}

const SECUNDARIA = ' (secundaria)';

/** Procedencia guardada en un dato: «laliga.com», «FotMob (secundaria)», «Manual», la anotada en el Excel… */
function Procedencia({ texto, entrada, cargado, count }: { texto: string | null; entrada?: OfficialLeague; cargado: boolean; count?: number }) {
  if (!texto) return <SourceBadge name="Sin procedencia" variante="inactiva" count={count} tip="El dato no guarda de dónde salió." />;
  // Dos fuentes en un mismo partido: la oficial y FotMob con lo que la oficial no publica.
  if (texto.includes(' + ')) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1">
        {texto.split(' + ').map((parte, i) => (
          <Procedencia key={parte} texto={parte} entrada={entrada} cargado={cargado} count={i === 0 ? count : undefined} />
        ))}
      </span>
    );
  }
  const secundaria = texto.endsWith(SECUNDARIA);
  const name = secundaria ? texto.slice(0, -SECUNDARIA.length) : texto;
  // «SofaScore» en el Excel base y «Sofascore» en el registro son la misma fuente.
  const conf = entrada?.sources.find((s) => s.name.toLowerCase() === name.toLowerCase());
  const variante: Variante = conf ? (conf.secondary ? 'secundaria' : 'oficial') : secundaria ? 'secundaria' : 'otra';
  const tip = !conf
    ? cargado
      ? 'Procedencia anotada al cargar el dato (p. ej., en el Excel base). No es una de las fuentes que consulta esta competición.'
      : 'Procedencia guardada en el dato.'
    : !conf.secondary
      ? 'Web oficial de la competición.'
      : conf.matches
        ? 'Secundaria autorizada de esta competición.'
        : 'Secundaria autorizada, anotada al cargar el dato (p. ej., en el Excel base). Hoy «Actualizar partidos» no puede leerla.';
  // Solo se enlaza lo que sirve para comprobar el dato: la web oficial o una secundaria que se lee.
  const url = conf && (!conf.secondary || conf.matches) ? conf.url : null;
  return <SourceBadge name={name} url={url} variante={variante} tip={tip} count={count} />;
}

type Cifras = { tipo: 'fuente'; texto: string } | { tipo: 'sin-procedencia' | 'no-encontradas' | 'sin-buscar' };

const SIN_FUENTE = {
  'sin-procedencia': { name: 'Sin procedencia', tip: 'Tiene cifras, pero el dato no guarda de dónde salieron (p. ej., las del Excel base).' },
  'no-encontradas': { name: 'No encontradas', tip: 'Se buscaron y ninguna de sus fuentes publicó las estadísticas de este partido.' },
  'sin-buscar': { name: 'Sin buscar', tip: 'Aún no se han buscado. Se traen desde Partidos, con el botón de estadísticas de cada partido.' },
};

const tieneCifras = (m: Match) => (Object.keys(EMPTY_STATISTICS) as (keyof typeof EMPTY_STATISTICS)[]).some((k) => m[k] !== null);

function cifrasDe(m: Match): Cifras {
  if (m.statsSource) return { tipo: 'fuente', texto: m.statsSource };
  if (tieneCifras(m)) return { tipo: 'sin-procedencia' };
  return { tipo: m.statsUpdatedAt ? 'no-encontradas' : 'sin-buscar' };
}

function agrupar<T>(xs: T[], clave: (x: T) => string) {
  const grupos = new Map<string, { ejemplo: T; n: number }>();
  for (const x of xs) {
    const k = clave(x);
    const g = grupos.get(k);
    if (g) g.n++;
    else grupos.set(k, { ejemplo: x, n: 1 });
  }
  return [...grupos].sort((a, b) => b[1].n - a[1].n);
}

type Fila = Match | Fixture;
const jugado = (x: Fila): x is Match => 'homeGoals' in x;

/** Procedencia de los partidos cargados de una competición: resumen y partido a partido. */
export function CompetitionDataSources({ league, registro }: { league: League; registro: SourceRegistry }) {
  const matches = useStore((s) => s.matches);
  const fixtures = useStore((s) => s.fixtures);
  const jugados = useMemo(() => matches.filter((m) => m.leagueId === league.id), [matches, league.id]);
  const pendientes = useMemo(() => fixtures.filter((f) => f.leagueId === league.id), [fixtures, league.id]);
  const filas = useMemo<Fila[]>(() => [...jugados, ...pendientes], [jugados, pendientes]);

  if (filas.length === 0) return <p className="text-[13px] text-muted">No hay partidos cargados de esta competición.</p>;

  const entrada = entradaDe(league, registro);
  const cargado = registro.leagues !== null;
  const fuente = (texto: string | null, count?: number) => <Procedencia texto={texto} entrada={entrada} cargado={cargado} count={count} />;
  const cifras = (c: Cifras, count?: number) =>
    c.tipo === 'fuente' ? fuente(c.texto, count) : <SourceBadge {...SIN_FUENTE[c.tipo]} variante="inactiva" count={count} />;

  const resumen: [string, ReactNode][] = [];
  if (jugados.length) {
    resumen.push([`Partidos disputados · ${jugados.length}`, agrupar(jugados, (m) => m.source ?? '').map(([k, g]) => <Fragment key={k}>{fuente(g.ejemplo.source, g.n)}</Fragment>)]);
    resumen.push([
      'Sus estadísticas',
      agrupar(jugados.map(cifrasDe), (c) => (c.tipo === 'fuente' ? `f:${c.texto}` : c.tipo)).map(([k, g]) => <Fragment key={k}>{cifras(g.ejemplo, g.n)}</Fragment>),
    ]);
  }
  if (pendientes.length) {
    resumen.push([`Pendientes · ${pendientes.length}`, agrupar(pendientes, (f) => f.source ?? '').map(([k, g]) => <Fragment key={k}>{fuente(g.ejemplo.source, g.n)}</Fragment>)]);
  }

  return (
    <div className="space-y-3">
      <dl className="grid gap-x-3 gap-y-2 text-[12px] sm:grid-cols-[max-content_1fr] sm:items-center">
        {resumen.map(([titulo, badges]) => (
          <Fragment key={titulo}>
            <dt className="font-medium text-muted">{titulo}</dt>
            <dd className="flex flex-wrap gap-1">{badges}</dd>
          </Fragment>
        ))}
      </dl>
      <div className="overflow-hidden rounded-card border border-border bg-surface">
        <DataTable<Fila>
          rows={filas}
          getRowId={(x) => (jugado(x) ? `m:${x.id}` : `f:${x.id}`)}
          searchable={(x) => `${x.homeTeamName} ${x.awayTeamName}`}
          searchPlaceholder="Buscar equipo…"
          pageSize={10}
          initialSort={{ id: 'fecha', dir: 'desc' }}
          columns={[
            { id: 'fecha', header: 'Fecha', sortValue: (x) => x.date, cell: (x) => <span className="tabular-nums">{x.date.split('-').reverse().join('/')}</span> },
            { id: 'jornada', header: 'J', title: 'Jornada', numeric: true, hideOnMobile: true, sortValue: (x) => x.round, cell: (x) => x.round },
            { id: 'partido', header: 'Partido', cell: (x) => `${x.homeTeamName} – ${x.awayTeamName}` },
            {
              id: 'resultado',
              header: 'Resultado',
              align: 'center',
              cell: (x) =>
                !jugado(x) ? (
                  <Badge tone={x.status === 'Programado' ? 'neutral' : 'warning'}>{x.status}</Badge>
                ) : x.homeGoals === null || x.awayGoals === null ? (
                  NA
                ) : (
                  <span className="tabular-nums">
                    {x.homeGoals}-{x.awayGoals}
                  </span>
                ),
            },
            { id: 'fuente', header: 'Fuente del partido', title: 'De dónde salieron la fecha, los equipos y el marcador', cell: (x) => fuente(x.source) },
            {
              id: 'estadisticas',
              header: 'Fuente de estadísticas',
              cell: (x) =>
                jugado(x) ? (
                  <span className="flex items-center gap-1">
                    {cifras(cifrasDe(x))}
                    {(x.statsCitations ?? []).map((url) => (
                      <IconButton key={url} icon={<ExternalLink size={14} />} label="Abrir la página de la que salieron estas cifras" href={url} size="sm" />
                    ))}
                    {x.manualFields?.length ? (
                      <SourceBadge name="Manual" variante="otra" tip={`Escrito a mano en Partidos: ${manualDataNames(x.manualFields).join(', ')}.`} />
                    ) : null}
                  </span>
                ) : (
                  <span className="text-faint">—</span>
                ),
            },
          ]}
        />
      </div>
    </div>
  );
}
