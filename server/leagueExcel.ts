/**
 * Excel por liga en `data/ligas/`, con la estructura estándar del libro: hojas LIGAS, PARTIDOS y
 * PARTIDOS PENDIENTES, cabecera en la fila 4 y los mismos nombres de columna.
 *
 * Si el archivo ya existe, se localizan sus hojas y columnas por el NOMBRE de la cabecera, así
 * que un orden de columnas distinto no desalinea nada. Nunca borra histórico: una fila de
 * PARTIDOS que ya estaba y no llega en la actualización se conserva. Las demás hojas del archivo
 * se conservan (sin formato: esta librería no lo reescribe).
 *
 * El libro combinado `Analisis_Futbol_2026-27_2.xlsx` NO se toca: tiene 91.908 fórmulas y
 * 203.872 celdas con formato que se perderían.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as XLSX from 'xlsx';

export type Cell = string | number | null;

export const LEAGUE_HEADERS = [
  'Pais', 'Liga', 'Confederacion', 'Temporada', 'Formato de calendario', 'N Equipos',
  'Jornadas liga regular', 'Inicio aprox. 2026/27', 'Fuente', 'Confiabilidad / Notas',
];

export const PLAYED_HEADERS = [
  'Liga', 'Pais', 'Temporada', 'Fecha', 'Jornada', 'Equipo Local', 'Equipo Visitante',
  'Goles Local', 'Goles Visitante', 'Goles Totales', 'Goles 1T Local', 'Goles 1T Visitante',
  'Goles 1T Total', 'Goles 2T Total', 'Tiros Local', 'Tiros Visitante', 'Tiros Totales',
  'Tiros a Puerta Local', 'Tiros a Puerta Visitante', 'Tiros a Puerta Totales', 'Posesion Local',
  'Posesion Visitante', 'Corners Local', 'Corners Visitante', 'Corners Totales', 'Amarillas Local',
  'Amarillas Visitante', 'Amarillas Totales', 'Rojas Local', 'Rojas Visitante', 'Rojas Totales',
  'Faltas Local', 'Faltas Visitante', 'Faltas Totales', 'Fuera de Juego Local',
  'Fuera de Juego Visitante', 'xG Local', 'xG Visitante', 'BTTS', 'Over 1.5', 'Over 2.5',
  'Over 3.5', 'Clean Sheet Local', 'Clean Sheet Visitante', 'Resultado HT', 'Resultado FT',
  'Marcador', 'Fuente', 'Fecha Actualizacion', 'PPG Rival del Local', 'PPG Rival del Visitante',
];

export const PENDING_HEADERS = [
  'Liga', 'Pais', 'Temporada', 'Fecha', 'Jornada', 'Equipo Local', 'Equipo Visitante', 'Estado', 'Fuente',
];

export interface LeagueExcelPayload {
  /** Nombre del archivo, p. ej. `Premier_League.xlsx`. */
  file: string;
  /** Fila de LIGAS, en el orden de `LEAGUE_HEADERS`. */
  league: Cell[];
  /** Filas de PARTIDOS en el orden de `PLAYED_HEADERS`. Fechas como `YYYY-MM-DD`. */
  played: Cell[][];
  pending: Cell[][];
}

export interface LeagueExcelResult {
  path: string;
  created: boolean;
  playedRows: number;
  /** Filas que ya estaban en el archivo y se conservaron aunque no llegaran ahora. */
  preserved: number;
}

const P_FECHA = PLAYED_HEADERS.indexOf('Fecha');
const P_JORNADA = PLAYED_HEADERS.indexOf('Jornada');
const P_LOCAL = PLAYED_HEADERS.indexOf('Equipo Local');
const P_VISITANTE = PLAYED_HEADERS.indexOf('Equipo Visitante');
const P_ACTUALIZADA = PLAYED_HEADERS.indexOf('Fecha Actualizacion');
const P_POSESION = [PLAYED_HEADERS.indexOf('Posesion Local'), PLAYED_HEADERS.indexOf('Posesion Visitante')];

/** Solo letras, números, guion y guion bajo: el nombre nunca puede salir de `data/ligas/`. */
export function isSafeFileName(file: string): boolean {
  return /^[A-Za-z0-9_-]+\.xlsx$/.test(file);
}

const DIA = 86_400_000;
const EPOCA_EXCEL = Date.UTC(1899, 11, 30);

function isoASerie(v: Cell): Cell {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(v)) return v;
  const [y, m, d] = v.slice(0, 10).split('-').map(Number);
  return (Date.UTC(y, m - 1, d) - EPOCA_EXCEL) / DIA;
}

const normalizar = (v: unknown) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/** Los dos equipos sin importar quién es local: otra fuente puede tener la localía invertida. */
const pareja = (fila: Cell[]) => [normalizar(fila[P_LOCAL]), normalizar(fila[P_VISITANTE])].sort().join('|');

/**
 * Una fila del archivo es el mismo partido que una que llega si enfrenta a los mismos equipos con
 * menos de una semana de diferencia (la fecha oficial puede corregir la guardada), o en la misma
 * jornada con menos de dos meses (un aplazado). En una liga, dos partidos reales entre los mismos
 * equipos son de jornadas distintas.
 */
function llegaYa(nuevas: Cell[][]): (fila: Cell[]) => boolean {
  const porPareja = new Map<string, Cell[][]>();
  for (const f of nuevas) porPareja.set(pareja(f), [...(porPareja.get(pareja(f)) ?? []), f]);
  return (fila) =>
    (porPareja.get(pareja(fila)) ?? []).some((f) => {
      const dias = Math.abs(Number(f[P_FECHA]) - Number(fila[P_FECHA]));
      return dias <= 7 || (f[P_JORNADA] === fila[P_JORNADA] && dias <= 60);
    });
}

/**
 * Filas de una hoja existente, reordenadas a `cabeceras`. La fila de cabecera se busca por sus
 * dos primeros nombres; una columna que el archivo no tenga queda vacía.
 */
function leer(ws: XLSX.WorkSheet | undefined, cabeceras: string[]): Cell[][] {
  if (!ws) return [];
  const filas = XLSX.utils.sheet_to_json<Cell[]>(ws, { header: 1, raw: true, defval: null });
  const i = filas.findIndex((f) => cabeceras.slice(0, 2).every((h) => f.includes(h)));
  if (i < 0) return [];
  const pos = cabeceras.map((h) => filas[i].indexOf(h));
  return filas
    .slice(i + 1)
    .filter((f) => f.some((c) => c !== null && c !== ''))
    .map((f) => pos.map((p) => (p < 0 ? null : (f[p] ?? null))));
}

function hoja(titulo: string, subtitulo: string, cabeceras: string[], filas: Cell[][]): XLSX.WorkSheet {
  return XLSX.utils.aoa_to_sheet([[titulo], [subtitulo], [], cabeceras, ...filas]);
}

function formato(ws: XLSX.WorkSheet, fila: number, col: number, z: string) {
  const celda = ws[XLSX.utils.encode_cell({ r: fila, c: col })];
  if (celda && celda.t === 'n') celda.z = z;
}

function poner(wb: XLSX.WorkBook, nombre: string, ws: XLSX.WorkSheet) {
  if (wb.SheetNames.includes(nombre)) wb.Sheets[nombre] = ws;
  else XLSX.utils.book_append_sheet(wb, ws, nombre);
}

export function writeLeagueExcel(dir: string, payload: LeagueExcelPayload): LeagueExcelResult {
  if (!isSafeFileName(payload.file)) throw new Error(`Nombre de archivo no permitido: ${payload.file}`);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, payload.file);
  const created = !existsSync(path);
  const wb = created ? XLSX.utils.book_new() : XLSX.read(readFileSync(path), { type: 'buffer' });
  const liga = payload.league[LEAGUE_HEADERS.indexOf('Liga')];

  const nuevas = payload.played.map((f) =>
    f.map((c, i) => (i === P_FECHA || i === P_ACTUALIZADA ? isoASerie(c) : c)),
  );
  const yaLlega = llegaYa(nuevas);
  // Histórico: lo que ya estaba en el archivo y no llega ahora se queda.
  const conservadas = leer(wb.Sheets.PARTIDOS, PLAYED_HEADERS).filter((f) => !yaLlega(f));
  const partidos = [...nuevas, ...conservadas].sort(
    (a, b) =>
      Number(a[P_FECHA] ?? 0) - Number(b[P_FECHA] ?? 0) || Number(a[P_JORNADA] ?? 0) - Number(b[P_JORNADA] ?? 0),
  );

  // Los pendientes de esta liga se sustituyen (el calendario cambia); los de otras, si el archivo
  // tuviera, se quedan.
  const pendientes = [
    ...leer(wb.Sheets['PARTIDOS PENDIENTES'], PENDING_HEADERS).filter((f) => f[0] !== liga),
    ...payload.pending.map((f) => f.map((c, i) => (i === 3 ? isoASerie(c) : c))),
  ];
  const ligas = [...leer(wb.Sheets.LIGAS, LEAGUE_HEADERS).filter((f) => f[1] !== liga), payload.league];

  const wsPartidos = hoja(
    'PARTIDOS DISPUTADOS',
    'Registro de resultados reales. Lo mantiene «Actualizar partidos»: cada fila conserva su fuente.',
    PLAYED_HEADERS,
    partidos,
  );
  for (let r = 4; r < 4 + partidos.length; r++) {
    formato(wsPartidos, r, P_FECHA, 'dd/mm/yyyy');
    formato(wsPartidos, r, P_ACTUALIZADA, 'dd/mm/yyyy');
    formato(wsPartidos, r, P_JORNADA, '"J"0');
    for (const c of P_POSESION) formato(wsPartidos, r, c, '0%');
  }
  const wsPendientes = hoja(
    'PARTIDOS PENDIENTES (CALENDARIO)',
    'Próximos partidos según la fuente consultada en la última actualización.',
    PENDING_HEADERS,
    pendientes,
  );
  for (let r = 4; r < 4 + pendientes.length; r++) {
    formato(wsPendientes, r, 3, 'dd/mm/yyyy');
    formato(wsPendientes, r, 4, '"J"0');
  }

  poner(wb, 'LIGAS', hoja('LIGAS CUBIERTAS POR LA BASE DE DATOS', 'Competición de este archivo.', LEAGUE_HEADERS, ligas));
  poner(wb, 'PARTIDOS', wsPartidos);
  poner(wb, 'PARTIDOS PENDIENTES', wsPendientes);
  writeFileSync(path, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));

  return { path, created, playedRows: partidos.length, preserved: conservadas.length };
}
