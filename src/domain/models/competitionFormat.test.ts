import { describe, expect, it } from 'vitest';
import { COMPETITION_FORMATS, competitionFormat, roundKey, roundLabel, stageOf } from './competitionFormat';
import { LEAGUE_TIME_ZONES } from './leagueTimeZones';
import { ESPN_LEAGUES } from './espnLeagues';

const LIGAPRO = { name: 'LigaPro Serie A', country: 'Ecuador' };
const LALIGA = { name: 'LaLiga', country: 'Espana' };

describe('registro de formatos', () => {
  it('cubre todas las competiciones del catálogo, con su zona horaria', () => {
    for (const slug of new Set(Object.values(ESPN_LEAGUES))) {
      expect(COMPETITION_FORMATS[slug], `falta el formato de ${slug}`).toBeDefined();
      expect(LEAGUE_TIME_ZONES[slug], `falta la zona horaria de ${slug}`).toBeDefined();
    }
  });

  it('una competición desconocida no se queda sin formato ni se le inventan fases', () => {
    const f = competitionFormat({ name: 'Liga inventada', country: 'Narnia' });
    expect(f.stages).toBeUndefined();
    expect(f.regularRounds).toBeNull();
  });
});

describe('jornadas y fases', () => {
  it('la jornada de una fase no es la misma que la de otra', () => {
    expect(roundKey({ round: 1, phase: 'Championship Round' })).not.toBe(roundKey({ round: 1, phase: null }));
  });

  it('la LigaPro numera dos etapas de 15 jornadas', () => {
    expect(stageOf(15, competitionFormat(LIGAPRO))).toEqual({ name: '1.ª etapa', round: 15 });
    expect(stageOf(16, competitionFormat(LIGAPRO))).toEqual({ name: '2.ª etapa', round: 1 });
    expect(roundLabel({ round: 16 }, LIGAPRO)).toBe('2.ª etapa · J1');
  });

  it('la fase que publica la fuente manda sobre las etapas', () => {
    expect(roundLabel({ round: 1, phase: 'Championship Round' }, LIGAPRO)).toBe('Championship Round · J1');
  });

  it('una liga corrida sigue enseñando solo la jornada', () => {
    expect(roundLabel({ round: 7 }, LALIGA)).toBe('J7');
  });

  it('una jornada más allá de las etapas conocidas no se fuerza a ninguna', () => {
    expect(stageOf(31, competitionFormat(LIGAPRO))).toBeNull();
    expect(roundLabel({ round: 31 }, LIGAPRO)).toBe('J31');
  });
});
