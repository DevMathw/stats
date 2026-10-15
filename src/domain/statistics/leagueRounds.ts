/**
 * En qué jornada va cada liga y cuál es la siguiente.
 *
 * `EQUIPOS`/`FORMA` calculan la última jornada **por equipo** (FORMA!D). Esto es lo mismo a
 * nivel de liga, y es lo que permite responder "¿qué jornada toca ahora?" y filtrar las
 * proyecciones a la próxima.
 *
 * Hay dos cosas distintas que se confundían y aquí van separadas:
 *   - lo que **falta de una jornada ya empezada** (aplazados, partidos aún no jugados de la
 *     jornada en curso), y
 *   - la **próxima jornada nueva**, la primera que aún no ha empezado.
 *
 * No lo hay en el Excel: allí la jornada se escribe a mano al pegar los fixtures.
 */
import type { Fixture, Match } from '../../types';
import { hasResult } from '../calculations/matchDerived';
import { roundKey } from '../models/competitionFormat';

export interface RoundBreakdown {
  /** Fase con nombre propio a la que pertenece la jornada, tal como la publica la fuente. */
  phase: string | null;
  round: number;
  played: number;
  pending: number;
}

export interface LeagueRounds {
  leagueId: string;
  /**
   * Fase en curso: la del último partido disputado. `null` en las competiciones que numeran de corrido.
   * Importa porque cada fase vuelve a numerar desde la jornada 1: sin ella, la J1 del hexagonal de la
   * LigaPro y la J1 de febrero serían la misma jornada.
   */
  currentPhase: string | null;
  /** Jornada más alta disputada DENTRO de `currentPhase`. `null` si la liga no tiene partidos. */
  currentRound: number | null;
  /**
   * Primera jornada con partidos pendientes, sea de la jornada en curso o de una futura.
   * Es la que usa el filtro «solo próxima jornada».
   */
  nextRound: number | null;
  /** Fase de `nextRound`. */
  nextPhase: string | null;
  /** Primera jornada pendiente que aún NO ha empezado (después de `currentRound` en el calendario). */
  nextNewRound: number | null;
  /** Partidos pendientes de jornadas ya empezadas (`<= currentRound`): aplazados y rezagados. */
  pendingInStartedRounds: number;
  /** Nº de partidos pendientes en `nextRound`. */
  fixturesInNextRound: number;
  /** Total de partidos pendientes cargados en la liga. */
  pendingFixtures: number;
  /** Jornadas con partidos pendientes, ordenadas. */
  pendingRounds: number[];
  /** Jugados y pendientes por jornada. Sirve para ver de un vistazo qué falta por cargar. */
  breakdown: RoundBreakdown[];
}

function emptyRounds(leagueId: string): LeagueRounds {
  return {
    leagueId,
    currentPhase: null,
    currentRound: null,
    nextRound: null,
    nextPhase: null,
    nextNewRound: null,
    pendingInStartedRounds: 0,
    fixturesInNextRound: 0,
    pendingFixtures: 0,
    pendingRounds: [],
    breakdown: [],
  };
}

export function calculateLeagueRounds(
  matches: Match[],
  fixtures: Fixture[],
): Map<string, LeagueRounds> {
  const out = new Map<string, LeagueRounds>();
  /** liga → fase|jornada → conteo. La clave lleva la fase porque cada una numera desde 1. */
  const counts = new Map<string, Map<string, { phase: string | null; round: number; played: number; pending: number }>>();
  /** liga → fase → primera fecha en la que aparece: es lo que las ordena en el calendario. */
  const desde = new Map<string, Map<string, string>>();
  /** liga → [fecha del último jugado, su fase] */
  const ultimo = new Map<string, [string, string | null]>();

  const ensure = (leagueId: string): LeagueRounds => {
    let r = out.get(leagueId);
    if (!r) {
      r = emptyRounds(leagueId);
      out.set(leagueId, r);
      counts.set(leagueId, new Map());
      desde.set(leagueId, new Map());
    }
    return r;
  };

  const bump = (m: Match | Fixture, campo: 'played' | 'pending') => {
    const clave = roundKey(m);
    const fase = m.phase ?? null;
    const celdas = counts.get(m.leagueId)!;
    const celda = celdas.get(clave) ?? { phase: fase, round: m.round, played: 0, pending: 0 };
    celda[campo]++;
    celdas.set(clave, celda);
    const primeras = desde.get(m.leagueId)!;
    const vista = primeras.get(fase ?? '');
    if (!vista || m.date < vista) primeras.set(fase ?? '', m.date);
  };

  for (const m of matches) {
    if (!hasResult(m)) continue;
    ensure(m.leagueId);
    bump(m, 'played');
    const previo = ultimo.get(m.leagueId);
    if (!previo || m.date > previo[0]) ultimo.set(m.leagueId, [m.date, m.phase ?? null]);
  }

  for (const f of fixtures) {
    if (f.status === 'Cancelado') continue;
    const r = ensure(f.leagueId);
    r.pendingFixtures++;
    bump(f, 'pending');
  }

  for (const [leagueId, celdas] of counts) {
    const r = out.get(leagueId)!;
    const primeras = desde.get(leagueId)!;
    const orden = (b: { phase: string | null }) => primeras.get(b.phase ?? '') ?? '';
    r.breakdown = [...celdas.values()].sort((a, b) => orden(a).localeCompare(orden(b)) || a.round - b.round);

    // La fase en curso es la del último partido disputado, y la jornada actual, la más alta de esa fase.
    r.currentPhase = ultimo.get(leagueId)?.[1] ?? null;
    const enCurso = r.breakdown.filter((b) => b.played > 0 && (b.phase ?? null) === r.currentPhase);
    r.currentRound = enCurso.length ? Math.max(...enCurso.map((b) => b.round)) : null;

    const pendientes = r.breakdown.filter((b) => b.pending > 0);
    r.pendingRounds = pendientes.map((b) => b.round);
    r.nextRound = pendientes[0]?.round ?? null;
    r.nextPhase = pendientes[0]?.phase ?? null;
    r.fixturesInNextRound = pendientes[0]?.pending ?? 0;

    // «Ya empezada» es una jornada con algún partido jugado y alguno por jugar: aplazados y rezagados.
    // Se mira jornada a jornada y no «hasta la actual», porque varias fases pueden correr a la vez (la
    // fase final de la LigaPro son tres grupos en paralelo) y sus jornadas altas no han empezado.
    r.pendingInStartedRounds = r.breakdown.filter((b) => b.played > 0).reduce((a, b) => a + b.pending, 0);
    r.nextNewRound = r.breakdown.find((b) => b.pending > 0 && b.played === 0)?.round ?? null;
  }

  return out;
}

/** Frase corta para la barra de estado y el resumen de sincronización. */
export function describeLeagueRounds(r: LeagueRounds): string {
  if (r.currentRound === null) {
    return r.nextRound === null
      ? 'sin partidos ni calendario'
      : `sin partidos jugados · próxima J${r.nextRound} (${r.fixturesInNextRound})`;
  }
  const fase = r.currentPhase ? `${r.currentPhase} · ` : '';
  const parts = [`va por ${fase}J${r.currentRound}`];
  if (r.pendingInStartedRounds > 0) {
    parts.push(
      `quedan ${r.pendingInStartedRounds} de jornadas ya empezadas`,
    );
  }
  parts.push(
    r.nextNewRound === null
      ? 'sin jornadas nuevas cargadas'
      : `próxima nueva J${r.nextNewRound} (${r.breakdown.find((b) => b.pending > 0 && b.round === r.nextNewRound)?.pending ?? 0})`,
  );
  return parts.join(' · ');
}
