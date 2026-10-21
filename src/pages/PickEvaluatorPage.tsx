import { useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Calculator, CircleCheck, FlaskConical, Plus, TriangleAlert } from 'lucide-react';
import type { Selection } from '../types/betting';
import { Badge, Button, ButtonLink, Callout, Card, Empty, Field, PageHeader, Skeleton, inputClass } from '../components/ui';
import { TeamLabel } from '../components/TeamLabel';
import { LeagueLabel } from '../components/LeagueLabel';
import { RoundLabel } from '../components/RoundLabel';
import { KickoffTime } from '../components/Kickoff';
import { toast } from '../components/Toast';
import { FixturePicker, LineLadder, MarketPicker } from '../components/Betting/Pickers';
import { ModelPickCard } from '../components/Betting/ModelPick';
import { Amount, Figure, KellyMeter, OddsVsProbability, QualityBadge, RiskBadge, StatusBadge, money, pct, pp, signedMoney } from '../components/Betting/BetUi';
import { StakeBadge } from '../components/Betting/StakeScale';
import { coinsInputValue, formatSc, parseCoinsInput, type MoneySettings } from '../domain/betting/coins';
import { COMPONENT_LABEL, CORRELATION_LABEL } from '../domain/betting/labels';
import { TIPS } from '../components/Betting/tips';
import { useFixtureData, useModelPick } from '../components/Betting/useFixtureData';
import { evaluatePick, marketContextOf, simulateOutcome } from '../domain/betting/evaluation';
import { limitText } from '../domain/betting/kelly';
import { validateStake } from '../domain/betting/wallet';
import { canPush, estimateMarket, parseSelectionKey, selectionKey, selectionLabel } from '../domain/betting/markets';
import { useActiveProfile, useBetting } from '../store/useBetting';

const DEFECTO: Selection = { market: 'goles', side: 'over', line: 2.5 };

const ESTADO_STAKE = {
  recomendado: { texto: 'Stake recomendado', tono: 'positive' },
  'sin-valor': { texto: 'Sin valor estadístico suficiente', tono: 'neutral' },
  bloqueado: { texto: 'Bloqueado por gestión de riesgo', tono: 'negative' },
  'datos-insuficientes': { texto: 'Datos insuficientes', tono: 'neutral' },
} as const;

/** Paso numerado del formulario: guía el orden sin obligar a seguirlo. */
function Paso({ n, titulo, children }: { n: number; titulo: string; children: ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h3 className="t-h3 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-soft text-[11px] text-accent-text tabular-nums">{n}</span>
        {titulo}
      </h3>
      {children}
    </section>
  );
}

export function PickEvaluatorPage() {
  const [params, setParams] = useSearchParams();
  const hydrated = useBetting((s) => s.hydrated);
  const placePick = useBetting((s) => s.placePick);
  const addDraftLeg = useBetting((s) => s.addDraftLeg);
  const profile = useActiveProfile();
  const validation = useBetting((s) => s.modelValidation);
  const getData = useFixtureData();
  const cur = profile.settings;

  const fixtureId = params.get('f') ?? '';
  const claveMercado = params.get('m') ?? '';
  const selection = useMemo(() => parseSelectionKey(claveMercado) ?? DEFECTO, [claveMercado]);
  const [oddsText, setOddsText] = useState('');
  const [stakeText, setStakeText] = useState('');
  const [stakeTocado, setStakeTocado] = useState(false);
  const [simular, setSimular] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setQuery = (f: string, s: Selection) => {
    const key = selectionKey(s);
    setParams(f ? { f, m: key } : { m: key }, { replace: true });
    setError(null);
  };

  const data = useMemo(() => (fixtureId ? getData(fixtureId) : null), [fixtureId, getData]);
  const pick = useModelPick(data);
  const odds = oddsText.trim() === '' ? Number.NaN : Number(oddsText.replace(',', '.'));
  const ev = useMemo(
    () => (data ? evaluatePick({ data, selection, odds, profile, validation: validation?.markets }) : null),
    [data, selection, odds, profile, validation],
  );
  const estimar = useMemo(() => {
    if (!data) return undefined;
    const ctx = marketContextOf(data, cur.minSample);
    return (s: Selection) => estimateMarket(s, ctx);
  }, [data, cur.minSample]);

  const recomendado = ev?.stake.stake ?? 0;
  // Sin tocar el campo, el stake es exactamente el recomendado (en SC); al escribir, lo escrito en monedas.
  const stake = stakeTocado ? parseCoinsInput(stakeText, cur.coinValue) : recomendado;
  const stakeError = validateStake(stake, cur.coinValue);
  const stakeValido = stakeError === null;

  const recientes = profile.picks.filter((x) => x.cycle === profile.cycle).slice(-5).reverse();
  const home = data?.fixture.homeTeamName ?? 'Local';
  const away = data?.fixture.awayTeamName ?? 'Visitante';

  if (!hydrated) {
    return (
      <>
        <PageHeader title="Evaluador de picks" />
        <Card>
          <div className="space-y-3 p-4">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
        </Card>
      </>
    );
  }

  const registrar = () => {
    if (!data || !ev) return;
    const r = placePick({ data, selection, odds, stake });
    if (!r.ok) return setError(r.error);
    setError(null);
    toast(`Pick registrado: ${ev.label} a ${odds.toFixed(2)} con ${money(stake, cur)}.`, 'success', { label: 'Ver historial', to: '/historial?tipo=simple' });
    setStakeTocado(false);
    setStakeText('');
    setSimular(false);
  };

  const alTicket = () => {
    const e = addDraftLeg({ fixtureId, selection, odds: Number.isFinite(odds) ? odds : null });
    if (e) toast(e, 'error');
    else toast(`${selectionLabel(selection, home, away)} añadido al ticket.`, 'success', { label: 'Ver ticket', to: '/tickets' });
  };

  const estadoValor = !ev
    ? null
    : ev.estimate.probability === null
      ? { texto: 'Datos insuficientes', tono: 'neutral' as const }
      : ev.oddsError
        ? { texto: 'Falta una cuota válida', tono: 'neutral' as const }
        : ev.odds?.state === 'valor'
          ? { texto: 'Valor potencial', tono: 'positive' as const }
          : { texto: 'Sin valor', tono: 'neutral' as const };

  const oddsError = oddsText.trim() !== '' && ev?.oddsError ? ev.oddsError : null;
  const conDevolucion = canPush(selection);

  return (
    <div>
      <PageHeader
        title="Evaluador de picks"
        description="El pick del modelo para el partido y, con la cuota que te ofrecen, su probabilidad frente a la cuota, Kelly, límites de riesgo y simulación en moneda virtual. Las probabilidades son estimaciones, no hechos."
      />
      {/* grid-cols-1 = minmax(0, 1fr): sin él, el desplegable de partidos ensancha la columna en móvil. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <Card>
            <div className="space-y-5 p-4">
              <Paso n={1} titulo="Partido">
                <FixturePicker value={fixtureId} onChange={(f) => setQuery(f, selection)} />
              </Paso>

              <Paso n={2} titulo="Mercado">
                <MarketPicker value={selection} onChange={(s) => setQuery(fixtureId, s)} homeName={home} awayName={away} estimate={estimar} />
              </Paso>

              <Paso n={3} titulo="Cuota y stake">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Cuota decimal" error={oddsError} hint={!oddsError ? 'La introduces tú: ninguna cuota se rellena sola.' : undefined}>
                    <input
                      className={inputClass}
                      inputMode="decimal"
                      placeholder="p. ej. 1.85"
                      value={oddsText}
                      aria-invalid={oddsError ? true : undefined}
                      onChange={(e) => {
                        setOddsText(e.target.value);
                        setError(null);
                      }}
                    />
                  </Field>
                  <Field
                    label="Stake (monedas)"
                    error={stakeTocado && stakeText.trim() !== '' ? stakeError : null}
                    hint={stakeValido ? `= ${formatSc(stake, cur.currencyCode)}` : `1 moneda = ${formatSc(cur.coinValue, cur.currencyCode)}`}
                  >
                    <input
                      className={inputClass}
                      inputMode="decimal"
                      value={stakeTocado ? stakeText : recomendado > 0 ? coinsInputValue(recomendado, cur.coinValue) : ''}
                      onChange={(e) => {
                        setStakeText(e.target.value);
                        setStakeTocado(true);
                      }}
                      placeholder="Sin stake recomendado"
                    />
                  </Field>
                </div>
                {ev && ev.stake.status === 'recomendado' && (
                  <p className="text-[12px] text-muted">
                    Recomendado <strong className="text-text">{money(ev.stake.stake, cur)}</strong> · máximo {money(ev.stake.maxAllowedStake, cur)}
                    {stakeValido && stake > ev.stake.stake && <span className="text-warning-text"> · por encima de la fracción de Kelly elegida</span>}
                    {stakeTocado && (
                      <button
                        type="button"
                        className="ml-1.5 rounded font-medium text-accent-text hover:underline"
                        onClick={() => {
                          setStakeTocado(false);
                          setStakeText('');
                        }}
                      >
                        Usar el recomendado
                      </button>
                    )}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button variant="primary" onClick={registrar} disabled={!ev || ev.stake.status !== 'recomendado' || !stakeValido} title={ev && ev.stake.status !== 'recomendado' ? ev.stake.reasons[0] ?? ESTADO_STAKE[ev.stake.status].texto : undefined}>
                    <CircleCheck size={14} aria-hidden /> Registrar pick
                  </Button>
                  <Button onClick={() => setSimular(true)} disabled={!ev || !!ev.oddsError || !stakeValido} title="Muestra cómo quedaría tu bankroll si gana o si pierde, sin registrar nada">
                    <FlaskConical size={14} aria-hidden /> Simular
                  </Button>
                  {data && (
                    <Button variant="ghost" onClick={alTicket} disabled={conDevolucion} title={conDevolucion ? 'Esta línea puede devolver el stake: los tickets todavía no combinan devoluciones' : 'Añadir esta selección al borrador del ticket combinado'}>
                      <Plus size={14} aria-hidden /> Al ticket
                    </Button>
                  )}
                </div>
                {error && (
                  <Callout tone="negative" icon={<TriangleAlert size={16} />}>
                    {error}
                  </Callout>
                )}
              </Paso>
            </div>
          </Card>

          <Card title="Últimos picks" right={<ButtonLink to="/historial?tipo=simple" size="sm" variant="ghost">Ver historial</ButtonLink>}>
            {recientes.length === 0 ? (
              <Empty>Aún no has registrado picks en este ciclo.</Empty>
            ) : (
              <ul className="divide-y divide-border">
                {recientes.map((x) => (
                  <li key={x.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-[12px]">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{selectionLabel(x.selection, x.homeTeamName, x.awayTeamName)}</span>
                      <span className="block truncate text-muted">
                        {x.homeTeamName} – {x.awayTeamName} · {x.odds.toFixed(2)} · {money(x.stake, cur)}
                      </span>
                    </span>
                    <StatusBadge status={x.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          {!ev || !data ? (
            <Card>
              <Empty icon={<Calculator />} title="Elige un partido para empezar">
                Verás el pick del modelo para el partido y la probabilidad de cada mercado. Con tu cuota, además, el edge, Kelly, el stake recomendado y el riesgo.
              </Empty>
            </Card>
          ) : (
            <>
              {pick && <ModelPickCard result={pick} fixtureId={fixtureId} onSelect={(s) => setQuery(fixtureId, s)} />}

              <Card
                title={
                  <span className="flex flex-wrap items-center gap-2">
                    <TeamLabel teamId={data.fixture.homeTeamId} name={home} />
                    <span className="text-faint">vs</span>
                    <TeamLabel teamId={data.fixture.awayTeamId} name={away} />
                  </span>
                }
                subtitle={
                  <span className="flex flex-wrap items-center gap-x-2">
                    <LeagueLabel leagueId={data.fixture.leagueId} size="sm" /> · <KickoffTime match={data.fixture} variant="linea" /> · <RoundLabel match={data.fixture} /> ·{' '}
                    <Link to={`/proyecciones/${encodeURIComponent(fixtureId)}`} className="rounded text-accent-text hover:underline">
                      ficha del partido
                    </Link>
                  </span>
                }
                right={estadoValor && <Badge tone={estadoValor.tono}>{estadoValor.texto}</Badge>}
              >
                <div className="grid grid-cols-2 gap-x-4 gap-y-4 p-4 sm:grid-cols-4">
                  <Figure label="Mercado" value={<span className="text-[13px] leading-snug">{ev.label}</span>} />
                  <Figure label="Cuota" value={Number.isFinite(odds) ? odds.toFixed(2) : '—'} />
                  <Figure
                    label="Prob. estimada"
                    tip={TIPS.probEstimada}
                    value={ev.estimate.probability === null ? <span className="text-[12px] text-faint">Datos insuficientes</span> : pct(ev.estimate.probability, 2)}
                    hint={ev.estimate.push > 0 ? 'sin contar la devolución' : undefined}
                  />
                  <Figure label="Prob. implícita" tip={TIPS.probImplicita} value={ev.odds ? pct(ev.odds.impliedProbability, 2) : '—'} />
                  {/* El edge es lo que decide si la apuesta vale: la cifra del bloque. */}
                  <Figure label="Edge" tip={TIPS.edge} value={pp(ev.odds?.edge)} tone={ev.odds?.edge == null ? undefined : ev.odds.edge >= 0 ? 'positive' : 'negative'} emphasis />
                  <Figure
                    label="Cuota justa"
                    tip={TIPS.cuotaJusta}
                    value={ev.odds?.fairOdds?.toFixed(2) ?? (ev.estimate.probability ? (1 / ev.estimate.probability).toFixed(2) : '—')}
                    hint={ev.odds?.oddsDiff != null ? `diferencia ${ev.odds.oddsDiff >= 0 ? '+' : ''}${ev.odds.oddsDiff.toFixed(2)}` : undefined}
                  />
                  <Figure label="Cuota mínima" tip={TIPS.cuotaMinima} value={ev.odds?.minAcceptableOdds?.toFixed(2) ?? '—'} />
                  <Figure
                    label="Valor esperado"
                    tip={TIPS.valorEsperado}
                    value={ev.odds?.expectedValue == null ? '—' : pct(ev.odds.expectedValue, 2, true)}
                    tone={ev.odds?.expectedValue == null ? undefined : ev.odds.expectedValue >= 0 ? 'positive' : 'negative'}
                  />
                </div>
                {ev.estimate.probability !== null && ev.estimate.push > 0 && (
                  <div className="border-t border-border px-4 py-3">
                    <p className="mb-2 text-[12px] font-medium">Resultado posible con esta línea</p>
                    <Desglose probability={ev.estimate.probability} push={ev.estimate.push} />
                  </div>
                )}
                {ev.odds && ev.estimate.probability !== null && (
                  <div className="border-t border-border px-4 py-3">
                    <OddsVsProbability estimated={ev.estimate.probability} implied={ev.odds.impliedProbability} />
                  </div>
                )}
                {(ev.estimate.reason || ev.oddsError || ev.odds?.reason) && (
                  <p className="border-t border-border px-4 py-2.5 text-[12px] text-muted">{ev.estimate.reason ?? ev.oddsError ?? ev.odds?.reason}</p>
                )}
              </Card>

              <Card title="Todas las líneas del mercado" subtitle="Probabilidad del modelo y cuota justa (1 / probabilidad). ↺ = probabilidad de devolución. Pulsa una celda para evaluarla">
                {estimar && <LineLadder value={selection} onChange={(s) => setQuery(fixtureId, s)} estimate={estimar} homeName={home} awayName={away} />}
              </Card>

              <div className="grid gap-4 xl:grid-cols-2">
                <Card title="Kelly y stake" right={<Badge tone={ESTADO_STAKE[ev.stake.status].tono}>{ESTADO_STAKE[ev.stake.status].texto}</Badge>}>
                  <div className="space-y-4 p-4">
                    {ev.stake.kellyFull !== null && ev.stake.kellyFull > 0 ? (
                      <KellyMeter full={ev.stake.kellyFull} applied={ev.bankroll > 0 ? ev.stake.stake / ev.bankroll : null} cap={profile.settings.maxKellyPct} />
                    ) : (
                      <p className="text-[13px] text-muted">
                        {ev.stake.kellyFull !== null ? `Kelly ${pct(ev.stake.kellyFull, 2)}: ` : ''}no se recomienda stake.
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <Figure label="Kelly completo" tip={TIPS.kellyCompleto} value={pct(ev.stake.kellyFull, 2)} hint="solo análisis" />
                      <Figure label="Kelly × fracción" tip={TIPS.kellyAplicado} value={pct(ev.stake.kellyApplied, 2)} hint={`fracción ${ev.stake.multiplier}, antes de topes`} />
                      <Figure
                        label="Stake recomendado"
                        tip={TIPS.stake}
                        value={ev.stake.stake > 0 ? <Amount sc={ev.stake.stake} s={cur} stacked /> : '—'}
                        // El mismo importe en la escala 1–100, para compararlo con otras apuestas sin mirar el bank.
                        hint={
                          ev.stake.stake > 0 ? (
                            <StakeBadge importe={ev.stake.stake} bank={ev.bankroll}>
                              {ev.stake.bindingLimit && ev.stake.bindingLimit !== 'kelly' && (
                                <span className="text-[11px] text-faint">limitado por {limitText(ev.stake.bindingLimit)}</span>
                              )}
                            </StakeBadge>
                          ) : undefined
                        }
                      />
                      <Figure label="Bankroll" value={<Amount sc={ev.bankroll} s={cur} stacked />} hint={`disponible ${money(ev.available, cur)}`} />
                    </div>
                    {ev.stake.reasons.length > 0 && (
                      <ul className="space-y-1 text-[12px] text-muted">
                        {ev.stake.reasons.map((r) => (
                          <li key={r}>· {r}</li>
                        ))}
                      </ul>
                    )}
                    <p className="text-[11px] text-faint">
                      Exposición pendiente: partido {money(ev.exposure.match, cur)} · competición {money(ev.exposure.competition, cur)} · día {money(ev.exposure.day, cur)}
                    </p>
                  </div>
                </Card>

                <Card title="Riesgo y datos" right={ev.risk && <RiskBadge risk={ev.risk} />}>
                  <div className="space-y-3 p-4">
                    {ev.risk ? (
                      <div className="space-y-2">
                        {Object.entries(ev.risk.components).map(([k, v]) => (
                          <div key={k} className="flex items-center gap-2 text-[12px]">
                            <span className="w-24 text-muted">{COMPONENT_LABEL[k as keyof typeof COMPONENT_LABEL]}</span>
                            <span className="h-1.5 flex-1 overflow-hidden rounded-pill bg-surface-3" aria-hidden>
                              <span className={`block h-full rounded-pill ${v >= 65 ? 'bg-negative' : v >= 40 ? 'bg-warning' : 'bg-positive'}`} style={{ width: `${v}%` }} />
                            </span>
                            <span className="w-8 text-right tabular-nums">{v}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[13px] text-muted">El riesgo se calcula con una probabilidad y una cuota válidas.</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <QualityBadge quality={ev.estimate.dataQuality} />
                      <Badge title={TIPS.confianza}>Confianza {ev.estimate.confidence.toFixed(1)}/10</Badge>
                      {ev.correlation !== 'ninguna' && <Badge tone="warning">Correlación {CORRELATION_LABEL[ev.correlation]}</Badge>}
                    </div>
                    <p className="text-[11px] text-faint">
                      Muestra {ev.estimate.sampleHome} · {ev.estimate.sampleAway}
                      {(ev.estimate.historySampleHome > 0 || ev.estimate.historySampleAway > 0) &&
                        ` (+${ev.estimate.historySampleHome} · +${ev.estimate.historySampleAway} de antes)`}
                      {ev.estimate.coverage !== null && ` · cobertura ${pct(ev.estimate.coverage, 0)}`}
                      {ev.estimate.leagueSample !== null && ` · ${ev.estimate.leagueSample} partidos de liga`}
                    </p>
                  </div>
                </Card>
              </div>

              {simular && Number.isFinite(odds) && stakeValido && (
                <Card title="Simulación" subtitle="No se registra: solo muestra el impacto sobre tu bankroll virtual">
                  <SimulationBlock bankroll={ev.bankroll} stake={stake} odds={odds} cur={cur} probability={ev.estimate.probability} push={ev.estimate.push} />
                </Card>
              )}

              <Card title="Explicación estadística">
                <ul className="space-y-1.5 p-4 text-[13px]">
                  {ev.explanation.map((l) => (
                    <li key={l} className="flex gap-2">
                      <span className="text-faint">·</span>
                      <span>{l}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Gana, se devuelve o pierde: las tres salidas de una línea entera, en una barra. */
function Desglose({ probability, push }: { probability: number; push: number }) {
  const gana = probability * (1 - push);
  const pierde = (1 - probability) * (1 - push);
  return (
    <div className="space-y-1.5">
      <div className="flex h-2.5 overflow-hidden rounded-pill bg-surface-3" aria-hidden>
        <div className="bg-positive" style={{ width: `${gana * 100}%` }} />
        <div className="bg-border-strong" style={{ width: `${push * 100}%` }} />
        <div className="bg-negative" style={{ width: `${pierde * 100}%` }} />
      </div>
      <div className="flex flex-wrap justify-between gap-x-3 text-[11px] tabular-nums">
        <span className="text-positive-text">Gana {pct(gana)}</span>
        <span className="text-muted">Se devuelve {pct(push)}</span>
        <span className="text-negative-text">Pierde {pct(pierde)}</span>
      </div>
    </div>
  );
}

export function SimulationBlock({
  bankroll,
  stake,
  odds,
  cur,
  probability,
  push = 0,
}: {
  bankroll: number;
  stake: number;
  odds: number;
  cur: MoneySettings;
  probability: number | null;
  /** Probabilidad de devolución del stake (líneas enteras). */
  push?: number;
}) {
  const s = simulateOutcome(bankroll, stake, odds, cur.coinValue);
  const estimado = (x: number) => (probability !== null ? ` · ${pct(x)} estimado` : '');
  return (
    <div className={`grid gap-3 p-4 ${push > 0 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
      <div className="rounded-card bg-positive-soft p-3">
        <div className="text-[11px] font-medium text-positive-text uppercase">Si gana{estimado((probability ?? 0) * (1 - push))}</div>
        <div className="mt-1 text-[13px]">
          Ganancia neta <strong>{signedMoney(s.netWin, cur)}</strong>
        </div>
        <div className="text-[12px] text-muted">Retorno bruto {money(s.grossReturn, cur)}</div>
        <div className="mt-1 text-lg font-semibold tabular-nums">
          <Amount sc={s.bankrollIfWin} s={cur} stacked />
        </div>
      </div>
      {push > 0 && (
        <div className="rounded-card bg-neutral-soft p-3">
          <div className="text-[11px] font-medium text-neutral-text uppercase">Si se devuelve{estimado(push)}</div>
          <div className="mt-1 text-[13px]">
            Sin ganancia ni pérdida <strong>{signedMoney(0, cur)}</strong>
          </div>
          <div className="text-[12px] text-muted">Vuelve el stake entero</div>
          <div className="mt-1 text-lg font-semibold tabular-nums">
            <Amount sc={bankroll} s={cur} stacked />
          </div>
        </div>
      )}
      <div className="rounded-card bg-negative-soft p-3">
        <div className="text-[11px] font-medium text-negative-text uppercase">Si pierde{estimado((1 - (probability ?? 0)) * (1 - push))}</div>
        <div className="mt-1 text-[13px]">
          Pérdida <strong>{signedMoney(-stake, cur)}</strong>
        </div>
        <div className="text-[12px] text-muted">El stake no vuelve</div>
        <div className="mt-1 text-lg font-semibold tabular-nums">
          <Amount sc={s.bankrollIfLose} s={cur} stacked />
        </div>
      </div>
    </div>
  );
}
