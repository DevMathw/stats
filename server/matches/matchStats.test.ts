import { describe, expect, it } from 'vitest';
import { countFilled, fetchMatchStats, sanitize, type MatchStatsRequest } from './matchStats.ts';
import { SourceError, statValues, type MatchSource, type SourceMatch, type StatValues } from './types.ts';

const valores = (over: Partial<StatValues> = {}): StatValues => ({
  ...statValues({
    score: [2, 1],
    shots: [10, 8],
    onTarget: [5, 3],
    possessionPct: [55, 45],
    corners: [6, 2],
    yellow: [1, 2],
    red: [0, 0],
    fouls: [11, 9],
    offsides: [2, 1],
  }),
  ...over,
});

const peticion = (over: Partial<MatchStatsRequest> = {}): MatchStatsRequest => ({
  slug: 'uefa.champions',
  season: '2026/27',
  round: 1,
  date: '2026-09-16',
  homeGoals: 2,
  awayGoals: 1,
  providerId: null,
  homeEspnId: '86', // Real Madrid
  awayEspnId: '110', // Inter
  ...over,
});

const bloqueada = (name: string, secondary: boolean, motivo: string): MatchSource => ({
  name,
  secondary,
  fetch: async () => {
    throw new SourceError(motivo, `https://${name}`);
  },
});

const conCifras = (name: string, lista: SourceMatch[], values: StatValues, pedidos: string[] = []): MatchSource => ({
  name,
  secondary: name === 'FotMob',
  fetch: async () => ({ season: '2026/27', url: `https://${name}/calendario`, matches: lista, notes: [] }),
  matchStats: async (id) => {
    pedidos.push(id);
    return { url: `https://${name}/partido/${id}`, values };
  },
});

const partido = (sourceId: string, homeTeam: string, awayTeam: string, date = '2026-09-16'): SourceMatch => ({
  sourceId,
  round: 1,
  date,
  time: null,
  utc: null,
  phase: null,
  homeTeam,
  awayTeam,
  homeGoals: 2,
  awayGoals: 1,
  homeHalfTime: null,
  awayHalfTime: null,
  status: 'finished',
});

describe('estadísticas de un partido', () => {
  it('sigue el orden de fuentes y usa el id con el que el partido ya está enlazado', async () => {
    const pedidos: string[] = [];
    const r = await fetchMatchStats(
      [
        bloqueada('superliga.dk', false, 'respondió, pero carga el calendario con JavaScript'),
        bloqueada('FBref', true, 'respondió 403'),
        conCifras('FotMob', [], valores(), pedidos),
      ],
      peticion({ providerId: 'FotMob:5739506' }),
    );
    expect(pedidos).toEqual(['5739506']);
    expect(r).toMatchObject({ source: 'FotMob', secondary: true, url: 'https://FotMob/partido/5739506', filled: 15 });
    expect(r.stats?.possessionHome).toBe(0.55);
    expect(r.attempts.map((a) => [a.source, a.ok])).toEqual([
      ['superliga.dk', false],
      ['FBref', false],
      ['FotMob', true],
    ]);
  });

  it('sin enlace, lo localiza por fecha, marcador e identidad de los dos equipos', async () => {
    const pedidos: string[] = [];
    const r = await fetchMatchStats(
      [
        conCifras(
          'uefa.com',
          [
            partido('9', 'FC Internazionale Milano', 'Real Madrid CF'), // la localía al revés: otro partido
            partido('10', 'Real Madrid CF', 'FC Internazionale Milano', '2026-09-17'),
          ],
          valores(),
          pedidos,
        ),
      ],
      peticion(),
    );
    expect(pedidos).toEqual(['10']);
    expect(r.source).toBe('uefa.com');
  });

  it('descarta la fuente si su marcador no es el del partido', async () => {
    const r = await fetchMatchStats(
      [conCifras('uefa.com', [], valores({ scoreHomeFound: 0 }))],
      peticion({ providerId: 'uefa.com:10' }),
    );
    expect(r).toMatchObject({ source: null, filled: 0 });
    expect(r.attempts[0].error).toContain('es otro partido');
  });

  it('con caché, descarga el calendario de cada fuente una sola vez para toda la competición', async () => {
    const fuente = conCifras('uefa.com', [partido('10', 'Real Madrid CF', 'FC Internazionale Milano')], valores());
    let descargas = 0;
    const contada: MatchSource = {
      ...fuente,
      fetch: () => {
        descargas++;
        return fuente.fetch();
      },
    };
    const cache = new Map();
    await fetchMatchStats([contada], peticion(), cache);
    const r = await fetchMatchStats([contada], peticion(), cache);
    expect(descargas).toBe(1);
    expect(r.source).toBe('uefa.com');
  });

  it('oficial + FotMob: FotMob completa solo lo que la oficial no publica, y se sabe quién dio qué', async () => {
    const oficial = conCifras('uefa.com', [], valores({ redCardsHome: null, redCardsAway: null }));
    const fotmob = conCifras('FotMob', [partido('77', 'Real Madrid CF', 'FC Internazionale Milano')], {
      ...valores({ cornersHome: 9, redCardsHome: 1, redCardsAway: 0 }),
      xGHome: 1.9,
      xGAway: 0.8,
      halfTimeHome: 1,
      halfTimeAway: 1,
    });
    const r = await fetchMatchStats([oficial, fotmob], peticion({ providerId: 'uefa.com:10' }));
    // Los córners de la oficial (6) no se sustituyen por los de FotMob (9).
    expect(r.stats).toMatchObject({ cornersHome: 6, redCardsHome: 1, redCardsAway: 0, xGHome: 1.9, xGAway: 0.8 });
    expect(r.halfTime).toEqual({ home: 1, away: 1 });
    expect(r.source).toBe('uefa.com');
    expect(r.contributions.map((c) => [c.source, c.fields])).toEqual([
      ['uefa.com', expect.arrayContaining(['cornersHome', 'possessionHome'])],
      ['FotMob', ['redCardsHome', 'redCardsAway', 'xGHome', 'xGAway', 'halfTime']],
    ]);
  });

  it('devuelve los mínimos de la cronología aunque la fuente solo aporte el descanso', async () => {
    const vacias = statValues({
      score: [2, 1],
      shots: [null, null],
      onTarget: [null, null],
      possessionPct: [null, null],
      corners: [null, null],
      yellow: [null, null],
      red: [null, null],
      fouls: [null, null],
      offsides: [null, null],
      halfTime: [1, 0],
    });
    const soloCronologia: MatchSource = {
      name: 'FotMob',
      secondary: true,
      fetch: async () => ({ season: '2026/27', url: 'https://FotMob/calendario', matches: [], notes: [] }),
      matchStats: async () => ({ url: 'https://FotMob/partido/1', values: vacias, minimums: { yellowCardsHome: 3 } }),
    };
    const r = await fetchMatchStats([soloCronologia], peticion({ providerId: 'FotMob:1' }));
    expect(r.halfTime).toEqual({ home: 1, away: 0 });
    expect(r.minimums).toEqual({ yellowCardsHome: 3 });
    expect(r.filled).toBe(0);
  });
});

/** La barrera que garantiza que nunca entre una cifra que no cuadra con el partido. */
describe('sanitize', () => {
  const REAL = { homeGoals: 2, awayGoals: 1 };

  it('acepta cifras correctas y pasa la posesión a fracción', () => {
    const { stats, rejected } = sanitize(
      { scoreHomeFound: 2, scoreAwayFound: 1, cornersHome: 7, cornersAway: 3, possessionHomePct: 64, shotsHome: 15, shotsOnTargetHome: 6 },
      REAL,
    );
    expect(rejected).toEqual([]);
    expect(stats.cornersHome).toBe(7);
    expect(stats.possessionHome).toBeCloseTo(0.64);
  });

  it('descarta TODO si el marcador de la fuente no coincide: es otro partido', () => {
    const { stats, scoreMismatch, rejected } = sanitize(
      { scoreHomeFound: 3, scoreAwayFound: 0, cornersHome: 9, cornersAway: 2 },
      REAL,
    );
    expect(scoreMismatch).toBe(true);
    expect(countFilled(stats)).toBe(0);
    expect(rejected[0]).toContain('otro partido');
  });

  it('anula lo que está fuera de rango sin tocar lo demás', () => {
    const { stats, rejected } = sanitize({ cornersHome: 250, cornersAway: 4 }, REAL);
    expect(stats.cornersHome).toBeNull();
    expect(stats.cornersAway).toBe(4);
    expect(rejected[0]).toContain('fuera de rango');
  });

  it('anula tiros y tiros a puerta cuando el segundo supera al primero', () => {
    const { stats } = sanitize({ shotsHome: 4, shotsOnTargetHome: 9 }, REAL);
    expect(stats.shotsHome).toBeNull();
    expect(stats.shotsOnTargetHome).toBeNull();
  });

  it('acepta menos tiros a puerta que goles: un autogol no es tiro del equipo', () => {
    const { stats, rejected } = sanitize({ shotsHome: 10, shotsOnTargetHome: 1 }, REAL);
    expect(stats.shotsOnTargetHome).toBe(1);
    expect(stats.shotsHome).toBe(10);
    expect(rejected).toEqual([]);
  });

  it('acepta el descanso posible y rechaza el que supera al final', () => {
    expect(sanitize({ halfTimeHome: 1, halfTimeAway: 1 }, REAL).halfTime).toEqual({ home: 1, away: 1 });
    const imposible = sanitize({ halfTimeHome: 3, halfTimeAway: 0 }, REAL);
    expect(imposible.halfTime).toBeNull();
    expect(imposible.rejected[0]).toContain('Descanso');
    expect(sanitize({ halfTimeHome: 1, halfTimeAway: null }, REAL).halfTime).toBeNull();
  });

  it('descarta las tarjetas por debajo de la cronología de la propia fuente: «0» sin registrar no es un 0', () => {
    const { stats, rejected } = sanitize(
      { yellowCardsHome: 0, yellowCardsAway: 0, redCardsHome: 0, redCardsAway: 1 },
      REAL,
      { yellowCardsHome: 4, yellowCardsAway: 3, redCardsAway: 1 },
    );
    expect([stats.yellowCardsHome, stats.yellowCardsAway]).toEqual([null, null]);
    expect([stats.redCardsHome, stats.redCardsAway]).toEqual([0, 1]);
    expect(rejected[0]).toContain('cronología');
  });

  it('nunca convierte un dato ausente o que no es un número en 0', () => {
    const { stats } = sanitize({ scoreHomeFound: 2, scoreAwayFound: 1, cornersHome: 'siete', cornersAway: null }, REAL);
    expect(countFilled(stats)).toBe(0);
    expect(Object.values(stats).every((v) => v === null)).toBe(true);
  });
});
