// oxlint-disable react/only-export-components -- formateadores junto a los componentes que los usan
import type { ReactNode } from 'react';
import type { BetStatus, DataQuality, RiskAssessment, RiskLevel } from '../../types/betting';
import type { Metric } from '../../domain/betting/metrics';
import { formatAmount, formatCoins, formatSc, type MoneySettings } from '../../domain/betting/coins';
import { COMPONENT_LABEL, QUALITY_LABEL, RISK_LABEL, STATUS_LABEL } from '../../domain/betting/labels';
import { Badge, type Tone } from '../ui';
import { InfoTip } from '../InfoTip';
import { TIPS } from './tips';

/** Importe en monedas con su equivalencia en SC entre paréntesis. Para textos. */
export function money(sc: number | null | undefined, s: MoneySettings): string {
  if (sc === null || sc === undefined || !Number.isFinite(sc)) return '—';
  return formatAmount(sc, s);
}

export function signedMoney(sc: number, s: MoneySettings): string {
  return formatAmount(sc, s, true);
}

/** Importe para JSX: las monedas destacan y los SC quedan en gris, al lado o debajo (`stacked`). */
export function Amount({ sc, s, signed = false, stacked = false }: { sc: number | null | undefined; s: MoneySettings; signed?: boolean; stacked?: boolean }) {
  if (sc === null || sc === undefined || !Number.isFinite(sc)) return <>—</>;
  const enSc = formatSc(sc, s.currencyCode, signed);
  return stacked ? (
    <span className="inline-flex flex-col leading-tight">
      <span>{formatCoins(sc, s.coinValue, signed)}</span>
      <span className="text-[11px] font-normal text-muted">{enSc}</span>
    </span>
  ) : (
    <span className="whitespace-nowrap">
      {formatCoins(sc, s.coinValue, signed)} <span className="text-[0.85em] font-normal text-muted">({enSc})</span>
    </span>
  );
}

export function pct(x: number | null | undefined, decimals = 1, signed = false): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return '—';
  return `${signed && x > 0 ? '+' : ''}${(x * 100).toFixed(decimals)} %`;
}

export function pp(x: number | null | undefined): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return '—';
  return `${x > 0 ? '+' : ''}${(x * 100).toFixed(2)} pp`;
}

export const INSUFICIENTE = <span className="text-[12px] font-medium text-faint">Datos insuficientes</span>;

/** Una métrica que puede no ser calculable: nunca se muestra un valor inventado. */
export function MetricValue({ metric, format }: { metric: Metric; format: (v: number) => ReactNode }) {
  if (metric.value === null) {
    return (
      <span className="inline-flex flex-col">
        {INSUFICIENTE}
        {metric.min !== undefined && (
          <span className="text-[11px] font-normal text-faint">
            n = {metric.n} de {metric.min}
          </span>
        )}
      </span>
    );
  }
  return <>{format(metric.value)}</>;
}

export const RISK_TONE: Record<RiskLevel, Tone> = { bajo: 'positive', medio: 'warning', alto: 'negative' };

export function RiskBadge({ risk, compact = false }: { risk: RiskAssessment; compact?: boolean }) {
  const c = risk.components;
  return (
    <span className="inline-flex items-center gap-1">
      <Badge tone={RISK_TONE[risk.level]}>
        {compact ? RISK_LABEL[risk.level] : `Riesgo ${RISK_LABEL[risk.level]}`} · {risk.score}
      </Badge>
      {!compact && (
        <InfoTip>
          <span className="block font-medium">Risk score {risk.score}/100</span>
          <span className="mt-1 block tabular-nums">
            {COMPONENT_LABEL.datos} {c.datos} · {COMPONENT_LABEL.modelo} {c.modelo} · {COMPONENT_LABEL.mercado} {c.mercado} ·{' '}
            {COMPONENT_LABEL.varianza} {c.varianza} · {COMPONENT_LABEL.correlacion} {c.correlacion}
          </span>
          {risk.notes.map((n) => (
            <span key={n} className="mt-1 block text-muted">
              {n}
            </span>
          ))}
          <span className="mt-1 block text-muted">{TIPS.riesgo}</span>
        </InfoTip>
      )}
    </span>
  );
}

const QUALITY_TONE: Record<DataQuality, Tone> = { alta: 'positive', media: 'accent', baja: 'warning', insuficiente: 'neutral' };

export function QualityBadge({ quality }: { quality: DataQuality }) {
  return <Badge tone={QUALITY_TONE[quality]}>Datos: {QUALITY_LABEL[quality]}</Badge>;
}

const STATUS_TONE: Record<BetStatus, Tone> = { pendiente: 'accent', ganado: 'positive', perdido: 'negative', anulado: 'neutral' };

export function StatusBadge({ status }: { status: BetStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}

/** Barra de probabilidad con su valor. `null` → «Datos insuficientes», nunca una barra vacía que parezca 0 %. */
export function ProbabilityBar({
  label,
  value,
  tip,
  action,
  emphasis = false,
}: {
  label: ReactNode;
  value: number | null;
  tip?: ReactNode;
  action?: ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="flex w-36 min-w-0 shrink-0 items-center gap-1 text-[13px] sm:w-44">
        <span className="truncate">{label}</span>
        {tip && <InfoTip align="left">{tip}</InfoTip>}
      </div>
      {value === null ? (
        // Sin barra: una barra vacía parecería un 0 %.
        <div className="min-w-0 flex-1 text-right">{INSUFICIENTE}</div>
      ) : (
        <>
          <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-pill bg-surface-3">
            <div
              className={`h-full rounded-pill ${emphasis ? 'bg-accent' : ''}`}
              style={{ width: `${Math.max(0, Math.min(100, value * 100))}%`, background: emphasis ? undefined : 'var(--series-1)' }}
            />
          </div>
          <div className="w-16 shrink-0 text-right text-[13px] font-semibold tabular-nums">{pct(value)}</div>
        </>
      )}
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Probabilidad estimada frente a la implícita en la misma escala: el hueco entre las dos es el edge. */
export function OddsVsProbability({ estimated, implied }: { estimated: number; implied: number }) {
  const e = estimated - implied;
  return (
    <div className="space-y-1.5">
      <div className="relative h-3 overflow-hidden rounded-pill bg-surface-3">
        <div className="absolute inset-y-0 left-0 rounded-pill bg-border-strong" style={{ width: `${implied * 100}%` }} />
        <div
          className={`absolute inset-y-0 left-0 rounded-pill ${e >= 0 ? 'bg-positive' : 'bg-negative'} opacity-80`}
          style={{ width: `${estimated * 100}%`, clipPath: e >= 0 ? `inset(0 0 0 ${(implied / estimated) * 100}%)` : undefined }}
        />
        <div className="absolute inset-y-0 w-0.5 bg-text" style={{ left: `${estimated * 100}%` }} aria-hidden />
      </div>
      <div className="flex flex-wrap justify-between gap-x-3 text-[11px] text-muted tabular-nums">
        <span>Implícita {pct(implied, 2)}</span>
        <span className={e >= 0 ? 'text-positive-text' : 'text-negative-text'}>Edge {pp(e)}</span>
        <span>Estimada {pct(estimated, 2)}</span>
      </div>
    </div>
  );
}

/** Kelly completo, Half, Quarter y el stake final (tras fracción y topes) sobre una escala común, con el tope por pick. */
export function KellyMeter({ full, applied, cap }: { full: number; /** stake final / bankroll */ applied: number | null; cap: number }) {
  const max = Math.max(full, cap, 0.0001) * 1.15;
  const x = (v: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;
  const marcas: [string, number, string][] = [
    ['Quarter', full * 0.25, 'bg-faint'],
    ['Half', full * 0.5, 'bg-muted'],
    ['Completo', full, 'bg-text'],
  ];
  return (
    <div>
      <div className="relative h-8">
        <div className="absolute inset-x-0 top-3 h-2 rounded-pill bg-surface-3" />
        {applied !== null && <div className="absolute top-3 left-0 h-2 rounded-pill bg-accent" style={{ width: x(applied) }} />}
        <div className="absolute top-1 h-6 w-0.5 bg-negative" style={{ left: x(cap) }} title={`Tope por pick ${pct(cap)}`} />
        {marcas.map(([n, v, c]) => (
          <div key={n} className={`absolute top-2.5 h-3 w-0.5 ${c}`} style={{ left: x(v) }} title={`${n} ${pct(v, 2)}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted tabular-nums">
        <span>Completo {pct(full, 2)}</span>
        <span>Half {pct(full * 0.5, 2)}</span>
        <span>Quarter {pct(full * 0.25, 2)}</span>
        <span className="text-accent-text">Stake final {pct(applied, 2)}</span>
        <span className="text-negative-text">Tope {pct(cap, 1)}</span>
      </div>
    </div>
  );
}

/** Dato con etiqueta y tooltip, para las rejillas de las fichas. */
/**
 * Un dato dentro de una card, sin tarjeta propia. Es el hermano de `Stat`, que es el de las bandas de
 * pantalla; aquí no se anida una tarjeta dentro de otra.
 *
 * `emphasis` para EL dato del bloque, uno solo: la misma regla que `hero` en `Stat`. Seis cifras del mismo
 * tamaño obligan a leerlas las seis para saber cuál contesta la pregunta de la pantalla.
 */
export function Figure({
  label,
  value,
  tip,
  hint,
  tone,
  emphasis = false,
}: {
  label: string;
  value: ReactNode;
  tip?: ReactNode;
  hint?: ReactNode;
  tone?: 'positive' | 'negative';
  emphasis?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 text-[11px] font-medium tracking-wide text-muted uppercase">
        <span className="truncate">{label}</span>
        {tip && <InfoTip>{tip}</InfoTip>}
      </div>
      <div
        className={`mt-0.5 font-semibold tabular-nums ${emphasis ? 'font-display text-[22px] leading-tight tracking-tight' : 'text-[15px]'} ${
          tone === 'positive' ? 'text-positive-text' : tone === 'negative' ? 'text-negative-text' : ''
        }`}
      >
        {value}
      </div>
      {hint && <div className="text-[11px] text-faint">{hint}</div>}
    </div>
  );
}
