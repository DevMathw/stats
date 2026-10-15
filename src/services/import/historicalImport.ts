/**
 * Carga de una temporada PASADA de una competición, desde un libro con las hojas de siempre.
 *
 * La diferencia con `importLeagueExcel` no es cómo se lee el archivo —eso ya lo hace `excelImport`— sino a
 * QUÉ temporada van los partidos. Y ahí hay un problema medido: en los 15 libros de `data_statistics/`, la
 * columna **«Temporada» de PARTIDOS viene vacía en las 200 filas**, y la hoja LIGAS dice siempre
 * «Temporada 2026/27» aunque el archivo sea de 2025. Si se importara tal cual, la BetPlay 2025 entraría
 * etiquetada como la temporada en curso y se sumaría a ella.
 *
 * Por eso la temporada y la fase son un parámetro explícito, no algo que se deduzca del contenido:
 * `proponerTemporada` sugiere a partir del nombre del archivo y de las fechas de los partidos, y quien
 * importa confirma. Sugerir y confirmar, nunca adivinar en silencio.
 *
 * Cambiar la temporada cambia el id del partido (`buildMatchKey` la incluye), y eso es justo lo que
 * mantiene 2025 y 2026 como registros distintos en vez de pisarse.
 */
import type { ImportResult } from './excelImport';
import type { Fixture, League, Match } from '../../types';
import { resolveMatchId } from '../../domain/models/ids';
import { parseSeasonLabel, seasonKey } from '../../domain/models/season';

/**
 * Fases que son el mismo torneo con otro nombre.
 *
 * Dimayor llama «Finalización» al segundo torneo del año y FotMob lo llama «Clausura». Los 96 partidos que
 * ya hay en la base vienen de FotMob, así que **el nombre en vivo es el canónico**: si se importara el
 * libro con «Finalización», la misma competición tendría dos fases distintas y se partirían en dos la
 * numeración de jornadas, la tabla y la ventana de forma.
 *
 * Es una tabla de sinónimos, no lógica: añadir un caso es añadir una línea.
 */
const FASES_CANONICAS: Record<string, string> = {
  finalizacion: 'Clausura',
  finalizacion2: 'Clausura',
  torneofinalizacion: 'Clausura',
  torneoapertura: 'Apertura',
  torneoclausura: 'Clausura',
};

const sinAcentos = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/** El nombre con el que se guarda una fase. `null` si la competición no tiene fases. */
export function canonicalPhase(fase: string | null | undefined): string | null {
  const limpio = String(fase ?? '').trim();
  if (!limpio) return null;
  return FASES_CANONICAS[sinAcentos(limpio)] ?? limpio;
}

/** Palabras que nombran una fase en los archivos que se manejan hoy. */
const PALABRAS_DE_FASE = ['Apertura', 'Clausura', 'Finalización', 'Finalizacion', 'Anual'];

export interface SeasonProposal {
  /** Clave canónica propuesta (`2025`, `2026-27`), o `null` si no se pudo deducir. */
  season: string | null;
  /** Fase canónica propuesta, o `null`. */
  phase: string | null;
  /** De dónde salió cada cosa, para poder enseñarlo. */
  from: { season: 'nombre' | 'fechas' | null; phase: 'nombre' | 'datos' | null };
  /** Avisos: el nombre del archivo y las fechas no coinciden, no hay partidos con fecha… */
  warnings: string[];
}

/**
 * Propone temporada y fase a partir del nombre del archivo y de las fechas de los partidos.
 *
 * El nombre manda porque es lo único que distingue «2025 Apertura» de «2025 Finalización» —los dos torneos
 * son del mismo año—, pero las fechas lo comprueban: si el archivo dice 2025 y los partidos son de 2026,
 * se avisa en vez de aceptarlo.
 */
export function proponerTemporada(fileName: string, matches: Pick<Match, 'date' | 'phase'>[]): SeasonProposal {
  const warnings: string[] = [];
  const base = fileName.replace(/\.[^.]+$/, '');

  // `2026_27` / `2026-27` antes que un año suelto: «UEFA_Europa_League_2026_27» es una temporada cruzada.
  const cruzada = /(?:^|[_\- ])(20\d{2})[_\- ](\d{2})(?:[_\- ]|$)/.exec(base);
  const suelto = /(?:^|[_\- ])(20\d{2})(?:[_\- ]|$)/.exec(base);
  const deNombre = cruzada
    ? seasonKey(`${cruzada[1]}/${cruzada[2]}`)
    : suelto
      ? seasonKey(suelto[1])
      : null;

  const fechas = matches.map((m) => m.date).filter(Boolean).sort();
  const anios = [...new Set(fechas.map((d) => d.slice(0, 4)))];
  const deFechas = anios.length === 1 ? anios[0] : null;

  if (deNombre && deFechas && !deNombre.startsWith(deFechas) && anios.length) {
    warnings.push(
      `El nombre del archivo dice ${deNombre} pero los partidos son de ${anios.join(' y ')}. Comprueba la temporada antes de cargar.`,
    );
  }
  if (!fechas.length) warnings.push('El archivo no trae ningún partido con fecha legible.');

  const enNombre = PALABRAS_DE_FASE.find((p) => sinAcentos(base).includes(sinAcentos(p)));
  const enDatos = matches.find((m) => m.phase)?.phase ?? null;

  const season = deNombre ?? (deFechas ? seasonKey(deFechas) : null);
  if (!season) warnings.push('No se ha podido deducir la temporada: elígela a mano.');

  return {
    season,
    phase: canonicalPhase(enNombre ?? enDatos),
    from: {
      season: deNombre ? 'nombre' : deFechas ? 'fechas' : null,
      phase: enNombre ? 'nombre' : enDatos ? 'datos' : null,
    },
    warnings,
  };
}

/** Qué campos trae de verdad un conjunto de partidos, para poder decir qué falta sin inventarlo. */
export const CAMPOS_MEDIBLES = [
  ['Marcador', (m: Match) => m.homeGoals !== null && m.awayGoals !== null],
  ['Descanso', (m: Match) => m.homeFirstHalfGoals !== null],
  ['Tiros', (m: Match) => m.shotsHome !== null],
  ['Tiros a puerta', (m: Match) => m.shotsOnTargetHome !== null],
  ['Posesión', (m: Match) => m.possessionHome !== null],
  ['Córners', (m: Match) => m.cornersHome !== null],
  ['Amarillas', (m: Match) => m.yellowCardsHome !== null],
  ['Rojas', (m: Match) => m.redCardsHome !== null],
  ['Faltas', (m: Match) => m.foulsHome !== null],
  ['Fueras de juego', (m: Match) => m.offsidesHome !== null],
  ['xG', (m: Match) => m.xGHome !== null],
] as const satisfies readonly (readonly [string, (m: Match) => boolean])[];

export interface DatasetSummary {
  leagueId: string;
  /** Clave canónica. */
  season: string;
  phase: string | null;
  fileName: string;
  importedAt: string;
  matches: number;
  teams: number;
  firstDate: string | null;
  lastDate: string | null;
  /** `campo -> partidos con ese dato`. Lo que vale 0 es un dato que el libro NO trae. */
  coverage: Record<string, number>;
  /** Filas descartadas por el lector, con su motivo. */
  rejected: number;
}

export interface HistoricalImport {
  matches: Match[];
  fixtures: Fixture[];
  summary: DatasetSummary;
}

/**
 * Reescribe los partidos leídos para que pertenezcan a la temporada y la fase indicadas.
 *
 * El id se vuelve a calcular porque la clave natural del partido incluye la temporada: sin esto, un
 * Apertura y un Finalización del mismo año con los mismos dos equipos el mismo día serían el mismo
 * registro.
 */
export function prepararHistorico(
  imported: ImportResult,
  league: League,
  target: { season: string; phase: string | null },
  fileName: string,
  now = new Date().toISOString(),
): HistoricalImport {
  const fase = canonicalPhase(target.phase);
  const temporada = seasonKey(target.season) ?? target.season;

  const reetiquetar = <T extends Match | Fixture>(rows: T[]): T[] =>
    rows.map((r) => {
      const base = {
        leagueId: league.id,
        season: temporada,
        date: r.date,
        homeTeamName: r.homeTeamName,
        awayTeamName: r.awayTeamName,
      };
      return {
        ...r,
        leagueId: league.id,
        country: league.country,
        season: temporada,
        // La fase del archivo solo se respeta si el libro la traía y no se ha pedido otra.
        phase: fase ?? r.phase ?? null,
        // Un libro histórico no tiene id de proveedor: la clave natural es la única identidad.
        providerId: null,
        id: resolveMatchId({ providerId: null, ...base }),
      };
    });

  const matches = reetiquetar(imported.matches);
  const fixtures = reetiquetar(imported.fixtures);
  const fechas = matches.map((m) => m.date).filter(Boolean).sort();
  const equipos = new Set(matches.flatMap((m) => [m.homeTeamName, m.awayTeamName]));

  return {
    matches,
    fixtures,
    summary: {
      leagueId: league.id,
      season: temporada,
      phase: fase,
      fileName,
      importedAt: now,
      matches: matches.length,
      teams: equipos.size,
      firstDate: fechas[0] ?? null,
      lastDate: fechas.at(-1) ?? null,
      coverage: Object.fromEntries(CAMPOS_MEDIBLES.map(([nombre, tiene]) => [nombre, matches.filter(tiene).length])),
      rejected: imported.issues.filter((i) => i.severity === 'error').length,
    },
  };
}

/** Etiqueta legible de una temporada con su fase: `2025 · Apertura`. */
export const seasonLabel = (season: string, phase: string | null): string => (phase ? `${season} · ${phase}` : season);

/** Las temporadas presentes en los partidos de una competición, de la más nueva a la más vieja. */
export function seasonsOf(matches: Match[], leagueId: string): { season: string; phase: string | null; matches: number }[] {
  const out = new Map<string, { season: string; phase: string | null; matches: number }>();
  for (const m of matches) {
    if (m.leagueId !== leagueId) continue;
    const { key } = parseSeasonLabel(m.season);
    const season = key ?? m.season;
    const phase = m.phase ?? null;
    const clave = `${season}|${phase ?? ''}`;
    const ya = out.get(clave);
    if (ya) ya.matches++;
    else out.set(clave, { season, phase, matches: 1 });
  }
  return [...out.values()].sort((a, b) => b.season.localeCompare(a.season) || (a.phase ?? '').localeCompare(b.phase ?? ''));
}
