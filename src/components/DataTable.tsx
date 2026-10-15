// oxlint-disable react/only-export-components -- `pageNumbers` es la regla de la paginación de esta tabla
import { Fragment, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, Download, Search, SearchX, X } from 'lucide-react';
import { Button, Empty, IconButton, TableSkeleton, inputClass } from './ui';
import { Tooltip } from './Tooltip';
import { descargarTexto } from '../utils/download';

export interface Column<T> {
  /** Identificador único de la columna. */
  id: string;
  header: ReactNode;
  /** Qué es la columna, en tooltip. Para las abreviaturas (PJ, O2.5, SoS). */
  title?: string;
  /** Contenido de la celda. */
  cell: (row: T) => ReactNode;
  /** Valor para ordenar. Si falta, la columna no se puede ordenar. */
  sortValue?: (row: T) => number | string | null;
  /** Alinea a la derecha y aplica cifras tabulares. */
  numeric?: boolean;
  /** Centra cabecera y celdas, p. ej. «Local vs Visitante». */
  align?: 'center';
  /** Se oculta por debajo de `md`: las columnas de contexto estorban en móvil. */
  hideOnMobile?: boolean;
  width?: string;
  /**
   * Bloque temático al que pertenece («Goles», «Resultado»…). Solo sirve para el selector de columnas: si
   * alguna columna de la tabla lo declara, aparece un desplegable para quedarse con un bloque.
   *
   * Las columnas SIN grupo se ven siempre: son las que identifican la fila (fecha, partido) y aquello por
   * lo que se ha venido a la pantalla (el pick). Un bloque nunca las esconde.
   */
  group?: string;
}

/**
 * Nombre de una columna en texto plano, para el `<option>` de ordenar en móvil.
 *
 * `header` suele ser una cadena («Fecha», «O2.5»), pero puede ser un nodo; en ese caso vale el `title`, que
 * es la explicación larga de la abreviatura, y como último recurso el id.
 */
function nombreColumna<T>(c: Column<T>): string {
  return typeof c.header === 'string' ? c.header : (c.title ?? c.id);
}

/** Clases que comparten la cabecera y las celdas: así la cabecera se alinea siempre como su columna. */
function claseColumna<T>(c: Column<T>): string {
  return `${c.numeric ? 'num' : c.align === 'center' ? 'mid' : ''} ${c.hideOnMobile ? 'hidden md:table-cell' : ''}`;
}

type Dir = 'asc' | 'desc';

/**
 * Si la pantalla es más estrecha que el `md` de Tailwind (768 px), que es donde las tablas dejan de caber.
 *
 * Se consulta en JavaScript y no con clases `hidden md:block` a propósito: así solo se dibuja una de las dos
 * versiones. Con clases, un móvil montaría además la tabla entera y un escritorio las tarjetas —con sus
 * escudos, que son peticiones de red— para esconderlas con CSS.
 */
const ESTRECHA = typeof window === 'undefined' ? null : window.matchMedia('(max-width: 767.98px)');

// Fuera del hook a propósito: creándolo dentro, cada render devolvía un `MediaQueryList` distinto y
// `useSyncExternalStore` se quedaba sin suscripción viva, así que al pasar de 375 a 1920 px la tabla seguía
// en tarjetas. Una sola consulta, compartida por todas las tablas, con `subscribe` y `getSnapshot` estables.
const suscribirAncho = (avisar: () => void) => {
  ESTRECHA?.addEventListener('change', avisar);
  return () => ESTRECHA?.removeEventListener('change', avisar);
};
const leerAncho = () => ESTRECHA?.matches ?? false;
const anchoEnServidor = () => false;

function useEsMovil(): boolean {
  return useSyncExternalStore(suscribirAncho, leerAncho, anchoEnServidor);
}

/**
 * Números de página que se enseñan: una ventana de cinco alrededor de la actual, más la primera y la
 * última. `null` es el hueco («…»). Con 295 páginas, pintarlas todas llenaría la pantalla de botones.
 *
 * La ventana se pega a los extremos en vez de encogerse: en la página 1 se ven «1 2 3 4 5 … 295», no
 * «1 2 … 295», que deja al usuario sin sitios a los que saltar.
 */
export function pageNumbers(current: number, total: number, around = 2): (number | null)[] {
  const ventana = 2 * around + 1;
  // Con pocas se enseñan todas: un hueco entre dos números seguidos ocupa más que el número.
  if (total <= ventana + 2) return Array.from({ length: total }, (_, i) => i);
  const desde = Math.max(0, Math.min(current - around, total - ventana));
  const fijas = new Set([0, total - 1]);
  for (let i = desde; i < desde + ventana; i++) if (i >= 0 && i < total) fijas.add(i);
  const orden = [...fijas].sort((a, b) => a - b);
  const out: (number | null)[] = [];
  orden.forEach((n, i) => {
    if (i > 0 && n - orden[i - 1] > 1) out.push(null);
    out.push(n);
  });
  return out;
}

/**
 * Tabla de datos de la aplicación.
 *
 * Reúne en un sitio lo que antes faltaba o estaba repetido por pantallas: ordenación, búsqueda,
 * paginación, estado de carga, estado vacío, encabezado fijo, acciones con iconos y filas que se
 * despliegan. Las páginas solo describen columnas.
 */
export function DataTable<T>({
  rows,
  columns,
  getRowId,
  onRowClick,
  rowLabel,
  isRowHighlighted,
  searchable,
  searchPlaceholder = 'Buscar…',
  pageSize = 0,
  loading = false,
  empty,
  initialSort,
  maxHeight = '70vh',
  toolbar,
  actions,
  renderDetail,
  card,
  tableId,
  exportTxt,
}: {
  rows: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Nombre de la fila para lectores de pantalla («Botafogo – Grêmio»). */
  rowLabel?: (row: T) => string;
  isRowHighlighted?: (row: T) => boolean;
  /** Texto por el que se busca. Si falta, no se muestra el buscador. */
  searchable?: (row: T) => string;
  searchPlaceholder?: string;
  /** 0 = sin paginar. */
  pageSize?: number;
  loading?: boolean;
  empty?: ReactNode;
  initialSort?: { id: string; dir: Dir };
  maxHeight?: string;
  /** Controles extra a la derecha del buscador. */
  toolbar?: ReactNode;
  /** Botones de icono de cada fila, en la última columna. */
  actions?: (row: T) => ReactNode;
  /** Detalle desplegable de una fila; `null` si esa fila no tiene. */
  renderDetail?: (row: T) => ReactNode | null;
  /**
   * Cómo se ve una fila en un móvil. Si se pasa, por debajo de `md` la tabla se cambia por esta lista.
   *
   * Una tabla ancha en un teléfono no se lee: en Proyecciones eran 988 px de tabla en 349 px de pantalla,
   * y lo que quedaba fuera era justo el contenido —goles, 1X2, BTTS y el pick—, así que la pantalla que
   * existe para enseñar proyecciones no enseñaba ninguna. Ocultar columnas con `hideOnMobile` no bastaba:
   * las siete que sobrevivían seguían sin caber.
   *
   * El buscador, la ordenación, el contador y la paginación siguen igual: solo cambia cómo se dibuja cada
   * fila. Sin esta propiedad la tabla se queda como está y se desplaza en horizontal.
   */
  card?: (row: T) => ReactNode;
  /**
   * Identifica la tabla para recordar el bloque de columnas elegido. Sin él, el selector funciona pero se
   * olvida al recargar.
   */
  tableId?: string;
  /**
   * Exportar a .txt lo que la tabla está enseñando.
   *
   * Va aquí y no en la pantalla porque los filtros de fuera son solo una parte: el buscador, la ordenación
   * y el bloque de columnas los tiene la tabla, y un botón fuera exportaría otra cosa distinta de la que se
   * está viendo. Se exportan TODAS las filas que cumplen los filtros, no solo las de la página en pantalla,
   * y el botón lleva el número para que no haya duda.
   *
   * `line` devuelve `null` para saltarse una fila (un partido sin marcador no tiene línea que escribir).
   */
  exportTxt?: { fileName: string; line: (row: T) => string | null };
}) {
  const [sort, setSort] = useState<{ id: string; dir: Dir } | null>(initialSort ?? null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [abiertas, setAbiertas] = useState<Set<string>>(() => new Set());
  // Un filtro de fuera de la tabla (competición, fecha, jornada) cambia las filas: quedarse en la
  // página 7 de un listado que ahora tiene 2 es una pantalla vacía sin explicación. Se ajusta durante
  // el render, que es lo que recomienda React para reaccionar a un cambio de props, y no en un efecto:
  // así no hay un repintado intermedio con la página vieja.
  const [filasAnteriores, setFilasAnteriores] = useState(rows);
  if (filasAnteriores !== rows) {
    setFilasAnteriores(rows);
    setPage(0);
  }
  const scroll = useRef<HTMLDivElement>(null);
  const enTarjetas = useEsMovil() && card !== undefined;

  /**
   * Bloque de columnas elegido; `''` es «todas».
   *
   * Ni las 20 columnas de Proyecciones ni las 13 de Equipos caben en ninguna pantalla: medida a 1920 px, la
   * de Proyecciones ocupa 2395 px en un hueco de 1534 y se desplaza en horizontal también en el escritorio
   * más ancho. En vez de decidir por el usuario qué dato deja de verse, se le dan bloques y él elige.
   *
   * Por defecto se ven TODAS: esto es una herramienta para estrechar, no un recorte silencioso.
   */
  const grupos = [...new Set(columns.map((c) => c.group).filter((g): g is string => !!g))];
  const clave = tableId ? `tabla-columnas-${tableId}` : null;
  const [grupo, setGrupo] = useState(() => {
    try {
      const guardado = clave && localStorage.getItem(clave);
      return guardado && grupos.includes(guardado) ? guardado : '';
    } catch {
      // Navegación privada o almacenamiento bloqueado: se ven todas, que es el valor por defecto.
      return '';
    }
  });

  const elegirGrupo = (g: string) => {
    setGrupo(g);
    // Ordenar por una columna que ya no se ve deja las filas en un orden sin explicación visible.
    if (g && sort && columns.find((c) => c.id === sort.id)?.group && columns.find((c) => c.id === sort.id)?.group !== g) setSort(null);
    try {
      if (clave) localStorage.setItem(clave, g);
    } catch {
      // El bloque vale para esta sesión.
    }
  };

  const visibles = grupo ? columns.filter((c) => !c.group || c.group === grupo) : columns;

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return rows;
    const q = query.trim().toLowerCase();
    return rows.filter((r) => searchable(r).toLowerCase().includes(q));
  }, [rows, query, searchable]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.id === sort.id);
    if (!col?.sortValue) return filtered;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = col.sortValue!(a);
      const vb = col.sortValue!(b);
      // Los datos ausentes van siempre al final: no se puede ordenar por lo que no hay.
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb), 'es') * dir;
    });
  }, [filtered, sort, columns]);

  const pages = pageSize > 0 ? Math.ceil(sorted.length / pageSize) : 1;
  const safePage = Math.min(page, Math.max(0, pages - 1));
  const visible = pageSize > 0 ? sorted.slice(safePage * pageSize, safePage * pageSize + pageSize) : sorted;

  // Al cambiar de página, la tabla vuelve arriba: si no, se ve el final de la página nueva.
  useEffect(() => {
    scroll.current?.scrollTo({ top: 0 });
  }, [safePage]);

  const toggleSort = (col: Column<T>) => {
    if (!col.sortValue) return;
    setPage(0);
    setSort((s) => (s?.id !== col.id ? { id: col.id, dir: col.numeric ? 'desc' : 'asc' } : s.dir === 'asc' ? { id: col.id, dir: 'desc' } : null));
  };

  const alternar = (id: string) =>
    setAbiertas((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const totalColumnas = visibles.length + (renderDetail ? 1 : 0) + (actions ? 1 : 0);
  const ordenables = visibles.filter((c) => c.sortValue);

  return (
    <div>
      {(searchable || toolbar || enTarjetas || grupos.length > 1 || exportTxt) && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
          {searchable && (
            <div className="relative min-w-0 flex-1 sm:max-w-72">
              <Search size={14} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-faint" />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className={`${inputClass} w-full pr-8 pl-8 [&::-webkit-search-cancel-button]:hidden`}
              />
              {query && (
                <span className="absolute top-1/2 right-0.5 -translate-y-1/2">
                  <IconButton icon={<X size={14} />} label="Borrar búsqueda" size="sm" onClick={() => setQuery('')} />
                </span>
              )}
            </div>
          )}
          {toolbar}

          {/* En tarjetas no hay columnas que enseñar u ocultar: cada tarjeta decide qué cabe. */}
          {grupos.length > 1 && !enTarjetas && (
            <select
              aria-label="Columnas"
              value={grupo}
              onChange={(e) => elegirGrupo(e.target.value)}
              className={`${inputClass} max-w-44 min-w-0`}
              title="Con qué bloque de columnas quedarse. Las de fecha, partido y pick se ven siempre."
            >
              <option value="">Todas las columnas</option>
              {grupos.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          )}

          {/*
           * En tarjetas no hay cabeceras que pulsar, así que la ordenación se perdería justo donde más
           * falta: en Proyecciones solo 37 de 542 partidos tienen pick, y sin ordenar por él hay que
           * pasar 55 páginas para encontrarlos.
           */}
          {enTarjetas && ordenables.length > 0 && (
            <select
              aria-label="Ordenar por"
              value={sort ? `${sort.id}:${sort.dir}` : ''}
              onChange={(e) => {
                const [id, dir] = e.target.value.split(':');
                setPage(0);
                setSort(id ? { id, dir: dir as Dir } : null);
              }}
              className={`${inputClass} max-w-44 min-w-0`}
            >
              <option value="">Sin ordenar</option>
              {ordenables.map((c) => (
                <Fragment key={c.id}>
                  <option value={`${c.id}:desc`}>{nombreColumna(c)} ↓</option>
                  <option value={`${c.id}:asc`}>{nombreColumna(c)} ↑</option>
                </Fragment>
              ))}
            </select>
          )}

          {exportTxt && (
            <Button
              size="sm"
              onClick={() => {
                const lineas = sorted.map(exportTxt.line).filter((l): l is string => l !== null);
                descargarTexto(exportTxt.fileName, lineas.join('\n'));
              }}
              disabled={sorted.length === 0}
              title="Guarda en un .txt las filas que cumplen los filtros de ahora mismo, en el orden en que están"
            >
              <Download size={14} aria-hidden /> Exportar
              <span className="rounded-pill bg-current/15 px-1.5 text-[11px] tabular-nums">{sorted.length}</span>
            </Button>
          )}

          <span className="ml-auto text-[12px] text-faint tabular-nums" aria-live="polite">
            {sorted.length}
            {sorted.length !== rows.length && ` de ${rows.length}`} {sorted.length === 1 ? 'fila' : 'filas'}
          </span>
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={8} cols={Math.min(visibles.length, 6)} />
      ) : visible.length === 0 ? (
        query.trim() ? (
          <Empty icon={<SearchX />} title="Sin resultados" action={<Button size="sm" onClick={() => setQuery('')}>Borrar búsqueda</Button>}>
            Ninguna fila contiene «{query.trim()}».
          </Empty>
        ) : (
          <Empty>{empty ?? 'Sin resultados con estos filtros.'}</Empty>
        )
      ) : enTarjetas ? (
        // Misma caja que la tabla: hereda el `maxHeight` y el volver arriba al cambiar de página.
        <div ref={scroll} className="overflow-auto overscroll-x-contain" style={{ maxHeight }}>
          <ul className="grid gap-2 p-3 sm:grid-cols-2">
            {visible.map((row) => (
              <li key={getRowId(row)} className="flex min-w-0 flex-col gap-1">
                {card!(row)}
                {/* Fuera de la tarjeta: muchas son un enlace entero y un botón dentro de otro no es válido. */}
                {actions && <div className="flex items-center justify-end gap-0.5">{actions(row)}</div>}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div ref={scroll} className="overflow-auto overscroll-x-contain" style={{ maxHeight }}>
          <table className="data">
            <thead>
              <tr>
                {renderDetail && (
                  <th scope="col" className="w-px">
                    <span className="sr-only">Detalle</span>
                  </th>
                )}
                {visibles.map((c) => {
                  const on = sort?.id === c.id;
                  const cabecera = c.title ? (
                    <Tooltip content={c.title} placement="top">
                      <span className="underline decoration-border-strong decoration-dotted underline-offset-3">{c.header}</span>
                    </Tooltip>
                  ) : (
                    c.header
                  );
                  return (
                    <th
                      key={c.id}
                      scope="col"
                      style={c.width ? { width: c.width } : undefined}
                      className={claseColumna(c)}
                      aria-sort={on ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    >
                      {c.sortValue ? (
                        // `min-h-6`: el botón medía 17 px de alto y WCAG 2.2 pide 24×24 (criterio 2.5.8, nivel AA).
                        // Con 20 columnas ordenables eran 19 objetivos por debajo del mínimo en una sola pantalla.
                        <button
                          type="button"
                          onClick={() => toggleSort(c)}
                          className={`group -mx-1 inline-flex min-h-6 items-center gap-1 rounded px-1 uppercase transition-colors hover:text-text ${c.numeric ? 'flex-row-reverse' : ''} ${
                            on ? 'text-accent-text' : ''
                          }`}
                        >
                          {cabecera}
                          {on ? (
                            sort!.dir === 'asc' ? (
                              <ArrowUp size={12} aria-hidden />
                            ) : (
                              <ArrowDown size={12} aria-hidden />
                            )
                          ) : (
                            <ArrowUpDown size={12} aria-hidden className="opacity-0 transition-opacity group-hover:opacity-60 group-focus-visible:opacity-60" />
                          )}
                        </button>
                      ) : (
                        cabecera
                      )}
                    </th>
                  );
                })}
                {actions && (
                  <th scope="col" className="actions">
                    <span className="sr-only">Acciones</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const id = getRowId(row);
                const detalle = renderDetail?.(row) ?? null;
                const abierta = detalle !== null && abiertas.has(id);
                return (
                  <Fragment key={id}>
                    <tr
                      data-highlight={isRowHighlighted?.(row) ? 'true' : undefined}
                      data-clickable={onRowClick ? 'true' : undefined}
                      data-expanded={abierta ? 'true' : undefined}
                      aria-label={onRowClick ? rowLabel?.(row) : undefined}
                      tabIndex={onRowClick ? 0 : undefined}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      onKeyDown={
                        onRowClick
                          ? (e) => {
                              if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                                e.preventDefault();
                                onRowClick(row);
                              }
                            }
                          : undefined
                      }
                    >
                      {renderDetail && (
                        <td className="w-px pr-0">
                          {detalle !== null && (
                            <IconButton
                              icon={<ChevronDown size={16} className={`transition-transform ${abierta ? 'rotate-180' : ''}`} />}
                              label={abierta ? 'Ocultar detalle' : 'Ver detalle'}
                              size="sm"
                              expanded={abierta}
                              onClick={() => alternar(id)}
                            />
                          )}
                        </td>
                      )}
                      {visibles.map((c) => (
                        <td key={c.id} className={claseColumna(c)}>
                          {c.cell(row)}
                        </td>
                      ))}
                      {actions && (
                        <td className="actions">
                          <span className="flex items-center justify-end gap-0.5">{actions(row)}</span>
                        </td>
                      )}
                    </tr>
                    {abierta && (
                      <tr className="detail">
                        <td colSpan={totalColumnas} className="px-4 py-3">
                          {detalle}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav
          aria-label="Paginación"
          className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-2 text-[12px] text-muted"
        >
          <span className="tabular-nums" aria-live="polite">
            {safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, sorted.length)} de {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <IconButton
              icon={<ChevronLeft size={16} />}
              label="Página anterior"
              size="sm"
              disabled={safePage === 0}
              disabledReason="Ya estás en la primera página"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            />
            {pageNumbers(safePage, pages).map((n, i) =>
              n === null ? (
                <span key={`hueco-${i}`} className="px-1 text-faint" aria-hidden>
                  …
                </span>
              ) : (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  aria-label={`Página ${n + 1}`}
                  aria-current={n === safePage ? 'page' : undefined}
                  className={`min-w-7 rounded-control px-2 py-1 tabular-nums transition-colors ${
                    n === safePage ? 'bg-accent font-semibold text-accent-fg' : 'hover:bg-surface-2 hover:text-text'
                  }`}
                >
                  {n + 1}
                </button>
              ),
            )}
            <IconButton
              icon={<ChevronRight size={16} />}
              label="Página siguiente"
              size="sm"
              disabled={safePage >= pages - 1}
              disabledReason="Ya estás en la última página"
              onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
            />
          </div>
        </nav>
      )}

    </div>
  );
}
