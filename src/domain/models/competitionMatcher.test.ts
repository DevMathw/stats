import { describe, expect, it } from 'vitest';
import type { League } from '../../types';
import { matchCompetition, type ProviderCompetition } from './competitionMatcher';

function league(name: string, country: string): League {
  return {
    id: name,
    name,
    country,
    confederation: '',
    season: '2026/27',
    calendarFormat: '',
    teamCount: null,
    regularSeasonRounds: null,
    approximateStartDate: null,
    source: null,
    reliabilityNotes: null,
  };
}

function comp(
  id: string,
  name: string,
  country: string,
  type = 'League',
  plan = 'TIER_ONE',
): ProviderCompetition {
  return { id, name, country, type, currentSeason: 2026, plan };
}

/** Recorte realista del catálogo de un proveedor. */
const CATALOG = [
  comp('39', 'Premier League', 'England'),
  comp('40', 'Championship', 'England'),
  comp('45', 'FA Cup', 'England', 'Cup'),
  comp('41', 'League One', 'England'),
  comp('PD', 'Primera Division', 'Spain'),
  comp('143', 'Copa del Rey', 'Spain', 'Cup'),
  comp('SD', 'Segunda División', 'Spain'),
  comp('135', 'Serie A', 'Italy'),
  comp('BSA', 'Campeonato Brasileiro Série A', 'Brazil'),
  comp('ASL', 'Liga Profesional', 'Argentina'),
  comp('129', 'Primera Nacional', 'Argentina'),
  comp('CL', 'UEFA Champions League', 'Europe'),
  comp('EL', 'UEFA Europa League', 'Europe'),
  comp('UCL', 'UEFA Conference League', 'Europe'),
  comp('265', 'Primera División', 'Chile', 'League', 'TIER_THREE'),
];

describe('emparejar competiciones con el catálogo del proveedor', () => {
  it('acierta por nombre exacto dentro del país', () => {
    const m = matchCompetition(league('Premier League', 'Inglaterra'), CATALOG);
    expect(m.chosen?.id).toBe('39');
    expect(m.reason).toBe('exact');
  });

  it('traduce el país del Excel al del proveedor', () => {
    // "Espana" → "Spain": sin eso no encontraría nada.
    expect(matchCompetition(league('LaLiga', 'Espana'), CATALOG).chosen?.id).toBe('PD');
  });

  it('resuelve los nombres que no coinciden con una traducción explícita', () => {
    expect(matchCompetition(league('LaLiga', 'Espana'), CATALOG).reason).toBe('hint');
    expect(
      matchCompetition(league('Primera Division (Liga Profesional)', 'Argentina'), CATALOG)
        .chosen?.id,
    ).toBe('ASL');
  });

  it('no confunde dos ligas que se llaman igual en países distintos', () => {
    expect(matchCompetition(league('Serie A', 'Italia'), CATALOG).chosen?.id).toBe('135');
    expect(matchCompetition(league('Brasileirao Serie A', 'Brasil'), CATALOG).chosen?.id).toBe('BSA');
  });

  it('encuentra las competiciones UEFA, que no cuelgan de un país', () => {
    expect(matchCompetition(league('UEFA Champions League', 'Europa'), CATALOG).chosen?.id).toBe('CL');
    expect(matchCompetition(league('UEFA Europa League', 'Europa'), CATALOG).chosen?.id).toBe('EL');
    expect(
      matchCompetition(league('UEFA Conference League', 'Europa'), CATALOG).chosen?.id,
    ).toBe('UCL');
  });

  it('prefiere ligas antes que copas', () => {
    const m = matchCompetition(league('Championship', 'Inglaterra'), CATALOG);
    expect(m.chosen?.id).toBe('40');
    expect(m.chosen?.type).toBe('League');
  });

  it('cuando hay duda NO elige: devuelve candidatas', () => {
    const m = matchCompetition(league('Liga Inventada', 'Inglaterra'), CATALOG);
    expect(m.chosen).toBeNull();
    expect(m.reason).toBe('ambiguous');
    // Solo ofrece las ligas de ese país, no las copas de todo el mundo.
    expect(m.candidates.map((c) => c.country)).toEqual(['England', 'England', 'England']);
  });

  it('si el país solo tiene una liga, la asigna', () => {
    const m = matchCompetition(league('Primera Division (Campeonato Nacional)', 'Chile'), CATALOG);
    expect(m.chosen?.id).toBe('265');
  });

  it('propaga el plan que exige cada competición', () => {
    expect(matchCompetition(league('Premier League', 'Inglaterra'), CATALOG).chosen?.plan).toBe(
      'TIER_ONE',
    );
    expect(
      matchCompetition(league('Primera Division (Campeonato Nacional)', 'Chile'), CATALOG).chosen
        ?.plan,
    ).toBe('TIER_THREE');
  });

  it('un país que el proveedor no cubre no inventa nada', () => {
    const m = matchCompetition(league('Liga FUTVE', 'Venezuela'), CATALOG);
    expect(m.chosen).toBeNull();
  });
});
