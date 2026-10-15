/**
 * Importador de `Analisis_Futbol_2026-27_2.xlsx`. MODEL_MAPPING.md §1.
 *
 * Solo se leen las hojas PRIMARIAS: LIGAS, PARTIDOS, PARTIDOS PENDIENTES y CONFIGURACION.
 * Todo lo demás del libro es derivado y se recalcula (`domain/engine.ts`).
 *
 * Reglas duras:
 *  - celda vacía o "N/A" ⇒ `null`, nunca 0
 *  - la jornada se guarda como NÚMERO
 *  - un partido cuya liga no existe en LIGAS es un error de importación, no una fila muda
 */
import * as XLSX from 'xlsx';
import type { Fixture, League, Match, ModelParams } from '../../types';
import { DEFAULT_MODEL_PARAMS, type ModeParam } from '../../domain/models/params';
import { buildMatchKey, buildTeamId, resolveMatchId } from '../../domain/models/ids';
import { cell, mapColumns } from './sheetColumns';

export interface ImportIssue {
  sheet: string;
  row: number | null;
  message: string;
  severity: 'error' | 'warning';
}

export interface ImportResult {
  leagues: League[];
  matches: Match[];
  fixtures: Fixture[];
  params: ModelParams;
  issues: ImportIssue[];
  stats: {
    leagues: number;
    matches: number;
    fixtures: number;
    duplicatesSkipped: number;
    teams: number;
  };
}

const HEADER_ROW = 4; // fila 4 del libro (1-based) contiene los encabezados
const FIRST_DATA_ROW = 5;

type Row = unknown[];

function sheetRows(wb: XLSX.WorkBook, name: string): Row[] | null {
  const ws = wb.Sheets[name];
  if (!ws) return null;
  return XLSX.utils.sheet_to_json<Row>(ws, { header: 1, raw: true, defval: null, blankrows: true });
}

/** Vacío, "", "N/A", "-" ⇒ null. Nunca 0. */
function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (s === '' || /^n\/?a$/i.test(s) || s === '-') return null;
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

/** Fechas Excel (serial) o texto ⇒ ISO `YYYY-MM-DD`. */
export function toIsoDate(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.y}-${p(d.m)}-${p(d.d)}`;
  }
  const s = String(v).trim();
  // dd/mm/yyyy
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// LIGAS
// ---------------------------------------------------------------------------

export function parseLeaguesSheet(rows: Row[], issues: ImportIssue[]): League[] {
  const leagues: League[] = [];
  for (let i = FIRST_DATA_ROW - 1; i < rows.length; i++) {
    const r = rows[i] ?? [];
    const name = str(r[1]);
    if (!name) continue;
    const country = str(r[0]);
    if (!country) {
      issues.push({ sheet: 'LIGAS', row: i + 1, message: `Liga "${name}" sin país.`, severity: 'warning' });
    }
    leagues.push({
      id: name,
      country: country ?? '',
      name,
      confederation: str(r[2]) ?? '',
      season: str(r[3]) ?? '',
      calendarFormat: str(r[4]) ?? '',
      teamCount: num(r[5]),
      regularSeasonRounds: str(r[6]),
      approximateStartDate: str(r[7]),
      source: str(r[8]),
      reliabilityNotes: str(r[9]),
    });
  }
  if (leagues.length === 0) {
    issues.push({ sheet: 'LIGAS', row: null, message: 'No se encontró ninguna liga.', severity: 'error' });
  }
  return leagues;
}

// ---------------------------------------------------------------------------
// PARTIDOS
// ---------------------------------------------------------------------------

/** Índices 0-based de las columnas primarias de PARTIDOS (A=0). */
/**
 * Las columnas de PARTIDOS, por el nombre de su cabecera y no por su posición.
 *
 * Cada campo lleva los nombres que se aceptan, en orden de preferencia. Añadir una variante es añadir una
 * cadena aquí; no hay que volver a contar columnas. Ver `sheetColumns.ts`.
 *
 * Las columnas DERIVADAS del libro (Goles Totales, Corners Totales, BTTS, Over 1.5/2.5/3.5, Clean Sheet,
 * Resultado HT/FT, Marcador, PPG del rival, Posesión Visitante) no se leen a propósito: las calcula el
 * motor. Medido sobre los 15 libros de `data_statistics/`, además vienen todas vacías.
 */
const PARTIDOS_COLS = {
  liga: ['Liga', 'Competicion', 'Torneo'],
  fecha: ['Fecha'],
  jornada: ['Jornada', 'Fecha Nro', 'Ronda', 'Round'],
  local: ['Equipo Local', 'Local'],
  visitante: ['Equipo Visitante', 'Visitante'],
  golesLocal: ['Goles Local', 'GF Local'],
  golesVisitante: ['Goles Visitante', 'GF Visitante'],
  g1tLocal: ['Goles 1T Local', 'Goles HT Local'],
  g1tVisitante: ['Goles 1T Visitante', 'Goles HT Visitante'],
  tirosLocal: ['Tiros Local'],
  tirosVisitante: ['Tiros Visitante'],
  tpLocal: ['Tiros a Puerta Local'],
  tpVisitante: ['Tiros a Puerta Visitante'],
  posesionLocal: ['Posesion Local'],
  cornersLocal: ['Corners Local', 'Corneres Local'],
  cornersVisitante: ['Corners Visitante', 'Corneres Visitante'],
  amarillasLocal: ['Amarillas Local', 'Tarjetas Amarillas Local'],
  amarillasVisitante: ['Amarillas Visitante', 'Tarjetas Amarillas Visitante'],
  rojasLocal: ['Rojas Local', 'Tarjetas Rojas Local'],
  rojasVisitante: ['Rojas Visitante', 'Tarjetas Rojas Visitante'],
  faltasLocal: ['Faltas Local'],
  faltasVisitante: ['Faltas Visitante'],
  offsideLocal: ['Fuera de Juego Local', 'Offsides Local'],
  offsideVisitante: ['Fuera de Juego Visitante', 'Offsides Visitante'],
  xgLocal: ['xG Local'],
  xgVisitante: ['xG Visitante'],
  fuente: ['Fuente'],
  fechaActualizacion: ['Fecha Actualizacion'],
} as const satisfies Record<string, readonly string[]>;

export type PartidosCol = keyof typeof PARTIDOS_COLS;

export function parseMatchesSheet(
  rows: Row[],
  leagues: League[],
  issues: ImportIssue[],
): { matches: Match[]; duplicates: number } {
  const leagueById = new Map(leagues.map((l) => [l.id, l]));
  const seen = new Set<string>();
  const matches: Match[] = [];
  let duplicates = 0;

  // Las columnas salen de la cabecera real de ESTA hoja, no de posiciones fijas.
  const { map: col, missing } = mapColumns(rows[HEADER_ROW - 1] ?? [], PARTIDOS_COLS);
  for (const campo of ['liga', 'fecha', 'jornada', 'local', 'visitante'] as PartidosCol[]) {
    if (missing.includes(campo)) {
      issues.push({
        sheet: 'PARTIDOS',
        row: HEADER_ROW,
        message: `Falta la columna obligatoria «${PARTIDOS_COLS[campo][0]}». Sin ella no se puede leer ningún partido.`,
        severity: 'error',
      });
      return { matches, duplicates };
    }
  }
  // Las que faltan quedan como dato ausente: `null`, nunca 0 (regla de MODEL_MAPPING.md §3).
  const opcionalesQueFaltan = missing.filter((m) => !['liga', 'fecha', 'jornada', 'local', 'visitante'].includes(m));
  if (opcionalesQueFaltan.length) {
    issues.push({
      sheet: 'PARTIDOS',
      row: HEADER_ROW,
      message: `El libro no trae ${opcionalesQueFaltan.length} columnas conocidas (${opcionalesQueFaltan.map((m) => PARTIDOS_COLS[m][0]).join(', ')}). Esos datos quedan como N/D.`,
      severity: 'warning',
    });
  }
  const v = (r: Row, campo: PartidosCol) => cell(r, col, campo);

  for (let i = FIRST_DATA_ROW - 1; i < rows.length; i++) {
    const r = rows[i] ?? [];
    const rowNo = i + 1;
    const leagueName = str(v(r, 'liga'));
    const home = str(v(r, 'local'));
    const away = str(v(r, 'visitante'));
    if (!leagueName && !home && !away) continue;

    if (!leagueName || !home || !away) {
      issues.push({
        sheet: 'PARTIDOS',
        row: rowNo,
        message: 'Fila incompleta (falta liga o alguno de los equipos). Se descarta.',
        severity: 'error',
      });
      continue;
    }
    const league = leagueById.get(leagueName);
    if (!league) {
      issues.push({
        sheet: 'PARTIDOS',
        row: rowNo,
        message: `La liga "${leagueName}" no existe en la hoja LIGAS. Se descarta el partido.`,
        severity: 'error',
      });
      continue;
    }
    const date = toIsoDate(v(r, 'fecha'));
    if (!date) {
      issues.push({
        sheet: 'PARTIDOS',
        row: rowNo,
        message: `Fecha ilegible en ${home} - ${away}. Se descarta el partido.`,
        severity: 'error',
      });
      continue;
    }
    const round = num(v(r, 'jornada'));
    if (round === null) {
      issues.push({
        sheet: 'PARTIDOS',
        row: rowNo,
        message:
          `Jornada no numérica en ${home} - ${away}. Debe ser 1, 2, 3… (no "J5"): ` +
          'las ventanas de forma dependen de ello. Se descarta el partido.',
        severity: 'error',
      });
      continue;
    }
    if (home === away) {
      issues.push({
        sheet: 'PARTIDOS',
        row: rowNo,
        message: `${home} aparece como local y visitante. Se descarta el partido.`,
        severity: 'error',
      });
      continue;
    }

    const base = {
      leagueId: league.id,
      season: league.season,
      date,
      homeTeamName: home,
      awayTeamName: away,
    };
    const key = buildMatchKey(base);
    if (seen.has(key)) {
      duplicates++;
      issues.push({
        sheet: 'PARTIDOS',
        row: rowNo,
        message: `Duplicado de ${home} - ${away} (${date}). Se conserva la primera aparición.`,
        severity: 'warning',
      });
      continue;
    }
    seen.add(key);

    const homeGoals = num(v(r, 'golesLocal'));
    const awayGoals = num(v(r, 'golesVisitante'));
    if ((homeGoals === null) !== (awayGoals === null)) {
      issues.push({
        sheet: 'PARTIDOS',
        row: rowNo,
        message: `${home} - ${away}: solo uno de los dos marcadores está cargado. Se trata como partido sin resultado.`,
        severity: 'warning',
      });
    }

    matches.push({
      id: resolveMatchId({ providerId: null, ...base }),
      providerId: null,
      leagueId: league.id,
      country: league.country,
      season: league.season,
      date,
      round,
      homeTeamId: buildTeamId(league.id, home),
      awayTeamId: buildTeamId(league.id, away),
      homeTeamName: home,
      awayTeamName: away,
      homeGoals: awayGoals === null ? null : homeGoals,
      awayGoals: homeGoals === null ? null : awayGoals,
      homeFirstHalfGoals: num(v(r, 'g1tLocal')),
      awayFirstHalfGoals: num(v(r, 'g1tVisitante')),
      shotsHome: num(v(r, 'tirosLocal')),
      shotsAway: num(v(r, 'tirosVisitante')),
      shotsOnTargetHome: num(v(r, 'tpLocal')),
      shotsOnTargetAway: num(v(r, 'tpVisitante')),
      possessionHome: num(v(r, 'posesionLocal')),
      cornersHome: num(v(r, 'cornersLocal')),
      cornersAway: num(v(r, 'cornersVisitante')),
      yellowCardsHome: num(v(r, 'amarillasLocal')),
      yellowCardsAway: num(v(r, 'amarillasVisitante')),
      redCardsHome: num(v(r, 'rojasLocal')),
      redCardsAway: num(v(r, 'rojasVisitante')),
      foulsHome: num(v(r, 'faltasLocal')),
      foulsAway: num(v(r, 'faltasVisitante')),
      offsidesHome: num(v(r, 'offsideLocal')),
      offsidesAway: num(v(r, 'offsideVisitante')),
      xGHome: num(v(r, 'xgLocal')),
      xGAway: num(v(r, 'xgVisitante')),
      source: str(v(r, 'fuente')),
      updatedAt: toIsoDate(v(r, 'fechaActualizacion')),
      // El libro no distingue de dónde salió cada estadística; queda sin marcar.
      statsSource: null,
      statsUpdatedAt: null,
      statsCitations: [],
    });
  }

  return { matches, duplicates };
}

// ---------------------------------------------------------------------------
// PARTIDOS PENDIENTES
// ---------------------------------------------------------------------------

export function parseFixturesSheet(
  rows: Row[],
  leagues: League[],
  issues: ImportIssue[],
): Fixture[] {
  const leagueById = new Map(leagues.map((l) => [l.id, l]));
  const seen = new Set<string>();
  const fixtures: Fixture[] = [];

  for (let i = FIRST_DATA_ROW - 1; i < rows.length; i++) {
    const r = rows[i] ?? [];
    const rowNo = i + 1;
    const leagueName = str(r[0]);
    const home = str(r[5]);
    const away = str(r[6]);
    if (!leagueName || !home || !away) continue;

    const league = leagueById.get(leagueName);
    if (!league) {
      issues.push({
        sheet: 'PARTIDOS PENDIENTES',
        row: rowNo,
        message: `La liga "${leagueName}" no existe en LIGAS. Se descarta el fixture.`,
        severity: 'error',
      });
      continue;
    }
    const date = toIsoDate(r[3]);
    const round = num(r[4]);
    if (!date || round === null) {
      issues.push({
        sheet: 'PARTIDOS PENDIENTES',
        row: rowNo,
        message: `${home} - ${away}: fecha o jornada inválida. Se descarta el fixture.`,
        severity: 'error',
      });
      continue;
    }
    const base = {
      leagueId: league.id,
      season: league.season,
      date,
      homeTeamName: home,
      awayTeamName: away,
    };
    const key = buildMatchKey(base);
    if (seen.has(key)) {
      issues.push({
        sheet: 'PARTIDOS PENDIENTES',
        row: rowNo,
        message: `Fixture duplicado ${home} - ${away} (${date}).`,
        severity: 'warning',
      });
      continue;
    }
    seen.add(key);

    const rawStatus = str(r[7]);
    const status =
      rawStatus === 'Aplazado' || rawStatus === 'Cancelado' ? rawStatus : 'Programado';

    fixtures.push({
      id: resolveMatchId({ providerId: null, ...base }),
      providerId: null,
      leagueId: league.id,
      country: league.country,
      season: league.season,
      date,
      round,
      homeTeamId: buildTeamId(league.id, home),
      awayTeamId: buildTeamId(league.id, away),
      homeTeamName: home,
      awayTeamName: away,
      status,
      source: str(r[8]),
    });
  }
  return fixtures;
}

// ---------------------------------------------------------------------------
// CONFIGURACION
// ---------------------------------------------------------------------------

const PARAM_BY_LABEL: Record<string, keyof Omit<ModelParams, ModeParam>> = {
  W_BASE: 'wBase',
  W_FORM5: 'wForm5',
  W_FORM10: 'wForm10',
  W_XG: 'wXg',
  K_SHRINK: 'kShrink',
  W_H2H: 'wH2h',
  W_SOS: 'wSos',
  K_LOGISTIC: 'kLogistic',
  K_DRAWDECAY: 'kDrawDecay',
};

export function parseConfigSheet(rows: Row[], issues: ImportIssue[]): ModelParams {
  const params: ModelParams = { ...DEFAULT_MODEL_PARAMS };
  for (const r of rows) {
    const label = str(r?.[0]);
    if (!label) continue;
    const key = PARAM_BY_LABEL[label.toUpperCase()];
    if (!key) continue;
    const value = num(r?.[2]);
    if (value === null) {
      issues.push({
        sheet: 'CONFIGURACION',
        row: null,
        message: `${label} no tiene valor numérico; se usa el valor por defecto (${params[key]}).`,
        severity: 'warning',
      });
      continue;
    }
    params[key] = value;
  }
  return params;
}

// ---------------------------------------------------------------------------
// Punto de entrada
// ---------------------------------------------------------------------------

const SHEETS = {
  leagues: 'LIGAS',
  matches: 'PARTIDOS',
  fixtures: 'PARTIDOS PENDIENTES',
  config: 'CONFIGURACION',
} as const;

export function importWorkbook(wb: XLSX.WorkBook): ImportResult {
  const issues: ImportIssue[] = [];

  const leagueRows = sheetRows(wb, SHEETS.leagues);
  if (!leagueRows) {
    return {
      leagues: [],
      matches: [],
      fixtures: [],
      params: DEFAULT_MODEL_PARAMS,
      issues: [
        {
          sheet: SHEETS.leagues,
          row: null,
          message: 'El archivo no contiene la hoja LIGAS. ¿Es el libro correcto?',
          severity: 'error',
        },
      ],
      stats: { leagues: 0, matches: 0, fixtures: 0, duplicatesSkipped: 0, teams: 0 },
    };
  }

  const leagues = parseLeaguesSheet(leagueRows, issues);

  const matchRows = sheetRows(wb, SHEETS.matches);
  if (!matchRows) {
    issues.push({
      sheet: SHEETS.matches,
      row: null,
      message: 'No se encontró la hoja PARTIDOS.',
      severity: 'error',
    });
  }
  const { matches, duplicates } = matchRows
    ? parseMatchesSheet(matchRows, leagues, issues)
    : { matches: [] as Match[], duplicates: 0 };

  const fixtureRows = sheetRows(wb, SHEETS.fixtures);
  const fixtures = fixtureRows ? parseFixturesSheet(fixtureRows, leagues, issues) : [];

  const configRows = sheetRows(wb, SHEETS.config);
  const params = configRows ? parseConfigSheet(configRows, issues) : { ...DEFAULT_MODEL_PARAMS };

  const teams = new Set<string>();
  for (const m of matches) {
    teams.add(m.homeTeamId);
    teams.add(m.awayTeamId);
  }

  if (fixtures.length === 0) {
    issues.push({
      sheet: SHEETS.fixtures,
      row: null,
      message:
        'La hoja PARTIDOS PENDIENTES está vacía: no habrá proyecciones de partido ni puntos ' +
        'proyectados restantes hasta que cargues fixtures (a mano o con "Actualizar datos").',
      severity: 'warning',
    });
  }

  return {
    leagues,
    matches,
    fixtures,
    params,
    issues,
    stats: {
      leagues: leagues.length,
      matches: matches.length,
      fixtures: fixtures.length,
      duplicatesSkipped: duplicates,
      teams: teams.size,
    },
  };
}

export async function importExcelFile(file: File | ArrayBuffer): Promise<ImportResult> {
  const buffer = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
  return importWorkbook(XLSX.read(buffer, { type: 'array', cellDates: true }));
}

export { HEADER_ROW };
