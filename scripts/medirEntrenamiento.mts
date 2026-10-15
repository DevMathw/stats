/**
 * Mide el entrenamiento del motor de predicción sobre TUS datos: cuánto tarda cada modelo, cuánto el
 * backtest completo, y qué métricas salen. Es el antes/después de cualquier optimización.
 *
 *   npm run medir-entrenamiento            # perfil por modelo (un corte con todo el histórico)
 *   MODO=backtest npm run medir-entrenamiento
 *   MODO=backtest REFIT=42 npm run medir-entrenamiento  # reentrenar cada 42 dias en vez de 21
 *   MODO=backtest N=3000 npm run medir-entrenamiento   # solo los 3000 partidos más recientes
 *
 * Las métricas se imprimen con cuatro decimales a propósito: una optimización que no cambia el modelo
 * tiene que dar EXACTAMENTE los mismos números.
 */
import { DatabaseSync } from 'node:sqlite';
import { readStore } from '../server/storage/appStore.ts';
import { attachTeamRefs } from '../src/domain/models/teamIdentity.ts';
import { unifyTeamNames } from '../src/domain/models/teamNames.ts';
import { DEFAULT_MODEL_PARAMS } from '../src/domain/models/params.ts';
import { buildDatasetWithState } from '../src/domain/prediction/features.ts';
import { MODELS } from '../src/domain/prediction/models.ts';
import { runPredictionBacktest } from '../src/domain/prediction/backtest.ts';
import { summarizeBacktest } from '../src/domain/prediction/evaluate.ts';
import { trainEngine, predictFixtures } from '../src/domain/prediction/engine.ts';
import type { Fixture, League, Match } from '../src/types/index.ts';

const db = new DatabaseSync('data/analisis-futbol.sqlite', { readOnly: true });
const guardado = readStore(db).value;
if (!guardado) throw new Error('la base local no tiene datos');
const estado = guardado.state as unknown as {
  leagues: League[]; matches: Match[]; fixtures: Fixture[]; identityAliases?: Record<string, string>;
};
const conRef = attachTeamRefs({ ...estado, aliases: estado.identityAliases ?? {} });
const { matches: todos, fixtures } = unifyTeamNames({ leagues: estado.leagues, matches: conRef.matches, fixtures: conRef.fixtures });

const N = process.env.N ? Number(process.env.N) : 0;
const ordenados = [...todos].sort((a, b) => a.date.localeCompare(b.date));
const matches = N > 0 ? ordenados.slice(-N) : ordenados;
const leagues = estado.leagues;
const params = DEFAULT_MODEL_PARAMS;

/**
 * Huella de TODAS las probabilidades del backtest, no de la tabla redondeada: una optimización que no
 * toca el modelo tiene que dar la misma cadena. Es un FNV-1a sobre cada número con 17 cifras
 * significativas, que es lo que distingue a dos `double` distintos.
 */
function huella(r: Awaited<ReturnType<typeof runPredictionBacktest>>): string {
  let h = 2166136261;
  const mete = (txt: string) => {
    for (let i = 0; i < txt.length; i++) {
      h ^= txt.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
  };
  const num = (v: number | null | undefined) => mete(v === null || v === undefined ? 'n' : v.toPrecision(17));
  for (const rec of r.records) {
    mete(rec.matchId);
    for (const [id, m] of rec.byModel) {
      mete(id);
      num(m.probs1x2.home);
      num(m.probs1x2.draw);
      num(m.probs1x2.away);
      for (const l of [1.5, 2.5, 3.5] as const) num(m.over[l]);
      num(m.btts);
      num(m.expectedGoals?.home);
      num(m.expectedGoals?.away);
      for (const sc of m.scorelines ?? []) {
        mete(sc.score);
        num(sc.probability);
      }
    }
    if (rec.ensemble) {
      num(rec.ensemble.probs1x2.home);
      num(rec.ensemble.probs1x2.draw);
      num(rec.ensemble.probs1x2.away);
      for (const l of [1.5, 2.5, 3.5] as const) num(rec.ensemble.over[l]);
      num(rec.ensemble.btts);
    }
    for (const w of rec.weights) {
      mete(w.id);
      num(w.weight);
    }
  }
  return (h >>> 0).toString(16);
}

const seg = (ms: number) => `${(ms / 1000).toFixed(2)} s`;
const cronometro = <T,>(etiqueta: string, fn: () => T): T => {
  const t = performance.now();
  const r = fn();
  console.log(`  ${etiqueta.padEnd(34)} ${seg(performance.now() - t).padStart(9)}`);
  return r;
};

console.log(`\n${matches.length} partidos · ${leagues.length} competiciones · ${fixtures.length} pendientes\n`);

if ((process.env.MODO ?? 'perfil') === 'perfil') {
  console.log('── Un corte con todo el histórico (lo que hace «Calcular» en la ficha) ──');
  const { rows } = cronometro('buildDataset', () => buildDatasetWithState(matches));
  const ctx = { rows, matches, leagues, params, cutoff: '2099-01-01' };
  for (const m of MODELS) cronometro(m.id, () => m.fit(ctx));
  const t = performance.now();
  const engine = trainEngine({ matches, leagues, params });
  const entrenado = performance.now() - t;
  const t2 = performance.now();
  const preds = predictFixtures(engine, fixtures);
  console.log(`\n  trainEngine completo            ${seg(entrenado).padStart(9)}`);
  console.log(`  predictFixtures (${String(preds.size).padStart(3)} partidos)   ${seg(performance.now() - t2).padStart(9)}`);
} else {
  console.log('── Backtest completo ──');
  const t = performance.now();
  const r = await runPredictionBacktest({
    matches, leagues, params,
    refitDays: process.env.REFIT ? Number(process.env.REFIT) : undefined,
    onProgress: (hecho, total, etapa) => {
      if (hecho === 0 || hecho % 50 === 0) console.log(`  ${((100 * hecho) / total).toFixed(0).padStart(3)} % · ${etapa} · ${seg(performance.now() - t)}`);
    },
  });
  const total = performance.now() - t;
  console.log(`\n  TOTAL ${seg(total)} · ${r.refits} reentrenos · ${r.evaluated} evaluados · ${r.skippedMatches} saltados`);
  console.log(`  HUELLA ${huella(r)}`);
  const resumen = summarizeBacktest(r);
  console.log('\n  modelo            1X2 logloss    Brier   acierto      ECE   |  O2.5 logloss  |  BTTS logloss');
  for (const m of resumen.models) {
    const f = (v: number | null, d = 4) => (v === null ? '    —   ' : v.toFixed(d).padStart(8));
    console.log(`  ${m.name.padEnd(16)} ${f(m.oneX2.logLoss)} ${f(m.oneX2.brier)} ${f(m.oneX2.accuracy)} ${f(m.oneX2.ece)}  | ${f(m.over25.logLoss)}       | ${f(m.btts.logLoss)}`);
  }
  console.log('\n  pesos finales:', r.finalWeights.map((w) => `${w.market} [${w.weights.map((x) => `${x.id} ${x.weight.toFixed(4)}`).join(', ')}]`).join('\n                 '));
  console.log(`  ECE del ensemble: ${r.calibration.ece?.toFixed(6)}`);
}
