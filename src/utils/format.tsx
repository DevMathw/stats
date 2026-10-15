// oxlint-disable react/only-export-components -- módulo de formateadores, no de componentes
import type { ReactNode } from 'react';

/** Un dato que el proveedor no entregó se muestra así. Nunca como 0. */
export const NA = <span className="text-faint">N/D</span>;

export function fmt(value: number | null | undefined, decimals = 2): ReactNode {
  if (value === null || value === undefined || !Number.isFinite(value)) return NA;
  return value.toFixed(decimals);
}

export function fmtInt(value: number | null | undefined): ReactNode {
  if (value === null || value === undefined || !Number.isFinite(value)) return NA;
  return String(value);
}

/**
 * Un dato de partido en formato `local – visitante`.
 * Con los dos lados ausentes es un solo "N/D"; con uno solo, se ve cuál falta.
 */
export function fmtPair(home: number | null | undefined, away: number | null | undefined, decimals?: number): ReactNode {
  const f = (v: number | null | undefined) => (decimals === undefined ? fmtInt(v) : fmt(v, decimals));
  const falta = (v: number | null | undefined) => v === null || v === undefined || !Number.isFinite(v);
  if (falta(home) && falta(away)) return NA;
  return (
    <span className="whitespace-nowrap">
      {f(home)} <span className="text-faint">–</span> {f(away)}
    </span>
  );
}

export function fmtPct(value: number | null | undefined, decimals = 1): ReactNode {
  if (value === null || value === undefined || !Number.isFinite(value)) return NA;
  return `${(value * 100).toFixed(decimals)}%`;
}

export function fmtSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}
