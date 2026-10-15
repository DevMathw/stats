/**
 * Bundesliga: bundesliga.com, una página por jornada. Los partidos van en el estado que la propia
 * página incrusta (`ng-state`): id oficial DFL, marcador final y al descanso, y estado.
 */
import { getText, pausa } from '../http.ts';
import { localDateTime } from '../time.ts';
import {
  SourceError,
  statValues,
  type MatchSource,
  type SourceMatch,
  type SourceStatus,
  type StatValues,
} from '../types.ts';

const MAX_JORNADAS = 38;

interface BlScore {
  fulltime?: number | null;
  halftime?: number | null;
}
export interface BlMatch {
  matchId?: string;
  matchday?: number;
  kickOff?: string;
  plannedKickOff?: string;
  matchStatus?: string;
  score?: { home?: BlScore; away?: BlScore };
  teams?: { home?: { nameFull?: string }; away?: { nameFull?: string } };
  /** Ruta de la página del partido dentro de su jornada. */
  slugs?: { slugLong?: string };
}

interface BlPar {
  homeValue?: number | null;
  awayValue?: number | null;
}
export type BlStats = Partial<Record<'ballPossessionRatio' | 'cornerKicks' | 'shotsOnTarget' | 'fouls' | 'offsides' | 'xGoals', BlPar>>;

const ESTADOS: Record<string, SourceStatus> = {
  FINAL_WHISTLE: 'finished',
  PRE_MATCH: 'scheduled',
  POSTPONED: 'postponed',
  CANCELLED: 'cancelled',
  ABANDONED: 'suspended',
};

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** «+0000» → «+00:00»: la forma que todos los motores de fechas entienden. */
const conDosPuntos = (s: string) => s.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');

export function readBundesligaMatchday(html: string): BlMatch[] {
  const m = html.match(/<script id="ng-state"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return [];
  let estado: Record<string, unknown>;
  try {
    estado = JSON.parse(m[1]) as Record<string, unknown>;
  } catch {
    return [];
  }
  const partidos = new Map<string, BlMatch>();
  for (const bloque of Object.values(estado)) {
    const b = (bloque as { b?: unknown } | null)?.b;
    if (!b || typeof b !== 'object') continue;
    for (const [clave, p] of Object.entries(b as Record<string, unknown>)) {
      if (clave.startsWith('DFL-MAT-') && p && typeof p === 'object') partidos.set(clave, p as BlMatch);
    }
  }
  return [...partidos.values()];
}

export function parseBundesligaMatches(partidos: BlMatch[]): SourceMatch[] {
  const out: SourceMatch[] = [];
  for (const p of partidos) {
    // La hora programada, no el segundo real del pitido inicial.
    const inicio = p.plannedKickOff ?? p.kickOff;
    const local = p.teams?.home?.nameFull;
    const visitante = p.teams?.away?.nameFull;
    if (!inicio || !local || !visitante) continue;
    const { date, time, utc } = localDateTime(conDosPuntos(inicio), 'Europe/Berlin');
    // Un estado desconocido (en juego, descanso…) nunca se da por terminado.
    const status = ESTADOS[p.matchStatus ?? ''] ?? 'live';
    const terminado = status === 'finished';
    out.push({
      sourceId: p.matchId ?? null,
      round: num(p.matchday),
      date,
      time,
      utc,
      phase: null,
      homeTeam: local,
      awayTeam: visitante,
      homeGoals: terminado ? num(p.score?.home?.fulltime) : null,
      awayGoals: terminado ? num(p.score?.away?.fulltime) : null,
      homeHalfTime: terminado ? num(p.score?.home?.halftime) : null,
      awayHalfTime: terminado ? num(p.score?.away?.halftime) : null,
      status,
    });
  }
  return out;
}

/** El bloque de estadísticas que incrusta la página del partido, bajo una clave `…/{partido}/stats`. */
export function readBundesligaStats(html: string, matchId: string): BlStats | null {
  const m = html.match(/<script id="ng-state"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  try {
    const estado = JSON.parse(m[1]) as Record<string, unknown>;
    const clave = Object.keys(estado).find((k) => k.endsWith(`/${matchId}/stats`));
    return clave ? (estado[clave] as BlStats) : null;
  } catch {
    return null;
  }
}

/**
 * La Bundesliga no publica ahí los tiros totales ni las tarjetas: quedan `null`. Sumar tiros a
 * puerta y fuera no da los totales (faltarían los bloqueados). Sí publica el xG (`xGoals`) y, en el
 * partido, el marcador al descanso.
 */
export function parseBundesligaStats(partido: BlMatch, s: BlStats): StatValues {
  const par = (k: keyof BlStats): [unknown, unknown] => [s[k]?.homeValue, s[k]?.awayValue];
  const sinPublicar: [unknown, unknown] = [null, null];
  return statValues({
    score: [partido.score?.home?.fulltime, partido.score?.away?.fulltime],
    shots: sinPublicar,
    onTarget: par('shotsOnTarget'),
    possessionPct: par('ballPossessionRatio'),
    corners: par('cornerKicks'),
    yellow: sinPublicar,
    red: sinPublicar,
    fouls: par('fouls'),
    offsides: par('offsides'),
    xg: par('xGoals'),
    halfTime: [partido.score?.home?.halftime, partido.score?.away?.halftime],
  });
}

export function bundesligaSource(seasonStartYear: number): MatchSource {
  const tramo = `${seasonStartYear}-${seasonStartYear + 1}`;
  const url = (jornada: number) => `https://www.bundesliga.com/en/bundesliga/matchday/${tramo}/${jornada}`;
  return {
    name: 'bundesliga.com',
    secondary: false,
    async fetch() {
      const partidos: SourceMatch[] = [];
      for (let jornada = 1; jornada <= MAX_JORNADAS; jornada++) {
        if (jornada > 1) await pausa();
        // La página puede incluir partidos de otras jornadas en sus módulos: solo cuenta la suya.
        const semana = parseBundesligaMatches(readBundesligaMatchday(await getText(url(jornada)))).filter(
          (p) => p.round === jornada,
        );
        if (semana.length === 0) break;
        partidos.push(...semana);
        if (semana.every((p) => p.status === 'scheduled')) break;
      }
      return {
        season: `${seasonStartYear}/${String(seasonStartYear + 1).slice(2)}`,
        url: url(1),
        matches: partidos,
        notes: [],
      };
    },
    async matchStats(sourceId, round) {
      // La página de estadísticas va por el slug del partido, que publica la página de su jornada.
      const partido = readBundesligaMatchday(await getText(url(round))).find((p) => p.matchId === sourceId);
      const slug = partido?.slugs?.slugLong;
      if (!partido || !slug) throw new SourceError(`la jornada ${round} no incluye este partido`, url(round));
      if (partido.matchStatus !== 'FINAL_WHISTLE') throw new SourceError('el partido no consta como terminado', url(round));

      const statsUrl = `${url(round)}/${slug}/stats`;
      const s = readBundesligaStats(await getText(statsUrl), sourceId);
      if (!s) throw new SourceError('la página del partido no trae sus estadísticas', statsUrl);
      return { url: statsUrl, values: parseBundesligaStats(partido, s) };
    },
  };
}
