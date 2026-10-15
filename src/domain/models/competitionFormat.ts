/**
 * Formato de calendario de cada competición. No todas juegan una liga de ida y vuelta de agosto a mayo.
 *
 * Qué publica de verdad cada fuente se midió el 19/09/2026 sobre el calendario completo de la temporada en
 * curso de las 32 competiciones (`fixtures.allMatches` de FotMob, más la web oficial donde la hay). De ahí
 * salen `shape`, `regularRounds` y `stages`; `structure` es como lo describe la propia competición.
 *
 * Lo importante para la aplicación: hay competiciones cuya fase final VUELVE A EMPEZAR por la jornada 1.
 * En la LigaPro de Ecuador, la fase final se juega en tres grupos a la vez («Championship Round»,
 * «Relegation Round», «Copa Sudamericana Play-off») y cada uno numera sus jornadas desde 1. Sin la fase, la
 * jornada 1 del hexagonal y la 1 de febrero serían la misma jornada. Por eso el partido guarda `phase` tal
 * como la nombra su fuente, y la jornada solo es única dentro de su fase.
 *
 * Para añadir una competición: una entrada más aquí, con lo que se haya medido de su fuente.
 */
import type { Fixture, League, Match } from '../../types';
import { espnLeagueId } from './espnLeagues';

export type SeasonShape =
  /** Temporada europea a caballo de dos años (ago–may), una sola tabla. */
  | 'cruzada'
  /** Año calendario, una sola tabla. */
  | 'anio'
  /** Año calendario partido en torneos independientes (Apertura/Clausura), cada uno con su tabla. */
  | 'torneos'
  /** Fase regular y después fases finales (hexagonales, playoffs, cuadrangulares) con numeración propia. */
  | 'fases';

export interface CompetitionFormat {
  shape: SeasonShape;
  /** Liga nacional o competición continental de clubes. */
  kind: 'liga' | 'continental';
  /** Cómo describe la competición su propio calendario. Se enseña en Competiciones. */
  structure: string;
  /** Jornadas de la fase regular según la fuente. `null` si no se ha medido. */
  regularRounds: number | null;
  /**
   * Etapas de la fase regular cuando la competición las numera por separado pero la fuente las publica
   * de corrido. Solo con lo documentado por la competición.
   */
  stages?: { name: string; rounds: number }[];
  /** Qué viene después de la fase regular: playoffs, hexagonal, liguilla, eliminatorias. `null` si nada. */
  finalStage: string | null;
  /** La fase regular se juega en grupos o conferencias en vez de en una sola tabla. */
  groups: boolean;
  /** Se puede ascender a ella o desde ella. `null` cuando no está documentado aquí. */
  promotion: boolean | null;
  /** Hay descenso. `null` cuando no está documentado aquí. */
  relegation: boolean | null;
  /** Particularidad que conviene saber al leer sus números. */
  note: string | null;
}

/**
 * Las 32 competiciones, por identificador de ESPN (`espnLeagueId`).
 *
 * `shape`, `regularRounds` y `stages` salen de lo MEDIDO en las fuentes el 19/09/2026. El resto
 * (`kind`, `finalStage`, `groups`, `promotion`, `relegation`, `note`) es la estructura publicada por cada
 * competición: no se mide en los partidos, se documenta aquí. Donde algo no está claro va `null`, que se
 * enseña como «sin documentar», nunca como un supuesto.
 *
 * El número de equipos NO esta aqui a propósito: se cuenta de los partidos cargados, así siempre es el
 * real y no se queda viejo cuando una liga cambia de tamaño.
 */
export const COMPETITION_FORMATS: Record<string, CompetitionFormat> = {
  'eng.1': { shape: 'cruzada', kind: 'liga', structure: 'Liga de ida y vuelta (ago–may)', regularRounds: 38, finalStage: null, groups: false, promotion: false, relegation: true, note: null },
  'eng.2': { shape: 'cruzada', kind: 'liga', structure: 'Liga de ida y vuelta (ago–may)', regularRounds: 46, finalStage: 'Play-offs de ascenso entre el 3.º y el 6.º', groups: false, promotion: true, relegation: true, note: '46 jornadas: es la liga mas larga de las 32' },
  'esp.1': { shape: 'cruzada', kind: 'liga', structure: 'Liga de ida y vuelta (ago–may)', regularRounds: 38, finalStage: null, groups: false, promotion: false, relegation: true, note: null },
  'ita.1': { shape: 'cruzada', kind: 'liga', structure: 'Liga de ida y vuelta (ago–may)', regularRounds: 38, finalStage: null, groups: false, promotion: false, relegation: true, note: null },
  'ger.1': { shape: 'cruzada', kind: 'liga', structure: 'Liga de ida y vuelta (ago–may)', regularRounds: 34, finalStage: null, groups: false, promotion: false, relegation: true, note: '18 equipos: 34 jornadas, no 38' },
  'fra.1': { shape: 'cruzada', kind: 'liga', structure: 'Liga de ida y vuelta (ago–may)', regularRounds: 34, finalStage: null, groups: false, promotion: false, relegation: true, note: null },
  'ned.1': { shape: 'cruzada', kind: 'liga', structure: 'Liga de ida y vuelta (ago–may)', regularRounds: 34, finalStage: 'Play-offs europeos y de permanencia', groups: false, promotion: true, relegation: true, note: null },
  'por.1': { shape: 'cruzada', kind: 'liga', structure: 'Liga de ida y vuelta (ago–may)', regularRounds: 34, finalStage: null, groups: false, promotion: false, relegation: true, note: null },
  'den.1': { shape: 'fases', kind: 'liga', structure: '22 jornadas y después playoffs por el título y por la permanencia', regularRounds: 22, finalStage: 'Meisterskabsspil (título) y Nedrykningsspil (descenso)', groups: false, promotion: true, relegation: true, note: 'Los puntos de la fase regular se arrastran a los playoffs' },
  'bel.1': { shape: 'fases', kind: 'liga', structure: '34 jornadas y después playoffs (Champions, Europe, Relegation)', regularRounds: 34, finalStage: 'Champions, Europe y Relegation play-offs', groups: false, promotion: true, relegation: true, note: 'En los Champions play-offs los puntos se dividen por la mitad' },
  'tur.1': { shape: 'cruzada', kind: 'liga', structure: 'Liga de ida y vuelta (ago–may)', regularRounds: 34, finalStage: null, groups: false, promotion: false, relegation: true, note: null },
  'aut.1': { shape: 'fases', kind: 'liga', structure: '22 jornadas y después grupo de campeónato y grupo de descenso', regularRounds: 22, finalStage: 'Meistergruppe y Qualifikationsgruppe', groups: false, promotion: true, relegation: true, note: 'Al dividirse, los puntos se reducen a la mitad' },
  'gre.1': { shape: 'fases', kind: 'liga', structure: '26 jornadas y después playoffs y playouts', regularRounds: 26, finalStage: 'Play-offs por el título y play-outs por la permanencia', groups: false, promotion: true, relegation: true, note: null },
  'nor.1': { shape: 'anio', kind: 'liga', structure: 'Año calendario (mar–dic), ida y vuelta', regularRounds: 30, finalStage: null, groups: false, promotion: true, relegation: true, note: null },
  'pol.1': { shape: 'cruzada', kind: 'liga', structure: 'Liga de ida y vuelta (jul–may)', regularRounds: 34, finalStage: null, groups: false, promotion: true, relegation: true, note: null },
  'sco.1': { shape: 'fases', kind: 'liga', structure: '33 jornadas y después división en dos grupos de seis', regularRounds: 33, finalStage: 'Division en dos grupos de seis (5 jornadas más)', groups: false, promotion: true, relegation: true, note: 'Se juegan 38 jornadas: 33 antes de la división y 5 después' },
  'sui.1': { shape: 'fases', kind: 'liga', structure: '22 jornadas y después grupo de campeónato y grupo de descenso', regularRounds: 22, finalStage: 'Championship Round y Relegation Round', groups: false, promotion: true, relegation: true, note: null },
  'swe.1': { shape: 'anio', kind: 'liga', structure: 'Año calendario (mar–nov), ida y vuelta', regularRounds: 30, finalStage: null, groups: false, promotion: true, relegation: true, note: null },
  'bra.1': { shape: 'anio', kind: 'liga', structure: 'Año calendario (abr–dic), ida y vuelta', regularRounds: 38, finalStage: null, groups: false, promotion: true, relegation: true, note: 'Sin playoffs: campeón por puntos' },
  'arg.1': { shape: 'torneos', kind: 'liga', structure: 'Año calendario con dos torneos (Apertura y Clausura) y sus playoffs', regularRounds: null, finalStage: 'Octavos, cuartos, semifinales y final de cada torneo', groups: true, promotion: true, relegation: true, note: 'Fase regular en dos zonas y descenso por promedios de varias temporadas' },
  'col.1': { shape: 'torneos', kind: 'liga', structure: 'Año calendario con dos torneos (Apertura y Finalización)', regularRounds: 19, finalStage: 'Cuadrangulares semifinales y final', groups: false, promotion: true, relegation: true, note: 'El campeón sale de los cuadrangulares, no de la tabla de 19 jornadas' },
  'chi.1': { shape: 'anio', kind: 'liga', structure: 'Año calendario (feb–dic), ida y vuelta', regularRounds: 30, finalStage: null, groups: false, promotion: true, relegation: true, note: null },
  'par.1': { shape: 'torneos', kind: 'liga', structure: 'Año calendario con dos torneos (Apertura y Clausura)', regularRounds: 22, finalStage: null, groups: false, promotion: true, relegation: true, note: 'Descenso por promedio de tres temporadas' },
  'uru.1': { shape: 'torneos', kind: 'liga', structure: 'Año calendario con Apertura, Intermedio y Clausura', regularRounds: 15, finalStage: 'Final entre los campeónes de cada torneo y el mejor de la tabla anual', groups: false, promotion: true, relegation: true, note: 'Tres torneos en el año, no dos' },
  'ven.1': { shape: 'torneos', kind: 'liga', structure: 'Año calendario con dos torneos (Apertura y Clausura) y fase final', regularRounds: null, finalStage: 'Fase final entre los mejores de cada torneo', groups: true, promotion: true, relegation: true, note: 'La fuente no publica una numeración de jornadas estable para la fase regular' },
  'bol.1': { shape: 'torneos', kind: 'liga', structure: 'Año calendario con dos torneos (Apertura y Clausura)', regularRounds: 22, finalStage: null, groups: false, promotion: true, relegation: true, note: null },
  'ecu.1': { shape: 'fases', kind: 'liga', structure: 'Año calendario: 2 etapas de 15 jornadas y fase final en tres grupos a la vez', regularRounds: 30, stages: [{ name: '1.ª etapa', rounds: 15 }, { name: '2.ª etapa', rounds: 15 }], finalStage: 'Championship Round, Relegation Round y Copa Sudamericana Play-off, los tres a la vez', groups: false, promotion: true, relegation: true, note: 'Los tres grupos de la fase final numeran sus jornadas desde 1, igual que la fase regular' },
  'mex.1': { shape: 'torneos', kind: 'liga', structure: 'Dos torneos por temporada (Apertura y Clausura) de 17 jornadas', regularRounds: 17, finalStage: 'Play-in y liguilla (cuartos, semifinales y final)', groups: false, promotion: false, relegation: true, note: 'Descenso suspendido en la práctica: se paga una multa en su lugar' },
  'usa.1': { shape: 'anio', kind: 'liga', structure: 'Año calendario (feb–oct) por conferencias', regularRounds: 34, finalStage: 'Play-offs de la MLS Cup', groups: true, promotion: false, relegation: false, note: 'Dos conferencias con tablas separadas y sin descenso' },
  'uefa.champions': { shape: 'cruzada', kind: 'continental', structure: 'Fase de liga a 8 jornadas y después eliminatorias', regularRounds: 8, finalStage: 'Play-off, octavos, cuartos, semifinales y final', groups: false, promotion: false, relegation: false, note: 'Desde 2024 una sola tabla de 36 equipos, no grupos de cuatro' },
  'uefa.europa': { shape: 'cruzada', kind: 'continental', structure: 'Fase de liga a 8 jornadas y después eliminatorias', regularRounds: 8, finalStage: 'Play-off, octavos, cuartos, semifinales y final', groups: false, promotion: false, relegation: false, note: 'Una sola tabla de 36 equipos' },
  'uefa.europa.conf': { shape: 'cruzada', kind: 'continental', structure: 'Fase de liga a 6 jornadas y después eliminatorias', regularRounds: 6, finalStage: 'Play-off, octavos, cuartos, semifinales y final', groups: false, promotion: false, relegation: false, note: 'Seis jornadas, no ocho como en las otras dos' },
};

/** Competición sin formato medido: se trata como una liga corrida, sin inventarle fases. */
const POR_DEFECTO: CompetitionFormat = {
  shape: 'cruzada',
  kind: 'liga',
  structure: '',
  regularRounds: null,
  finalStage: null,
  groups: false,
  promotion: null,
  relegation: null,
  note: null,
};

export function competitionFormat(league: Pick<League, 'name' | 'country'> | undefined): CompetitionFormat {
  const slug = league ? espnLeagueId(league.name, league.country) : null;
  return (slug && COMPETITION_FORMATS[slug]) || POR_DEFECTO;
}

type Jugado = Pick<Match | Fixture, 'round'> & { phase?: string | null };

/**
 * Clave única de una jornada dentro de su competición. Dos partidos con la misma jornada pero distinta
 * fase NO son de la misma jornada: el hexagonal empieza otra vez por la 1.
 */
export const roundKey = (m: Jugado): string => `${m.phase ?? ''}|${m.round}`;

/** Etapa de la fase regular a la que cae una jornada, si la competición las numera por separado. */
export function stageOf(round: number, format: CompetitionFormat): { name: string; round: number } | null {
  if (!format.stages) return null;
  let desde = 0;
  for (const etapa of format.stages) {
    if (round <= desde + etapa.rounds) return { name: etapa.name, round: round - desde };
    desde += etapa.rounds;
  }
  return null;
}

/**
 * Cómo se llama esta jornada: «J12», «Clausura · J3», «2.ª etapa · J1».
 *
 * La fase es la que publica la fuente, con su nombre, sin traducir: es un dato, no una interpretación.
 */
export function roundLabel(m: Jugado, league?: Pick<League, 'name' | 'country'>): string {
  if (m.phase) return `${m.phase} · J${m.round}`;
  const etapa = stageOf(m.round, competitionFormat(league));
  return etapa ? `${etapa.name} · J${etapa.round}` : `J${m.round}`;
}

/** Explicación larga para un `title`: incluye la jornada tal como la numera la fuente. */
export function roundTitle(m: Jugado, league?: Pick<League, 'name' | 'country'>): string {
  const f = competitionFormat(league);
  const etapa = m.phase ? null : stageOf(m.round, f);
  const partes = [f.structure].filter(Boolean);
  if (m.phase) partes.push(`Fase «${m.phase}», jornada ${m.round} de esa fase`);
  else if (etapa) partes.push(`${etapa.name}, jornada ${etapa.round} (jornada ${m.round} en la numeración de la fuente)`);
  else partes.push(`Jornada ${m.round}`);
  return partes.join(' · ');
}

/** El formato entero en una frase: para el tooltip de Competiciones y su ficha. */
export function describeFormat(f: CompetitionFormat): string {
  const partes: string[] = [f.structure || 'Formato sin documentar'];
  if (f.regularRounds !== null) partes.push(`${f.regularRounds} jornadas de fase regular`);
  if (f.groups) partes.push('fase regular en grupos o conferencias');
  if (f.finalStage) partes.push(`después: ${f.finalStage}`);
  const movimiento = [f.promotion ? 'con ascenso' : null, f.relegation ? 'con descenso' : null].filter(Boolean);
  if (movimiento.length) partes.push(movimiento.join(' y '));
  else if (f.promotion === false && f.relegation === false) partes.push('sin ascenso ni descenso');
  if (f.note) partes.push(f.note);
  return partes.join(' · ');
}

/** Etiqueta corta del tipo de temporada, para las fichas. */
export const SHAPE_LABEL: Record<SeasonShape, string> = {
  cruzada: 'Temporada europea (dos años naturales)',
  anio: 'Año calendario',
  torneos: 'Año calendario con varios torneos',
  fases: 'Fase regular y fases finales',
};
