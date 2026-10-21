import { useMemo, useRef, useState } from 'react';
import { Download, PiggyBank, Plus, RotateCcw, ShieldCheck, TriangleAlert, Upload, UserRound } from 'lucide-react';
import type { KellyMode, MovementType, RiskSettings } from '../types/betting';
import { Button, Callout, Card, Field, inputClass, PageHeader, SegmentedControl, Skeleton, Stat, StatRow } from '../components/ui';
import { DataTable, type Column } from '../components/DataTable';
import { InfoTip } from '../components/InfoTip';
import { toast } from '../components/Toast';
import { descargarArchivo } from '../utils/download';
import { Amount, money, pct, signedMoney } from '../components/Betting/BetUi';
import { StakeScaleTable } from '../components/Betting/StakeScale';
import { coinsInputValue, formatSc, parseCoinsInput } from '../domain/betting/coins';
import { TIPS } from '../components/Betting/tips';
import { capitalOf } from '../domain/betting/metrics';
import { availableBalance, bankrollOf, committedStake, pendingCount, unitValue } from '../domain/betting/wallet';
import { useActiveProfile, useBetting } from '../store/useBetting';
import type { Movement } from '../types/betting';

const TIPO: Record<MovementType, string> = {
  inicial: 'Saldo inicial',
  deposito: 'Depósito',
  reinicio: 'Reinicio',
  stake: 'Stake',
  retorno: 'Retorno',
  perdida: 'Pérdida',
  reembolso: 'Reembolso',
};

/** Campos en % que el formulario muestra ×100. */
const PORCENTAJES: (keyof RiskSettings)[] = ['unitPct', 'maxKellyPct', 'maxDailyExposurePct', 'maxMatchExposurePct', 'maxCompetitionExposurePct', 'minProbability', 'minEdge'];

/** Importes que el formulario muestra y lee en monedas; se guardan en SC. */
const EN_MONEDAS: (keyof RiskSettings)[] = ['initialBankroll', 'maxStakePerPick'];

/** Resultado de una acción del store: `null` es que salió bien. */
const avisar = (error: string | null, ok: string) => (error ? toast(error, 'error') : toast(ok));

export function BankrollPage() {
  const hydrated = useBetting((s) => s.hydrated);
  const { profiles, activeProfileId, loadIssues, switchProfile, createProfile, renameProfile, deposit, resetBankroll, exportBackup, importBackup } = useBetting();
  const profile = useActiveProfile();
  const cur = profile.settings;
  const [nuevo, setNuevo] = useState('');
  const [nombre, setNombre] = useState(profile.name);
  const [importe, setImporte] = useState('');
  const [todosCiclos, setTodosCiclos] = useState(false);
  const archivo = useRef<HTMLInputElement>(null);

  const movimientos = useMemo(() => [...profile.movements].filter((m) => todosCiclos || m.cycle === profile.cycle).reverse(), [profile, todosCiclos]);

  if (!hydrated) {
    return (
      <>
        <PageHeader title="Bankroll" />
        <Card>
          <div className="p-4">
            <Skeleton className="h-40 w-full" />
          </div>
        </Card>
      </>
    );
  }

  const disponible = availableBalance(profile);
  const comprometido = committedStake(profile);
  const bankroll = bankrollOf(profile);
  const capital = capitalOf(profile, [profile.cycle]);
  // Beneficio ya liquidado del ciclo: los stakes pendientes todavía no son pérdida.
  const liquidado = [...profile.picks, ...profile.tickets].filter((x) => x.cycle === profile.cycle).reduce((a, x) => a + (x.netProfit ?? 0), 0);
  const importeSc = parseCoinsInput(importe, cur.coinValue);

  const descargar = () => {
    descargarArchivo(`picks-${new Date().toISOString().slice(0, 10)}.json`, exportBackup(), 'application/json');
    toast('Copia exportada.');
  };

  const columnas: Column<Movement>[] = [
    { id: 'at', header: 'Fecha', cell: (m) => <span className="tabular-nums">{m.at.slice(0, 16).replace('T', ' ')}</span>, sortValue: (m) => m.at },
    { id: 'ciclo', header: 'Ciclo', numeric: true, hideOnMobile: true, cell: (m) => m.cycle, sortValue: (m) => m.cycle },
    { id: 'tipo', header: 'Tipo', cell: (m) => TIPO[m.type], sortValue: (m) => m.type },
    {
      id: 'importe',
      header: 'Importe',
      numeric: true,
      cell: (m) => <span className={m.amount > 0 ? 'text-positive-text' : m.amount < 0 ? 'text-negative-text' : 'text-muted'}>{signedMoney(m.amount, cur)}</span>,
      sortValue: (m) => m.amount,
    },
    { id: 'saldo', header: 'Disponible tras', numeric: true, cell: (m) => money(m.balanceAfter, cur), sortValue: (m) => m.balanceAfter },
    { id: 'nota', header: 'Detalle', hideOnMobile: true, cell: (m) => <span className="block max-w-96 truncate text-muted">{m.note}</span> },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Bankroll" description="Wallet virtual del perfil, sus movimientos y la gestión de riesgo que decide cada stake." />

      <Callout tone="accent" icon={<ShieldCheck size={16} />}>
        <strong>{profile.settings.currencyName}</strong> es una moneda exclusivamente virtual: no representa dinero real, no se compra ni se canjea. Esta sección
        es una herramienta de análisis y simulación, no una promesa de ganancias. Los importes se leen en monedas (1 moneda = {formatSc(cur.coinValue, cur.currencyCode)}), con 2 decimales como mucho, y su equivalencia en {cur.currencyCode} entre paréntesis.
      </Callout>

      {loadIssues.length > 0 && (
        <Callout tone="warning" icon={<TriangleAlert size={16} />}>
          {loadIssues.map((i) => (
            <p key={i}>{i}</p>
          ))}
        </Callout>
      )}

      {/* El bankroll es la cifra de la pantalla; «disponible» era la segunda grande y competia con ella. */}
      <StatRow>
        <Stat label="Bankroll" value={<Amount sc={bankroll} s={cur} stacked />} hint="disponible + comprometido" hero />
        <Stat label="Disponible" value={<Amount sc={disponible} s={cur} stacked />} />
        <Stat label="Comprometido" tip={TIPS.comprometido} value={<Amount sc={comprometido} s={cur} stacked />} hint={`${pendingCount(profile)} pendientes`} />
        <Stat
          label="Resultado liquidado"
          value={<Amount sc={Math.round(liquidado * 100) / 100} s={cur} signed stacked />}
          tone={liquidado > 0 ? 'positive' : liquidado < 0 ? 'negative' : undefined}
          hint="ciclo actual"
        />
        <Stat
          label="Rentabilidad"
          tip="Resultado liquidado del ciclo sobre el capital aportado (saldo inicial y depósitos)."
          value={capital > 0 ? pct(liquidado / capital, 2, true) : '—'}
          hint={`sobre ${money(capital, cur)} aportados`}
          tone={liquidado > 0 ? 'positive' : liquidado < 0 ? 'negative' : undefined}
        />
        <Stat label="Unidad" tip={TIPS.unidad} value={<Amount sc={unitValue(profile.settings)} s={cur} stacked />} hint={`${pct(profile.settings.unitPct)} del inicial · ciclo ${profile.cycle}`} />
      </StatRow>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4">
          <Card
            title={
              <span className="flex items-center gap-2">
                <UserRound size={14} className="text-faint" aria-hidden /> Perfil
              </span>
            }
            subtitle="Perfiles locales de este navegador: no son cuentas ni protegen los datos"
          >
            <div className="grid gap-3 p-4">
              <Field label="Perfil activo">
                <select
                  className={inputClass}
                  value={activeProfileId}
                  onChange={(e) => {
                    switchProfile(e.target.value);
                    setNombre(profiles[e.target.value]?.name ?? '');
                    toast(`Perfil activo: ${profiles[e.target.value]?.name ?? ''}.`, 'info');
                  }}
                >
                  {Object.values(profiles).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="flex gap-2">
                <input className={`${inputClass} min-w-0 flex-1`} value={nombre} onChange={(e) => setNombre(e.target.value)} aria-label="Nombre del perfil" />
                <Button onClick={() => avisar(renameProfile(nombre), 'Nombre guardado.')} disabled={!nombre.trim() || nombre.trim() === profile.name}>
                  Renombrar
                </Button>
              </div>
              <div className="flex gap-2">
                <input className={`${inputClass} min-w-0 flex-1`} value={nuevo} onChange={(e) => setNuevo(e.target.value)} placeholder="Nombre del nuevo perfil" aria-label="Nuevo perfil" />
                <Button
                  onClick={() => {
                    createProfile(nuevo);
                    setNombre(nuevo.trim());
                    setNuevo('');
                    toast('Perfil creado con su propia wallet.');
                  }}
                  disabled={!nuevo.trim()}
                >
                  <Plus size={14} aria-hidden /> Crear
                </Button>
              </div>
            </div>
          </Card>

          <Card
            title={
              <span className="flex items-center gap-2">
                <PiggyBank size={14} className="text-faint" aria-hidden /> Wallet
              </span>
            }
            subtitle="Depósitos virtuales, reinicio y copias de seguridad"
          >
            <div className="grid gap-4 p-4">
              <div className="flex items-start gap-2">
                <Field
                  label="Depósito virtual (monedas)"
                  className="min-w-0 flex-1"
                  hint={Number.isFinite(importeSc) ? `= ${formatSc(importeSc, cur.currencyCode)}` : 'Con 2 decimales como mucho.'}
                >
                  <input className={inputClass} inputMode="decimal" value={importe} onChange={(e) => setImporte(e.target.value)} placeholder="1" />
                </Field>
                <Button
                  className="mt-5"
                  disabled={!importe.trim()}
                  onClick={() => {
                    const e = deposit(importeSc);
                    avisar(e, `Depósito virtual registrado: ${money(importeSc, cur)}.`);
                    if (!e) setImporte('');
                  }}
                >
                  Depositar
                </Button>
              </div>
              <div className="rounded-control border border-border p-3">
                <p className="mb-2 text-[12px] text-muted">
                  Abre el ciclo {profile.cycle + 1} con {money(profile.settings.initialBankroll, cur)}. El historial se conserva.
                </p>
                <Button variant="danger" confirm="Pulsa otra vez para reiniciar" onClick={() => avisar(resetBankroll(), `Bankroll reiniciado: ciclo ${profile.cycle + 1}.`)}>
                  <RotateCcw size={14} aria-hidden /> Reiniciar bankroll
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                <Button size="sm" onClick={descargar}>
                  <Download size={14} aria-hidden /> Exportar copia
                </Button>
                <Button size="sm" onClick={() => archivo.current?.click()} title="Sustituye los perfiles guardados por los de la copia">
                  <Upload size={14} aria-hidden /> Importar copia
                </Button>
                <input
                  ref={archivo}
                  type="file"
                  accept="application/json,.json"
                  hidden
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    avisar(importBackup(await f.text()), 'Copia importada.');
                    e.target.value = '';
                  }}
                />
              </div>
              <p className="text-[11px] text-faint">Los datos viven en la base de datos local (data/analisis-futbol.sqlite). Exporta una copia de vez en cuando.</p>
            </div>
          </Card>
        </div>

        <div className="xl:col-span-2">
          <RiskSettingsCard key={profile.id + JSON.stringify(profile.settings)} />
        </div>
      </div>

      {/*
        * Qué vale cada peldaño de la escala con TU bank de ahora mismo.
        *
        * Es la tabla del sistema de stake, calculada con tu bankroll en vez de con uno de ejemplo: contesta
        * «¿cuánto es un stake 10 para mí?» sin hacer la cuenta. No decide nada; el stake lo sigue
        * calculando Kelly con los topes del perfil.
        */}
      <Card
        title="Escala de stake"
        subtitle={`Cada punto es un 1 % del bank. Con ${money(bankroll, cur)} disponibles de bankroll`}
      >
        <StakeScaleTable bank={bankroll} s={cur} />
        <p className="border-t border-border px-4 py-2.5 text-[12px] text-muted">
          La mayoría de las apuestas deberían ir entre <strong className="text-text">1 y 10</strong>. Un stake de{' '}
          <strong className="text-text">20 o más</strong> se reserva para oportunidades de alta confianza. Subir el stake para
          recuperar una pérdida es el error que más bankrolls se lleva por delante.
        </p>
      </Card>

      <Card
        title="Movimientos"
        subtitle="Cada stake, retorno, pérdida, reembolso y depósito, con el saldo disponible tras cada uno"
        right={
          <SegmentedControl
            size="sm"
            label="Ciclos"
            value={todosCiclos ? 'todos' : 'actual'}
            onChange={(v) => setTodosCiclos(v === 'todos')}
            options={[
              { value: 'actual', label: `Ciclo ${profile.cycle}` },
              { value: 'todos', label: 'Todos' },
            ]}
          />
        }
      >
        <DataTable rows={movimientos} columns={columnas} getRowId={(m) => m.id} pageSize={15} initialSort={{ id: 'at', dir: 'desc' }} empty="Sin movimientos." />
      </Card>
    </div>
  );
}

function RiskSettingsCard() {
  const profile = useActiveProfile();
  const updateSettings = useBetting((s) => s.updateSettings);
  const [form, setForm] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries(profile.settings).map(([k, v]) => [
        k,
        v === null
          ? ''
          : PORCENTAJES.includes(k as keyof RiskSettings)
            ? String(Math.round((v as number) * 1000) / 10)
            : EN_MONEDAS.includes(k as keyof RiskSettings)
              ? coinsInputValue(v as number, profile.settings.coinValue)
              : String(v),
      ]),
    ),
  );
  const [errores, setErrores] = useState<string[]>([]);
  const [cambios, setCambios] = useState(false);

  /** Equivalencia en SC de un campo en monedas, con el valor de moneda que hay escrito en el formulario. */
  const enSc = (k: string) => {
    const sc = parseCoinsInput(form[k] ?? '', Number(form.coinValue?.replace(',', '.')));
    return Number.isFinite(sc) ? `= ${formatSc(sc, profile.settings.currencyCode)}` : undefined;
  };

  const cambiar = (k: string, v: string) => {
    setForm({ ...form, [k]: v });
    setCambios(true);
  };

  const campo = (k: keyof RiskSettings, label: string, tip?: string, suffix?: string, hint?: string) => (
    <Field
      label={
        <span className="flex items-center gap-1">
          {label}
          {suffix ? ` (${suffix})` : ''}
          {tip && <InfoTip>{tip}</InfoTip>}
        </span>
      }
      hint={hint}
    >
      <input className={inputClass} inputMode="decimal" value={form[k]} onChange={(e) => cambiar(k, e.target.value)} />
    </Field>
  );

  const guardar = () => {
    const n = (k: string) => Number(form[k].replace(',', '.'));
    // Lo escrito en monedas pasa a SC con el valor de moneda del propio formulario.
    const monedas = (k: string) => parseCoinsInput(form[k], n('coinValue'));
    const patch: RiskSettings = {
      currencyName: form.currencyName,
      currencyCode: form.currencyCode,
      coinValue: n('coinValue'),
      initialBankroll: monedas('initialBankroll'),
      unitPct: n('unitPct') / 100,
      kellyMode: form.kellyMode as KellyMode,
      customFraction: n('customFraction'),
      maxKellyPct: n('maxKellyPct') / 100,
      maxStakePerPick: form.maxStakePerPick.trim() ? monedas('maxStakePerPick') : null,
      maxDailyExposurePct: n('maxDailyExposurePct') / 100,
      maxMatchExposurePct: n('maxMatchExposurePct') / 100,
      maxCompetitionExposurePct: n('maxCompetitionExposurePct') / 100,
      minProbability: n('minProbability') / 100,
      minEdge: n('minEdge') / 100,
      maxOdds: n('maxOdds'),
      minSample: n('minSample'),
    };
    const e = updateSettings(patch);
    setErrores(e);
    if (e.length === 0) toast('Gestión de riesgo guardada.');
  };

  return (
    <Card title="Gestión de riesgo" subtitle="Kelly, topes y bloqueos del perfil activo" className="h-full">
      <div className="space-y-5 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Modo de Kelly" hint="Kelly completo solo se muestra como análisis: nunca fija el stake.">
            <select className={inputClass} value={form.kellyMode} onChange={(e) => cambiar('kellyMode', e.target.value)}>
              <option value="half">Half Kelly (recomendado)</option>
              <option value="quarter">Quarter Kelly (conservador)</option>
              <option value="custom">Fracción personalizada</option>
            </select>
          </Field>
          {form.kellyMode === 'custom' && campo('customFraction', 'Fracción de Kelly', 'Entre 0,01 y 0,5.')}
        </div>

        <fieldset className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <legend className="mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">Topes del stake</legend>
          {campo('maxKellyPct', 'Stake máximo por pick', 'Kelly máximo permitido: tope del stake en % del bankroll.', '%')}
          {campo('maxStakePerPick', 'Tope absoluto por pick', 'Vacío = sin tope absoluto. Con 2 decimales como mucho.', 'monedas', enSc('maxStakePerPick'))}
          {campo('maxDailyExposurePct', 'Exposición diaria', 'Suma de stakes pendientes en partidos del mismo día.', '%')}
          {campo('maxMatchExposurePct', 'Exposición por partido', 'Suma de stakes pendientes en el mismo partido.', '%')}
          {campo('maxCompetitionExposurePct', 'Exposición por competición', 'Suma de stakes pendientes en la misma competición.', '%')}
        </fieldset>

        <fieldset className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <legend className="mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">Bloqueos</legend>
          {campo('minProbability', 'Probabilidad mínima', 'Por debajo se bloquea la recomendación.', '%')}
          {campo('minEdge', 'Edge mínimo', 'En puntos porcentuales.', 'pp')}
          {campo('maxOdds', 'Cuota máxima')}
          {campo('minSample', 'Muestra mínima', 'Partidos de cada equipo en su condición (local en casa, visitante fuera).', 'partidos')}
        </fieldset>

        <fieldset className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <legend className="mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">Moneda virtual</legend>
          {campo('coinValue', 'Valor de 1 moneda', TIPS.moneda, profile.settings.currencyCode)}
          {campo('initialBankroll', 'Saldo inicial', 'Se aplica al crear un perfil o en el próximo reinicio. Con 2 decimales como mucho.', 'monedas', enSc('initialBankroll'))}
          {campo('unitPct', 'Unidad', TIPS.unidad, '% del inicial')}
          <Field label="Nombre de la moneda interna">
            <input className={inputClass} value={form.currencyName} onChange={(e) => cambiar('currencyName', e.target.value)} />
          </Field>
          <Field label="Código">
            <input className={inputClass} value={form.currencyCode} onChange={(e) => cambiar('currencyCode', e.target.value)} />
          </Field>
        </fieldset>

        {errores.length > 0 && (
          <Callout tone="negative" icon={<TriangleAlert size={16} />} title="No se guardó">
            <ul className="space-y-0.5">
              {errores.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </Callout>
        )}
        <div className="flex items-center gap-3 border-t border-border pt-4">
          <Button variant="primary" onClick={guardar} disabled={!cambios}>
            Guardar cambios
          </Button>
          {cambios && <span className="text-[12px] text-muted">Cambios sin guardar</span>}
        </div>
      </div>
    </Card>
  );
}
