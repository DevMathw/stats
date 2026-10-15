/**
 * Mercados: probabilidad estimada, calidad de datos, liquidación y correlación.
 * PICKS_METHODOLOGY.md §2 y §5.
 *
 * Ninguna probabilidad nueva sale de fuera del modelo existente:
 *  - 1X2 y doble oportunidad: `probs1x2` de la proyección (sumas de sus resultados).
 *  - Goles, BTTS, goles por equipo y portería a cero: Poisson con las λ de la proyección.
 *  - Hándicaps y empate no válido: el signo del 1X2 del modelo con el tamaño del margen de Poisson
 *    (goalDifference.ts), así el hándicap −0.5 del local vale exactamente lo mismo que «gana el local».
 *  - Corners y tarjetas: su valor esperado de la proyección con la dispersión de la liga.
 *  - Goles por parte: Poisson con la λ de cada parte de la proyección (λ total × proporción de la liga).
 *
 * Líneas enteras (goles asiáticos, hándicap asiático 0 / ±1 / ±2): con el resultado justo en la línea se
 * devuelve el stake. `probability` es entonces P(gana) / (P(gana) + P(pierde)), la que paga la cuota, y
 * `push` es P(devolución).
 */
import type { EventRef, CorrelationLevel, DataQuality, MarketFamily, Selection } from '../../types/betting';
import type { Fixture, Match, MatchProjection, ModelParams, SplitStats } from '../../types';
import { cornersTotal, hasResult, shotsOnTargetTotal, shotsTotal, totalGoals, yellowCardsTotal } from '../calculations/matchDerived';
import { calculateBTTSProbability, calculateCleanSheetProbability, calculateOverProbability, poissonPmf } from '../probability/poisson';
import { goalDifferenceDistribution, MAX_GOALS } from '../probability/goalDifference';
import {
  countDistribution,
  countOverProbability,
  countQuantile,
  type CountDistribution,
  type Dispersion,
} from '../probability/negativeBinomial';
import { shrinkWeight } from '../probability/shrink';

/** Partidos mínimos de la liga con el dato para medir su dispersión. */
export const MIN_LEAGUE_COUNT_SAMPLE = 20;

/**
 * Los mercados de CONTEO: misma matemática (binomial negativa con la dispersión medida de la liga,
 * `countDistribution`), distinta variable. Están en una tabla y no en cuatro ramas de cada `switch`
 * porque lo único que cambia entre ellos es de dónde sale la media, de dónde la muestra y cómo se
 * liquidan.
 *
 * `maxZeroShare` es la fracción de partidos con total 0 que se acepta como dato real; por encima, la
 * fuente está publicando 0 cuando no registra la estadística (medido el 13/09/2026: Bolivia, Chile,
 * Paraguay, Colombia y FUTVE tenían 0 tarjetas en el 100 % de sus partidos) y el mercado no se evalúa.
 * Cada umbral lleva al lado lo que se mide hoy en los 26.921 partidos de la base (14/10/2026), para que
 * se vea el margen que tiene.
 *
 * Las líneas salen de los percentiles 10 a 90 de esa misma medición, no de una impresión.
 */
export const COUNT_MARKETS = {
  corners: {
    label: 'Corners',
    unidad: 'corners',
    /** Clave del agregado en `SplitStats`: de ahí sale la muestra del equipo. */
    agg: 'corners',
    total: 'expectedCornersTotal',
    home: 'expectedCornersHome',
    away: 'expectedCornersAway',
    /** total: media 9,82 · φ 1,19 · 0,0 % de ceros */
    maxZeroShare: 0.05,
    lines: [6.5, 7.5, 8.5, 9.5, 10.5, 11.5, 12.5, 13.5],
    /** por equipo: media 4,91 · φ 1,65 · 2,4 % de ceros */
    teamMaxZeroShare: 0.15,
    teamLines: [1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5],
  },
  tarjetas: {
    label: 'Tarjetas amarillas',
    unidad: 'tarjetas amarillas',
    agg: 'cards',
    total: 'expectedCardsTotal',
    home: 'expectedCardsHome',
    away: 'expectedCardsAway',
    /** total: media 4,40 · φ 1,16 · 1,8 % de ceros */
    maxZeroShare: 0.1,
    lines: [1.5, 2.5, 3.5, 4.5, 5.5, 6.5],
    /** por equipo: media 2,20 · φ 0,97 · 10,6 % de ceros. Que un equipo no vea una amarilla es corriente,
     * así que aquí el umbral de ceros tiene que ser mucho más alto que en el total o el mercado no se
     * evaluaría nunca. */
    teamMaxZeroShare: 0.35,
    teamLines: [0.5, 1.5, 2.5, 3.5, 4.5],
  },
  tiros: {
    label: 'Tiros',
    unidad: 'tiros',
    agg: 'shots',
    total: 'expectedShotsTotal',
    home: 'expectedShotsHome',
    away: 'expectedShotsAway',
    /** total: media 25,97 · φ 1,42 · 0,0 % de ceros: un partido sin un solo tiro no existe */
    maxZeroShare: 0.02,
    lines: [20.5, 22.5, 24.5, 26.5, 28.5, 30.5],
    /** por equipo: media 12,98 · φ 2,18 · 0,0 % de ceros */
    teamMaxZeroShare: 0.05,
    teamLines: [8.5, 10.5, 12.5, 14.5, 16.5],
  },
  sot: {
    label: 'Tiros a puerta',
    unidad: 'tiros a puerta',
    agg: 'shotsOnTarget',
    total: 'expectedSotTotal',
    home: 'expectedSotHome',
    away: 'expectedSotAway',
    /** total: media 8,86 · φ 1,17 · 0,0 % de ceros */
    maxZeroShare: 0.02,
    lines: [5.5, 6.5, 7.5, 8.5, 9.5, 10.5, 11.5],
    /** por equipo: media 4,43 · φ 1,38 · 2,3 % de ceros */
    teamMaxZeroShare: 0.15,
    teamLines: [2.5, 3.5, 4.5, 5.5, 6.5],
  },
} as const satisfies Record<string, {
  label: string;
  unidad: string;
  agg: 'corners' | 'cards' | 'shots' | 'shotsOnTarget';
  total: 'expectedCornersTotal' | 'expectedCardsTotal' | 'expectedShotsTotal' | 'expectedSotTotal';
  home: 'expectedCornersHome' | 'expectedCardsHome' | 'expectedShotsHome' | 'expectedSotHome';
  away: 'expectedCornersAway' | 'expectedCardsAway' | 'expectedShotsAway' | 'expectedSotAway';
  maxZeroShare: number;
  lines: readonly number[];
  teamMaxZeroShare: number;
  teamLines: readonly number[];
}>;

export type CountMarket = keyof typeof COUNT_MARKETS;

export const isCountMarket = (m: string): m is CountMarket => m in COUNT_MARKETS;

/** La misma pregunta sobre la selección entera: así TypeScript estrecha `sel` y no solo `sel.market`. */
export const esConteo = (s: Selection): s is Selection & { market: CountMarket; side: 'over' | 'under'; line: number } =>
  isCountMarket(s.market);

export const COUNT_MARKET_IDS = Object.keys(COUNT_MARKETS) as CountMarket[];

/** El total de un mercado de conteo en un partido jugado. `null` si la fuente no lo publicó. */
export const COUNT_TEAM: Record<CountMarket, (m: Match, team: 'home' | 'away') => number | null> = {
  corners: (m, t) => (t === 'home' ? m.cornersHome : m.cornersAway),
  tarjetas: (m, t) => (t === 'home' ? m.yellowCardsHome : m.yellowCardsAway),
  tiros: (m, t) => (t === 'home' ? m.shotsHome : m.shotsAway),
  sot: (m, t) => (t === 'home' ? m.shotsOnTargetHome : m.shotsOnTargetAway),
};

/** Clave de la dispersión POR EQUIPO de un conteo: la varianza de un equipo no es la del total. */
export const teamDispersionKey = (stat: CountMarket) => `${stat}Equipo` as const;

export type CountDispersionKey = CountMarket | ReturnType<typeof teamDispersionKey>;

export const COUNT_TOTAL: Record<CountMarket, (m: Match) => number | null> = {
  corners: cornersTotal,
  tarjetas: yellowCardsTotal,
  tiros: shotsTotal,
  sot: shotsOnTargetTotal,
};

export const MARKET_LINES = {
  goles: [0.5, 1.5, 2.5, 3.5, 4.5, 5.5],
  /** Líneas asiáticas de goles: con el total exacto se devuelve el stake. */
  golesAsiaticas: [1, 2, 3, 4],
  mitad: [0.5, 1.5, 2.5],
  equipo: [0.5, 1.5, 2.5, 3.5],
  asiatico: [-2.5, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5],
  europeo: [-3, -2, -1, 1, 2, 3],
  corners: COUNT_MARKETS.corners.lines,
  tarjetas: COUNT_MARKETS.tarjetas.lines,
  tiros: COUNT_MARKETS.tiros.lines,
  sot: COUNT_MARKETS.sot.lines,
} as const;

export const FAMILY_LABEL: Record<MarketFamily, string> = {
  resultado: 'Resultado (1X2)',
  doble: 'Doble oportunidad',
  goles: 'Goles',
  mitad: 'Goles por parte',
  btts: 'Ambos marcan',
  asiatico: 'Hándicap asiático',
  europeo: 'Hándicap europeo',
  equipo: 'Goles por equipo',
  cero: 'Portería a cero',
  corners: COUNT_MARKETS.corners.label,
  tarjetas: COUNT_MARKETS.tarjetas.label,
  tiros: COUNT_MARKETS.tiros.label,
  sot: COUNT_MARKETS.sot.label,
  conteoEquipo: 'Corners, tarjetas y tiros por equipo',
};

export const HALF_LABEL = { 1: '1.ª parte', 2: '2.ª parte' } as const;

export function isHalfLine(x: number): boolean {
  return Number.isFinite(x) && x > 0 && Math.abs((x % 1) - 0.5) < 1e-9;
}

/** −1.5 → «−1.5», 1 → «+1», 0 → «0». */
export function formatLine(x: number): string {
  return x > 0 ? `+${x}` : x < 0 ? `−${-x}` : '0';
}

/** ¿Puede acabar en devolución del stake? Las líneas enteras de goles y del hándicap asiático. */
export function canPush(s: Selection): boolean {
  return (s.market === 'goles' || s.market === 'asiatico') && Number.isInteger(s.line);
}

/** Líneas admitidas. Sin cuartos de línea (x.25, x.75): se liquidan a medias y aquí no se simulan. */
export function isValidSelection(s: Selection): boolean {
  switch (s.market) {
    case 'goles':
      return s.line > 0 && s.line <= 10 && (isHalfLine(s.line) || Number.isInteger(s.line));
    case 'equipo':
      return isHalfLine(s.line) && s.line <= 5.5;
    case 'mitad':
      return (s.half === 1 || s.half === 2) && isHalfLine(s.line) && s.line <= 3.5;
    case 'corners':
    case 'tarjetas':
    case 'tiros':
    case 'sot':
      return isHalfLine(s.line);
    case 'conteoEquipo':
      return isCountMarket(s.stat) && isHalfLine(s.line);
    case 'asiatico':
      return Number.isInteger(s.line * 2) && Math.abs(s.line) <= 5;
    case 'europeo':
      return Number.isInteger(s.line) && s.line !== 0 && Math.abs(s.line) <= 5;
    default:
      return true;
  }
}

export function selectionKey(s: Selection): string {
  switch (s.market) {
    case 'resultado':
    case 'doble':
    case 'btts':
      return `${s.market}:${s.outcome}`;
    case 'asiatico':
      return `asiatico:${s.team}:${s.line}`;
    case 'europeo':
      return `europeo:${s.line}:${s.outcome}`;
    case 'equipo':
      return `equipo:${s.team}:${s.side}:${s.line}`;
    case 'cero':
      return `cero:${s.team}:${s.outcome}`;
    case 'mitad':
      return `mitad:${s.half}:${s.side}:${s.line}`;
    case 'conteoEquipo':
      return `conteoEquipo:${s.stat}:${s.team}:${s.side}:${s.line}`;
    default:
      return `${s.market}:${s.side}:${s.line}`;
  }
}

export function parseSelectionKey(key: string): Selection | null {
  const partes = key.split(':');
  // El conteo de un equipo lleva una parte mas (la variable), asi que se lee aparte.
  if (partes[0] === 'conteoEquipo') {
    const [, stat, team, side, line, ...sobra] = partes;
    if (sobra.length || !isCountMarket(stat) || (team !== 'home' && team !== 'away') || (side !== 'over' && side !== 'under')) return null;
    const sel: Selection = { market: 'conteoEquipo', stat, team, side, line: Number(line) };
    return line !== undefined && line.trim() !== '' && isValidSelection(sel) ? sel : null;
  }
  const [market, a, b, c, ...resto] = partes;
  if (resto.length) return null;
  const n = (x: string | undefined) => (x === undefined || x.trim() === '' ? Number.NaN : Number(x));
  const equipo = (x: string | undefined): x is 'home' | 'away' => x === 'home' || x === 'away';
  const lado = (x: string | undefined): x is 'over' | 'under' => x === 'over' || x === 'under';
  const tres = (x: string | undefined): x is 'home' | 'draw' | 'away' => x === 'home' || x === 'draw' || x === 'away';

  let s: Selection | null = null;
  switch (market) {
    case 'resultado':
      if (tres(a) && b === undefined) s = { market, outcome: a };
      break;
    case 'doble':
      if ((a === '1X' || a === 'X2' || a === '12') && b === undefined) s = { market, outcome: a };
      break;
    case 'btts':
      if ((a === 'si' || a === 'no') && b === undefined) s = { market, outcome: a };
      break;
    case 'goles':
    case 'corners':
    case 'tarjetas':
    case 'tiros':
    case 'sot':
      if (lado(a) && c === undefined) s = { market, side: a, line: n(b) };
      break;
    case 'asiatico':
      if (equipo(a) && c === undefined) s = { market, team: a, line: n(b) };
      break;
    case 'europeo':
      if (tres(b) && c === undefined) s = { market, line: n(a), outcome: b };
      break;
    case 'equipo':
      if (equipo(a) && lado(b)) s = { market, team: a, side: b, line: n(c) };
      break;
    case 'mitad':
      if ((a === '1' || a === '2') && lado(b)) s = { market, half: a === '1' ? 1 : 2, side: b, line: n(c) };
      break;
    case 'cero':
      if (equipo(a) && (b === 'si' || b === 'no') && c === undefined) s = { market, team: a, outcome: b };
      break;
  }
  return s && isValidSelection(s) ? s : null;
}

export function selectionLabel(s: Selection, home = 'Local', away = 'Visitante'): string {
  const nombre = (t: 'home' | 'away') => (t === 'home' ? home : away);
  const lado = (x: 'over' | 'under') => (x === 'over' ? 'Over' : 'Under');
  switch (s.market) {
    case 'resultado':
      return s.outcome === 'home' ? `Gana ${home}` : s.outcome === 'away' ? `Gana ${away}` : 'Empate';
    case 'doble':
      return `Doble oportunidad ${s.outcome}`;
    case 'btts':
      return s.outcome === 'si' ? 'Ambos marcan: sí' : 'Ambos marcan: no';
    case 'goles':
      return Number.isInteger(s.line) ? `${lado(s.side)} ${s.line}.0 goles (asiático)` : `${lado(s.side)} ${s.line} goles`;
    case 'asiatico':
      return s.line === 0 ? `Empate no válido: ${nombre(s.team)}` : `Hándicap asiático ${nombre(s.team)} ${formatLine(s.line)}`;
    case 'europeo':
      return `Hándicap europeo ${home} ${formatLine(s.line)}: ${s.outcome === 'draw' ? 'empate' : `gana ${nombre(s.outcome)}`}`;
    case 'equipo':
      return `${nombre(s.team)}: ${lado(s.side)} ${s.line} goles`;
    case 'mitad':
      return `${lado(s.side)} ${s.line} goles ${HALF_LABEL[s.half]}`;
    case 'cero':
      return `Portería a cero ${nombre(s.team)}: ${s.outcome === 'si' ? 'sí' : 'no'}`;
    case 'conteoEquipo':
      return `${nombre(s.team)}: ${lado(s.side)} ${s.line} ${COUNT_MARKETS[s.stat].unidad}`;
    default:
      return `${lado(s.side)} ${s.line} ${COUNT_MARKETS[s.market].unidad}`;
  }
}

/** «Flamengo gana por 2 o más goles» y parecidos: el margen de un equipo es al menos `n`. */
function margenMinimo(equipo: string, n: number): string {
  if (n >= 2) return `${equipo} gana por ${n} o más goles`;
  if (n === 1) return `${equipo} gana`;
  if (n === 0) return `${equipo} gana o empata`;
  return `${equipo} no pierde por ${1 - n} o más goles`;
}

/** El margen de un equipo es exactamente `t`. */
function margenExacto(equipo: string, t: number): string {
  if (t === 0) return 'empatan';
  const goles = Math.abs(t) === 1 ? '1 gol exacto' : `${Math.abs(t)} goles exactos`;
  return `${equipo} ${t > 0 ? 'gana' : 'pierde'} por ${goles}`;
}

/** «hay 3 o más goles», «hay 2 o menos corners», «no hay goles». */
function cuenta(n: number, unidad: string, sentido: 'mas' | 'menos'): string {
  if (sentido === 'menos' && n === 0) return `no hay ${unidad}`;
  return `hay ${n} o ${sentido === 'mas' ? 'más' : 'menos'} ${unidad}`;
}

/**
 * Cuándo gana y cuándo se devuelve el stake, en palabras. Pierde en cualquier otro caso. Para que un
 * hándicap se entienda sin conocer la jerga.
 */
export function describeSelection(s: Selection, home = 'el local', away = 'el visitante'): { gana: string; devuelve: string | null } {
  const nombre = (t: 'home' | 'away') => (t === 'home' ? home : away);
  switch (s.market) {
    case 'resultado':
      return { gana: s.outcome === 'draw' ? 'empatan' : margenMinimo(nombre(s.outcome), 1), devuelve: null };
    case 'doble':
      return { gana: s.outcome === '12' ? 'no hay empate' : margenMinimo(s.outcome === '1X' ? home : away, 0), devuelve: null };
    case 'btts':
      return { gana: s.outcome === 'si' ? 'marcan los dos equipos' : 'al menos uno de los dos no marca', devuelve: null };
    case 'goles':
      if (Number.isInteger(s.line)) {
        return {
          gana: s.side === 'over' ? cuenta(s.line + 1, 'goles', 'mas') : cuenta(s.line - 1, 'goles', 'menos'),
          devuelve: `hay exactamente ${s.line} ${s.line === 1 ? 'gol' : 'goles'}`,
        };
      }
      return { gana: s.side === 'over' ? cuenta(Math.ceil(s.line), 'goles', 'mas') : cuenta(Math.floor(s.line), 'goles', 'menos'), devuelve: null };
    case 'asiatico': {
      const t = -s.line;
      return Number.isInteger(t)
        ? { gana: margenMinimo(nombre(s.team), t + 1), devuelve: margenExacto(nombre(s.team), t) }
        : { gana: margenMinimo(nombre(s.team), Math.ceil(t)), devuelve: null };
    }
    case 'europeo':
      return {
        gana:
          s.outcome === 'home' ? margenMinimo(home, 1 - s.line) : s.outcome === 'away' ? margenMinimo(away, s.line + 1) : margenExacto(home, -s.line),
        devuelve: null,
      };
    case 'equipo': {
      const n = s.side === 'over' ? Math.ceil(s.line) : Math.floor(s.line);
      const quien = nombre(s.team);
      return { gana: s.side === 'under' && n === 0 ? `${quien} no marca` : `${quien} marca ${n} o ${s.side === 'over' ? 'más' : 'menos'} goles`, devuelve: null };
    }
    case 'cero': {
      const rival = s.team === 'home' ? away : home;
      return { gana: s.outcome === 'si' ? `${rival} no marca` : `${rival} marca al menos un gol`, devuelve: null };
    }
    case 'mitad': {
      const hay = s.side === 'over' ? cuenta(Math.ceil(s.line), 'goles', 'mas') : cuenta(Math.floor(s.line), 'goles', 'menos');
      return { gana: `${hay} en la ${HALF_LABEL[s.half]}`, devuelve: null };
    }
    case 'conteoEquipo': {
      const unidad = COUNT_MARKETS[s.stat].unidad;
      const quien = s.team === 'home' ? home : away;
      const hay = s.side === 'over' ? cuenta(Math.ceil(s.line), unidad, 'mas') : cuenta(Math.floor(s.line), unidad, 'menos');
      return { gana: `${quien}: ${hay}`, devuelve: null };
    }
    default: {
      const unidad = COUNT_MARKETS[s.market].unidad;
      return { gana: s.side === 'over' ? cuenta(Math.ceil(s.line), unidad, 'mas') : cuenta(Math.floor(s.line), unidad, 'menos'), devuelve: null };
    }
  }
}

export type ScoreOutcome = 'gana' | 'devuelve' | 'pierde';

/**
 * Resultado de una selección con el marcador final `i`–`j`. `null` en corners, tarjetas y goles por parte, que
 * no dependen solo del marcador final. Es la regla única de liquidación: la usan la liquidación real, la
 * correlación y las probabilidades conjuntas, así no pueden contradecirse.
 */
export function outcomeOnScore(s: Selection, i: number, j: number): ScoreOutcome | null {
  const binario = (ok: boolean): ScoreOutcome => (ok ? 'gana' : 'pierde');
  const conLinea = (x: number): ScoreOutcome => (x > 0 ? 'gana' : x < 0 ? 'pierde' : 'devuelve');
  switch (s.market) {
    case 'resultado':
      return binario(s.outcome === 'home' ? i > j : s.outcome === 'away' ? j > i : i === j);
    case 'doble':
      return binario(s.outcome === '1X' ? i >= j : s.outcome === 'X2' ? j >= i : i !== j);
    case 'btts':
      return binario((i > 0 && j > 0) === (s.outcome === 'si'));
    case 'goles':
      return conLinea(s.side === 'over' ? i + j - s.line : s.line - (i + j));
    case 'asiatico':
      return conLinea((s.team === 'home' ? i - j : j - i) + s.line);
    case 'europeo': {
      const m = i - j + s.line;
      return binario(s.outcome === 'home' ? m > 0 : s.outcome === 'away' ? m < 0 : m === 0);
    }
    case 'equipo': {
      const g = s.team === 'home' ? i : j;
      return conLinea(s.side === 'over' ? g - s.line : s.line - g);
    }
    case 'cero':
      return binario(((s.team === 'home' ? j : i) === 0) === (s.outcome === 'si'));
    case 'corners':
    case 'tarjetas':
    case 'tiros':
    case 'sot':
    case 'conteoEquipo':
    case 'mitad':
      return null;
  }
}

/**
 * Partidos de la confianza: 10 · media de n / (n + K) de los dos equipos. Fija en 5, el K_SHRINK del libro, aunque el
 * modelo contraiga con otro (10 desde el 18/09/2026): la confianza mide cuánta muestra hay, no cuánto se contrae la
 * estimación. Así el mínimo del pick del modelo sigue pidiendo los mismos ~15 partidos por equipo en su condición.
 */
export const CONFIDENCE_K = 5;

/**
 * Cuánto informa, para la CONFIANZA, un partido de una temporada anterior frente a uno de esta.
 *
 * Hace falta porque la confianza medía solo los partidos de la temporada en curso, y desde que el histórico
 * entra en las proyecciones eso dejaba el número diciendo algo falso. Medido el 27/09/2026 en la BetPlay:
 * **las 88 proyecciones pendientes quedaban por debajo del mínimo de 7,5** (salían entre 4,1 y 5,4 con 3–7
 * partidos jugados), así que ningún partido podía dar pick aunque de esos equipos hubiera 30 partidos
 * guardados y la estimación fuera, medida, bastante mejor que la del libro.
 *
 * El 0,5 es un **criterio, no una medición**: un partido de otra temporada informa, pero menos, porque la
 * plantilla y el entrenador cambian. Sube o baja cuántos picks pasan la puerta, así que se revisa con el
 * backtest de `/historial`, no a ojo.
 */
export const PESO_HISTORICO_CONFIANZA = 0.5;

export interface MarketContext {
  projection: MatchProjection;
  homeSplit: SplitStats | undefined;
  awaySplit: SplitStats | undefined;
  dispersion: Partial<Record<CountDispersionKey, Dispersion | null>> | undefined;
  /**
   * Temporadas anteriores del local en casa y del visitante fuera (`derived.historyByTeamId`). Solo entran en
   * la confianza: la probabilidad ya las lleva dentro, a través del prior de la proyección. Vacío cuando
   * `PRIOR = liga`, porque entonces la estimación tampoco las usa.
   */
  homeHistory?: SplitStats | null;
  awayHistory?: SplitStats | null;
  /** Solo para decir de dónde sale el 1X2. */
  params: Partial<Pick<ModelParams, 'oneXTwoMode'>>;
  minSample: number;
}

export interface MarketEstimate {
  /** Probabilidad de ganar. Con línea entera, descontando la devolución: P(gana) / (1 − push). */
  probability: number | null;
  /** Probabilidad de que se devuelva el stake. 0 si la línea no puede empatar. */
  push: number;
  /** λ que decide el mercado: goles o conteo total, goles del equipo o del rival. */
  expected: number | null;
  distribution: CountDistribution | null;
  /** Intervalo central del 80 % de la distribución del modelo. */
  range80: [number, number] | null;
  sampleHome: number;
  sampleAway: number;
  /** Los mismos, pero de temporadas anteriores. Solo cuentan en la confianza, y descontados. */
  historySampleHome: number;
  historySampleAway: number;
  playedHome: number;
  playedAway: number;
  leagueSample: number | null;
  /** Fracción de partidos con el dato (peor de los dos equipos). */
  coverage: number | null;
  /** Media de n / (n + CONFIDENCE_K) de los dos equipos. */
  evidence: number;
  dataQuality: DataQuality;
  /** 0–10. Solo mide la evidencia que respalda la estimación, no si el pick va a ganar. */
  confidence: number;
  method: string;
  reason: string | null;
}

function rango(d: CountDistribution): [number, number] {
  return [countQuantile(d, 0.1), countQuantile(d, 0.9)];
}

export function estimateMarket(sel: Selection, ctx: MarketContext): MarketEstimate {
  const { projection: p, homeSplit: h, awaySplit: a } = ctx;
  const playedHome = h?.played ?? 0;
  const playedAway = a?.played ?? 0;
  /**
   * La variable que se cuenta: el propio mercado en los totales y `sel.stat` en los de un equipo. Todo
   * lo que sigue (muestra, dispersión, umbral de ceros, motivos) es igual para los dos; lo único que
   * cambia es de dónde sale la media y qué dispersión se usa.
   */
  const statConteo: CountMarket | null = isCountMarket(sel.market)
    ? sel.market
    : sel.market === 'conteoEquipo'
      ? sel.stat
      : null;
  const porEquipo = sel.market === 'conteoEquipo';
  const conteo = statConteo !== null;
  const agg = statConteo ? COUNT_MARKETS[statConteo].agg : 'corners';
  // `?.` tambien en el agregado: la clave la pone `COUNT_MARKETS`, asi que no se da por hecho que exista.
  const sampleHome = conteo ? (h?.[agg]?.sample ?? 0) : playedHome;
  const sampleAway = conteo ? (a?.[agg]?.sample ?? 0) : playedAway;
  // Se cuentan aparte y no dentro de `sampleHome`: esa cifra se ensena tal cual y `coverage` la divide por PJ.
  const muestraPrevia = (s: SplitStats | null | undefined) => (!s ? 0 : conteo ? (s[agg]?.sample ?? 0) : s.played);
  const historySampleHome = muestraPrevia(ctx.homeHistory);
  const historySampleAway = muestraPrevia(ctx.awayHistory);
  /** La muestra que de verdad respalda la estimación: la de esta temporada más la de antes, descontada. */
  const efectivaHome = sampleHome + PESO_HISTORICO_CONFIANZA * historySampleHome;
  const efectivaAway = sampleAway + PESO_HISTORICO_CONFIANZA * historySampleAway;
  const evidence = (shrinkWeight(efectivaHome, CONFIDENCE_K) + shrinkWeight(efectivaAway, CONFIDENCE_K)) / 2;
  const coverage = conteo
    ? Math.min(playedHome ? sampleHome / playedHome : 0, playedAway ? sampleAway / playedAway : 0)
    : null;
  const dispersion = statConteo ? (ctx.dispersion?.[porEquipo ? teamDispersionKey(statConteo) : statConteo] ?? null) : null;
  const leagueSample = conteo ? (dispersion?.n ?? 0) : null;
  const lh = p.expectedGoalsHome;
  const la = p.expectedGoalsAway;

  let probability: number | null = null;
  let push = 0;
  let expected: number | null = null;
  let distribution: CountDistribution | null = null;
  let method = '';
  let sinMargen = false;

  switch (sel.market) {
    case 'resultado':
      probability = p.probs1x2[sel.outcome];
      method =
        ctx.params.oneXTwoMode === 'excel'
          ? 'Modelo 1X2 logístico del libro con decaimiento del empate sobre las λ de goles'
          : 'Matriz de marcadores Poisson con λ local y λ visitante, la misma de goles y ambos marcan';
      break;
    case 'doble': {
      const { home, draw, away } = p.probs1x2;
      probability = sel.outcome === '1X' ? home + draw : sel.outcome === 'X2' ? draw + away : home + away;
      method = 'Suma de las probabilidades 1X2 del modelo';
      break;
    }
    case 'btts': {
      const si = calculateBTTSProbability(lh, la);
      probability = sel.outcome === 'si' ? si : 1 - si;
      expected = p.expectedGoalsTotal;
      method = 'Poisson independiente con λ local y λ visitante';
      break;
    }
    case 'goles': {
      expected = p.expectedGoalsTotal;
      distribution = { mean: expected, size: null };
      const over = calculateOverProbability(expected, sel.line);
      if (Number.isInteger(sel.line)) {
        push = poissonPmf(sel.line, expected);
        probability = (sel.side === 'over' ? over : 1 - over - push) / (1 - push);
        method = 'Poisson sobre los goles totales esperados. Línea asiática: con ese total exacto se devuelve el stake';
      } else {
        probability = sel.side === 'over' ? over : 1 - over;
        method = 'Poisson sobre los goles totales esperados';
      }
      break;
    }
    case 'equipo': {
      expected = sel.team === 'home' ? lh : la;
      distribution = { mean: expected, size: null };
      const over = calculateOverProbability(expected, sel.line);
      probability = sel.side === 'over' ? over : 1 - over;
      method = `Poisson sobre los goles esperados ${sel.team === 'home' ? 'del local' : 'del visitante'}`;
      break;
    }
    case 'mitad': {
      expected = (sel.half === 1 ? p.expectedGoalsFirstHalf : p.expectedGoalsSecondHalf) ?? null;
      if (expected === null) break;
      distribution = { mean: expected, size: null };
      const over = calculateOverProbability(expected, sel.line);
      probability = sel.side === 'over' ? over : 1 - over;
      method = `Poisson sobre los goles esperados de la ${HALF_LABEL[sel.half]}: goles totales esperados × la parte de los goles que llega en ella en la liga`;
      break;
    }
    case 'cero': {
      expected = sel.team === 'home' ? la : lh;
      const si = calculateCleanSheetProbability(expected);
      probability = sel.outcome === 'si' ? si : 1 - si;
      method = `Poisson: probabilidad de que ${sel.team === 'home' ? 'el visitante' : 'el local'} no marque, e^(−λ)`;
      break;
    }
    case 'asiatico':
    case 'europeo': {
      method = 'Signo del resultado con el 1X2 del modelo y tamaño del margen con Poisson sobre las λ de la proyección';
      const d = goalDifferenceDistribution(lh, la, p.probs1x2);
      if (!d) {
        sinMargen = true;
        break;
      }
      let gana = 0;
      let devuelve = 0;
      d.forEach((x, idx) => {
        const k = idx - MAX_GOALS;
        const o = outcomeOnScore(sel, Math.max(k, 0), Math.max(-k, 0));
        if (o === 'gana') gana += x;
        else if (o === 'devuelve') devuelve += x;
      });
      push = devuelve;
      probability = gana / (1 - devuelve);
      break;
    }
    case 'conteoEquipo': {
      // La media de ESE equipo, no la del partido: la proyección ya reparte el total entre los dos.
      expected = p[sel.team === 'home' ? COUNT_MARKETS[sel.stat].home : COUNT_MARKETS[sel.stat].away];
      if (expected !== null && dispersion && dispersion.n >= MIN_LEAGUE_COUNT_SAMPLE) {
        distribution = countDistribution(expected, dispersion);
        const over = countOverProbability(distribution, sel.line);
        probability = sel.side === 'over' ? over : 1 - over;
        method =
          distribution.size === null
            ? `Poisson (los ${COUNT_MARKETS[sel.stat].unidad} de un equipo no muestran sobredispersión en la liga: φ = ${dispersion.index.toFixed(2)})`
            : `Binomial negativa con la dispersión POR EQUIPO de la liga (φ = ${dispersion.index.toFixed(2)} en ${dispersion.n} observaciones)`;
      }
      break;
    }
    default: {
      expected = p[COUNT_MARKETS[sel.market as CountMarket].total];
      if (expected !== null && dispersion && dispersion.n >= MIN_LEAGUE_COUNT_SAMPLE) {
        distribution = countDistribution(expected, dispersion);
        const over = countOverProbability(distribution, sel.line);
        probability = sel.side === 'over' ? over : 1 - over;
        method =
          distribution.size === null
            ? `Poisson (la liga no muestra sobredispersión: φ = ${dispersion.index.toFixed(2)})`
            : `Binomial negativa con la dispersión de la liga (φ = ${dispersion.index.toFixed(2)} en ${dispersion.n} partidos)`;
      }
    }
  }

  let reason: string | null = null;
  const minimo = Math.min(sampleHome, sampleAway);
  if (!h || !a) reason = 'El partido no tiene estadísticas de local y visitante calculadas.';
  else if (minimo < ctx.minSample)
    reason = conteo
      ? `Muestra insuficiente: ${sampleHome} partidos del local en casa y ${sampleAway} del visitante fuera con ${COUNT_MARKETS[statConteo!].unidad} publicados (mínimo ${ctx.minSample}).`
      : `Muestra insuficiente: ${sampleHome} partidos del local en casa y ${sampleAway} del visitante fuera (mínimo ${ctx.minSample}).`;
  else if (sinMargen) reason = 'Un equipo tiene 0 goles esperados: el modelo no puede repartir el margen del resultado.';
  else if (sel.market === 'mitad' && expected === null)
    reason = 'La liga no tiene bastantes partidos con resultado al descanso: el modelo no proyecta por partes.';
  else if (conteo && expected === null) reason = 'La liga no tiene datos de este mercado: el modelo no lo proyecta.';
  else if (conteo && (leagueSample ?? 0) < MIN_LEAGUE_COUNT_SAMPLE)
    reason = `La liga tiene ${leagueSample} partidos con el dato: hacen falta ${MIN_LEAGUE_COUNT_SAMPLE} para medir su dispersión.`;
  else if (
    conteo &&
    (dispersion?.zeroShare ?? 0) > (porEquipo ? COUNT_MARKETS[statConteo!].teamMaxZeroShare : COUNT_MARKETS[statConteo!].maxZeroShare)
  )
    reason = `Datos inconsistentes: ${Math.round((dispersion!.zeroShare ?? 0) * dispersion!.n)} de ${dispersion!.n} ${porEquipo ? 'observaciones' : 'partidos'} de la liga tienen 0 ${COUNT_MARKETS[statConteo!].unidad}. La fuente publica 0 cuando no registra la estadística, así que no se evalúa.`;

  /*
   * La calidad mira la muestra EFECTIVA, por lo mismo que la confianza: es otra frase sobre cuánta evidencia hay
   * detrás de la estimación, y la estimación usa el histórico. Con solo la temporada en curso, en la BetPlay
   * los 4.928 mercados de los 88 partidos pendientes daban «calidad baja» (3–7 partidos por equipo, por debajo
   * del 5 que pide «media») y eso los descartaba todos, uno por uno.
   * La cobertura NO se toca: mide qué fracción de los partidos de esta temporada traen la estadística publicada,
   * que es otra cosa. Y `minSample` tampoco: ese es un suelo que pone el usuario sobre la temporada en curso.
   */
  const minimoEfectivo = Math.min(efectivaHome, efectivaAway);
  let dataQuality: DataQuality;
  if (reason) dataQuality = 'insuficiente';
  else if (minimoEfectivo >= 10 && (coverage === null || coverage >= 0.9)) dataQuality = 'alta';
  else if (minimoEfectivo >= 5 && (coverage === null || coverage >= 0.6)) dataQuality = 'media';
  else dataQuality = 'baja';

  return {
    probability: reason ? null : probability,
    push: reason ? 0 : push,
    expected,
    distribution,
    range80: distribution && !reason ? rango(distribution) : null,
    sampleHome,
    sampleAway,
    historySampleHome,
    historySampleAway,
    playedHome,
    playedAway,
    leagueSample,
    coverage,
    evidence,
    dataQuality,
    confidence: reason ? 0 : Math.round(10 * evidence * (coverage ?? 1) * 10) / 10,
    method,
    reason,
  };
}

// ---------------------------------------------------------------------------
// Liquidación con resultados reales
// ---------------------------------------------------------------------------

export type SelectionOutcome =
  | { status: 'ganado' | 'perdido' | 'anulado'; note: string }
  | { status: 'sin-datos'; note: string };

/**
 * Liquida una selección contra un partido CON marcador. Nunca supone un dato que falta. Un resultado
 * justo en una línea entera es `anulado`: se devuelve el stake.
 */
export function settleSelection(sel: Selection, m: Match): SelectionOutcome {
  const marcador = `${m.homeGoals}-${m.awayGoals}`;
  if (sel.market === 'mitad') {
    const { homeFirstHalfGoals: h1, awayFirstHalfGoals: a1 } = m;
    if (h1 === null || a1 === null) return { status: 'sin-datos', note: `${marcador} · la fuente no publicó el resultado al descanso` };
    if (h1 > m.homeGoals! || a1 > m.awayGoals!) return { status: 'sin-datos', note: `${marcador} · el descanso ${h1}-${a1} no cuadra con el final` };
    const goles = sel.half === 1 ? h1 + a1 : m.homeGoals! + m.awayGoals! - h1 - a1;
    const gana = sel.side === 'over' ? goles > sel.line : goles < sel.line;
    return { status: gana ? 'ganado' : 'perdido', note: `${marcador} (descanso ${h1}-${a1}) · ${goles} goles en la ${HALF_LABEL[sel.half]}` };
  }
  if (sel.market === 'conteoEquipo') {
    const t = COUNT_TEAM[sel.stat](m, sel.team);
    const que = COUNT_MARKETS[sel.stat].unidad;
    const quien = sel.team === 'home' ? m.homeTeamName : m.awayTeamName;
    if (t === null) return { status: 'sin-datos', note: `${marcador} · la fuente no publicó ${que} de ${quien}` };
    return {
      status: (sel.side === 'over' ? t > sel.line : t < sel.line) ? 'ganado' : 'perdido',
      note: `${marcador} · ${t} ${que} de ${quien}`,
    };
  }
  if (!esConteo(sel)) {
    const o = outcomeOnScore(sel, m.homeGoals!, m.awayGoals!)!;
    const note =
      sel.market === 'goles'
        ? `${marcador} · ${totalGoals(m)} goles`
        : sel.market === 'equipo'
          ? `${marcador} · ${sel.team === 'home' ? m.homeGoals : m.awayGoals} goles de ${sel.team === 'home' ? m.homeTeamName : m.awayTeamName}`
          : marcador;
    if (o === 'devuelve') return { status: 'anulado', note: `${note} · justo en la línea: se devuelve el stake` };
    return { status: o === 'gana' ? 'ganado' : 'perdido', note };
  }
  const t = COUNT_TOTAL[sel.market](m);
  const que = COUNT_MARKETS[sel.market].unidad;
  if (t === null) return { status: 'sin-datos', note: `${marcador} · la fuente no publicó ${que}` };
  return { status: (sel.side === 'over' ? t > sel.line : t < sel.line) ? 'ganado' : 'perdido', note: `${marcador} · ${t} ${que}` };
}

export type EventResolution =
  | { kind: 'jugado'; match: Match }
  | { kind: 'cancelado' }
  | { kind: 'aplazado' }
  | { kind: 'pendiente' }
  | { kind: 'ambiguo'; count: number };

const DIA = 86_400_000;

/**
 * Qué fue del partido de un pick. Primero el mismo id; después el mismo id de proveedor; por último
 * los mismos dos equipos de la misma competición en ±21 días (un aplazado cambia la fecha y con ella
 * la clave natural). Con más de un candidato no se liquida: sería adivinar.
 */
export function resolveEvent(ev: EventRef, matches: Match[], fixtures: Fixture[]): EventResolution {
  const exacto = matches.find((m) => m.id === ev.fixtureId && hasResult(m));
  if (exacto) return { kind: 'jugado', match: exacto };
  if (ev.providerId) {
    const porProveedor = matches.find((m) => m.providerId === ev.providerId && m.leagueId === ev.leagueId && hasResult(m));
    if (porProveedor) return { kind: 'jugado', match: porProveedor };
  }

  const fixture = fixtures.find((f) => f.id === ev.fixtureId);
  if (fixture?.status === 'Cancelado') return { kind: 'cancelado' };

  const t = Date.parse(ev.date);
  const candidatos = matches.filter(
    (m) =>
      m.leagueId === ev.leagueId &&
      m.homeTeamId === ev.homeTeamId &&
      m.awayTeamId === ev.awayTeamId &&
      hasResult(m) &&
      Math.abs(Date.parse(m.date) - t) <= 21 * DIA,
  );
  if (candidatos.length === 1) return { kind: 'jugado', match: candidatos[0] };
  if (candidatos.length > 1) return { kind: 'ambiguo', count: candidatos.length };
  if (fixture?.status === 'Aplazado') return { kind: 'aplazado' };
  return { kind: 'pendiente' };
}

// ---------------------------------------------------------------------------
// Correlación entre dos selecciones del MISMO partido
// ---------------------------------------------------------------------------

/** Los de un equipo van en su propio grupo: «corners del local» no es «corners del visitante». */
type Grupo = 'resultado' | 'goles' | 'mitad1' | 'mitad2' | CountMarket | `${CountMarket}:${'home' | 'away'}`;

/** Variable del modelo que decide la selección: la diferencia de goles, los goles, los de una parte o un conteo. */
export function selectionGroup(s: Selection): Grupo {
  switch (s.market) {
    case 'resultado':
    case 'doble':
    case 'asiatico':
    case 'europeo':
      return 'resultado';
    case 'btts':
    case 'goles':
    case 'equipo':
    case 'cero':
      return 'goles';
    case 'mitad':
      return s.half === 1 ? 'mitad1' : 'mitad2';
    case 'conteoEquipo':
      return `${s.stat}:${s.team}`;
    default:
      return s.market;
  }
}

/** Marcadores con los que se comparan dos selecciones: con 12 goles por equipo cabe cualquier línea admitida. */
const REJILLA = 12;

/**
 * Selecciones que dependen del marcador: idénticas si se liquidan igual con todos los marcadores (gana
 * el local = hándicap −0.5 del local), excluyentes si ningún marcador las hace ganar a la vez, alta en la
 * misma variable y media entre resultado y goles. Corners, tarjetas y goles de una parte: por sus líneas.
 * Los goles de una parte son parte de los del partido: alta con los mercados de goles.
 */
export function correlationBetween(a: Selection, b: Selection): CorrelationLevel {
  if (selectionKey(a) === selectionKey(b)) return 'identica';
  const ga = selectionGroup(a);
  const gb = selectionGroup(b);
  const porMarcador = (g: Grupo) => g === 'resultado' || g === 'goles';

  if (porMarcador(ga) && porMarcador(gb)) {
    let aLaVez = false;
    let iguales = true;
    for (let i = 0; i <= REJILLA; i++) {
      for (let j = 0; j <= REJILLA; j++) {
        const oa = outcomeOnScore(a, i, j);
        const ob = outcomeOnScore(b, i, j);
        if (oa === 'gana' && ob === 'gana') aLaVez = true;
        if (oa !== ob) iguales = false;
      }
    }
    if (iguales) return 'identica';
    if (!aLaVez) return 'excluyente';
    return ga === gb ? 'alta' : 'media';
  }

  if (ga === gb && 'side' in a && 'side' in b && a.side !== b.side) {
    const over = a.side === 'over' ? a : b;
    const under = a.side === 'over' ? b : a;
    // X > over.line y X < under.line no caben a la vez si over.line ≥ under.line.
    if (over.line >= under.line) return 'excluyente';
  }
  if (ga === gb) return 'alta';
  const mitad = (g: Grupo) => g === 'mitad1' || g === 'mitad2';
  if ((mitad(ga) && gb === 'goles') || (mitad(gb) && ga === 'goles')) return 'alta';
  if ((mitad(ga) && gb === 'resultado') || (mitad(gb) && ga === 'resultado')) return 'media';
  return 'baja';
}

const ORDEN: CorrelationLevel[] = ['ninguna', 'baja', 'media', 'alta', 'excluyente', 'identica'];

export function maxCorrelation(levels: CorrelationLevel[]): CorrelationLevel {
  return levels.reduce<CorrelationLevel>((m, l) => (ORDEN.indexOf(l) > ORDEN.indexOf(m) ? l : m), 'ninguna');
}
