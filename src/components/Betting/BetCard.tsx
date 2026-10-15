/**
 * Tarjeta de una apuesta registrada. Es la fila del Historial cuando la pantalla es un teléfono.
 *
 * Son 12 columnas —selección, partido, cuota, probabilidad, stake, % de bankroll, riesgo, estado y
 * resultado— y en 375 px se leían cuatro. Aquí la selección manda, porque es lo que se busca al repasar el
 * historial, y el resultado va abajo con su color, que es lo segundo que se mira.
 *
 * No calcula nada: todo viene ya resuelto en `BetView`. Lo que aún no tiene resultado enseña «—», no un cero.
 */
import type { BetView } from '../../domain/betting/metrics';
import type { MoneySettings } from '../../domain/betting/coins';
import { RiskBadge, StatusBadge, money, pct, signedMoney } from './BetUi';

export function BetCard({ b, cur }: { b: BetView; cur: MoneySettings }) {
  const tono = b.netProfit === null ? '' : b.netProfit > 0 ? 'text-positive-text' : b.netProfit < 0 ? 'text-negative-text' : '';

  return (
    <div className="flex h-full flex-col rounded-card border border-border bg-surface shadow-card">
      <div className="flex items-start gap-2 border-b border-border px-3 py-2">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium">{b.label}</span>
          <span className="block truncate text-[11px] text-muted">{b.event}</span>
        </span>
        <StatusBadge status={b.status} />
      </div>

      <div className="grid flex-1 grid-cols-3 gap-x-3 gap-y-2 px-3 py-2.5 text-[13px]">
        <span className="min-w-0">
          <span className="t-label block text-[10px] text-faint">Cuota</span>
          <span className="font-display font-semibold tabular-nums">{b.odds.toFixed(2)}</span>
        </span>
        <span className="min-w-0">
          <span className="t-label block text-[10px] text-faint">Stake</span>
          <span className="truncate font-display font-semibold tabular-nums">{money(b.stake, cur)}</span>
        </span>
        <span className="min-w-0" title="Probabilidad estimada al registrar">
          <span className="t-label block text-[10px] text-faint">Prob.</span>
          <span className="font-display font-semibold tabular-nums">
            {b.probability === null ? <span className="text-faint">rango</span> : pct(b.probability)}
          </span>
        </span>
      </div>

      <div className="flex items-center gap-2 border-t border-border px-3 py-1.5 text-[11px]">
        <span className="tabular-nums text-faint" title="Fecha del partido (la primera, en un ticket)">
          {b.date}
        </span>
        <RiskBadge
          risk={{ level: b.riskLevel, score: b.riskScore, components: { datos: 0, modelo: 0, mercado: 0, varianza: 0, correlacion: 0 }, notes: [] }}
          compact
        />
        <span className={`ml-auto font-display text-[13px] font-semibold tabular-nums ${tono}`} title="Ganancia o pérdida neta">
          {b.netProfit === null ? <span className="text-faint">—</span> : signedMoney(b.netProfit, cur)}
        </span>
      </div>
    </div>
  );
}
