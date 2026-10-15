import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { PLAYED_HEADERS, writeLeagueExcel, type Cell } from './leagueExcel.ts';

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

const fila = (fecha: string, local: string, visitante: string, gl: number, gv: number): Cell[] => {
  const f: Cell[] = PLAYED_HEADERS.map(() => null);
  Object.assign(f, { 0: 'LaLiga', 3: fecha, 4: 1, 5: local, 6: visitante, 7: gl, 8: gv });
  return f;
};
const liga: Cell[] = ['Espana', 'LaLiga', 'UEFA', '2026/27', null, 20, '38', null, null, null];

describe('Excel por liga', () => {
  it('crea el archivo con la estructura estándar y nunca pierde histórico', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ligas-'));
    dirs.push(dir);

    const r1 = writeLeagueExcel(dir, {
      file: 'LaLiga.xlsx',
      league: liga,
      played: [fila('2026-08-16', 'Real Betis', 'Girona FC', 2, 2), fila('2026-08-15', 'Sevilla FC', 'Getafe CF', 1, 0)],
      pending: [],
    });
    expect(r1).toMatchObject({ created: true, playedRows: 2, preserved: 0 });

    // Segunda escritura sin el partido del Betis y con otro marcador del Sevilla.
    const r2 = writeLeagueExcel(dir, {
      file: 'LaLiga.xlsx',
      league: liga,
      played: [fila('2026-08-15', 'Sevilla FC', 'Getafe CF', 3, 0)],
      pending: [],
    });
    expect(r2).toMatchObject({ created: false, playedRows: 2, preserved: 1 });

    const wb = XLSX.read(readFileSync(r2.path));
    expect(wb.SheetNames).toEqual(['LIGAS', 'PARTIDOS', 'PARTIDOS PENDIENTES']);
    const ws = wb.Sheets.PARTIDOS;
    expect(ws.A4.v).toBe('Liga');
    // Ordenado por fecha, con el formato del libro y el dato nuevo, sin duplicar.
    expect([ws.D5.w, ws.F5.v, ws.H5.v, ws.E5.w]).toEqual(['15/08/2026', 'Sevilla FC', 3, 'J1']);
    expect([ws.D6.w, ws.F6.v]).toEqual(['16/08/2026', 'Real Betis']);
    expect(ws.A7).toBeUndefined();

    // Tercera: la fuente corrige la fecha un día y trae la localía invertida. Es el mismo partido.
    const r3 = writeLeagueExcel(dir, {
      file: 'LaLiga.xlsx',
      league: liga,
      played: [fila('2026-08-17', 'Girona FC', 'Real Betis', 2, 2)],
      pending: [],
    });
    expect(r3).toMatchObject({ playedRows: 2, preserved: 1 });

    // Cuarta: un aplazado llega casi un mes después, en la misma jornada. Tampoco se duplica.
    const r4 = writeLeagueExcel(dir, {
      file: 'LaLiga.xlsx',
      league: liga,
      played: [fila('2026-09-10', 'Sevilla FC', 'Getafe CF', 3, 0)],
      pending: [],
    });
    expect(r4).toMatchObject({ playedRows: 2, preserved: 1 });
  });

  it('no escribe fuera de data/ligas', () => {
    expect(() =>
      writeLeagueExcel(tmpdir(), { file: '../fuera.xlsx', league: liga, played: [], pending: [] }),
    ).toThrow('no permitido');
  });
});
