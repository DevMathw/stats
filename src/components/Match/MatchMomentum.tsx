/**
 * Gráfico de momentum: qué equipo aprieta en cada minuto.
 *
 * Los datos (tiros con su minuto y su xG, goles y tarjetas) se piden a la fuente del partido al pulsar, no
 * se guardan: son del partido, no del modelo. La curva y su metodología están en
 * `src/domain/statistics/momentum.ts`; aquí solo se dibuja.
 *
 * Mientras el partido está en juego, la fuente se vuelve a consultar cada minuto.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { Badge, Button, Card, Empty, ErrorState, Skeleton } from '../ui';
import { InfoTip } from '../InfoTip';
import { useStore } from '../../store/useStore';
import { fetchMatchMomentum } from '../../services/providers/officialSources';
import { MomentumChart } from './MomentumChart';
import type { MatchMomentum as Momentum, TimelineEvent } from '../../domain/statistics/momentum';
import type { Fixture, Match } from '../../types';

const MARCA: Record<TimelineEvent['kind'], { label: string }> = {
  gol: { label: 'Gol' },
  roja: { label: 'Roja' },
  amarilla: { label: 'Amarilla' },
  'penalti-fallado': { label: 'Penalti fallado' },
};

/** Cada cuánto se vuelve a preguntar mientras el partido está en juego. */
const REFRESCO_EN_VIVO = 60_000;

export function MatchMomentum({ match }: { match: Match | Fixture }) {
  const league = useStore((s) => s.leagues.find((l) => l.id === match.leagueId));
  const aliases = useStore((s) => s.identityAliases);

  const [estado, setEstado] = useState<'inicio' | 'cargando' | 'listo' | 'error'>('inicio');
  const [momentum, setMomentum] = useState<Momentum | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const vivo = useRef(false);

  const cargar = useCallback(
    async (silencioso = false) => {
      if (!league) return;
      if (!silencioso) setEstado('cargando');
      try {
        const r = await fetchMatchMomentum(match, league, aliases);
        setMomentum(r.momentum);
        vivo.current = r.momentum?.ongoing === true;
        setEstado('listo');
        // Sin cronología NO es un error: es un dato que esa fuente no publica. Se guarda qué se intentó.
        setMensaje(r.momentum ? null : r.attempts.map((a) => `${a.source}: ${a.ok ? 'ok' : a.error}`).join(' → '));
      } catch (e) {
        setEstado('error');
        setMensaje((e as Error).message);
      }
    },
    [match, league, aliases],
  );

  // En vivo se refresca solo; terminado, una consulta y ya.
  useEffect(() => {
    if (estado !== 'listo' || !vivo.current) return;
    const t = window.setInterval(() => void cargar(true), REFRESCO_EN_VIVO);
    return () => window.clearInterval(t);
  }, [estado, momentum, cargar]);

  const local = match.homeTeamName;
  const visitante = match.awayTeamName;
  /** Consulta terminada y sin nada que dibujar: o no contestó nadie, o contestó sin minutos. */
  const sinCurva = estado === 'listo' && !momentum?.points.length;

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          Momentum del partido
          <InfoTip>
            Cada tiro pesa su xG (un tiro sin xG publicado cuenta como 0,03) y un gol suma 0,30 más. El efecto de
            cada tiro se desvanece con el tiempo (a los 5 minutos queda el 37 %). Arriba, el local; abajo, el
            visitante. La escala es relativa a este partido: el punto más alto es su momento más dominante, así que
            no se puede comparar con otro partido. Tarjetas y expulsiones se marcan, pero no entran en la curva.
          </InfoTip>
        </span>
      }
      subtitle={
        momentum
          ? `${momentum.source} · ${momentum.totals.shotsHome}–${momentum.totals.shotsAway} tiros` +
            (momentum.totals.xgHome !== null && momentum.totals.xgAway !== null
              ? ` · xG ${momentum.totals.xgHome}–${momentum.totals.xgAway}`
              : '')
          : 'Se calcula con los tiros y goles con minuto que publique la fuente del partido'
      }
      right={
        <span className="flex items-center gap-2">
          {momentum?.ongoing && <Badge tone="accent">En juego · se actualiza solo</Badge>}
          <Button onClick={() => void cargar()} loading={estado === 'cargando'} disabled={!league}>
            {estado === 'cargando' ? 'Consultando…' : momentum ? <RefreshCw size={14} aria-hidden /> : 'Ver momentum'}
          </Button>
        </span>
      }
    >
      <div className="p-3">
        {!league && <p className="text-[13px] text-muted">La competición de este partido no está dada de alta.</p>}

        {estado === 'inicio' && league && (
          <p className="flex items-center gap-2 text-[13px] text-muted">
            <Activity size={15} className="text-faint" aria-hidden />
            Pulsa «Ver momentum» para consultar la cronología del partido en su fuente.
          </p>
        )}

        {momentum && momentum.points.length > 0 && (
          <>
            <MomentumChart momentum={momentum} homeName={local} awayName={visitante} />
            <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
              {momentum.events.map((e, i) => (
                <li key={`${e.minute}-${e.kind}-${i}`}>
                  <span className="tabular-nums">{e.minute}'</span> {MARCA[e.kind].label}
                  {e.player ? ` · ${e.player}` : ''} <span className="text-faint">({e.home ? local : visitante})</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {estado === 'cargando' && <Skeleton className="h-[190px] w-full" />}

        {/*
          * «No hay dato» y «ha fallado la consulta» NO son lo mismo y hasta ahora se veían igual, los dos
          * como un párrafo gris. Lo primero es definitivo: esa fuente no publica la cronología y no hay nada
          * que reintentar. Lo segundo es temporal y sí se reintenta, así que lleva su botón.
          */}
        {estado === 'error' && (
          <ErrorState
            title="No se ha podido consultar la cronología"
            detail={mensaje ?? 'La fuente no ha respondido.'}
            onRetry={() => void cargar()}
          />
        )}

        {/*
          * Sin curva hay dos maneras de llegar y las dos son «no hay dato», no un fallo: que ninguna fuente
          * conteste, o que conteste sin los tiros minuto a minuto, que es lo que pasa en las ligas
          * sudamericanas. Se explica cuál de las dos ha sido y no se dibuja nada inventado.
          */}
        {sinCurva && (
          <Empty icon={<Activity />} title="Sin cronología para este partido">
            {momentum?.note ?? 'Ninguna fuente publica la cronología de este partido.'} No es un fallo de la
            aplicación y no hay nada que reintentar: sin tiros con su minuto no hay curva, y no se inventa una.
            {mensaje && <span className="mt-2 block text-[11px] text-faint">Se intentó con {mensaje}</span>}
          </Empty>
        )}
      </div>
    </Card>
  );
}
