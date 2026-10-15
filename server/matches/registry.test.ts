import { describe, expect, it } from 'vitest';
import { LEAGUES, leagueBySlug, leagueList, sourcesFor } from './registry.ts';

const AHORA = new Date('2026-09-14T12:00:00Z');
const fuentes = (slug: string) => leagueList(AHORA).find((l) => l.slug === slug)!.sources;
const nombres = (slug: string) => sourcesFor(leagueBySlug(slug)!, AHORA).map((s) => s.name);
const OFICIAL_Y_FOTMOB = ['eng.1', 'esp.1', 'fra.1', 'uefa.champions', 'uefa.europa', 'uefa.europa.conf', 'ger.1', 'tur.1'];

describe('fuentes de cada competición (Configuración → Proveedor)', () => {
  it('web oficial + FotMob: Premier League, LaLiga, Ligue 1, las tres UEFA, Bundesliga y Süper Lig', () => {
    for (const slug of OFICIAL_Y_FOTMOB) {
      expect(nombres(slug)).toEqual([expect.any(String), 'FotMob']);
      expect(fuentes(slug)[0]).toMatchObject({ secondary: false, matches: true });
    }
    expect(fuentes('eng.1')[0]).toMatchObject({ name: 'premierleague.com', url: 'https://www.premierleague.com/', stats: true });
    // TFF: da los partidos, pero no estadísticas.
    expect(fuentes('tur.1')[0]).toMatchObject({ name: 'tff.org', stats: false });
  });

  it('las otras 24 solo FotMob, para partidos y estadísticas: nadie consulta ya FBref, Sofascore ni Flashscore', () => {
    const soloFotmob = LEAGUES.map((l) => l.slug).filter((slug) => !OFICIAL_Y_FOTMOB.includes(slug));
    expect(soloFotmob).toHaveLength(24);
    expect(soloFotmob).toEqual(expect.arrayContaining(['aut.1', 'gre.1', 'nor.1', 'pol.1', 'sco.1', 'sui.1', 'swe.1', 'mex.1', 'usa.1']));
    for (const slug of soloFotmob) {
      expect(nombres(slug)).toEqual(['FotMob']);
      expect(fuentes(slug)).toEqual([expect.objectContaining({ name: 'FotMob', url: 'https://www.fotmob.com/', matches: true, stats: true })]);
    }
  });
});
