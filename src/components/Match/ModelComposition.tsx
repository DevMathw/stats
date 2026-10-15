import type { ReactNode } from 'react';
import type { MatchProjection } from '../../types';
import { fmt } from '../../utils/format';

/**
 * Cómo se forman los goles esperados (λ) de un partido: la tabla del análisis de Proyecciones.
 *
 * Con el ensemble como fuente, la λ que manda es la de los modelos y este desglose es el del libro:
 * se sigue enseñando porque explica los datos del partido, pero se dice que ya no es el que decide.
 * Una tabla cuyo total no cuadra con la λ de arriba, sin avisar, sería peor que no enseñarla.
 */
export function ModelComposition({ p }: { p: MatchProjection }) {
  const b = p.breakdown;
  const delLibro = p.source === 'libro';
  const line = (label: string, home: ReactNode, away: ReactNode) => (
    <tr>
      <td className="text-muted">{label}</td>
      <td className="num">{home}</td>
      <td className="num">{away}</td>
    </tr>
  );
  return (
    <div className="overflow-x-auto">
      <table className="data">
        <thead>
          <tr>
            <th scope="col">Componente</th>
            <th scope="col" className="num">Local</th>
            <th scope="col" className="num">Visitante</th>
          </tr>
        </thead>
        <tbody>
          {line('Fuerza base (temporada)', fmt(b.baseHome), fmt(b.baseAway))}
          {/* De dónde parte la contracción de esa fuerza base: el propio equipo, o la media de la liga. */}
          {line(
            'Histórico propio (prior)',
            b.priorMatchesHome > 0 ? `${b.priorMatchesHome} PJ` : 'media de liga',
            b.priorMatchesAway > 0 ? `${b.priorMatchesAway} PJ` : 'media de liga',
          )}
          {line('Forma últimos 5 (prom GF)', fmt(b.form5Home), fmt(b.form5Away))}
          {line('Forma últimos 10 (prom GF)', fmt(b.form10Home), fmt(b.form10Away))}
          {line('xG (término W_XG)', fmt(b.xgHome), fmt(b.xgAway))}
          {line(
            `Ajuste H2H (${b.h2hMatches} duelos)`,
            `${b.h2hAdjustment >= 0 ? '+' : ''}${b.h2hAdjustment.toFixed(3)}`,
            `${-b.h2hAdjustment >= 0 ? '+' : ''}${(-b.h2hAdjustment).toFixed(3)}`,
          )}
          {line(
            'Ajuste SoS (multiplicativo)',
            `${b.sosAdjustmentHome >= 0 ? '+' : ''}${(b.sosAdjustmentHome * 100).toFixed(2)}%`,
            `${b.sosAdjustmentAway >= 0 ? '+' : ''}${(b.sosAdjustmentAway * 100).toFixed(2)}%`,
          )}
          <tr className={delLibro ? 'font-semibold' : 'text-muted'}>
            <td>{delLibro ? 'Goles esperados (λ)' : 'Goles esperados del libro (no se usan)'}</td>
            <td className="num">{fmt(delLibro ? p.expectedGoalsHome : b.baseHome)}</td>
            <td className="num">{fmt(delLibro ? p.expectedGoalsAway : b.baseAway)}</td>
          </tr>
          {!delLibro && (
            <tr className="font-semibold">
              <td>Goles esperados (λ) · {p.source === 'mixto' ? 'mixto' : 'ensemble'}</td>
              <td className="num">{fmt(p.expectedGoalsHome)}</td>
              <td className="num">{fmt(p.expectedGoalsAway)}</td>
            </tr>
          )}
        </tbody>
      </table>
      {!delLibro && (
        <p className="mt-2 text-[12px] text-muted">
          Los goles esperados y el 1X2 de este partido salen {p.source === 'mixto' ? 'de un 70 % del libro y un 30 % de la mezcla de ' : 'de la mezcla de '}
          {p.modelsUsed?.length ?? 0} modelos
          {p.modelConfidence !== null ? ` (confianza ${p.modelConfidence}/10)` : ''}. El desglose de arriba es el del modelo del
          libro: sigue explicando los datos del partido, pero no es el que decide. Se cambia en Configuración → FUENTE_PROYECCION.
        </p>
      )}
    </div>
  );
}
