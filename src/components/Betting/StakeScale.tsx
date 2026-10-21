/**
 * El stake en la escala 1–100 y la tabla de equivalencias.
 *
 * Son dos piezas de LECTURA: no deciden nada ni cambian ningún cálculo. El stake lo sigue fijando Kelly
 * con los topes del perfil; esto lo traduce a una escala comparable entre apuestas hechas con bankrolls
 * distintos, y avisa cuando se sale de la banda recomendada.
 */
import type { ReactNode } from 'react';
import { BANDAS, bandaDe, importeDeStake, PELDANOS, stakeDeImporte } from '../../domain/betting/stakeScale';
import { Badge, type Tone } from '../ui';
import { Tooltip } from '../Tooltip';
import type { MoneySettings } from '../../domain/betting/coins';
import { money } from './BetUi';

const TONO: Record<string, Tone> = { positive: 'positive', neutral: 'neutral', warning: 'warning', negative: 'negative' };

/** Un stake de la escala, con su banda. `bank` es el de ESE momento, no el de ahora. */
export function StakeBadge({ importe, bank, children }: { importe: number; bank: number; children?: ReactNode }) {
  const stake = stakeDeImporte(importe, bank);
  // Sin bank no hay escala: antes que inventar un «stake 0», no se enseña nada.
  if (stake === null) return null;
  const banda = bandaDe(stake);
  const { label, consejo } = BANDAS[banda];
  return (
    <Tooltip content={`Stake ${stake.toFixed(1)} de 100: el ${stake.toFixed(1)} % del bank. ${label}. ${consejo}`}>
      <span className="inline-flex items-center gap-1.5">
        <Badge tone={TONO[BANDAS[banda].tono]}>Stake {stake < 10 ? stake.toFixed(1) : Math.round(stake)}</Badge>
        {children}
      </span>
    </Tooltip>
  );
}

/**
 * Qué vale cada peldaño con el bank de ahora.
 *
 * El sistema enseña esta tabla con un bank fijo de ejemplo; aquí se calcula con el tuyo, que es lo que
 * de verdad contesta «¿cuánto es un stake 10 para mí?».
 */
export function StakeScaleTable({ bank, s }: { bank: number; s: MoneySettings }) {
  return (
    <table className="data w-full">
      <thead>
        <tr>
          <th scope="col">Stake</th>
          <th scope="col" className="num">
            % del bank
          </th>
          <th scope="col" className="num">
            Valor a apostar
          </th>
          <th scope="col" className="hidden sm:table-cell">
            Cuándo
          </th>
        </tr>
      </thead>
      <tbody>
        {PELDANOS.map((p) => {
          const banda = bandaDe(p);
          return (
            <tr key={p}>
              <td className="font-semibold tabular-nums">{p}</td>
              <td className="num">{p} %</td>
              <td className="num font-medium">{money(importeDeStake(p, bank), s)}</td>
              <td className="hidden text-[12px] text-muted sm:table-cell">
                <Badge tone={TONO[BANDAS[banda].tono]}>{BANDAS[banda].label}</Badge>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
