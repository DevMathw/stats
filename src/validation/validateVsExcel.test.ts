/**
 * FASE 4 — Validación contra el Excel. MODEL_MAPPING.md §19.
 *
 * Importa LIGAS/PARTIDOS/CONFIGURACION del libro real, recalcula todo con el motor de la
 * app y compara contra los valores YA CACHEADOS en las hojas derivadas del propio Excel
 * (EQUIPOS, ESTADISTICAS HOME/AWAY, FORMA, TABLA DE POSICIONES).
 *
 * `npm run validate` ejecuta solo este archivo e imprime el informe de diferencias.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import { importWorkbook } from '../services/import/excelImport';
import { recalculateAll } from '../domain/engine';
import { buildTeamId } from '../domain/models/ids';
import type { StatAggregate } from '../types';

const WORKBOOK = resolve(process.cwd(), 'data/Analisis_Futbol_2026-27_2.xlsx');

const INT_TOL = 1e-9;
const AVG_TOL = 1e-6;

interface Diff {
  league: string;
  team: string;
  field: string;
  excel: unknown;
  app: unknown;
}

function loadWorkbook(): XLSX.WorkBook {
  return XLSX.read(readFileSync(WORKBOOK), { type: 'buffer', cellDates: true });
}

function rowsOf(wb: XLSX.WorkBook, sheet: string): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheet], {
    header: 1,
    raw: true,
    defval: null,
    blankrows: true,
  });
}

/** Celda del Excel: número, o `null` si está vacía o dice "N/A". */
function cell(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === '' || /^n\/?a$/i.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function near(a: number | null, b: number | null, tol: number): boolean {
  if (a === null || b === null) return a === b;
  return Math.abs(a - b) <= tol;
}

describe('validación contra Analisis_Futbol_2026-27_2.xlsx', () => {
  const wb = loadWorkbook();
  const imported = importWorkbook(wb);
  const derived = recalculateAll({
    leagues: imported.leagues,
    matches: imported.matches,
    fixtures: imported.fixtures,
    // Celda a celda con el libro: sus promedios dividen entre PJ (DIFF-07) y su forma es una ventana de
    // números de jornada, no los últimos partidos por fecha (DIFF-12).
    params: { ...imported.params, statAverageMode: 'excel', formWindowMode: 'excel' },
  });

  it('importa el volumen de datos documentado en el libro', () => {
    expect(imported.stats.matches).toBe(998);
    expect(imported.stats.teams).toBe(308);
    expect(imported.leagues).toHaveLength(19);
    expect(imported.issues.filter((i) => i.severity === 'error')).toHaveLength(0);
    expect(imported.params.wBase).toBeCloseTo(0.45, 10);
    expect(imported.params.kShrink).toBe(5);
  });

  it('EQUIPOS: PJ, PG, PE, PP, Pts, GF, GC, DG, PPG, promedios, %, posición y SoS', () => {
    const rows = rowsOf(wb, 'EQUIPOS');
    const diffs: Diff[] = [];
    let checked = 0;

    for (let i = 4; i < rows.length; i++) {
      const r = rows[i] ?? [];
      const league = r[0] as string | null;
      const team = r[2] as string | null;
      if (!league || !team) continue;

      const stats = derived.statsByTeamId.get(buildTeamId(league, team));
      if (!stats) {
        diffs.push({ league, team, field: 'equipo', excel: 'presente', app: 'ausente' });
        continue;
      }
      checked++;

      const push = (field: string, excel: number | null, app: number | null, tol: number) => {
        if (!near(excel, app, tol)) diffs.push({ league, team, field, excel, app });
      };

      push('PJ', cell(r[4]), stats.played, INT_TOL);
      push('PG', cell(r[5]), stats.won, INT_TOL);
      push('PE', cell(r[6]), stats.drawn, INT_TOL);
      push('PP', cell(r[7]), stats.lost, INT_TOL);
      push('Pts', cell(r[8]), stats.points, INT_TOL);
      push('GF', cell(r[9]), stats.goalsFor, INT_TOL);
      push('GC', cell(r[10]), stats.goalsAgainst, INT_TOL);
      push('DG', cell(r[11]), stats.goalDiff, INT_TOL);
      push('Prom GF', cell(r[12]), stats.avgGoalsFor, AVG_TOL);
      push('Prom GC', cell(r[13]), stats.avgGoalsAgainst, AVG_TOL);
      push('Prom Goles Totales', cell(r[14]), stats.avgGoalsTotal, AVG_TOL);

      // Sumas de corners/tarjetas/tiros/TP/xG: el SUMIFS del Excel devuelve 0 cuando no hay
      // dato, así que se comparan las sumas (siempre numéricas en ambos lados).
      const blocks: [string, number, StatAggregate][] = [
        ['Corners', 15, stats.corners],
        ['Tarjetas', 21, stats.cards],
        ['Tiros', 27, stats.shots],
        ['Tiros a Puerta', 33, stats.shotsOnTarget],
        ['xG', 39, stats.xg],
      ];
      for (const [name, col, agg] of blocks) {
        push(`${name} Favor`, cell(r[col]), agg.for, AVG_TOL);
        push(`${name} Contra`, cell(r[col + 1]), agg.against, AVG_TOL);
        push(`${name} Total`, cell(r[col + 2]), agg.total, AVG_TOL);
        // El promedio solo se compara cuando el Excel tiene muestra real: si la métrica
        // no está reportada, Excel publica 0 y la app publica null (DIFF-01).
        if (agg.sample > 0) {
          push(`Prom ${name} Favor`, cell(r[col + 3]), agg.avgFor, AVG_TOL);
          push(`Prom ${name} Contra`, cell(r[col + 4]), agg.avgAgainst, AVG_TOL);
        }
      }

      push('BTTS %', cell(r[45]), stats.bttsPct, AVG_TOL);
      push('Over 1.5 %', cell(r[46]), stats.over15Pct, AVG_TOL);
      push('Over 2.5 %', cell(r[47]), stats.over25Pct, AVG_TOL);
      push('Over 3.5 %', cell(r[48]), stats.over35Pct, AVG_TOL);
      push('Under 2.5 %', cell(r[49]), stats.under25Pct, AVG_TOL);
      push('Porterias a Cero %', cell(r[50]), stats.cleanSheetPct, AVG_TOL);
      push('Prom Goles Local', cell(r[51]), stats.avgGoalsAsHome, AVG_TOL);
      push('Prom Goles Visitante', cell(r[52]), stats.avgGoalsAsAway, AVG_TOL);
      push('PPG', cell(r[53]), stats.ppg, AVG_TOL);
      push('Posicion', cell(r[54]), stats.position, INT_TOL);
      push('Forma Pts Ult5', cell(r[56]), stats.form.last5.points, INT_TOL);
      push('Forma Pts Ult10', cell(r[57]), stats.form.last10.points, INT_TOL);
      push('SoS', cell(r[58]), stats.sos, AVG_TOL);
    }

    expect(checked).toBe(308);
    if (diffs.length) console.table(diffs.slice(0, 40));
    expect(diffs).toEqual([]);
  });

  it.each([
    ['ESTADISTICAS HOME', 'home'] as const,
    ['ESTADISTICAS AWAY', 'away'] as const,
  ])('%s: PJ, PG, PE, PP, Pts, GF, GC y promedios', (sheet, side) => {
    const rows = rowsOf(wb, sheet);
    const map = side === 'home' ? derived.homeStatsByTeamId : derived.awayStatsByTeamId;
    const diffs: Diff[] = [];
    let checked = 0;

    for (let i = 4; i < rows.length; i++) {
      const r = rows[i] ?? [];
      const league = r[0] as string | null;
      const team = r[1] as string | null;
      if (!league || !team) continue;
      const s = map.get(buildTeamId(league, team));
      if (!s) {
        diffs.push({ league, team, field: 'equipo', excel: 'presente', app: 'ausente' });
        continue;
      }
      checked++;
      const push = (field: string, excel: number | null, app: number | null, tol: number) => {
        if (!near(excel, app, tol)) diffs.push({ league, team, field, excel, app });
      };
      push('PJ', cell(r[3]), s.played, INT_TOL);
      push('PG', cell(r[4]), s.won, INT_TOL);
      push('PE', cell(r[5]), s.drawn, INT_TOL);
      push('PP', cell(r[6]), s.lost, INT_TOL);
      push('Pts', cell(r[7]), s.points, INT_TOL);
      push('GF', cell(r[8]), s.goalsFor, INT_TOL);
      push('GC', cell(r[9]), s.goalsAgainst, INT_TOL);
      push('DG', cell(r[10]), s.goalDiff, INT_TOL);
      push('Prom GF', cell(r[11]), s.avgGoalsFor, AVG_TOL);
      push('Prom GC', cell(r[12]), s.avgGoalsAgainst, AVG_TOL);
      push('Prom Goles Totales', cell(r[13]), s.avgGoalsTotal, AVG_TOL);
      push('Corners Favor', cell(r[14]), s.corners.for, AVG_TOL);
      push('Corners Contra', cell(r[15]), s.corners.against, AVG_TOL);
      push('Tarjetas Favor', cell(r[20]), s.cards.for, AVG_TOL);
      push('Tiros Favor', cell(r[26]), s.shots.for, AVG_TOL);
      push('Tiros a Puerta Favor', cell(r[32]), s.shotsOnTarget.for, AVG_TOL);
      push('xG Favor', cell(r[38]), s.xg.for, AVG_TOL);
      push('BTTS %', cell(r[44]), s.bttsPct, AVG_TOL);
      push('Porterias a Cero %', cell(r[48]), s.cleanSheetPct, AVG_TOL);
    }

    expect(checked).toBe(308);
    if (diffs.length) console.table(diffs.slice(0, 40));
    expect(diffs).toEqual([]);
  });

  it('FORMA: última jornada y ventanas de últimos 5 / últimos 10', () => {
    const rows = rowsOf(wb, 'FORMA');
    const diffs: Diff[] = [];
    let checked = 0;

    for (let i = 4; i < rows.length; i++) {
      const r = rows[i] ?? [];
      const league = r[0] as string | null;
      const team = r[1] as string | null;
      if (!league || !team) continue;
      const form = derived.formByTeamId.get(buildTeamId(league, team));
      if (!form) {
        diffs.push({ league, team, field: 'equipo', excel: 'presente', app: 'ausente' });
        continue;
      }
      checked++;
      const push = (field: string, excel: number | null, app: number | null, tol: number) => {
        if (!near(excel, app, tol)) diffs.push({ league, team, field, excel, app });
      };
      push('Ultima Jornada', cell(r[3]), form.lastRound, INT_TOL);
      push('PJ Ult5', cell(r[4]), form.last5.played, INT_TOL);
      push('V Ult5', cell(r[5]), form.last5.won, INT_TOL);
      push('E Ult5', cell(r[6]), form.last5.drawn, INT_TOL);
      push('D Ult5', cell(r[7]), form.last5.lost, INT_TOL);
      push('Pts Ult5', cell(r[8]), form.last5.points, INT_TOL);
      push('GF Ult5', cell(r[9]), form.last5.goalsFor, INT_TOL);
      push('GC Ult5', cell(r[10]), form.last5.goalsAgainst, INT_TOL);
      push('Prom GF Ult5', cell(r[11]), form.last5.avgGoalsFor, AVG_TOL);
      push('Prom GC Ult5', cell(r[12]), form.last5.avgGoalsAgainst, AVG_TOL);
      push('PJ Ult10', cell(r[13]), form.last10.played, INT_TOL);
      push('V Ult10', cell(r[14]), form.last10.won, INT_TOL);
      push('E Ult10', cell(r[15]), form.last10.drawn, INT_TOL);
      push('D Ult10', cell(r[16]), form.last10.lost, INT_TOL);
      push('Pts Ult10', cell(r[17]), form.last10.points, INT_TOL);
      push('GF Ult10', cell(r[18]), form.last10.goalsFor, INT_TOL);
      push('GC Ult10', cell(r[19]), form.last10.goalsAgainst, INT_TOL);
      push('Prom GF Ult10', cell(r[20]), form.last10.avgGoalsFor, AVG_TOL);
      push('Prom GC Ult10', cell(r[21]), form.last10.avgGoalsAgainst, AVG_TOL);
    }

    expect(checked).toBe(308);
    if (diffs.length) console.table(diffs.slice(0, 40));
    expect(diffs).toEqual([]);
  });

  it('TABLA DE POSICIONES: orden y filas por liga', () => {
    const rows = rowsOf(wb, 'TABLA DE POSICIONES');
    const diffs: Diff[] = [];
    let checked = 0;

    // La hoja solo escribe el nombre de la liga en la primera fila de cada bloque.
    let currentLeague: string | null = null;

    for (let i = 4; i < rows.length; i++) {
      const r = rows[i] ?? [];
      if (r[0]) currentLeague = r[0] as string;
      const league = currentLeague;
      const pos = cell(r[1]);
      const team = r[2] as string | null;
      if (!league || pos === null || !team) continue;
      const table = derived.standingsByLeague.get(league);
      const row = table?.[pos - 1];
      if (!row) {
        diffs.push({ league, team, field: `Pos ${pos}`, excel: team, app: 'ausente' });
        continue;
      }
      checked++;
      if (row.teamName !== team) {
        diffs.push({ league, team, field: `Pos ${pos}`, excel: team, app: row.teamName });
        continue;
      }
      const push = (field: string, excel: number | null, app: number | null, tol: number) => {
        if (!near(excel, app, tol)) diffs.push({ league, team, field, excel, app });
      };
      push('PJ', cell(r[3]), row.played, INT_TOL);
      push('PG', cell(r[4]), row.won, INT_TOL);
      push('PE', cell(r[5]), row.drawn, INT_TOL);
      push('PP', cell(r[6]), row.lost, INT_TOL);
      push('GF', cell(r[7]), row.goalsFor, INT_TOL);
      push('GC', cell(r[8]), row.goalsAgainst, INT_TOL);
      push('DG', cell(r[9]), row.goalDiff, INT_TOL);
      push('Pts', cell(r[10]), row.points, INT_TOL);
      push('PPG', cell(r[11]), row.ppg, AVG_TOL);
    }

    expect(checked).toBe(308);
    if (diffs.length) console.table(diffs.slice(0, 40));
    expect(diffs).toEqual([]);
  });
});
