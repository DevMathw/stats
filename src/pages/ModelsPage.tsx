/**
 * Laboratorio de modelos: qué modelos hay, cuáles pueden entrenarse con los datos que hay, y cuál
 * acierta más medido en el propio histórico.
 *
 * La tabla no se calcula al abrir la pantalla: sale del último backtest guardado. Medir cuesta un par
 * de minutos y el resultado no cambia hasta que hay partidos nuevos, así que se mide cuando se pide.
 */
import { useMemo } from 'react';
import { FlaskConical, Play, TriangleAlert } from 'lucide-react';
import { Badge, Button, Callout, Card, Empty, PageHeader, Stat, StatRow } from '../components/ui';
import { InfoTip } from '../components/InfoTip';
import { DataTable, type Column } from '../components/DataTable';
import { useStore } from '../store/useStore';
import { MODELS } from '../domain/prediction/models';
import { MIN_PARTIDOS_PREVIOS } from '../domain/prediction/backtest';
import type { ModelScores } from '../domain/prediction/evaluate';
import { fmt, fmtInt, fmtPct, NA } from '../utils/format';

const mejor = (filas: ModelScores[], campo: 'oneX2' | 'over25' | 'btts') => {
  const conDato = filas.filter((f) => f[campo].logLoss !== null);
  return conDato.length ? conDato.reduce((a, b) => (b[campo].logLoss! < a[campo].logLoss! ? b : a)).id : null;
};

export function ModelsPage() {
  const run = useStore((s) => s.predictionRun);
  const progreso = useStore((s) => s.predictionProgress);
  const lanzar = useStore((s) => s.runPredictionBacktest);
  const matches = useStore((s) => s.matches.length);
  const activos = useStore((s) => s.predictionModels);
  const alternar = useStore((s) => s.togglePredictionModel);

  const desactualizado = run !== null && run.matchesAtRun !== matches;

  const columnas = (campo: 'oneX2' | 'over25' | 'btts', filas: ModelScores[]): Column<ModelScores>[] => {
    const lider = mejor(filas, campo);
    return [
      {
        id: 'modelo',
        header: 'Modelo',
        cell: (m) => (
          <span className="flex items-center gap-2">
            <span className={m.id === 'ensemble' ? 'font-semibold' : ''}>{m.name}</span>
            {m.id === lider && <Badge tone="positive">mejor</Badge>}
          </span>
        ),
        sortValue: (m) => m.name,
      },
      { id: 'n', header: 'Partidos', numeric: true, cell: (m) => m[campo].n || NA, sortValue: (m) => m[campo].n },
      {
        id: 'logloss',
        header: 'Log loss',
        title: 'Menos es mejor. Castiga la seguridad equivocada: es la métrica que decide.',
        numeric: true,
        cell: (m) => fmt(m[campo].logLoss, 4),
        sortValue: (m) => m[campo].logLoss,
      },
      { id: 'brier', header: 'Brier', title: 'Error cuadrático de las probabilidades. Menos es mejor.', numeric: true, hideOnMobile: true, cell: (m) => fmt(m[campo].brier, 4), sortValue: (m) => m[campo].brier },
      { id: 'acierto', header: 'Acierto', title: 'Veces que el resultado más probable fue el que pasó.', numeric: true, cell: (m) => fmtPct(m[campo].accuracy, 1), sortValue: (m) => m[campo].accuracy },
      { id: 'ece', header: 'ECE', title: 'Error de calibración: distancia entre lo que dice y lo que pasa. Menos es mejor.', numeric: true, hideOnMobile: true, cell: (m) => fmtPct(m[campo].ece, 1), sortValue: (m) => m[campo].ece },
      {
        id: 'skill',
        header: 'Aporte',
        title: '1 − log loss / log loss de predecir siempre la frecuencia base. Positivo: el modelo aporta algo sobre no modelar nada.',
        numeric: true,
        cell: (m) => {
          const v = m[campo].skill;
          if (v === null) return NA;
          return <span className={v > 0 ? 'text-positive-text' : 'text-negative-text'}>{fmtPct(v, 1)}</span>;
        },
        sortValue: (m) => m[campo].skill,
      },
    ];
  };

  const pesos = useMemo(() => {
    if (!run) return [];
    return [
      { mercado: '1X2', lista: run.weights1x2 },
      { mercado: 'Over 2.5', lista: run.weightsOver },
      { mercado: 'BTTS', lista: run.weightsBtts },
    ];
  }, [run]);

  const lider1x2 = run && run.common.models.find((m) => m.id === mejor(run.common.models, 'oneX2'));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Modelos de predicción"
        description="Siete modelos sobre los mismos datos reales, medidos con backtesting temporal: cada partido se predice solo con lo anterior a él."
        actions={
          <Button variant="primary" onClick={() => void lanzar()} loading={progreso !== null} disabled={progreso !== null}>
            {progreso === null && <Play size={14} aria-hidden />}
            {progreso === null ? (run ? 'Volver a medir' : 'Medir los modelos') : 'Midiendo…'}
          </Button>
        }
      />

      {progreso && (
        <Callout tone="accent" title="Backtest en marcha">
          {progreso}. Cada corte reentrena los siete modelos con los partidos anteriores a esa fecha; tarda un par de minutos.
        </Callout>
      )}

      {desactualizado && !progreso && (
        <Callout tone="warning" icon={<TriangleAlert size={16} />} title="Medición antigua">
          Se midió con {run!.matchesAtRun} partidos y ahora hay {matches}. Los pesos siguen sirviendo, pero conviene volver a medir.
        </Callout>
      )}

      {/*
        * Misma banda de resumen que el resto de pantallas. Solo con una medición hecha: sin ella, lo que hay
        * que leer es el bloque que explica cómo medir, no cinco tarjetas vacías.
        */}
      {run && lider1x2 !== undefined && (
        <StatRow>
          <Stat
            label="Modelos activos"
            value={fmtInt(activos.length)}
            hint={`de ${MODELS.length} disponibles`}
            icon={<FlaskConical />}
            hero
          />
          <Stat label="Partidos evaluados" value={fmtInt(run.samples)} tip="Predicciones hechas en el backtest, sumando todos los modelos que respondieron." />
          <Stat label="Comparación justa" value={fmtInt(run.common.records)} hint="partidos que respondieron todos" />
          <Stat
            label="Mejor log loss en 1X2"
            value={fmt(lider1x2?.oneX2.logLoss ?? null, 4)}
            hint={lider1x2?.name}
            tip="El log loss más bajo de la comparación justa. Menos es mejor: castiga la seguridad equivocada."
          />
          <Stat
            label="Última medición"
            value={<span className="whitespace-nowrap">{run.measuredAt.slice(0, 10)}</span>}
            hint={`con ${fmtInt(run.matchesAtRun)} partidos`}
            tip="Cuándo se corrió el backtest y con cuántos partidos había entonces."
          />
        </StatRow>
      )}

      <Card
        title="Los modelos"
        subtitle="Qué mira cada uno y cuántos partidos necesita. Un modelo apagado no entra ni en el backtest ni en las predicciones"
      >
        <ul className="divide-y divide-border">
          {MODELS.map((m) => {
            const fuera = run?.skipped.find((s) => s.id === m.id);
            const medido = run?.scores.find((s) => s.id === m.id);
            return (
              <li key={m.id} className="flex flex-wrap items-start justify-between gap-2 p-3">
                <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={activos.includes(m.id)}
                    onChange={() => alternar(m.id)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
                    aria-label={`Usar ${m.name}`}
                  />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-[13px] font-medium">
                    {m.name}
                    {fuera ? <Badge tone="warning">sin datos suficientes</Badge> : medido ? <Badge tone="positive">medido</Badge> : null}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-muted">{m.description}</span>
                  {fuera && <span className="mt-0.5 block text-[12px] text-warning-text">{fuera.reason}</span>}
                  {!activos.includes(m.id) && <span className="mt-0.5 block text-[12px] text-faint">Apagado: no participa.</span>}
                </span>
                </label>
                <span className="shrink-0 text-right text-[12px] text-muted">
                  mínimo {m.minMatches} partidos
                  {medido && <span className="block text-faint">respondió a {medido.answered}</span>}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      {!run ? (
        <Card>
          <Empty icon={<FlaskConical />} title="Todavía no se han medido">
            Pulsa «Medir los modelos» para recorrer el histórico partido a partido y comparar los siete. Mientras no se mida, el
            ensemble reparte por igual entre los modelos que respondan y lo dice en cada predicción.
          </Empty>
        </Card>
      ) : (
        <>
          <Card
            title={
              <span className="flex items-center gap-2">
                Comparación cara a cara
                <InfoTip>
                  Solo los {run.common.records} partidos que TODOS los modelos pudieron predecir. Es la comparación justa: un modelo
                  que solo responde a partidos fáciles saldría mejor en la tabla completa sin ser mejor.
                </InfoTip>
              </span>
            }
            subtitle={`1X2 · ${run.common.records} partidos · medido el ${run.measuredAt.slice(0, 10)}`}
          >
            <DataTable rows={run.common.models} columns={columnas('oneX2', run.common.models)} getRowId={(m) => m.id} maxHeight="none" initialSort={{ id: 'logloss', dir: 'asc' }} />
          </Card>

          <Card title="Todos los partidos que respondió cada modelo" subtitle={`1X2 · ${run.samples} partidos evaluados en total`}>
            <DataTable rows={run.scores} columns={columnas('oneX2', run.scores)} getRowId={(m) => m.id} maxHeight="none" initialSort={{ id: 'logloss', dir: 'asc' }} />
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Over 2.5" subtitle="Solo los partidos que respondieron todos">
              <DataTable rows={run.common.models} columns={columnas('over25', run.common.models)} getRowId={(m) => m.id} maxHeight="none" initialSort={{ id: 'logloss', dir: 'asc' }} />
            </Card>
            <Card title="Ambos marcan" subtitle="Solo los partidos que respondieron todos">
              <DataTable rows={run.common.models} columns={columnas('btts', run.common.models)} getRowId={(m) => m.id} maxHeight="none" initialSort={{ id: 'logloss', dir: 'asc' }} />
            </Card>
          </div>

          <Card
            title="Pesos del ensemble"
            subtitle="Salen de minimizar la log loss de la mezcla sobre las predicciones pasadas, no de una elección a mano"
          >
            <div className="space-y-4 p-4">
              {pesos.map(({ mercado, lista }) => (
                <div key={mercado}>
                  <p className="mb-1.5 text-[12px] font-medium text-muted">{mercado}</p>
                  {lista.length === 0 ? (
                    <p className="text-[12px] text-faint">Sin pesos medidos: se reparte por igual.</p>
                  ) : (
                    <div className="space-y-1">
                      {[...lista]
                        .sort((a, b) => b[1] - a[1])
                        .map(([id, peso]) => (
                          <div key={id} className="flex items-center gap-2">
                            <span className="w-36 shrink-0 truncate text-[12px]">{MODELS.find((m) => m.id === id)?.name ?? id}</span>
                            <div className="h-2 flex-1 overflow-hidden rounded-pill bg-surface-3">
                              <div className="h-full rounded-pill bg-accent" style={{ width: `${peso * 100}%` }} />
                            </div>
                            <span className="w-12 shrink-0 text-right text-[12px] tabular-nums">{(peso * 100).toFixed(1)}%</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card title="Qué no mide este backtest" subtitle="Los límites, dichos aquí y no en una nota al pie">
            <ul className="list-disc space-y-1.5 p-4 pl-8 text-[13px] text-muted">
              <li>
                Solo entran los partidos en los que los dos equipos llevaban al menos {MIN_PARTIDOS_PREVIOS} partidos jugados. Las
                primeras jornadas de cada competición no se pueden predecir sin historia y no se cuentan.
              </li>
              <li>
                Hay una sola temporada cargada. Los modelos de aprendizaje automático y la red neuronal rinden por debajo de su
                potencial con este tamaño de histórico, y es lo que se ve en la tabla.
              </li>
              <li>Los modelos se reentrenan cada tres semanas de calendario, no en cada partido: es lo que se podría hacer en la práctica.</li>
              <li>No hay datos de lesiones, alineaciones ni sanciones en ninguna de las fuentes actuales: ninguna variable los recoge.</li>
              <li>No hay cuotas históricas: esto mide acierto y calibración, no rentabilidad.</li>
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
