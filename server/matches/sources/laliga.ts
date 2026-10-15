/**
 * LaLiga EA Sports: los datos que la propia página de resultados de laliga.com lleva incrustados
 * (`__NEXT_DATA__`). Cada jornada tiene su página: `…/resultados/2026-27/jornada-N`.
 */
import { getText, pausa } from '../http.ts';
import { localDateTime } from '../time.ts';
import { optaStats, SourceError, type MatchSource, type SourceMatch, type SourceStatus } from '../types.ts';

const BASE = 'https://www.laliga.com/es-ES/laliga-easports/resultados';
/** La misma sección, en el mismo dominio y sin prefijo de idioma (verificada el 12/09/2026). */
const ALTERNATIVA = 'https://www.laliga.com/laliga-easports/resultados';

/** Una página de resultados; si la sección principal falla, la misma ruta en la alternativa. */
async function leerPagina(ruta: string): Promise<{ props: LlPageProps; url: string }> {
  let fallo: unknown;
  for (const base of [BASE, ALTERNATIVA]) {
    const url = `${base}${ruta}`;
    try {
      const props = readLaLigaPage(await getText(url));
      if (props) return { props, url };
      fallo = new SourceError('la página de resultados no trae sus datos incrustados', url);
    } catch (e) {
      fallo = e;
    }
  }
  throw fallo;
}

interface LlTeam {
  nickname?: string;
  name?: string;
}
export interface LlMatch {
  id: number;
  /** Ruta de su ficha: `/es-ES/partido/{slug}`. */
  slug?: string;
  date?: string;
  home_score?: number | null;
  away_score?: number | null;
  status?: string;
  home_team?: LlTeam;
  away_team?: LlTeam;
}
export interface LlPageProps {
  season?: string;
  gameweek?: { week?: number };
  currentGameweek?: { week?: number };
  gameweekList?: { week?: number }[];
  matches?: LlMatch[];
}

const ESTADOS: Record<string, SourceStatus> = {
  FullTime: 'finished',
  PreMatch: 'scheduled',
  Postponed: 'postponed',
  Suspended: 'suspended',
  Cancelled: 'cancelled',
  Canceled: 'cancelled',
};

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Ficha de un partido: el marcador y las cifras de Opta de cada equipo. */
interface LlMatchPage {
  match?: LlMatch;
  data?: { stats?: { home?: Record<string, unknown>; away?: Record<string, unknown> } };
}

export function readLaLigaPage<T = LlPageProps>(html: string): T | null {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  try {
    return (JSON.parse(m[1]) as { props?: { pageProps?: T } }).props?.pageProps ?? null;
  } catch {
    return null;
  }
}

export function parseLaLigaMatches(props: LlPageProps): SourceMatch[] {
  const jornada = num(props.gameweek?.week);
  const out: SourceMatch[] = [];
  for (const m of props.matches ?? []) {
    const local = m.home_team?.nickname ?? m.home_team?.name;
    const visitante = m.away_team?.nickname ?? m.away_team?.name;
    if (!m.date || !local || !visitante) continue;
    const { date, time, utc } = localDateTime(m.date, 'Europe/Madrid');
    const status = ESTADOS[m.status ?? ''] ?? 'live';
    const terminado = status === 'finished';
    out.push({
      sourceId: String(m.id),
      round: jornada,
      date,
      time,
      utc,
      phase: null,
      homeTeam: local,
      awayTeam: visitante,
      homeGoals: terminado ? num(m.home_score) : null,
      awayGoals: terminado ? num(m.away_score) : null,
      homeHalfTime: null,
      awayHalfTime: null,
      status,
    });
  }
  return out;
}

export function laLigaSource(seasonStartYear: number): MatchSource {
  return {
    name: 'laliga.com',
    secondary: false,
    async fetch() {
      const { props: portada, url } = await leerPagina('');
      let usoAlternativa = url.startsWith(ALTERNATIVA);

      const anio = Number(portada.season);
      if (!Number.isInteger(anio)) throw new SourceError('no publica la temporada', url);
      const tramo = `${anio}-${String((anio + 1) % 100).padStart(2, '0')}`;
      const actual = portada.currentGameweek?.week ?? portada.gameweek?.week ?? 1;
      const total = portada.gameweekList?.length || actual;

      const partidos: SourceMatch[] = [];
      // Hasta la jornada en curso más la siguiente, que es la que aporta los próximos pendientes.
      for (let jornada = 1; jornada <= Math.min(actual + 1, total); jornada++) {
        let pagina = portada;
        if (jornada !== portada.gameweek?.week) {
          await pausa();
          const leida = await leerPagina(`/${tramo}/jornada-${jornada}`);
          usoAlternativa ||= leida.url.startsWith(ALTERNATIVA);
          pagina = leida.props;
        }
        partidos.push(...parseLaLigaMatches(pagina));
      }
      return {
        season: `${anio}/${String((anio + 1) % 100).padStart(2, '0')}`,
        url,
        matches: partidos,
        notes: usoAlternativa ? [`la sección principal falló en alguna página; se leyó ${ALTERNATIVA}`] : [],
      };
    },
    async matchStats(sourceId, round) {
      // La ficha va por su slug, que solo publica la página de la jornada.
      const tramo = `${seasonStartYear}-${String((seasonStartYear + 1) % 100).padStart(2, '0')}`;
      const { props, url: jornadaUrl } = await leerPagina(`/${tramo}/jornada-${round}`);
      const slug = props.matches?.find((m) => String(m.id) === sourceId)?.slug;
      if (!slug) throw new SourceError(`la jornada ${round} no incluye este partido`, jornadaUrl);

      const url = `https://www.laliga.com/es-ES/partido/${slug}`;
      const ficha = readLaLigaPage<LlMatchPage>(await getText(url));
      if (!ficha) throw new SourceError('la ficha del partido no trae sus datos incrustados', url);
      if (ficha.match?.status !== 'FullTime') throw new SourceError('el partido no consta como terminado', url);
      return {
        url,
        values: optaStats(ficha.data?.stats?.home, ficha.data?.stats?.away, [
          ficha.match?.home_score,
          ficha.match?.away_score,
        ]),
      };
    },
  };
}
