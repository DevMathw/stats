/**
 * Los 11 datos de un partido que se piden a las fuentes y que se pueden escribir a mano, con sus límites.
 *
 * Lo comparten el servidor (filtra las cifras de las fuentes) y el formulario de Partidos: un dato escrito
 * a mano pasa los mismos filtros que uno leído. Nunca se completa ni se corrige nada: un valor imposible
 * se rechaza y un campo vacío es «sin dato», nunca 0.
 *
 * El **marcador** entró aquí el 26/09/2026. Un partido disputado cuya fuente no publicó el resultado se
 * quedaba atascado para siempre: sin marcador no cuenta en ninguna cifra del análisis (`countsForAnalysis`),
 * el formulario no lo dejaba escribir y no había ni filtro para encontrarlo. Pasó de verdad con
 * «Fortaleza FC - Envigado» de la BetPlay 2025 (jornada 1), que el Excel trajo con la fila entera vacía.
 */
import type { EmptyStat, Match } from '../../types/index.ts';

/** Rangos plausibles: no son «casi seguro», son «imposible en un partido de fútbol». La posesión, en %. */
export const STAT_RANGES = {
  // 30 goles no es «casi imposible», es imposible: el récord de un partido de liga profesional está en 16.
  homeGoals: [0, 30],
  awayGoals: [0, 30],
  shotsHome: [0, 60],
  shotsAway: [0, 60],
  shotsOnTargetHome: [0, 40],
  shotsOnTargetAway: [0, 40],
  possessionHome: [0, 100],
  cornersHome: [0, 30],
  cornersAway: [0, 30],
  yellowCardsHome: [0, 15],
  yellowCardsAway: [0, 15],
  redCardsHome: [0, 6],
  redCardsAway: [0, 6],
  foulsHome: [0, 60],
  foulsAway: [0, 60],
  offsidesHome: [0, 25],
  offsidesAway: [0, 25],
  xGHome: [0, 9],
  xGAway: [0, 9],
} satisfies Record<string, [number, number]>;

export type StatKey = keyof typeof STAT_RANGES;
/** Lo que se puede escribir a mano, con las claves de `Match` (`possessionHome` en fracción 0–1). */
export type ManualField = StatKey | 'homeFirstHalfGoals' | 'awayFirstHalfGoals';
export type MatchDataValues = Record<ManualField, number | null>;

export interface MatchDatum {
  /** Id del filtro «dato que falta» de Partidos. */
  id: Exclude<EmptyStat, 'any'>;
  name: string;
  label: string;
  home: ManualField;
  /** `null` = un solo valor (la posesión del local). */
  away: ManualField | null;
}

/** Los 11 datos, en el orden en que se enseñan. Los usan el formulario manual, el filtro y el contador de Partidos. */
export const MATCH_DATA: readonly MatchDatum[] = [
  { id: 'score', name: 'marcador', label: 'Marcador', home: 'homeGoals', away: 'awayGoals' },
  { id: 'possession', name: 'posesión', label: 'Posesión (%)', home: 'possessionHome', away: null },
  { id: 'shots', name: 'tiros', label: 'Tiros', home: 'shotsHome', away: 'shotsAway' },
  { id: 'shotsOnTarget', name: 'tiros a puerta', label: 'Tiros a puerta', home: 'shotsOnTargetHome', away: 'shotsOnTargetAway' },
  { id: 'corners', name: 'córners', label: 'Córners', home: 'cornersHome', away: 'cornersAway' },
  { id: 'fouls', name: 'faltas', label: 'Faltas', home: 'foulsHome', away: 'foulsAway' },
  { id: 'offsides', name: 'fueras de juego', label: 'Fueras de juego', home: 'offsidesHome', away: 'offsidesAway' },
  { id: 'cards', name: 'amarillas', label: 'Tarjetas amarillas', home: 'yellowCardsHome', away: 'yellowCardsAway' },
  { id: 'redCards', name: 'rojas', label: 'Tarjetas rojas', home: 'redCardsHome', away: 'redCardsAway' },
  { id: 'xg', name: 'xG', label: 'xG (goles esperados)', home: 'xGHome', away: 'xGAway' },
  { id: 'halfTime', name: 'descanso', label: 'Marcador al descanso', home: 'homeFirstHalfGoals', away: 'awayFirstHalfGoals' },
];

/**
 * Datos en los que «ninguno» es algo que de verdad puede pasar en un partido.
 *
 * Es la lista de los que admiten el botón «asignar 0» de Partidos, y por eso excluye tres grupos:
 *   - **marcador y descanso**: un 0-0 no es «no hubo dato», es un resultado. Escribirlo a bulto sería
 *     inventar partidos.
 *   - **posesión**: el 0 % es imposible; los dos equipos suman 100.
 *   - **xG**: un partido jugado siempre genera alguna ocasión; un 0 exacto no se mide, se deja vacío.
 *
 * En los que quedan (tiros, córners, faltas, fueras de juego, tarjetas) el 0 es el caso corriente, y
 * ponerlo es una afirmación del usuario sobre el partido, no un relleno del sistema: se guarda como
 * «Manual» igual que cualquier otro dato escrito a mano.
 */
export const ZERO_PLAUSIBLE: ReadonlySet<MatchDatum['id']> = new Set([
  'shots',
  'shotsOnTarget',
  'corners',
  'fouls',
  'offsides',
  'cards',
  'redCards',
]);

export const MANUAL_FIELDS: readonly ManualField[] = MATCH_DATA.flatMap((d) => (d.away ? [d.home, d.away] : [d.home]));

export const matchDataValues = (m: Match): MatchDataValues =>
  Object.fromEntries(MANUAL_FIELDS.map((k) => [k, m[k]])) as MatchDataValues;

/** ¿Falta este dato en el partido? Basta con que falte un lado. */
export const isMissing = (m: Match, d: MatchDatum): boolean => m[d.home] === null || (d.away !== null && m[d.away] === null);

/** Cuáles de los datos faltan en un partido, por su nombre. */
export function missingMatchData(m: Match): string[] {
  return MATCH_DATA.filter((d) => isMissing(m, d)).map((d) => d.name);
}

/** Nombres de los datos escritos a mano, sin repetir local y visitante. */
export const manualDataNames = (fields: readonly string[] | undefined): string[] =>
  MATCH_DATA.filter((d) => fields?.includes(d.home) || (d.away !== null && fields?.includes(d.away))).map((d) => d.name);

const ENTEROS = new Set<ManualField>(MANUAL_FIELDS.filter((k) => k !== 'possessionHome' && k !== 'xGHome' && k !== 'xGAway'));

/**
 * Errores por campo; vacío si todo es posible. Las reglas de las fuentes: rangos, no más tiros a puerta
 * que tiros, y un descanso con los dos lados y sin superar el marcador final.
 */
export function validateMatchData(
  v: MatchDataValues,
  goals: { home: number | null; away: number | null },
): Partial<Record<ManualField, string>> {
  const errores: Partial<Record<ManualField, string>> = {};
  for (const k of MANUAL_FIELDS) {
    const valor = v[k];
    if (valor === null) continue;
    if (!Number.isFinite(valor)) errores[k] = 'No es un número';
    else if (ENTEROS.has(k) && !Number.isInteger(valor)) errores[k] = 'Tiene que ser un número entero';
    else if (valor < 0) errores[k] = 'No puede ser negativo';
    else if (k in STAT_RANGES) {
      const max = STAT_RANGES[k as StatKey][1];
      if ((k === 'possessionHome' ? valor * 100 : valor) > max) errores[k] = `Imposible: más de ${max}`;
    }
  }

  // Menos tiros a puerta que goles sí puede ser: un autogol suma al marcador sin ser tiro del equipo.
  for (const [aPuerta, tiros] of [['shotsOnTargetHome', 'shotsHome'], ['shotsOnTargetAway', 'shotsAway']] as const) {
    const p = v[aPuerta];
    const t = v[tiros];
    if (p !== null && t !== null && !errores[aPuerta] && !errores[tiros] && p > t) errores[aPuerta] = 'No puede superar a los tiros';
  }

  // El marcador también se puede estar escribiendo AHORA, y entonces manda el nuevo: si no, escribir
  // «0-0 con descanso 0-0» de golpe se rechazaría por comparar el descanso con el marcador que aún no había.
  const golesL = v.homeGoals ?? goals.home;
  const golesV = v.awayGoals ?? goals.away;
  if ((v.homeGoals === null) !== (v.awayGoals === null)) {
    errores[v.homeGoals === null ? 'homeGoals' : 'awayGoals'] ??= 'Falta este lado del marcador';
  }

  const htL = v.homeFirstHalfGoals;
  const htV = v.awayFirstHalfGoals;
  if ((htL === null) !== (htV === null)) {
    errores[htL === null ? 'homeFirstHalfGoals' : 'awayFirstHalfGoals'] ??= 'Falta este lado del descanso';
  } else {
    if (htL !== null && golesL !== null && htL > golesL) errores.homeFirstHalfGoals ??= `No puede superar los goles del final (${golesL})`;
    if (htV !== null && golesV !== null && htV > golesV) errores.awayFirstHalfGoals ??= `No puede superar los goles del final (${golesV})`;
  }
  return errores;
}

/**
 * El partido con el dato `d` escrito **donde faltaba**, o `null` si no hay nada que escribir.
 *
 * Tres cosas que hace y que son el motivo de que esto no viva en la pantalla:
 *   - **Solo el lado que falta.** Si el local tiene 1 roja y el visitante está vacío, escribe el del
 *     visitante y no toca el 1.
 *   - **Pasa la misma validación que el formulario**, así que un valor imposible devuelve `null` en vez
 *     de entrar. Hace falta incluso para un 0: 0 tiros en un partido que ya tiene 3 tiros a puerta no
 *     existe.
 *   - Marca los campos como **Manual**, que es lo que impide que la siguiente actualización de la fuente
 *     los pise (`mergeMatch`).
 *
 * Para un dato de un solo valor (la posesión del local) se usa `values[0]` y se ignora el otro.
 */
export function fillMissing(m: Match, d: MatchDatum, values: readonly [number, number], now: string): Match | null {
  const pares: [ManualField, number][] = d.away ? [[d.home, values[0]], [d.away, values[1]]] : [[d.home, values[0]]];
  const campos = pares.filter(([k]) => m[k] === null);
  if (!campos.length) return null;

  const next: Match = { ...m, updatedAt: now };
  for (const [k, v] of campos) next[k] = v;
  const claves = campos.map(([k]) => k);
  const errores = errorsForChanges(validateMatchData(matchDataValues(next), { home: next.homeGoals, away: next.awayGoals }), claves);
  if (Object.values(errores)[0]) return null;

  next.manualFields = [...new Set([...(m.manualFields ?? []), ...claves])];
  return next;
}

/** El 0 a bulto del botón de Partidos, solo en los datos en los que «ninguno» puede pasar de verdad. */
export const zeroMissing = (m: Match, d: MatchDatum, now: string): Match | null =>
  ZERO_PLAUSIBLE.has(d.id) ? fillMissing(m, d, [0, 0], now) : null;

/** El error de estos campos depende de otro: los tiros a puerta de los tiros, y cada lado del descanso del otro. */
const DEPENDE: Partial<Record<ManualField, ManualField>> = {
  shotsOnTargetHome: 'shotsHome',
  shotsOnTargetAway: 'shotsAway',
  homeFirstHalfGoals: 'awayFirstHalfGoals',
  awayFirstHalfGoals: 'homeFirstHalfGoals',
  homeGoals: 'awayGoals',
  awayGoals: 'homeGoals',
};

/** Los errores que tocan a lo que se cambia: un dato antiguo dudoso no impide escribir otro. */
export function errorsForChanges(
  errores: Partial<Record<ManualField, string>>,
  cambios: readonly ManualField[],
): Partial<Record<ManualField, string>> {
  return Object.fromEntries(
    Object.entries(errores).filter(([k]) => {
      const campo = k as ManualField;
      const otro = DEPENDE[campo];
      return cambios.includes(campo) || (otro !== undefined && cambios.includes(otro));
    }),
  );
}
