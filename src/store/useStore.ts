import { create } from 'zustand';
import { persist, type PersistStorage } from 'zustand/middleware';
import type {
  Filters,
  Fixture,
  League,
  Match,
  ModelParams,
} from '../types';
import { EMPTY_FILTERS } from '../types';
import { DEFAULT_MODEL_PARAMS } from '../domain/models/params';
import { recalculateAll, type Derived } from '../domain/engine';
import { buildTeamId, resolveMatchId } from '../domain/models/ids';
import { normalizeTeamName } from '../domain/models/teamResolver';
import type { ImportIssue } from '../services/import/excelImport';

/**
 * El lector de Excel se carga solo cuando se importa un libro.
 *
 * `xlsx` y el importador pesan cerca de 900 kB minificados, y la aplicación arranca de la base local: sin
 * esto, todo el que abre el dashboard se descarga un lector de hojas de calculo que quiza no use nunca.
 * El `import()` dinamico es lo que hace que el empaquetador lo saque a su propio trozo.
 */
const leerExcel = async (file: File | ArrayBuffer) => (await import('../services/import/excelImport')).importExcelFile(file);
import { mergeLeagueImport } from '../services/import/mergeLeague';
import { applyStatsTxt } from '../services/import/statsTxt';
import {
  prepararHistorico,
  proponerTemporada,
  type DatasetSummary,
  type SeasonProposal,
} from '../services/import/historicalImport';
import { seasonKey } from '../domain/models/season';
import {
  DEFAULT_FOOTBALL_DATA_CONFIG,
  FootballDataOrgProvider,
} from '../services/providers/footballData';
import {
  matchCompetitions,
  type CompetitionMatch,
  type ProviderCompetition,
} from '../domain/models/competitionMatcher';
import {
  applyStatistics,
  formatSyncSummary,
  syncFromProvider,
  type SyncSummary,
} from '../services/sync/syncEngine';
import {
  attachTeamRefs,
  identityAliasesFor,
  rosterFor,
  type TeamIssue,
} from '../domain/models/teamIdentity';
import { unifyTeamNames } from '../domain/models/teamNames';
import { espnLeagueId } from '../domain/models/espnLeagues';
import {
  EXTRA_COMPETITIONS,
  OfficialSourcesProvider,
  fetchOfficialLeagues,
  fetchOfficialMatchStats,
  leagueFromOfficial,
  type OfficialMatchStats,
} from '../services/providers/officialSources';
import { saveLeagueExcel } from '../services/export/leagueExcel';
import { hasResult } from '../domain/calculations/matchDerived';
import {
  errorsForChanges,
  isMissing,
  MATCH_DATA,
  matchDataValues,
  missingMatchData,
  validateMatchData,
  ZERO_PLAUSIBLE,
  zeroMissing,
  type ManualField,
  type MatchDatum,
} from '../domain/models/matchDataRules';
import {
  combineSummaries,
  summarizeUpdateLog,
  type UpdateLogEntry,
} from '../services/sync/updateLog';
import { sqliteStorage } from './sqliteStorage';
import { toStored, type StoredPrediction } from '../domain/prediction/storage';
import { MODELS } from '../domain/prediction/models';
import { SIN_MEDIR, type EnginePrediction } from '../domain/prediction/engine';
import { medirModelos, predecirLote } from '../workers/predictionClient';
import { fromStored } from '../domain/prediction/storage';
import type { ModelId } from '../domain/prediction/types';

interface State {
  leagues: League[];
  matches: Match[];
  fixtures: Fixture[];
  params: ModelParams;
  filters: Filters;
  lastUpdate: string | null;
  importIssues: ImportIssue[];
  /** Id de temporada del proveedor por liga (Configuración). */
  seasonIds: Record<string, string>;
/** Código de competición de football-data.org por liga ("PL", "ELC"…). */
  competitionIds: Record<string, string>;
  /**
   * Jornadas futuras que se mantienen en PARTIDOS PENDIENTES. 1 = solo la próxima.
   * 0 = todo el calendario restante.
   */
  fixtureHorizon: number;
  /** `liga` -> { `nombre del proveedor normalizado`: `nombre canónico` }. */
  teamAliases: Record<string, Record<string, string>>;
  /**
   * Identidad global confirmada a mano en Configuración → Equipos:
   * `nombre normalizado → id de ESPN`. Solo se aplica dentro de la liga de ese club.
   */
  identityAliases: Record<string, string>;
  /** Equipos que no se pudieron identificar sin adivinar. Se recalcula; no se guarda. */
  teamIssues: TeamIssue[];
  /**
   * Resultado del último emparejamiento automático de competiciones. No se persiste: es
   * un paso puntual de configuración.
   */
  competitionMatches: CompetitionMatch[];
  /** Plan que exige cada competición según el proveedor, tras buscar los ids. */
  competitionPlans: Record<string, string>;

  status: 'idle' | 'importing' | 'syncing';
  statusMessage: string | null;
  /** Partido cuyas estadísticas se están buscando ahora mismo. Una a la vez. */
  statsBusyId: string | null;
  lastSync: { summary: SyncSummary; lines: string[] } | null;
  /** Registro de la última ejecución de «Actualizar partidos», una entrada por liga. */
  updateLog: UpdateLogEntry[];
  /**
   * Qué archivo histórico dio origen a cada competición-temporada: nombre, fecha de carga, partidos,
   * rango y qué campos traía. Es la trazabilidad de los datos con los que se entrenan los modelos.
   */
  datasets: DatasetSummary[];
  /**
   * Lo que midió el último backtest del motor de predicción: pesos del ensemble, calibración de cada
   * modelo y su tabla de métricas. Se guarda porque medirlo cuesta un par de minutos.
   */
  predictionRun: StoredPrediction | null;
  /** Avance del backtest mientras corre. `null` si no hay ninguno en marcha. */
  predictionProgress: string | null;
  /** Modelos activos del motor de predicción. Se pueden apagar uno a uno desde Modelos. */
  predictionModels: ModelId[];
  /**
   * Predicción del ensemble por partido pendiente. Es lo que usan las proyecciones (y por tanto los
   * picks) cuando `params.projectionSource === 'ensemble'`. Se calcula aparte porque entrenar los
   * siete modelos tarda segundos, y se guarda para no repetirlo en cada arranque.
   */
  modelPredictions: Record<string, EnginePrediction>;
  /** Cuándo se calcularon y con cuántos partidos, para saber si se han quedado viejas. */
  modelPredictionsAt: string | null;
  modelPredictionsMatches: number;
  /** Avance mientras se calculan. */
  predictingFixtures: boolean;

  derived: Derived;

  setFilters: (f: Partial<Filters>) => void;
  resetFilters: () => void;
  setParams: (p: Partial<ModelParams>) => void;
  setSeasonId: (leagueId: string, seasonId: string) => void;
  setCompetitionId: (leagueId: string, competitionId: string) => void;
  setFixtureHorizon: (rounds: number) => void;
  /** «Actualizar partidos» de UNA competición, desde su fuente oficial. */
  refreshLeague: (leagueId: string) => Promise<void>;
  /**
   * Estadísticas de UN partido ya disputado (corners, tarjetas, tiros, posesión, faltas, fueras de
   * juego) desde la fuente de su liga: la oficial y, si no las publica, las secundarias autorizadas.
   */
  refreshMatchStats: (matchId: string) => Promise<void>;
  /**
   * Botón del encabezado con una competición filtrada: sus partidos desde la fuente oficial y después
   * las estadísticas de cada disputado al que le falte alguna cifra (los completos no se vuelven a pedir).
   */
  refreshLeagueWithStats: (leagueId: string) => Promise<void>;
  /**
   * Da de alta las competiciones del registro que no vienen en el Excel base (Championship y las
   * tres UEFA) y trae sus partidos desde su fuente oficial.
   */
  addOfficialCompetitions: () => Promise<void>;
  /**
   * Carga un Excel de UNA competición sobre la que ya hay: fusiona sus partidos disputados y
   * pendientes sin tocar las demás ligas ni los parámetros del modelo.
   */
  importLeagueExcel: (leagueId: string, file: File) => Promise<void>;
  /** Lee un libro histórico y devuelve qué temporada y fase propone, sin guardar nada. */
  inspectHistoricalExcel: (file: File) => Promise<{ proposal: SeasonProposal; matches: number; leagueName: string | null }>;
  /** Carga un libro en una competición y una temporada CONCRETAS, fusionando sin destruir. */
  importHistoricalExcel: (leagueId: string, file: File, target: { season: string; phase: string | null }) => Promise<void>;
  /** Borra los partidos de una temporada de una competición. La vigente no se puede borrar aquí. */
  removeSeason: (leagueId: string, season: string) => void;
  /**
   * Backtest temporal de los siete modelos sobre todo el histórico: mide cuál acierta más, fija los
   * pesos del ensemble y calibra cada modelo. Tarda minutos y se guarda al terminar.
   */
  runPredictionBacktest: () => Promise<void>;
  /** Enciende o apaga un modelo. Apagarlo lo deja fuera del backtest y de las predicciones. */
  togglePredictionModel: (id: ModelId) => void;
  /**
   * Entrena los modelos activos con todo lo jugado y predice TODOS los partidos pendientes. Es lo que
   * alimenta a las proyecciones cuando la fuente es el ensemble.
   */
  refreshModelPredictions: () => Promise<void>;
  setTeamAlias: (leagueId: string, providerName: string, canonical: string) => void;
  /** Confirma a qué club corresponde un nombre. `espnId` vacío retira el alias. */
  setIdentityAlias: (name: string, espnId: string) => void;
  /** Descarga el catálogo del proveedor y rellena los ids que no dejan lugar a duda. */
  discoverCompetitions: () => Promise<void>;

  /** Alta de una competición que no venía en la hoja LIGAS. */
  addLeague: (league: League) => string | null;
  removeLeague: (leagueId: string) => void;
  /** Alta manual de un partido pendiente (la hoja PARTIDOS PENDIENTES puede venir vacía). */
  addFixture: (input: {
    leagueId: string;
    date: string;
    round: number;
    homeTeamName: string;
    awayTeamName: string;
  }) => string | null;
  removeFixture: (fixtureId: string) => void;
  /**
   * Datos de un partido escritos a mano (solo los que cambian). Pasan las mismas reglas que los de las
   * fuentes; devuelve el error o `null`. `null` en un dato lo borra y lo deja libre para las fuentes.
   */
  setMatchData: (matchId: string, changes: Partial<Record<ManualField, number | null>>) => string | null;
  fillMissingWithZero: (matchIds: readonly string[], datumId: MatchDatum['id']) => void;
  loadStatsTxt: (matchIds: readonly string[], datumId: MatchDatum['id'], text: string) => void;
  /** Corrige la fecha de un partido disputado. Devuelve el error, o `null` si fue bien. */
  setMatchDate: (matchId: string, date: string) => string | null;
  importExcel: (file: File) => Promise<void>;
  /** «Actualizar partidos de todas las ligas»: las del registro, cada una contra sus fuentes. */
  refreshData: () => Promise<void>;
  clearAll: () => void;
}


function buildProvider(s: State): FootballDataOrgProvider {
  return new FootballDataOrgProvider({
    ...DEFAULT_FOOTBALL_DATA_CONFIG,
    codes: s.competitionIds,
  });
}

/** Entrada del registro de una liga, con lo que dejó su sincronización. */
function logEntry(league: League, summary: SyncSummary, provider: OfficialSourcesProvider): UpdateLogEntry {
  const r = provider.fetched.get(league.id);
  const fallo = provider.failures.get(league.id);
  return {
    leagueId: league.id,
    leagueName: league.name,
    file: r?.league.file ?? fallo?.file ?? null,
    at: summary.finishedAt,
    ok: summary.leaguesSynced.includes(league.id),
    source: r?.source ?? null,
    secondary: r?.secondary ?? false,
    url: r?.url ?? null,
    season: r?.season ?? null,
    attempts: r?.attempts ?? fallo?.attempts ?? [],
    found: summary.foundMatches,
    created: summary.newMatches,
    updated: summary.updatedMatches,
    unchanged: summary.unchangedMatches,
    duplicatesAvoided: summary.duplicatesAvoided,
    newFixtures: summary.newFixtures,
    closedFixtures: summary.removedFixtures,
    notes: [
      ...(r?.notes ?? []),
      ...summary.warnings,
      ...summary.unresolvedTeams.map(
        (u) => `«${u.providerName}» no se reconoce como ningún equipo de la liga: sus partidos no se cargaron (asígnalo en Configuración)`,
      ),
    ],
    errors: [...summary.leaguesSkipped.map((x) => x.reason), ...summary.errors],
    excel: null,
  };
}

const nombreFuente = (a: { source: string | null; secondary: boolean }) => (a.secondary ? `${a.source} (secundaria)` : (a.source ?? ''));

/**
 * El partido con lo que devolvió su consulta de estadísticas. `applyStatistics` ignora los null: una
 * fuente pobre nunca borra un dato que ya teníamos, salvo que se demuestre falso: unas tarjetas por
 * debajo de las que enseña la cronología de la fuente (FotMob publica «0» sin registrar en varias ligas)
 * se borran. Si aportaron dos fuentes (la oficial y FotMob con lo que faltaba), se guardan las dos.
 */
function conEstadisticas(match: Match, r: OfficialMatchStats, now: string): Match {
  const aportes = r.contributions ?? [];
  const next: Match = aportes.length
    ? {
        ...(r.stats ? applyStatistics(match, r.stats) : match),
        // El descanso escrito a mano no lo sustituye la fuente.
        ...(r.halfTime && !match.manualFields?.includes('homeFirstHalfGoals')
          ? { homeFirstHalfGoals: r.halfTime.home, awayFirstHalfGoals: r.halfTime.away }
          : {}),
        statsSource: aportes.map(nombreFuente).join(' + '),
        statsCitations: aportes.flatMap((a) => (a.url ? [a.url] : [])),
      }
    : { ...match };
  const manual = new Set(match.manualFields ?? []);
  for (const [k, min] of Object.entries(r.minimums ?? {})) {
    const campo = k as ManualField;
    const valor = next[campo];
    if (valor === null || valor === undefined || valor >= min || manual.has(campo)) continue;
    const pareja = campo.replace(/Home$|Away$/, (lado) => (lado === 'Home' ? 'Away' : 'Home')) as ManualField;
    next[campo] = null;
    if (!manual.has(pareja)) next[pareja] = null;
    next.updatedAt = now;
  }
  return { ...next, statsUpdatedAt: now };
}

const EMPTY_DERIVED = recalculateAll({
  leagues: [],
  matches: [],
  fixtures: [],
  params: DEFAULT_MODEL_PARAMS,
});

type Guardado = Pick<
  State,
  | 'leagues'
  | 'matches'
  | 'fixtures'
  | 'params'
  | 'seasonIds'
  | 'competitionIds'
  | 'competitionPlans'
  | 'fixtureHorizon'
  | 'teamAliases'
  | 'identityAliases'
  | 'lastUpdate'
  | 'importIssues'
  | 'updateLog'
>;

/**
 * Nada se escribe si la lectura de lo guardado falló (un migrate o un merge con error): persist guardaría el estado
 * vacío de arranque y la base borraría los partidos. `onRehydrateStorage` habilita la escritura.
 */
let lecturaCorrecta = false;
const sqlite = sqliteStorage<Guardado>((mensaje) => useStore.setState({ statusMessage: mensaje }));
const almacenDatos: PersistStorage<Guardado> = {
  ...sqlite,
  setItem: (k, v) => (lecturaCorrecta ? sqlite.setItem(k, v) : undefined),
};

export const useStore = create<State>()(
  persist(
    (set, get) => {
      const recompute = (patch: Partial<State> = {}) => {
        const s = { ...get(), ...patch };
        // La identidad global se reengancha cada vez que cambian los datos o los alias. Al
        // hacerlo aquí, ninguna vía de entrada (Excel, «Actualizar partidos», alta manual) se
        // la puede saltar.
        const extra: Partial<State> = {};
        if (patch.matches || patch.fixtures || patch.leagues || patch.identityAliases) {
          const r = attachTeamRefs({
            leagues: s.leagues,
            matches: s.matches,
            fixtures: s.fixtures,
            aliases: s.identityAliases,
          });
          // Y con la identidad puesta, un club deja de ser dos equipos por estar escrito de dos formas.
          // Va aquí por lo mismo que `attachTeamRefs`: ninguna vía de entrada se lo puede saltar.
          const u = unifyTeamNames({ leagues: s.leagues, matches: r.matches, fixtures: r.fixtures });
          extra.matches = s.matches = u.matches;
          extra.fixtures = s.fixtures = u.fixtures;
          extra.teamIssues = r.issues;
        }
        const derived = recalculateAll({
          leagues: s.leagues,
          matches: s.matches,
          fixtures: s.fixtures,
          params: s.params,
          // Solo se usan si la fuente elegida es el ensemble; si faltan, cada proyección cae al libro.
          predictions: new Map(Object.entries(s.modelPredictions ?? {})),
        });
        set({ ...patch, ...extra, derived } as Partial<State>);
        return derived;
      };

      /**
       * «Actualizar partidos»: cada liga contra SU fuente oficial (o las secundarias autorizadas si
       * la oficial no sirve), fusión sin duplicados, Excel de la liga en `data/ligas/` y registro.
       * Un fallo en una liga no para las demás.
       *
       * @param nuevas competiciones del registro que la app aún no tenía: se dan de alta solo si
       *               su actualización sale bien
       */
      const actualizarPartidos = async (targets: League[], nuevas: League[] = []) => {
        const provider = new OfficialSourcesProvider(targets);
        const total = targets.length;
        set({ status: 'syncing', statusMessage: `Consultando fuentes oficiales… 0/${total}` });

        // Las descargas van de 4 en 4 (cada liga tiene su propio servidor); la fusión, liga a liga.
        const cola = [...targets];
        let consultadas = 0;
        await Promise.all(
          Array.from({ length: Math.min(4, total) }, async () => {
            for (let l = cola.shift(); l; l = cola.shift()) {
              await provider.load(l.id).catch(() => undefined); // el fallo queda en `provider.failures`
              set({ statusMessage: `Consultando fuentes oficiales… ${++consultadas}/${total}` });
            }
          }),
        );

        const s = get();
        let matches = s.matches;
        let fixtures = s.fixtures;
        const log: UpdateLogEntry[] = [];
        const summaries: SyncSummary[] = [];
        for (const league of targets) {
          const nombres = (provider.fetched.get(league.id)?.matches ?? []).flatMap((m) => [m.homeTeam, m.awayTeam]);
          const r = await syncFromProvider({
            provider,
            // Sin «N Equipos» en LIGAS, la plantilla de ESPN hace de tope: con la liga completa, un
            // nombre desconocido se descarta con aviso en vez de crear un equipo duplicado
            // («AMED SPORTİF FAALİYETLER» junto a «Amed SK»).
            leagues: [{ ...league, teamCount: league.teamCount ?? (rosterFor(league).length || null) }],
            seasonIds: {},
            existingMatches: matches,
            existingFixtures: fixtures,
            fixtureHorizonRounds: s.fixtureHorizon,
            statisticsLimit: 0,
            teamAliases: {
              // Los alias puestos a mano en Configuración mandan sobre los de la identidad global.
              [league.id]: {
                ...identityAliasesFor(league, matches, nombres, s.identityAliases),
                ...(s.teamAliases[league.id] ?? {}),
              },
            },
          });
          matches = r.matches;
          fixtures = r.fixtures;
          summaries.push(r.summary);
          log.push(logEntry(league, r.summary, provider));
        }

        const bien = new Set(log.filter((e) => e.ok).map((e) => e.leagueId));
        const altas = nuevas.filter((l) => bien.has(l.id));
        const derived = recompute({
          matches,
          fixtures,
          ...(altas.length ? { leagues: [...s.leagues, ...altas] } : {}),
          // Sin ninguna liga actualizada la fecha no cambia: sellarla haría creer que está al día.
          ...(bien.size ? { lastUpdate: new Date().toISOString() } : {}),
        });

        const t = get();
        for (const e of log) {
          if (!e.ok || !e.file) continue;
          const league = targets.find((l) => l.id === e.leagueId)!;
          set({ statusMessage: `Guardando data/ligas/${e.file}…` });
          try {
            e.excel = await saveLeagueExcel({
              file: e.file,
              league,
              matches: t.matches.filter((m) => m.leagueId === league.id),
              fixtures: t.fixtures.filter((f) => f.leagueId === league.id),
              opponentPpg: derived.opponentPpg,
            });
          } catch (err) {
            e.errors.push(`No se pudo guardar data/ligas/${e.file}: ${(err as Error).message}`);
          }
        }

        const combinado = combineSummaries(summaries);
        set({
          status: 'idle',
          updateLog: log,
          statusMessage: summarizeUpdateLog(log),
          ...(combinado
            ? {
                lastSync: {
                  summary: combinado,
                  lines: formatSyncSummary(combinado, derived.teams.length, derived.projections.length),
                },
              }
            : {}),
        });

        // Con el ensemble como fuente, unos partidos nuevos dejan viejas las predicciones: se rehacen
        // aquí, que es donde el usuario ya está esperando, y no en mitad de otra pantalla.
        if (get().params.projectionSource !== 'libro' && bien.size) await get().refreshModelPredictions();
      };

      return {
        leagues: [],
        matches: [],
        fixtures: [],
        params: DEFAULT_MODEL_PARAMS,
        filters: EMPTY_FILTERS,
        lastUpdate: null,
        importIssues: [],
        seasonIds: {},
        competitionIds: {},
        fixtureHorizon: 1,
        competitionMatches: [],
        competitionPlans: {},
        teamAliases: {},
        identityAliases: {},
        teamIssues: [],
        status: 'idle',
        statusMessage: null,
        statsBusyId: null,
        lastSync: null,
        updateLog: [],
        datasets: [],
        predictionRun: null,
        predictionProgress: null,
        predictionModels: MODELS.map((m) => m.id),
        modelPredictions: {},
        modelPredictionsAt: null,
        modelPredictionsMatches: 0,
        predictingFixtures: false,
        derived: EMPTY_DERIVED,

        setFilters: (f) => set({ filters: { ...get().filters, ...f } }),
        resetFilters: () => set({ filters: EMPTY_FILTERS }),

        setParams: (p) => {
          recompute({ params: { ...get().params, ...p } });
        },

        setSeasonId: (leagueId, seasonId) =>
          set({ seasonIds: { ...get().seasonIds, [leagueId]: seasonId } }),

        setCompetitionId: (leagueId, competitionId) => {
          const next = { ...get().competitionIds };
          if (competitionId.trim()) next[leagueId] = competitionId.trim();
          else delete next[leagueId];
          set({ competitionIds: next });
        },

        setFixtureHorizon: (rounds) => set({ fixtureHorizon: Math.max(0, Math.trunc(rounds)) }),


        discoverCompetitions: async () => {
          const s = get();
          const provider = buildProvider(s);
          if (!provider.listCompetitions) {
            set({ statusMessage: `${provider.name} no publica un catálogo de competiciones.` });
            return;
          }
          set({ status: 'syncing', statusMessage: `Descargando catálogo de ${provider.name}…` });
          try {
            const catalog: ProviderCompetition[] = await provider.listCompetitions();
            const matches = matchCompetitions(s.leagues, catalog);

            const ids = { ...s.competitionIds };
            const seasons = { ...s.seasonIds };
            const plans: Record<string, string> = {};
            let auto = 0;
            for (const m of matches) {
              if (!m.chosen) continue;
              ids[m.leagueId] = m.chosen.id;
              if (m.chosen.currentSeason !== null) {
                seasons[m.leagueId] = String(m.chosen.currentSeason);
              }
              if (m.chosen.plan) plans[m.leagueId] = m.chosen.plan;
              auto++;
            }
            const pending = matches.filter((m) => !m.chosen);
            set({
              status: 'idle',
              competitionIds: ids,
              seasonIds: seasons,
              competitionPlans: plans,
              competitionMatches: pending,
              statusMessage:
                `${catalog.length} competiciones en el catálogo · ${auto} emparejadas ` +
                `automáticamente` +
                (pending.length ? ` · ${pending.length} necesitan que elijas` : ''),
            });
          } catch (e) {
            set({ status: 'idle', statusMessage: `Catálogo: ${(e as Error).message}` });
          }
        },

        refreshLeague: async (leagueId) => {
          const league = get().leagues.find((l) => l.id === leagueId);
          if (league && get().status === 'idle') await actualizarPartidos([league]);
        },
        refreshMatchStats: async (matchId) => {
          const s = get();
          const match = s.matches.find((m) => m.id === matchId);
          const league = s.leagues.find((l) => l.id === match?.leagueId);
          if (!match || !league) return;
          // De uno en uno: cada consulta recorre las fuentes de la liga.
          if (s.statsBusyId || s.status !== 'idle') {
            set({ statusMessage: 'Ya hay una actualización en marcha. Espera a que termine.' });
            return;
          }

          const rotulo = `${match.homeTeamName} - ${match.awayTeamName}`;
          set({ statsBusyId: matchId, statusMessage: `Consultando las fuentes de ${league.name} para ${rotulo}…` });

          try {
            const r = await fetchOfficialMatchStats(match, league, s.identityAliases);
            const updated = conEstadisticas(match, r, new Date().toISOString());
            recompute({ matches: get().matches.map((m) => (m.id === matchId ? updated : m)) });

            const intentos = r.attempts.map((a) => `${a.source}: ${a.ok ? 'ok' : a.error}`).join(' → ');
            const aportes = r.contributions ?? [];
            const faltan = missingMatchData(updated);
            set({
              statsBusyId: null,
              statusMessage:
                aportes.length > 0
                  ? `${rotulo}: ${aportes.map((a) => `${a.fields.length} datos de ${nombreFuente(a)}`).join(' + ')}` +
                    (faltan.length ? ` · sin publicar: ${faltan.join(', ')}` : '') +
                    (r.rejected.length ? ` · ${r.rejected.length} descartados` : '') +
                    ` · ${intentos}`
                  : `${rotulo}: ninguna fuente publica sus estadísticas · ${intentos}`,
            });
          } catch (e) {
            set({ statsBusyId: null, statusMessage: `${rotulo}: ${(e as Error).message}` });
          }
        },

        refreshLeagueWithStats: async (leagueId) => {
          const league = get().leagues.find((l) => l.id === leagueId);
          if (!league || get().status !== 'idle' || get().statsBusyId) return;
          await actualizarPartidos([league]);
          const partidos = get().statusMessage;

          // Con marcador (sin él no se comprueba que la página leída sea este partido) y con alguna
          // cifra por llenar: a los completos una segunda consulta no les aporta nada.
          // Un 0-0 en amarillas también se vuelve a comprobar: FotMob lo publica sin registrar en varias ligas,
          // y su cronología dice si es real.
          const cola = get().matches.filter(
            (m) =>
              m.leagueId === leagueId &&
              hasResult(m) &&
              (missingMatchData(m).length > 0 || (m.yellowCardsHome === 0 && m.yellowCardsAway === 0)),
          );
          const total = cola.length;
          if (!total) {
            set({
              statusMessage: [partidos, `todos los disputados de ${league.name} ya tienen estadísticas`]
                .filter(Boolean)
                .join(' · '),
            });
            return;
          }

          set({ status: 'syncing', statusMessage: `Estadísticas de ${league.name}… 0/${total}` });
          const listos = new Map<string, Match>();
          const volcar = () => {
            const lote = new Map(listos);
            listos.clear();
            return recompute({ matches: get().matches.map((m) => lote.get(m.id) ?? m) });
          };
          const fallos: string[] = [];
          let hechos = 0;
          let conDatos = 0;
          // De 3 en 3: todas las consultas van a los mismos servidores.
          await Promise.all(
            Array.from({ length: Math.min(3, total) }, async () => {
              for (let m = cola.shift(); m; m = cola.shift()) {
                try {
                  const r = await fetchOfficialMatchStats(m, league, get().identityAliases);
                  listos.set(m.id, conEstadisticas(m, r, new Date().toISOString()));
                  if (r.filled > 0) conDatos++;
                } catch (e) {
                  fallos.push((e as Error).message);
                }
                // La tabla se va llenando de 10 en 10 sin recalcular el modelo en cada partido.
                if (++hechos % 10 === 0) volcar();
                set({ statusMessage: `Estadísticas de ${league.name}… ${hechos}/${total}` });
              }
            }),
          );
          const derived = volcar();

          // El Excel de la liga se reescribe solo si entró alguna cifra.
          const file = get().updateLog.find((e) => e.leagueId === leagueId)?.file;
          let excel: string | null = null;
          if (conDatos > 0 && file) {
            set({ statusMessage: `Guardando data/ligas/${file}…` });
            const t = get();
            try {
              await saveLeagueExcel({
                file,
                league,
                matches: t.matches.filter((m) => m.leagueId === leagueId),
                fixtures: t.fixtures.filter((f) => f.leagueId === leagueId),
                opponentPpg: derived.opponentPpg,
              });
            } catch (e) {
              excel = `no se pudo guardar data/ligas/${file}: ${(e as Error).message}`;
            }
          }

          const sinDatos = total - conDatos - fallos.length;
          set({
            status: 'idle',
            statusMessage: [
              partidos,
              `estadísticas de ${total} partidos: ${conDatos} con datos`,
              sinDatos ? `${sinDatos} sin publicar en ninguna fuente` : null,
              fallos.length ? `${fallos.length} con error (${fallos[0]})` : null,
              excel,
            ]
              .filter(Boolean)
              .join(' · '),
          });
        },

        importLeagueExcel: async (leagueId, file) => {
          const s = get();
          const league = s.leagues.find((l) => l.id === leagueId);
          if (!league) return;

          set({ status: 'importing', statusMessage: `Leyendo ${file.name}…` });
          try {
            const imported = await leerExcel(file);
            const { matches, fixtures, stats, error } = mergeLeagueImport({
              league,
              imported,
              existingMatches: s.matches,
              existingFixtures: s.fixtures,
            });

            if (error) {
              set({ status: 'idle', statusMessage: `${league.name}: ${error}` });
              return;
            }

            // Los parámetros del modelo NO se tocan: son globales y este archivo es de una
            // sola liga. Las incidencias del archivo sí se guardan, para poder revisarlas.
            recompute({ matches, fixtures, importIssues: imported.issues });

            const partes = [`${league.name}: ${stats.newMatches} partidos nuevos`];
            if (stats.updatedMatches) partes.push(`${stats.updatedMatches} actualizados`);
            if (stats.newFixtures) partes.push(`${stats.newFixtures} pendientes nuevos`);
            if (stats.updatedFixtures) partes.push(`${stats.updatedFixtures} pendientes modificados`);
            if (stats.closedFixtures) partes.push(`${stats.closedFixtures} pasaron a disputados`);
            if (stats.invertedMatches) partes.push(`${stats.invertedMatches} ya estaban con la localía al revés`);
            if (stats.renamedFrom) partes.push(`el archivo la llamaba «${stats.renamedFrom}»`);
            const errores = imported.issues.filter((i) => i.severity === 'error').length;
            if (errores) partes.push(`${errores} filas descartadas`);

            set({ status: 'idle', statusMessage: partes.join(' · ') });
          } catch (e) {
            set({ status: 'idle', statusMessage: `${league.name}: no se pudo leer el archivo (${(e as Error).message})` });
          }
        },

        inspectHistoricalExcel: async (file) => {
          const imported = await leerExcel(file);
          return {
            proposal: proponerTemporada(file.name, imported.matches),
            matches: imported.matches.length,
            leagueName: imported.matches[0]?.leagueId ?? null,
          };
        },

        /**
         * Carga una temporada pasada en una competición.
         *
         * Se apoya en `mergeLeagueImport`, que ya resuelve lo difícil: reconoce el mismo partido aunque las
         * fuentes escriban los nombres distintos (`findTwin`) y nunca deja que un `null` del archivo borre un
         * dato que ya había (`mergeMatch`). Lo único que añade esto es a QUÉ temporada van los partidos, que
         * es lo que el libro no dice.
         */
        importHistoricalExcel: async (leagueId, file, target) => {
          const s = get();
          const league = s.leagues.find((l) => l.id === leagueId);
          if (!league) return;
          if (!target.season) {
            set({ statusMessage: 'Elige la temporada antes de cargar el archivo.' });
            return;
          }

          set({ status: 'importing', statusMessage: `Leyendo ${file.name}…` });
          try {
            const imported = await leerExcel(file);
            const { matches: historicos, fixtures: pendientes, summary } = prepararHistorico(imported, league, target, file.name);

            const { matches, fixtures, error } = mergeLeagueImport({
              league,
              imported: { ...imported, matches: historicos, fixtures: pendientes },
              existingMatches: s.matches,
              existingFixtures: s.fixtures,
              // Sin esto, la fusión reestampa la temporada de la competición y el histórico se suma
              // a la temporada en curso.
              season: summary.season,
            });
            if (error) {
              set({ status: 'idle', statusMessage: `${league.name}: ${error}` });
              return;
            }

            // Una recarga del mismo archivo sustituye su ficha en vez de acumular entradas repetidas.
            const datasets = [
              ...s.datasets.filter((d) => !(d.leagueId === summary.leagueId && d.season === summary.season && d.phase === summary.phase)),
              summary,
            ];
            recompute({ matches, fixtures, datasets, importIssues: imported.issues });

            const nuevos = matches.length - s.matches.length;
            const sinDato = Object.entries(summary.coverage).filter(([, n]) => n === 0).map(([k]) => k);
            set({
              status: 'idle',
              statusMessage: [
                `${league.name} ${summary.season}${summary.phase ? ` (${summary.phase})` : ''}: ${summary.matches} partidos leídos`,
                `${nuevos} nuevos`,
                summary.rejected ? `${summary.rejected} filas descartadas` : null,
                sinDato.length ? `sin datos de ${sinDato.join(', ')}` : null,
              ]
                .filter(Boolean)
                .join(' · '),
            });
          } catch (e) {
            set({ status: 'idle', statusMessage: `${league.name}: no se pudo leer el archivo (${(e as Error).message})` });
          }
        },

        removeSeason: (leagueId, season) => {
          const s = get();
          const vigente = seasonKey(s.leagues.find((l) => l.id === leagueId)?.season);
          if (vigente !== null && seasonKey(season) === vigente) {
            set({ statusMessage: 'Esa es la temporada en curso: no se borra desde aquí.' });
            return;
          }
          const esta = (m: { leagueId: string; season: string }) => m.leagueId === leagueId && seasonKey(m.season) === seasonKey(season);
          const quedan = s.matches.filter((m) => !esta(m));
          const borrados = s.matches.length - quedan.length;
          recompute({
            matches: quedan,
            fixtures: s.fixtures.filter((f) => !esta(f)),
            datasets: s.datasets.filter((d) => !(d.leagueId === leagueId && seasonKey(d.season) === seasonKey(season))),
          });
          set({ statusMessage: `${borrados} partidos de ${season} eliminados.` });
        },

        addOfficialCompetitions: async () => {
          const s = get();
          if (s.status !== 'idle') return;
          set({ status: 'syncing', statusMessage: 'Leyendo la lista de competiciones…' });
          let oficiales;
          try {
            oficiales = await fetchOfficialLeagues();
          } catch (e) {
            set({ status: 'idle', statusMessage: (e as Error).message });
            return;
          }

          const yaEstan = new Set(s.leagues.map((l) => espnLeagueId(l.name, l.country)));
          const nuevas = oficiales
            .filter((o) => EXTRA_COMPETITIONS.some((x) => x.slug === o.slug) && !yaEstan.has(o.slug))
            // «Añadida a mano», como cualquier alta desde Configuración: así se puede quitar allí.
            .map((o) => ({ ...leagueFromOfficial(o), source: 'Añadida a mano' }));
          if (nuevas.length === 0) {
            set({ status: 'idle', statusMessage: 'Todas las competiciones del registro ya están en Competiciones.' });
            return;
          }

          recompute({ leagues: [...s.leagues, ...nuevas] });
          set({ status: 'idle' });
          // Sus partidos se traen al momento: una competición vacía no sirve para nada.
          await actualizarPartidos(nuevas);
        },

        runPredictionBacktest: async () => {
          const s = get();
          if (s.predictionProgress !== null) return;
          if (s.matches.length < 200) {
            set({ statusMessage: 'Hacen falta al menos 200 partidos disputados para medir los modelos.' });
            return;
          }
          set({ predictionProgress: 'preparando el histórico…' });
          try {
            // En el worker: son minutos de CPU y antes se los comía el hilo que pinta la pantalla.
            const r = await medirModelos(
              { matches: s.matches, leagues: s.leagues, params: s.params, modelIds: s.predictionModels },
              (texto: string) => set({ predictionProgress: texto }),
            );
            set({
              predictionRun: toStored({
                calibration: r.calibration,
                scores: r.scores,
                common: r.common,
                skipped: r.skipped,
                matchesAtRun: s.matches.length,
              }),
              predictionProgress: null,
              statusMessage: `Modelos medidos con ${r.evaluated} partidos · ${r.refits} reentrenos`,
            });
          } catch (e) {
            set({ predictionProgress: null, statusMessage: `Backtest de modelos: ${(e as Error).message}` });
          }
        },

        togglePredictionModel: (id) => {
          const actuales = get().predictionModels;
          const siguiente = actuales.includes(id) ? actuales.filter((x) => x !== id) : [...actuales, id];
          // Apagarlos todos dejaría el motor sin nada que decir.
          if (siguiente.length === 0) {
            set({ statusMessage: 'Al menos un modelo tiene que quedar encendido.' });
            return;
          }
          set({ predictionModels: siguiente });
        },

        refreshModelPredictions: async () => {
          const s = get();
          if (s.predictingFixtures || s.fixtures.length === 0) return;
          set({ predictingFixtures: true, statusMessage: `Entrenando los modelos con ${s.matches.length} partidos…` });
          try {
            const { predicciones, modelos } = await predecirLote(
              { matches: s.matches, leagues: s.leagues, params: s.params, modelIds: s.predictionModels },
              s.fixtures,
              fromStored(s.predictionRun) ?? SIN_MEDIR,
            );
            const modelPredictions = Object.fromEntries(predicciones);
            recompute({
              modelPredictions,
              modelPredictionsAt: new Date().toISOString(),
              modelPredictionsMatches: s.matches.length,
            });
            const sinPredecir = s.fixtures.length - predicciones.size;
            set({
              predictingFixtures: false,
              statusMessage:
                `${predicciones.size} partidos pendientes con predicción de ${modelos} modelos` +
                (sinPredecir ? ` · ${sinPredecir} sin datos suficientes` : ''),
            });
          } catch (e) {
            set({ predictingFixtures: false, statusMessage: `Modelos: ${(e as Error).message}` });
          }
        },

        setTeamAlias: (leagueId, providerName, canonical) => {
          const all = get().teamAliases;
          const forLeague = { ...(all[leagueId] ?? {}) };
          const key = normalizeTeamName(providerName);
          if (canonical) forLeague[key] = canonical;
          else delete forLeague[key];
          set({ teamAliases: { ...all, [leagueId]: forLeague } });
        },

        setIdentityAlias: (name, espnId) => {
          const next = { ...get().identityAliases };
          const key = normalizeTeamName(name);
          if (espnId) next[key] = espnId;
          else delete next[key];
          recompute({ identityAliases: next });
        },

        addLeague: (league) => {
          const s = get();
          if (!league.id.trim()) return 'La competición necesita un nombre.';
          if (s.leagues.some((l) => l.id === league.id)) return 'Ya existe una liga con ese nombre.';
          recompute({ leagues: [...s.leagues, league] });
          return null;
        },

        removeLeague: (leagueId) => {
          const s = get();
          recompute({
            leagues: s.leagues.filter((l) => l.id !== leagueId),
            matches: s.matches.filter((m) => m.leagueId !== leagueId),
            fixtures: s.fixtures.filter((f) => f.leagueId !== leagueId),
          });
        },

        addFixture: (input) => {
          const s = get();
          const league = s.leagues.find((l) => l.id === input.leagueId);
          if (!league) return 'Liga desconocida.';
          if (input.homeTeamName === input.awayTeamName)
            return 'El local y el visitante no pueden ser el mismo equipo.';

          const base = {
            leagueId: league.id,
            season: league.season,
            date: input.date,
            homeTeamName: input.homeTeamName,
            awayTeamName: input.awayTeamName,
          };
          const id = resolveMatchId({ providerId: null, ...base });
          if (s.fixtures.some((f) => f.id === id)) return 'Ese partido pendiente ya existe.';
          if (s.matches.some((m) => m.id === id)) return 'Ese partido ya está disputado.';

          recompute({
            fixtures: [
              ...s.fixtures,
              {
                id,
                providerId: null,
                leagueId: league.id,
                country: league.country,
                season: league.season,
                date: input.date,
                round: input.round,
                homeTeamId: buildTeamId(league.id, input.homeTeamName),
                awayTeamId: buildTeamId(league.id, input.awayTeamName),
                homeTeamName: input.homeTeamName,
                awayTeamName: input.awayTeamName,
                status: 'Programado',
                source: 'Manual',
              },
            ],
          });
          return null;
        },

        removeFixture: (fixtureId) => {
          recompute({ fixtures: get().fixtures.filter((f) => f.id !== fixtureId) });
        },

        setMatchData: (matchId, changes) => {
          const match = get().matches.find((m) => m.id === matchId);
          if (!match) return 'No se encuentra el partido.';
          const next: Match = { ...match };
          const manual = new Set(match.manualFields ?? []);
          const campos = Object.keys(changes) as ManualField[];
          for (const k of campos) {
            const valor = changes[k] ?? null;
            next[k] = valor;
            if (valor === null) manual.delete(k);
            else manual.add(k);
          }
          const errores = errorsForChanges(validateMatchData(matchDataValues(next), { home: next.homeGoals, away: next.awayGoals }), campos);
          const primero = Object.values(errores)[0];
          if (primero) return `Dato no válido: ${primero}`;
          next.manualFields = [...manual];
          next.updatedAt = new Date().toISOString();
          recompute({ matches: get().matches.map((m) => (m.id === matchId ? next : m)) });
          return null;
        },

        /**
         * Pone a 0 el dato que falta en varios partidos de golpe.
         *
         * Existe porque lo contrario es inviable a mano: las fuentes no publican las tarjetas rojas cuando no
         * hubo ninguna, y eso deja cientos de partidos con el dato vacío. Uno a uno son cientos de
         * formularios.
         *
         * Tres límites que lo mantienen honesto:
         *   - Solo los datos de `ZERO_PLAUSIBLE`: nunca el marcador ni el descanso, que son resultados.
         *   - **Solo rellena el lado que falta.** Si el local tiene 1 roja y el visitante está vacío, se
         *     escribe el 0 del visitante y el 1 no se toca.
         *   - Pasa la MISMA validación que el formulario y salta los partidos que no la pasan. Un 0 parece
         *     inofensivo y no lo es: poner 0 tiros en un partido que ya tiene 3 tiros a puerta es imposible.
         *
         * Queda como «Manual», así que la siguiente actualización oficial no lo pisa (`mergeMatch`). Eso
         * también significa que si la fuente publica más tarde el valor de verdad, el 0 escrito aquí gana:
         * es el precio de poder escribirlo.
         */
        fillMissingWithZero: (matchIds, datumId) => {
          const d = MATCH_DATA.find((x) => x.id === datumId);
          if (!d || !ZERO_PLAUSIBLE.has(datumId)) {
            set({ statusMessage: 'Ese dato no admite asignar 0.' });
            return;
          }
          const ids = new Set(matchIds);
          const ahora = new Date().toISOString();
          let escritos = 0;
          let saltados = 0;
          const matches = get().matches.map((m) => {
            if (!ids.has(m.id)) return m;
            const next = zeroMissing(m, d, ahora);
            if (next) escritos++;
            // Le faltaba y no se pudo escribir: el 0 habria dejado el partido en un estado imposible.
            else if (isMissing(m, d)) saltados++;
            return next ?? m;
          });

          if (escritos) recompute({ matches });
          set({
            statusMessage: [
              `${d.name}: 0 en ${escritos} partidos`,
              saltados ? `${saltados} saltados porque el 0 no era posible` : null,
            ]
              .filter(Boolean)
              .join(' · '),
          });
        },

        /**
         * Carga UN dato que falta desde un .txt en los partidos que se están viendo.
         *
         * Existe por el xG: ninguna fuente autorizada lo publica para varias de las competiciones
         * cargadas, así que o entra a mano o no entra, y a mano son cientos de formularios. El parser y
         * el emparejado están en `statsTxt.ts`, con su test; aquí solo se guarda el resultado y se cuenta
         * lo que ha pasado, porque un «cargado» a secas escondería las líneas que no cuadraron.
         */
        loadStatsTxt: (matchIds, datumId, text) => {
          const d = MATCH_DATA.find((x) => x.id === datumId);
          if (!d) return;
          const s = get();
          const r = applyStatsTxt({
            matches: s.matches,
            target: new Set(matchIds),
            leagues: s.leagues,
            datum: d,
            text,
            now: new Date().toISOString(),
          });
          if (r.error) {
            set({ statusMessage: r.error });
            return;
          }
          if (r.written) recompute({ matches: r.matches });
          set({
            statusMessage: [
              `${d.name}: ${r.written} partidos cargados`,
              r.already ? `${r.already} ya lo tenían` : null,
              r.notFound ? `${r.notFound} sin partido entre los filtrados` : null,
              r.wrongScore ? `${r.wrongScore} con otro marcador` : null,
              r.rejected ? `${r.rejected} con un valor imposible` : null,
              r.ignored ? `${r.ignored} líneas no legibles` : null,
            ]
              .filter(Boolean)
              .join(' · '),
          });
        },

        /*
         * La fecha de un partido, a mano.
         *
         * Hace falta porque una fuente puede dejar un aplazado en la fecha en la que ESTABA previsto: pasó
         * con «Fortaleza CEIF - Envigado» de la BetPlay 2025, programado el 24/01 y jugado el 28, y no había
         * forma de corregirlo. La fecha ordena las jornadas y la forma reciente, así que una fecha mal puesta
         * no es un detalle.
         *
         * Dos cosas que arrastra: el `id` del partido sale de la fecha cuando la fuente no da uno propio, así
         * que se recalcula; y queda como «Manual», que es lo que impide que la siguiente actualización con
         * fechas oficiales lo devuelva a donde estaba (`mergeMatch`).
         */
        setMatchDate: (matchId, date) => {
          const s = get();
          const match = s.matches.find((m) => m.id === matchId);
          if (!match) return 'No se encuentra el partido.';
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return 'La fecha tiene que ser un día real, con el formato AAAA-MM-DD.';
          if (date === match.date) return null;
          const base: Match = {
            ...match,
            date,
            manualFields: [...new Set([...(match.manualFields ?? []), 'date'])],
            updatedAt: new Date().toISOString(),
          };
          const next: Match = { ...base, id: resolveMatchId(base) };
          // Misma competición, temporada, día y equipos sería el mismo partido dos veces.
          if (next.id !== match.id && s.matches.some((m) => m.id === next.id)) {
            return 'Ya hay otro partido de esos dos equipos ese día en esta competición.';
          }
          recompute({ matches: s.matches.map((m) => (m.id === matchId ? next : m)) });
          return null;
        },

        importExcel: async (file) => {
          set({ status: 'importing', statusMessage: 'Leyendo el libro…' });
          try {
            const result = await leerExcel(file);
            recompute({
              leagues: result.leagues,
              matches: result.matches,
              fixtures: result.fixtures,
              // Preferencias que el libro no define: se conservan las del usuario.
              params: {
                ...result.params,
                xgMissingMode: get().params.xgMissingMode,
                statAverageMode: get().params.statAverageMode,
                oneXTwoMode: get().params.oneXTwoMode,
                xgStrengthMode: get().params.xgStrengthMode,
                projectionSource: get().params.projectionSource,
              },
              importIssues: result.issues,
              lastUpdate: new Date().toISOString(),
            });
            const errors = result.issues.filter((i) => i.severity === 'error').length;
            set({
              status: 'idle',
              statusMessage:
                `Importados ${result.stats.matches} partidos, ${result.stats.teams} equipos y ` +
                `${result.stats.fixtures} partidos pendientes` +
                (errors ? ` · ${errors} filas descartadas` : ''),
            });
          } catch (e) {
            set({
              status: 'idle',
              statusMessage: `No se pudo importar: ${(e as Error).message}`,
              importIssues: [
                {
                  sheet: '-',
                  row: null,
                  message: (e as Error).message,
                  severity: 'error',
                },
              ],
            });
          }
        },

        refreshData: async () => {
          const s = get();
          if (s.status !== 'idle') return;
          set({ status: 'syncing', statusMessage: 'Leyendo la lista de competiciones…' });
          let oficiales;
          try {
            oficiales = await fetchOfficialLeagues();
          } catch (e) {
            set({ status: 'idle', statusMessage: (e as Error).message });
            return;
          }
          // Cada competición del registro con su liga de la app; las que aún no están se crean.
          const porSlug = new Map(s.leagues.map((l) => [espnLeagueId(l.name, l.country), l]));
          const nuevas: League[] = [];
          const targets = oficiales.map((o) => {
            const existente = porSlug.get(o.slug);
            if (existente) return existente;
            const alta = leagueFromOfficial(o);
            nuevas.push(alta);
            return alta;
          });
          await actualizarPartidos(targets, nuevas);
        },

        clearAll: () => {
          recompute({
            leagues: [],
            matches: [],
            fixtures: [],
            importIssues: [],
            lastUpdate: null,
            lastSync: null,
            statusMessage: 'Datos borrados.',
          });
        },
      };
    },
    {
      name: 'analisis-futbol',
      // SQLite en el servidor local, no `localStorage` (ver `sqliteStorage.ts`). La primera vez copia lo que había en
      // el navegador y lo deja ahí como copia de seguridad.
      storage: almacenDatos,
      version: 7,
      /**
       * v0 guardaba los códigos anidados por proveedor (`{'football-data': {...}}`) porque
       * había varios adaptadores. Al quedarnos con uno, se aplanan para no perder lo que el
       * usuario ya había configurado.
       */
      migrate: (persisted, version) => {
        const s = persisted as Record<string, unknown>;
        if (!s) return s as never;

        // v1 -> v2: los partidos guardados no tienen los campos de procedencia de las
        // estadísticas. Se rellenan vacíos, nunca con datos supuestos.
        if (version < 2 && Array.isArray(s.matches)) {
          s.matches = (s.matches as Record<string, unknown>[]).map((m) => ({
            statsSource: null,
            statsUpdatedAt: null,
            statsCitations: [],
            ...m,
          }));
        }
        // v2 -> v3: parámetro nuevo (MARGEN_CLARO). Los parámetros guardados lo reciben con su
        // valor por defecto; los que ya tenían se respetan.
        if (version < 3 && s.params && typeof s.params === 'object') {
          s.params = { ...DEFAULT_MODEL_PARAMS, ...(s.params as object) };
        }
        // v3 -> v4: PROMEDIO_STATS. Por muestra, para que un partido sin corners publicados no hunda
        // la proyección (DIFF-07). Se puede volver a «÷ PJ» en Configuración → Modelo.
        if (version < 4 && s.params && typeof s.params === 'object') {
          s.params = { ...(s.params as object), statAverageMode: 'muestra' };
        }
        // v4 -> v5 (18/09/2026): 1X2 de la matriz Poisson, xG a favor × en contra y K_SHRINK 10, medidos en walk-forward
        // (MODEL_MAPPING.md DIFF-11, DIFF-12 y §11). Los parámetros guardados reciben los modos nuevos y los que les
        // faltasen (PROMEDIO_STATS no llegó a guardarse en todos), su valor por defecto. K_SHRINK pasa a 10 solo si seguía en
        // el 5 del libro. Todo se puede volver a dejar como el libro en Configuración → Modelo.
        if (version < 5 && s.params && typeof s.params === 'object') {
          const p = { ...DEFAULT_MODEL_PARAMS, ...(s.params as Partial<ModelParams>) };
          s.params = { ...p, kShrink: p.kShrink === 5 ? DEFAULT_MODEL_PARAMS.kShrink : p.kShrink };
        }
        // v5 -> v6: FUENTE_PROYECCION, que decide si las proyecciones (y con ellas los picks) usan también
        // los siete modelos. `params` se guarda como un objeto entero, así que un parámetro nuevo NO llega a
        // un almacén ya existente si no se rellena aquí: se quedaría en `undefined` y el modelo se comportaría
        // como si no existiera. Por eso cada parámetro nuevo lleva su migración.
        if (version < 6 && s.params && typeof s.params === 'object') {
          s.params = { ...DEFAULT_MODEL_PARAMS, ...(s.params as Partial<ModelParams>) };
        }
        // v6 -> v7 (26/09/2026): PRIOR y K_PRIOR. Con histórico cargado, la contracción de un equipo con pocos
        // partidos parte de lo que ese mismo equipo hizo en las temporadas anteriores en vez de la media de la
        // liga. Una competición sin histórico da exactamente los mismos números que antes. Se puede volver al
        // comportamiento del libro en Configuración → Modelo.
        if (version < 7 && s.params && typeof s.params === 'object') {
          s.params = { ...DEFAULT_MODEL_PARAMS, ...(s.params as Partial<ModelParams>) };
        }
        if (version >= 1) return s as never;

        const ids = s.competitionIds as Record<string, unknown> | undefined;
        const nested = ids?.['football-data'];
        if (nested && typeof nested === 'object') s.competitionIds = nested;
        delete s.providerId;
        delete s.leagueProviders;
        delete s.apiFootballKey;
        delete s.apiFootballStatus;
        delete s.statisticsLimit;
        return s as never;
      },
      // `derived` se recalcula al rehidratar: no se persiste nada derivable.
      partialize: (s) => ({
        leagues: s.leagues,
        matches: s.matches,
        fixtures: s.fixtures,
        params: s.params,
        seasonIds: s.seasonIds,
        competitionIds: s.competitionIds,
        competitionPlans: s.competitionPlans,
        fixtureHorizon: s.fixtureHorizon,
        teamAliases: s.teamAliases,
        identityAliases: s.identityAliases,
        lastUpdate: s.lastUpdate,
        importIssues: s.importIssues,
        updateLog: s.updateLog,
        datasets: s.datasets,
        predictionRun: s.predictionRun,
        predictionModels: s.predictionModels,
        modelPredictions: s.modelPredictions,
        modelPredictionsAt: s.modelPredictionsAt,
        modelPredictionsMatches: s.modelPredictionsMatches,
      }),
      onRehydrateStorage: () => (state, error) => {
        // Antes del setState de abajo, que ya guarda.
        lecturaCorrecta = !error;
        if (!state) return;
        // Los datos guardados antes de existir la identidad global la reciben aquí. La lectura de SQLite es
        // asíncrona: el store ya existe y se actualiza con setState (mutar `state` no repintaría nada).
        const r = attachTeamRefs({
          leagues: state.leagues,
          matches: state.matches,
          fixtures: state.fixtures,
          aliases: state.identityAliases ?? {},
        });
        const u = unifyTeamNames({ leagues: state.leagues, matches: r.matches, fixtures: r.fixtures });
        useStore.setState({
          matches: u.matches,
          fixtures: u.fixtures,
          teamIssues: r.issues,
          derived: recalculateAll({
            leagues: state.leagues,
            matches: u.matches,
            fixtures: u.fixtures,
            params: state.params,
            // Las predicciones guardadas entran aquí también: si no, al abrir la aplicación las
            // proyecciones saldrían del libro hasta el primer cambio, sin que nada lo dijera.
            predictions: new Map(Object.entries(state.modelPredictions ?? {})),
          }),
        });
      },
    },
  ),
);
