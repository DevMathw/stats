import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Loader2, RefreshCw, X } from 'lucide-react';
import { NA } from '../utils/format';
import { InfoTip } from './InfoTip';
import { Tooltip, useTooltip } from './Tooltip';

/* ==========================================================================
   Primitivas. Todo el color sale de los tokens de index.css: ninguna clase
   de color literal en este archivo ni en los que lo usan.
   ========================================================================== */

/**
 * Tono de una tarjeta. No es decoración: dice de dónde viene lo que hay dentro.
 *   default  datos observados
 *   ai       lo ha estimado un modelo, no ha pasado
 *   accent   lo que la pantalla quiere que mires primero
 */
export type CardTone = 'default' | 'ai' | 'accent';

const CARD_TONE: Record<CardTone, { borde: string; cabecera: string }> = {
  default: { borde: 'border-border', cabecera: '' },
  ai: { borde: 'border-ai-border', cabecera: 'bg-ai-soft/45' },
  accent: { borde: 'border-accent-border', cabecera: 'bg-accent-soft/45' },
};

export function Card({
  title,
  subtitle,
  right,
  children,
  className = '',
  padded = false,
  tone = 'default',
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Añade padding al cuerpo. Las tablas van sin él, a sangre. */
  padded?: boolean;
  tone?: CardTone;
}) {
  const t = CARD_TONE[tone];
  return (
    <section className={`overflow-hidden rounded-card border bg-surface shadow-card ${t.borde} ${className}`}>
      {(title || right) && (
        <header className={`flex flex-wrap items-start justify-between gap-x-3 gap-y-2 border-b border-inherit px-4 py-3 ${t.cabecera}`}>
          <div className="min-w-0">
            {title && <h2 className="t-h2 truncate">{title}</h2>}
            {subtitle && <p className="t-meta mt-0.5 text-muted">{subtitle}</p>}
          </div>
          {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
        </header>
      )}
      <div className={padded ? 'p-4' : ''}>{children}</div>
    </section>
  );
}

/** Cabecera de pantalla: el mismo título, descripción y acciones en todas. */
export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        <h1 className="t-h1">{title}</h1>
        {description && <p className="mt-1.5 max-w-3xl text-[13px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Título de sección fuera de una card, para separar bloques del dashboard. */
export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between gap-3">
      <h2 className="t-label text-muted">{children}</h2>
      {right}
    </div>
  );
}

export type Tone = 'neutral' | 'accent' | 'positive' | 'negative' | 'warning' | 'ai';

const TONE_SOFT: Record<Tone, string> = {
  neutral: 'bg-neutral-soft text-neutral-text',
  accent: 'bg-accent-soft text-accent-text',
  positive: 'bg-positive-soft text-positive-text',
  negative: 'bg-negative-soft text-negative-text',
  warning: 'bg-warning-soft text-warning-text',
  ai: 'bg-ai-soft text-ai-text',
};

export function Badge({ children, tone = 'neutral', title }: { children: ReactNode; tone?: Tone; /** Explicación en tooltip. */ title?: string }) {
  const badge = (
    <span className={`inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[11px] font-medium whitespace-nowrap tabular-nums ${TONE_SOFT[tone]}`}>
      {children}
    </span>
  );
  return title ? <Tooltip content={title}>{badge}</Tooltip> : badge;
}

/**
 * Dato principal. El valor manda: grande, tabular y con la etiqueta arriba en pequeño.
 * `hint` es el tamaño de muestra o la unidad, no una segunda métrica.
 */
/**
 * La fila de métricas que encabeza una pantalla.
 *
 * Existe para que la jerarquía sea la misma en todas: la tarjeta `hero` ocupa DOS celdas y las demás
 * tilan a su lado. Antes cada pantalla repetía su propia rejilla y la de Rendimiento tenía 5 columnas
 * mientras las otras 6, así que la misma cifra se leía de distinto tamaño según dónde estuvieras.
 *
 * `cols` son las columnas en pantalla ancha. Con `hero`, deja (cols − 2) huecos en su fila: una fila
 * limpia sale con `cols − 1` tarjetas. Una fila de cuatro no lleva `hero`: cuatro tarjetas ya se leen
 * de un vistazo, y destacar una ahí no resuelve nada.
 */
const COLUMNAS = { 4: 'lg:grid-cols-4', 5: 'md:grid-cols-4 xl:grid-cols-5', 6: 'md:grid-cols-4 xl:grid-cols-6' } as const;

export function StatRow({ cols = 6, children }: { cols?: 4 | 5 | 6; children: ReactNode }) {
  return <div className={`grid grid-cols-2 gap-3 ${COLUMNAS[cols]}`}>{children}</div>;
}

export function Stat({
  label,
  value,
  hint,
  tone,
  tip,
  emphasis = false,
  hero = false,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: Tone;
  /** Qué significa el dato. */
  tip?: ReactNode;
  /** Para el dato que encabeza una pantalla. */
  emphasis?: boolean;
  /**
   * El dato PRINCIPAL de la pantalla, uno solo: cifra mayor y, en pantalla ancha, doble de ancho.
   *
   * Existe porque `emphasis` repartido entre dos o tres tarjetas deja de ser jerarquía: si todo destaca,
   * hay que leerlo todo. `hero` implica `emphasis` para el borde de acento.
   */
  hero?: boolean;
  /** Marca de qué habla el dato. Decorativo: nunca sustituye al rótulo. */
  icon?: ReactNode;
}) {
  return (
    <div
      className={`flex min-w-0 flex-col rounded-card border bg-surface px-3.5 py-3 shadow-card ${
        emphasis || hero ? 'border-accent-border' : 'border-border'
      } ${hero ? 'col-span-2' : ''}`}
    >
      {/* El rótulo se parte en dos líneas antes que cortarse: en móvil, «Corners / parti…» no dice nada. */}
      <div className="flex items-start gap-1.5">
        {icon && (
          <span className={`mt-px shrink-0 [&_svg]:h-3.5 [&_svg]:w-3.5 ${emphasis || hero ? 'text-accent' : 'text-faint'}`} aria-hidden>
            {icon}
          </span>
        )}
        <span className="t-label min-w-0 text-muted">{label}</span>
        {tip && <span className="shrink-0">{<InfoTip>{tip}</InfoTip>}</span>}
      </div>
      <div
        className={`mt-1.5 ${hero ? 't-stat-xl' : emphasis ? 't-stat-lg' : 't-stat'} ${
          tone === 'positive' ? 'text-positive-text' : tone === 'negative' ? 'text-negative-text' : ''
        }`}
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-[11px] text-faint">{hint}</div>}
    </div>
  );
}

/**
 * Reparto de una probabilidad entre varias opciones, en una sola barra.
 * Una barra por opción sube a tres barras que hay que comparar; una barra partida se lee de un vistazo y
 * además deja claro que las partes suman 100 %.
 */
export function ProbSplit({
  parts,
  height = 'h-2',
}: {
  parts: { label: string; value: number | null; color: string }[];
  height?: string;
}) {
  const validas = parts.filter((p) => p.value !== null && Number.isFinite(p.value)) as { label: string; value: number; color: string }[];
  const total = validas.reduce((a, p) => a + p.value, 0);
  if (!validas.length || total <= 0) return null;
  return (
    <span
      className={`flex w-full overflow-hidden rounded-pill bg-surface-3 ${height}`}
      role="img"
      aria-label={validas.map((p) => `${p.label} ${(p.value * 100).toFixed(0)} %`).join(', ')}
    >
      {validas.map((p) => (
        // `title` nativo y no el componente Tooltip: este envuelve en un span propio que aquí rompería
        // los anchos porcentuales de los tramos.
        <span key={p.label} className="block h-full" title={`${p.label}: ${(p.value * 100).toFixed(1)} %`} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />
      ))}
    </span>
  );
}

/**
 * Nivel de confianza sobre 10, como medidor.
 * Es una cifra que el modelo calcula de verdad (muestra, dispersión y acuerdo entre modelos), así que se
 * enseña con su número: una barra sin cifra invitaría a leerla como «seguridad».
 */
export function Confidence({ value, max = 10 }: { value: number | null; max?: number }) {
  if (value === null || !Number.isFinite(value)) return NA;
  const pct = Math.max(0, Math.min(1, value / max));
  const tone = pct >= 0.7 ? 'bg-positive' : pct >= 0.4 ? 'bg-warning' : 'bg-negative';
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-14 shrink-0 overflow-hidden rounded-pill bg-surface-3" aria-hidden>
        <span className={`block h-full rounded-pill ${tone}`} style={{ width: `${pct * 100}%` }} />
      </span>
      <span className="text-[12px] font-medium tabular-nums">
        {value.toFixed(1)}
        <span className="text-faint">/{max}</span>
      </span>
    </span>
  );
}

/**
 * Probabilidad. El color codifica la magnitud para poder barrer una columna con la vista
 * sin leer los números uno a uno.
 */
export function ProbBadge({ value, decimals = 1 }: { value: number | null; decimals?: number }) {
  if (value === null || !Number.isFinite(value)) return NA;
  const pct = value * 100;
  const tone: Tone = pct >= 60 ? 'positive' : pct >= 40 ? 'warning' : 'neutral';
  return <Badge tone={tone}>{pct.toFixed(decimals)}%</Badge>;
}

/**
 * Barra proporcional dentro de una celda: compara de un vistazo sin leer el número.
 *
 * La barra va ANTES de la cifra. Con la cifra primero, en una columna alineada a la derecha la barra se
 * come los 56 px del borde y el número queda desplazado: en Equipos, PPG y Prom GF no cuadraban con el
 * resto de columnas numéricas ni con su propia cabecera. Así todas las cifras de la tabla caen en la
 * misma vertical y la barra es el adorno, que es lo que es.
 *
 * Se esconde por debajo de `lg`: en una tabla apretada, 56 px de adorno por columna valen menos que ver
 * la columna siguiente.
 */
export function MiniBar({ value, max, tone = 'accent' }: { value: number | null; max: number; tone?: Tone }) {
  if (value === null || !Number.isFinite(value) || max <= 0) return NA;
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const bg = tone === 'positive' ? 'bg-positive' : tone === 'negative' ? 'bg-negative' : tone === 'warning' ? 'bg-warning' : 'bg-accent';
  return (
    <span className="flex items-center justify-end gap-2">
      <span className="hidden h-1.5 w-12 overflow-hidden rounded-pill bg-surface-3 lg:block" aria-hidden>
        <span className={`block h-full rounded-pill ${bg}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="tabular-nums">{value.toFixed(2)}</span>
    </span>
  );
}

export function FormBadges({ results }: { results: ('W' | 'D' | 'L')[] }) {
  const tone = { W: 'bg-positive', D: 'bg-faint', L: 'bg-negative' };
  const label = { W: 'V', D: 'E', L: 'D' };
  const full = { W: 'Victoria', D: 'Empate', L: 'Derrota' };
  return (
    <span className="inline-flex gap-1" aria-label={results.map((r) => full[r]).join(', ')}>
      {results.map((r, i) => (
        <span key={i} aria-hidden className={`inline-flex h-5 w-5 items-center justify-center rounded text-[11px] font-semibold text-white ${tone[r]}`}>
          {label[r]}
        </span>
      ))}
    </span>
  );
}

/**
 * Pantalla sin datos. Un vacío tiene que decir tres cosas: qué falta, por qué y qué hacer. Un «Sin datos»
 * a secas deja al usuario sin saber si se ha roto algo o si es que todavía no hay nada.
 */
export function Empty({ children, icon, title, action }: { children?: ReactNode; icon?: ReactNode; title?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
      {icon && (
        <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-card border border-border bg-surface-2 text-faint [&_svg]:h-5 [&_svg]:w-5" aria-hidden>
          {icon}
        </div>
      )}
      {title && <div className="t-h2">{title}</div>}
      {children && <div className="max-w-md text-[13px] text-muted">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/**
 * Error al cargar, que NO es lo mismo que «no hay datos»: aquí los datos podrían existir y algo ha fallado,
 * así que se ofrece reintentar y se enseña el motivo real en vez de esconderlo.
 */
export function ErrorState({ title = 'No se han podido cargar los datos', detail, onRetry }: { title?: string; detail?: ReactNode; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center" role="alert">
      <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-card border border-negative/30 bg-negative-soft text-negative-text [&_svg]:h-5 [&_svg]:w-5" aria-hidden>
        <AlertTriangle />
      </div>
      <div className="t-h2">{title}</div>
      {detail && <div className="max-w-md text-[13px] text-muted">{detail}</div>}
      {onRetry && (
        <div className="mt-2">
          <Button onClick={onRetry}>
            <RefreshCw size={14} aria-hidden /> Reintentar
          </Button>
        </div>
      )}
    </div>
  );
}

export function Skeleton({ className = 'h-4 w-full' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

/**
 * Esqueleto de la pantalla entera, mientras llegan los datos de la base local.
 *
 * Es lo primero que se ve al abrir la aplicación, y antes era un «Cargando datos…» suelto sobre un fondo
 * vacío: parecía rota. Dibuja la forma que va a tener el contenido (cabecera, fila de cifras, dos paneles)
 * para que el salto a los datos reales no mueva nada de sitio.
 */
export function PageSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-label="Cargando datos">
      <div className="space-y-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-card border border-border bg-surface px-3.5 py-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2.5 h-7 w-16" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-card border border-border bg-surface xl:col-span-2">
          <TableSkeleton rows={7} cols={5} />
        </div>
        <div className="rounded-card border border-border bg-surface">
          <TableSkeleton rows={7} cols={3} />
        </div>
      </div>
    </div>
  );
}

/** Esqueleto de tabla: evita el salto de vacío a lleno al cargar. */
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2.5 p-4" role="status" aria-label="Cargando">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={`h-4 ${c === 0 ? 'w-1/3' : 'flex-1'}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Flechas izquierda/derecha entre las opciones de un grupo (pestañas, conmutadores), como en cualquier app. */
function flechas<T extends string>(e: KeyboardEvent<HTMLElement>, ids: T[], actual: T, cambiar: (id: T) => void) {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  e.preventDefault();
  const i = ids.indexOf(actual);
  const siguiente = ids[(i + (e.key === 'ArrowRight' ? 1 : ids.length - 1)) % ids.length];
  cambiar(siguiente);
  e.currentTarget.querySelector<HTMLElement>(`[data-option="${CSS.escape(siguiente)}"]`)?.focus();
}

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: ReactNode; count?: number }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div
      role="tablist"
      onKeyDown={(e) => flechas(e, tabs.map((t) => t.id), active, onChange)}
      className="flex gap-1 overflow-x-auto border-b border-border px-2 [scrollbar-width:none]"
    >
      {tabs.map((t) => {
        const on = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            data-option={t.id}
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={`-mb-px shrink-0 border-b-2 px-3 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors ${
              on ? 'border-accent text-accent-text' : 'border-transparent text-muted hover:border-border-strong hover:text-text'
            }`}
          >
            {t.label}
            {t.count !== undefined && <span className="ml-1.5 rounded-pill bg-surface-2 px-1.5 text-[11px] text-muted tabular-nums">{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

function Segmento({ on, title, size, onClick, value, children }: { on: boolean; title?: string; size: 'sm' | 'md'; onClick: () => void; value: string; children: ReactNode }) {
  const tip = useTooltip(title);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      aria-label={title}
      data-option={value}
      tabIndex={on ? 0 : -1}
      onClick={onClick}
      {...tip.trigger}
      /*
       * En móvil, 44 px de alto; desde `sm` vuelve a su altura compacta.
       *
       * 24 y 28 px cumplen WCAG 2.2 AA (criterio 2.5.8, 24x24), pero un filtro que se usa con el pulgar
       * pide la guía de confort de 44. El texto y el relleno horizontal no cambian: solo crece la zona
       * que se puede tocar, así que la densidad de la tabla de al lado se queda igual.
       */
      className={`inline-flex items-center justify-center gap-1 rounded-[calc(var(--radius-control)-2px)] font-medium whitespace-nowrap transition-colors ${
        size === 'sm' ? 'min-h-10 px-2 py-0.5 text-[12px] sm:min-h-6' : 'min-h-11 px-2.5 py-1 text-[13px] sm:min-h-7'
      } ${on ? 'bg-surface text-text shadow-card' : 'text-muted hover:bg-surface-3 hover:text-text'}`}
    >
      {children}
      {tip.node}
    </button>
  );
}

/** Conmutador de pocas opciones excluyentes. Más rápido que un desplegable. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  label,
}: {
  options: { value: T; label: ReactNode; title?: string }[];
  value: T;
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
  label?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={(e) => flechas(e, options.map((o) => o.value), value, onChange)}
      className="inline-flex max-w-full overflow-x-auto rounded-control border border-border bg-surface-2 p-0.5 [scrollbar-width:none]"
    >
      {options.map((o) => (
        <Segmento key={o.value} value={o.value} on={o.value === value} title={o.title} size={size} onClick={() => onChange(o.value)}>
          {o.label}
        </Segmento>
      ))}
    </div>
  );
}

/** Acción que borra algo: primero se arma y hay que pulsar otra vez en unos segundos. */
function useArmado(ms = 4000) {
  const [armado, setArmado] = useState(false);
  useEffect(() => {
    if (!armado) return;
    const t = window.setTimeout(() => setArmado(false), ms);
    return () => window.clearTimeout(t);
  }, [armado, ms]);
  return [armado, setArmado] as const;
}

const BUTTON_VARIANTS = {
  primary: 'border-transparent bg-accent text-accent-fg shadow-card hover:bg-accent-hover',
  default: 'border-border-strong bg-surface text-text shadow-card hover:bg-surface-2',
  ghost: 'border-transparent bg-transparent text-muted hover:bg-surface-2 hover:text-text',
  danger: 'border-border-strong bg-surface text-negative-text shadow-card hover:border-negative/40 hover:bg-negative-soft',
};

export function Button({
  children,
  onClick,
  variant = 'default',
  size = 'md',
  disabled,
  loading = false,
  title,
  confirm,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: keyof typeof BUTTON_VARIANTS;
  size?: 'sm' | 'md';
  disabled?: boolean;
  /** Acción en curso: el botón no se puede volver a pulsar y lo dice. */
  loading?: boolean;
  /** Explicación en tooltip. */
  title?: string;
  /** Texto de confirmación: la acción pide una segunda pulsación. Para lo que no se puede deshacer. */
  confirm?: string;
  className?: string;
}) {
  const [armado, setArmado] = useArmado();
  const tip = useTooltip(title);
  return (
    <button
      type="button"
      onClick={() => {
        if (confirm && !armado) return setArmado(true);
        setArmado(false);
        onClick?.();
      }}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...tip.trigger}
      onBlur={() => {
        tip.trigger.onBlur();
        setArmado(false);
      }}
      className={`inline-flex min-h-8 items-center justify-center gap-1.5 rounded-control border font-medium transition-[background-color,border-color,color,transform] duration-150 select-none active:translate-y-px disabled:translate-y-0 disabled:opacity-50 ${
        size === 'sm' ? 'min-h-7 px-2.5 py-1 text-[12px]' : 'px-3 py-1.5 text-[13px]'
      } ${armado ? 'border-transparent bg-negative text-white hover:bg-negative' : BUTTON_VARIANTS[variant]} ${className}`}
    >
      {loading && <Loader2 size={14} className="animate-spin" aria-hidden />}
      {armado ? confirm : children}
      {tip.node}
    </button>
  );
}

/** Enlace con aspecto de botón: lleva a otra pantalla, no ejecuta una acción. */
export function ButtonLink({ to, children, variant = 'default', size = 'md' }: { to: string; children: ReactNode; variant?: keyof typeof BUTTON_VARIANTS; size?: 'sm' | 'md' }) {
  return (
    <Link
      to={to}
      className={`inline-flex min-h-8 items-center justify-center gap-1.5 rounded-control border font-medium transition-colors select-none active:translate-y-px ${
        size === 'sm' ? 'min-h-7 px-2.5 py-1 text-[12px]' : 'px-3 py-1.5 text-[13px]'
      } ${BUTTON_VARIANTS[variant]}`}
    >
      {children}
    </Link>
  );
}

const ICON_TONES = {
  default: 'text-muted hover:bg-surface-3 hover:text-text',
  accent: 'text-muted hover:bg-accent-soft hover:text-accent-text',
  danger: 'text-muted hover:bg-negative-soft hover:text-negative-text',
};

/**
 * Botón de icono para tablas y barras de herramientas. `label` es su nombre accesible y el tooltip:
 * nada de «Botón» o «Acción», sino lo que hace («Actualizar estadísticas del partido»). Desactivado sigue
 * siendo enfocable y su tooltip dice por qué (`disabledReason`).
 */
export function IconButton({
  icon,
  label,
  tooltip,
  onClick,
  to,
  href,
  tone = 'default',
  size = 'md',
  disabled = false,
  disabledReason,
  loading = false,
  confirm,
  expanded,
  className = '',
}: {
  icon: ReactNode;
  label: string;
  /** Tooltip más largo que el nombre, si hace falta. */
  tooltip?: ReactNode;
  onClick?: () => void;
  /** Enlace interno. */
  to?: string;
  /** Enlace externo: se abre en otra pestaña. */
  href?: string;
  tone?: keyof typeof ICON_TONES;
  size?: 'sm' | 'md';
  disabled?: boolean;
  disabledReason?: string;
  loading?: boolean;
  /** Texto de confirmación: pide una segunda pulsación. */
  confirm?: string;
  expanded?: boolean;
  className?: string;
}) {
  const [armado, setArmado] = useArmado();
  const tip = useTooltip(armado ? confirm : disabled && disabledReason ? disabledReason : (tooltip ?? label), { delay: 200 });
  const cls = `inline-flex shrink-0 items-center justify-center rounded-control transition-colors ${size === 'sm' ? 'h-7 w-7' : 'h-8 w-8'} ${
    armado ? 'bg-negative text-white hover:bg-negative' : ICON_TONES[tone]
  } aria-disabled:opacity-40 aria-disabled:hover:bg-transparent aria-disabled:hover:text-muted ${className}`;

  if (to && !disabled) {
    return (
      <Link to={to} aria-label={label} className={cls} onClick={(e) => e.stopPropagation()} {...tip.trigger}>
        {icon}
        {tip.node}
      </Link>
    );
  }
  if (href && !disabled) {
    return (
      <a href={href} target="_blank" rel="noreferrer noopener" aria-label={`${label} (se abre en otra pestaña)`} className={cls} onClick={(e) => e.stopPropagation()} {...tip.trigger}>
        {icon}
        {tip.node}
      </a>
    );
  }
  return (
    <button
      type="button"
      aria-label={armado ? `${label}: ${confirm}` : label}
      aria-disabled={disabled || loading || undefined}
      aria-busy={loading || undefined}
      aria-expanded={expanded}
      {...tip.trigger}
      onClick={(e) => {
        e.stopPropagation();
        if (disabled || loading) return;
        if (confirm && !armado) {
          setArmado(true);
          tip.show(e.currentTarget);
          return;
        }
        setArmado(false);
        onClick?.();
      }}
      onBlur={() => {
        tip.trigger.onBlur();
        setArmado(false);
      }}
      className={cls}
    >
      {loading ? <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" aria-hidden /> : icon}
      {tip.node}
    </button>
  );
}

/**
 * Diálogo modal con `<dialog>` nativo: el navegador atrapa el foco, cierra con Escape y deja el fondo
 * inerte. Se cierra también pulsando fuera.
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  actions,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onClose={onClose}
      // Escape explícito: el cierre nativo depende de reglas del navegador (activación del usuario) que no
      // siempre se cumplen, y un diálogo que no se cierra con Escape atrapa al que usa el teclado.
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      // `text-left whitespace-normal`: abierto desde una celda de tabla heredaría su texto sin saltos y alineado a la derecha.
      className="m-auto max-h-[min(92vh,60rem)] w-[min(calc(100%-1.5rem),56rem)] overflow-hidden rounded-card border border-border bg-elevated p-0 text-left whitespace-normal text-text shadow-pop"
    >
      {open && (
        <div className="flex max-h-[min(92vh,60rem)] flex-col">
          <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div className="min-w-0">
              <h2 id={id} className="t-h2">
                {title}
              </h2>
              {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {actions}
              <IconButton icon={<X size={18} />} label="Cerrar" onClick={onClose} />
            </div>
          </header>
          <div className="min-h-0 overflow-auto">{children}</div>
        </div>
      )}
    </dialog>
  );
}

/** Contenedor con scroll para tablas largas; el encabezado queda fijo. */
export function ScrollTable({ children, maxHeight = '70vh' }: { children: ReactNode; maxHeight?: string }) {
  return (
    <div className="overflow-auto overscroll-x-contain" style={{ maxHeight }}>
      {children}
    </div>
  );
}

/** Aviso contextual. `tone` dice si es informativo, una advertencia o un problema. */
export function Callout({ tone = 'accent', icon, title, children }: { tone?: Tone; icon?: ReactNode; title?: ReactNode; children: ReactNode }) {
  return (
    <div className={`flex gap-2.5 rounded-card px-4 py-3 text-[13px] ${TONE_SOFT[tone]}`} role={tone === 'negative' ? 'alert' : undefined}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0">
        {title && <div className="mb-0.5 font-semibold">{title}</div>}
        {children}
      </div>
    </div>
  );
}

/** Campo de formulario con etiqueta, para que todos midan y se alineen igual. */
export function Field({
  label,
  children,
  hint,
  error,
  className = '',
}: {
  label: ReactNode;
  children: ReactNode;
  /** Ayuda o equivalencia bajo el campo. */
  hint?: ReactNode;
  /** Error de validación: sustituye a la ayuda. */
  error?: string | null;
  className?: string;
}) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <span className="text-[11px] font-medium text-muted">{label}</span>
      {children}
      {error ? <span className="text-[11px] text-negative-text">{error}</span> : hint ? <span className="text-[11px] text-faint">{hint}</span> : null}
    </label>
  );
}

/** El borde es `border-strong` porque delimita un control: WCAG 1.4.11 pide 3:1 y `border` no llega. */
export const inputClass =
  'min-h-8 rounded-control border border-border-strong bg-surface px-2.5 py-1.5 text-[13px] text-text transition-colors ' +
  'focus:border-accent focus:ring-3 focus:ring-accent/20 focus:outline-none disabled:opacity-50';
