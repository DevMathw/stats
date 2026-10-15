/**
 * Rating Elo de cada equipo: fuerza que se actualiza partido a partido.
 *
 * Es el único modelo de los siete que no necesita nada más que resultados, así que funciona desde la
 * primera jornada de cualquier competición. A cambio no sabe de goles: da 1X2 y no marcadores.
 *
 * Adaptación al fútbol, con las constantes habituales de la literatura de Elo deportivo:
 *   - `K` marca cuánto se mueve el rating por partido. Con temporadas de 30–38 jornadas conviene que
 *     sea alto (20) o el rating no llega a separar a los equipos antes de que acabe el año.
 *   - El **margen de goles** amplía K: ganar 4-0 mueve más que ganar 1-0. Se usa el factor de
 *     FiveThirtyEight, `((|dif| + 3) / 4) ^ 0.75`, que crece cada vez menos.
 *   - La **ventaja de campo** entra como puntos de Elo sumados al local. No se fija a ojo: se calibra
 *     con el propio histórico (`calibrateHomeAdvantage`), y por defecto vale lo medido en esta base.
 *   - El **empate** no existe en el Elo clásico; se cuenta como medio punto, que es lo estándar.
 *
 * La probabilidad de empate no sale del Elo: sale de la diferencia de ratings, con una curva ajustada
 * al histórico (`fitDrawCurve`). Sin eso, el Elo daría 1X2 sin X.
 */

/** Rating de un equipo del que aún no se sabe nada. */
export const ELO_INICIAL = 1500;

/** Cuánto mueve un partido el rating. */
export const ELO_K = 20;

/** Ventaja de campo en puntos de Elo. Es el valor por defecto; `calibrateHomeAdvantage` lo mide. */
export const ELO_VENTAJA_LOCAL = 60;

/** Diferencia de rating → probabilidad de ganar (sin contar el empate). */
export const eloExpected = (diff: number): number => 1 / (1 + 10 ** (-diff / 400));

/** Factor por margen de goles: crece con la goleada, cada vez menos. */
export const marginFactor = (diff: number): number => ((Math.abs(diff) + 3) / 4) ** 0.75;

export class EloTable {
  private readonly ratings = new Map<string, number>();
  private readonly k: number;
  private readonly homeAdvantage: number;

  constructor(k = ELO_K, homeAdvantage = ELO_VENTAJA_LOCAL) {
    this.k = k;
    this.homeAdvantage = homeAdvantage;
  }

  get(teamId: string): number {
    return this.ratings.get(teamId) ?? ELO_INICIAL;
  }

  /** Probabilidad de que gane el local sin contar el empate, con la ventaja de campo dentro. */
  expectedHome(homeId: string, awayId: string): number {
    return eloExpected(this.get(homeId) + this.homeAdvantage - this.get(awayId));
  }

  update(homeId: string, awayId: string, homeGoals: number, awayGoals: number): void {
    const esperado = this.expectedHome(homeId, awayId);
    const real = homeGoals > awayGoals ? 1 : homeGoals === awayGoals ? 0.5 : 0;
    const ajuste = this.k * marginFactor(homeGoals - awayGoals) * (real - esperado);
    this.ratings.set(homeId, this.get(homeId) + ajuste);
    this.ratings.set(awayId, this.get(awayId) - ajuste);
  }

  snapshot(): Map<string, number> {
    return new Map(this.ratings);
  }
}

/**
 * Curva del empate: con qué frecuencia se empata según lo parejo que sea el partido.
 *
 * `P(X) = base · exp(-|diff| / escala)`, con `base` y `escala` ajustadas al histórico por búsqueda
 * directa sobre la verosimilitud. Es la forma que tienen los datos: el empate es más probable cuanto
 * más igualado está el partido y decae suavemente.
 */
export interface DrawCurve {
  base: number;
  scale: number;
}

export const DRAW_CURVE_POR_DEFECTO: DrawCurve = { base: 0.28, scale: 260 };

export const drawProbability = (diff: number, curve: DrawCurve): number =>
  Math.min(0.6, Math.max(0.02, curve.base * Math.exp(-Math.abs(diff) / curve.scale)));

/** 1X2 a partir de la diferencia de Elo (ventaja de campo incluida) y la curva del empate. */
export function elo1X2(diff: number, curve: DrawCurve): { home: number; draw: number; away: number } {
  const draw = drawProbability(diff, curve);
  const local = eloExpected(diff);
  // El resto se reparte entre local y visitante con la proporción que da el Elo.
  return { home: (1 - draw) * local, draw, away: (1 - draw) * (1 - local) };
}

/** Ajusta `base` y `escala` de la curva del empate maximizando la verosimilitud del histórico. */
export function fitDrawCurve(samples: { diff: number; result: '1' | 'X' | '2' }[]): DrawCurve {
  if (samples.length < 50) return DRAW_CURVE_POR_DEFECTO;

  /*
   * Rejilla de 25 x 27 curvas sobre todas las muestras. Lo que se calcula aquí y no dentro del bucle
   * es lo que no depende de la curva que se está probando: la probabilidad del local según el Elo
   * (`eloExpected`, que lleva una potencia) y `exp(-|diff| / escala)`, que solo depende de la escala y
   * se tabula una vez por cada una de las 27. Antes eran 25 x 27 x N potencias y exponenciales; ahora
   * son N y 27 x N. Las operaciones que quedan son las mismas y en el mismo orden, así que la curva
   * elegida es exactamente la de antes, empates de la rejilla incluidos.
   */
  const n = samples.length;
  const escalas: number[] = [];
  for (let scale = 80; scale <= 600; scale += 20) escalas.push(scale);

  const local = new Float64Array(n);
  const codigo = new Int8Array(n);
  const E = new Float64Array(escalas.length * n);
  for (let i = 0; i < n; i++) {
    const d = samples[i].diff;
    local[i] = eloExpected(d);
    codigo[i] = samples[i].result === '1' ? 1 : samples[i].result === 'X' ? 0 : 2;
    const abs = Math.abs(d);
    for (let e = 0; e < escalas.length; e++) E[e * n + i] = Math.exp(-abs / escalas[e]);
  }

  let mejor = DRAW_CURVE_POR_DEFECTO;
  let mejorLl = -Infinity;
  for (let base = 0.16; base <= 0.4; base += 0.01) {
    for (let e = 0; e < escalas.length; e++) {
      const fila = e * n;
      let ll = 0;
      for (let i = 0; i < n; i++) {
        const draw = Math.min(0.6, Math.max(0.02, base * E[fila + i]));
        const c = codigo[i];
        const p = c === 0 ? draw : c === 1 ? (1 - draw) * local[i] : (1 - draw) * (1 - local[i]);
        ll += Math.log(Math.max(1e-9, p));
      }
      if (ll > mejorLl) {
        mejorLl = ll;
        mejor = { base, scale: escalas[e] };
      }
    }
  }
  return mejor;
}

/**
 * Ventaja de campo medida en puntos de Elo: la que hace que la probabilidad esperada del local
 * coincida con la que se observa. Con `p` la proporción de puntos que se lleva el local,
 * `ventaja = -400 · log10(1/p - 1)`.
 */
export function calibrateHomeAdvantage(samples: { result: '1' | 'X' | '2' }[]): number {
  if (samples.length < 100) return ELO_VENTAJA_LOCAL;
  const puntos = samples.reduce((a, s) => a + (s.result === '1' ? 1 : s.result === 'X' ? 0.5 : 0), 0);
  const p = Math.min(0.8, Math.max(0.2, puntos / samples.length));
  return Math.round(-400 * Math.log10(1 / p - 1));
}
