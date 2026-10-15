/**
 * Prueba de la carga por liga contra el libro REAL.
 *
 * Corta del `Analisis_Futbol_2026-27_2.xlsx` un archivo de una sola competición — lo mismo
 * que sería un `Analisis_Futbol_2026-27_[Liga].xlsx` — y comprueba que fusionarlo completa
 * lo que falta sin duplicar nada y sin tocar las demás ligas.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import { importWorkbook } from './excelImport';
import { mergeLeagueImport } from './mergeLeague';

const WORKBOOK = resolve(process.cwd(), 'data/Analisis_Futbol_2026-27_2.xlsx');
const LIGA = 'Primera A (Liga BetPlay Dimayor)';

/** Un libro con las mismas hojas pero una sola competición, como el archivo por liga. */
function sliceLeague(wb: XLSX.WorkBook, liga: string): XLSX.WorkBook {
  const rows = (n: string) =>
    XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[n], {
      header: 1,
      raw: true,
      defval: null,
      blankrows: true,
    });

  // Las 4 primeras filas son cabecera; los datos empiezan en la 5.
  const corta = (nombre: string, col: number) => {
    const r = rows(nombre);
    return XLSX.utils.aoa_to_sheet([...r.slice(0, 4), ...r.slice(4).filter((f) => f?.[col] === liga)]);
  };

  const out = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(out, corta('LIGAS', 1), 'LIGAS');
  XLSX.utils.book_append_sheet(out, corta('PARTIDOS', 0), 'PARTIDOS');
  XLSX.utils.book_append_sheet(out, corta('PARTIDOS PENDIENTES', 0), 'PARTIDOS PENDIENTES');
  return out;
}

describe('carga del Excel de una liga (libro real)', () => {
  const wb = XLSX.read(readFileSync(WORKBOOK), { type: 'buffer', cellDates: true });
  const completo = importWorkbook(wb);
  const porLiga = importWorkbook(sliceLeague(wb, LIGA));
  const league = completo.leagues.find((l) => l.id === LIGA)!;
  const deOtras = completo.matches.filter((m) => m.leagueId !== LIGA);

  it('el corte trae solo esa competición y con partidos', () => {
    expect(porLiga.leagues).toHaveLength(1);
    expect(porLiga.leagues[0].id).toBe(LIGA);
    expect(porLiga.matches.length).toBeGreaterThan(0);
    expect(porLiga.matches.every((m) => m.leagueId === LIGA)).toBe(true);
  });

  it('sobre una base sin esa liga, la carga completa', () => {
    const r = mergeLeagueImport({
      league,
      imported: porLiga,
      existingMatches: deOtras,
      existingFixtures: [],
    });
    expect(r.error).toBeNull();
    expect(r.stats.newMatches).toBe(porLiga.matches.length);
    expect(r.matches.filter((m) => m.leagueId === LIGA)).toHaveLength(porLiga.matches.length);
    // Las demás competiciones quedan exactamente igual.
    expect(r.matches.filter((m) => m.leagueId !== LIGA)).toEqual(deOtras);
  });

  it('cargarlo dos veces no duplica ni un partido', () => {
    const primera = mergeLeagueImport({
      league,
      imported: porLiga,
      existingMatches: deOtras,
      existingFixtures: [],
    });
    const segunda = mergeLeagueImport({
      league,
      imported: porLiga,
      existingMatches: primera.matches,
      existingFixtures: primera.fixtures,
    });
    expect(segunda.stats.newMatches).toBe(0);
    expect(segunda.matches).toHaveLength(primera.matches.length);
  });

  it('completa los partidos que la base tenía a medias sin pisar lo que ya había', () => {
    // Base con la mitad de los partidos y sin marcador: el archivo debe rellenarlos.
    const mitad = porLiga.matches
      .slice(0, 10)
      .map((m) => ({ ...m, homeGoals: null, awayGoals: null, source: 'Parcial' }));

    const r = mergeLeagueImport({
      league,
      imported: porLiga,
      existingMatches: [...deOtras, ...mitad],
      existingFixtures: [],
    });

    expect(r.stats.newMatches).toBe(porLiga.matches.length - 10);
    expect(r.stats.updatedMatches).toBeGreaterThan(0);
    expect(r.matches.filter((m) => m.leagueId === LIGA)).toHaveLength(porLiga.matches.length);

    const conMarcador = porLiga.matches.filter((m) => m.homeGoals !== null);
    if (conMarcador.length > 0) {
      const rellenado = r.matches.find((m) => m.id === conMarcador[0].id);
      expect(rellenado?.homeGoals).toBe(conMarcador[0].homeGoals);
    }
  });
});
