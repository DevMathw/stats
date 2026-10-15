/**
 * Lectura del modelo sobre un partido: qué factores lo han movido y con cuánta confianza.
 *
 * Dos avisos que este componente tiene que dejar claros, porque es fácil leerlo mal:
 *
 *  1. Aquí no escribe nada un modelo de lenguaje. Cada línea sale de `projectionDrivers`, que compara ESTE
 *     partido con la media de su competición usando los mismos números que el modelo ya calculó. Si un
 *     factor no se puede calcular, no aparece: no hay frases de relleno ni texto generado.
 *  2. Son estimaciones. Por eso todo el bloque va en el color de IA (`--ai`), que en esta aplicación
 *     significa exactamente eso: lo ha estimado un modelo, no ha ocurrido.
 */
import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import type { MatchProjection } from '../../types';
import { projectionDrivers } from '../../domain/projections/drivers';
import { useStore } from '../../store/useStore';
import { Confidence } from '../ui';

/** De dónde salen los goles esperados y el 1X2 de esta proyección, con nombre y apellidos. */
function describirFuente(p: MatchProjection): string {
  const n = p.modelsUsed?.length ?? 0;
  if (p.source === 'libro') return 'Modelo del libro: fuerza base + forma + xG + enfrentamientos + calidad de rivales';
  if (p.source === 'mixto') return `70 % modelo del libro + 30 % mezcla de ${n} modelos entrenados con el histórico cargado`;
  return `Mezcla de ${n} modelos entrenados con el histórico cargado`;
}

const COLOR_LADO: Record<'home' | 'away' | 'match', string> = {
  home: 'var(--series-3)',
  away: 'var(--series-1)',
  match: 'var(--muted)',
};

export function AiInsight({ projection, className = '' }: { projection: MatchProjection; className?: string }) {
  const averages = useStore((s) => s.derived.averagesByLeague.get(projection.leagueId));
  const drivers = useMemo(() => projectionDrivers(projection, averages), [projection, averages]);

  // La barra de cada factor es relativa al más fuerte de ESTE partido: dice cuál pesa más entre ellos, no
  // una magnitud absoluta, que no significaría nada comparando ventaja de campo con forma reciente.
  const mayor = drivers.reduce((m, d) => Math.max(m, d.weight), 0);

  return (
    <section className={`overflow-hidden rounded-card border border-ai-border bg-surface shadow-card ${className}`}>
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-ai-border bg-ai-soft/45 px-4 py-3">
        <div className="min-w-0">
          <span className="flex items-center gap-1.5 text-ai-text">
            <Sparkles size={14} aria-hidden />
            <span className="t-label">Análisis del modelo</span>
          </span>
          <h2 className="t-h2 mt-1">
            {drivers.length > 0
              ? `${drivers.length} ${drivers.length === 1 ? 'factor explica' : 'factores explican'} esta proyección`
              : 'Sin factores medibles todavía'}
          </h2>
        </div>
        {projection.modelConfidence !== null && (
          <div className="shrink-0">
            <div className="t-label mb-1 text-muted">Confianza</div>
            <Confidence value={projection.modelConfidence} />
          </div>
        )}
      </header>

      {drivers.length === 0 ? (
        <p className="px-4 py-3 text-[13px] text-muted">
          Esta competición todavía no tiene partidos suficientes para separar qué factor pesa más. Aparecerán en cuanto los
          haya: no se rellena con estimaciones.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {drivers.map((d) => (
            <li key={d.label} className="px-4 py-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <span className="flex min-w-0 items-center gap-2 text-[13px] font-medium">
                  <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: COLOR_LADO[d.side] }} aria-hidden />
                  <span className="truncate">{d.label}</span>
                </span>
                <span className="text-[12px] text-muted tabular-nums">{d.value}</span>
              </div>
              {mayor > 0 && (
                <span className="mt-1.5 block h-1 w-full overflow-hidden rounded-pill bg-surface-3" aria-hidden>
                  <span className="block h-full rounded-pill" style={{ width: `${(d.weight / mayor) * 100}%`, background: COLOR_LADO[d.side] }} />
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <footer className="border-t border-border bg-surface-2 px-4 py-2.5 text-[11px] leading-relaxed text-faint">
        {describirFuente(projection)}. Los factores se calculan comparando este partido con la media de su competición y se
        ordenan por cuánto se alejan de ella. Son <strong className="font-medium">probabilidades estimadas</strong>, no un
        pronóstico seguro, y ningún texto de esta tarjeta está generado: todo son cifras del propio modelo.
      </footer>
    </section>
  );
}
