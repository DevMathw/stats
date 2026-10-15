/**
 * Administración de los históricos por competición: qué temporadas hay, cargar una nueva y borrarla.
 *
 * El flujo es «propone y confirma», no «adivina y carga». Al elegir un archivo se lee sin guardar nada y se
 * enseña qué temporada y qué fase se han deducido, de dónde salen y qué avisos hay; el usuario corrige lo
 * que haga falta antes de que nada toque los datos. Hace falta porque el libro NO dice a qué temporada
 * pertenece: medido sobre los 15 archivos, la columna «Temporada» viene vacía y la hoja LIGAS dice siempre
 * «2026/27» aunque el archivo sea de 2025.
 *
 * La temporada en curso aparece en la lista pero no se puede borrar desde aquí: se mantiene sola con
 * «Actualizar partidos».
 */
import { useMemo, useRef, useState } from 'react';
import { Trash2, Upload } from 'lucide-react';
import { useStore } from '../store/useStore';
import { seasonsOf, type SeasonProposal } from '../services/import/historicalImport';
import { seasonKey } from '../domain/models/season';
import { Badge, Button, Callout, Card, Empty, Field, IconButton, SectionTitle, inputClass } from './ui';
import { LeagueLabel } from './LeagueLabel';
import { fmtInt } from '../utils/format';

interface Pendiente {
  file: File;
  proposal: SeasonProposal;
  matches: number;
  leagueId: string;
  season: string;
  phase: string;
}

export function HistoricalDatasets() {
  const leagues = useStore((s) => s.leagues);
  const matches = useStore((s) => s.matches);
  const datasets = useStore((s) => s.datasets);
  const status = useStore((s) => s.status);
  const inspect = useStore((s) => s.inspectHistoricalExcel);
  const importar = useStore((s) => s.importHistoricalExcel);
  const borrar = useStore((s) => s.removeSeason);

  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const vigentes = useMemo(() => new Map(leagues.map((l) => [l.id, seasonKey(l.season)])), [leagues]);

  /** Solo las competiciones que tienen partidos: cargar un histórico en una liga vacía no tiene sentido. */
  const conDatos = useMemo(
    () => leagues.map((l) => ({ league: l, seasons: seasonsOf(matches, l.id) })).filter((x) => x.seasons.length > 0),
    [leagues, matches],
  );

  const elegirArchivo = async (file: File) => {
    setError(null);
    try {
      const { proposal, matches: n, leagueName } = await inspect(file);
      // El libro trae el nombre de su competición: si coincide con una dada de alta, se preselecciona.
      const encaja = leagues.find((l) => l.id === leagueName)?.id ?? leagues[0]?.id ?? '';
      setPendiente({ file, proposal, matches: n, leagueId: encaja, season: proposal.season ?? '', phase: proposal.phase ?? '' });
    } catch (e) {
      setError(`No se pudo leer ${file.name}: ${(e as Error).message}`);
    }
  };

  const confirmar = async () => {
    if (!pendiente) return;
    await importar(pendiente.leagueId, pendiente.file, { season: pendiente.season, phase: pendiente.phase || null });
    setPendiente(null);
    if (input.current) input.current.value = '';
  };

  return (
    <div className="space-y-5 p-4">
      <Callout tone="accent" title="Cómo funciona">
        Cada archivo se carga en <strong>una competición y una temporada concretas</strong>. Los partidos históricos se
        guardan enteros, entrenan a los modelos y son el <strong>punto de partida de las proyecciones</strong>: los goles
        esperados, las medias de la competición, la dispersión de córners y tarjetas mientras la temporada es corta, los
        enfrentamientos directos y la confianza de cada pick se apoyan en ellos (Configuración → Modelo,{' '}
        <code>PRIOR</code>). Lo que <strong>no</strong> hacen es entrar en la tabla, en la forma reciente ni en los puntos:
        eso sigue siendo solo de la temporada en curso. Un dato que el archivo no traiga queda como N/D: nunca se rellena.
      </Callout>

      <div>
        <SectionTitle>Cargar un archivo histórico</SectionTitle>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={input}
            type="file"
            accept=".xlsx,.xls"
            aria-label="Archivo histórico en Excel"
            disabled={status !== 'idle'}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void elegirArchivo(f);
            }}
            className={`${inputClass} max-w-sm file:mr-2 file:rounded file:border-0 file:bg-surface-2 file:px-2 file:py-1 file:text-[12px]`}
          />
          <span className="text-[12px] text-faint">Se lee sin guardar nada: primero verás qué temporada propone.</span>
        </div>
        {error && (
          <p className="mt-2 text-[13px] text-negative-text" role="alert">
            {error}
          </p>
        )}
      </div>

      {pendiente && (
        <Card
          tone="accent"
          title={`Revisar antes de cargar: ${pendiente.file.name}`}
          subtitle={`${fmtInt(pendiente.matches)} partidos leídos. Comprueba la competición y la temporada.`}
        >
          <div className="space-y-3 p-4">
            {pendiente.proposal.warnings.map((w) => (
              <p key={w} className="text-[13px] text-warning-text" role="alert">
                {w}
              </p>
            ))}

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Competición">
                <select className={inputClass} value={pendiente.leagueId} onChange={(e) => setPendiente({ ...pendiente, leagueId: e.target.value })}>
                  {leagues.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={`Temporada${pendiente.proposal.from.season ? ` (del ${pendiente.proposal.from.season})` : ''}`}>
                <input
                  className={inputClass}
                  value={pendiente.season}
                  placeholder="2025 o 2026-27"
                  onChange={(e) => setPendiente({ ...pendiente, season: e.target.value })}
                />
              </Field>
              <Field label="Fase (opcional)">
                <input
                  className={inputClass}
                  value={pendiente.phase}
                  placeholder="Apertura, Clausura…"
                  onChange={(e) => setPendiente({ ...pendiente, phase: e.target.value })}
                />
              </Field>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" onClick={() => void confirmar()} disabled={!pendiente.season || status !== 'idle'} loading={status === 'importing'}>
                <Upload size={14} aria-hidden /> Cargar en {leagues.find((l) => l.id === pendiente.leagueId)?.name ?? '—'}
              </Button>
              <Button onClick={() => setPendiente(null)}>Cancelar</Button>
            </div>
          </div>
        </Card>
      )}

      <div>
        <SectionTitle>Temporadas cargadas</SectionTitle>
        {conDatos.length === 0 ? (
          <Empty title="Todavía no hay datos">Importa el Excel de una competición o pulsa «Actualizar partidos».</Empty>
        ) : (
          <div className="space-y-3">
            {conDatos.map(({ league, seasons }) => (
              <div key={league.id} className="rounded-card border border-border">
                <div className="flex items-center gap-2 border-b border-border bg-surface-2 px-3 py-2">
                  <LeagueLabel leagueId={league.id} size="sm" />
                  {/* Temporadas distintas, no filas: una competición por fases tiene varias filas del mismo año. */}
                  <span className="ml-auto text-[12px] text-faint tabular-nums">
                    {(() => {
                      const n = new Set(seasons.map((x) => x.season)).size;
                      return `${n} ${n === 1 ? 'temporada' : 'temporadas'}`;
                    })()}
                  </span>
                </div>
                <table className="data">
                  <thead>
                    <tr>
                      <th scope="col">Temporada</th>
                      <th scope="col">Fase</th>
                      <th scope="col" className="num">Partidos</th>
                      <th scope="col">Origen</th>
                      <th scope="col">Rango</th>
                      <th scope="col" className="actions">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {seasons.map((s) => {
                      const esVigente = vigentes.get(league.id) === seasonKey(s.season);
                      const d = datasets.find((x) => x.leagueId === league.id && x.season === s.season && x.phase === s.phase);
                      const sinDato = d ? Object.entries(d.coverage).filter(([, n]) => n === 0).map(([k]) => k) : [];
                      return (
                        <tr key={`${s.season}|${s.phase ?? ''}`}>
                          <td className="font-medium tabular-nums">
                            {s.season} {esVigente && <Badge tone="accent" title="Se mantiene sola con «Actualizar partidos»">En curso</Badge>}
                          </td>
                          <td>{s.phase ?? <span className="text-faint">—</span>}</td>
                          <td className="num tabular-nums">{fmtInt(s.matches)}</td>
                          <td className="text-muted">
                            {d ? (
                              <span title={`Cargado el ${new Date(d.importedAt).toLocaleString('es-ES')}`}>{d.fileName}</span>
                            ) : (
                              <span className="text-faint">Fuentes en vivo</span>
                            )}
                          </td>
                          <td className="text-muted tabular-nums">{d ? `${d.firstDate} → ${d.lastDate}` : <span className="text-faint">—</span>}</td>
                          <td className="actions">
                            <IconButton
                              icon={<Trash2 size={16} />}
                              label={`Eliminar ${s.season}${s.phase ? ` (${s.phase})` : ''}`}
                              tone="danger"
                              confirm="Pulsa otra vez para eliminarla"
                              disabled={esVigente}
                              disabledReason="La temporada en curso no se borra desde aquí"
                              onClick={() => borrar(league.id, s.season)}
                            />
                          </td>
                          {sinDato.length > 0 && (
                            <td className="sr-only">El archivo no traía {sinDato.join(', ')}</td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {/* Lo que el archivo NO traía, dicho explícitamente en vez de dejarlo en un N/D suelto. */}
                {seasons.map((s) => {
                  const d = datasets.find((x) => x.leagueId === league.id && x.season === s.season && x.phase === s.phase);
                  const sinDato = d ? Object.entries(d.coverage).filter(([, n]) => n === 0).map(([k]) => k) : [];
                  return sinDato.length === 0 ? null : (
                    <p key={`falta-${s.season}|${s.phase ?? ''}`} className="border-t border-border px-3 py-1.5 text-[12px] text-muted">
                      <strong className="tabular-nums">{s.season}{s.phase ? ` · ${s.phase}` : ''}</strong>: el archivo no traía {sinDato.join(', ')}. Esos
                      mercados no se pueden calcular con esta temporada.
                    </p>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
