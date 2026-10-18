import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Calculator, FlaskConical, Plus, Target } from 'lucide-react';
import type { Selection } from '../types/betting';
import { BackLink, ButtonLink, Callout, Card, Empty, IconButton } from '../components/ui';
import { InfoTip } from '../components/InfoTip';
import { toast } from '../components/Toast';
import { ModelComposition } from '../components/Match/ModelComposition';
import { MatchMomentum } from '../components/Match/MatchMomentum';
import { MatchHero } from '../components/Match/MatchHero';
import { AiInsight } from '../components/Match/AiInsight';
import { ModelPredictions } from '../components/Match/ModelPredictions';
import { ModelPickCard } from '../components/Betting/ModelPick';
import { Figure, ProbabilityBar, QualityBadge, pct } from '../components/Betting/BetUi';
import { TIPS } from '../components/Betting/tips';
import { useFixtureData, useModelPick } from '../components/Betting/useFixtureData';
import { canPush, estimateMarket, selectionKey, selectionLabel, type MarketEstimate } from '../domain/betting/markets';
import { marketContextOf } from '../domain/betting/evaluation';
import { useActiveProfile, useBetting } from '../store/useBetting';

interface Grupo {
  titulo: string;
  tip: string;
  selecciones: Selection[];
}

const GRUPOS: Grupo[] = [
  {
    titulo: 'Resultado',
    tip: 'Modelo 1X2 del libro: logística sobre la diferencia de goles esperados y empate que decae con ella.',
    selecciones: [
      { market: 'resultado', outcome: 'home' },
      { market: 'resultado', outcome: 'draw' },
      { market: 'resultado', outcome: 'away' },
      { market: 'doble', outcome: '1X' },
      { market: 'doble', outcome: 'X2' },
      { market: 'doble', outcome: '12' },
    ],
  },
  {
    titulo: 'Goles',
    tip: 'Poisson sobre los goles esperados de cada equipo.',
    selecciones: [
      { market: 'goles', side: 'over', line: 1.5 },
      { market: 'goles', side: 'over', line: 2.5 },
      { market: 'goles', side: 'over', line: 3.5 },
      { market: 'btts', outcome: 'si' },
    ],
  },
  {
    titulo: 'Goles por parte',
    tip: 'Poisson sobre los goles esperados de cada parte: los del partido repartidos como los reparte la liga (44,7 % en la 1.ª parte en el conjunto de ligas). Se liquida con el resultado al descanso.',
    selecciones: ([1, 2] as const).flatMap((half) => [0.5, 1.5].map((line) => ({ market: 'mitad', half, side: 'over', line }) as Selection)),
  },
  {
    titulo: 'Hándicaps',
    tip: 'Quién gana, del 1X2 del modelo; por cuánto, de Poisson. En el empate no válido, si empatan se devuelve el stake: la barra es la probabilidad de ganar sin contar esa devolución.',
    selecciones: [
      { market: 'asiatico', team: 'home', line: 0 },
      { market: 'asiatico', team: 'away', line: 0 },
      { market: 'asiatico', team: 'home', line: -1.5 },
      { market: 'asiatico', team: 'away', line: -1.5 },
      { market: 'asiatico', team: 'home', line: 1.5 },
      { market: 'asiatico', team: 'away', line: 1.5 },
    ],
  },
  {
    titulo: 'Goles por equipo',
    tip: 'Poisson con los goles esperados de cada equipo. Portería a cero: que el rival no marque.',
    selecciones: [
      { market: 'equipo', team: 'home', side: 'over', line: 0.5 },
      { market: 'equipo', team: 'home', side: 'over', line: 1.5 },
      { market: 'equipo', team: 'away', side: 'over', line: 0.5 },
      { market: 'equipo', team: 'away', side: 'over', line: 1.5 },
      { market: 'cero', team: 'home', outcome: 'si' },
      { market: 'cero', team: 'away', outcome: 'si' },
    ],
  },
  {
    titulo: 'Corners',
    tip: 'Corners esperados del modelo con la dispersión medida en la liga (binomial negativa).',
    selecciones: [8.5, 9.5, 10.5].map((line) => ({ market: 'corners', side: 'over', line }) as Selection),
  },
  {
    titulo: 'Tarjetas amarillas',
    tip: 'Amarillas esperadas con la dispersión de la liga. El árbitro, que decide mucho, no está en el modelo.',
    selecciones: [3.5, 4.5, 5.5].map((line) => ({ market: 'tarjetas', side: 'over', line }) as Selection),
  },
];

export function FixtureDetailPage() {
  const { fixtureId = '' } = useParams();
  const id = decodeURIComponent(fixtureId);
  const getData = useFixtureData();
  const data = useMemo(() => getData(id), [getData, id]);
  const profile = useActiveProfile();
  const addDraftLeg = useBetting((s) => s.addDraftLeg);
  const pick = useModelPick(data);

  const estimados = useMemo(() => {
    if (!data) return null;
    const ctx = marketContextOf(data, profile.settings.minSample);
    return GRUPOS.map((g) => g.selecciones.map((s) => ({ s, e: estimateMarket(s, ctx) })));
  }, [data, profile.settings.minSample]);

  if (!data || !estimados) {
    return (
      <Card>
        <Empty
          icon={<Target />}
          title="Partido pendiente no encontrado"
          action={
            <Link to="/proyecciones" className="text-[13px] font-medium text-accent-text hover:underline">
              Volver a Proyecciones
            </Link>
          }
        >
          Puede que ya se haya jugado o que no tenga proyección.
        </Empty>
      </Card>
    );
  }

  const { fixture: f, projection: p } = data;
  const grupo = (titulo: string) => estimados[GRUPOS.findIndex((g) => g.titulo === titulo)];
  const goles = grupo('Goles')[1].e;
  const corners = grupo('Corners')[1].e;
  const tarjetas = grupo('Tarjetas amarillas')[1].e;

  const acciones = (s: Selection) => {
    const nombre = selectionLabel(s, f.homeTeamName, f.awayTeamName);
    return (
      <span className="flex gap-0.5">
        <IconButton icon={<Calculator size={15} />} label={`Evaluar ${nombre} con una cuota`} size="sm" tone="accent" to={`/picks?f=${encodeURIComponent(f.id)}&m=${encodeURIComponent(selectionKey(s))}`} />
        <IconButton
          icon={<Plus size={15} />}
          label={`Añadir ${nombre} al ticket`}
          size="sm"
          tone="accent"
          disabled={canPush(s)}
          disabledReason="Puede devolver el stake: los tickets todavía no combinan devoluciones"
          onClick={() => {
            const e = addDraftLeg({ fixtureId: f.id, selection: s, odds: null });
            if (e) toast(e, 'error');
            else toast(`${nombre} añadido al ticket.`, 'success', { label: 'Ver ticket', to: '/tickets' });
          }}
        />
      </span>
    );
  };

  const explicacion = (e: MarketEstimate) =>
    e.probability === null
      ? e.reason
      : e.push > 0
        ? `Gana ${pct(e.probability * (1 - e.push))} · se devuelve ${pct(e.push)} · pierde ${pct((1 - e.probability) * (1 - e.push))}. La barra es la probabilidad de ganar sin contar la devolución.`
        : TIPS.probEstimada;

  return (
    <div className="space-y-4">
      <BackLink to="/proyecciones">Proyecciones</BackLink>

      {/* El partido primero y grande: es de lo que va toda la pantalla. */}
      <MatchHero fixture={f} projection={p} />

      <div className="flex flex-wrap justify-end gap-2">
        <ButtonLink to={`/picks?f=${encodeURIComponent(f.id)}`} variant="primary">
          <Calculator size={14} aria-hidden /> Evaluar pick
        </ButtonLink>
      </div>

      <Callout tone="warning" icon={<FlaskConical size={16} />}>
        Todo lo que ves aquí son <strong>estimaciones del modelo</strong>, no hechos ni pronósticos seguros. Un 60 % significa que, en partidos con estas
        cifras, el evento ocurriría unas 6 de cada 10 veces si el modelo estuviera bien calibrado. Cómo lo está de verdad se mide en{' '}
        <Link to="/historial?tab=backtest" className="font-medium underline">
          Historial → Backtesting
        </Link>
        .
      </Callout>

      {/* Qué está moviendo la proyección, antes de las 56 probabilidades de los mercados. */}
      <div className="grid gap-4 xl:grid-cols-2">
        <AiInsight projection={p} />
        {pick && <ModelPickCard result={pick} fixtureId={f.id} />}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {GRUPOS.map((g, gi) => {
          const ref = estimados[gi][0].e;
          return (
            <Card
              key={g.titulo}
              title={
                <span className="flex items-center gap-1.5">
                  {g.titulo} <InfoTip>{g.tip}</InfoTip>
                </span>
              }
              right={<QualityBadge quality={ref.dataQuality} />}
              subtitle={<Muestra e={ref} />}
            >
              <div className="px-4 py-2">
                {estimados[gi].map(({ s, e }) => (
                  <ProbabilityBar
                    key={selectionKey(s)}
                    label={selectionLabel(s, f.homeTeamName, f.awayTeamName)}
                    value={e.probability}
                    tip={explicacion(e)}
                    action={e.probability === null ? undefined : acciones(s)}
                  />
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      <Card title="Proyección estadística" subtitle="Valores esperados del modelo y el intervalo que contiene el 80 % central de su distribución">
        <div className="grid gap-4 p-4 sm:grid-cols-3">
          <Proyeccion titulo="Goles" e={goles} total={p.expectedGoalsTotal} local={p.expectedGoalsHome} visitante={p.expectedGoalsAway} />
          <Proyeccion titulo="Corners" e={corners} total={p.expectedCornersTotal} local={p.expectedCornersHome} visitante={p.expectedCornersAway} />
          <Proyeccion titulo="Tarjetas amarillas" e={tarjetas} total={p.expectedCardsTotal} local={p.expectedCardsHome} visitante={p.expectedCardsAway} />
        </div>
      </Card>

      <Card title="Composición del modelo" subtitle="De dónde salen los goles esperados">
        <ModelComposition p={p} />
      </Card>

      <ModelPredictions fixture={f} />

      {/* Solo tiene datos cuando el partido ya ha empezado; antes, la fuente dice que aún no ha empezado. */}
      <MatchMomentum match={f} />
    </div>
  );
}

function Muestra({ e }: { e: MarketEstimate }) {
  return (
    <span>
      Muestra: {e.sampleHome} del local en casa · {e.sampleAway} del visitante fuera
      {(e.historySampleHome > 0 || e.historySampleAway > 0) &&
        ` · ${e.historySampleHome} y ${e.historySampleAway} de temporadas anteriores (cuentan la mitad en la confianza)`}
      {e.coverage !== null && ` · cobertura ${pct(e.coverage, 0)}`}
      {e.leagueSample !== null && ` · ${e.leagueSample} partidos de la liga con el dato`}
    </span>
  );
}

function Proyeccion({ titulo, e, total, local, visitante }: { titulo: string; e: MarketEstimate; total: number | null; local: number | null; visitante: number | null }) {
  const nivel = e.confidence >= 6 ? 'Media-alta' : e.confidence >= 4 ? 'Media' : e.confidence > 0 ? 'Baja' : 'Sin estimación';
  return (
    <div className="rounded-card border border-border p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="t-h3">{titulo}</h3>
        <QualityBadge quality={e.dataQuality} />
      </div>
      {total === null ? (
        <p className="text-[12px] text-muted">Datos insuficientes: la liga no publica esta estadística.</p>
      ) : e.dataQuality === 'insuficiente' ? (
        // Sin muestra o con datos inconsistentes, un valor esperado aparentaría una proyección fiable.
        <div className="grid grid-cols-2 gap-3">
          <Figure label="Total esperado" value={<span className="text-[13px] text-faint">Datos insuficientes</span>} />
          <Figure label="Muestra" value={`${e.sampleHome} · ${e.sampleAway}`} hint="local en casa · visitante fuera" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Figure label="Total esperado" value={`≈ ${total.toFixed(1)}`} hint={`${local?.toFixed(2) ?? '—'} – ${visitante?.toFixed(2) ?? '—'}`} />
          <Figure label="Rango probable" tip={TIPS.rango} value={e.range80 ? `${e.range80[0]}–${e.range80[1]}` : '—'} />
          <Figure label="Confianza" tip={TIPS.confianza} value={`${e.confidence.toFixed(1)}/10`} hint={nivel} />
          <Figure
            label="Muestra"
            value={`${e.sampleHome} · ${e.sampleAway}`}
            hint={
              e.historySampleHome > 0 || e.historySampleAway > 0
                ? `local en casa · visitante fuera (+${e.historySampleHome} y +${e.historySampleAway} antes)`
                : 'local en casa · visitante fuera'
            }
          />
        </div>
      )}
      {e.reason && <p className="mt-2 text-[11px] text-faint">{e.reason}</p>}
    </div>
  );
}
