import { useMemo, useState } from 'react';
import { ChevronDown, CircleCheck, FlaskConical, Layers, Plus, Trash2, TriangleAlert } from 'lucide-react';
import type { Selection } from '../types/betting';
import { Badge, Button, ButtonLink, Callout, Card, Empty, Field, IconButton, PageHeader, Skeleton, inputClass } from '../components/ui';
import { InfoTip } from '../components/InfoTip';
import { KickoffTime } from '../components/Kickoff';
import { toast } from '../components/Toast';
import { FixturePicker, MarketPicker } from '../components/Betting/Pickers';
import { Amount, Figure, QualityBadge, RiskBadge, StatusBadge, money, pct, signedMoney } from '../components/Betting/BetUi';
import { coinsInputValue, formatSc, parseCoinsInput } from '../domain/betting/coins';
import { CORRELATION_LABEL } from '../domain/betting/labels';
import { TIPS } from '../components/Betting/tips';
import { useFixtureData } from '../components/Betting/useFixtureData';
import { evaluateTicket, marketContextOf, simulateOutcome, type DataContext } from '../domain/betting/evaluation';
import { limitText } from '../domain/betting/kelly';
import { validateStake } from '../domain/betting/wallet';
import { canPush, estimateMarket, selectionLabel } from '../domain/betting/markets';
import { useActiveProfile, useBetting } from '../store/useBetting';
import { SimulationBlock } from './PickEvaluatorPage';

const METODO = {
  independiente: 'Producto de probabilidades (partidos distintos, supuesto de independencia)',
  exacta: 'Probabilidad conjunta exacta del modelo para las selecciones del mismo partido',
  cotas: 'No estimable: rango válido para cualquier dependencia (cotas de Fréchet)',
} as const;

export function TicketsPage() {
  const hydrated = useBetting((s) => s.hydrated);
  const profile = useActiveProfile();
  const { addDraftLeg, setDraftOdds, removeDraftLeg, clearDraft, placeTicket } = useBetting();
  const getData = useFixtureData();
  const cur = profile.settings;

  const [fixtureId, setFixtureId] = useState('');
  const [selection, setSelection] = useState<Selection>({ market: 'goles', side: 'over', line: 1.5 });
  const [oddsText, setOddsText] = useState('');
  const [offeredText, setOfferedText] = useState('');
  const [stakeText, setStakeText] = useState('');
  const [stakeTocado, setStakeTocado] = useState(false);
  const [simular, setSimular] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);

  const draft = profile.ticketDraft;
  const conDatos = draft.map((l) => ({ leg: l, data: getData(l.fixtureId) }));
  const perdidos = conDatos.filter((x) => !x.data);
  const offered = offeredText.trim() ? Number(offeredText.replace(',', '.')) : null;

  const ev = useMemo(() => {
    if (!draft.length || perdidos.length) return null;
    return evaluateTicket({
      legs: conDatos.map((x) => ({ data: x.data as DataContext, selection: x.leg.selection, odds: x.leg.odds })),
      profile,
      offeredOdds: offered,
    });
    // conDatos se deriva de draft y getData.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, getData, profile, offered]);

  const data = useMemo(() => (fixtureId ? getData(fixtureId) : null), [fixtureId, getData]);
  const estimar = useMemo(() => {
    if (!data) return undefined;
    const ctx = marketContextOf(data, cur.minSample);
    return (s: Selection) => estimateMarket(s, ctx);
  }, [data, cur.minSample]);

  const recomendado = ev?.stake?.stake ?? 0;
  // Sin tocar el campo, el stake es exactamente el recomendado (en SC); al escribir, lo escrito en monedas.
  const stake = stakeTocado ? parseCoinsInput(stakeText, cur.coinValue) : recomendado;
  const stakeError = validateStake(stake, cur.coinValue);
  const stakeValido = stakeError === null;

  if (!hydrated) {
    return (
      <>
        <PageHeader title="Tickets combinados" />
        <Card>
          <div className="p-4">
            <Skeleton className="h-40 w-full" />
          </div>
        </Card>
      </>
    );
  }

  const tickets = [...profile.tickets].reverse().slice(0, 12);
  const odds = oddsText.trim() ? Number(oddsText.replace(',', '.')) : null;

  const añadir = () => {
    const e = addDraftLeg({ fixtureId, selection, odds: odds !== null && Number.isFinite(odds) ? odds : null });
    if (e) return toast(e, 'error');
    toast(`${selectionLabel(selection, data?.fixture.homeTeamName, data?.fixture.awayTeamName)} añadido al ticket.`);
    setOddsText('');
  };

  const registrar = () => {
    if (!ev || !ev.combinedOdds) return;
    const r = placeTicket({
      legs: conDatos.map((x) => ({ data: x.data as DataContext, selection: x.leg.selection, odds: x.leg.odds! })),
      offeredOdds: offered,
      stake,
    });
    if (!r.ok) return setError(r.error);
    setError(null);
    toast(`Ticket registrado con ${money(stake, cur)} a cuota ${ev.combinedOdds.toFixed(2)}.`, 'success', { label: 'Ver historial', to: '/historial?tipo=ticket' });
    setStakeTocado(false);
    setStakeText('');
    setOfferedText('');
    setSimular(false);
  };

  const j = ev?.joint;
  const falla = j ? (j.probability !== null ? pct(1 - j.probability) : `${pct(1 - j.high)} – ${pct(1 - j.low)}`) : '—';
  const combinada = j ? (j.probability !== null ? pct(j.probability, 2) : `${pct(j.low, 2)} – ${pct(j.high, 2)}`) : '—';

  return (
    <div>
      <PageHeader
        title="Tickets combinados"
        description="Combina selecciones con su probabilidad conjunta real: del mismo partido no se multiplican a ciegas. Moneda virtual, sin dinero real."
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <Card title="Añadir selección" subtitle="Cada selección con la cuota que te ofrecen">
            <div className="grid gap-4 p-4">
              <FixturePicker value={fixtureId} onChange={setFixtureId} />
              <MarketPicker
                value={selection}
                onChange={setSelection}
                homeName={data?.fixture.homeTeamName}
                awayName={data?.fixture.awayTeamName}
                estimate={estimar}
                allowPush={false}
              />
              <Field label="Cuota decimal" hint="Puedes dejarla vacía y escribirla después en el ticket.">
                <input className={inputClass} inputMode="decimal" placeholder="p. ej. 1.40" value={oddsText} onChange={(e) => setOddsText(e.target.value)} />
              </Field>
              <Button onClick={añadir} disabled={!fixtureId || canPush(selection)} title={!fixtureId ? 'Elige antes un partido' : undefined}>
                <Plus size={14} aria-hidden /> Añadir al ticket
              </Button>
            </div>
          </Card>

          <Card title="Tickets registrados" right={<ButtonLink to="/historial?tipo=ticket" size="sm" variant="ghost">Ver historial</ButtonLink>}>
            {tickets.length === 0 ? (
              <Empty>Aún no has registrado tickets.</Empty>
            ) : (
              <ul className="divide-y divide-border">
                {tickets.map((t) => (
                  <li key={t.id} className="px-4 py-2.5 text-[12px]">
                    <div className="flex items-center justify-between gap-2">
                      <IconButton
                        icon={<ChevronDown size={16} className={`transition-transform ${abierto === t.id ? 'rotate-180' : ''}`} />}
                        label={abierto === t.id ? 'Ocultar selecciones' : 'Ver selecciones'}
                        size="sm"
                        expanded={abierto === t.id}
                        onClick={() => setAbierto(abierto === t.id ? null : t.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">
                          Ticket #{String(t.number).padStart(3, '0')} · {t.legs.length} selecciones · {t.combinedOdds.toFixed(2)}
                        </span>
                        <span className="block text-muted">
                          {money(t.stake, cur)}
                          {t.netProfit !== null && ` · ${signedMoney(t.netProfit, cur)}`}
                        </span>
                      </span>
                      <StatusBadge status={t.status} />
                    </div>
                    {abierto === t.id && (
                      <ul className="mt-2 space-y-1 rounded-control bg-surface-2 p-2">
                        {t.legs.map((l, i) => (
                          <li key={i} className="flex items-center justify-between gap-2">
                            <span className="min-w-0">
                              <span className="block truncate">{selectionLabel(l.selection, l.homeTeamName, l.awayTeamName)}</span>
                              <span className="block truncate text-faint">
                                {l.homeTeamName} – {l.awayTeamName} · {l.odds.toFixed(2)}
                                {l.resultNote && ` · ${l.resultNote}`}
                              </span>
                            </span>
                            <StatusBadge status={l.status} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          <Card
            title={
              <span className="flex items-center gap-2">
                <Layers size={14} className="text-faint" aria-hidden /> Ticket #{String(profile.ticketCounter + 1).padStart(3, '0')}
              </span>
            }
            subtitle="Borrador: no se registra hasta que pulses «Registrar ticket»"
            right={
              draft.length > 0 && (
                <Button size="sm" variant="ghost" onClick={clearDraft} confirm="¿Vaciar? Pulsa otra vez">
                  Vaciar
                </Button>
              )
            }
          >
            {draft.length === 0 ? (
              <Empty icon={<Layers />} title="Ticket vacío">
                Añade al menos dos selecciones desde aquí, desde el evaluador o desde la ficha de un partido.
              </Empty>
            ) : (
              <div className="overflow-x-auto">
                <table className="data">
                  <thead>
                    <tr>
                      <th scope="col" className="num">#</th>
                      <th scope="col">Selección</th>
                      <th scope="col" className="num">Cuota</th>
                      <th scope="col" className="num">Prob. estimada</th>
                      <th scope="col" className="hidden md:table-cell">Datos</th>
                      <th scope="col">Riesgo</th>
                      <th scope="col" className="actions">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {conDatos.map(({ leg, data: d }, i) => {
                      const le = ev?.legs[i];
                      const nombre = d ? selectionLabel(leg.selection, d.fixture.homeTeamName, d.fixture.awayTeamName) : `selección ${i + 1}`;
                      return (
                        <tr key={`${leg.fixtureId}-${i}`}>
                          <td className="num text-muted">{i + 1}</td>
                          <td>
                            {d ? (
                              <span className="block">
                                <span className="block font-medium">{nombre}</span>
                                <span className="block text-[11px] text-muted">
                                  {d.fixture.homeTeamName} – {d.fixture.awayTeamName} · <KickoffTime match={d.fixture} variant="linea" />
                                </span>
                              </span>
                            ) : (
                              <span className="text-negative-text">El partido ya no está pendiente</span>
                            )}
                          </td>
                          <td className="num">
                            <input
                              aria-label={`Cuota de ${nombre}`}
                              className={`${inputClass} w-20 text-right`}
                              inputMode="decimal"
                              defaultValue={leg.odds ?? ''}
                              placeholder="—"
                              onBlur={(e) => {
                                const v = e.target.value.trim() ? Number(e.target.value.replace(',', '.')) : null;
                                setDraftOdds(i, v !== null && Number.isFinite(v) ? v : null);
                              }}
                            />
                          </td>
                          <td className="num">
                            {le?.estimate.probability != null ? pct(le.estimate.probability) : <span className="text-[12px] text-faint">{le ? 'Datos insuficientes' : '—'}</span>}
                          </td>
                          <td className="hidden md:table-cell">{le && <QualityBadge quality={le.estimate.dataQuality} />}</td>
                          <td>{le?.risk ? <RiskBadge risk={le.risk} compact /> : '—'}</td>
                          <td className="actions">
                            <IconButton icon={<Trash2 size={16} />} label={`Quitar ${nombre} del ticket`} tone="danger" onClick={() => removeDraftLeg(i)} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {ev && (
            <>
              {ev.errors.length > 0 && (
                <Callout tone="negative" icon={<TriangleAlert size={16} />} title="El ticket todavía no se puede evaluar">
                  <ul className="space-y-0.5">
                    {ev.errors.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </Callout>
              )}

              {j && ev.combinedOdds !== null && (
                <Card title="Análisis del ticket" right={ev.risk && <RiskBadge risk={ev.risk} />}>
                  <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
                    <Figure label="Cuota combinada" value={ev.combinedOdds.toFixed(2)} hint={offered !== null && ev.productOdds ? `producto ${ev.productOdds.toFixed(2)}` : 'producto de cuotas'} />
                    <Figure label="Prob. combinada" tip={TIPS.probCombinada} value={combinada} hint={j.method === 'cotas' ? 'no estimable: rango' : undefined} />
                    <Figure label="Falla al menos una" value={falla} />
                    <Figure label="Implícita de la cuota" tip={TIPS.probImplicita} value={pct(1 / ev.combinedOdds, 2)} />
                    <Figure label="Kelly del ticket" tip={TIPS.kellyCompleto} value={pct(ev.stake?.kellyFull ?? null, 2)} hint={ev.kellyBasis === 'cota-inferior' ? 'con la cota inferior' : ev.kellyBasis ? 'con la conjunta' : 'no corresponde'} />
                    <Figure
                      // Lo que se lleva uno de esta pantalla: cuánto poner.
                      emphasis
                      label="Stake recomendado"
                      tip={TIPS.stake}
                      value={ev.stake && ev.stake.stake > 0 ? <Amount sc={ev.stake.stake} s={cur} stacked /> : '—'}
                      hint={ev.stake?.bindingLimit && ev.stake.bindingLimit !== 'kelly' ? `limitado por ${limitText(ev.stake.bindingLimit)}` : undefined}
                    />
                    <Figure label="Retorno potencial" value={stakeValido ? <Amount sc={simulateOutcome(ev.bankroll, stake, ev.combinedOdds, cur.coinValue).grossReturn} s={cur} stacked /> : '—'} />
                    <Figure label="Ganancia potencial" value={stakeValido ? <Amount sc={simulateOutcome(ev.bankroll, stake, ev.combinedOdds, cur.coinValue).netWin} s={cur} signed stacked /> : '—'} tone="positive" />
                  </div>
                  <div className="space-y-2 border-t border-border px-4 py-3 text-[12px]">
                    <p>
                      <span className="font-medium">Método:</span> {METODO[j.method]}
                    </p>
                    {j.notes.map((n) => (
                      <p key={n} className="text-muted">
                        {n}
                      </p>
                    ))}
                    {j.pairs.length > 0 && (
                      <div>
                        <p className="flex items-center gap-1 font-medium">
                          Correlación entre selecciones del mismo partido <InfoTip>Con la conjunta exacta se ve cuánto se aleja de multiplicar como si fueran independientes.</InfoTip>
                        </p>
                        <ul className="mt-1 space-y-0.5">
                          {j.pairs.map((pr) => (
                            <li key={`${pr.a}-${pr.b}`} className="text-muted">
                              {pr.a + 1} y {pr.b + 1}: <Badge tone={pr.level === 'alta' ? 'warning' : 'neutral'}>{CORRELATION_LABEL[pr.level]}</Badge>{' '}
                              {pr.joint !== null ? `conjunta ${pct(pr.joint, 2)} frente a ${pct(pr.independent, 2)} si fueran independientes` : 'dependencia no medida por el modelo'}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {ev.stake && ev.stake.status !== 'recomendado' && <p className="text-muted">{ev.stake.reasons[0]}</p>}
                  </div>
                  {ev.warnings.length > 0 && (
                    <div className="border-t border-border p-4">
                      <Callout tone="warning" icon={<TriangleAlert size={16} />}>
                        <ul className="space-y-0.5">
                          {ev.warnings.map((w) => (
                            <li key={w}>{w}</li>
                          ))}
                        </ul>
                      </Callout>
                    </div>
                  )}
                  <div className="grid gap-3 border-t border-border p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
                    <Field label="Cuota combinada ofrecida (opcional)" hint="Si tu casa ofrece otra distinta del producto.">
                      <input className={inputClass} inputMode="decimal" placeholder={ev.productOdds?.toFixed(2)} value={offeredText} onChange={(e) => setOfferedText(e.target.value)} />
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
                      />
                    </Field>
                    <div className="flex gap-2 sm:pt-5">
                      <Button onClick={() => setSimular(true)} disabled={!stakeValido} title="Muestra el impacto sin registrar nada">
                        <FlaskConical size={14} aria-hidden /> Simular
                      </Button>
                      <Button variant="primary" onClick={registrar} disabled={!ev.stake || ev.stake.status !== 'recomendado' || !stakeValido} title={ev.stake && ev.stake.status !== 'recomendado' ? ev.stake.reasons[0] : undefined}>
                        <CircleCheck size={14} aria-hidden /> Registrar ticket
                      </Button>
                    </div>
                  </div>
                  {error && (
                    <div className="px-4 pb-4">
                      <Callout tone="negative" icon={<TriangleAlert size={16} />}>
                        {error}
                      </Callout>
                    </div>
                  )}
                </Card>
              )}

              {simular && stakeValido && ev.combinedOdds !== null && (
                <Card title="Simulación del ticket" subtitle="No se registra">
                  <SimulationBlock bankroll={ev.bankroll} stake={stake} odds={ev.combinedOdds} cur={cur} probability={j?.probability ?? null} />
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
