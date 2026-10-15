/**
 * Match momentum: qué equipo está apretando en cada minuto del partido.
 *
 * No hay ningún proveedor que publique un «momentum» que la aplicación pueda usar como dato, así que se
 * CALCULA aquí, con una metodología propia y documentada, a partir de lo único que sí es un dato: los
 * tiros con su minuto y su xG, y los goles, tal como los publica la fuente del partido.
 *
 * Metodología
 * -----------
 * Cada tiro es un aviso de peligro cuyo tamaño es su xG (la probabilidad de que acabe en gol). Un tiro sin
 * xG publicado cuenta como `PESO_MINIMO_TIRO`, que es el xG típico de un disparo lejano: así un tiro
 * registrado nunca vale 0. Un tiro que va A PUERTA pesa más: se le suma `PESO_XGOT` por su xGOT, que es el
 * xG después del tiro y mide lo difícil que era pararlo. Un gol suma además `BONO_GOL`, porque un partido
 * cambia cuando el balón entra.
 *
 * El efecto de un aviso no es instantáneo ni eterno: se desvanece. En el minuto t, cada evento anterior
 * pesa `peso · exp(-(t - minuto) / TAU)`, con `TAU = 5` minutos (a los 5 minutos queda el 37 %, a los 15
 * el 5 %). La curva es la suma de lo del local menos lo del visitante, así que un valor positivo es
 * dominio local y uno negativo, visitante.
 *
 * La escala es RELATIVA AL PROPIO PARTIDO: la serie se divide por su máximo absoluto y se lleva a
 * ±100. Un +100 no significa «dominio total», sino «el momento más dominante de este partido». Comparar
 * el valor de dos partidos distintos no significa nada, y por eso el gráfico no lleva números.
 *
 * Las tarjetas y las expulsiones se devuelven como marcas del gráfico, pero NO entran en la curva: cambian
 * el partido de una forma que estos datos no miden.
 *
 * Lo que la fuente no publica no se rellena: si un partido no tiene tiros con minuto (pasa en varias ligas
 * sudamericanas, donde FotMob solo da alineaciones y goles), no hay momentum y se dice por qué.
 *
 * Qué NO entra, porque la fuente no lo publica minuto a minuto: corners, posesión, ataques y ataques
 * peligrosos. Solo se publican como totales del partido, y un total no sitúa nada en el tiempo.
 */

/** Un tiro tal como lo publica la fuente. */
export interface TimelineShot {
  minute: number;
  home: boolean;
  /** xG del tiro. `null` si la fuente no lo publica. */
  xg: number | null;
  /**
   * xG DESPUÉS del tiro (xGOT): lo difícil que era pararlo, contando dónde fue. Solo existe en los
   * tiros que van a puerta. `null` si la fuente no lo publica.
   */
  xgOnTarget: number | null;
  onTarget: boolean;
  goal: boolean;
  /** Gol en propia puerta: el peligro lo generó el equipo contrario. */
  ownGoal?: boolean;
  player: string | null;
}

export type TimelineEventKind = 'gol' | 'amarilla' | 'roja' | 'penalti-fallado';

/** Un hecho con minuto que se marca en el gráfico. */
export interface TimelineEvent {
  minute: number;
  home: boolean;
  kind: TimelineEventKind;
  player: string | null;
}

/** Cronología de un partido tal como la publica su fuente. */
export interface SourceTimeline {
  url: string;
  /** El partido está en juego ahora mismo. */
  ongoing: boolean;
  finished: boolean;
  shots: TimelineShot[];
  events: TimelineEvent[];
}

export interface MomentumPoint {
  minute: number;
  /** −100 (dominio visitante) … +100 (dominio local), relativo al propio partido. */
  value: number;
}

export interface MatchMomentum {
  source: string;
  url: string;
  ongoing: boolean;
  finished: boolean;
  /** Último minuto con datos. */
  lastMinute: number;
  points: MomentumPoint[];
  events: TimelineEvent[];
  /** Tiros y xG acumulados de cada lado, para poner cifras al gráfico. */
  totals: { shotsHome: number; shotsAway: number; xgHome: number | null; xgAway: number | null };
  /** Por qué no hay curva, cuando no la hay. */
  note: string | null;
}

/** xG de un tiro que la fuente no puntúa: el de un disparo lejano. Un tiro registrado nunca vale 0. */
export const PESO_MINIMO_TIRO = 0.03;
/** Lo que suma un gol por encima del xG de su tiro. */
export const BONO_GOL = 0.3;
/** Cuánto del xGOT se suma a un tiro que va a puerta. */
export const PESO_XGOT = 0.5;
/** Minutos en los que el efecto de un tiro cae al 37 %. */
export const TAU = 5;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Curva del momentum minuto a minuto. Devuelve una lista vacía si no hay tiros con minuto: el momentum se
 * construye con ellos y sin ellos no hay nada que dibujar.
 */
export function momentumCurve(shots: TimelineShot[], lastMinute: number): MomentumPoint[] {
  const utiles = shots.filter((s) => Number.isFinite(s.minute) && s.minute >= 0);
  if (utiles.length === 0) return [];

  const eventos = utiles.map((s) => ({
    minute: s.minute,
    // Un gol en propia puerta lo provoca el rival: el peligro se le apunta a él.
    signo: (s.ownGoal ? !s.home : s.home) ? 1 : -1,
    peso:
      Math.max(s.xg ?? 0, PESO_MINIMO_TIRO) +
      (s.onTarget && s.xgOnTarget !== null ? PESO_XGOT * s.xgOnTarget : 0) +
      (s.goal ? BONO_GOL : 0),
  }));

  const fin = Math.max(lastMinute, ...eventos.map((e) => e.minute));
  const bruto: number[] = [];
  for (let t = 0; t <= fin; t++) {
    let suma = 0;
    for (const e of eventos) {
      if (e.minute > t) continue;
      suma += e.signo * e.peso * Math.exp(-(t - e.minute) / TAU);
    }
    bruto.push(suma);
  }

  const maximo = Math.max(...bruto.map(Math.abs));
  if (maximo === 0) return [];
  return bruto.map((v, minute) => ({ minute, value: clamp(Math.round((v / maximo) * 100), -100, 100) }));
}

/** Suma de tiros y xG de cada lado. El xG es `null` si la fuente no lo publica en ningún tiro. */
export function shotTotals(shots: TimelineShot[]): MatchMomentum['totals'] {
  const lado = (home: boolean) => shots.filter((s) => s.home === home);
  const xg = (home: boolean) => {
    const con = lado(home).filter((s) => typeof s.xg === 'number');
    return con.length ? Number(con.reduce((a, s) => a + (s.xg ?? 0), 0).toFixed(2)) : null;
  };
  return {
    shotsHome: lado(true).length,
    shotsAway: lado(false).length,
    xgHome: xg(true),
    xgAway: xg(false),
  };
}

/** Momentum de un partido a partir de la cronología de su fuente. */
export function buildMomentum(source: string, timeline: SourceTimeline): MatchMomentum {
  const minutos = [...timeline.shots, ...timeline.events].map((e) => e.minute).filter((m) => Number.isFinite(m));
  // Un partido terminado llega al 90; uno en juego, hasta donde haya datos.
  const lastMinute = Math.max(timeline.finished ? 90 : 0, ...minutos, 0);
  const points = momentumCurve(timeline.shots, lastMinute);
  return {
    source,
    url: timeline.url,
    ongoing: timeline.ongoing,
    finished: timeline.finished,
    lastMinute,
    points,
    events: [...timeline.events].sort((a, b) => a.minute - b.minute),
    totals: shotTotals(timeline.shots),
    note: points.length
      ? null
      : 'La fuente no publica los tiros con su minuto en este partido, y el momentum se construye con ellos.',
  };
}
