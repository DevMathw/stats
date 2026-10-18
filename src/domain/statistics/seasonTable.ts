/**
 * Tabla de posiciones y medias de UNA temporada concreta, la que se esté mirando.
 *
 * `recalculateAll` calcula solo la temporada vigente, y eso es lo correcto para el análisis: mezclar
 * temporadas sumaría dos torneos en la misma tabla y promediaría dos plantillas distintas (ver
 * `models/seasonScope.ts`). Pero la pantalla de una competición sí quiere enseñar temporadas cerradas, y
 * para eso hace falta la misma cadena de cálculo aplicada a otro subconjunto de partidos.
 *
 * Es la MISMA cadena, no una parecida: `deriveTeams` → `calculateForm` → `calculateTeamStats` →
 * `calculateStandings`, con los mismos parámetros del modelo. `seasonTable.test.ts` lo comprueba
 * comparando su salida con la del motor para la temporada en curso: si alguien cambia una y no la otra,
 * la prueba falla.
 */
import type { League, LeagueAverages, Match, ModelParams, StandingRow, TeamStats } from '../../types';
import { countsForAnalysis } from '../calculations/matchDerived';
import { deriveTeams } from '../engine';
import type { TeamMatch } from './aggregate';
import { calculateForm } from './form';
import { calculateLeagueAverages } from './leagueAverages';
import { calculateSplitStats } from './splitStats';
import { calculateStandings } from './standings';
import { calculateTeamStats } from './teamStats';

export interface SeasonTable {
  standings: StandingRow[];
  stats: TeamStats[];
  averages: LeagueAverages | null;
  /** Los que de verdad cuentan: con resultado y sin adjudicar. */
  played: Match[];
}

export function seasonTable(league: League, matches: Match[], params: ModelParams): SeasonTable {
  // Los adjudicados se ven en Partidos pero no cuentan en ninguna cifra del análisis (DIFF-09).
  const played = matches.filter(countsForAnalysis);
  const teams = deriveTeams([league], played, []);

  const rowsByTeam = new Map<string, TeamMatch[]>();
  const anotar = (id: string, fila: TeamMatch) => {
    const ya = rowsByTeam.get(id);
    if (ya) ya.push(fila);
    else rowsByTeam.set(id, [fila]);
  };
  for (const m of played) {
    anotar(m.homeTeamId, { match: m, isHome: true });
    anotar(m.awayTeamId, { match: m, isHome: false });
  }

  const mode = params.statAverageMode ?? 'excel';
  const stats = teams.map((t) =>
    calculateTeamStats(t, rowsByTeam.get(t.id) ?? [], calculateForm(played, t.leagueId, t.name, params.formWindowMode ?? 'fecha'), mode),
  );
  // `calculateStandings` ordena y además fija `position` en cada `TeamStats`.
  const standings = calculateStandings(stats);

  const averages =
    teams.length === 0
      ? null
      : calculateLeagueAverages(
          league.id,
          teams.map((t) => calculateSplitStats(t, rowsByTeam.get(t.id) ?? [], 'home', mode)),
          teams.map((t) => calculateSplitStats(t, rowsByTeam.get(t.id) ?? [], 'away', mode)),
          stats.map((s) => s.ppg),
          played,
        );

  return { standings, stats, averages, played };
}
