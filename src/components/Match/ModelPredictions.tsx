/**
 * Qué dice cada modelo de ESTE partido, y qué sale de mezclarlos.
 *
 * Enseña las probabilidades de cada modelo por separado, quién entró en la mezcla, con qué peso, y una
 * confianza que sale de tres cosas medibles (muestra, acuerdo entre modelos y calibración comprobada).
 * Un modelo que no puede responder aparece con su motivo: es tan informativo como los que responden.
 *
 * Entrenar los siete modelos con todo el histórico ocupa decenas de segundos de CPU, así que se hace
 * cuando se pide y en un Web Worker. El motor entrenado lo guarda el worker, no esta pantalla: así la
 * ficha de un partido reutiliza el entrenamiento del lote de Proyecciones en vez de repetirlo.
 */
import { useState } from 'react';
import { Brain, Play } from 'lucide-react';
import { Badge, Button, Card } from '../ui';
import { InfoTip } from '../InfoTip';
import { ProbabilityBar } from '../Betting/BetUi';
import { useStore } from '../../store/useStore';
import { SIN_MEDIR, type FixturePrediction } from '../../domain/prediction/engine';
import { fromStored } from '../../domain/prediction/storage';
import { predecirFicha } from '../../workers/predictionClient';
import { OVER_LINES } from '../../domain/prediction/types';
import { fmt, fmtPct, NA } from '../../utils/format';
import type { Fixture } from '../../types';

export function ModelPredictions({ fixture }: { fixture: Fixture }) {
  const matches = useStore((s) => s.matches);
  const leagues = useStore((s) => s.leagues);
  const params = useStore((s) => s.params);
  const run = useStore((s) => s.predictionRun);
  const activos = useStore((s) => s.predictionModels);

  const [estado, setEstado] = useState<'inicio' | 'entrenando' | 'listo'>('inicio');
  const [prediccion, setPrediccion] = useState<FixturePrediction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const calibracion = fromStored(run) ?? SIN_MEDIR;

  const calcular = async () => {
    setEstado('entrenando');
    setError(null);
    try {
      setPrediccion(await predecirFicha({ matches, leagues, params, modelIds: activos }, fixture, calibracion));
      setEstado('listo');
    } catch (e) {
      setError((e as Error).message);
      setEstado('inicio');
    }
  };

  const p = prediccion;

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          Modelos de predicción
          <InfoTip>
            Siete modelos sobre los mismos datos: Poisson, Dixon-Coles, Elo, xG, bosque aleatorio, gradient boosting y una red
            neuronal. El ensemble los mezcla con los pesos que midió el backtest. Cada fila es lo que dice ESE modelo por su cuenta.
          </InfoTip>
        </span>
      }
      subtitle={
        run
          ? `Pesos y calibración medidos el ${run.measuredAt.slice(0, 10)} con ${run.samples} partidos`
          : 'Sin backtest guardado: la mezcla reparte por igual. Mídelos en Predicción → Modelos'
      }
      right={
        <Button onClick={() => void calcular()} loading={estado === 'entrenando'} disabled={estado === 'entrenando'}>
          {estado === 'entrenando' ? 'Entrenando…' : (
            <>
              <Play size={14} aria-hidden /> {p ? 'Recalcular' : 'Calcular'}
            </>
          )}
        </Button>
      }
    >
      <div className="space-y-4 p-3">
        {error && <p className="text-[13px] text-negative-text">No se pudieron calcular: {error}</p>}

        {!p && estado !== 'entrenando' && (
          <p className="flex items-center gap-2 text-[13px] text-muted">
            <Brain size={15} className="text-faint" aria-hidden />
            Pulsa «Calcular» para entrenar los modelos con los {matches.length} partidos cargados y ver qué dice cada uno.
          </p>
        )}

        {p?.ensemble && (
          <div className="rounded-card border border-border p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[13px] font-semibold">Ensemble</span>
              <span className="flex items-center gap-2">
                <Badge tone={p.confidence.value >= 6 ? 'positive' : p.confidence.value >= 4 ? 'warning' : 'neutral'}>
                  Confianza {p.confidence.value}/10
                </Badge>
                <span className="text-[11px] text-muted">{p.ensemble.used.length} modelos</span>
              </span>
            </div>
            <div className="space-y-1.5">
              <ProbabilityBar label="Gana local" value={p.ensemble.probs1x2.home} emphasis />
              <ProbabilityBar label="Empate" value={p.ensemble.probs1x2.draw} emphasis />
              <ProbabilityBar label="Gana visitante" value={p.ensemble.probs1x2.away} emphasis />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px] sm:grid-cols-4">
              {OVER_LINES.map((linea) => (
                <div key={linea}>
                  <dt className="text-muted">Over {linea}</dt>
                  <dd className="tabular-nums">{fmtPct(p.ensemble!.over[linea] ?? null, 1)}</dd>
                </div>
              ))}
              <div>
                <dt className="text-muted">Ambos marcan</dt>
                <dd className="tabular-nums">{fmtPct(p.ensemble.btts, 1)}</dd>
              </div>
              <div>
                <dt className="text-muted">Goles esperados</dt>
                <dd className="tabular-nums">
                  {p.ensemble.expectedGoals ? `${fmt(p.ensemble.expectedGoals.home, 2)} – ${fmt(p.ensemble.expectedGoals.away, 2)}` : NA}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted">Marcadores más probables</dt>
                <dd className="tabular-nums">
                  {p.ensemble.scorelines?.length
                    ? p.ensemble.scorelines.slice(0, 3).map((s) => `${s.score} (${(s.probability * 100).toFixed(1)}%)`).join(' · ')
                    : NA}
                </dd>
              </div>
            </dl>
            <ul className="mt-3 space-y-0.5 border-t border-border pt-2 text-[11px] text-muted">
              {p.confidence.reasons.map((r) => (
                <li key={r}>· {r}</li>
              ))}
            </ul>
          </div>
        )}

        {p && p.byModel.length > 0 && (
          <div className="overflow-x-auto">
            <table className="data w-full">
              <thead>
                <tr>
                  <th scope="col">Modelo</th>
                  <th scope="col" className="num">Peso</th>
                  <th scope="col" className="num">1</th>
                  <th scope="col" className="num">X</th>
                  <th scope="col" className="num">2</th>
                  <th scope="col" className="num">Over 2.5</th>
                  <th scope="col" className="num">BTTS</th>
                  <th scope="col" className="num">Goles esp.</th>
                </tr>
              </thead>
              <tbody>
                {p.byModel.map((m) => {
                  const peso = p.ensemble?.weights.find((w) => w.id === m.id)?.weight ?? null;
                  const pr = m.probabilities;
                  return (
                    <tr key={m.id}>
                      <td className="whitespace-nowrap">{m.name}</td>
                      <td className="num text-muted">{peso === null ? NA : `${(peso * 100).toFixed(0)}%`}</td>
                      <td className="num">{fmtPct(pr.probs1x2.home, 1)}</td>
                      <td className="num">{fmtPct(pr.probs1x2.draw, 1)}</td>
                      <td className="num">{fmtPct(pr.probs1x2.away, 1)}</td>
                      <td className="num">{fmtPct(pr.over[2.5] ?? null, 1)}</td>
                      <td className="num">{fmtPct(pr.btts, 1)}</td>
                      <td className="num">{pr.expectedGoals ? `${fmt(pr.expectedGoals.home, 2)}–${fmt(pr.expectedGoals.away, 2)}` : NA}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {p && p.missing.length > 0 && (
          <div className="rounded-card border border-border bg-surface-2 p-3">
            <p className="mb-1 text-[12px] font-medium text-muted">Modelos que no participaron</p>
            <ul className="space-y-0.5 text-[12px] text-muted">
              {p.missing.map((m) => (
                <li key={m.id}>
                  <span className="font-medium">{m.name}</span>: {m.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}
