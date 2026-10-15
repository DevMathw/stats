/**
 * FotMob: fuente SECUNDARIA autorizada, solo cuando la oficial no permite obtener los partidos.
 *
 * En las ligas con varios torneos por año, FotMob los mezcla en la misma temporada: unas veces con
 * su nombre («Clausura - Round 10») y otras con la misma numeración a secas (Argentina: Apertura y
 * Clausura van las dos como «1…16»; Uruguay, tres torneos). Solo se toma el torneo en curso, como
 * en el Excel: sumarlos repetiría jornadas.
 */
import { getJson } from '../http.ts';
import { localDateTime } from '../time.ts';
import type { SourceTimeline, TimelineEvent, TimelineEventKind, TimelineShot } from '../../../src/domain/statistics/momentum.ts';
import {
  SourceError,
  statValues,
  type MatchSource,
  type SourceMatch,
  type SourceStatus,
  type StatValues,
} from '../types.ts';

export interface FmMatch {
  id: string | number;
  round?: string | number;
  roundName?: string | number;
  home?: { name?: string };
  away?: { name?: string };
  status?: {
    utcTime?: string;
    finished?: boolean;
    started?: boolean;
    cancelled?: boolean;
    /** Resultado adjudicado («Awarded win», `reason.short` «AW»): terminado, con marcador y sin estadísticas. */
    awarded?: boolean;
    scoreStr?: string;
    reason?: { short?: string };
  };
}
export interface FmLeague {
  details?: { selectedSeason?: string };
  fixtures?: { allMatches?: FmMatch[]; firstUnplayedMatch?: unknown };
}

/** «Clausura - Round 10» → { torneo «Clausura», jornada 10 }; «5» → { torneo «», jornada 5 }. */
export function splitRound(label: string | number | undefined): { phase: string; round: number | null } {
  const s = String(label ?? '').trim();
  const n = s.match(/(\d+)\s*$/);
  const phase = s
    .replace(/\s*[-–]?\s*round\s*\d+\s*$/i, '')
    .replace(/\s*\d+\s*$/, '')
    .trim();
  return { phase, round: n ? Number(n[1]) : null };
}

export function fotmobStatus(st: FmMatch['status']): SourceStatus {
  if (st?.cancelled) return 'cancelled';
  if (st?.finished) return 'finished';
  const motivo = (st?.reason?.short ?? '').toLowerCase();
  if (/^pp|postp|aplaz/.test(motivo)) return 'postponed';
  if (/^ab|susp|int/.test(motivo)) return 'suspended';
  if (st?.started) return 'live';
  return 'scheduled';
}

function idPrimerSinJugar(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return String(o.firstUnplayedMatchId ?? o.id ?? '') || null;
  }
  return String(v);
}

/**
 * Torneo de cada partido dentro de una fase cuya numeración se repite.
 *
 * Un equipo juega una sola vez por jornada: su segundo partido con el mismo número es, como
 * pronto, del torneo siguiente, y el primero de ellos marca dónde empieza ese torneo. Cada partido
 * pertenece al último torneo empezado en su fecha. Por fechas y no por repeticiones, porque un
 * torneo corto (el Intermedio uruguayo, 7 jornadas) dejaría las jornadas 8–15 del Clausura
 * contadas en el torneo anterior.
 * ponytail: un aplazado que se juega ya empezado el torneo siguiente cuenta en el siguiente; si
 * pasa, usar el calendario de torneos que publique la fuente.
 */
function torneosPorNumeracion(partidos: FmMatch[]): Map<FmMatch, number> {
  const fecha = (m: FmMatch) => m.status?.utcTime ?? '';
  const equipos = new Set(partidos.flatMap((m) => [m.home?.name, m.away?.name])).size;
  const vistos = new Map<string, number>();
  const porRepeticion: FmMatch[][] = [];
  for (const m of [...partidos].sort((a, b) => fecha(a).localeCompare(fecha(b)))) {
    const jornada = String(m.roundName ?? m.round);
    const claves = [`${m.home?.name}|${jornada}`, `${m.away?.name}|${jornada}`];
    const k = Math.max(...claves.map((c) => vistos.get(c) ?? 0));
    (porRepeticion[k] ??= []).push(m);
    for (const c of claves) vistos.set(c, k + 1);
  }
  // Solo abre torneo una repetición con al menos una jornada de partidos: uno suelto repetido
  // (un partido que se vuelve a jugar) no inventa un torneo.
  const inicios = porRepeticion
    .filter((lista, k) => k === 0 || lista.length >= Math.floor(equipos / 2))
    .map((lista) => fecha(lista[0]));
  const torneo = new Map<FmMatch, number>();
  for (const m of partidos) torneo.set(m, inicios.filter((inicio) => inicio <= fecha(m)).length - 1);
  return torneo;
}

/**
 * Grupos que se juegan A LA VEZ que el torneo en curso, con otro nombre.
 *
 * La fase final de varias ligas no es un grupo único: la LigaPro ecuatoriana reparte a sus 16 equipos en
 * «Championship Round» (el hexagonal), «Relegation Round» y «Copa Sudamericana Play-off», los tres a la
 * vez. Quedarse solo con el del primer partido sin jugar dejaba a 10 de 16 clubes sin calendario.
 *
 * La prueba es de los propios datos, no una lista de competiciones: una fase que se solapa en fechas con
 * la que está en curso y no comparte NINGÚN equipo con ella no puede ser un torneo posterior, es otro
 * grupo del mismo. Un Apertura y un Clausura, que van seguidos y repiten equipos, no encajan.
 */
function gruposParalelos(todos: FmMatch[], enCurso: FmMatch[]): FmMatch[] {
  if (enCurso.length === 0) return [];
  const fecha = (m: FmMatch) => m.status?.utcTime ?? '';
  const fechas = enCurso.map(fecha).filter(Boolean).sort();
  const [desde, hasta] = [fechas[0], fechas[fechas.length - 1]];
  const equipos = new Set(enCurso.flatMap((m) => [m.home?.name, m.away?.name]));
  const fases = new Map<string, FmMatch[]>();
  for (const m of todos) {
    if (enCurso.includes(m)) continue;
    const { phase } = splitRound(m.roundName ?? m.round);
    if (phase) (fases.get(phase) ?? fases.set(phase, []).get(phase)!).push(m);
  }

  const out: FmMatch[] = [];
  for (const lista of fases.values()) {
    const solapa = lista.some((m) => fecha(m) >= desde && fecha(m) <= hasta);
    const comparte = lista.some((m) => equipos.has(m.home?.name) || equipos.has(m.away?.name));
    if (solapa && !comparte) out.push(...lista);
  }
  return out;
}

export function parseFotmobLeague(data: FmLeague, timeZone: string): { season: string; matches: SourceMatch[]; notes: string[] } {
  const todos = data.fixtures?.allMatches ?? [];
  const etiqueta = (m: FmMatch) => m.roundName ?? m.round;

  // Torneo vigente: el del primer partido sin jugar; si ya no queda ninguno, el del último jugado.
  const id = idPrimerSinJugar(data.fixtures?.firstUnplayedMatch);
  const referencia =
    todos.find((m) => String(m.id) === id) ?? [...todos].reverse().find((m) => m.status?.finished);
  const torneo = splitRound(etiqueta(referencia ?? { id: '' })).phase;
  const fase = todos.filter((m) => splitRound(etiqueta(m)).phase === torneo);
  const bloque = torneosPorNumeracion(fase);
  const actual = (referencia && bloque.get(referencia)) || 0;
  const enCurso = fase.filter((m) => bloque.get(m) === actual);
  const paralelos = gruposParalelos(todos, enCurso);
  const vigentes = [...enCurso, ...paralelos];

  const matches: SourceMatch[] = [];
  for (const m of vigentes) {
    if (!m.status?.utcTime || !m.home?.name || !m.away?.name) continue;
    const { date, time, utc } = localDateTime(m.status.utcTime, timeZone);
    const status = fotmobStatus(m.status);
    const goles = status === 'finished' ? m.status.scoreStr?.match(/^\s*(\d+)\s*-\s*(\d+)\s*$/) : null;
    matches.push({
      sourceId: String(m.id),
      round: splitRound(etiqueta(m)).round,
      date,
      time,
      utc,
      phase: splitRound(etiqueta(m)).phase || null,
      homeTeam: m.home.name,
      awayTeam: m.away.name,
      homeGoals: goles ? Number(goles[1]) : null,
      awayGoals: goles ? Number(goles[2]) : null,
      homeHalfTime: null,
      awayHalfTime: null,
      status,
      ...(m.status.awarded ? { awarded: true } : {}),
    });
  }

  const otros = todos.length - vigentes.length;
  return {
    season: data.details?.selectedSeason ?? '',
    matches,
    notes: otros ? [`${otros} partidos de otros torneos o fases de la temporada omitidos: solo cuenta el torneo en curso`] : [],
  };
}

interface FmEvent {
  type?: string;
  card?: string;
  isHome?: boolean;
  halfStrKey?: string;
  homeScore?: unknown;
  awayScore?: unknown;
  time?: number;
  overloadTime?: number | null;
  nameStr?: string;
  ownGoal?: boolean;
  isPenaltyShootoutEvent?: boolean;
}

interface FmShot {
  min?: number;
  minAdded?: number | null;
  teamId?: number;
  playerName?: string;
  eventType?: string;
  expectedGoals?: number | null;
  expectedGoalsOnTarget?: number | null;
  isOnTarget?: boolean;
  isOwnGoal?: boolean;
  period?: string;
}

export interface FmDetails {
  general?: { homeTeam?: { id?: number }; awayTeam?: { id?: number } };
  header?: { teams?: { score?: number | null }[]; status?: { finished?: boolean; started?: boolean } };
  ongoing?: boolean;
  content?: {
    stats?: { Periods?: { All?: { stats?: { stats?: { key?: string; stats?: unknown[] }[] }[] } } } | null;
    matchFacts?: { events?: { events?: FmEvent[] } };
    shotmap?: { shots?: FmShot[] } | null;
  };
}

/**
 * Cifras del partido completo. La misma clave sale en «Top stats» y en su grupo: vale la primera.
 * El marcador al descanso es el que FotMob publica en el evento «HT» de la cronología.
 */
export function parseFotmobStats(d: FmDetails): StatValues {
  const descanso = d.content?.matchFacts?.events?.events?.find((e) => e.type === 'Half' && e.halfStrKey === 'halftime_short');
  const filas = (d.content?.stats?.Periods?.All?.stats ?? []).flatMap((g) => g.stats ?? []);
  const par = (k: string): [unknown, unknown] => {
    // Las filas de título («shots», «discipline») llevan [null, null].
    const fila = filas.find((x) => x.key === k && x.stats?.length === 2 && x.stats.every((v) => v !== null));
    return [fila?.stats?.[0], fila?.stats?.[1]];
  };
  const [local, visitante] = d.header?.teams ?? [];
  return statValues({
    score: [local?.score, visitante?.score],
    shots: par('total_shots'),
    onTarget: par('ShotsOnTarget'),
    possessionPct: par('BallPossesion'),
    corners: par('corners'),
    yellow: par('yellow_cards'),
    red: par('red_cards'),
    fouls: par('fouls'),
    offsides: par('Offsides'),
    xg: par('expected_goals'),
    halfTime: [descanso?.homeScore, descanso?.awayScore],
  });
}

/**
 * Tarjetas de la cronología de FotMob, por equipo: cada evento es una tarjeta con su jugador y su minuto.
 * Es un mínimo, porque la cifra real no puede ser menor. Solo cuentan las amarillas y rojas directas: la
 * doble amarilla («YellowRed») la cuenta cada fuente a su manera.
 *
 * Hace falta porque en varias ligas FotMob publica «0 amarillas» con amarillas en su cronología (medido el
 * 14/09/2026 en Brasil, Colombia, Chile, Venezuela, Bolivia, Ecuador y Paraguay).
 */
export function fotmobCardMinimums(d: FmDetails): Partial<Record<keyof StatValues, number>> {
  const eventos = d.content?.matchFacts?.events?.events ?? [];
  const cuenta = (card: string, local: boolean) => eventos.filter((e) => e.type === 'Card' && e.card === card && e.isHome === local).length;
  return {
    yellowCardsHome: cuenta('Yellow', true),
    yellowCardsAway: cuenta('Yellow', false),
    redCardsHome: cuenta('Red', true),
    redCardsAway: cuenta('Red', false),
  };
}

/**
 * Cronología del partido: los tiros con su minuto y su xG (`shotmap`) y los goles y tarjetas de la
 * cronología (`matchFacts.events`). Es de lo que sale el momentum, que se calcula en `momentum.ts`.
 *
 * FotMob publica además un campo `momentum` ya calculado por ellos. No se usa: la aplicación construye el
 * suyo con los datos de partido, que sí son verificables uno a uno contra la ficha de la fuente.
 *
 * El minuto es el del reloj (`min`) más el añadido (`minAdded`), para que un gol en el 90+4 no caiga
 * encima del 90. La cobertura de `shotmap` depende de la liga: en varias sudamericanas viene vacío.
 */
export function parseFotmobTimeline(d: FmDetails, url: string): SourceTimeline {
  const localId = d.general?.homeTeam?.id;
  const minuto = (min: number | undefined | null, anadido: number | null | undefined) =>
    (typeof min === 'number' ? min : 0) + (typeof anadido === 'number' ? anadido : 0);

  const shots: TimelineShot[] = (d.content?.shotmap?.shots ?? [])
    .filter((s) => typeof s.min === 'number' && s.period !== 'PenaltyShootout')
    .map((s) => ({
      minute: minuto(s.min, s.minAdded),
      home: s.teamId === localId,
      xg: typeof s.expectedGoals === 'number' ? s.expectedGoals : null,
      xgOnTarget: typeof s.expectedGoalsOnTarget === 'number' ? s.expectedGoalsOnTarget : null,
      onTarget: s.isOnTarget === true,
      goal: s.eventType === 'Goal',
      ownGoal: s.isOwnGoal === true,
      player: s.playerName ?? null,
    }));

  const events: TimelineEvent[] = [];
  for (const e of d.content?.matchFacts?.events?.events ?? []) {
    if (e.isPenaltyShootoutEvent || typeof e.time !== 'number' || typeof e.isHome !== 'boolean') continue;
    const kind: TimelineEventKind | null =
      e.type === 'Goal'
        ? 'gol'
        : e.type === 'Card' && e.card === 'Yellow'
          ? 'amarilla'
          : e.type === 'Card' && (e.card === 'Red' || e.card === 'YellowRed')
            ? 'roja'
            : e.type === 'PenaltyMissed' || e.type === 'MissedPenalty'
              ? 'penalti-fallado'
              : null;
    if (!kind) continue;
    // Un gol en propia puerta se apunta al equipo que se lo lleva, como en el marcador.
    const local = kind === 'gol' && e.ownGoal ? !e.isHome : e.isHome;
    events.push({ minute: minuto(e.time, e.overloadTime), home: local, kind, player: e.nameStr ?? null });
  }

  return {
    url,
    ongoing: d.ongoing === true,
    finished: d.header?.status?.finished === true,
    shots,
    events,
  };
}

const detalleUrl = (sourceId: string) =>
  `https://www.fotmob.com/api/data/matchDetails?matchId=${encodeURIComponent(sourceId)}`;

export function fotmobSource(leagueId: number, timeZone: string): MatchSource {
  const url = `https://www.fotmob.com/api/data/leagues?id=${leagueId}`;
  return {
    name: 'FotMob',
    secondary: true,
    site: 'https://www.fotmob.com/',
    async fetch() {
      const { season, matches, notes } = parseFotmobLeague(await getJson<FmLeague>(url), timeZone);
      return { season, url, matches, notes };
    },
    async matchStats(sourceId) {
      const detalle = detalleUrl(sourceId);
      const d = await getJson<FmDetails>(detalle);
      if (!d.header?.status?.finished) throw new SourceError('el partido no consta como terminado', detalle);
      return { url: detalle, values: parseFotmobStats(d), minimums: fotmobCardMinimums(d) };
    },
    async matchTimeline(sourceId) {
      const detalle = detalleUrl(sourceId);
      const d = await getJson<FmDetails>(detalle);
      if (!d.header?.status?.started) throw new SourceError('el partido todavía no ha empezado', detalle);
      return parseFotmobTimeline(d, detalle);
    },
  };
}
