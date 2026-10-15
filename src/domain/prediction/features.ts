/**
 * Dataset del motor de predicción: una fila por partido disputado, con las variables que se conocían
 * ANTES de jugarse y el resultado real como etiqueta.
 *
 * Regla que gobierna todo el módulo: una fila solo puede mirar partidos de fechas ESTRICTAMENTE
 * anteriores. Los partidos se recorren por fecha; las de un mismo día se calculan todas antes de
 * actualizar los acumuladores con los resultados de ese día, así dos partidos del mismo sábado no se
 * ven entre ellos. Es lo mismo que hace el backtest del modelo actual (PICKS_METHODOLOGY.md §9).
 *
 * Un dato que la fuente no publicó sigue siendo `null` aquí. Cada modelo decide qué hacer con él: los
 * de goles lo ignoran y los de aprendizaje automático reciben la media de la liga en su lugar, que es
 * una decisión documentada del entrenamiento, no un dato inventado en la base.
 */
import type { Match } from '../../types';
import { countsForAnalysis } from '../calculations/matchDerived';
import { ELO_INICIAL, EloTable } from './elo';

/** Variables de una fila, todas numéricas y todas anteriores al partido. `null` = no publicado. */
export interface Features {
  /** Rating Elo de cada equipo antes del partido y su diferencia. */
  eloHome: number;
  eloAway: number;
  eloDiff: number;

  /** Partidos que cada equipo tenía jugados en la competición: el tamaño de muestra. */
  playedHome: number;
  playedAway: number;
  /** Partidos como local / como visitante. */
  playedHomeAtHome: number;
  playedAwayAtAway: number;

  /** Puntos por partido: general y en su condición. */
  ppgHome: number | null;
  ppgAway: number | null;
  ppgHomeAtHome: number | null;
  ppgAwayAtAway: number | null;

  /** Goles a favor y en contra por partido, en su condición. */
  gfHomeAtHome: number | null;
  gaHomeAtHome: number | null;
  gfAwayAtAway: number | null;
  gaAwayAtAway: number | null;

  /** Forma: últimos 5 partidos (cualquier condición). */
  form5Home: number | null;
  form5Away: number | null;
  gf5Home: number | null;
  ga5Home: number | null;
  gf5Away: number | null;
  ga5Away: number | null;

  /** xG a favor y en contra por partido. */
  xgForHome: number | null;
  xgAgainstHome: number | null;
  xgForAway: number | null;
  xgAgainstAway: number | null;

  /** Tiros, tiros a puerta, posesión, corners y tarjetas por partido. */
  shotsHome: number | null;
  shotsAway: number | null;
  sotHome: number | null;
  sotAway: number | null;
  possessionHome: number | null;
  possessionAway: number | null;
  cornersHome: number | null;
  cornersAway: number | null;
  cardsHome: number | null;
  cardsAway: number | null;

  /** Días desde el último partido de cada equipo (descanso), hasta 14. `null` si es su primer partido. */
  restHome: number | null;
  restAway: number | null;

  /** Enfrentamientos directos previos en la base y su diferencia media de goles (local − visitante). */
  h2hMatches: number;
  h2hGoalDiff: number | null;

  /** Contexto de la liga: goles por partido y ventaja de campo medida (puntos del local − del visitante). */
  leagueGoals: number | null;
  leagueHomeEdge: number | null;
}

/** Resultado real del partido: lo que se predice. */
export interface Labels {
  result: '1' | 'X' | '2';
  homeGoals: number;
  awayGoals: number;
  totalGoals: number;
  btts: 0 | 1;
}

export interface SampleRow {
  matchId: string;
  leagueId: string;
  date: string;
  homeTeamId: string;
  awayTeamId: string;
  features: Features;
  labels: Labels;
}

/** Acumulador de un equipo. Solo guarda lo ya jugado. */
interface TeamAcc {
  played: number;
  playedHome: number;
  playedAway: number;
  points: number;
  pointsHome: number;
  pointsAway: number;
  gfHome: number;
  gaHome: number;
  gfAway: number;
  gaAway: number;
  /** Últimos partidos, el más reciente al final: [puntos, gf, ga]. */
  last: { points: number; gf: number; ga: number }[];
  lastDate: string | null;
  /** Sumas y muestras de las métricas que pueden faltar. */
  stats: Map<string, { suma: number; n: number }>;
}

const nuevoEquipo = (): TeamAcc => ({
  played: 0,
  playedHome: 0,
  playedAway: 0,
  points: 0,
  pointsHome: 0,
  pointsAway: 0,
  gfHome: 0,
  gaHome: 0,
  gfAway: 0,
  gaAway: 0,
  last: [],
  lastDate: null,
  stats: new Map(),
});

const media = (a: TeamAcc, clave: string): number | null => {
  const s = a.stats.get(clave);
  return s && s.n > 0 ? s.suma / s.n : null;
};

const sumar = (a: TeamAcc, clave: string, valor: number | null) => {
  if (valor === null) return;
  const s = a.stats.get(clave) ?? { suma: 0, n: 0 };
  s.suma += valor;
  s.n++;
  a.stats.set(clave, s);
};

const puntos = (gf: number, ga: number) => (gf > ga ? 3 : gf === ga ? 1 : 0);

const mediaUltimos = (a: TeamAcc, n: number, campo: 'points' | 'gf' | 'ga'): number | null => {
  const xs = a.last.slice(-n);
  return xs.length ? xs.reduce((s, x) => s + x[campo], 0) / xs.length : null;
};

const dias = (desde: string | null, hasta: string): number | null => {
  if (!desde) return null;
  const d = (Date.parse(hasta) - Date.parse(desde)) / 86_400_000;
  return Number.isFinite(d) ? Math.min(Math.max(d, 0), 14) : null;
};

/** Acumulador de una liga: sus equipos, su Elo y su contexto. */
interface LeagueAcc {
  teams: Map<string, TeamAcc>;
  elo: EloTable;
  matches: number;
  goals: number;
  homePoints: number;
  awayPoints: number;
  /** `local|visitante` → [goles local, goles visitante, partidos] de sus duelos previos. */
  h2h: Map<string, { diff: number; n: number }>;
}

const nuevaLiga = (): LeagueAcc => ({
  teams: new Map(),
  elo: new EloTable(),
  matches: 0,
  goals: 0,
  homePoints: 0,
  awayPoints: 0,
  h2h: new Map(),
});

const equipo = (l: LeagueAcc, id: string): TeamAcc => {
  const t = l.teams.get(id) ?? nuevoEquipo();
  l.teams.set(id, t);
  return t;
};

/** Estado acumulado tras recorrer un histórico: sirve para predecir partidos que aún no se han jugado. */
export interface DatasetState {
  ligas: Map<string, LeagueAcc>;
}

/** Clave del duelo, sin condición: los dos ids ordenados. */
const claveH2h = (a: string, b: string) => [a, b].sort().join('||');

/** Las variables de un enfrentamiento con lo que la liga tiene acumulado en este momento. */
function variables(
  l: LeagueAcc,
  local: TeamAcc,
  visitante: TeamAcc,
  homeTeamId: string,
  awayTeamId: string,
  date: string,
): Features {
  const h2h = l.h2h.get(claveH2h(homeTeamId, awayTeamId));
  return {
    eloHome: l.elo.get(homeTeamId),
    eloAway: l.elo.get(awayTeamId),
    eloDiff: l.elo.get(homeTeamId) - l.elo.get(awayTeamId),
    playedHome: local.played,
    playedAway: visitante.played,
    playedHomeAtHome: local.playedHome,
    playedAwayAtAway: visitante.playedAway,
    ppgHome: local.played ? local.points / local.played : null,
    ppgAway: visitante.played ? visitante.points / visitante.played : null,
    ppgHomeAtHome: local.playedHome ? local.pointsHome / local.playedHome : null,
    ppgAwayAtAway: visitante.playedAway ? visitante.pointsAway / visitante.playedAway : null,
    gfHomeAtHome: local.playedHome ? local.gfHome / local.playedHome : null,
    gaHomeAtHome: local.playedHome ? local.gaHome / local.playedHome : null,
    gfAwayAtAway: visitante.playedAway ? visitante.gfAway / visitante.playedAway : null,
    gaAwayAtAway: visitante.playedAway ? visitante.gaAway / visitante.playedAway : null,
    form5Home: mediaUltimos(local, 5, 'points'),
    form5Away: mediaUltimos(visitante, 5, 'points'),
    gf5Home: mediaUltimos(local, 5, 'gf'),
    ga5Home: mediaUltimos(local, 5, 'ga'),
    gf5Away: mediaUltimos(visitante, 5, 'gf'),
    ga5Away: mediaUltimos(visitante, 5, 'ga'),
    xgForHome: media(local, 'xgFor'),
    xgAgainstHome: media(local, 'xgAgainst'),
    xgForAway: media(visitante, 'xgFor'),
    xgAgainstAway: media(visitante, 'xgAgainst'),
    shotsHome: media(local, 'shots'),
    shotsAway: media(visitante, 'shots'),
    sotHome: media(local, 'sot'),
    sotAway: media(visitante, 'sot'),
    possessionHome: media(local, 'possession'),
    possessionAway: media(visitante, 'possession'),
    cornersHome: media(local, 'corners'),
    cornersAway: media(visitante, 'corners'),
    cardsHome: media(local, 'cards'),
    cardsAway: media(visitante, 'cards'),
    restHome: dias(local.lastDate, date),
    restAway: dias(visitante.lastDate, date),
    h2hMatches: h2h?.n ?? 0,
    h2hGoalDiff: h2h && h2h.n > 0 ? h2h.diff / h2h.n : null,
    leagueGoals: l.matches ? l.goals / l.matches : null,
    leagueHomeEdge: l.matches ? (l.homePoints - l.awayPoints) / l.matches : null,
  };
}

/** Fila de un partido con lo acumulado ANTES de él. */
function filaDe(l: LeagueAcc, m: Match): SampleRow {
  const local = equipo(l, m.homeTeamId);
  const visitante = equipo(l, m.awayTeamId);
  const hg = m.homeGoals!;
  const ag = m.awayGoals!;
  return {
    matchId: m.id,
    leagueId: m.leagueId,
    date: m.date,
    homeTeamId: m.homeTeamId,
    awayTeamId: m.awayTeamId,
    features: variables(l, local, visitante, m.homeTeamId, m.awayTeamId, m.date),
    labels: {
      result: hg > ag ? '1' : hg === ag ? 'X' : '2',
      homeGoals: hg,
      awayGoals: ag,
      totalGoals: hg + ag,
      btts: hg > 0 && ag > 0 ? 1 : 0,
    },
  };
}

/** Pasa el resultado de un partido a los acumuladores de su liga. */
function aplicar(l: LeagueAcc, m: Match): void {
  const local = equipo(l, m.homeTeamId);
  const visitante = equipo(l, m.awayTeamId);
  const hg = m.homeGoals!;
  const ag = m.awayGoals!;
  const pLocal = puntos(hg, ag);
  const pVisitante = puntos(ag, hg);

  local.played++;
  local.playedHome++;
  local.points += pLocal;
  local.pointsHome += pLocal;
  local.gfHome += hg;
  local.gaHome += ag;
  local.last.push({ points: pLocal, gf: hg, ga: ag });
  local.lastDate = m.date;

  visitante.played++;
  visitante.playedAway++;
  visitante.points += pVisitante;
  visitante.pointsAway += pVisitante;
  visitante.gfAway += ag;
  visitante.gaAway += hg;
  visitante.last.push({ points: pVisitante, gf: ag, ga: hg });
  visitante.lastDate = m.date;

  sumar(local, 'xgFor', m.xGHome);
  sumar(local, 'xgAgainst', m.xGAway);
  sumar(visitante, 'xgFor', m.xGAway);
  sumar(visitante, 'xgAgainst', m.xGHome);
  sumar(local, 'shots', m.shotsHome);
  sumar(visitante, 'shots', m.shotsAway);
  sumar(local, 'sot', m.shotsOnTargetHome);
  sumar(visitante, 'sot', m.shotsOnTargetAway);
  sumar(local, 'possession', m.possessionHome);
  sumar(visitante, 'possession', m.possessionHome === null ? null : 1 - m.possessionHome);
  sumar(local, 'corners', m.cornersHome);
  sumar(visitante, 'corners', m.cornersAway);
  sumar(local, 'cards', m.yellowCardsHome);
  sumar(visitante, 'cards', m.yellowCardsAway);

  l.matches++;
  l.goals += hg + ag;
  l.homePoints += pLocal;
  l.awayPoints += pVisitante;
  const k = claveH2h(m.homeTeamId, m.awayTeamId);
  const previo = l.h2h.get(k) ?? { diff: 0, n: 0 };
  // La diferencia se guarda desde el punto de vista del local de ESTE partido.
  previo.diff += hg - ag;
  previo.n++;
  l.h2h.set(k, previo);

  l.elo.update(m.homeTeamId, m.awayTeamId, hg, ag);
}

/**
 * Dataset de una lista de partidos, con el estado acumulado al final (sirve para predecir los
 * pendientes). Los partidos se ordenan por fecha y se procesan por días completos: dentro de un día
 * nadie ve a nadie.
 *
 * Solo entran los partidos que cuentan para el análisis (`countsForAnalysis`): un resultado adjudicado
 * por decisión no es un partido jugado.
 */
export function buildDatasetWithState(matches: Match[]): { rows: SampleRow[]; state: DatasetState } {
  const jugados = matches
    .filter((m) => countsForAnalysis(m) && m.homeGoals !== null && m.awayGoals !== null)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  const ligas = new Map<string, LeagueAcc>();
  const rows: SampleRow[] = [];

  for (let i = 0; i < jugados.length; ) {
    const fecha = jugados[i].date;
    const delDia: Match[] = [];
    while (i < jugados.length && jugados[i].date === fecha) delDia.push(jugados[i++]);

    // 1. Las variables de todos los partidos del día se calculan con lo anterior al día.
    for (const m of delDia) {
      const l = ligas.get(m.leagueId) ?? nuevaLiga();
      ligas.set(m.leagueId, l);
      rows.push(filaDe(l, m));
    }
    // 2. Terminado el día, sus resultados pasan a los acumuladores.
    for (const m of delDia) aplicar(ligas.get(m.leagueId)!, m);
  }

  return { rows, state: { ligas } };
}

export const buildDataset = (matches: Match[]): SampleRow[] => buildDatasetWithState(matches).rows;

/**
 * Variables de un partido que aún no se ha jugado: el mismo recorrido, pero la fila se calcula con
 * TODO lo jugado. Devuelve `null` si alguno de los dos equipos no tiene ningún partido en la base.
 */
export function featuresForFixture(
  dataset: DatasetState,
  fixture: { leagueId: string; homeTeamId: string; awayTeamId: string; date: string },
): Features | null {
  const l = dataset.ligas.get(fixture.leagueId);
  const local = l?.teams.get(fixture.homeTeamId);
  const visitante = l?.teams.get(fixture.awayTeamId);
  if (!l || !local || !visitante) return null;
  return variables(l, local, visitante, fixture.homeTeamId, fixture.awayTeamId, fixture.date);
}

/** Elo de partida, para que un equipo desconocido valga lo mismo en todas partes. */
export { ELO_INICIAL };
