import { useEffect, useState, useSyncExternalStore } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Activity,
  Award,
  BarChart3,
  Calculator,
  CalendarClock,
  FlaskConical,
  ChevronRight,
  Layers,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  ListChecks,
  Menu,
  Monitor,
  Moon,
  MoreHorizontal,
  RefreshCw,
  Settings,
  Sun,
  Table2,
  Target,
  Trophy,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useTheme, useThemeSync, type ThemeChoice } from '../../store/useTheme';
import { useFiltersInUrl } from '../../store/useFiltersInUrl';
import { Button, IconButton, PageSkeleton, SegmentedControl } from '../ui';
import { Tooltip } from '../Tooltip';
import { Toaster } from '../Toast';
import { LeagueLabel } from '../LeagueLabel';
import { usePickSettlement } from '../Betting/useFixtureData';
import { formatCoins, formatSc } from '../../domain/betting/coins';
import { useActiveProfile, useBetting } from '../../store/useBetting';
import { bankrollOf } from '../../domain/betting/wallet';

/**
 * Navegación agrupada por intención, no por hoja de Excel:
 *  - Resumen: por dónde se empieza.
 *  - Datos: lo que ya ocurrió.
 *  - Predicción: lo que el modelo estima.
 *  - Simulación: picks y bankroll con moneda virtual.
 */
const NAV = [
  {
    group: 'Resumen',
    items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    group: 'Datos',
    items: [
      { to: '/ligas', label: 'Competiciones', icon: Trophy },
      { to: '/partidos', label: 'Partidos', icon: Table2 },
      { to: '/equipos', label: 'Equipos', icon: Users },
    ],
  },
  {
    group: 'Predicción',
    items: [
      { to: '/proyecciones', label: 'Proyecciones', icon: Target },
      // Detrás de Proyecciones porque es su destilado: de los 542 pendientes, los que tienen pick.
      { to: '/oportunidades', label: 'Oportunidades', icon: Award },
      { to: '/modelos', label: 'Modelos', icon: FlaskConical },
      { to: '/proyeccion-temporada', label: 'Fin de temporada', icon: BarChart3 },
    ],
  },
  {
    group: 'Simulación',
    items: [
      { to: '/picks', label: 'Evaluador de picks', icon: Calculator },
      { to: '/tickets', label: 'Tickets', icon: Layers },
      { to: '/bankroll', label: 'Bankroll', icon: Wallet },
      { to: '/rendimiento', label: 'Rendimiento', icon: Activity },
      { to: '/historial', label: 'Historial y backtesting', icon: ListChecks },
    ],
  },
  {
    group: null,
    items: [{ to: '/configuracion', label: 'Configuración', icon: Settings }],
  },
] as const;

/** Barra inferior en móvil: los cuatro destinos más usados y «Más», que abre el menú completo. */
const MOBILE_NAV = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/partidos', label: 'Partidos', icon: Table2 },
  { to: '/proyecciones', label: 'Proyecciones', icon: Target },
  { to: '/oportunidades', label: 'Oportunidades', icon: Award },
] as const;

const THEME_OPTIONS: { value: ThemeChoice; label: React.ReactNode; title: string }[] = [
  { value: 'light', label: <Sun size={14} />, title: 'Tema claro' },
  { value: 'system', label: <Monitor size={14} />, title: 'Tema del sistema' },
  { value: 'dark', label: <Moon size={14} />, title: 'Tema oscuro' },
];

/** Migas: sitúan al usuario dentro de una ficha sin obligarle a volver al listado. */
function Breadcrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.split('/').filter(Boolean);
  const leaf = parts[1] ? decodeURIComponent(parts[1]) : '';
  const fixture = useStore((s) => (parts[0] === 'proyecciones' ? s.fixtures.find((f) => f.id === leaf) : undefined));
  if (parts.length < 2) return null;

  const roots: Record<string, string> = {
    ligas: 'Competiciones',
    partidos: 'Partidos',
    equipos: 'Equipos',
    proyecciones: 'Proyecciones',
  };
  const root = parts[0];
  if (!roots[root]) return null;

  const label =
    root === 'equipos'
      ? leaf.split('|')[1]
      : root === 'proyecciones'
        ? fixture
          ? `${fixture.homeTeamName} – ${fixture.awayTeamName}`
          : 'Partido'
        : leaf;

  return (
    <nav aria-label="Ruta" className="flex min-w-0 items-center gap-1 text-[12px] text-muted">
      <Link to={`/${root}`} className="shrink-0 rounded hover:text-text">
        {roots[root]}
      </Link>
      <ChevronRight size={12} className="shrink-0 text-faint" aria-hidden />
      <span className="truncate font-medium text-text" aria-current="page">
        {label}
      </span>
    </nav>
  );
}

/**
 * Un elemento del menú. El activo no se pinta de azul entero: lleva el riel de acento a la izquierda, el
 * icono en acento y el texto en el color normal. Un bloque de color sólido en el menú compite con el
 * contenido, que es lo que de verdad hay que mirar.
 */
const navClase =
  (colapsado: boolean) =>
  ({ isActive }: { isActive: boolean }) =>
    // `min-h-11 lg:min-h-0`: 44 px para el dedo en el cajón del móvil, que es la navegación principal del
    // teléfono. En escritorio manda el `py-2` de siempre, porque con ratón 36 px sobran y 44 separaría
    // tanto los quince destinos que no cabrían sin scroll.
    `group relative mb-0.5 flex min-h-11 items-center rounded-control py-2 text-[13px] transition-colors lg:min-h-0 ${
      // Contraído es cosa de escritorio: en el cajón del móvil el nombre se lee entero.
      colapsado ? 'gap-2.5 px-3 lg:justify-center lg:gap-0 lg:px-0' : 'gap-2.5 px-3'
    } ${
      isActive
        ? 'bg-surface-2 font-medium text-text before:absolute before:inset-y-1.5 before:-left-2 before:w-[3px] before:rounded-r-full before:bg-accent [&_svg]:text-accent'
        : 'text-muted hover:bg-surface-2 hover:text-text [&_svg]:text-faint hover:[&_svg]:text-muted'
    }`;

export function AppLayout() {
  const [open, setOpen] = useState(false);

  /*
   * El menú de escritorio arranca SIEMPRE contraído y se abre al pasarle el cursor por encima.
   *
   * `encima` no cambia el hueco que ocupa el menú: el panel se superpone al contenido. Si al pasar el
   * cursor el menú empujara la página, cada entrada y salida reharía la maquetación entera —en esta
   * máquina, de dos núcleos, se nota— y el contenido daría un salto lateral cada vez.
   *
   * `fijado` lo deja abierto con el botón del pie, y entonces sí ensancha el hueco. Hace falta porque en
   * una pantalla táctil no existe «pasar por encima»: sin él, en una tableta no habría forma de leer los
   * nombres. Ahí sí empuja, porque es un menú abierto a propósito y no una ayuda de un segundo.
   */
  const [fijado, setFijado] = useState(false);
  const [encima, setEncima] = useState(false);
  const colapsado = !fijado && !encima;
  /** Superpuesto: solo cuando lo abre el cursor, nunca cuando está fijado. */
  const flotando = encima && !fijado;
  const [theme, setTheme] = useTheme();
  useThemeSync();
  // Los filtros viajan en la dirección: recargar, compartir un enlace y el botón atrás funcionan.
  useFiltersInUrl();
  // Los picks pendientes se liquidan solos en cuanto llegan resultados reales.
  usePickSettlement();
  const bettingReady = useBetting((s) => s.hydrated);
  const profile = useActiveProfile();

  const status = useStore((s) => s.status);
  const statusMessage = useStore((s) => s.statusMessage);
  const lastUpdate = useStore((s) => s.lastUpdate);
  const refreshLeagueWithStats = useStore((s) => s.refreshLeagueWithStats);
  const statsBusyId = useStore((s) => s.statsBusyId);
  const matches = useStore((s) => s.matches.length);
  const leagues = useStore((s) => s.leagues);
  const filters = useStore((s) => s.filters);
  const setFilters = useStore((s) => s.setFilters);

  // Los datos llegan de la base de datos local sin bloquear la carga: hasta tenerlos no se enseña una app vacía ni se
  // puede actualizar encima de ella.
  const datosListos = useSyncExternalStore(
    (aviso) => useStore.persist.onFinishHydration(aviso),
    () => useStore.persist.hasHydrated(),
  );
  const busy = status !== 'idle' || statsBusyId !== null || !datosListos;

  // En móvil el menú es un panel encima de la página: Escape lo cierra, como un diálogo.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="min-h-screen lg:flex">
      <a
        href="#contenido"
        className="sr-only z-[100] rounded-control bg-accent px-3 py-2 text-[13px] font-medium text-accent-fg focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Saltar al contenido
      </a>

      {/* Velo del panel lateral en móvil */}
      {open && <div aria-hidden onClick={() => setOpen(false)} className="fixed inset-0 z-30 animate-[fade-in_150ms] bg-black/40 lg:hidden" />}

      <aside
        aria-label="Menú principal"
        // El cursor entra y sale del `aside`; el panel que se superpone es hijo suyo, así que moverse dentro
        // de la parte que sobresale no cuenta como salir.
        onMouseEnter={() => setEncima(true)}
        onMouseLeave={() => setEncima(false)}
        // Y con el teclado igual: tabulando por el menú también se ven los nombres. `onFocus`/`onBlur` de
        // React son `focusin`/`focusout`, así que valen para los hijos.
        onFocus={() => setEncima(true)}
        onBlur={() => setEncima(false)}
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-border bg-surface transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          fijado ? 'lg:w-60' : 'lg:w-[4.5rem]'
        } ${open ? 'translate-x-0 shadow-pop' : '-translate-x-full'}`}
      >
        {/* El panel. Superpuesto cuando lo abre el cursor, para no mover el contenido de sitio. */}
        {/*
          * Al pasar el cursor, el panel APARECE; no se estira.
          *
          * Antes se animaba el ancho del `aside` de 4,5 a 15 rem, y animar el ancho obliga al navegador a
          * recalcular la maquetacion en cada fotograma: en esta maquina de dos nucleos eso es un tiron, no
          * una transicion. Ahora el ancho cambia de golpe y lo que se anima son `opacity` y `transform`,
          * que van en la capa de composicion y no tocan la maquetacion.
          *
          * `motion-reduce`: quien pide menos movimiento ve el panel aparecer sin desplazamiento.
          */}
        <div
          className={`flex min-h-0 flex-1 flex-col lg:transition-[opacity,transform] lg:duration-150 lg:ease-out motion-reduce:lg:transition-none ${
            flotando
              ? 'lg:absolute lg:inset-y-0 lg:left-0 lg:w-60 lg:translate-x-0 lg:border-r lg:border-border lg:bg-surface lg:opacity-100 lg:shadow-pop'
              : ''
          }`}
        >
        <div className={`flex items-center justify-between border-b border-border py-3.5 ${colapsado ? 'lg:justify-center lg:px-0' : ''} px-4`}>
          <Link to="/" className="flex min-w-0 items-center gap-2.5 rounded-control" onClick={() => setOpen(false)} title="Análisis de Fútbol">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-accent text-accent-fg shadow-sm">
              <Activity size={17} strokeWidth={2.4} aria-hidden />
            </span>
            <span className={`min-w-0 ${colapsado ? 'lg:hidden' : ''}`}>
              <span className="block truncate font-display text-[14px] font-semibold tracking-tight">Análisis de Fútbol</span>
              <span className="block text-[11px] text-faint">Temporada 2026/27</span>
            </span>
          </Link>
          <span className="lg:hidden">
            <IconButton icon={<X size={18} />} label="Cerrar menú" onClick={() => setOpen(false)} />
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pt-2 pb-24 lg:pb-4">
          {NAV.map((section, i) => (
            <div key={i} className="mb-3">
              {section.group &&
                (colapsado ? (
                  <>
                    {/* Contraído no cabe el rótulo, pero la separación sí hace falta. En móvil cabe. */}
                    <div className="t-label px-3 pt-2 pb-1.5 text-[10px] text-faint lg:hidden">{section.group}</div>
                    <div className="mx-3 mt-2 mb-1.5 hidden border-t border-border lg:block" aria-hidden />
                  </>
                ) : (
                  <div className="t-label px-3 pt-2 pb-1.5 text-[10px] text-faint">{section.group}</div>
                ))}
              {section.items.map(({ to, label, icon: Icon, ...rest }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={'end' in rest ? rest.end : undefined}
                  // En móvil el panel tapa la página de destino: se cierra al navegar.
                  onClick={() => setOpen(false)}
                  className={navClase(colapsado)}
                  // Contraído, el nombre solo lo dice el `title`: sin él el menú sería ilegible.
                  title={colapsado ? label : undefined}
                >
                  <Icon size={16} className="shrink-0" aria-hidden />
                  <span className={colapsado ? 'lg:hidden' : ''}>{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {bettingReady && (
          <Link
            to="/bankroll"
            onClick={() => setOpen(false)}
            className={`m-2 flex items-center rounded-card border border-border bg-surface-2 py-2.5 transition-colors hover:border-border-strong ${
              colapsado ? 'gap-2.5 px-3 lg:justify-center lg:gap-0 lg:px-0' : 'gap-2.5 px-3'
            }`}
            title={colapsado ? `Bankroll virtual · ${profile.name}` : undefined}
          >
            <Wallet size={16} className="shrink-0 text-faint" aria-hidden />
            <span className={`min-w-0 ${colapsado ? 'lg:hidden' : ''}`}>
              <span className="t-label block truncate text-[10px] text-faint">Bankroll virtual · {profile.name}</span>
              <span className="block font-display text-[14px] font-semibold tabular-nums">{formatCoins(bankrollOf(profile), profile.settings.coinValue)}</span>
            </span>
          </Link>
        )}

        {/*
          * Dejar el menú abierto. Solo en escritorio: en móvil ya se abre y se cierra entero.
          *
          * Sigue aquí aunque el cursor abra el menú solo, porque en una pantalla táctil no hay cursor y con
          * el teclado tampoco: sin este botón no habría forma de ver los nombres.
          */}
        <button
          type="button"
          onClick={() => setFijado((v) => !v)}
          aria-expanded={fijado}
          aria-label={fijado ? 'Contraer el menú a iconos' : 'Dejar el menú abierto'}
          title={fijado ? 'Contraer el menú' : 'Dejar el menú abierto'}
          className={`mx-2 mb-2 hidden min-h-9 items-center rounded-control text-[12px] text-muted transition-colors hover:bg-surface-2 hover:text-text lg:flex ${
            colapsado ? 'justify-center px-0' : 'gap-2.5 px-3'
          }`}
        >
          {fijado ? <PanelLeftClose size={16} aria-hidden /> : <PanelLeftOpen size={16} aria-hidden />}
          <span className={colapsado ? 'hidden' : ''}>{fijado ? 'Contraer' : 'Dejar abierto'}</span>
        </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur">
          <div className="flex min-h-14 items-center gap-2 px-3 py-2 sm:px-4">
            <span className="lg:hidden">
              <IconButton icon={<Menu size={18} />} label="Abrir menú" expanded={open} onClick={() => setOpen(true)} />
            </span>

            {/* Contexto: la competición es el filtro que manda, así que vive en el chrome. */}
            <div className="hidden min-w-0 items-center gap-2 sm:flex">
              <select
                value={filters.leagueId ?? ''}
                onChange={(e) => setFilters({ leagueId: e.target.value || null, teamId: null })}
                aria-label="Competición"
                className="min-h-8 max-w-52 rounded-control border border-border bg-surface px-2 py-1.5 text-[13px] transition-colors hover:border-border-strong focus:border-accent focus:ring-3 focus:ring-accent/20 focus:outline-none"
              >
                <option value="">Todas las competiciones</option>
                {leagues.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              {filters.leagueId && <LeagueLabel leagueId={filters.leagueId} size="sm" className="hidden md:flex" />}
            </div>

            <div className="mx-1 hidden min-w-0 flex-1 md:block">
              <Breadcrumbs />
            </div>

            <div className="ml-auto flex items-center gap-2">
              <span className="hidden max-w-64 truncate text-[12px] text-muted xl:block" aria-live="polite">
                {statusMessage ?? (datosListos ? `${matches} partidos cargados` : 'Cargando datos…')}
              </span>
              {lastUpdate && !statusMessage && (
                <Tooltip content="Última actualización de datos">
                  <span className="hidden items-center gap-1 text-[12px] text-faint 2xl:flex">
                    <CalendarClock size={12} aria-hidden />
                    {new Date(lastUpdate).toLocaleDateString('es-ES')}
                  </span>
                </Tooltip>
              )}

              {bettingReady && (
                <Tooltip content={`Bankroll virtual de ${profile.name}: ${formatSc(bankrollOf(profile), profile.settings.currencyCode)}. Moneda interna, sin valor real.`}>
                  <Link
                    to="/bankroll"
                    className="hidden min-h-8 items-center gap-1.5 rounded-control border border-border px-2.5 py-1 text-[12px] font-medium tabular-nums transition-colors hover:border-border-strong hover:bg-surface-2 md:flex"
                  >
                    <Wallet size={13} className="text-faint" aria-hidden />
                    {formatCoins(bankrollOf(profile), profile.settings.coinValue)}
                  </Link>
                </Tooltip>
              )}

              <SegmentedControl options={THEME_OPTIONS} value={theme} onChange={setTheme} size="sm" label="Tema" />

              {/* Solo con una competición elegida. Las 23 a la vez siguen en Configuración. */}
              {filters.leagueId && (
                <Button
                  variant="primary"
                  onClick={() => void refreshLeagueWithStats(filters.leagueId!)}
                  disabled={busy}
                  loading={status === 'syncing'}
                  title="Trae los partidos de esta competición desde su fuente oficial, con corners, tiros, tarjetas y posesión de cada uno"
                >
                  {status !== 'syncing' && <RefreshCw size={14} aria-hidden />}
                  <span className="hidden sm:inline">Actualizar partidos</span>
                  <span className="sr-only sm:hidden">Actualizar partidos</span>
                </Button>
              )}
            </div>
          </div>

          {/* En móvil el mensaje no cabe arriba: va en su propia línea. */}
          {statusMessage && <div className="truncate border-t border-border px-3 py-1.5 text-[12px] text-muted xl:hidden">{statusMessage}</div>}
          {busy && (
            <div className="h-0.5 overflow-hidden bg-accent-soft" role="progressbar" aria-label="Cargando datos">
              <div className="h-full w-1/3 animate-[shimmer_1.2s_infinite] bg-accent" />
            </div>
          )}
        </header>

        <main id="contenido" tabIndex={-1} className="min-w-0 flex-1 p-3 pb-24 outline-none sm:p-4 sm:pb-24 lg:p-6 lg:pb-8">
          <div className="mx-auto max-w-[96rem]">
            {datosListos ? <Outlet /> : <PageSkeleton />}
          </div>
        </main>
      </div>

      {/* Barra inferior: en móvil el pulgar llega aquí, no al menú lateral. */}
      <nav aria-label="Navegación rápida" className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {MOBILE_NAV.map(({ to, label, icon: Icon, ...rest }) => (
          <NavLink
            key={to}
            to={to}
            end={'end' in rest ? rest.end : undefined}
            className={({ isActive }) =>
              `flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${isActive ? 'text-accent-text' : 'text-muted hover:text-text'}`
            }
          >
            <Icon size={18} aria-hidden />
            {label}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-muted transition-colors hover:text-text"
        >
          <MoreHorizontal size={18} aria-hidden />
          Más
        </button>
      </nav>

      <Toaster />
    </div>
  );
}
