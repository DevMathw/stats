import { Award } from 'lucide-react';
import type { Selection } from '../../types/betting';
import type { ModelPick } from '../../domain/betting/modelPick';
import { Badge, Button, ButtonLink, Card } from '../ui';
import { InfoTip } from '../InfoTip';
import { Tooltip } from '../Tooltip';
import { Figure, QualityBadge, RiskBadge, pct, pp } from './BetUi';
import { TIPS } from './tips';

/**
 * Pick del modelo para un partido, con su justificación, o «Sin selección recomendada». Debajo, las otras opciones que
 * también cumplen los criterios.
 */
export function ModelPickCard({ result, fixtureId, onSelect }: { result: ModelPick; fixtureId: string; onSelect?: (s: Selection) => void }) {
  const { best: b, summary, candidates } = result;
  const otras = candidates.filter((c) => !c.reason && c !== b).slice(0, 3);
  return (
    <Card
      title={
        <span className="flex items-center gap-1.5">
          <Award size={15} className="text-ai" aria-hidden /> Pick del modelo <InfoTip>{TIPS.pickModelo}</InfoTip>
        </span>
      }
      subtitle="Lo elige la plataforma, sin cuotas y con criterios medibles. Es una estimación, no un pronóstico seguro"
      right={b ? <Badge tone="positive">Pick recomendado</Badge> : <Badge>Sin selección recomendada</Badge>}
      // Violeta como el resto de lo que sale de un modelo: el pick no es un dato observado, es una estimación.
      tone="ai"
    >
      <div className="space-y-3 p-4">
        {b && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="t-h2 text-[17px]">{b.label}</span>
              <span className="flex flex-wrap items-center gap-1.5">
                {b.risk && <RiskBadge risk={b.risk} />}
                <QualityBadge quality={b.estimate.dataQuality} />
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Figure label="Probabilidad" tip={TIPS.probEstimada} value={pct(b.estimate.probability)} />
              <Figure label="En la liga" tip={TIPS.ventajaLiga} value={pct(b.league?.rate)} hint={`${b.league?.n ?? 0} partidos`} />
              <Figure label="Ventaja" tip={TIPS.ventajaLiga} value={pp(b.lift)} tone="positive" />
              <Figure label="Confianza" tip={TIPS.confianza} value={`${b.estimate.confidence.toFixed(1)}/10`} />
              <Figure label="Cuota justa" tip={TIPS.cuotaJusta} value={b.estimate.probability ? (1 / b.estimate.probability).toFixed(2) : '—'} />
              <Figure label="Con valor desde" tip={TIPS.cuotaMinima} value={b.minOdds?.toFixed(2) ?? '—'} />
            </div>
          </>
        )}
        <ul className="space-y-1 text-[13px]">
          {summary.map((l) => (
            <li key={l} className="flex gap-2">
              <span className="text-faint">·</span>
              <span>{l}</span>
            </li>
          ))}
        </ul>
        {b &&
          (onSelect ? (
            <Button size="sm" variant="primary" onClick={() => onSelect(b.selection)}>
              Evaluar con tu cuota
            </Button>
          ) : (
            <ButtonLink size="sm" variant="primary" to={`/picks?f=${encodeURIComponent(fixtureId)}&m=${encodeURIComponent(b.key)}`}>
              Evaluar con tu cuota
            </ButtonLink>
          ))}
      </div>
      {otras.length > 0 && (
        <div className="border-t border-border px-4 py-3">
          <p className="mb-1.5 text-[12px] font-medium text-muted">Otras opciones que cumplen los criterios</p>
          <ul className="space-y-1 text-[12px]">
            {otras.map((c) => (
              <li key={c.key} className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-medium">{c.label}</span>
                <span className="text-muted tabular-nums">
                  {pct(c.estimate.probability)} · {pp(c.lift)} sobre la liga · confianza {c.estimate.confidence.toFixed(1)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

/** Celda compacta para la tabla de Proyecciones. */
export function ModelPickCell({ result }: { result: ModelPick | undefined }) {
  if (!result) return <span className="text-[12px] text-faint">—</span>;
  const b = result.best;
  return (
    <Tooltip content={result.summary.join(' ')}>
      {b ? (
        <span className="inline-flex min-w-0 flex-col leading-tight">
          <span className="max-w-48 truncate text-[12px] font-medium text-positive-text">{b.label}</span>
          <span className="text-[11px] text-muted tabular-nums">
            {pct(b.estimate.probability, 0)} · {pp(b.lift)} · conf. {b.estimate.confidence.toFixed(1)}
          </span>
        </span>
      ) : (
        <span className="text-[12px] text-muted">Sin selección</span>
      )}
    </Tooltip>
  );
}
