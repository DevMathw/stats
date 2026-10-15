/**
 * Registro de «Actualizar partidos»: una entrada por liga con la fuente usada, la URL, los
 * recuentos y cada fuente que se intentó, haya servido o no.
 */
import type { SyncSummary } from './syncEngine';

export interface UpdateAttempt {
  source: string;
  url: string | null;
  secondary: boolean;
  ok: boolean;
  error: string | null;
}

export interface UpdateLogEntry {
  leagueId: string;
  leagueName: string;
  /** Archivo en `data/ligas/`. */
  file: string | null;
  /** Fecha y hora de la actualización (ISO). */
  at: string;
  ok: boolean;
  /** Fuente de la que salieron los partidos. */
  source: string | null;
  /** `true` si hubo que usar una fuente de respaldo. */
  secondary: boolean;
  url: string | null;
  season: string | null;
  /** Todas las fuentes consultadas, en el orden en que se probaron. */
  attempts: UpdateAttempt[];
  found: number;
  created: number;
  updated: number;
  unchanged: number;
  duplicatesAvoided: number;
  newFixtures: number;
  /** Pendientes que pasaron a disputados. */
  closedFixtures: number;
  notes: string[];
  errors: string[];
  excel: { path: string; created: boolean; playedRows: number; preserved: number } | null;
}

export function describeUpdateEntry(e: UpdateLogEntry): string {
  if (!e.ok) return `${e.leagueName}: ${e.errors[0] ?? 'no se pudo actualizar'}`;
  const fuente = e.secondary ? `${e.source} (secundaria)` : e.source;
  return `${e.leagueName} · ${fuente}: ${e.created} nuevos · ${e.updated} actualizados · ${e.unchanged} sin cambios`;
}

export function summarizeUpdateLog(entries: UpdateLogEntry[]): string {
  const ok = entries.filter((e) => e.ok).length;
  return ok === 0
    ? 'No se actualizó ninguna liga'
    : `Actualización completada · ${ok}/${entries.length} ligas procesadas correctamente`;
}

/** Suma los resúmenes de varias ligas en uno, para las pantallas que usan el formato antiguo. */
export function combineSummaries(list: SyncSummary[]): SyncSummary | null {
  if (list.length === 0) return null;
  const sumar = (f: (s: SyncSummary) => number) => list.reduce((a, s) => a + f(s), 0);
  return {
    startedAt: list[0].startedAt,
    finishedAt: list[list.length - 1].finishedAt,
    provider: list[0].provider,
    leaguesSynced: list.flatMap((s) => s.leaguesSynced),
    rounds: list.flatMap((s) => s.rounds),
    warnings: list.flatMap((s) => s.warnings),
    leaguesSkipped: list.flatMap((s) => s.leaguesSkipped),
    newMatches: sumar((s) => s.newMatches),
    updatedMatches: sumar((s) => s.updatedMatches),
    newFixtures: sumar((s) => s.newFixtures),
    updatedFixtures: sumar((s) => s.updatedFixtures),
    removedFixtures: sumar((s) => s.removedFixtures),
    prunedFixtures: sumar((s) => s.prunedFixtures),
    statisticsFetched: sumar((s) => s.statisticsFetched),
    unresolvedTeams: list.flatMap((s) => s.unresolvedTeams),
    errors: list.flatMap((s) => s.errors),
    foundMatches: sumar((s) => s.foundMatches),
    unchangedMatches: sumar((s) => s.unchangedMatches),
    duplicatesAvoided: sumar((s) => s.duplicatesAvoided),
  };
}
