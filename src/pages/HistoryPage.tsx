import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Ban, FlaskConical, History, Play, SlidersHorizontal, TriangleAlert } from 'lucide-react';
import type { BetStatus, MarketFamily, RiskLevel } from '../types/betting';
import { Button, Callout, Card, Empty, Field, IconButton, PageHeader, Skeleton, Tabs, inputClass } from '../components/ui';
import { DataTable, type Column } from '../components/DataTable';
import { toast } from '../components/Toast';
import { Figure, MetricValue, RiskBadge, StatusBadge, money, pct, signedMoney } from '../components/Betting/BetUi';
import { BetCard } from '../components/Betting/BetCard';
import type { MoneySettings } from '../domain/betting/coins';
import { STATUS_LABEL } from '../domain/betting/labels';
import { TIPS } from '../components/Betting/tips';
import { FAMILY_LABEL, selectionLabel } from '../domain/betting/markets';
import { betViews, capitalOf, groupPerformance, summarize, type BetView, type CalibrationBin, type GroupRow } from '../domain/betting/metrics';
import { BANDAS, bandaDe, stakeDeFraccion } from '../domain/betting/stakeScale';
import { MIN_BACKTEST_SAMPLE, runBacktest, summarizePredictions, type BacktestRow, type BacktestRun } from '../domain/betting/backtest';
import { unitValue } from '../domain/betting/wallet';
import { useChartStyle } from '../components/Charts/chartStyle';
import { useActiveProfile, useBetting } from '../store/useBetting';
import { useStore } from '../store/useStore';

interface Filtros {
  desde: string;
  hasta: string;
  liga: string;
  mercado: string;
  equipo: string;
  lado: '' | 'local' | 'visitante';
  cuotaMin: string;
  cuotaMax: string;
  riesgo: '' | RiskLevel;
  kellyMin: string;
  kellyMax: string;
  estado: '' | BetStatus;
  tipo: '' | 'simple' | 'ticket';
  ciclo: 'actual' | 'todos';
}

const VACIO: Filtros = { desde: '', hasta: '', liga: '', mercado: '', equipo: '', lado: '', cuotaMin: '', cuotaMax: '', riesgo: '', kellyMin: '', kellyMax: '', estado: '', tipo: '', ciclo: 'actual' };

export function HistoryPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'backtest' ? 'backtest' : 'historial';
  return (
    <div>
      <PageHeader title="Historial y backtesting" description="Tus picks y tickets con sus métricas, y la validación del modelo con partidos ya jugados." />
      <Card>
        <Tabs
          tabs={[
            { id: 'historial', label: 'Historial de apuestas' },
            { id: 'backtest', label: 'Backtesting del modelo' },
          ]}
          active={tab}
          onChange={(t) => setParams(t === 'backtest' ? { tab: t } : {}, { replace: true })}
        />
        {tab === 'historial' ? <BetHistory tipoInicial={(params.get('tipo') as Filtros['tipo']) ?? ''} /> : <ModelBacktest />}
      </Card>
    </div>
  );
}

function BetHistory({ tipoInicial }: { tipoInicial: Filtros['tipo'] }) {
  const hydrated = useBetting((s) => s.hydrated);
  const voidBet = useBetting((s) => s.voidBet);
  const profile = useActiveProfile();
  const leagues = useStore((s) => s.leagues);
  const matches = useStore((s) => s.matches);
  const fixtures = useStore((s) => s.fixtures);
  const cur = profile.settings;
  const [f, setF] = useState<Filtros>({ ...VACIO, tipo: tipoInicial === 'simple' || tipoInicial === 'ticket' ? tipoInicial : '' });
  const [masFiltros, setMasFiltros] = useState(false);

  const todas = useMemo(() => betViews(profile), [profile]);
  const ciclos = useMemo(() => (f.ciclo === 'actual' ? [profile.cycle] : [...new Set(profile.movements.map((m) => m.cycle))]), [f.ciclo, profile]);

  const filtradas = useMemo(() => {
    const num = (s: string) => (s.trim() ? Number(s.replace(',', '.')) : null);
    const [cMin, cMax, kMin, kMax] = [num(f.cuotaMin), num(f.cuotaMax), num(f.kellyMin), num(f.kellyMax)];
    const eq = f.equipo.trim().toLowerCase();
    return todas.filter(
      (b) =>
        ciclos.includes(b.cycle) &&
        (!f.desde || b.date >= f.desde) &&
        (!f.hasta || b.date <= f.hasta) &&
        (!f.liga || b.leagueIds.includes(f.liga)) &&
        (!f.mercado || b.family === f.mercado) &&
        (!eq || b.event.toLowerCase().includes(eq)) &&
        (!f.lado || b.side === f.lado) &&
        (cMin === null || b.odds >= cMin) &&
        (cMax === null || b.odds <= cMax) &&
        (!f.riesgo || b.riskLevel === f.riesgo) &&
        (kMin === null || b.stakeFraction * 100 >= kMin) &&
        (kMax === null || b.stakeFraction * 100 <= kMax) &&
        (!f.estado || b.status === f.estado) &&
        (!f.tipo || b.kind === f.tipo),
    );
  }, [todas, f, ciclos]);

  if (!hydrated)
    return (
      <div className="p-4">
        <Skeleton className="h-48 w-full" />
      </div>
    );

  const s = summarize(filtradas, { capital: capitalOf(profile, ciclos), unit: unitValue(profile.settings) });
  const porMercado = groupPerformance(filtradas, (b) => [{ key: b.family, label: b.familyLabel }]);
  const nombreLiga = new Map(leagues.map((l) => [l.id, l.name]));
  const porLiga = groupPerformance(filtradas, (b) => b.leagueIds.map((id) => ({ key: id, label: nombreLiga.get(id) ?? id })));
  /*
   * Lo mismo por banda de stake: es lo que contesta si apostar fuerte te esta saliendo bien o mal.
   *
   * Sale de `stakeFraction`, que cada apuesta guardo con el bank de SU momento, asi que una de hace tres
   * meses y una de hoy caen en la banda que de verdad les toco aunque el bank haya cambiado.
   */
  const porBanda = groupPerformance(filtradas, (b) => {
    const banda = bandaDe(stakeDeFraccion(b.stakeFraction));
    return [{ key: banda, label: BANDAS[banda].label }];
  });
  const ligasConApuestas = [...new Set(todas.flatMap((b) => b.leagueIds))];
  const set = (patch: Partial<Filtros>) => setF({ ...f, ...patch });
  const secundarios: (keyof Filtros)[] = ['liga', 'mercado', 'equipo', 'lado', 'cuotaMin', 'cuotaMax', 'riesgo', 'kellyMin', 'kellyMax'];
  const activos = (Object.keys(VACIO) as (keyof Filtros)[]).filter((k) => f[k] !== VACIO[k]).length;
  const activosOcultos = secundarios.filter((k) => f[k] !== VACIO[k]).length;

  const anular = (b: BetView) => {
    const error = voidBet(b.kind === 'ticket' ? 'ticket' : 'pick', b.id, matches, fixtures);
    if (error) toast(error, 'error');
    else toast(`${b.label}: anulada, stake devuelto.`);
  };

  const columnas: Column<BetView>[] = [
    { id: 'fecha', header: 'Partido', title: 'Fecha del partido (la primera, en un ticket)', cell: (b) => <span className="tabular-nums">{b.date}</span>, sortValue: (b) => b.date },
    { id: 'tipo', header: 'Tipo', hideOnMobile: true, cell: (b) => (b.kind === 'ticket' ? 'Ticket' : 'Pick'), sortValue: (b) => b.kind },
    {
      id: 'evento',
      header: 'Selección',
      cell: (b) => (
        <span className="block max-w-80 min-w-0">
          <span className="block truncate font-medium">{b.label}</span>
          <span className="block truncate text-[11px] text-muted">{b.event}</span>
        </span>
      ),
      sortValue: (b) => b.label,
    },
    { id: 'cuota', header: 'Cuota', numeric: true, cell: (b) => b.odds.toFixed(2), sortValue: (b) => b.odds },
    {
      id: 'prob',
      header: 'Prob.',
      title: 'Probabilidad estimada al registrar. En tickets no estimables, «rango»',
      numeric: true,
      hideOnMobile: true,
      cell: (b) => (b.probability === null ? <span className="text-faint">rango</span> : pct(b.probability)),
      sortValue: (b) => b.probability,
    },
    { id: 'stake', header: 'Stake', numeric: true, cell: (b) => money(b.stake, cur), sortValue: (b) => b.stake },
    { id: 'kelly', header: '% bankroll', title: 'Stake sobre el bankroll al registrar', numeric: true, hideOnMobile: true, cell: (b) => pct(b.stakeFraction, 2), sortValue: (b) => b.stakeFraction },
    {
      id: 'riesgo',
      header: 'Riesgo',
      hideOnMobile: true,
      cell: (b) => <RiskBadge risk={{ level: b.riskLevel, score: b.riskScore, components: { datos: 0, modelo: 0, mercado: 0, varianza: 0, correlacion: 0 }, notes: [] }} compact />,
      sortValue: (b) => b.riskScore,
    },
    { id: 'estado', header: 'Estado', cell: (b) => <StatusBadge status={b.status} />, sortValue: (b) => b.status },
    {
      id: 'neto',
      header: 'Resultado',
      title: 'Ganancia o pérdida neta',
      numeric: true,
      cell: (b) =>
        b.netProfit === null ? (
          <span className="text-faint">—</span>
        ) : (
          <span className={b.netProfit > 0 ? 'text-positive-text' : b.netProfit < 0 ? 'text-negative-text' : ''}>{signedMoney(b.netProfit, cur)}</span>
        ),
      sortValue: (b) => b.netProfit,
    },
  ];

  const detalle = (b: BetView) => {
    if (b.kind === 'simple') {
      const pick = profile.picks.find((x) => x.id === b.id);
      if (!pick) return null;
      return (
        <div className="space-y-1.5 text-[12px]">
          {pick.resultNote && <p className="font-medium">Resultado: {pick.resultNote}</p>}
          <ul className="space-y-0.5 text-muted">
            {pick.explanation.map((l) => (
              <li key={l}>· {l}</li>
            ))}
          </ul>
        </div>
      );
    }
    const t = profile.tickets.find((x) => x.id === b.id);
    if (!t) return null;
    return (
      <ul className="grid gap-1.5 text-[12px] md:grid-cols-2">
        {t.legs.map((l, i) => (
          <li key={i} className="flex items-center justify-between gap-2 rounded-control border border-border bg-surface px-2.5 py-1.5">
            <span className="min-w-0">
              <span className="block truncate font-medium">{selectionLabel(l.selection, l.homeTeamName, l.awayTeamName)}</span>
              <span className="block truncate text-muted">
                {l.homeTeamName} – {l.awayTeamName} · {l.odds.toFixed(2)}
                {l.resultNote && ` · ${l.resultNote}`}
              </span>
            </span>
            <StatusBadge status={l.status} />
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div>
      <div className="space-y-3 border-b border-border p-4">
        <div className="grid grid-cols-2 items-end gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Field label="Desde">
            <input type="date" className={inputClass} value={f.desde} onChange={(e) => set({ desde: e.target.value })} />
          </Field>
          <Field label="Hasta">
            <input type="date" className={inputClass} value={f.hasta} onChange={(e) => set({ hasta: e.target.value })} />
          </Field>
          <Field label="Tipo">
            <select className={inputClass} value={f.tipo} onChange={(e) => set({ tipo: e.target.value as Filtros['tipo'] })}>
              <option value="">Picks y tickets</option>
              <option value="simple">Picks</option>
              <option value="ticket">Tickets</option>
            </select>
          </Field>
          <Field label="Estado">
            <select className={inputClass} value={f.estado} onChange={(e) => set({ estado: e.target.value as Filtros['estado'] })}>
              <option value="">Todos</option>
              {(['pendiente', 'ganado', 'perdido', 'anulado'] as const).map((x) => (
                <option key={x} value={x}>
                  {STATUS_LABEL[x]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ciclo">
            <select className={inputClass} value={f.ciclo} onChange={(e) => set({ ciclo: e.target.value as Filtros['ciclo'] })}>
              <option value="actual">Actual ({profile.cycle})</option>
              <option value="todos">Todos</option>
            </select>
          </Field>
          <div className="flex items-center gap-1">
            <Button variant={masFiltros ? 'default' : 'ghost'} onClick={() => setMasFiltros(!masFiltros)}>
              <SlidersHorizontal size={14} aria-hidden /> {masFiltros ? 'Menos filtros' : 'Más filtros'}
              {activosOcultos > 0 && <span className="rounded-pill bg-accent px-1.5 text-[11px] text-accent-fg tabular-nums">{activosOcultos}</span>}
            </Button>
            {activos > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setF(VACIO)}>
                Limpiar
              </Button>
            )}
          </div>
        </div>

        {masFiltros && (
          <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 md:grid-cols-3 xl:grid-cols-6">
            <Field label="Competición">
              <select className={inputClass} value={f.liga} onChange={(e) => set({ liga: e.target.value })}>
                <option value="">Todas</option>
                {ligasConApuestas.map((id) => (
                  <option key={id} value={id}>
                    {nombreLiga.get(id) ?? id}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Mercado">
              <select className={inputClass} value={f.mercado} onChange={(e) => set({ mercado: e.target.value })}>
                <option value="">Todos</option>
                {(Object.keys(FAMILY_LABEL) as MarketFamily[]).map((k) => (
                  <option key={k} value={k}>
                    {FAMILY_LABEL[k]}
                  </option>
                ))}
                <option value="combinada">Combinadas</option>
              </select>
            </Field>
            <Field label="Equipo">
              <input type="search" className={inputClass} value={f.equipo} onChange={(e) => set({ equipo: e.target.value })} placeholder="Nombre…" />
            </Field>
            <Field label="Local / visitante">
              <select className={inputClass} value={f.lado} onChange={(e) => set({ lado: e.target.value as Filtros['lado'] })}>
                <option value="">Todos</option>
                <option value="local">Gana local</option>
                <option value="visitante">Gana visitante</option>
              </select>
            </Field>
            <Field label="Riesgo">
              <select className={inputClass} value={f.riesgo} onChange={(e) => set({ riesgo: e.target.value as Filtros['riesgo'] })}>
                <option value="">Todos</option>
                <option value="bajo">Bajo</option>
                <option value="medio">Medio</option>
                <option value="alto">Alto</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Cuota mín.">
                <input className={inputClass} inputMode="decimal" value={f.cuotaMin} onChange={(e) => set({ cuotaMin: e.target.value })} />
              </Field>
              <Field label="Cuota máx.">
                <input className={inputClass} inputMode="decimal" value={f.cuotaMax} onChange={(e) => set({ cuotaMax: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="% bankroll mín.">
                <input className={inputClass} inputMode="decimal" value={f.kellyMin} onChange={(e) => set({ kellyMin: e.target.value })} />
              </Field>
              <Field label="% bankroll máx.">
                <input className={inputClass} inputMode="decimal" value={f.kellyMax} onChange={(e) => set({ kellyMax: e.target.value })} />
              </Field>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-4 border-b border-border p-4 sm:grid-cols-3 lg:grid-cols-6">
        {/* El ROI es LA cifra del historial: el resto la explican. */}
        <Figure label="ROI" tip={TIPS.roi} value={<MetricValue metric={s.roi} format={(v) => pct(v, 2, true)} />} tone={s.roi.value === null ? undefined : s.roi.value >= 0 ? 'positive' : 'negative'} emphasis />
        <Figure label="Yield" tip={TIPS.yield} value={<MetricValue metric={s.yield} format={(v) => pct(v, 2, true)} />} tone={s.yield.value === null ? undefined : s.yield.value >= 0 ? 'positive' : 'negative'} />
        <Figure label="Acierto" tip={TIPS.acierto} value={<MetricValue metric={s.hitRate} format={(v) => `${pct(v)} (${s.won}/${s.resolved})`} />} />
        <Figure label="Beneficio" value={signedMoney(s.netProfit, cur)} tone={s.netProfit > 0 ? 'positive' : s.netProfit < 0 ? 'negative' : undefined} />
        <Figure label="Profit factor" tip={TIPS.profitFactor} value={<MetricValue metric={s.profitFactor} format={(v) => v.toFixed(2)} />} />
        <Figure
          label="Drawdown"
          tip={TIPS.drawdown}
          value={
            <MetricValue
              metric={{ value: s.drawdown.n ? s.drawdown.amount : null, n: s.drawdown.n }}
              format={(v) => (
                <>
                  {money(v, cur)} <span className="text-[11px] font-normal text-muted">{s.drawdown.pct === null ? '' : pct(s.drawdown.pct)}</span>
                </>
              )}
            />
          }
        />
        <Figure label="Brier" tip={TIPS.brier} value={<MetricValue metric={s.brier} format={(v) => v.toFixed(4)} />} />
        <Figure label="Brier de la cuota" tip="El mismo Brier con la probabilidad implícita de las cuotas: la referencia con la que se compara el modelo." value={<MetricValue metric={s.brierMarket} format={(v) => v.toFixed(4)} />} />
        <Figure label="Eficacia vs cuota" tip={TIPS.eficacia} value={<MetricValue metric={s.efficacy} format={(v) => pct(v, 1, true)} />} />
        <Figure label="Log loss" tip={TIPS.logLoss} value={<MetricValue metric={s.logLoss} format={(v) => v.toFixed(4)} />} />
        <Figure label="Calibración (ECE)" tip={TIPS.ece} value={<MetricValue metric={s.ece} format={(v) => `${(v * 100).toFixed(1)} pp`} />} />
        <Figure label="Sharpe adaptado" tip={TIPS.sharpe} value={<MetricValue metric={s.sharpe} format={(v) => v.toFixed(3)} />} />
      </div>

      <div className="grid gap-4 border-b border-border p-4 xl:grid-cols-2">
        <GroupTable title="Rendimiento por mercado" rows={porMercado} cur={cur} />
        <GroupTable title="Rendimiento por competición" rows={porLiga} cur={cur} />
        <div className="xl:col-span-2">
          <GroupTable title="Rendimiento por banda de stake" rows={porBanda} cur={cur} />
          <p className="mt-2 text-[12px] text-muted">
            Cada punto de la escala es un 1 % del bank. Si la banda agresiva (20 o más) tiene peor ROI que la
            conservadora, el tamaño de la apuesta te está restando, no sumando.
          </p>
        </div>
      </div>

      <DataTable
        rows={filtradas}
        columns={columnas}
        getRowId={(b) => b.id}
        pageSize={15}
        initialSort={{ id: 'fecha', dir: 'desc' }}
        renderDetail={detalle}
        // Las 12 columnas no caben en un teléfono: por debajo de `md` cada apuesta es una tarjeta.
        card={(b) => <BetCard b={b} cur={cur} />}
        actions={(b) =>
          b.status === 'pendiente' ? (
            <IconButton
              icon={<Ban size={16} />}
              label="Anular apuesta"
              tooltip="Anular y devolver el stake. Solo se permite cuando los datos no pueden liquidarla"
              tone="danger"
              confirm="Pulsa otra vez para anularla"
              onClick={() => anular(b)}
            />
          ) : null
        }
        empty={
          <span className="inline-flex items-center gap-2">
            <History size={16} aria-hidden /> Ninguna apuesta con estos filtros.
          </span>
        }
      />
    </div>
  );
}

function GroupTable({ title, rows, cur }: { title: string; rows: GroupRow[]; cur: MoneySettings }) {
  const columnas: Column<GroupRow>[] = [
    { id: 'grupo', header: 'Grupo', cell: (r) => <span className="font-medium">{r.label}</span>, sortValue: (r) => r.label },
    { id: 'n', header: 'Apuestas', numeric: true, cell: (r) => r.bets, sortValue: (r) => r.bets },
    { id: 'acierto', header: 'Acierto', title: TIPS.acierto, numeric: true, cell: (r) => <MetricValue metric={r.hitRate} format={(v) => pct(v)} />, sortValue: (r) => r.hitRate.value },
    { id: 'cuota', header: 'Cuota media', numeric: true, hideOnMobile: true, cell: (r) => <MetricValue metric={r.avgOdds} format={(v) => v.toFixed(2)} />, sortValue: (r) => r.avgOdds.value },
    {
      id: 'beneficio',
      header: 'Beneficio',
      numeric: true,
      cell: (r) => <span className={r.netProfit > 0 ? 'text-positive-text' : r.netProfit < 0 ? 'text-negative-text' : ''}>{signedMoney(r.netProfit, cur)}</span>,
      sortValue: (r) => r.netProfit,
    },
    { id: 'yield', header: 'Yield', title: TIPS.yield, numeric: true, cell: (r) => <MetricValue metric={r.yield} format={(v) => pct(v, 1, true)} />, sortValue: (r) => r.yield.value },
  ];
  return (
    <div className="min-w-0">
      <h3 className="t-h3 mb-2">{title}</h3>
      <div className="overflow-hidden rounded-card border border-border">
        <DataTable rows={rows} columns={columnas} getRowId={(r) => r.key} initialSort={{ id: 'n', dir: 'desc' }} maxHeight="20rem" empty="Sin apuestas con estos filtros." />
      </div>
    </div>
  );
}

function ModelBacktest() {
  const leagues = useStore((s) => s.leagues);
  const matches = useStore((s) => s.matches);
  const params = useStore((s) => s.params);
  const profile = useActiveProfile();
  const estilo = useChartStyle();
  const setModelValidation = useBetting((s) => s.setModelValidation);
  const ultima = useBetting((s) => s.modelValidation);
  const [liga, setLiga] = useState('');
  const [progreso, setProgreso] = useState<[number, number] | null>(null);
  const [run, setRun] = useState<BacktestRun | null>(null);
  const [mercado, setMercado] = useState('');

  const ejecutar = async () => {
    const objetivo = liga ? leagues.filter((l) => l.id === liga) : leagues;
    setRun(null);
    setProgreso([0, objetivo.length]);
    const r = await runBacktest({ leagues: objetivo, matches, params, minSample: profile.settings.minSample, onProgress: (d, t) => setProgreso([d, t]) });
    setRun(r);
    setProgreso(null);
    toast(`Backtest terminado: ${r.predictions.length} predicciones en ${r.leagues} ${r.leagues === 1 ? 'competición' : 'competiciones'}.`);
    // Solo el de todas las competiciones alimenta el riesgo de modelo: uno de una liga sería parcial.
    if (!liga) {
      const markets = Object.fromEntries(
        summarizePredictions(r.predictions, (p) => ({ key: p.market, label: p.market })).map((row) => [row.key, { n: row.n, skill: row.skill, ece: row.ece }]),
      );
      setModelValidation({ at: new Date().toISOString(), leagues: r.leagues, markets });
    }
  };

  const porMercado = useMemo(() => (run ? summarizePredictions(run.predictions, (p) => ({ key: p.market, label: p.market })) : []), [run]);
  const porLiga = useMemo(() => {
    if (!run) return [];
    const nombre = new Map(leagues.map((l) => [l.id, l.name]));
    return summarizePredictions(run.predictions, (p) => ({ key: p.leagueId, label: nombre.get(p.leagueId) ?? p.leagueId }));
  }, [run, leagues]);
  const calib = useMemo(() => {
    if (!run) return null;
    const ps = mercado ? run.predictions.filter((p) => p.market === mercado) : run.predictions;
    return summarizePredictions(ps, () => ({ key: 'x', label: mercado || 'Todos los mercados' }))[0] ?? null;
  }, [run, mercado]);

  return (
    <div className="space-y-4 p-4">
      <Callout tone="accent" icon={<FlaskConical size={16} />}>
        Para cada fecha, el modelo se recalcula solo con los partidos anteriores y predice los de ese día; después se compara con el resultado real. Mide{' '}
        <strong>calibración y precisión</strong>, no rentabilidad: no hay cuotas históricas. Usa los parámetros actuales del modelo y la muestra mínima de tu
        perfil ({profile.settings.minSample}). Métricas con al menos {MIN_BACKTEST_SAMPLE} predicciones. El backtest de todas las competiciones se guarda y sube el
        riesgo de modelo de los mercados con skill negativo.
      </Callout>
      {ultima && (
        <p className="text-[12px] text-muted">
          Último backtest guardado: {ultima.at.slice(0, 16).replace('T', ' ')} · {ultima.leagues} competiciones.
        </p>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <Field label="Competición">
          <select className={inputClass} value={liga} onChange={(e) => setLiga(e.target.value)} disabled={progreso !== null}>
            <option value="">Todas ({leagues.length})</option>
            {leagues.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </Field>
        <Button variant="primary" onClick={ejecutar} disabled={matches.length === 0} loading={progreso !== null} title={matches.length === 0 ? 'No hay partidos jugados con los que validar' : undefined}>
          {progreso ? `Calculando… ${progreso[0]}/${progreso[1]}` : (
            <>
              <Play size={14} aria-hidden /> Ejecutar backtest
            </>
          )}
        </Button>
      </div>
      {progreso && (
        <div className="h-1.5 overflow-hidden rounded-pill bg-surface-3" role="progressbar" aria-valuemin={0} aria-valuemax={progreso[1]} aria-valuenow={progreso[0]} aria-label="Progreso del backtest">
          <div className="h-full rounded-pill bg-accent transition-[width]" style={{ width: `${progreso[1] ? (progreso[0] / progreso[1]) * 100 : 0}%` }} />
        </div>
      )}

      {matches.length === 0 && <Empty>No hay partidos cargados con los que validar el modelo.</Empty>}

      {run && (
        <>
          <p className="text-[12px] text-muted">
            {run.evaluated} partidos evaluados · {run.skipped} sin muestra previa suficiente · {run.predictions.length} predicciones en {run.leagues}{' '}
            {run.leagues === 1 ? 'competición' : 'competiciones'}.
          </p>
          {run.predictions.length === 0 ? (
            <Callout tone="warning" icon={<TriangleAlert size={16} />}>
              Datos insuficientes: ningún partido tenía antes la muestra mínima de cada equipo.
            </Callout>
          ) : (
            <>
              <BacktestTable title="Por mercado" first="Mercado" rows={porMercado} />
              <div className="grid gap-4 xl:grid-cols-2">
                <Card
                  title="Calibración"
                  subtitle="Frecuencia real frente a probabilidad media por tramo. Sobre la diagonal, bien calibrado"
                  right={
                    <select className={inputClass} value={mercado} onChange={(e) => setMercado(e.target.value)} aria-label="Mercado de la calibración">
                      <option value="">Todos</option>
                      {porMercado.map((r) => (
                        <option key={r.key} value={r.key}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  }
                >
                  {calib && <CalibrationChart estilo={estilo} bins={calib.bins} />}
                </Card>
                <BacktestTable title="Por competición (todos sus mercados)" first="Competición" rows={porLiga} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function BacktestTable({ title, first, rows }: { title: string; first: string; rows: BacktestRow[] }) {
  const na = <span className="text-[12px] text-faint">Datos insuficientes</span>;
  const columnas: Column<BacktestRow>[] = [
    { id: 'label', header: first, cell: (r) => <span className="font-medium">{r.label}</span>, sortValue: (r) => r.label },
    { id: 'n', header: 'n', title: 'Predicciones evaluadas', numeric: true, cell: (r) => r.n, sortValue: (r) => r.n },
    { id: 'media', header: 'Prob. media', numeric: true, hideOnMobile: true, cell: (r) => pct(r.meanProbability), sortValue: (r) => r.meanProbability },
    { id: 'real', header: 'Frecuencia real', numeric: true, hideOnMobile: true, cell: (r) => pct(r.observed), sortValue: (r) => r.observed },
    { id: 'brier', header: 'Brier', title: TIPS.brier, numeric: true, hideOnMobile: true, cell: (r) => (r.brier === null ? na : r.brier.toFixed(4)), sortValue: (r) => r.brier },
    { id: 'base', header: 'Referencia', title: 'Brier de predecir siempre la frecuencia observada', numeric: true, hideOnMobile: true, cell: (r) => (r.brierBase === null ? na : r.brierBase.toFixed(4)), sortValue: (r) => r.brierBase },
    {
      id: 'skill',
      header: 'Skill',
      title: 'Skill = 1 − Brier / Brier de referencia. Positivo: el modelo aporta información; negativo: peor que la frecuencia base.',
      numeric: true,
      cell: (r) => (r.skill === null ? na : <span className={r.skill >= 0 ? 'text-positive-text' : 'text-negative-text'}>{pct(r.skill, 1, true)}</span>),
      sortValue: (r) => r.skill,
    },
    { id: 'logloss', header: 'Log loss', title: TIPS.logLoss, numeric: true, hideOnMobile: true, cell: (r) => (r.logLoss === null ? na : r.logLoss.toFixed(4)), sortValue: (r) => r.logLoss },
    { id: 'ece', header: 'ECE', title: TIPS.ece, numeric: true, cell: (r) => (r.ece === null ? na : `${(r.ece * 100).toFixed(1)} pp`), sortValue: (r) => r.ece },
  ];
  return (
    <div className="min-w-0">
      <h3 className="t-h3 mb-2">{title}</h3>
      <div className="overflow-hidden rounded-card border border-border">
        <DataTable rows={rows} columns={columnas} getRowId={(r) => r.key} initialSort={{ id: 'n', dir: 'desc' }} maxHeight="28rem" />
      </div>
    </div>
  );
}

function CalibrationChart({ bins, estilo }: { bins: CalibrationBin[]; estilo: ReturnType<typeof useChartStyle> }) {
  const { chart, ejeX, ejeY, tooltip } = estilo;
  const puntos = bins.filter((b) => b.n > 0).map((b) => ({ x: b.meanProbability!, y: b.frequency!, n: b.n }));
  if (!puntos.length) return <Empty>Sin predicciones.</Empty>;
  return (
    <div className="h-64 p-3">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart margin={{ top: 8, right: 16, bottom: 4, left: -8 }}>
          {/* Aqui si van las dos rejillas: se compara contra la diagonal, y una sola direccion no situa el punto. */}
          <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" />
          <XAxis type="number" dataKey="x" domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} {...ejeX} />
          <YAxis type="number" dataKey="y" domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} {...ejeY} />
          <Tooltip
            {...tooltip}
            formatter={(v, name) => [pct(Number(v)), name === 'y' ? 'Frecuencia real' : String(name)]}
            labelFormatter={(v) => `Probabilidad media ${pct(Number(v))}`}
          />
          <Line data={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} dataKey="y" stroke={chart.text} strokeDasharray="4 4" dot={false} isAnimationActive={false} name="Calibración perfecta" />
          <Line data={puntos} dataKey="y" stroke={chart.series[0]} strokeWidth={2} name="y" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
