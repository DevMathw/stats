/**
 * Dixon-Coles: Poisson con dos correcciones que importan de verdad en el fútbol.
 *
 * Dixon y Coles (1997) midieron dos cosas que el Poisson simple hace mal:
 *
 *  1. **Los marcadores de pocos goles no son independientes.** 0-0, 1-0, 0-1 y 1-1 salen más (o menos)
 *     de lo que dice el producto de dos Poisson. Se corrigen con un factor `tau` que depende de un solo
 *     parámetro, `rho`, y solo toca esos cuatro marcadores.
 *  2. **La forma reciente pesa más que la de hace meses.** Cada partido entra en el ajuste con un peso
 *     `exp(-xi · días)`, así que el modelo se olvida poco a poco de lo viejo.
 *
 * Se estiman por máxima verosimilitud, por competición: ataque y defensa de cada equipo, la ventaja de
 * campo (`gamma`) y `rho`. Con la restricción habitual de media de ataques = 1, que quita la
 * indeterminación de la escala.
 *
 * Ajuste por **descenso de gradiente** sobre la log-verosimilitud, con gradientes analíticos. Es el
 * método más simple que converge bien aquí y no necesita ninguna dependencia.
 *
 * Si una competición tiene menos partidos que `MIN_PARTIDOS`, no se ajusta: se devuelve `null` y el
 * modelo queda fuera de esa liga en vez de dar números sacados de cuatro partidos.
 */
import { poissonPmf } from '../probability/poisson';

/** Con menos de esto, los ataques y defensas de cada equipo no se sostienen. */
export const MIN_PARTIDOS = 60;

/** Vida media del peso temporal, en días: a los 90 días un partido pesa la mitad. */
export const XI_POR_DEFECTO = Math.log(2) / 90;

export interface DixonColesFit {
  attack: Map<string, number>;
  defense: Map<string, number>;
  /** Ventaja de campo multiplicativa sobre los goles esperados del local. */
  gamma: number;
  /** Corrección de los marcadores bajos. 0 = Poisson puro. */
  rho: number;
  /** Partidos usados y suma de sus pesos temporales. */
  matches: number;
  weight: number;
  logLikelihood: number;
}

export interface DixonColesMatch {
  homeTeamId: string;
  awayTeamId: string;
  homeGoals: number;
  awayGoals: number;
  /** Días de antigüedad respecto al momento del ajuste. 0 = el más reciente. */
  ageDays: number;
}

/** Factor de Dixon-Coles para los cuatro marcadores bajos. */
export function tau(x: number, y: number, lh: number, la: number, rho: number): number {
  if (x === 0 && y === 0) return 1 - lh * la * rho;
  if (x === 0 && y === 1) return 1 + lh * rho;
  if (x === 1 && y === 0) return 1 + la * rho;
  if (x === 1 && y === 1) return 1 - rho;
  return 1;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Ajusta el modelo a los partidos de UNA competición. `null` si no hay bastantes.
 *
 * Los parámetros se guardan en logaritmos (ataque, defensa y gamma son positivos), así el descenso no
 * puede sacarlos de su dominio. `rho` se limita a [-0.4, 0.4], donde `tau` no se vuelve negativo con
 * goles esperados normales.
 */
export function fitDixonColes(
  matches: DixonColesMatch[],
  opciones: { xi?: number; iterations?: number; learningRate?: number } = {},
): DixonColesFit | null {
  if (matches.length < MIN_PARTIDOS) return null;
  const xi = opciones.xi ?? XI_POR_DEFECTO;
  const iteraciones = opciones.iterations ?? 250;
  const lr = opciones.learningRate ?? 0.05;

  const equipos = [...new Set(matches.flatMap((m) => [m.homeTeamId, m.awayTeamId]))];
  const indice = new Map(equipos.map((t, i) => [t, i]));
  const n = equipos.length;
  if (n < 4) return null;

  // log-ataque, log-defensa, log-gamma, rho
  const a = new Float64Array(n);
  const d = new Float64Array(n);
  let logGamma = Math.log(1.35);
  let rho = 0;

  const pesos = matches.map((m) => Math.exp(-xi * Math.max(0, m.ageDays)));
  const pesoTotal = pesos.reduce((s, w) => s + w, 0);
  if (pesoTotal <= 0) return null;

  for (let it = 0; it < iteraciones; it++) {
    const ga = new Float64Array(n);
    const gd = new Float64Array(n);
    let gGamma = 0;
    let gRho = 0;

    for (let k = 0; k < matches.length; k++) {
      const m = matches[k];
      const w = pesos[k];
      const i = indice.get(m.homeTeamId)!;
      const j = indice.get(m.awayTeamId)!;
      const lh = Math.exp(a[i] + d[j] + logGamma);
      const la = Math.exp(a[j] + d[i]);

      // d/dθ de [x·log λ − λ] con λ = exp(θ): (x − λ) por cada θ que entra en λ.
      const rLocal = m.homeGoals - lh;
      const rVisitante = m.awayGoals - la;
      ga[i] += w * rLocal;
      gd[j] += w * rLocal;
      gGamma += w * rLocal;
      ga[j] += w * rVisitante;
      gd[i] += w * rVisitante;

      // Derivada del factor tau, solo en los cuatro marcadores bajos.
      const x = m.homeGoals;
      const y = m.awayGoals;
      if (x <= 1 && y <= 1) {
        const t = tau(x, y, lh, la, rho);
        if (t > 1e-9) {
          let dtdlh = 0;
          let dtdla = 0;
          let dtdrho = 0;
          if (x === 0 && y === 0) {
            dtdlh = -la * rho;
            dtdla = -lh * rho;
            dtdrho = -lh * la;
          } else if (x === 0 && y === 1) {
            dtdlh = rho;
            dtdrho = lh;
          } else if (x === 1 && y === 0) {
            dtdla = rho;
            dtdrho = la;
          } else {
            dtdrho = -1;
          }
          // Regla de la cadena hasta los parámetros: dλ/dθ = λ.
          const cLocal = (w * dtdlh * lh) / t;
          const cVisitante = (w * dtdla * la) / t;
          ga[i] += cLocal;
          gd[j] += cLocal;
          gGamma += cLocal;
          ga[j] += cVisitante;
          gd[i] += cVisitante;
          gRho += (w * dtdrho) / t;
        }
      }
    }

    const paso = lr / pesoTotal;
    for (let i = 0; i < n; i++) {
      a[i] += paso * ga[i];
      d[i] += paso * gd[i];
    }
    logGamma += paso * gGamma;
    rho = clamp(rho + paso * gRho, -0.4, 0.4);

    // Restricción de escala: media de ataques = 1 (en logaritmos, media 0). La defensa absorbe el resto.
    let mediaA = 0;
    for (let i = 0; i < n; i++) mediaA += a[i];
    mediaA /= n;
    for (let i = 0; i < n; i++) {
      a[i] -= mediaA;
      d[i] += mediaA;
    }
  }

  const attack = new Map<string, number>();
  const defense = new Map<string, number>();
  equipos.forEach((t, i) => {
    attack.set(t, Math.exp(a[i]));
    defense.set(t, Math.exp(d[i]));
  });
  const fit: DixonColesFit = {
    attack,
    defense,
    gamma: Math.exp(logGamma),
    rho,
    matches: matches.length,
    weight: pesoTotal,
    logLikelihood: 0,
  };
  fit.logLikelihood = logLikelihood(fit, matches, pesos);
  return fit;
}

function logLikelihood(fit: DixonColesFit, matches: DixonColesMatch[], pesos: number[]): number {
  let ll = 0;
  for (let k = 0; k < matches.length; k++) {
    const m = matches[k];
    const l = lambdas(fit, m.homeTeamId, m.awayTeamId);
    if (!l) continue;
    const t = Math.max(1e-9, tau(m.homeGoals, m.awayGoals, l.home, l.away, fit.rho));
    ll += pesos[k] * (Math.log(Math.max(1e-12, poissonPmf(m.homeGoals, l.home))) + Math.log(Math.max(1e-12, poissonPmf(m.awayGoals, l.away))) + Math.log(t));
  }
  return ll;
}

/** Goles esperados de un enfrentamiento. `null` si alguno de los dos equipos no estaba en el ajuste. */
export function lambdas(fit: DixonColesFit, homeTeamId: string, awayTeamId: string): { home: number; away: number } | null {
  const ataqueLocal = fit.attack.get(homeTeamId);
  const defensaLocal = fit.defense.get(homeTeamId);
  const ataqueVisitante = fit.attack.get(awayTeamId);
  const defensaVisitante = fit.defense.get(awayTeamId);
  if (ataqueLocal === undefined || defensaLocal === undefined || ataqueVisitante === undefined || defensaVisitante === undefined) return null;
  return {
    home: clamp(ataqueLocal * defensaVisitante * fit.gamma, 0.05, 8),
    away: clamp(ataqueVisitante * defensaLocal, 0.05, 8),
  };
}

/**
 * Matriz de marcadores con la corrección de Dixon-Coles, normalizada para que sume 1.
 * Es la que da 1X2, Over/Under, BTTS y marcadores probables sin volver a estimar nada.
 */
export function dixonColesMatrix(lh: number, la: number, rho: number, maxGoals = 10): number[][] {
  const m: number[][] = [];
  let total = 0;
  for (let x = 0; x <= maxGoals; x++) {
    m[x] = [];
    for (let y = 0; y <= maxGoals; y++) {
      const p = poissonPmf(x, lh) * poissonPmf(y, la) * Math.max(0, tau(x, y, lh, la, rho));
      m[x][y] = p;
      total += p;
    }
  }
  if (total > 0) for (let x = 0; x <= maxGoals; x++) for (let y = 0; y <= maxGoals; y++) m[x][y] /= total;
  return m;
}
