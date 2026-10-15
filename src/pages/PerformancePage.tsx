import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, Calculator, TrendingDown, TrendingUp } from 'lucide-react';
import { ButtonLink, Card, Empty, PageHeader, SegmentedControl, Skeleton, Stat, StatRow } from '../components/ui';
import { Amount, MetricValue, RiskBadge, StatusBadge, money, pct, signedMoney } from '../components/Betting/BetUi';
import { formatCoins, type MoneySettings } from '../domain/betting/coins';
import { RISK_LABEL } from '../domain/betting/labels';
import type { RiskLevel } from '../types/betting';
import { TIPS } from '../components/Betting/tips';
import { bankrollSeries, betViews, capitalOf, dailyProfit, groupPerformance, summarize, type BetView } from '../domain/betting/metrics';
import { bankrollOf, unitValue } from '../domain/betting/wallet';
import { useChartStyle } from '../components/Charts/chartStyle';
import { useActiveProfile, useBetting } from '../store/useBetting';

const hoyLocal = () => new Date().toLocaleDateString('sv-SE');

export function PerformancePage() {
  const hydrated = useBetting((s) => s.hydrated);
  const profile = useActiveProfile();
  const estilo = useChartStyle();
  const { chart, rejilla, ejeX, ejeY, tooltip } = estilo;
  const cur = profile.settings;
  const [alcance, setAlcance] = useState<'ciclo' | 'todo'>('ciclo');

  const ciclos = useMemo(() => (alcance === 'ciclo' ? [profile.cycle] : [...new Set(profile.movements.map((m) => m.cycle))]), [alcance, profile]);
  const bets = useMemo(() => betViews(profile).filter((b) => ciclos.includes(b.cycle)), [profile, ciclos]);
  const resumen = useMemo(() => summarize(bets, { capital: capitalOf(profile, ciclos), unit: unitValue(profile.settings) }), [bets, profile, ciclos]);
  const porMercado = useMemo(() => groupPerformance(bets, (b) => [{ key: b.family, label: b.familyLabel }]), [bets]);
  const serie = useMemo(() => bankrollSeries(profile, profile.cycle), [profile]);

  const cabecera = (
    <PageHeader
      title="Rendimiento"
      description={
        <>
          Métricas calculadas solo con los picks y tickets registrados de <strong>{profile.name}</strong>. Moneda virtual: mide la simulación, no promete ganancias.
        </>
      }
      actions={
        <SegmentedControl
          size="sm"
          label="Alcance"
          value={alcance}
          onChange={setAlcance}
          options={[
            { value: 'ciclo', label: `Ciclo ${profile.cycle}` },
            { value: 'todo', label: 'Todos los ciclos' },
          ]}
        />
      }
    />
  );

  if (!hydrated) {
    return (
      <>
        <PageHeader title="Rendimiento" />
        <Card>
          <div className="p-4">
            <Skeleton className="h-64 w-full" />
          </div>
        </Card>
      </>
    );
  }

  if (bets.length === 0) {
    return (
      <>
        {cabecera}
        <Card>
          <Empty icon={<Activity />} title="Todavía no hay apuestas registradas" action={<ButtonLink to="/picks" variant="primary">Evaluar un pick</ButtonLink>}>
            Las métricas se calculan solo con tu historial: sin él no hay nada que medir.
          </Empty>
        </Card>
      </>
    );
  }

  const hoy = hoyLocal();
  const plHoy = bets.filter((b) => b.settledAt && new Date(b.settledAt).toLocaleDateString('sv-SE') === hoy).reduce((a, b) => a + (b.netProfit ?? 0), 0);
  const conDatos = porMercado.filter((r) => r.resolved >= 3 && r.yield.value !== null).sort((a, b) => b.yield.value! - a.yield.value!);
  const riesgo = (['bajo', 'medio', 'alto'] as const).map((l) => ({ level: l, n: bets.filter((b) => b.riskLevel === l).length }));
  const simples = summarize(bets.filter((b) => b.kind === 'simple'), { capital: capitalOf(profile, ciclos), unit: unitValue(profile.settings) });
  const combinadas = summarize(bets.filter((b) => b.kind === 'ticket'), { capital: capitalOf(profile, ciclos), unit: unitValue(profile.settings) });
  const tone = (x: number | null) => (x === null ? undefined : x > 0 ? 'positive' : x < 0 ? 'negative' : undefined);

  return (
    <div className="space-y-4">
      {cabecera}

      {/* El bankroll virtual manda; el P/L del dia era la segunda grande y hacia competir dos cifras. */}
      <StatRow cols={5}>
        <Stat label="Bankroll virtual" value={<Amount sc={bankrollOf(profile)} s={cur} stacked />} hint={`inicial ${money(profile.settings.initialBankroll, cur)}`} hero />
        <Stat label="P/L de hoy" value={<Amount sc={Math.round(plHoy * 100) / 100} s={cur} signed stacked />} tone={tone(plHoy)} hint="apuestas liquidadas hoy" />
        <Stat label="ROI" tip={TIPS.roi} value={<MetricValue metric={resumen.roi} format={(v) => pct(v, 2, true)} />} tone={tone(resumen.roi.value)} />
        <Stat label="Yield" tip={TIPS.yield} value={<MetricValue metric={resumen.yield} format={(v) => pct(v, 2, true)} />} tone={tone(resumen.yield.value)} />
        <Stat label="% acierto" tip={TIPS.acierto} value={<MetricValue metric={resumen.hitRate} format={(v) => pct(v)} />} hint={`${resumen.won} de ${resumen.resolved}`} />
        <Stat label="% eficacia" tip={TIPS.eficacia} value={<MetricValue metric={resumen.efficacy} format={(v) => pct(v, 1, true)} />} tone={tone(resumen.efficacy.value)} />
        <Stat
          label="Drawdown máx."
          tip={TIPS.drawdown}
          value={<MetricValue metric={{ value: resumen.drawdown.n ? resumen.drawdown.amount : null, n: resumen.drawdown.n }} format={(v) => <Amount sc={v} s={cur} stacked />} />}
          hint={resumen.drawdown.n && resumen.drawdown.pct !== null ? pct(resumen.drawdown.pct) : undefined}
        />
        <Stat label="Picks activos" value={String(bets.filter((b) => b.kind === 'simple' && b.status === 'pendiente').length)} hint={`${resumen.pending} pendientes en total`} />
        <Stat label="Tickets simulados" value={String(bets.filter((b) => b.kind === 'ticket').length)} />
        <Stat
          label="Kelly usado (media)"
          tip={TIPS.kellyAplicado}
          value={<MetricValue metric={resumen.avgStakeFraction} format={(v) => pct(v, 2)} />}
          hint={resumen.avgKelly.value === null ? undefined : `Kelly completo medio ${pct(resumen.avgKelly.value, 2)}`}
        />
      </StatRow>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Evolución del bankroll" subtitle={`Ciclo ${profile.cycle}: capital aportado + beneficio liquidado`} className="xl:col-span-2">
          <div className="h-64 p-3">
            {serie.length < 2 ? (
              <Empty>Aún no hay liquidaciones en este ciclo.</Empty>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={serie.map((p, i) => ({ ...p, i }))} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid {...rejilla} />
                  <XAxis dataKey="i" tickFormatter={(v) => serie[v]?.at.slice(5, 10) ?? ''} {...ejeX} />
                  <YAxis
                    {...ejeY}
                    width={64}
                    domain={['auto', 'auto']}
                    tickFormatter={(v) => formatCoins(Number(v), cur.coinValue).replace(/ monedas?$/, '')}
                  />
                  <Tooltip {...tooltip} labelFormatter={(v) => serie[Number(v)]?.label ?? ''} formatter={(v) => [money(Number(v), cur), 'Bankroll']} />
                  <Line type="monotone" dataKey="bankroll" stroke={chart.series[0]} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
        <Card title="Calendario de rendimiento" subtitle="Beneficio neto por fecha de partido, últimas 12 semanas">
          <PerformanceCalendar bets={bets} cur={cur} />
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Acierto por mercado" subtitle="Ganados / resueltos. El acierto no es rentabilidad: mira el yield al lado">
          <MarketBars rows={porMercado.map((r) => ({ label: r.label, value: r.hitRate.value, n: r.resolved }))} format={(v) => pct(v)} color={() => chart.series[0]} estilo={estilo} />
        </Card>
        <Card title="Yield por mercado" subtitle="Beneficio / apostado. En rojo los mercados que pierden">
          <MarketBars rows={porMercado.map((r) => ({ label: r.label, value: r.yield.value, n: r.resolved }))} format={(v) => pct(v, 1, true)} color={(v) => (v >= 0 ? chart.positive : chart.negative)} estilo={estilo} />
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card
          title={
            <span className="flex items-center gap-1.5">
              <TrendingUp size={14} className="text-positive-text" aria-hidden /> Mejores mercados
            </span>
          }
          subtitle="Por yield, con 3 o más resueltos"
        >
          <MarketList rows={conDatos.slice(0, 3)} cur={cur} />
        </Card>
        <Card
          title={
            <span className="flex items-center gap-1.5">
              <TrendingDown size={14} className="text-negative-text" aria-hidden /> Peores mercados
            </span>
          }
          subtitle="Por yield, con 3 o más resueltos"
        >
          <MarketList rows={[...conDatos].reverse().slice(0, 3)} cur={cur} />
        </Card>
        <Card title="Distribución de riesgo" subtitle="Nivel al registrar">
          <div className="h-44 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riesgo} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid {...rejilla} />
                <XAxis dataKey="level" tickFormatter={(v) => RISK_LABEL[v as RiskLevel]} {...ejeX} />
                <YAxis allowDecimals={false} {...ejeY} />
                <Tooltip {...tooltip} labelFormatter={(v) => `Riesgo ${RISK_LABEL[v as RiskLevel]}`} formatter={(v) => [String(v), 'Apuestas']} />
                <Bar dataKey="n" radius={[4, 4, 0, 0]}>
                  {riesgo.map((r) => (
                    <Cell key={r.level} fill={r.level === 'bajo' ? chart.positive : r.level === 'medio' ? chart.series[1] : chart.negative} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Individuales frente a combinadas">
        <div className="overflow-x-auto">
          <table className="data">
            <thead>
              <tr>
                <th scope="col">Tipo</th>
                <th scope="col" className="num">Apuestas</th>
                <th scope="col" className="num">Resueltas</th>
                <th scope="col" className="num">% acierto</th>
                <th scope="col" className="num">Cuota media</th>
                <th scope="col" className="num">Apostado</th>
                <th scope="col" className="num">Beneficio</th>
                <th scope="col" className="num">Yield</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ['Individuales', simples],
                  ['Combinadas', combinadas],
                ] as const
              ).map(([n, r]) => (
                <tr key={n}>
                  <td className="font-medium">{n}</td>
                  <td className="num">{r.total}</td>
                  <td className="num">{r.resolved}</td>
                  <td className="num">
                    <MetricValue metric={r.hitRate} format={(v) => pct(v)} />
                  </td>
                  <td className="num">
                    <MetricValue metric={r.avgOdds} format={(v) => v.toFixed(2)} />
                  </td>
                  <td className="num">{money(r.staked, cur)}</td>
                  <td className={`num ${r.netProfit > 0 ? 'text-positive-text' : r.netProfit < 0 ? 'text-negative-text' : ''}`}>{signedMoney(r.netProfit, cur)}</td>
                  <td className="num">
                    <MetricValue metric={r.yield} format={(v) => pct(v, 1, true)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Historial de picks" right={<ButtonLink to="/historial?tipo=simple" size="sm" variant="ghost">Ver todo</ButtonLink>}>
          <RecentList bets={bets.filter((b) => b.kind === 'simple')} cur={cur} />
        </Card>
        <Card title="Historial de tickets" right={<ButtonLink to="/historial?tipo=ticket" size="sm" variant="ghost">Ver todo</ButtonLink>}>
          <RecentList bets={bets.filter((b) => b.kind === 'ticket')} cur={cur} />
        </Card>
      </div>

      <p className="flex items-center gap-1.5 text-[12px] text-muted">
        <Calculator size={12} aria-hidden /> Brier, log loss, calibración y Sharpe, con filtros, en{' '}
        <Link to="/historial" className="rounded text-accent-text hover:underline">
          Historial y backtesting
        </Link>
        .
      </p>
    </div>
  );
}

function MarketBars({
  rows,
  format,
  color,
  estilo,
}: {
  rows: { label: string; value: number | null; n: number }[];
  format: (v: number) => string;
  color: (v: number) => string;
  estilo: ReturnType<typeof useChartStyle>;
}) {
  const { rejilla, ejeX, ejeY, tooltip } = estilo;
  const data = rows.filter((r) => r.value !== null).map((r) => ({ ...r, value: r.value! }));
  if (!data.length) return <Empty>Datos insuficientes: todavía no hay apuestas resueltas.</Empty>;
  return (
    <div className="p-3" style={{ height: Math.max(160, data.length * 34 + 40) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
          {/* Barras horizontales: la rejilla util es la vertical, al reves que en el resto. */}
          <CartesianGrid {...rejilla} vertical horizontal={false} />
          <XAxis type="number" tickFormatter={(v) => format(Number(v))} {...ejeX} />
          <YAxis type="category" dataKey="label" width={120} {...ejeY} />
          <Tooltip
            {...tooltip}
            formatter={(v, _n, item) => [`${format(Number(v))} · n = ${(item?.payload as { n: number } | undefined)?.n ?? '—'}`, '']}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((r) => (
              <Cell key={r.label} fill={color(r.value)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MarketList({ rows, cur }: { rows: ReturnType<typeof groupPerformance>; cur: MoneySettings }) {
  if (!rows.length) return <Empty>Datos insuficientes: hacen falta 3 apuestas resueltas por mercado.</Empty>;
  return (
    <ul className="divide-y divide-border">
      {rows.map((r) => (
        <li key={r.key} className="flex items-center justify-between gap-2 px-4 py-2.5 text-[13px]">
          <span>
            <span className="block font-medium">{r.label}</span>
            <span className="block text-[11px] text-muted">
              {r.resolved} resueltos · acierto {pct(r.hitRate.value)} · cuota media {r.avgOdds.value?.toFixed(2) ?? '—'}
            </span>
          </span>
          <span className="text-right tabular-nums">
            <span className={`block font-semibold ${r.netProfit >= 0 ? 'text-positive-text' : 'text-negative-text'}`}>{pct(r.yield.value, 1, true)}</span>
            <span className="block text-[11px] text-muted">{signedMoney(r.netProfit, cur)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function RecentList({ bets, cur }: { bets: BetView[]; cur: MoneySettings }) {
  const ultimos = [...bets].reverse().slice(0, 6);
  if (!ultimos.length) return <Empty>Sin registros.</Empty>;
  return (
    <ul className="divide-y divide-border">
      {ultimos.map((b) => (
        <li key={b.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-[12px]">
          <span className="min-w-0">
            <span className="block truncate font-medium">{b.label}</span>
            <span className="block truncate text-muted">
              {b.event} · {b.odds.toFixed(2)} · {money(b.stake, cur)}
              {b.netProfit !== null && ` · ${signedMoney(b.netProfit, cur)}`}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <RiskBadge risk={{ level: b.riskLevel, score: b.riskScore, components: { datos: 0, modelo: 0, mercado: 0, varianza: 0, correlacion: 0 }, notes: [] }} compact />
            <StatusBadge status={b.status} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function PerformanceCalendar({ bets, cur }: { bets: BetView[]; cur: MoneySettings }) {
  const dias = dailyProfit(bets);
  const hoy = new Date();
  // Semanas de lunes a domingo, la última la actual.
  const inicio = new Date(hoy);
  inicio.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7) - 7 * 11);
  const celdas = Array.from({ length: 84 }, (_, i) => {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    const key = d.toLocaleDateString('sv-SE');
    return { key, dato: dias.get(key), futuro: d > hoy };
  });
  const max = Math.max(1, ...[...dias.values()].map((d) => Math.abs(d.net)));
  return (
    <div className="p-4">
      <div className="grid grid-flow-col grid-rows-7 gap-1" style={{ gridTemplateColumns: 'repeat(12, minmax(0, 1fr))' }}>
        {celdas.map((c) => {
          const v = c.dato?.net ?? 0;
          const fuerza = Math.round(25 + (Math.abs(v) / max) * 75);
          const bg = !c.dato ? 'var(--surface-3)' : `color-mix(in oklch, ${v >= 0 ? 'var(--positive)' : 'var(--negative)'} ${fuerza}%, var(--surface-3))`;
          return (
            <div
              key={c.key}
              className={`aspect-square rounded-[3px] ${c.futuro ? 'opacity-30' : ''}`}
              style={{ background: bg }}
              title={c.dato ? `${c.key}: ${signedMoney(c.dato.net, cur)} · ${c.dato.bets} apuestas` : `${c.key}: sin apuestas liquidadas`}
            />
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-faint">Verde: día con beneficio · rojo: con pérdida · gris: sin apuestas. Pasa el ratón para ver el importe.</p>
    </div>
  );
}
