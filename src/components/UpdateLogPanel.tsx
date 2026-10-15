import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Badge, Card } from './ui';
import { useStore } from '../store/useStore';

/**
 * Registro de la última ejecución de «Actualizar partidos», liga por liga.
 *
 * La línea de cada liga dice lo esencial (fuente y recuentos); al abrirla se ven la URL
 * consultada, el archivo guardado y todas las fuentes que se probaron, en orden, con lo que
 * respondió cada una.
 */
export function UpdateLogPanel() {
  const log = useStore((s) => s.updateLog);
  if (log.length === 0) return null;

  const correctas = log.filter((e) => e.ok).length;
  const cuando = new Date(log[0].at).toLocaleString('es-ES');

  return (
    <Card
      title="Registro de la última actualización"
      subtitle={`${correctas}/${log.length} ligas procesadas correctamente · ${cuando}`}
    >
      <ul className="divide-y divide-border">
        {log.map((e) => (
          <li key={e.leagueId}>
            <details className="px-4 py-2.5">
              <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                {e.ok ? (
                  <CheckCircle2 size={15} className="shrink-0 text-positive-text" aria-label="Correcta" />
                ) : (
                  <AlertTriangle size={15} className="shrink-0 text-negative-text" aria-label="Con errores" />
                )}
                <span className="font-medium">{e.leagueName}</span>
                {e.source && (
                  <Badge tone={e.secondary ? 'warning' : 'positive'}>
                    {e.secondary ? `Secundaria · ${e.source}` : `Oficial · ${e.source}`}
                  </Badge>
                )}
                {e.ok ? (
                  <span className="text-muted tabular-nums">
                    {e.found} encontrados · {e.created} nuevos · {e.updated} actualizados ·{' '}
                    {e.unchanged} sin cambios · {e.duplicatesAvoided} duplicados evitados
                  </span>
                ) : (
                  <span className="text-negative-text">{e.errors[0] ?? 'No se pudo actualizar'}</span>
                )}
              </summary>

              <div className="mt-2 space-y-1 pl-6 text-[12px] text-muted">
                {e.url && (
                  <p className="break-all">
                    URL consultada:{' '}
                    <a href={e.url} target="_blank" rel="noreferrer noopener" className="text-accent-text hover:underline">
                      {e.url}
                    </a>
                  </p>
                )}
                {e.season && <p>Temporada según la fuente: {e.season}</p>}
                {e.file && (
                  <p>
                    Archivo: data/ligas/{e.file}
                    {e.excel &&
                      ` · ${e.excel.created ? 'creado' : 'actualizado'} · ${e.excel.playedRows} partidos disputados` +
                        (e.excel.preserved ? ` (${e.excel.preserved} conservados del archivo)` : '')}
                  </p>
                )}
                {(e.newFixtures > 0 || e.closedFixtures > 0) && (
                  <p>
                    Pendientes: {e.newFixtures} nuevos · {e.closedFixtures} pasaron a disputados
                  </p>
                )}
                <p>Fuentes consultadas, en orden:</p>
                <ol className="list-decimal pl-5">
                  {e.attempts.map((a, i) => (
                    <li key={i}>
                      {a.source} ({a.secondary ? 'secundaria' : 'oficial'}) — {a.ok ? 'datos obtenidos' : a.error}
                    </li>
                  ))}
                </ol>
                {e.notes.map((n, i) => (
                  <p key={`n${i}`}>Aviso: {n}</p>
                ))}
                {e.errors.map((err, i) => (
                  <p key={`e${i}`} className="text-negative-text">
                    Error: {err}
                  </p>
                ))}
              </div>
            </details>
          </li>
        ))}
      </ul>
    </Card>
  );
}
