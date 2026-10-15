/**
 * Skill y calibración de CADA mercado, con el backtest temporal de `/historial`.
 *
 *   npm run medir-mercados
 *   LIGA="LaLiga" npm run medir-mercados
 *
 * Es lo que decide si un mercado merece estar publicado. `skill` es 1 − Brier / Brier de predecir
 * siempre la frecuencia observada: positivo significa que el modelo aporta algo sobre no modelar nada.
 * Negativo, que no. Cada partido se predice solo con lo anterior a él (`backtestLeague`).
 *
 * Ojo con el baseline: la frecuencia observada se calcula sobre los MISMOS partidos, así que es una
 * referencia con ventaja (sabe el futuro). Un skill positivo contra ella es exigente; uno negativo no
 * demuestra que el mercado sea malo, pero sí que no aporta sobre la frecuencia base de su liga.
 */
import { DatabaseSync } from 'node:sqlite';
import { readStore } from '../server/storage/appStore.ts';
import { attachTeamRefs } from '../src/domain/models/teamIdentity.ts';
import { unifyTeamNames } from '../src/domain/models/teamNames.ts';
import { runBacktest, summarizePredictions } from '../src/domain/betting/backtest.ts';
import { DEFAULT_MODEL_PARAMS } from '../src/domain/models/params.ts';
import type { Fixture, League, Match } from '../src/types/index.ts';

const db = new DatabaseSync('data/analisis-futbol.sqlite', { readOnly: true });
const raw = readStore(db).value!.state as unknown as {
  leagues: League[]; matches: Match[]; fixtures: Fixture[]; identityAliases?: Record<string, string>;
};
const conRef = attachTeamRefs({ ...raw, aliases: raw.identityAliases ?? {} });
const st = unifyTeamNames({ leagues: raw.leagues, matches: conRef.matches, fixtures: conRef.fixtures });

const LIGA = process.env.LIGA ?? '';
const leagues = LIGA ? raw.leagues.filter((l) => l.id === LIGA) : raw.leagues;
if (!leagues.length) throw new Error(`no hay liga «${LIGA}»`);

const t = performance.now();
const r = await runBacktest({
  leagues,
  matches: st.matches,
  params: DEFAULT_MODEL_PARAMS,
  minSample: Number(process.env.MIN_SAMPLE ?? 3),
});
console.log(
  `${leagues.length} liga(s) · ${r.evaluated} partidos evaluados · ${r.skipped} saltados · ${r.predictions.length} predicciones · ${((performance.now() - t) / 1000).toFixed(1)} s`,
);

const filas = summarizePredictions(r.predictions, (p) => ({ key: p.market, label: p.market }));
console.log('\nmercado                          n    media   real    brier    base    skill  logloss     ECE');
for (const m of filas.sort((a, b) => (b.skill ?? -9) - (a.skill ?? -9))) {
  const f = (v: number | null, d = 4) => (v === null ? '      -' : v.toFixed(d).padStart(7));
  console.log(
    `${m.label.padEnd(28)} ${String(m.n).padStart(5)} ${f(m.meanProbability, 3)} ${f(m.observed, 3)} ${f(m.brier)} ${f(m.brierBase)} ${f(m.skill)} ${f(m.logLoss)} ${f(m.ece)}`,
  );
}
