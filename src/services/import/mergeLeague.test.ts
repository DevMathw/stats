import { describe, expect, it } from 'vitest';
import { mergeLeagueImport, pickLeagueFromFile } from './mergeLeague';
import type { Fixture, League, Match } from '../../types';
import type { ImportResult } from './excelImport';
import { DEFAULT_MODEL_PARAMS } from '../../domain/models/params';

/**
 * Lo que se prueba: que cargar el Excel de una liga complete lo que falta sin duplicar
 * filas, sin borrar datos que ya teníamos y sin tocar las demás competiciones.
 */

const liga = (id: string): League => ({
  id,
  country: 'Colombia',
  name: id,
  confederation: 'CONMEBOL',
  season: '2026',
  calendarFormat: '',
  teamCount: 20,
  regularSeasonRounds: null,
  approximateStartDate: null,
  source: null,
  reliabilityNotes: null,
});

const COL = liga('Primera A (Liga BetPlay Dimayor)');

const partido = (leagueId: string, date: string, home: string, away: string, extra: Partial<Match> = {}): Match => ({
  id: `${leagueId}|2026|${date}|${home}|${away}`,
  providerId: null,
  leagueId,
  country: 'Colombia',
  season: '2026',
  date,
  round: 8,
  homeTeamId: `${leagueId}|${home}`,
  awayTeamId: `${leagueId}|${away}`,
  homeTeamName: home,
  awayTeamName: away,
  homeGoals: 1,
  awayGoals: 0,
  homeFirstHalfGoals: null,
  awayFirstHalfGoals: null,
  shotsHome: null,
  shotsAway: null,
  shotsOnTargetHome: null,
  shotsOnTargetAway: null,
  possessionHome: null,
  cornersHome: null,
  cornersAway: null,
  yellowCardsHome: null,
  yellowCardsAway: null,
  redCardsHome: null,
  redCardsAway: null,
  foulsHome: null,
  foulsAway: null,
  offsidesHome: null,
  offsidesAway: null,
  xGHome: null,
  xGAway: null,
  source: 'Excel',
  updatedAt: null,
  statsSource: null,
  statsUpdatedAt: null,
  statsCitations: [],
  ...extra,
});

const pendiente = (leagueId: string, date: string, home: string, away: string): Fixture => ({
  id: `${leagueId}|2026|${date}|${home}|${away}`,
  providerId: null,
  leagueId,
  country: 'Colombia',
  season: '2026',
  date,
  round: 9,
  homeTeamId: `${leagueId}|${home}`,
  awayTeamId: `${leagueId}|${away}`,
  homeTeamName: home,
  awayTeamName: away,
  status: 'Programado',
  source: 'Excel',
});

const archivo = (leagues: League[], matches: Match[], fixtures: Fixture[] = []): ImportResult => ({
  leagues,
  matches,
  fixtures,
  params: DEFAULT_MODEL_PARAMS,
  issues: [],
  stats: { leagues: leagues.length, matches: matches.length, fixtures: fixtures.length, duplicatesSkipped: 0, teams: 0 },
});

describe('pickLeagueFromFile', () => {
  it('acepta un nombre abreviado que esté contenido en el de destino', () => {
    const r = pickLeagueFromFile(COL, [liga('Liga BetPlay')]);
    expect(r).toEqual({ id: 'Liga BetPlay', renamed: true });
  });

  it('RECHAZA un archivo de otra liga aunque traiga una sola', () => {
    // Soltar el archivo de Colombia en la fila de LaLiga metía 65 partidos donde no iban.
    expect(pickLeagueFromFile(liga('LaLiga'), [COL])).toBeNull();
    expect(pickLeagueFromFile(COL, [liga('LaLiga')])).toBeNull();
  });

  it('con varias, elige la que coincide exactamente', () => {
    const r = pickLeagueFromFile(COL, [liga('LaLiga'), COL]);
    expect(r?.id).toBe(COL.id);
    expect(r?.renamed).toBe(false);
  });

  it('con varias y ninguna que encaje, no elige', () => {
    expect(pickLeagueFromFile(COL, [liga('LaLiga'), liga('Serie A')])).toBeNull();
  });
});

describe('mergeLeagueImport', () => {
  it('añade los partidos que faltaban', () => {
    const r = mergeLeagueImport({
      league: COL,
      imported: archivo([COL], [partido(COL.id, '2026-02-15', 'Cali', 'Nacional')]),
      existingMatches: [],
      existingFixtures: [],
    });
    expect(r.error).toBeNull();
    expect(r.stats.newMatches).toBe(1);
    expect(r.matches).toHaveLength(1);
  });

  it('no duplica un partido que ya existe', () => {
    const ya = partido(COL.id, '2026-02-15', 'Cali', 'Nacional');
    const r = mergeLeagueImport({
      league: COL,
      imported: archivo([COL], [partido(COL.id, '2026-02-15', 'Cali', 'Nacional')]),
      existingMatches: [ya],
      existingFixtures: [],
    });
    expect(r.matches).toHaveLength(1);
    expect(r.stats.newMatches).toBe(0);
  });

  it('completa datos que faltaban sin borrar los que ya había', () => {
    // El archivo trae corners; lo que ya teníamos trae tarjetas. Deben convivir.
    const ya = partido(COL.id, '2026-02-15', 'Cali', 'Nacional', { yellowCardsHome: 4 });
    const delArchivo = partido(COL.id, '2026-02-15', 'Cali', 'Nacional', { cornersHome: 5 });
    const r = mergeLeagueImport({
      league: COL,
      imported: archivo([COL], [delArchivo]),
      existingMatches: [ya],
      existingFixtures: [],
    });
    expect(r.matches[0].cornersHome).toBe(5);
    expect(r.matches[0].yellowCardsHome).toBe(4);
    expect(r.stats.updatedMatches).toBe(1);
  });

  it('no toca los partidos de otras competiciones', () => {
    const otra = partido('LaLiga', '2026-02-15', 'Betis', 'Sevilla');
    const r = mergeLeagueImport({
      league: COL,
      imported: archivo([COL], [partido(COL.id, '2026-02-15', 'Cali', 'Nacional')]),
      existingMatches: [otra],
      existingFixtures: [],
    });
    expect(r.matches).toHaveLength(2);
    expect(r.matches.find((m) => m.leagueId === 'LaLiga')).toEqual(otra);
  });

  it('reasigna a la liga de destino cuando el archivo la llama de otra forma', () => {
    const suya = liga('Liga BetPlay');
    const r = mergeLeagueImport({
      league: COL,
      imported: archivo([suya], [partido(suya.id, '2026-02-15', 'Cali', 'Nacional')]),
      existingMatches: [],
      existingFixtures: [],
    });
    expect(r.matches[0].leagueId).toBe(COL.id);
    expect(r.matches[0].homeTeamId).toBe(`${COL.id}|Cali`);
    expect(r.stats.renamedFrom).toBe('Liga BetPlay');
  });

  // LigaPro, 17/09/2026: el Excel de SofaScore duplicó 171 partidos que ya había traído FotMob con otros nombres.
  it('no duplica el mismo partido traído de otra fuente con otro nombre de club y un día de diferencia', () => {
    const ECU = liga('LigaPro Serie A');
    const deFotmob = partido(ECU.id, '2026-02-22', 'CSD Macará', 'Leones del Norte', { providerId: 'FotMob:1', offsidesHome: 2 });
    const delArchivo = partido(ECU.id, '2026-02-23', 'Macará', 'Leones del Norte', { xGHome: 1.2 });
    // La misma jornada con cuatro días de diferencia: una fuente dejó la fecha original.
    const aplazadoFotmob = partido(ECU.id, '2026-02-20', 'Orense', 'LDU de Quito', { providerId: 'FotMob:2' });
    const aplazadoArchivo = partido(ECU.id, '2026-02-24', 'Orense SC', 'LDU Quito', { xGAway: 2.1 });
    const r = mergeLeagueImport({
      league: ECU,
      imported: archivo(
        [ECU],
        [delArchivo, aplazadoArchivo],
        [pendiente(ECU.id, '2026-02-23', 'Macará', 'Leones del Norte'), pendiente(ECU.id, '2026-09-20', 'U. Católica (ECU)', 'Aucas')],
      ),
      existingMatches: [deFotmob, aplazadoFotmob],
      existingFixtures: [pendiente(ECU.id, '2026-09-19', 'Universidad Católica', 'Aucas')],
    });
    expect(r.matches).toHaveLength(2);
    expect(r.matches[0]).toMatchObject({ homeTeamName: 'CSD Macará', offsidesHome: 2, xGHome: 1.2 });
    expect(r.matches[1]).toMatchObject({ homeTeamName: 'Orense', xGAway: 2.1 });
    expect(r.stats).toMatchObject({ newMatches: 0, updatedMatches: 2, newFixtures: 0 });
    expect(r.fixtures.map((f) => f.homeTeamName)).toEqual(['Universidad Católica']);
  });

  // LigaPro J29, 17/09/2026: FotMob publicó «Aucas - Barcelona SC» y el Excel de SofaScore, dos días antes,
  // «Barcelona SC - Aucas». Es el mismo partido con la localía invertida: sumarlo dejaba a los dos con 31 jugados.
  it('no duplica el mismo partido con la localía invertida ni le funde los datos del equipo contrario', () => {
    const ECU = liga('LigaPro Serie A');
    const deFotmob = partido(ECU.id, '2026-09-06', 'Aucas', 'Barcelona SC', { providerId: 'FotMob:3', round: 29, homeGoals: 1, awayGoals: 1, cornersHome: 10 });
    const delArchivo = partido(ECU.id, '2026-09-04', 'Barcelona SC', 'Aucas', { round: 29, homeGoals: 1, awayGoals: 1, cornersHome: 2 });
    const r = mergeLeagueImport({
      league: ECU,
      imported: archivo([ECU], [delArchivo]),
      existingMatches: [deFotmob],
      existingFixtures: [],
    });
    expect(r.matches).toHaveLength(1);
    expect(r.matches[0]).toMatchObject({ homeTeamName: 'Aucas', cornersHome: 10 });
    expect(r.stats).toMatchObject({ newMatches: 0, updatedMatches: 0, invertedMatches: 1 });
  });

  it('retira el pendiente que el archivo trae ya jugado', () => {
    const r = mergeLeagueImport({
      league: COL,
      imported: archivo([COL], [partido(COL.id, '2026-02-15', 'Cali', 'Nacional')]),
      existingMatches: [],
      existingFixtures: [pendiente(COL.id, '2026-02-15', 'Cali', 'Nacional')],
    });
    expect(r.fixtures).toHaveLength(0);
    expect(r.stats.closedFixtures).toBe(1);
  });

  it('añade los pendientes nuevos sin duplicar los que ya estaban', () => {
    const ya = pendiente(COL.id, '2026-09-12', 'Millonarios', 'Cali');
    const r = mergeLeagueImport({
      league: COL,
      imported: archivo(
        [COL],
        [],
        [ya, pendiente(COL.id, '2026-09-13', 'Tolima', 'Pereira')],
      ),
      existingMatches: [],
      existingFixtures: [ya],
    });
    expect(r.fixtures).toHaveLength(2);
    expect(r.stats.newFixtures).toBe(1);
  });

  it('avisa en vez de fallar si el archivo no trae esa liga', () => {
    const r = mergeLeagueImport({
      league: COL,
      imported: archivo([liga('LaLiga'), liga('Serie A')], []),
      existingMatches: [],
      existingFixtures: [],
    });
    expect(r.error).toContain('no es');
    expect(r.matches).toHaveLength(0);
  });

  it('no escribe nada al soltar el archivo en la fila equivocada', () => {
    const ES = liga('LaLiga');
    const r = mergeLeagueImport({
      league: ES,
      imported: archivo([COL], [partido(COL.id, '2026-02-15', 'Cali', 'Nacional')]),
      existingMatches: [],
      existingFixtures: [],
    });
    expect(r.error).toContain('Primera A');
    expect(r.matches).toHaveLength(0);
    expect(r.stats.newMatches).toBe(0);
  });

  /*
   * La carga de un historico reetiqueta las filas con la competicion de destino ANTES de fusionar
   * (`prepararHistorico`), asi que aqui llegan ya con el id de destino y no con el del archivo. Mientras
   * los dos nombres coincidieron no se noto; con un libro que llama «Superliga Dinamarca» a la que la app
   * llama «Superliga», el filtro tiraba los 192 partidos y la pantalla decia que el archivo no traia
   * ninguno.
   */
  it('acepta filas ya reetiquetadas cuando el archivo llama distinto a la competicion', () => {
    const DK: League = { ...liga('Superliga'), country: 'Dinamarca', name: 'Superliga' };
    const enElArchivo: League = { ...liga('Superliga Dinamarca'), country: 'Dinamarca', name: 'Superliga Dinamarca' };
    const r = mergeLeagueImport({
      league: DK,
      // Filas con el id de DESTINO, hoja LIGAS con el del ARCHIVO: justo lo que produce un historico.
      imported: archivo([enElArchivo], [partido(DK.id, '2025-07-18', 'Viborg FF', 'FC Kobenhavn')]),
      existingMatches: [],
      existingFixtures: [],
    });
    expect(r.error ?? null).toBeNull();
    expect(r.matches).toHaveLength(1);
    expect(r.matches[0].leagueId).toBe('Superliga');
    expect(r.stats.newMatches).toBe(1);
  });

  /*
   * Los nombres no se contienen por ningún lado: el libro dice «Primera División Argentina» y la app
   * «Primera Division (Liga Profesional)». Los une que ESPN llame `arg.1` a las dos.
   */
  it('reconoce la competición aunque el archivo le dé otro nombre entero', () => {
    const ARG: League = { ...liga('Primera Division (Liga Profesional)'), country: 'Argentina', name: 'Primera Division (Liga Profesional)' };
    const enElArchivo: League = { ...liga('Primera División Argentina'), country: 'Argentina', name: 'Primera División Argentina' };
    const r = mergeLeagueImport({
      league: ARG,
      imported: archivo([enElArchivo], [partido(enElArchivo.id, '2026-02-15', 'Boca Juniors', 'River Plate')]),
      existingMatches: [],
      existingFixtures: [],
    });
    expect(r.error ?? null).toBeNull();
    expect(r.matches).toHaveLength(1);
    expect(r.matches[0].leagueId).toBe('Primera Division (Liga Profesional)');
    expect(r.stats.renamedFrom).toBe('Primera División Argentina');
  });

  it('un nombre contenido en otro ya no cuela el archivo en la liga equivocada', () => {
    // «Bundesliga Austria» CONTIENE a «Bundesliga»: con solo el nombre, 192 partidos austriacos entraban
    // en la liga alemana. Son `aut.1` y `ger.1`.
    const ALEMANIA: League = { ...liga('Bundesliga'), country: 'Alemania', name: 'Bundesliga' };
    const austriaco: League = { ...liga('Bundesliga Austria'), country: 'Austria', name: 'Bundesliga Austria' };
    const r = mergeLeagueImport({
      league: ALEMANIA,
      imported: archivo([austriaco], [partido(austriaco.id, '2026-02-15', 'Salzburg', 'Rapid Wien')]),
      existingMatches: [],
      existingFixtures: [],
    });
    expect(r.error).toContain('no es de');
    expect(r.matches).toHaveLength(0);
  });

  it('un nombre de liga conocido manda sobre el país del archivo', () => {
    // Archivo marcado como argentino pero que dice ser LaLiga: sigue sin entrar en la liga argentina.
    const ARG: League = { ...liga('Primera Division (Liga Profesional)'), country: 'Argentina', name: 'Primera Division (Liga Profesional)' };
    const confundido: League = { ...liga('LaLiga'), country: 'Argentina', name: 'LaLiga' };
    const r = mergeLeagueImport({
      league: ARG,
      imported: archivo([confundido], [partido(confundido.id, '2026-02-15', 'Cali', 'Nacional')]),
      existingMatches: [],
      existingFixtures: [],
    });
    expect(r.error).toContain('no es de');
    expect(r.matches).toHaveLength(0);
  });

  it('avisa si el archivo está vacío de partidos', () => {
    const r = mergeLeagueImport({
      league: COL,
      imported: archivo([COL], []),
      existingMatches: [],
      existingFixtures: [],
    });
    expect(r.error).toContain('no trae ningún partido');
  });
});
