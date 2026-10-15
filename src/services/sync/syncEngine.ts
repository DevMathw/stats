/**
 * Sincronización con el proveedor externo. Enunciado §SINCRONIZACION.
 *
 * 1 ligas configuradas → 2 fixtures → 3 resultados → 4/5 detectar nuevos y modificados
 * → 6 upsert → 7 sin duplicados → 8 estadísticas → 9-13 recálculo (lo hace el store)
 * → 14 fecha/hora → 15 resumen.
 *
 * Clave primaria: id del proveedor. Fallback: liga+temporada+fecha+local+visitante.
 */
import type { Fixture, League, Match } from '../../types';
import { buildMatchKey } from '../../domain/models/ids';
import {
  calculateLeagueRounds,
  describeLeagueRounds,
} from '../../domain/statistics/leagueRounds';
import { buildTeamId } from '../../domain/models/ids';
import { resolveTeamName } from '../../domain/models/teamResolver';
import { rosterFor, sameClub } from '../../domain/models/teamIdentity';
import { hasResult } from '../../domain/calculations/matchDerived';
import type { FootballDataProvider, MatchStatistics } from '../providers/types';
import { ProviderError } from '../providers/types';

/** En qué jornada quedó cada liga tras sincronizar. */
export interface LeagueSyncRound {
  leagueId: string;
  /** Última jornada disputada que conoce la app. */
  currentRound: number | null;
  /** Primera jornada con partidos pendientes tras la sincronización. */
  nextRound: number | null;
  /** Primera jornada pendiente que aún no ha empezado. */
  nextNewRound: number | null;
  /** Pendientes de jornadas ya empezadas (aplazados y rezagados). */
  pendingInStartedRounds: number;
  fixturesInNextRound: number;
  pendingFixtures: number;
  /** Frase lista para mostrar. */
  description: string;
}

export interface SyncSummary {
  startedAt: string;
  finishedAt: string;
  provider: string;
  leaguesSynced: string[];
  rounds: LeagueSyncRound[];
  /** Avisos no fatales del proveedor (p. ej. eventos sin número de jornada). */
  warnings: string[];
  leaguesSkipped: { leagueId: string; reason: string }[];
  newMatches: number;
  updatedMatches: number;
  newFixtures: number;
  updatedFixtures: number;
  /** Pendientes retirados porque el partido YA esta finalizado. */
  removedFixtures: number;
  /** Pendientes retirados por quedar fuera del horizonte de jornadas. */
  prunedFixtures: number;
  statisticsFetched: number;
  /** Nombres del proveedor que no se pudieron casar con ningun equipo conocido. */
  unresolvedTeams: { leagueId: string; providerName: string }[];
  errors: string[];
  /** Partidos terminados que entregó el proveedor. */
  foundMatches: number;
  /** Ya estaban y el proveedor no cambia ningún dato. */
  unchangedMatches: number;
  /**
   * Registros reconocidos como uno que ya existía sin contar con su id: el mismo partido repetido
   * en la respuesta, o uno cargado de otra fuente (Excel) que se casa por liga+fecha+equipos.
   */
  duplicatesAvoided: number;
}

export interface SyncInput {
  provider: FootballDataProvider;
  leagues: League[];
  /** Id de temporada del proveedor por liga; sin él la liga se omite. */
  seasonIds: Record<string, string>;
  existingMatches: Match[];
  existingFixtures: Fixture[];
  /** Cuántos partidos sin estadísticas se enriquecen por ejecución. */
  statisticsLimit?: number;
  /**
   * Jornadas futuras a mantener en PARTIDOS PENDIENTES por liga. 1 = solo la proxima.
   * 0 = todo el calendario restante. Los aplazados de jornadas ya jugadas se conservan
   * siempre y no consumen horizonte.
   */
  fixtureHorizonRounds?: number;
  /** `nombre del proveedor normalizado` -> `nombre canonico`, por liga. */
  teamAliases?: Record<string, Record<string, string>>;
  onProgress?: (message: string) => void;
}

export interface SyncResult {
  matches: Match[];
  fixtures: Fixture[];
  summary: SyncSummary;
}

/** Todas las claves con las que un registro puede reconocerse. */
function keysOf(r: { providerId: string | null } & Parameters<typeof buildMatchKey>[0]): string[] {
  const k = [buildMatchKey(r)];
  if (r.providerId) k.unshift(`p:${r.providerId}`);
  return k;
}

function indexBy<T extends { providerId: string | null } & Parameters<typeof buildMatchKey>[0]>(
  items: T[],
): Map<string, T> {
  const map = new Map<string, T>();
  for (const it of items) for (const k of keysOf(it)) map.set(k, it);
  return map;
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Claves con las que BUSCAR un registro entrante. Ademas de las suyas, se prueba la fecha
 * +/- 1 dia: el proveedor publica el timestamp en UTC y un partido nocturno en Sudamerica
 * aparece al dia siguiente.
 */
function lookupKeys<T extends { providerId: string | null } & Parameters<typeof buildMatchKey>[0]>(
  incoming: T,
): string[] {
  const keys = keysOf(incoming);
  for (const delta of [-1, 1]) {
    keys.push(buildMatchKey({ ...incoming, date: shiftDate(incoming.date, delta) }));
  }
  return keys;
}

function findExisting<T extends { providerId: string | null } & Parameters<typeof buildMatchKey>[0]>(
  index: Map<string, T>,
  incoming: T,
): T | undefined {
  for (const k of lookupKeys(incoming)) {
    const hit = index.get(k);
    if (hit) return hit;
  }
  return undefined;
}

/**
 * El mismo partido guardado por otra fuente con otra fecha o con la localía invertida: misma liga,
 * temporada y jornada, los mismos dos equipos y menos de dos meses de diferencia (un aplazado del
 * Brasileirão llegó con 16 días; dos torneos con la misma numeración, como Apertura y Clausura,
 * están siempre más separados). No se crea otro ni se pisa, porque no se sabe cuál de las dos
 * versiones acierta: se avisa.
 * ponytail: aunque la entrante sea oficial no sustituye a la guardada (habría que invertir local,
 * visitante y estadísticas); añadirlo si estos avisos aparecen con fuentes oficiales.
 */
function findSamePairInRound<T extends Match | Fixture>(rows: T[], r: Match | Fixture): T | undefined {
  const pareja = [r.homeTeamName, r.awayTeamName].sort().join('|');
  const dia = Date.parse(r.date);
  return rows.find(
    (x) =>
      x.leagueId === r.leagueId &&
      x.season === r.season &&
      x.round === r.round &&
      [x.homeTeamName, x.awayTeamName].sort().join('|') === pareja &&
      Math.abs(Date.parse(x.date) - dia) <= 60 * 86_400_000,
  );
}

/** Campos que, si cambian, marcan el partido como "actualizado". */
const TRACKED: (keyof Match)[] = [
  // `date` NO esta aqui a proposito: un proveedor en UTC pone un partido nocturno de Sudamerica
  // al dia siguiente. Solo entra si el proveedor da la fecha oficial local (`officialLocalDates`).
  'round',
  'homeGoals',
  'awayGoals',
  'homeFirstHalfGoals',
  'awayFirstHalfGoals',
  'shotsHome',
  'shotsAway',
  'shotsOnTargetHome',
  'shotsOnTargetAway',
  'possessionHome',
  'cornersHome',
  'cornersAway',
  'yellowCardsHome',
  'yellowCardsAway',
  'redCardsHome',
  'redCardsAway',
  'foulsHome',
  'foulsAway',
  'offsidesHome',
  'offsidesAway',
  'xGHome',
  'xGAway',
  // La marca de resultado adjudicado llega también al partido ya guardado; un `undefined` entrante no la quita.
  'awarded',
];

/**
 * Fusiona el partido entrante sobre el existente.
 * Un `null` entrante NUNCA borra un dato que ya teníamos: el proveedor puede no reportar
 * una variable que otra fuente sí nos dio.
 */
export function mergeMatch(
  existing: Match,
  incoming: Match,
  officialDates = false,
): { merged: Match; changed: boolean } {
  const merged: Match = { ...existing };
  let changed = false;
  // Lo escrito a mano en Partidos no lo sustituye ninguna fuente.
  const manual = new Set(existing.manualFields ?? []);
  for (const key of officialDates ? [...TRACKED, 'date' as const] : TRACKED) {
    const value = incoming[key];
    if (value === null || value === undefined || manual.has(key)) continue;
    if (merged[key] !== value) {
      (merged as unknown as Record<string, unknown>)[key] = value;
      changed = true;
    }
  }
  // El id, la hora y la fase del proveedor se guardan, pero no son datos del partido: uno que ya estaba
  // bien sigue «sin cambios» aunque ahora lleve su id.
  if (incoming.providerId) merged.providerId = incoming.providerId;
  if (incoming.kickoffTime) merged.kickoffTime = incoming.kickoffTime;
  if (incoming.kickoffUtc) merged.kickoffUtc = incoming.kickoffUtc;
  if (incoming.phase) merged.phase = incoming.phase;
  if (changed) {
    merged.source = incoming.source ?? merged.source;
    merged.updatedAt = incoming.updatedAt ?? new Date().toISOString();
  }
  return { merged, changed };
}

export function applyStatistics(match: Match, stats: MatchStatistics): Match {
  const next: Match = { ...match };
  const manual = new Set(match.manualFields ?? []);
  for (const [k, v] of Object.entries(stats)) {
    if (v === null || manual.has(k)) continue;
    (next as unknown as Record<string, unknown>)[k] = v;
  }
  next.updatedAt = new Date().toISOString();
  return next;
}

/**
 * Que fixtures conservar de una liga.
 *
 *  - Un pendiente de una jornada YA jugada es un aplazado: se conserva siempre y no gasta
 *    horizonte (si no, un aplazado de la J2 taparia la J5, que es la que toca).
 *  - Del resto se quedan las `maxRounds` primeras jornadas por numero.
 *  - `maxRounds <= 0` conserva todo el calendario.
 */
export function selectFixtureHorizon(
  fixtures: Fixture[],
  currentRound: number | null,
  maxRounds: number,
): Fixture[] {
  if (maxRounds <= 0) return fixtures;
  const played = currentRound ?? 0;
  const upcoming = [...new Set(fixtures.filter((f) => f.round > played).map((f) => f.round))]
    .sort((a, b) => a - b)
    .slice(0, maxRounds);
  const keep = new Set(upcoming);
  return fixtures.filter((f) => f.round <= played || keep.has(f.round));
}

export async function syncFromProvider(input: SyncInput): Promise<SyncResult> {
  const startedAt = new Date().toISOString();
  const summary: SyncSummary = {
    startedAt,
    finishedAt: startedAt,
    provider: input.provider.name,
    leaguesSynced: [],
    rounds: [],
    warnings: [],
    leaguesSkipped: [],
    newMatches: 0,
    updatedMatches: 0,
    newFixtures: 0,
    updatedFixtures: 0,
    removedFixtures: 0,
    prunedFixtures: 0,
    statisticsFetched: 0,
    unresolvedTeams: [],
    errors: [],
    foundMatches: 0,
    unchangedMatches: 0,
    duplicatesAvoided: 0,
  };

  let done = 0;
  const officialDates = input.provider.officialLocalDates === true;
  const matches = [...input.existingMatches];
  const fixtures = [...input.existingFixtures];
  const matchIndex = indexBy(matches);
  const fixtureIndex = indexBy(fixtures);
  const touchedLeagues = new Set<string>();
  const horizon = input.fixtureHorizonRounds ?? 1;
  /** Claves de los fixtures que el proveedor confirma pendientes dentro del horizonte. */
  const keptFixtureKeys = new Set<string>();
  /**
   * Ligas para las que el proveedor devolvio calendario. Solo en esas se poda: si una
   * respuesta viene vacia (fallo transitorio, temporada sin publicar) no se borra lo que ya
   * habia.
   */
  const leaguesWithCalendar = new Set<string>();

  /** Equipos que ya conoce la app, por liga. */
  const knownTeams = new Map<string, string[]>();
  for (const m of matches) {
    const list = knownTeams.get(m.leagueId) ?? [];
    if (!list.includes(m.homeTeamName)) list.push(m.homeTeamName);
    if (!list.includes(m.awayTeamName)) list.push(m.awayTeamName);
    knownTeams.set(m.leagueId, list);
  }
  const unresolvedSeen = new Set<string>();

  for (const league of input.leagues) {
    // El id de temporada es opcional: hay proveedores que lo exigen (SofaScore) y otros que
    // usan la temporada en curso si no se indica (football-data.org). Que lo decida el
    // adaptador y lo reporte como error legible.
    const seasonId = input.seasonIds[league.id] ?? '';

    const provider = input.provider;
    input.onProgress?.(
      `Sincronizando ${league.name} (${++done}/${input.leagues.length})…`,
    );

    try {
      const aliases = input.teamAliases?.[league.id] ?? {};
      const known = knownTeams.get(league.id) ?? [];
      const plantilla = rosterFor(league);

      /**
       * Traduce los nombres del proveedor a los que ya usa la app.
       *
       * Un nombre que no se reconoce puede ser dos cosas muy distintas:
       *   a) un equipo que aun no conociamos (liga a medio cargar, competicion nueva)
       *   b) el mismo equipo escrito de otra forma ("Arsenal" vs "Arsenal FC")
       *
       * Se distingue con el numero de equipos de la hoja LIGAS: si todavia caben equipos en
       * la plantilla se acepta como nuevo; si la plantilla ya esta completa, un nombre
       * desconocido solo puede ser (b), asi que se DESCARTA el registro y se informa para
       * que el usuario lo mapee. Crear la ficha duplicada romperia la clasificacion.
       */
      const rosterFull = () => league.teamCount !== null && known.length >= league.teamCount;

      const rename = <T extends { homeTeamName: string; awayTeamName: string }>(r: T): T | null => {
        const resolveOne = (raw: string): string | null => {
          const res = resolveTeamName(raw, known, aliases);
          if (res.resolved !== null) {
            if (res.reason === 'new' && !known.includes(res.resolved)) known.push(res.resolved);
            return res.resolved;
          }
          // Otro nombre del mismo club según su identidad en la competición: «CSD Macará» es «Macará» aunque no empiecen
          // igual. Sin esto, FotMob abrió en LigaPro una segunda ficha para 6 clubes (17/09/2026).
          const mismoClub = known.filter((k) => sameClub(raw, k, plantilla));
          if (mismoClub.length === 1) return mismoClub[0];
          if (res.reason === 'unknown' && !rosterFull()) {
            known.push(raw); // hay sitio en la plantilla: es un equipo que no conociamos
            return raw;
          }
          const key = `${league.id}|${raw}`;
          if (!unresolvedSeen.has(key)) {
            unresolvedSeen.add(key);
            summary.unresolvedTeams.push({ leagueId: league.id, providerName: raw });
          }
          return null;
        };

        const home = resolveOne(r.homeTeamName);
        const away = resolveOne(r.awayTeamName);
        if (home === null || away === null) return null;
        return {
          ...r,
          homeTeamName: home,
          awayTeamName: away,
          homeTeamId: buildTeamId(league.id, home),
          awayTeamId: buildTeamId(league.id, away),
        };
      };

      const [incomingMatchesRaw, allIncomingFixturesRaw] = await Promise.all([
        provider.getMatches(league.id, seasonId),
        provider.getFixtures(league.id, seasonId, { maxRounds: horizon }),
      ]);

      knownTeams.set(league.id, known);
      const incomingMatches = incomingMatchesRaw
        .map(rename)
        .filter((m): m is (typeof incomingMatchesRaw)[number] => m !== null);
      const allIncomingFixtures = allIncomingFixturesRaw
        .map(rename)
        .filter((f): f is (typeof allIncomingFixturesRaw)[number] => f !== null);

      summary.foundMatches += incomingMatchesRaw.length;
      /** Registros ya tocados en esta pasada: un partido repetido en la respuesta cuenta una vez. */
      const vistos = new Set<Match>();
      for (const inc of incomingMatches) {
        const withMeta: Match = { ...inc, country: league.country, season: league.season };
        const existing = findExisting(matchIndex, withMeta);
        if (!existing) {
          const otra = findSamePairInRound(matches, withMeta);
          if (otra) {
            summary.duplicatesAvoided++;
            summary.warnings.push(
              `${withMeta.homeTeamName} - ${withMeta.awayTeamName} (J${withMeta.round}, ${withMeta.date}) no se añade: ` +
                `ya está ${otra.homeTeamName} - ${otra.awayTeamName} del ${otra.date} (${otra.source ?? 'sin fuente'}). Revisa cuál es el correcto.`,
            );
            continue;
          }
          matches.push(withMeta);
          vistos.add(withMeta);
          for (const k of keysOf(withMeta)) matchIndex.set(k, withMeta);
          summary.newMatches++;
          continue;
        }
        const repetido = vistos.has(existing);
        if (repetido || existing.providerId !== withMeta.providerId) summary.duplicatesAvoided++;
        if (repetido) continue;

        const { merged, changed } = mergeMatch(existing, withMeta, officialDates);
        vistos.add(existing).add(merged);
        if (
          changed ||
          merged.providerId !== existing.providerId ||
          merged.kickoffTime !== existing.kickoffTime ||
          merged.kickoffUtc !== existing.kickoffUtc ||
          merged.phase !== existing.phase
        ) {
          matches[matches.indexOf(existing)] = merged;
          for (const k of keysOf(merged)) matchIndex.set(k, merged);
        }
        if (changed) summary.updatedMatches++;
        else summary.unchangedMatches++;
      }

      // La jornada en la que va la liga sale de los partidos YA finalizados que conocemos.
      const currentRound = matches.reduce<number | null>(
        (max, m) =>
          m.leagueId === league.id && hasResult(m) && (max === null || m.round > max)
            ? m.round
            : max,
        null,
      );

      const incomingFixtures = selectFixtureHorizon(allIncomingFixtures, currentRound, horizon);
      if (allIncomingFixtures.length > 0) leaguesWithCalendar.add(league.id);

      for (const inc of incomingFixtures) {
        const withMeta: Fixture = { ...inc, country: league.country, season: league.season };
        const existing = findExisting(fixtureIndex, withMeta);
        if (!existing) {
          fixtures.push(withMeta);
          for (const k of keysOf(withMeta)) {
            fixtureIndex.set(k, withMeta);
            keptFixtureKeys.add(k);
          }
          summary.newFixtures++;
        } else {
          // Se fusiona sobre el que ya existe: nunca se crea una segunda fila pendiente.
          const merged: Fixture = {
            ...existing,
            ...withMeta,
            id: existing.id,
            // Un pendiente cargado a mano conserva su origen hasta que se juega.
            source: existing.source === 'Manual' ? 'Manual' : withMeta.source,
          };
          const changed =
            existing.date !== merged.date ||
            (existing.kickoffTime ?? null) !== (merged.kickoffTime ?? null) ||
            (existing.kickoffUtc ?? null) !== (merged.kickoffUtc ?? null) ||
            (existing.phase ?? null) !== (merged.phase ?? null) ||
            existing.round !== merged.round ||
            existing.status !== merged.status ||
            existing.providerId !== merged.providerId;
          if (changed) {
            fixtures[fixtures.indexOf(existing)] = merged;
            summary.updatedFixtures++;
          }
          for (const k of keysOf(merged)) {
            fixtureIndex.set(k, merged);
            keptFixtureKeys.add(k);
          }
        }
      }

      touchedLeagues.add(league.id);
      summary.leaguesSynced.push(league.id);
    } catch (e) {
      const err = e as ProviderError;
      summary.leaguesSkipped.push({
        leagueId: league.id,
        reason: err.detail ? `${err.message} (${err.detail})` : err.message,
      });
    }
  }

  // Un pendiente pasa a disputado SOLO si ya existe como partido CON RESULTADO. Un partido
  // en juego, aplazado o cargado sin marcador sigue siendo pendiente.
  const finishedKeys = new Set(matches.filter(hasResult).flatMap(keysOf));

  for (let i = fixtures.length - 1; i >= 0; i--) {
    const f = fixtures[i];
    if (!touchedLeagues.has(f.leagueId)) continue;

    if (keysOf(f).some((k) => finishedKeys.has(k))) {
      fixtures.splice(i, 1);
      summary.removedFixtures++;
      continue;
    }

    // Fuera del horizonte: el proveedor no lo devolvio en esta ventana. Los cargados a mano
    // se respetan; los del proveedor se podan para que la lista no crezca sin fin.
    if (
      leaguesWithCalendar.has(f.leagueId) &&
      f.source !== 'Manual' &&
      !keysOf(f).some((k) => keptFixtureKeys.has(k))
    ) {
      fixtures.splice(i, 1);
      summary.prunedFixtures++;
    }
  }

  // Estadísticas de los partidos que aún no las tienen (limitado para no saturar la API).
  const limit = input.statisticsLimit ?? 60;
  // Tras el merge, un partido que venia del Excel ya lleva el providerId del proveedor, asi
  // que tambien entra aqui y se le completan corners/tiros/posesion/xG.
  const pending = matches.filter(
    (m) => m.providerId && touchedLeagues.has(m.leagueId) && m.cornersHome === null,
  );
  for (const m of pending.slice(0, limit)) {
    try {
      const stats = await input.provider.getMatchStatistics(m.providerId!);
      if (!stats) continue;
      matches[matches.indexOf(m)] = applyStatistics(m, stats);
      summary.statisticsFetched++;
    } catch (e) {
      summary.errors.push(`Estadísticas de ${m.homeTeamName}-${m.awayTeamName}: ${(e as Error).message}`);
    }
  }

  summary.warnings.push(...(input.provider.takeWarnings?.() ?? []));

  // En qué jornada queda cada liga sincronizada.
  const rounds = calculateLeagueRounds(matches, fixtures);
  for (const leagueId of summary.leaguesSynced) {
    const r = rounds.get(leagueId);
    summary.rounds.push({
      leagueId,
      currentRound: r?.currentRound ?? null,
      nextRound: r?.nextRound ?? null,
      nextNewRound: r?.nextNewRound ?? null,
      pendingInStartedRounds: r?.pendingInStartedRounds ?? 0,
      fixturesInNextRound: r?.fixturesInNextRound ?? 0,
      pendingFixtures: r?.pendingFixtures ?? 0,
      description: r ? describeLeagueRounds(r) : 'sin datos',
    });
  }

  summary.finishedAt = new Date().toISOString();
  return { matches, fixtures, summary };
}

/** Texto del resumen que pide el enunciado. */
export function formatSyncSummary(s: SyncSummary, teamsRecalculated: number, projections: number): string[] {
  // Decir "completada" cuando no se sincronizo ni una liga es mentir por omision.
  if (s.leaguesSynced.length === 0) {
    const motivo = s.leaguesSkipped[0]?.reason ?? 'No habia ninguna competicion que sincronizar.';
    return [
      'No se actualizó nada',
      `${s.leaguesSkipped.length} competiciones omitidas`,
      motivo,
    ];
  }

  const lines = [
    `Actualización completada · ${s.leaguesSynced.length} competiciones`,
    `${s.newMatches} partidos nuevos`,
    `${s.updatedMatches} partidos actualizados`,
    `${teamsRecalculated} equipos recalculados`,
    `${projections} proyecciones actualizadas`,
  ];
  if (s.newFixtures || s.updatedFixtures || s.removedFixtures || s.prunedFixtures) {
    lines.push(
      `${s.newFixtures} pendientes nuevos, ${s.updatedFixtures} modificados, ` +
        `${s.removedFixtures} pasaron a disputados` +
        (s.prunedFixtures ? `, ${s.prunedFixtures} fuera del horizonte` : ''),
    );
  }
  if (s.statisticsFetched) lines.push(`${s.statisticsFetched} partidos enriquecidos con estadísticas`);
  if (s.warnings.length) lines.push(`${s.warnings.length} eventos descartados por datos incompletos`);
  if (s.unresolvedTeams.length) {
    lines.push(`${s.unresolvedTeams.length} equipos sin reconocer (mapealos en Configuracion)`);
  }
  return lines;
}
