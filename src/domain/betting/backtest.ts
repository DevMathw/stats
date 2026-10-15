/**
 * Backtest walk-forward del MODELO (sin cuotas). PICKS_METHODOLOGY.md §9.
 *
 * Para cada fecha con partidos jugados de una liga, el modelo se recalcula con los partidos de
 * fechas ANTERIORES y proyecta los de esa fecha como si estuvieran pendientes. Así cada predicción
 * solo usa información que existía antes del partido. Después se compara con el resultado real.
 *
 * Límites, dichos en la interfaz:
 *  - Se usan los parámetros actuales del modelo, no los que había en cada fecha.
 *  - No hay cuotas históricas: mide calibración y precisión, no rentabilidad.
 *  - Over 1.5/2.5/3.5 de un mismo partido no son independientes: la muestra efectiva es menor que n.
 */
import type { Fixture, League, Match, ModelParams } from '../../types';
import type { MarketFamily, Selection } from '../../types/betting';
import { recalculateAll } from '../engine';
import { countsForAnalysis } from '../calculations/matchDerived';
import { brierScore, calibration, logLoss, type CalibrationBin } from './metrics';
import { estimateMarket, selectionLabel, settleSelection } from './markets';

export const MIN_BACKTEST_SAMPLE = 30;

const MERCADOS: Selection[] = [
  { market: 'resultado', outcome: 'home' },
  { market: 'resultado', outcome: 'draw' },
  { market: 'resultado', outcome: 'away' },
  { market: 'goles', side: 'over', line: 1.5 },
  { market: 'goles', side: 'over', line: 2.5 },
  { market: 'goles', side: 'over', line: 3.5 },
  { market: 'mitad', half: 1, side: 'over', line: 0.5 },
  { market: 'mitad', half: 1, side: 'over', line: 1.5 },
  { market: 'mitad', half: 2, side: 'over', line: 0.5 },
  { market: 'mitad', half: 2, side: 'over', line: 1.5 },
  { market: 'btts', outcome: 'si' },
  { market: 'asiatico', team: 'home', line: -1.5 },
  { market: 'asiatico', team: 'home', line: 1.5 },
  { market: 'asiatico', team: 'home', line: 0 },
  { market: 'equipo', team: 'home', side: 'over', line: 1.5 },
  { market: 'equipo', team: 'away', side: 'over', line: 0.5 },
  { market: 'cero', team: 'home', outcome: 'si' },
  { market: 'corners', side: 'over', line: 8.5 },
  { market: 'corners', side: 'over', line: 9.5 },
  { market: 'corners', side: 'over', line: 10.5 },
  { market: 'tarjetas', side: 'over', line: 3.5 },
  { market: 'tarjetas', side: 'over', line: 4.5 },
  { market: 'tiros', side: 'over', line: 24.5 },
  { market: 'tiros', side: 'over', line: 26.5 },
  { market: 'sot', side: 'over', line: 7.5 },
  { market: 'sot', side: 'over', line: 8.5 },
  { market: 'conteoEquipo', stat: 'corners', team: 'home', side: 'over', line: 4.5 },
  { market: 'conteoEquipo', stat: 'corners', team: 'away', side: 'over', line: 4.5 },
  { market: 'conteoEquipo', stat: 'tarjetas', team: 'home', side: 'over', line: 1.5 },
  { market: 'conteoEquipo', stat: 'tiros', team: 'home', side: 'over', line: 12.5 },
  { market: 'conteoEquipo', stat: 'tiros', team: 'away', side: 'over', line: 12.5 },
  { market: 'conteoEquipo', stat: 'sot', team: 'home', side: 'over', line: 4.5 },
];

export interface BacktestPrediction {
  matchId: string;
  leagueId: string;
  date: string;
  family: MarketFamily;
  market: string;
  probability: number;
  outcome: 0 | 1;
}

export interface LeagueBacktest {
  predictions: BacktestPrediction[];
  evaluated: number;
  skipped: number;
}

function comoPendiente(m: Match): Fixture {
  return {
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
    source: null,
  };
}

export function backtestLeague(league: League, matches: Match[], params: ModelParams, minSample: number): LeagueBacktest {
  const jugados = matches.filter((m) => m.leagueId === league.id && countsForAnalysis(m)).sort((a, b) => a.date.localeCompare(b.date));
  /*
   * Los cortes son (fecha, temporada), y la competición se evalúa con la temporada de cada corte puesta.
   *
   * Sin esto el backtest no tocaba el histórico: `recalculateAll` solo calcula la temporada vigente, así que en
   * una fecha de 2025 los partidos anteriores quedaban todos fuera, los equipos no existían y el partido se
   * saltaba. Medido el 27/09/2026 en la BetPlay: **32 evaluados y 687 saltados** de 719. Poniendo la temporada
   * del corte, cada partido se juzga con su propia temporada como la vigente y las anteriores como histórico,
   * que es justo lo que tenía delante quien lo fuera a apostar.
   */
  const cortes = [...new Map(jugados.map((m) => [`${m.date}|${m.season}`, { date: m.date, season: m.season }])).values()];
  const predictions: BacktestPrediction[] = [];
  let evaluated = 0;
  let skipped = 0;

  for (const { date: fecha, season } of cortes) {
    const previos = jugados.filter((m) => m.date < fecha);
    const hoy = jugados.filter((m) => m.date === fecha && m.season === season);
    if (!previos.length) {
      skipped += hoy.length;
      continue;
    }
    const d = recalculateAll({ leagues: [{ ...league, season }], matches: previos, fixtures: hoy.map(comoPendiente), params });
    for (const m of hoy) {
      const projection = d.projectionsByFixtureId.get(m.id);
      const homeSplit = d.homeStatsByTeamId.get(m.homeTeamId);
      const awaySplit = d.awayStatsByTeamId.get(m.awayTeamId);
      if (!projection || !homeSplit || !awaySplit || homeSplit.played < minSample || awaySplit.played < minSample) {
        skipped++;
        continue;
      }
      evaluated++;
      const ctx = {
        projection,
        homeSplit,
        awaySplit,
        homeHistory: d.historyByTeamId.get(m.homeTeamId)?.home ?? null,
        awayHistory: d.historyByTeamId.get(m.awayTeamId)?.away ?? null,
        dispersion: d.dispersionByLeague.get(league.id),
        params,
        minSample,
      };
      for (const sel of MERCADOS) {
        const e = estimateMarket(sel, ctx);
        if (e.probability === null) continue;
        const r = settleSelection(sel, m);
        // Sin la cifra o con devolución no hay acierto ni fallo que comparar.
        if (r.status !== 'ganado' && r.status !== 'perdido') continue;
        predictions.push({
          matchId: m.id,
          leagueId: league.id,
          date: m.date,
          family: sel.market,
          market: selectionLabel(sel),
          probability: e.probability,
          outcome: r.status === 'ganado' ? 1 : 0,
        });
      }
    }
  }
  return { predictions, evaluated, skipped };
}

export interface BacktestRun extends LeagueBacktest {
  leagues: number;
}

/** Todas las ligas pedidas, cediendo el hilo entre liga y liga para no congelar la interfaz. */
export async function runBacktest(input: {
  leagues: League[];
  matches: Match[];
  params: ModelParams;
  minSample: number;
  onProgress?: (done: number, total: number) => void;
}): Promise<BacktestRun> {
  const out: BacktestRun = { predictions: [], evaluated: 0, skipped: 0, leagues: input.leagues.length };
  let done = 0;
  for (const l of input.leagues) {
    const r = backtestLeague(l, input.matches, input.params, input.minSample);
    out.predictions.push(...r.predictions);
    out.evaluated += r.evaluated;
    out.skipped += r.skipped;
    input.onProgress?.(++done, input.leagues.length);
    await new Promise((res) => setTimeout(res, 0));
  }
  return out;
}

export interface BacktestRow {
  key: string;
  label: string;
  n: number;
  meanProbability: number | null;
  observed: number | null;
  brier: number | null;
  /** Brier de predecir siempre la frecuencia observada (referencia sin modelo). */
  brierBase: number | null;
  /** 1 − Brier / Brier de referencia. Positivo: el modelo aporta sobre la frecuencia base. */
  skill: number | null;
  logLoss: number | null;
  ece: number | null;
  bins: CalibrationBin[];
}

export function summarizePredictions(preds: BacktestPrediction[], keyOf: (p: BacktestPrediction) => { key: string; label: string }): BacktestRow[] {
  const grupos = new Map<string, { label: string; ps: BacktestPrediction[] }>();
  for (const p of preds) {
    const { key, label } = keyOf(p);
    const g = grupos.get(key) ?? { label, ps: [] };
    g.ps.push(p);
    grupos.set(key, g);
  }
  return [...grupos].map(([key, g]) => {
    const pairs = g.ps.map((p) => ({ p: p.probability, o: p.outcome }));
    const n = pairs.length;
    const suficiente = n >= MIN_BACKTEST_SAMPLE;
    const observed = n ? pairs.reduce((a, x) => a + x.o, 0) / n : null;
    const brier = brierScore(pairs);
    const base = observed === null ? null : observed * (1 - observed);
    const cal = calibration(pairs);
    return {
      key,
      label: g.label,
      n,
      meanProbability: n ? pairs.reduce((a, x) => a + x.p, 0) / n : null,
      observed,
      brier: suficiente ? brier : null,
      brierBase: suficiente ? base : null,
      skill: suficiente && brier !== null && base ? 1 - brier / base : null,
      logLoss: suficiente ? logLoss(pairs) : null,
      ece: suficiente ? cal.ece : null,
      bins: cal.bins,
    };
  });
}
