/**
 * Mide si el prior histórico mejora las proyecciones, sobre TUS datos.
 *
 *   npm run medir-prior
 *   LIGA="LigaPro Serie A" TEMPORADAS=2026-27 npm run medir-prior
 *
 * Es un walk-forward: para cada jornada de la temporada evaluada se recalcula todo con lo que se sabía
 * ANTES de su primer partido —la propia temporada hasta ese día, más las temporadas anteriores enteras— y se
 * puntúa la proyección contra el resultado real. El corte es estricto por fecha y las temporadas anteriores
 * están cerradas, así que no hay forma de mirar hacia delante.
 *
 * Imprime dos cosas. Primero las métricas de cada variante; después, y es lo que decide, la diferencia
 * EMPAREJADA partido a partido frente al comportamiento del libro, con su error estándar: una mejora que no
 * llega a dos errores estándar no se distingue del ruido.
 *
 * Hay que volver a pasarlo al cargar históricos de otra competición: los números de MODEL_MAPPING.md
 * DIFF-14 están medidos en una sola, que es la única que los tenía.
 */
import { DatabaseSync } from 'node:sqlite';
import { readStore } from '../server/storage/appStore.ts';
import { attachTeamRefs } from '../src/domain/models/teamIdentity.ts';
import { unifyTeamNames } from '../src/domain/models/teamNames.ts';
import { recalculateAll } from '../src/domain/engine.ts';
import { DEFAULT_MODEL_PARAMS } from '../src/domain/models/params.ts';
import { score1X2, scoreBinary } from '../src/domain/prediction/metrics.ts';
import { countDistribution, countOverProbability } from '../src/domain/probability/negativeBinomial.ts';
import { seasonKey } from '../src/domain/models/season.ts';
import type { Fixture, League, Match, ModelParams, Outcome1X2 } from '../src/types/index.ts';

const LIGA = process.env.LIGA ?? 'Primera A (Liga BetPlay Dimayor)';
const TEMPORADAS = (process.env.TEMPORADAS ?? '2026,2026-27').split(',');
const BASE = 'liga (como el libro)';

const db = new DatabaseSync('data/analisis-futbol.sqlite', { readOnly: true });
const guardado = readStore(db).value;
if (!guardado) throw new Error('la base local no tiene datos: arranca la aplicación al menos una vez');
const estado = guardado.state as unknown as {
  leagues: League[];
  matches: Match[];
  fixtures: Fixture[];
  identityAliases?: Record<string, string>;
};

// Las mismas dos pasadas que hace el store al leer, para medir sobre lo que la aplicación usa de verdad.
const conRef = attachTeamRefs({ ...estado, aliases: estado.identityAliases ?? {} });
const unificado = unifyTeamNames({ leagues: estado.leagues, matches: conRef.matches, fixtures: conRef.fixtures });

const liga = estado.leagues.find((l) => l.id === LIGA);
if (!liga) throw new Error(`no hay ninguna competición «${LIGA}». Las hay: ${estado.leagues.map((l) => l.id).join(', ')}`);
const todos = unificado.matches.filter((m) => m.leagueId === LIGA && m.homeGoals !== null && m.awayGoals !== null);

/** Un partido ya jugado, visto como pendiente: es lo que come el motor de proyecciones. */
const comoPendiente = (m: Match): Fixture => ({
  id: m.id,
  providerId: m.providerId,
  leagueId: m.leagueId,
  country: m.country,
  season: m.season,
  date: m.date,
  round: m.round,
  homeTeamId: m.homeTeamId,
  awayTeamId: m.awayTeamId,
  homeTeamName: m.homeTeamName,
  awayTeamName: m.awayTeamName,
  status: 'Programado',
  source: m.source,
  homeTeamRef: m.homeTeamRef,
  awayTeamRef: m.awayTeamRef,
});

interface Fila {
  round: number;
  /** Log loss del resultado que ocurrió, y error absoluto de cada cifra esperada. */
  logloss: number;
  loglossOver: number;
  loglossBtts: number;
  eGoles: number;
  eCorners: number | null;
  eTarjetas: number | null;
  /** Para los totales por variante. */
  probs: { home: number; draw: number; away: number };
  actual: Outcome1X2;
  over: number;
  overReal: 0 | 1;
  btts: number;
  bttsReal: 0 | 1;
  /** Over de córners y tarjetas, que usan la dispersión de la liga y no solo la media. `null` sin dato. */
  corOver: number | null;
  corOverReal: 0 | 1 | null;
  tarOver: number | null;
  tarOverReal: 0 | 1 | null;
  loglossCorOver: number | null;
  loglossTarOver: number | null;
  /** φ y partidos de la liga con los que se construyó la distribución. */
  phiCor: number | null;
  nCor: number;
  /** Duelos directos encontrados: si sale 0, el ajuste H2H no está haciendo nada. */
  h2h: number;
}

/** Líneas típicas: 9.5 córners y 4.5 amarillas en el total del partido. */
const LINEA_CORNERS = 9.5;
const LINEA_TARJETAS = 4.5;

const acotar = (p: number) => Math.min(Math.max(p, 1e-12), 1 - 1e-12);
const ll = (p: number, y: 0 | 1) => -Math.log(acotar(y === 1 ? p : 1 - p));

function correr(params: ModelParams): Fila[] {
  const out: Fila[] = [];
  for (const S of TEMPORADAS) {
    const deLaTemporada = todos.filter((m) => seasonKey(m.season) === S);
    if (deLaTemporada.length === 0) throw new Error(`«${LIGA}» no tiene partidos de la temporada ${S}`);
    const ligaS = { ...liga, season: S };
    for (const r of [...new Set(deLaTemporada.map((m) => m.round))].sort((a, b) => a - b)) {
      const jornada = deLaTemporada.filter((m) => m.round === r);
      const corte = jornada.reduce((a, m) => (m.date < a ? m.date : a), jornada[0].date);
      const previos = todos.filter((m) => seasonKey(m.season) !== S || m.date < corte);
      const d = recalculateAll({ leagues: [ligaS], matches: previos, fixtures: jornada.map(comoPendiente), params });
      for (const m of jornada) {
        const p = d.projectionsByFixtureId.get(m.id);
        if (!p) continue;
        const gh = m.homeGoals!;
        const ga = m.awayGoals!;
        const total = gh + ga;
        const overReal = total > 2.5 ? 1 : 0;
        const bttsReal = gh > 0 && ga > 0 ? 1 : 0;
        const actual: Outcome1X2 = gh > ga ? '1' : gh < ga ? '2' : 'X';
        const cor = m.cornersHome !== null && m.cornersAway !== null ? m.cornersHome + m.cornersAway : null;
        const tar = m.yellowCardsHome !== null && m.yellowCardsAway !== null ? m.yellowCardsHome + m.yellowCardsAway : null;
        // Over de córners/tarjetas: la media la pone la proyección, la forma de la cola la dispersión de la liga.
        const disp = d.dispersionByLeague.get(m.leagueId);
        const overDe = (esperado: number | null, dispersion: typeof disp extends undefined ? never : NonNullable<typeof disp>['corners'], linea: number) =>
          esperado === null || !dispersion || dispersion.n < 20 ? null : countOverProbability(countDistribution(esperado, dispersion), linea);
        const corOver = overDe(p.expectedCornersTotal, disp?.corners ?? null, LINEA_CORNERS);
        const tarOver = overDe(p.expectedCardsTotal, disp?.cards ?? null, LINEA_TARJETAS);
        const corOverReal = cor === null ? null : cor > LINEA_CORNERS ? 1 : 0;
        const tarOverReal = tar === null ? null : tar > LINEA_TARJETAS ? 1 : 0;
        out.push({
          corOver,
          corOverReal,
          tarOver,
          tarOverReal,
          loglossCorOver: corOver === null || corOverReal === null ? null : ll(corOver, corOverReal),
          loglossTarOver: tarOver === null || tarOverReal === null ? null : ll(tarOver, tarOverReal),
          phiCor: disp?.corners?.index ?? null,
          nCor: disp?.corners?.n ?? 0,
          h2h: p.breakdown.h2hMatches,
          round: r,
          logloss: -Math.log(acotar(actual === '1' ? p.probs1x2.home : actual === 'X' ? p.probs1x2.draw : p.probs1x2.away)),
          loglossOver: ll(p.probOver25, overReal),
          loglossBtts: ll(p.probBtts, bttsReal),
          eGoles: Math.abs(p.expectedGoalsTotal - total),
          eCorners: p.expectedCornersTotal === null || cor === null ? null : Math.abs(p.expectedCornersTotal - cor),
          eTarjetas: p.expectedCardsTotal === null || tar === null ? null : Math.abs(p.expectedCardsTotal - tar),
          probs: p.probs1x2,
          actual,
          over: p.probOver25,
          overReal,
          btts: p.probBtts,
          bttsReal,
        });
      }
    }
  }
  return out;
}

/** Media de los que tienen valor, y cuántos son: el prior puede hacer que una métrica deje de ser N/D. */
const medio = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x !== null);
  return v.length === 0 ? null : { m: v.reduce((a, b) => a + b, 0) / v.length, n: v.length };
};
const f4 = (x: number | null | undefined) => (x == null ? '   --  ' : x.toFixed(4));
/** «valor (n)»: el n hace falta porque dos variantes pueden puntuar distinto número de partidos. */
const conN = (x: { m: number; n: number } | null) => (x === null ? '   --  ' : `${x.m.toFixed(4)} (${x.n})`);

function resumir(nombre: string, filas: Fila[]) {
  const uno = score1X2(filas.map((f) => ({ probs: f.probs, actual: f.actual })));
  const over = scoreBinary(filas.map((f) => ({ p: f.over, actual: f.overReal })));
  const btts = scoreBinary(filas.map((f) => ({ p: f.btts, actual: f.bttsReal })));
  const co = medio(filas.map((f) => f.loglossCorOver));
  const ta = medio(filas.map((f) => f.loglossTarOver));
  const phi = medio(filas.map((f) => f.phiCor));
  const nLiga = medio(filas.map((f) => f.nCor));
  console.log(
    `${nombre.padEnd(24)} n=${String(filas.length).padStart(4)} | 1X2 ${f4(uno.logLoss)} acierto ${f4(uno.accuracy)} | ` +
      `O2.5 ${f4(over.logLoss)} | BTTS ${f4(btts.logLoss)} | error medio: goles ${conN(medio(filas.map((f) => f.eGoles)))} ` +
      `córners ${conN(medio(filas.map((f) => f.eCorners)))} tarjetas ${conN(medio(filas.map((f) => f.eTarjetas)))}`,
  );
  console.log(
    `${' '.repeat(24)}      └ Over ${LINEA_CORNERS} córners log loss ${conN(co)} · Over ${LINEA_TARJETAS} tarjetas ${conN(ta)} ` +
      `· φ córners medio ${f4(phi?.m)} sobre ${Math.round(nLiga?.m ?? 0)} partidos de liga ` +
      `· duelos H2H medios ${f4(medio(filas.map((f) => f.h2h))?.m)}`,
  );
}

/** Diferencia media partido a partido frente al libro, con su error estándar. */
function emparejado(base: Fila[], otra: Fila[], campo: 'logloss' | 'loglossOver' | 'loglossBtts' | 'eGoles' | 'eCorners' | 'eTarjetas') {
  const d: number[] = [];
  for (let i = 0; i < base.length; i++) {
    const a = base[i][campo];
    const b = otra[i][campo];
    if (a === null || b === null) continue;
    d.push(b - a);
  }
  if (d.length < 2) return null;
  const m = d.reduce((x, y) => x + y, 0) / d.length;
  const sd = Math.sqrt(d.reduce((x, y) => x + (y - m) ** 2, 0) / (d.length - 1));
  return { n: d.length, dif: m, se: sd / Math.sqrt(d.length) };
}

const params = (extra: Partial<ModelParams>): ModelParams => ({ ...DEFAULT_MODEL_PARAMS, projectionSource: 'libro', ...extra });
/*
 * Dos barridos. `VARIANTES=prior` (por defecto) mide cuánto pesa el histórico de cada equipo;
 * `VARIANTES=h2h` barre W_H2H sobre el modelo ya vigente (prior histórico con K_PRIOR 10), que es lo
 * que queda por decidir desde que el histórico hizo que los duelos directos existieran.
 */
const H2H = ['0 (sin ajuste)', '0.05', '0.1 (actual)', '0.2', '0.4'];
const variantes: [string, ModelParams][] =
  (process.env.VARIANTES ?? 'prior') === 'h2h'
    ? H2H.map((etiqueta) => [
        `W_H2H ${etiqueta}`,
        params({ priorMode: 'historico', kPrior: 10, wH2h: Number.parseFloat(etiqueta) }),
      ])
    : [
        [BASE, params({ priorMode: 'liga' })],
        ['histórico K_PRIOR 5', params({ priorMode: 'historico', kPrior: 5 })],
        ['histórico K_PRIOR 10', params({ priorMode: 'historico', kPrior: 10 })],
        ['histórico K_PRIOR 20', params({ priorMode: 'historico', kPrior: 20 })],
        ['histórico K_PRIOR 40', params({ priorMode: 'historico', kPrior: 40 })],
      ];

console.log(`${LIGA} · se evalúa ${TEMPORADAS.join(', ')} · ${todos.length} partidos con resultado en la base`);
console.log('FUENTE_PROYECCION = libro, para medir el modelo y no la mezcla con el ensemble.\n');

const resultados = new Map<string, Fila[]>();
for (const [nombre, p] of variantes) {
  const filas = correr(p);
  resultados.set(nombre, filas);
  resumir(nombre, filas);
}

const primeras = (filas: Fila[]) => filas.filter((f) => f.round <= 6);
console.log('\nsolo las 6 primeras jornadas, donde el libro casi no tiene datos:');
for (const [nombre] of variantes) resumir(nombre, primeras(resultados.get(nombre)!));

const base = resultados.get(variantes[0][0])!;
const campos = ['logloss', 'loglossOver', 'loglossBtts', 'eGoles', 'eCorners', 'eTarjetas', 'loglossCorOver', 'loglossTarOver'] as const;
const ROTULOS: Record<(typeof campos)[number], string> = {
  logloss: 'log loss 1X2',
  loglossOver: 'log loss O2.5',
  loglossBtts: 'log loss BTTS',
  eGoles: 'error goles',
  eCorners: 'error córners',
  eTarjetas: 'error tarjetas',
  loglossCorOver: 'log loss O córners',
  loglossTarOver: 'log loss O tarjetas',
};
for (const [nombre] of variantes) {
  if (nombre === BASE) continue;
  console.log(`\n${nombre} frente al libro, emparejado partido a partido (negativo = mejor):`);
  for (const campo of campos) {
    const r = emparejado(base, resultados.get(nombre)!, campo);
    if (!r) continue;
    const signo = r.dif >= 0 ? '+' : '';
    const fuera = Math.abs(r.dif) > 2 * r.se ? '   <- fuera del ruido (más de 2 EE)' : '';
    console.log(`  ${ROTULOS[campo].padEnd(15)} n=${String(r.n).padStart(4)}  ${signo}${r.dif.toFixed(4)} ± ${r.se.toFixed(4)}${fuera}`);
  }
}
