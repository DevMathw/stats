/**
 * Identidad global contra el libro REAL: los 308 equipos de las 17 ligas del Excel.
 *
 * Tres garantías: todos quedan identificados, dos equipos distintos de una liga nunca
 * comparten referencia, y ninguna clasificación cambia al añadir la identidad.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import { importWorkbook } from '../../services/import/excelImport';
import { recalculateAll } from '../engine';
import { attachTeamRefs } from './teamIdentity';

const wb = XLSX.read(readFileSync(resolve(process.cwd(), 'data/Analisis_Futbol_2026-27_2.xlsx')), {
  type: 'buffer',
  cellDates: true,
});
const base = importWorkbook(wb);
const conIdentidad = attachTeamRefs({
  leagues: base.leagues,
  matches: base.matches,
  fixtures: base.fixtures,
});

describe('identidad global sobre el libro real', () => {
  it('identifica los 308 equipos sin dejar ninguno dudoso', () => {
    expect(conIdentidad.issues).toEqual([]);
    const pares = new Set(
      conIdentidad.matches.flatMap((m) => [
        `${m.leagueId}|${m.homeTeamName}`,
        `${m.leagueId}|${m.awayTeamName}`,
      ]),
    );
    expect(pares.size).toBe(308);
    expect(conIdentidad.matches.every((m) => m.homeTeamRef && m.awayTeamRef)).toBe(true);
  });

  it('nunca da la misma referencia a dos equipos distintos de una liga', () => {
    // Si dos nombres de la misma liga acabaran con la misma referencia, se habrían fundido
    // dos clubes en uno.
    const nombrePorRef = new Map<string, string>();
    for (const m of conIdentidad.matches) {
      for (const [nombre, ref] of [
        [m.homeTeamName, m.homeTeamRef],
        [m.awayTeamName, m.awayTeamRef],
      ] as const) {
        const k = `${m.leagueId}|${ref}`;
        const previo = nombrePorRef.get(k);
        expect(previo === undefined || previo === nombre, `${k}: ${previo} ≠ ${nombre}`).toBe(true);
        nombrePorRef.set(k, nombre);
      }
    }
  });

  it('no cambia ninguna clasificación', () => {
    const calcular = (matches: typeof base.matches, fixtures: typeof base.fixtures) =>
      recalculateAll({ leagues: base.leagues, matches, fixtures, params: base.params });
    const antes = calcular(base.matches, base.fixtures);
    const despues = calcular(conIdentidad.matches, conIdentidad.fixtures);
    expect([...despues.standingsByLeague]).toEqual([...antes.standingsByLeague]);
  });
});
