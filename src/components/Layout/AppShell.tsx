/**
 * El armazón de la aplicación: barra de contexto arriba, riel de modos a la izquierda, superficie de
 * trabajo en el centro.
 *
 * Sustituye a `AppLayout`, que era un riel de CATORCE enlaces planos más una cabecera de cromo. Los
 * problemas de aquello, medidos y no intuidos:
 *   - catorce destinos al mismo nivel: «Tickets» pesaba lo mismo que «Resumen», y nada decía en qué
 *     estabas trabajando;
 *   - el panel se desplegaba al pasar el cursor, que en tactil no existe;
 *   - las migas de pan vivian en la cabecera con `hidden md:block`: en movil, el sitio donde mas falta
 *     hacen, no se veian nunca.
 *
 * Lo que hay ahora son DOS niveles: el modo (que estas haciendo) y, dentro, sus pantallas como pestañas.
 * Lo que la lista resolvia por fuerza bruta lo resuelve la paleta (⌘K), que ademas busca competiciones y
 * equipos, no solo pantallas.
 *
 * Las reglas de negocio no se tocan: los mismos hooks, los mismos filtros, las mismas rutas.
 */
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Activity, CalendarClock, Command, Monitor, Moon, RefreshCw, Search, Settings, Sun, Wallet } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useTheme, useThemeSync, type ThemeChoice } from '../../store/useTheme';
import { useFiltersInUrl } from '../../store/useFiltersInUrl';
import { Button, IconButton, PageSkeleton, SegmentedControl } from '../ui';
import { Tooltip } from '../Tooltip';
import { Toaster } from '../Toast';
import { usePickSettlement } from '../Betting/useFixtureData';
import { formatCoins, formatSc } from '../../domain/betting/coins';
import { useActiveProfile, useBetting } from '../../store/useBetting';
import { bankrollOf } from '../../domain/betting/wallet';
import { CommandPalette } from './CommandPalette';
import { MODOS, modoDe } from './navegacion';

const THEME_OPTIONS: { value: ThemeChoice; label: React.ReactNode; title: string }[] = [
  { value: 'light', label: <Sun size={14} />, title: 'Tema claro' },
  { value: 'system', label: <Monitor size={14} />, title: 'Tema del sistema' },
  { value: 'dark', label: <Moon size={14} />, title: 'Tema oscuro' },
];

export function AppShell() {
  const { pathname } = useLocation();
  const [paleta, setPaleta] = useState(false);
  const [theme, setTheme] = useTheme();
  useThemeSync();
  useFiltersInUrl();
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

  // Los datos llegan de la base local sin bloquear la carga: hasta tenerlos no se enseña una app vacía.
  const listo = useSyncExternalStore(
    (aviso) => useStore.persist.onFinishHydration(aviso),
    () => useStore.persist.hasHydrated(),
  );
  const busy = status !== 'idle' || statsBusyId !== null || !listo;

  const modo = modoDe(pathname) ?? MODOS[0];

  // ⌘K en Mac, Ctrl+K en el resto. La paleta es la navegacion principal: tiene que abrirse sin el raton.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaleta((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="min-h-screen bg-canvas">
      <a
        href="#contenido"
        className="sr-only z-[100] rounded-control bg-accent px-3 py-2 text-[13px] font-medium text-accent-fg focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Saltar al contenido
      </a>

      {/* ───────────────────────── BARRA DE CONTEXTO ───────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur">
        <div className="flex min-h-12 items-center gap-2 px-3 lg:px-4">
          <Link to="/" className="flex shrink-0 items-center gap-2 rounded-control" title="Análisis de Fútbol">
            <span className="flex h-7 w-7 items-center justify-center rounded-control bg-accent text-accent-fg">
              <Activity size={16} strokeWidth={2.5} aria-hidden />
            </span>
            <span className="hidden font-display text-[13px] font-semibold tracking-tight sm:block">Análisis de Fútbol</span>
          </Link>

          {/*
            * El ámbito, solo en escritorio. En móvil lo mismo se elige desde «Filtros», dentro de cada
            * pantalla: tenerlo también aquí era repetir el control en una barra donde el espacio es lo
            * que falta.
            */}
          <span className="mx-1 hidden h-5 w-px bg-border lg:block" aria-hidden />
          <select
            value={filters.leagueId ?? ''}
            onChange={(e) => setFilters({ leagueId: e.target.value || null, teamId: null })}
            aria-label="Competición"
            className="toque-alto hidden min-h-8 max-w-[11rem] min-w-0 rounded-control border border-border bg-surface px-2 py-1 text-[12px] transition-colors hover:border-border-strong focus:border-accent focus:ring-3 focus:ring-accent/20 focus:outline-none lg:block"
          >
            <option value="">Todas las competiciones</option>
            {leagues.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>

          {/* `ml-auto` aquí y no en el primer botón: así la derecha no se descoloca cuando alguno se oculta. */}
          <div className="ml-auto flex items-center gap-2">
            {/*
              * La paleta, con su atajo a la vista: si no se ve, nadie la descubre. En móvil no está aquí
              * porque ya tiene su sitio en la barra inferior, al alcance del pulgar.
              */}
            <button
              type="button"
              onClick={() => setPaleta(true)}
              className="toque-alto hidden min-h-8 items-center gap-2 rounded-control border border-border-strong bg-surface px-2.5 text-[12px] text-muted transition-colors hover:bg-surface-2 hover:text-text lg:flex"
              aria-label="Buscar o ir a (Control+K)"
            >
              <Search size={14} aria-hidden />
              <span>Buscar…</span>
              <kbd className="flex items-center gap-0.5 rounded border border-border px-1 text-[10px] text-faint">
                <Command size={9} aria-hidden /> K
              </kbd>
            </button>

          {bettingReady && (
            <Tooltip content={`Bankroll virtual de ${profile.name}: ${formatSc(bankrollOf(profile), profile.settings.currencyCode)}. Moneda interna, sin valor real.`}>
              <Link
                to="/bankroll"
                className="toque-alto hidden min-h-8 items-center gap-1.5 rounded-control border border-border px-2.5 text-[12px] font-medium tabular-nums transition-colors hover:border-border-strong hover:bg-surface-2 sm:flex"
              >
                <Wallet size={13} className="text-faint" aria-hidden />
                {formatCoins(bankrollOf(profile), profile.settings.coinValue)}
              </Link>
            </Tooltip>
          )}

          <SegmentedControl options={THEME_OPTIONS} value={theme} onChange={setTheme} size="sm" label="Tema" />

          <IconButton icon={<Settings size={16} />} label="Configuración" to="/configuracion" />

          {filters.leagueId && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => void refreshLeagueWithStats(filters.leagueId!)}
              disabled={busy}
              loading={status === 'syncing'}
              title="Trae los partidos de esta competición desde su fuente oficial, con corners, tiros, tarjetas y posesión de cada uno"
            >
              {status !== 'syncing' && <RefreshCw size={13} aria-hidden />}
              <span className="hidden lg:inline">Actualizar</span>
            </Button>
          )}
          </div>
        </div>

        {/* ──────────────── PESTAÑAS DEL MODO: el segundo nivel ──────────────── */}
        <nav aria-label={`Pantallas de ${modo.label}`} className="tira-filtros border-t border-border px-3 py-1.5 lg:px-4">
          {modo.destinos.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `toque-alto flex min-h-8 items-center gap-1.5 rounded-pill px-3 text-[13px] font-medium transition-colors ${
                  isActive ? 'bg-accent text-accent-fg' : 'text-muted hover:bg-surface-2 hover:text-text'
                }`
              }
            >
              <Icon size={14} aria-hidden />
              {label}
            </NavLink>
          ))}
          <span className="ml-auto hidden max-w-56 truncate pl-3 text-[11px] text-faint xl:block" aria-live="polite">
            {statusMessage ?? (listo ? `${matches} partidos` : 'Cargando…')}
          </span>
          {lastUpdate && !statusMessage && (
            <span className="hidden items-center gap-1 text-[11px] text-faint 2xl:flex">
              <CalendarClock size={11} aria-hidden />
              {new Date(lastUpdate).toLocaleDateString('es-ES')}
            </span>
          )}
        </nav>

        {busy && (
          <div className="h-0.5 overflow-hidden bg-accent-soft" role="progressbar" aria-label="Cargando datos">
            <div className="h-full w-1/3 animate-[shimmer_1.2s_infinite] bg-accent" />
          </div>
        )}
      </header>

      <div className="flex">
        {/* ───────────────────── RIEL DE MODOS: el primer nivel ───────────────────── */}
        <nav
          aria-label="Modos"
          className="sticky top-[5.25rem] hidden h-[calc(100vh-5.25rem)] w-[5.5rem] shrink-0 flex-col gap-1 border-r border-border bg-surface p-2 lg:flex"
        >
          {MODOS.map((m) => {
            const activo = m.id === modo.id;
            const Icono = m.icon;
            return (
              <Link
                key={m.id}
                to={m.destinos[0].to}
                aria-current={activo ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 rounded-card px-1 py-2.5 text-[11px] font-medium transition-colors ${
                  activo ? 'bg-accent-soft text-accent-text' : 'text-muted hover:bg-surface-2 hover:text-text'
                }`}
              >
                <Icono size={18} className={activo ? 'text-accent' : 'text-faint'} aria-hidden />
                {m.label}
              </Link>
            );
          })}
        </nav>

        <main id="contenido" tabIndex={-1} className="min-w-0 flex-1 p-3 pb-24 outline-none sm:p-4 lg:p-6 lg:pb-10">
          <div className="mx-auto max-w-[96rem]">{listo ? <Outlet /> : <PageSkeleton />}</div>
        </main>
      </div>

      {/* ──────────────── En movil, los modos al alcance del pulgar ──────────────── */}
      <nav
        aria-label="Modos"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {MODOS.map((m) => {
          const activo = m.id === modo.id;
          const Icono = m.icon;
          return (
            <Link
              key={m.id}
              to={m.destinos[0].to}
              aria-current={activo ? 'page' : undefined}
              className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                activo ? 'text-accent-text' : 'text-muted'
              }`}
            >
              <Icono size={18} aria-hidden />
              {m.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setPaleta(true)}
          aria-label="Buscar o ir a"
          className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-muted"
        >
          <Search size={18} aria-hidden />
          Buscar
        </button>
      </nav>

      <CommandPalette abierta={paleta} cerrar={() => setPaleta(false)} />
      <Toaster />
    </div>
  );
}
