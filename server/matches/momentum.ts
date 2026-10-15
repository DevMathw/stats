/**
 * Momentum de UN partido desde las fuentes de su liga.
 *
 * La metodología y el cálculo están en `src/domain/statistics/momentum.ts`, que es donde los lee también la
 * interfaz; aquí solo se localiza el partido en la fuente y se le pide su cronología.
 */
import { buildMomentum, type MatchMomentum } from '../../src/domain/statistics/momentum.ts';
import { sameSeason, type Attempt } from './fetchLeague.ts';
import { leerCalendario, locateMatch, type ListCache, type MatchKey } from './matchStats.ts';
import { SourceError, type MatchSource } from './types.ts';

export interface MomentumRequest extends MatchKey {
  season: string;
  /** `fuente:id` con el que ya está enlazado el partido, si lo está. */
  providerId: string | null;
}

export interface MomentumResult {
  momentum: MatchMomentum | null;
  attempts: Attempt[];
}

/**
 * Momentum de UN partido desde las fuentes de su liga, en el mismo orden que las estadísticas: la oficial
 * primero y después las secundarias autorizadas. Se queda con la primera que publique tiros con minuto; si
 * una responde sin ellos, se guarda su respuesta por si ninguna otra los tiene, para poder decir por qué
 * no hay gráfico.
 *
 * Vale para un partido en juego: sin marcador con el que comprobar la identidad, el partido se localiza
 * por los dos equipos y la fecha, y la propia fuente dice si sigue en juego (`ongoing`).
 */
export async function fetchMomentum(
  sources: MatchSource[],
  req: MomentumRequest,
  cache?: ListCache,
): Promise<MomentumResult> {
  const attempts: Attempt[] = [];
  let sinTiros: MatchMomentum | null = null;

  for (const fuente of sources) {
    let url: string | null = null;
    try {
      if (!fuente.matchTimeline) throw new SourceError('no publica la cronología de sus partidos');
      const prefijo = `${fuente.name}:`;
      let sourceId = req.providerId?.startsWith(prefijo) ? req.providerId.slice(prefijo.length) : null;
      if (!sourceId) {
        const r = await leerCalendario(fuente, req.slug, cache);
        url = r.url;
        if (!sameSeason(req.season, r.season)) {
          throw new SourceError(`publica la temporada «${r.season}», no la ${req.season}`, r.url);
        }
        sourceId = locateMatch(r.matches, req);
      }

      const timeline = await fuente.matchTimeline(sourceId);
      url = timeline.url;
      const momentum = buildMomentum(fuente.name, timeline);
      attempts.push({ source: fuente.name, url, secondary: fuente.secondary, ok: true, error: null });
      if (momentum.points.length > 0) return { momentum, attempts };
      sinTiros ??= momentum;
    } catch (e) {
      attempts.push({
        source: fuente.name,
        url: (e instanceof SourceError ? e.url : null) ?? url,
        secondary: fuente.secondary,
        ok: false,
        error: (e as Error).message,
      });
    }
  }

  return { momentum: sinTiros, attempts };
}
