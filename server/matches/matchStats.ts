/**
 * Estadísticas de UN partido desde la fuente de su liga: la oficial primero y después las
 * secundarias autorizadas, en el mismo orden estricto que «Actualizar partidos». Nunca ESPN ni IA.
 *
 * Cada fuente tiene que encontrar ESTE partido: por su id si ya está enlazado con ella, o en su
 * calendario por fecha (±1 día), marcador e identidad de los dos equipos. Las cifras pasan los
 * mismos filtros de siempre: el marcador de la fuente debe coincidir, los imposibles se descartan
 * y no puede haber más tiros a puerta que tiros.
 *
 * Se piden los 10 datos del partido (las 8 cifras, xG y marcador al descanso) y no se queda con la
 * primera fuente que responde: la siguiente completa SOLO lo que falte. Un dato de la web oficial
 * nunca se sustituye por el de FotMob.
 */
import { SourceError, type MatchSource, type SourceMatch, type SourceResult } from './types.ts';
import { sameSeason, type Attempt } from './fetchLeague.ts';
import { resolveInCompetition, rosterForSlug } from '../../src/domain/models/teamIdentity.ts';
import { STAT_RANGES } from '../../src/domain/models/matchDataRules.ts';

/** Estadísticas en el formato del modelo de datos, con la posesión del local como fracción 0–1. */
export interface MatchStats {
  shotsHome: number | null;
  shotsAway: number | null;
  shotsOnTargetHome: number | null;
  shotsOnTargetAway: number | null;
  possessionHome: number | null;
  cornersHome: number | null;
  cornersAway: number | null;
  yellowCardsHome: number | null;
  yellowCardsAway: number | null;
  redCardsHome: number | null;
  redCardsAway: number | null;
  foulsHome: number | null;
  foulsAway: number | null;
  offsidesHome: number | null;
  offsidesAway: number | null;
  xGHome: number | null;
  xGAway: number | null;
}

/** Marcador al descanso. */
export interface HalfTime {
  home: number;
  away: number;
}

const VACIO: MatchStats = {
  shotsHome: null,
  shotsAway: null,
  shotsOnTargetHome: null,
  shotsOnTargetAway: null,
  possessionHome: null,
  cornersHome: null,
  cornersAway: null,
  yellowCardsHome: null,
  yellowCardsAway: null,
  redCardsHome: null,
  redCardsAway: null,
  foulsHome: null,
  foulsAway: null,
  offsidesHome: null,
  offsidesAway: null,
  xGHome: null,
  xGAway: null,
};

/**
 * Rangos plausibles, los mismos que valen para los datos escritos a mano. Un valor fuera de rango es un
 * error de lectura, así que ese campo se descarta.
 */
const RANGES: Record<keyof MatchStats, [number, number]> = STAT_RANGES;

/** Number finito o null. Cualquier otra cosa (string, NaN, undefined) es null. */
const toNumber = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/**
 * Convierte lo que publica una fuente en estadísticas fiables.
 *
 * Tres filtros: identidad (el marcador), rango (imposibles físicos) y coherencia interna
 * (no más tiros a puerta que tiros). Lo que no pasa un filtro se pone a
 * null y se apunta el motivo; el resto de los campos sobreviven. El marcador al descanso tiene que
 * ser posible con el final: nunca más goles al descanso que al terminar.
 */
export function sanitize(
  raw: Record<string, unknown>,
  expected: { homeGoals: number; awayGoals: number },
  /** Tarjetas que enseña la cronología de la propia fuente: la cifra no puede ser menor. */
  minimums: Partial<Record<string, number>> = {},
): { stats: MatchStats; halfTime: HalfTime | null; rejected: string[]; scoreMismatch: boolean } {
  const rejected: string[] = [];

  // Filtro 1: identidad. Si la fuente da otro marcador, es otro partido y no se salva nada.
  const foundHome = toNumber(raw.scoreHomeFound);
  const foundAway = toNumber(raw.scoreAwayFound);
  if (
    foundHome !== null &&
    foundAway !== null &&
    (foundHome !== expected.homeGoals || foundAway !== expected.awayGoals)
  ) {
    rejected.push(
      `La fuente da ${foundHome}-${foundAway} y el partido acabó ` +
        `${expected.homeGoals}-${expected.awayGoals}: es otro partido.`,
    );
    return { stats: { ...VACIO }, halfTime: null, rejected, scoreMismatch: true };
  }

  // Filtro 2: rangos. La posesión llega en % y se guarda como fracción.
  const stats: MatchStats = { ...VACIO };
  for (const key of Object.keys(RANGES) as (keyof MatchStats)[]) {
    const value = toNumber(raw[key === 'possessionHome' ? 'possessionHomePct' : key]);
    if (value === null) continue;
    const [min, max] = RANGES[key];
    if (value < min || value > max) {
      rejected.push(`${key}=${value} fuera de rango [${min}, ${max}].`);
      continue;
    }
    stats[key] = key === 'possessionHome' ? value / 100 : value;
  }

  // Filtro 3: coherencia interna. No se puede tirar a puerta más veces de las que se tira; no se sabe cuál
  // de los dos está mal leído, así que caen los dos. Menos tiros a puerta que goles sí es posible: un
  // autogol suma al marcador sin ser tiro del equipo.
  for (const [aPuerta, tiros] of [['shotsOnTargetHome', 'shotsHome'], ['shotsOnTargetAway', 'shotsAway']] as const) {
    if (stats[aPuerta] !== null && stats[tiros] !== null && stats[aPuerta]! > stats[tiros]!) {
      rejected.push(`${aPuerta}=${stats[aPuerta]} > ${tiros}=${stats[tiros]}: incoherente.`);
      stats[aPuerta] = null;
      stats[tiros] = null;
    }
  }

  // Filtro 4: la cronología de la propia fuente. Menos tarjetas de las que enseña no es la cifra real, es
  // un dato no registrado (FotMob publica «0 amarillas» así en varias ligas): cae la pareja entera.
  for (const [local, visitante] of [['yellowCardsHome', 'yellowCardsAway'], ['redCardsHome', 'redCardsAway']] as const) {
    const bajo = [local, visitante].find((k) => stats[k] !== null && stats[k]! < (minimums[k] ?? 0));
    if (!bajo) continue;
    rejected.push(`${bajo}=${stats[bajo]} con ${minimums[bajo]} en la cronología de la propia fuente: no registrado.`);
    stats[local] = null;
    stats[visitante] = null;
  }

  // Marcador al descanso: los dos lados, enteros y sin superar al final.
  let halfTime: HalfTime | null = null;
  const htHome = toNumber(raw.halfTimeHome);
  const htAway = toNumber(raw.halfTimeAway);
  if (htHome !== null && htAway !== null) {
    const posible =
      Number.isInteger(htHome) && Number.isInteger(htAway) && htHome >= 0 && htAway >= 0 &&
      htHome <= expected.homeGoals && htAway <= expected.awayGoals;
    if (posible) halfTime = { home: htHome, away: htAway };
    else rejected.push(`Descanso ${htHome}-${htAway} imposible con el final ${expected.homeGoals}-${expected.awayGoals}.`);
  }

  return { stats, halfTime, rejected, scoreMismatch: false };
}

export function countFilled(s: MatchStats): number {
  return Object.values(s).filter((v) => v !== null).length;
}

export interface MatchStatsRequest extends MatchKey {
  season: string;
  round: number;
  homeGoals: number;
  awayGoals: number;
  /** `fuente:id` con el que ya está enlazado el partido, si lo está. */
  providerId: string | null;
}

/** Lo que aportó una fuente: así se sabe de dónde salió cada dato. */
export interface Contribution {
  source: string;
  secondary: boolean;
  url: string | null;
  /** Claves de `MatchStats` que rellenó, y `halfTime` si dio el marcador al descanso. */
  fields: string[];
}

export interface MatchStatsResult {
  /** La primera fuente que aportó datos. */
  source: string | null;
  secondary: boolean;
  url: string | null;
  stats: MatchStats | null;
  filled: number;
  halfTime: HalfTime | null;
  /**
   * Mínimos que enseñan las cronologías de las fuentes consultadas (tarjetas con jugador y minuto). Una
   * cifra guardada por debajo es falsa y el cliente la borra.
   */
  minimums: Partial<Record<keyof MatchStats, number>>;
  /** Cada fuente que aportó algo, en orden. */
  contributions: Contribution[];
  /** Cifras que la fuente dio pero no pasaron los filtros. */
  rejected: string[];
  attempts: Attempt[];
}

const DIA = 86_400_000;

/** Lo que identifica a un partido en el calendario de una fuente que no lo tiene enlazado por id. */
export interface MatchKey {
  /** Competición en el registro de fuentes. */
  slug: string;
  date: string;
  /** Club de ESPN de cada equipo (identidad global): localiza el partido sin adivinar por el nombre. */
  homeEspnId: string | null;
  awayEspnId: string | null;
  /** Alias confirmados en Configuración: `nombre normalizado → id de ESPN`. */
  aliases?: Record<string, string>;
  /** Marcador final. Con él, solo encaja un partido TERMINADO con ese marcador. */
  homeGoals?: number | null;
  awayGoals?: number | null;
}

/**
 * El id de este partido en el calendario de una fuente: por identidad de los dos equipos y fecha (±1 día),
 * y además por marcador cuando el partido ya terminó. Si encajan varios, no se elige ninguno.
 */
export function locateMatch(lista: SourceMatch[], req: MatchKey): string {
  if (!req.homeEspnId || !req.awayEspnId) {
    throw new SourceError('los equipos no tienen identidad global: no se puede localizar el partido sin adivinar');
  }
  const conMarcador = typeof req.homeGoals === 'number' && typeof req.awayGoals === 'number';
  const plantilla = rosterForSlug(req.slug);
  const club = (nombre: string) => {
    const r = resolveInCompetition(nombre, plantilla, req.aliases);
    return r.status === 'resolved' ? r.team.espnId : null;
  };
  const candidatos = lista.filter(
    (m) =>
      m.sourceId !== null &&
      (!conMarcador || (m.status === 'finished' && m.homeGoals === req.homeGoals && m.awayGoals === req.awayGoals)) &&
      Math.abs(Date.parse(m.date) - Date.parse(req.date)) <= DIA &&
      club(m.homeTeam) === req.homeEspnId &&
      club(m.awayTeam) === req.awayEspnId,
  );
  if (candidatos.length !== 1) {
    throw new SourceError(candidatos.length ? 'más de un partido encaja: no se elige' : 'no encuentra este partido en su calendario');
  }
  return candidatos[0].sourceId!;
}

/** Calendarios ya descargados, por competición y fuente. */
export type ListCache = Map<string, { at: number; list: Promise<SourceResult> }>;

const CALENDARIO_TTL = 5 * 60_000;

/**
 * Al actualizar una competición entera, cada partido sin enlace volvería a descargar el calendario
 * completo de cada fuente. Se reutiliza unos minutos, fallos incluidos: una fuente bloqueada no se
 * consulta partido a partido.
 * ponytail: un partido recién terminado puede tardar hasta CALENDARIO_TTL en localizarse en una
 * fuente sin enlace; bajar el TTL si eso molesta.
 */
export function leerCalendario(fuente: MatchSource, slug: string, cache?: ListCache): Promise<SourceResult> {
  if (!cache) return fuente.fetch();
  const key = `${slug}|${fuente.name}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CALENDARIO_TTL) return hit.list;
  const list = fuente.fetch();
  cache.set(key, { at: Date.now(), list });
  return list;
}

const CLAVES = Object.keys(VACIO) as (keyof MatchStats)[];

export async function fetchMatchStats(
  sources: MatchSource[],
  req: MatchStatsRequest,
  cache?: ListCache,
): Promise<MatchStatsResult> {
  const stats: MatchStats = { ...VACIO };
  let halfTime: HalfTime | null = null;
  const minimums: Partial<Record<keyof MatchStats, number>> = {};
  const contributions: Contribution[] = [];
  const rejected: string[] = [];
  const attempts: Attempt[] = [];
  const falta = () => CLAVES.some((k) => stats[k] === null) || !halfTime;

  for (const fuente of sources) {
    if (contributions.length && !falta()) break;
    let url: string | null = null;
    try {
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
      if (!fuente.matchStats) throw new SourceError('no publica estadísticas por partido', url);

      const r = await fuente.matchStats(sourceId, req.round);
      url = r.url;
      const limpio = sanitize(r.values, req, r.minimums);
      if (limpio.scoreMismatch) throw new SourceError(limpio.rejected[0], url);
      // Es este partido: sus mínimos cuentan aunque la fuente no aporte ninguna cifra.
      for (const [k, min] of Object.entries(r.minimums ?? {}) as [keyof MatchStats, number][]) {
        minimums[k] = Math.max(minimums[k] ?? 0, min);
      }

      // Solo lo que falta: lo que ya dio una fuente anterior no se sustituye.
      const campos = CLAVES.filter((k) => stats[k] === null && limpio.stats[k] !== null);
      for (const k of campos) stats[k] = limpio.stats[k];
      const fields: string[] = [...campos];
      if (!halfTime && limpio.halfTime) {
        halfTime = limpio.halfTime;
        fields.push('halfTime');
      }
      if (fields.length === 0) {
        throw new SourceError(
          contributions.length ? 'no publica ninguno de los datos que faltan' : 'no publica estadísticas de este partido',
          url,
        );
      }

      rejected.push(...limpio.rejected);
      attempts.push({ source: fuente.name, url, secondary: fuente.secondary, ok: true, error: null });
      contributions.push({ source: fuente.name, secondary: fuente.secondary, url, fields });
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

  const principal = contributions[0];
  return {
    source: principal?.source ?? null,
    secondary: principal?.secondary ?? false,
    url: principal?.url ?? null,
    stats: principal ? stats : null,
    filled: countFilled(stats),
    halfTime,
    minimums,
    contributions,
    rejected,
    attempts,
  };
}
