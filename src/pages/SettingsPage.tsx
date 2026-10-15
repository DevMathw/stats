import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/apiBase';
import { AlertTriangle, BadgeCheck, CheckCircle2, Download, Plus, RefreshCw, Trash2, Upload, X } from 'lucide-react';
import { Button, Callout, Card, IconButton, inputClass, PageHeader, ScrollTable, Stat, StatRow, Tabs } from '../components/ui';
import { HistoricalDatasets } from '../components/HistoricalDatasets';
import { descargarArchivo } from '../utils/download';
import { DataTable } from '../components/DataTable';
import { CompetitionDataSources, ConfiguredSources, useSourceRegistry } from '../components/DataSources';
import { CompetitionForm } from '../components/Layout/CompetitionForm';
import { toast } from '../components/Toast';
import { fmtInt } from '../utils/format';
import { PARAM_EXCEL_NAMES, PARAM_LABELS, validateWeights } from '../domain/models/params';
import { FOOTBALL_DATA_CODES } from '../services/providers/footballData';
import type { ModelParams } from '../types';
import { useStore } from '../store/useStore';
import { rosterFor, teamRef } from '../domain/models/teamIdentity';
import { officialTeam } from '../domain/models/teamDisplay';
import { TeamLabel } from '../components/TeamLabel';
import { espnLeagueId } from '../domain/models/espnLeagues';
import { EXTRA_COMPETITIONS } from '../services/providers/officialSources';

const CAMPO_NUMERO = `${inputClass} w-28 text-right tabular-nums`;

const RUTA_CLAVE = api('/api/football-data/key');

/** La clave se guarda en el servidor local y el proxy la añade a cada petición: el navegador no la vuelve a leer. */
function ClaveFootballData() {
  const [configurada, setConfigurada] = useState<boolean | null>(null);
  const [clave, setClave] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetch(RUTA_CLAVE)
      .then((r) => (r.ok ? (r.json() as Promise<{ configured: boolean }>) : null))
      .then((b) => setConfigurada(b?.configured ?? null))
      .catch(() => setConfigurada(null));
  }, []);

  const enviar = async (method: 'POST' | 'DELETE') => {
    setEnviando(true);
    try {
      const r = await fetch(RUTA_CLAVE, {
        method,
        headers: { 'content-type': 'application/json' },
        body: method === 'POST' ? JSON.stringify({ key: clave }) : undefined,
      });
      const b = (await r.json().catch(() => null)) as { configured?: boolean; error?: string } | null;
      if (!r.ok || typeof b?.configured !== 'boolean') throw new Error(b?.error ?? `respuesta ${r.status}`);
      setConfigurada(b.configured);
      setClave('');
      toast(b.configured ? 'Clave guardada en el servidor local.' : 'Clave quitada.');
    } catch (e) {
      toast(`No se pudo guardar la clave: ${(e as Error).message}`, 'error');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="clave-football-data" className="text-[11px] font-medium text-muted">
        Clave de football-data.org
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id="clave-football-data"
          type="password"
          autoComplete="off"
          className={`${inputClass} w-64 max-w-full`}
          placeholder={configurada ? 'guardada · escribe otra para cambiarla' : 'pega aquí tu clave gratuita'}
          value={clave}
          onChange={(e) => setClave(e.target.value)}
        />
        <Button size="sm" onClick={() => void enviar('POST')} disabled={enviando || !clave.trim()}>
          Guardar
        </Button>
        {configurada && (
          <Button size="sm" variant="ghost" onClick={() => void enviar('DELETE')} disabled={enviando}>
            Quitar
          </Button>
        )}
      </div>
      <span className="text-[11px] text-muted">
        {configurada === null ? 'Sin conexión con el servidor local' : configurada ? 'Guardada en el servidor local' : 'Sin clave'}
      </span>
    </div>
  );
}

type Tab = 'estado' | 'equipos' | 'modelo' | 'historicos' | 'proveedor';

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>('estado');
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    leagues,
    matches,
    fixtures,
    params,
    lastUpdate,
    fixtureHorizon,
    status,
    statusMessage,
    lastSync,
    teamIssues,
    derived,
    setParams,
    setFixtureHorizon,
    setTeamAlias,
    importExcel,
    refreshData,
    addOfficialCompetitions,
    clearAll,
  } = useStore();

  const weights = validateWeights(params);
  const numericKeys = Object.keys(PARAM_LABELS) as (keyof typeof PARAM_LABELS)[];
  const extrasFaltan = useMemo(() => {
    const presentes = new Set(leagues.map((l) => espnLeagueId(l.name, l.country)));
    return EXTRA_COMPETITIONS.filter((x) => !presentes.has(x.slug)).map((x) => x.name);
  }, [leagues]);
  const ocupado = status !== 'idle';

  return (
    <div className="grid gap-4">
      <PageHeader title="Configuración" description="Datos cargados, identidad de equipos, parámetros del modelo y fuentes." />
      <Card>
        <Tabs
          tabs={[
            { id: 'estado' as const, label: 'Estado y datos' },
            { id: 'equipos' as const, label: 'Equipos', count: teamIssues.length || undefined },
            { id: 'modelo' as const, label: 'Modelo' },
            { id: 'historicos' as const, label: 'Históricos' },
            { id: 'proveedor' as const, label: 'Proveedor' },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === 'historicos' && <HistoricalDatasets />}

        {tab === 'estado' && (
          <div className="space-y-4 p-4">
            <StatRow cols={4}>
              <Stat label="Última actualización" value={<span className="text-[15px]">{lastUpdate ? new Date(lastUpdate).toLocaleString('es-ES') : '—'}</span>} />
              <Stat label="Partidos cargados" value={fmtInt(matches.length)} />
              <Stat label="Equipos cargados" value={fmtInt(derived.teams.length)} />
              <Stat label="Partidos pendientes" value={fmtInt(fixtures.length)} />
            </StatRow>

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xlsm"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void importExcel(f);
                  e.target.value = '';
                }}
              />
              <Button onClick={() => fileRef.current?.click()} disabled={ocupado} loading={status === 'importing'} title="Carga el libro base de la temporada (.xlsx)">
                {status !== 'importing' && <Upload size={14} aria-hidden />} Importar Excel
              </Button>
              <Button variant="primary" onClick={refreshData} disabled={ocupado} loading={status === 'syncing'} title="Trae los partidos de todas las competiciones desde sus fuentes oficiales">
                {status !== 'syncing' && <RefreshCw size={14} aria-hidden />}
                Actualizar partidos
              </Button>
              <Button onClick={() => downloadJson({ leagues, matches, fixtures, params })} title="Descarga partidos, competiciones y parámetros en JSON">
                <Download size={14} aria-hidden /> Exportar JSON
              </Button>
              <Button
                variant="danger"
                confirm="Pulsa otra vez: se borran todos los datos"
                onClick={() => {
                  clearAll();
                  toast('Datos de partidos borrados. Los picks y el bankroll no se tocan.', 'info');
                }}
                title="Borra partidos, pendientes y competiciones de este navegador. Los parámetros del modelo, los picks y el bankroll no se tocan."
              >
                <Trash2 size={14} aria-hidden /> Borrar datos
              </Button>
            </div>

            {statusMessage && (
              <p className="text-[13px] text-muted" aria-live="polite">
                {statusMessage}
              </p>
            )}

            {lastSync && (
              <div className="rounded-card border border-positive-soft bg-positive-soft p-3 text-[13px]">
                {lastSync.lines.map((l, i) => (
                  <div key={i} className={i === 0 ? 'font-semibold text-positive-text' : 'text-positive-text'}>
                    {l}
                  </div>
                ))}
                {lastSync.summary.rounds.length > 0 && (
                  <details className="mt-2">
                    <summary className="rounded text-positive-text">Jornada por liga</summary>
                    <ul className="mt-1 list-disc pl-5 text-[12px] text-positive-text">
                      {lastSync.summary.rounds.map((r) => (
                        <li key={r.leagueId}>
                          <strong>{r.leagueId}</strong>: {r.description} · {r.pendingFixtures} pendientes en total
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                {lastSync.summary.warnings.length > 0 && (
                  <details className="mt-2">
                    <summary className="rounded text-positive-text">{lastSync.summary.warnings.length} eventos descartados</summary>
                    <ul className="mt-1 list-disc pl-5 text-[12px] text-positive-text">
                      {lastSync.summary.warnings.slice(0, 30).map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </details>
                )}
                {lastSync.summary.unresolvedTeams.length > 0 && (
                  <details className="mt-2" open>
                    <summary className="rounded text-positive-text">{lastSync.summary.unresolvedTeams.length} equipos sin reconocer</summary>
                    <p className="mt-1 text-[12px] text-positive-text">
                      Sus partidos se descartaron para no duplicar la ficha del equipo. Dile a cuál corresponde cada uno y vuelve a actualizar.
                    </p>
                    <div className="mt-2 overflow-x-auto rounded-control border border-border bg-surface">
                      <table className="data">
                        <thead>
                          <tr>
                            <th scope="col">Liga</th>
                            <th scope="col">Nombre del proveedor</th>
                            <th scope="col">Es este equipo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lastSync.summary.unresolvedTeams.map((u) => (
                            <tr key={`${u.leagueId}|${u.providerName}`}>
                              <td className="text-muted">{u.leagueId}</td>
                              <td>{u.providerName}</td>
                              <td>
                                <select
                                  className={inputClass}
                                  defaultValue=""
                                  aria-label={`Equipo al que corresponde ${u.providerName}`}
                                  onChange={(e) => setTeamAlias(u.leagueId, u.providerName, e.target.value)}
                                >
                                  <option value="">Elegir…</option>
                                  {derived.teams
                                    .filter((t) => t.leagueId === u.leagueId)
                                    .map((t) => (
                                      <option key={t.id} value={t.name}>
                                        {t.name}
                                      </option>
                                    ))}
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                )}
                {lastSync.summary.leaguesSkipped.length > 0 && (
                  <details className="mt-2">
                    <summary className="rounded text-positive-text">{lastSync.summary.leaguesSkipped.length} ligas omitidas</summary>
                    <ul className="mt-1 list-disc pl-5 text-[12px] text-positive-text">
                      {lastSync.summary.leaguesSkipped.map((s) => (
                        <li key={s.leagueId}>
                          <strong>{s.leagueId}</strong>: {s.reason}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'equipos' && <TeamIdentityPanel />}

        {tab === 'modelo' && (
          <div className="p-4">
            {weights.valid ? (
              <p className="mb-4 flex items-center gap-2 text-[13px] text-positive-text">
                <CheckCircle2 size={16} aria-hidden /> W_BASE + W_FORM5 + W_FORM10 + W_XG = 1
              </p>
            ) : (
              <div className="mb-4">
                <Callout tone="warning" icon={<AlertTriangle size={16} />}>
                  {weights.message}
                </Callout>
              </div>
            )}

            <div className="overflow-x-auto rounded-card border border-border">
              <table className="data">
                <thead>
                  <tr>
                    <th scope="col">Parámetro</th>
                    <th scope="col" className="num">Valor</th>
                    <th scope="col">Qué controla</th>
                  </tr>
                </thead>
                <tbody>
                  {numericKeys.map((key) => (
                    <tr key={key}>
                      <td className="font-mono text-[12px]">{PARAM_EXCEL_NAMES[key]}</td>
                      <td className="num">
                        <input
                          type="number"
                          step="0.01"
                          aria-label={PARAM_EXCEL_NAMES[key]}
                          className={CAMPO_NUMERO}
                          value={params[key] as number}
                          onChange={(e) => setParams({ [key]: Number(e.target.value) } as Partial<ModelParams>)}
                        />
                      </td>
                      <td className="whitespace-normal text-muted">{PARAM_LABELS[key]}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="font-mono text-[12px]">XG_AUSENTE</td>
                    <td className="num">
                      <select className={inputClass} aria-label="XG_AUSENTE" value={params.xgMissingMode} onChange={(e) => setParams({ xgMissingMode: e.target.value as ModelParams['xgMissingMode'] })}>
                        <option value="documented">Redistribuir a W_BASE</option>
                        <option value="excel">Compatible con Excel (= 0)</option>
                      </select>
                    </td>
                    <td className="whitespace-normal text-muted">
                      Qué hacer cuando el proveedor no reporta xG. La metodología documentada redistribuye el peso hacia la fuerza base; el libro real usa 0 porque su
                      SUMIFS convierte las celdas vacías en ceros (MODEL_MAPPING.md · DIFF-01).
                    </td>
                  </tr>
                  <tr>
                    <td className="font-mono text-[12px]">PROMEDIO_STATS</td>
                    <td className="num">
                      <select className={inputClass} aria-label="PROMEDIO_STATS" value={params.statAverageMode} onChange={(e) => setParams({ statAverageMode: e.target.value as ModelParams['statAverageMode'] })}>
                        <option value="muestra">Partidos con dato</option>
                        <option value="excel">Compatible con Excel (÷ PJ)</option>
                      </select>
                    </td>
                    <td className="whitespace-normal text-muted">
                      Entre qué se dividen los promedios de corners, tarjetas y tiros. El libro divide entre PJ, así que un partido sin corners publicados cuenta como 0 y
                      la proyección queda por debajo; con «Partidos con dato» cada promedio usa solo los partidos que tienen la cifra (MODEL_MAPPING.md · DIFF-07).
                    </td>
                  </tr>
                  <tr>
                    <td className="font-mono text-[12px]">VENTANA_FORMA</td>
                    <td className="num">
                      <select
                        className={inputClass}
                        aria-label="VENTANA_FORMA"
                        value={params.formWindowMode}
                        onChange={(e) => setParams({ formWindowMode: e.target.value as ModelParams['formWindowMode'] })}
                      >
                        <option value="fecha">Últimos N por fecha</option>
                        <option value="excel">Compatible con Excel (ventana de jornadas)</option>
                      </select>
                    </td>
                    <td className="whitespace-normal text-muted">
                      Qué partidos entran en «los últimos 5 y 10». El libro toma una ventana de NÚMEROS DE JORNADA, y eso se
                      rompe en las competiciones por fases: cuando empieza un play-off que vuelve a numerar desde la J1, la
                      ventana se queda anclada en la fase regular y el partido más reciente del equipo no entra en su propia
                      forma. Medido el 21/09/2026: afectaba a 12 de los 16 equipos de la LigaPro, y 48 de 584 equipos en total
                      daban una forma distinta según el método (MODEL_MAPPING.md · DIFF-12).
                    </td>
                  </tr>
                  <tr>
                    <td className="font-mono text-[12px]">FUENTE_PROYECCION</td>
                    <td className="num">
                      <select
                        className={inputClass}
                        aria-label="FUENTE_PROYECCION"
                        value={params.projectionSource}
                        onChange={(e) => setParams({ projectionSource: e.target.value as ModelParams['projectionSource'] })}
                      >
                        <option value="mixto">Mixto: 70 % libro + 30 % modelos</option>
                        <option value="libro">Solo el modelo del libro</option>
                        <option value="ensemble">Solo el ensemble de los 7 modelos</option>
                      </select>
                    </td>
                    <td className="whitespace-normal text-muted">
                      De dónde salen los goles esperados y el 1X2 de cada proyección, y con ellos TODOS los picks. Medido el 20/09/2026 sobre 1.628 partidos
                      (walk-forward): mixto 1,0416 de log loss y 47,6 % de acierto, solo libro 1,0434 y 47,1 %, solo modelos 1,0486 y 46,7 %. Las diferencias son
                      pequeñas y no superan al ruido, pero la mezcla no pierde con ninguno. Corners, tarjetas, tiros y el reparto por partes salen siempre del
                      libro, que es quien los modela, y un partido sin predicción se queda con el libro entero. Las predicciones se calculan en Proyecciones y se
                      rehacen solas al actualizar partidos. Ver PREDICTION_ENGINE.md §7.
                    </td>
                  </tr>
                  <tr>
                    <td className="font-mono text-[12px]">MODELO_1X2</td>
                    <td className="num">
                      <select className={inputClass} aria-label="MODELO_1X2" value={params.oneXTwoMode} onChange={(e) => setParams({ oneXTwoMode: e.target.value as ModelParams['oneXTwoMode'] })}>
                        <option value="poisson">Matriz Poisson</option>
                        <option value="excel">Compatible con Excel (logística)</option>
                      </select>
                    </td>
                    <td className="whitespace-normal text-muted">
                      De dónde sale el 1X2. La matriz Poisson usa las mismas λ que los goles y ambos marcan, así que todos los mercados cuadran entre sí, y en el
                      backtest del 18/09/2026 acertó mejor el empate (24,6 % predicho frente a 24,2 % real; la logística del libro daba 20,8 %). K_LOGISTIC y
                      K_DRAWDECAY solo cuentan con la del libro (MODEL_MAPPING.md · DIFF-11).
                    </td>
                  </tr>
                  <tr>
                    <td className="font-mono text-[12px]">XG_FUERZA</td>
                    <td className="num">
                      <select className={inputClass} aria-label="XG_FUERZA" value={params.xgStrengthMode} onChange={(e) => setParams({ xgStrengthMode: e.target.value as ModelParams['xgStrengthMode'] })}>
                        <option value="favorContra">xG a favor × en contra del rival</option>
                        <option value="excel">Compatible con Excel (solo a favor)</option>
                      </select>
                    </td>
                    <td className="whitespace-normal text-muted">
                      Qué mide el término W_XG. El libro solo mira el xG que genera el equipo; con «a favor × en contra» también cuenta el que concede su rival, como
                      la fuerza base de goles. Sin xG de alguno de los dos se usa el del libro (MODEL_MAPPING.md · DIFF-12).
                    </td>
                  </tr>
                  <tr>
                    <td className="font-mono text-[12px]">PRIOR</td>
                    <td className="num">
                      <select className={inputClass} aria-label="PRIOR" value={params.priorMode} onChange={(e) => setParams({ priorMode: e.target.value as ModelParams['priorMode'] })}>
                        <option value="historico">Temporadas anteriores del equipo</option>
                        <option value="liga">Compatible con Excel (media de la liga)</option>
                      </select>
                    </td>
                    <td className="whitespace-normal text-muted">
                      Si las temporadas que tengas cargadas de cada competición entran en el modelo. El libro solo mira la temporada en curso, y en la jornada 3
                      eso significa que dos tercios de una proyección son «la liga» — y que la liga tampoco se conoce todavía. Con «temporadas anteriores» el
                      histórico entra en cuatro sitios: es el punto de partida de los <strong>goles y el xG</strong> de cada equipo y de las{' '}
                      <strong>medias de la competición</strong> (las dos contraídas según cuántos partidos las respalden, K_PRIOR); es el{' '}
                      <strong>respaldo de la dispersión</strong> de córners y tarjetas mientras la temporada no llega a 20 partidos con el dato; da{' '}
                      <strong>enfrentamientos directos</strong> que dentro de una sola temporada casi no existen; y cuenta, a mitad de precio, en la{' '}
                      <strong>confianza</strong> de cada mercado.
                      <br />
                      Medido el 27/09/2026 en walk-forward sobre las 306 proyecciones de la BetPlay 2026 y 2026/27, con 2025 y 2026 como histórico: log loss del
                      1X2 de 1,1243 a <strong>1,0282</strong>, acierto del 44,1 % al <strong>47,4 %</strong>, Over 2.5 de 0,8606 a 0,7224, BTTS de 0,8008 a
                      0,7200 y error en goles totales de 1,33 a 1,23. En las 6 primeras jornadas la log loss cae de 1,2945 a 1,0365. Córners y tarjetas pasan de
                      tener cifra en 287 de esos 306 partidos a tenerla en <strong>los 306</strong>, sin empeorar en los que ya la tenían. Lo único que se probó
                      y se descartó es el histórico <em>de cada equipo</em> en córners y tarjetas: ahí subía el error.{' '}
                      <strong>Una competición sin histórico cargado da exactamente los mismos números que antes.</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'proveedor' && (
          <div className="space-y-4 p-4">
            <div className="flex flex-wrap items-end gap-3 rounded-card border border-border bg-surface-2 p-3">
              <ClaveFootballData />
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-muted">Partidos pendientes a mantener</span>
                <select className={inputClass} value={fixtureHorizon} onChange={(e) => setFixtureHorizon(Number(e.target.value))}>
                  <option value={1}>Solo la próxima jornada de cada liga</option>
                  <option value={2}>Próximas 2 jornadas</option>
                  <option value={3}>Próximas 3 jornadas</option>
                  <option value={5}>Próximas 5 jornadas</option>
                  <option value={0}>Todo el calendario restante</option>
                </select>
              </label>
              <p className="max-w-xl text-[12px] text-muted">
                La clave es gratis:{' '}
                <a className="rounded text-accent-text underline" href="https://www.football-data.org/client/register" target="_blank" rel="noreferrer">
                  football-data.org/client/register
                </a>
                . Sin ella no se pueden buscar los códigos de competición. Se guarda en el servidor local y el navegador no la vuelve a ver.
                <br />
                Con «solo la próxima jornada», cada actualización deja en Pendientes justo la jornada que toca en cada liga. Ojo: la{' '}
                <strong>Proyección final de temporada</strong> solo puede sumar los partidos que estén cargados.
              </p>
            </div>

            <div className="rounded-card border border-border bg-surface p-3 text-[13px] text-muted">
              <p className="mb-1">
                <strong>«Actualizar partidos»</strong> lee cada liga de su fuente oficial (o de sus secundarias autorizadas), y el botón de actualizar de cada partido trae
                sus corners, tarjetas, tiros y posesión de esa misma fuente.
              </p>
              <p>La clave y los códigos de football-data.org de esta pestaña no intervienen en ninguno de los dos.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-card border border-border bg-surface-2 p-3">
              <Button
                variant="primary"
                onClick={() => void addOfficialCompetitions()}
                disabled={ocupado || extrasFaltan.length === 0}
                title={extrasFaltan.length === 0 ? 'Ya están todas en Competiciones' : undefined}
              >
                <Plus size={14} aria-hidden /> Añadir las competiciones que faltan
              </Button>
              <span className="text-[12px] text-muted">
                {extrasFaltan.length ? `Añade ${extrasFaltan.join(', ')} y trae sus partidos desde su fuente oficial.` : 'Ya están todas en Competiciones.'}
              </span>
            </div>

            <CompetitionForm />

            <CompetitionSourcesTable />
          </div>
        )}
      </Card>
    </div>
  );
}

/**
 * Competiciones con sus fuentes. Las configuradas salen del registro del servidor; la procedencia de cada
 * partido, de lo guardado al cargarlo, y se ve al desplegar la fila.
 */
function CompetitionSourcesTable() {
  const leagues = useStore((s) => s.leagues);
  const competitionIds = useStore((s) => s.competitionIds);
  const seasonIds = useStore((s) => s.seasonIds);
  const setCompetitionId = useStore((s) => s.setCompetitionId);
  const setSeasonId = useStore((s) => s.setSeasonId);
  const removeLeague = useStore((s) => s.removeLeague);
  const registro = useSourceRegistry();

  return (
    <div className="overflow-hidden rounded-card border border-border">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-border px-3 py-2 text-[12px] text-muted">
        <span className="font-medium text-text">Fuentes por competición</span>
        <span className="inline-flex items-center gap-1">
          <BadgeCheck size={12} className="text-accent-text" aria-hidden /> web oficial
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-5 rounded-pill border border-border bg-surface" aria-hidden /> secundaria autorizada
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-5 rounded-pill border border-dashed border-border-strong" aria-hidden /> se consulta, pero hoy no aporta datos
        </span>
        <span>Despliega una competición para ver la fuente de cada partido.</span>
      </div>
      {registro.error && (
        <div className="border-b border-border p-3">
          <Callout tone="warning" icon={<AlertTriangle size={16} />} title="No se pudieron leer las fuentes configuradas">
            {registro.error} La procedencia guardada en cada partido se sigue viendo al desplegar su competición.
          </Callout>
        </div>
      )}
      <DataTable
        rows={leagues}
        getRowId={(l) => l.id}
        searchable={(l) => `${l.name} ${l.country}`}
        searchPlaceholder="Buscar competición…"
        columns={[
          {
            id: 'competicion',
            header: 'Competición',
            sortValue: (l) => l.name,
            cell: (l) => (
              <>
                {l.name}
                <span className="ml-2 text-[11px] text-faint">{l.country}</span>
              </>
            ),
          },
          {
            id: 'partidos',
            header: 'Partidos y calendario',
            title: 'Fuentes que consulta «Actualizar partidos», en su orden. Se usa la primera que devuelve partidos utilizables.',
            cell: (l) => <ConfiguredSources league={l} rol="partidos" registro={registro} />,
          },
          {
            id: 'estadisticas',
            header: 'Estadísticas de partido',
            title: 'Fuentes de las que se traen tiros, posesión, corners y tarjetas de cada partido, en su orden.',
            cell: (l) => <ConfiguredSources league={l} rol="estadisticas" registro={registro} />,
          },
          {
            id: 'codigo',
            header: 'Código',
            title: 'Código de football-data.org. No interviene en «Actualizar partidos».',
            numeric: true,
            cell: (l) => (
              <input
                className={CAMPO_NUMERO}
                aria-label={`Código de ${l.name}`}
                placeholder={FOOTBALL_DATA_CODES[l.id] ?? 'Sin mapear'}
                value={competitionIds[l.id] ?? ''}
                onChange={(e) => setCompetitionId(l.id, e.target.value)}
              />
            ),
          },
          {
            id: 'temporada',
            header: 'Temporada (año)',
            numeric: true,
            cell: (l) => (
              <input className={CAMPO_NUMERO} aria-label={`Temporada de ${l.name}`} placeholder="2026" value={seasonIds[l.id] ?? ''} onChange={(e) => setSeasonId(l.id, e.target.value)} />
            ),
          },
        ]}
        renderDetail={(l) => <CompetitionDataSources league={l} registro={registro} />}
        actions={(l) =>
          l.source === 'Añadida a mano' ? (
            <IconButton
              icon={<Trash2 size={16} />}
              label={`Quitar ${l.name}`}
              tone="danger"
              confirm="Pulsa otra vez para quitarla"
              onClick={() => {
                removeLeague(l.id);
                toast(`${l.name} quitada de Competiciones.`);
              }}
            />
          ) : null
        }
      />
    </div>
  );
}

/**
 * Revisión de la identidad global de equipos.
 *
 * La referencia es interna, pero de ella salen tres cosas visibles: el nombre oficial, el escudo y que el
 * club sea UN equipo y no dos. Aquí aparecen los nombres que no se pudieron identificar sin adivinar, para
 * confirmarlos a mano; los que se quedaron sin escudo; y los clubes que la app ya reconoce en varias
 * competiciones.
 */
function TeamIdentityPanel() {
  const leagues = useStore((s) => s.leagues);
  const teams = useStore((s) => s.derived.teams);
  const issues = useStore((s) => s.teamIssues);
  const aliases = useStore((s) => s.identityAliases);
  const setIdentityAlias = useStore((s) => s.setIdentityAlias);

  const identificados = teams.filter((t) => t.ref).length;
  /*
   * Sin escudo es lo que de verdad se nota en pantalla, y no siempre coincide con «sin identificar»: un club
   * de una liga que ESPN no cubre se enlaza por su clave en la competición y sí tiene escudo.
   */
  const sinEscudo = teams
    .filter((t) => !officialTeam(t.ref, t.id)?.crestUrl)
    .sort((a, b) => a.leagueId.localeCompare(b.leagueId) || a.name.localeCompare(b.name));

  const { multi, nombrePorRef } = useMemo(() => {
    const porRef = new Map<string, { name: string; leagues: string[] }>();
    for (const t of teams) {
      if (!t.ref) continue;
      const e = porRef.get(t.ref) ?? { name: t.name, leagues: [] };
      if (!e.leagues.includes(t.leagueId)) e.leagues.push(t.leagueId);
      porRef.set(t.ref, e);
    }
    return {
      multi: [...porRef.values()].filter((e) => e.leagues.length > 1).sort((a, b) => a.name.localeCompare(b.name)),
      nombrePorRef: new Map([...porRef].map(([ref, e]) => [ref, e.name])),
    };
  }, [teams]);

  return (
    <div className="space-y-4 p-4">
      <StatRow cols={4}>
        <Stat label="Equipos identificados" value={`${fmtInt(identificados)} de ${fmtInt(teams.length)}`} />
        <Stat label="Clubes en varias competiciones" value={fmtInt(multi.length)} />
        <Stat label="Pendientes de revisar" value={fmtInt(issues.length)} tone={issues.length ? 'warning' : undefined} />
        <Stat label="Sin escudo" value={fmtInt(sinEscudo.length)} tone={sinEscudo.length ? 'warning' : undefined} />
      </StatRow>

      <p className="max-w-3xl text-[13px] text-muted">
        Cada equipo lleva una referencia interna que es la misma en todas las competiciones que juega: así la app sabe que el Real Madrid de LaLiga y el de la
        Champions son el mismo club. Un nombre solo se compara con los clubes de <strong>su propia competición</strong>, nunca con los de otras ligas. Al
        vincularlo, el club recibe su <strong>nombre oficial y su escudo</strong> en todas las pantallas, y si la competición lo tenía escrito de dos formas
        («Fortaleza FC» y «Fortaleza CEIF») las dos pasan a ser <strong>un solo equipo</strong>, con la grafía de la temporada en curso. Ninguna estadística
        cambia de valor: se juntan las de un club que estaba partido en dos.
      </p>

      {issues.length === 0 ? (
        <p className="flex items-center gap-2 text-[13px] text-positive-text">
          <CheckCircle2 size={16} aria-hidden /> Todos los equipos están identificados.
        </p>
      ) : (
        <div className="overflow-hidden rounded-card border border-border">
          <ScrollTable>
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">Competición</th>
                  <th scope="col">Nombre en tus datos</th>
                  <th scope="col">Motivo</th>
                  <th scope="col">Es este club</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((i) => {
                  const liga = leagues.find((l) => l.id === i.leagueId);
                  const candidatos = new Set(i.candidates.map((c) => c.espnId));
                  // Los candidatos dudosos arriba, marcados; el resto de la plantilla debajo.
                  const opciones = [...(liga ? rosterFor(liga) : [])].sort(
                    (a, b) => Number(candidatos.has(b.espnId)) - Number(candidatos.has(a.espnId)) || a.name.localeCompare(b.name),
                  );
                  return (
                    <tr key={`${i.leagueId}|${i.name}`}>
                      <td className="text-muted">{i.leagueId}</td>
                      <td className="font-medium">{i.name}</td>
                      <td className="whitespace-normal text-muted">
                        {i.status === 'ambiguous'
                          ? `Encaja con ${i.candidates.length} clubes`
                          : i.status === 'shared'
                            ? `Se parece a ${i.candidates[0]?.name ?? 'otro club'}, que ya tiene otro nombre en esta competición`
                            : 'No aparece en la plantilla'}
                      </td>
                      <td>
                        <select className={inputClass} defaultValue="" onChange={(e) => setIdentityAlias(i.name, e.target.value)} aria-label={`Club al que corresponde ${i.name}`}>
                          <option value="">Elegir…</option>
                          {opciones.map((t) => (
                            <option key={t.espnId} value={t.espnId}>
                              {candidatos.has(t.espnId) ? '★ ' : ''}
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollTable>
        </div>
      )}

      {sinEscudo.length > 0 && (
        <details className="text-[13px]">
          <summary className="rounded text-muted">{fmtInt(sinEscudo.length)} equipos sin escudo</summary>
          {/* La lista no es un error que haya que arreglar siempre: hay competiciones cuya fuente no publica escudos. */}
          <ul className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {sinEscudo.map((t) => (
              <li key={t.id} className="flex min-w-0 items-center gap-1.5">
                <TeamLabel teamId={t.id} name={t.name} />
                <span className="truncate text-faint">{t.leagueId}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {Object.keys(aliases).length > 0 && (
        <details className="text-[13px]">
          <summary className="rounded text-muted">{Object.keys(aliases).length} confirmados a mano</summary>
          <ul className="mt-2 space-y-1">
            {Object.entries(aliases).map(([nombre, espnId]) => (
              <li key={nombre} className="flex items-center gap-2">
                <span className="text-muted">{nombre}</span>→<span>{nombrePorRef.get(teamRef(espnId)) ?? `club ${espnId}`}</span>
                <IconButton icon={<X size={14} />} label={`Quitar la confirmación de ${nombre}`} size="sm" tone="danger" onClick={() => setIdentityAlias(nombre, '')} />
              </li>
            ))}
          </ul>
        </details>
      )}

      {multi.length > 0 && (
        <details className="text-[13px]">
          <summary className="rounded text-muted">{multi.length} clubes reconocidos en varias competiciones</summary>
          <ul className="mt-2 space-y-1">
            {multi.map((e) => (
              <li key={`${e.name}|${e.leagues.join('|')}`}>
                <span className="font-medium">{e.name}</span>
                <span className="text-muted"> · {e.leagues.join(' · ')}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function downloadJson(data: unknown) {
  descargarArchivo('analisis-futbol.json', JSON.stringify(data, null, 2), 'application/json');
}
