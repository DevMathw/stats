/**
 * El gráfico del momentum: una barra por minuto alrededor de un eje central.
 *
 * Está dibujado en SVG a mano y no con la librería de gráficos por tres motivos concretos: las barras
 * tienen que salir del CENTRO hacia arriba y hacia abajo (no desde una base), el descanso parte el
 * gráfico en dos bloques con un hueco real, y los goles y las expulsiones se marcan encima de su
 * minuto. Con la librería, cada una de esas tres cosas era un apaño.
 *
 * Arriba el local, abajo el visitante, con el color de cada uno a la izquierda. La altura de cada barra
 * es el valor del minuto (0–100 en su lado), y la escala es relativa al propio partido: se explica en
 * la tarjeta, porque un +100 no significa «dominio total» sino «su mejor momento en este partido».
 */
import type { MatchMomentum, TimelineEvent } from '../../domain/statistics/momentum';

/** Minutos que ocupa el hueco del descanso, para que se vea la separación. */
const HUECO_DESCANSO = 3;

const MARCA: Record<TimelineEvent['kind'], { simbolo: string; color: string; enGrafico: boolean }> = {
  gol: { simbolo: '⚽', color: 'var(--text)', enGrafico: true },
  roja: { simbolo: '▌', color: 'var(--negative)', enGrafico: true },
  amarilla: { simbolo: '▌', color: 'var(--warning)', enGrafico: false },
  'penalti-fallado': { simbolo: '✕', color: 'var(--muted)', enGrafico: false },
};

export function MomentumChart({
  momentum,
  homeName,
  awayName,
  height = 190,
}: {
  momentum: MatchMomentum;
  homeName: string;
  awayName: string;
  height?: number;
}) {
  const fin = Math.max(momentum.lastMinute, 1);
  const segundaParte = fin > 45;

  // El eje x lleva un hueco en el descanso: los dos tiempos quedan como dos bloques.
  const ancho = fin + (segundaParte ? HUECO_DESCANSO : 0);
  const x = (minuto: number) => (minuto <= 45 ? minuto : minuto + HUECO_DESCANSO);

  const alto = height;
  const centro = alto / 2;
  // Deja aire arriba y abajo para las marcas de gol.
  const maxBarra = centro - 14;
  const anchoBarra = 0.82;

  const goles = momentum.events.filter((e) => MARCA[e.kind].enGrafico);

  return (
    <figure className="m-0">
      <figcaption className="sr-only">
        Momentum del partido minuto a minuto. Barras hacia arriba: {homeName}. Hacia abajo: {awayName}.
      </figcaption>

      <div className="flex items-stretch gap-2">
        {/* Identificación de los dos equipos, como en un marcador. */}
        <div className="flex w-20 shrink-0 flex-col justify-between py-1 text-[11px] font-medium sm:w-28">
          <span className="flex items-center gap-1.5 truncate" style={{ color: 'var(--series-3)' }}>
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: 'var(--series-3)' }} aria-hidden />
            <span className="truncate">{homeName}</span>
          </span>
          <span className="flex items-center gap-1.5 truncate" style={{ color: 'var(--series-1)' }}>
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: 'var(--series-1)' }} aria-hidden />
            <span className="truncate">{awayName}</span>
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <svg
            viewBox={`0 0 ${ancho} ${alto}`}
            preserveAspectRatio="none"
            className="h-[190px] w-full rounded-card"
            style={{ background: 'var(--surface-2)' }}
            role="img"
            aria-label={`Momentum de ${homeName} contra ${awayName}`}
          >
            {/* Mitad de arriba y de abajo, con un tinte muy suave que separa los dos lados. */}
            <rect x={0} y={0} width={ancho} height={centro} fill="var(--series-3)" opacity={0.07} />
            <rect x={0} y={centro} width={ancho} height={centro} fill="var(--series-1)" opacity={0.07} />

            {/* Hueco del descanso. */}
            {segundaParte && (
              <rect x={45} y={0} width={HUECO_DESCANSO} height={alto} fill="var(--surface)" />
            )}

            {momentum.points.map((p) => {
              const valor = Math.max(-100, Math.min(100, p.value));
              const largo = (Math.abs(valor) / 100) * maxBarra;
              if (largo < 0.4) return null;
              const local = valor >= 0;
              return (
                <rect
                  key={p.minute}
                  x={x(p.minute) - anchoBarra / 2}
                  y={local ? centro - largo : centro}
                  width={anchoBarra}
                  height={largo}
                  rx={0.35}
                  fill={local ? 'var(--series-3)' : 'var(--series-1)'}
                  opacity={0.95}
                >
                  <title>{`Minuto ${p.minute}: ${Math.abs(valor)} / 100 a favor de ${local ? homeName : awayName}`}</title>
                </rect>
              );
            })}

            {/* Eje central. */}
            <line x1={0} y1={centro} x2={ancho} y2={centro} stroke="var(--border-strong)" strokeWidth={0.4} />

            {/* Goles y expulsiones, en el lado del equipo al que pertenecen. */}
            {goles.map((e, i) => (
              <g key={`${e.kind}-${e.minute}-${i}`}>
                <line
                  x1={x(e.minute)}
                  y1={e.home ? centro - maxBarra - 4 : centro}
                  x2={x(e.minute)}
                  y2={e.home ? centro : centro + maxBarra + 4}
                  stroke={MARCA[e.kind].color}
                  strokeWidth={0.35}
                  opacity={0.5}
                />
                <circle
                  cx={x(e.minute)}
                  cy={e.home ? centro - maxBarra - 5 : centro + maxBarra + 5}
                  r={3.4}
                  fill="var(--surface)"
                  stroke={MARCA[e.kind].color}
                  strokeWidth={0.5}
                />
                <text
                  x={x(e.minute)}
                  y={(e.home ? centro - maxBarra - 5 : centro + maxBarra + 5) + 1.6}
                  textAnchor="middle"
                  fontSize={4.2}
                  fill={MARCA[e.kind].color}
                >
                  {MARCA[e.kind].simbolo}
                  <title>{`${e.minute}' ${e.kind === 'gol' ? 'Gol' : 'Expulsión'}${e.player ? ` · ${e.player}` : ''}`}</title>
                </text>
              </g>
            ))}
          </svg>

          {/* Minutos y descanso, fuera del SVG para que el texto no se deforme. */}
          <div className="relative mt-1 h-4 text-[10px] text-faint">
            {[0, 15, 30, 45, 60, 75, 90].filter((m) => m <= fin).map((m) => (
              <span key={m} className="absolute -translate-x-1/2 tabular-nums" style={{ left: `${(x(m) / ancho) * 100}%` }}>
                {m}'
              </span>
            ))}
            {segundaParte && (
              <span
                className="absolute -translate-x-1/2 rounded-pill bg-surface-3 px-1.5 text-[9px] tracking-wide text-muted uppercase"
                style={{ left: `${((45 + HUECO_DESCANSO / 2) / ancho) * 100}%` }}
              >
                descanso
              </span>
            )}
          </div>
        </div>
      </div>
    </figure>
  );
}
