/**
 * Del backtest a la tabla que se compara: una fila por modelo y mercado, con sus métricas.
 *
 * El ensemble entra como una fila más y se mide con la misma vara que los demás. Si no gana, se ve.
 */
import { score1X2, scoreBinary, type ScoreSummary } from './metrics';
import type { BacktestResult, MatchRecord } from './backtest';
import { MODELS } from './models';
import type { ModelId, Outcome1X2 } from './types';
import type { Probabilities1X2 } from '../../types';

export interface ModelScores {
  id: ModelId | 'ensemble';
  name: string;
  /** Partidos a los que ese modelo respondió. */
  answered: number;
  oneX2: ScoreSummary;
  over25: ScoreSummary;
  btts: ScoreSummary;
}

const nombre = (id: ModelId | 'ensemble') => (id === 'ensemble' ? 'Ensemble' : (MODELS.find((m) => m.id === id)?.name ?? id));

function puntuar(records: MatchRecord[], id: ModelId | 'ensemble'): ModelScores {
  const p1x2: { probs: Probabilities1X2; actual: Outcome1X2 }[] = [];
  const pOver: { p: number; actual: 0 | 1 }[] = [];
  const pBtts: { p: number; actual: 0 | 1 }[] = [];

  for (const r of records) {
    const pred = id === 'ensemble' ? r.ensemble : r.byModel.get(id);
    if (!pred) continue;
    p1x2.push({ probs: pred.probs1x2, actual: r.actual });
    const over = pred.over[2.5];
    if (over !== undefined) pOver.push({ p: over, actual: r.totalGoals > 2.5 ? 1 : 0 });
    if (pred.btts !== null && pred.btts !== undefined) pBtts.push({ p: pred.btts, actual: r.btts });
  }

  return { id, name: nombre(id), answered: p1x2.length, oneX2: score1X2(p1x2), over25: scoreBinary(pOver), btts: scoreBinary(pBtts) };
}

export interface BacktestSummary {
  models: ModelScores[];
  /** Solo los partidos que TODOS los modelos evaluados respondieron: comparación cara a cara. */
  common: { records: number; models: ModelScores[] };
  leagues: { leagueId: string; records: number; ensemble: ScoreSummary }[];
}

export function summarizeBacktest(result: BacktestResult): BacktestSummary {
  const ids: (ModelId | 'ensemble')[] = [...result.trained.map((t) => t.id), 'ensemble'];
  const models = ids.map((id) => puntuar(result.records, id));

  // Comparación justa: los partidos en los que respondieron todos.
  const modelIds = result.trained.map((t) => t.id);
  const comunes = result.records.filter((r) => modelIds.every((id) => r.byModel.has(id)) && r.ensemble);
  const common = { records: comunes.length, models: ids.map((id) => puntuar(comunes, id)) };

  const porLiga = new Map<string, MatchRecord[]>();
  for (const r of result.records) (porLiga.get(r.leagueId) ?? porLiga.set(r.leagueId, []).get(r.leagueId)!).push(r);
  const leagues = [...porLiga]
    .map(([leagueId, rs]) => ({ leagueId, records: rs.length, ensemble: puntuar(rs, 'ensemble').oneX2 }))
    .sort((a, b) => b.records - a.records);

  return { models, common, leagues };
}
