import { describe, expect, it } from 'vitest';
import {
  attachTeamRefs,
  identityAliasesFor,
  resolveInCompetition,
  rosterFor,
  teamRef,
} from './teamIdentity';
import { EMPTY_STATISTICS } from '../../services/providers/types';
import type { League, Match } from '../../types';

/**
 * Lo que se prueba es la frontera entre unir y no unir: el mismo club con nombres distintos
 * se reconoce, y dos clubes distintos con nombres parecidos nunca se funden.
 */

const liga = (name: string, country: string): League => ({
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
});

const LALIGA = liga('LaLiga', 'Espana');
const UCL = liga('UEFA Champions League', '');
const SERIE_A = liga('Serie A', 'Italia');
const BRASIL = liga('Brasileirao Serie A', 'Brasil');
const BELGICA = liga('Belgian Pro League', 'Belgica');
const COLOMBIA = liga('Primera A (Liga BetPlay Dimayor)', 'Colombia');

/** Id de ESPN resuelto, o el estado si no se resolvió. */
const id = (name: string, league: League, aliases?: Record<string, string>) => {
  const r = resolveInCompetition(name, rosterFor(league), aliases);
  return r.status === 'resolved' ? r.team.espnId : r.status;
};

const partido = (leagueId: string, home: string, away: string): Match => ({
  id: `${leagueId}|${home}|${away}`,
  providerId: null,
  leagueId,
  country: '',
  season: '2026/27',
  date: '2026-09-08',
  round: 1,
  homeTeamId: `${leagueId}|${home}`,
  awayTeamId: `${leagueId}|${away}`,
  homeTeamName: home,
  awayTeamName: away,
  homeGoals: 1,
  awayGoals: 0,
  homeFirstHalfGoals: null,
  awayFirstHalfGoals: null,
  ...EMPTY_STATISTICS,
  source: null,
  updatedAt: null,
  statsSource: null,
  statsUpdatedAt: null,
  statsCitations: [],
});

describe('resolveInCompetition', () => {
  it('reconoce el mismo club aunque cambie el sufijo', () => {
    expect(id('Real Madrid', LALIGA)).toBe('86');
    expect(id('Real Madrid CF', UCL)).toBe('86');
    expect(id('FC Internazionale Milano', UCL)).toBe('110');
  });

  it('distingue clubes de nombre parecido', () => {
    expect(id('Club Brujas', BELGICA)).toBe('570');
    expect(id('Cercle Brujas', BELGICA)).toBe('3610');
  });

  it('solo busca dentro de la competición', () => {
    expect(id('Inter', SERIE_A)).toBe('110');
    // «Inter» no es Internacional de Porto Alegre, aunque el texto se parezca.
    expect(id('Inter', BRASIL)).toBe('unresolved');
    expect(id('Real Madrid', COLOMBIA)).toBe('unresolved');
  });

  it('el alias revisado evita la unión equivocada', () => {
    expect(id('Deportivo Alavés', LALIGA)).toBe('96');
    expect(id('RCD Espanyol de Barcelona', LALIGA)).toBe('88');
  });

  it('un alias del usuario no puede sacar a un club de su liga', () => {
    expect(id('Mi Madrid', COLOMBIA, { 'mi madrid': '86' })).toBe('unresolved');
    expect(id('Mi Madrid', LALIGA, { 'mi madrid': '86' })).toBe('86');
  });
});

describe('attachTeamRefs', () => {
  it('da la misma referencia al mismo club en LaLiga y en la Champions', () => {
    const r = attachTeamRefs({
      leagues: [LALIGA, UCL],
      matches: [
        partido('LaLiga', 'Real Madrid', 'Sevilla FC'),
        partido('UEFA Champions League', 'Real Madrid CF', 'FC Internazionale Milano'),
      ],
      fixtures: [],
    });
    expect(r.matches[0].homeTeamRef).toBe(teamRef('86'));
    expect(r.matches[1].homeTeamRef).toBe(teamRef('86'));
    expect(r.matches[1].awayTeamRef).toBe(teamRef('110'));
  });

  it('no cambia nombres ni claves por competición', () => {
    const original = partido('UEFA Champions League', 'Real Madrid CF', 'FC Internazionale Milano');
    const [m] = attachTeamRefs({ leagues: [UCL], matches: [original], fixtures: [] }).matches;
    expect(m.homeTeamName).toBe('Real Madrid CF');
    expect(m.homeTeamId).toBe(original.homeTeamId);
  });

  it('reporta lo que no puede identificar, sin inventar una referencia', () => {
    const r = attachTeamRefs({
      leagues: [LALIGA],
      matches: [partido('LaLiga', 'Equipo Inventado', 'Real Madrid')],
      fixtures: [],
    });
    expect(r.matches[0].homeTeamRef).toBeNull();
    expect(r.issues).toEqual([
      { leagueId: 'LaLiga', name: 'Equipo Inventado', status: 'unresolved', candidates: [] },
    ]);
  });

  it('dos formas de escribir el mismo club siguen unidas', () => {
    const r = attachTeamRefs({
      leagues: [LALIGA],
      matches: [partido('LaLiga', 'Real Madrid', 'Getafe'), partido('LaLiga', 'Real Madrid CF', 'Sevilla FC')],
      fixtures: [],
    });
    expect(r.matches[0].homeTeamRef).toBe(teamRef('86'));
    expect(r.matches[1].homeTeamRef).toBe(teamRef('86'));
    expect(r.issues).toEqual([]);
  });

  it('un club parecido no se queda con la referencia de otro', () => {
    // «FK Žalgiris» (Vilnius) cae por contención en «Kauno Žalgiris», que es otro club.
    const UECL = liga('UEFA Conference League', '');
    const r = attachTeamRefs({
      leagues: [UECL],
      matches: [
        partido('UEFA Conference League', 'FK Kauno Žalgiris', 'AS Monaco'),
        partido('UEFA Conference League', 'FK Žalgiris', 'AS Monaco'),
      ],
      fixtures: [],
    });
    expect(r.matches[0].homeTeamRef).toBe(teamRef('20028'));
    expect(r.matches[1].homeTeamRef).toBeNull();
    expect(r.issues.find((i) => i.name === 'FK Žalgiris')?.status).toBe('shared');
  });

  it('es idempotente y no copia filas que ya estaban bien', () => {
    const leagues = [LALIGA, UCL];
    const a = attachTeamRefs({ leagues, matches: [partido('LaLiga', 'Real Madrid', 'Getafe')], fixtures: [] });
    const b = attachTeamRefs({ leagues, matches: a.matches, fixtures: a.fixtures });
    expect(b.matches[0]).toBe(a.matches[0]);
  });
});

describe('identityAliasesFor', () => {
  const LIGUE1 = liga('Ligue 1', 'Francia');
  const guardados = attachTeamRefs({
    leagues: [LIGUE1],
    matches: [partido('Ligue 1', 'Marsella', 'Niza')],
    fixtures: [],
  }).matches;

  it('traduce el nombre de la web oficial al que ya usa la app', () => {
    expect(
      identityAliasesFor(LIGUE1, guardados, ['Olympique de Marseille', 'OGC Nice', 'Equipo Inventado']),
    ).toEqual({ 'olympique de marseille': 'Marsella', 'ogc nice': 'Niza' });
  });

  it('si dos nombres entrantes caen en el mismo club, no crea ninguno', () => {
    expect(identityAliasesFor(LIGUE1, guardados, ['Olympique de Marseille', 'Marseille'])).toEqual({});
  });
});

/**
 * Los ocho clubes que entraban DOS veces en su competicion: el libro histórico escribe el nombre
 * oficial largo y la fuente en vivo el corto, así que la temporada en curso tenía identidad y escudo y
 * las tres históricas no. Se arregló el 12/10/2026 declarando AMBAS grafías en `teamAliasSeed`.
 *
 * Las dos tienen que resolver al mismo id: con una sola, `attachTeamRefs` quita la referencia a la que
 * llega «por contención» (la regla que impide fundir «FK Žalgiris» con «Kauno Žalgiris») y el duplicado
 * reaparece del otro lado.
 */
describe('nombre largo del histórico y corto de la fuente en vivo', () => {
  const AUSTRIA = liga('Bundesliga Austria', 'Austria');
  const SUIZA = liga('Super League Suiza', 'Suiza');

  const PAREJAS: [League, string, string, string][] = [
    [AUSTRIA, 'FK Austria Wien', 'Austria Wien', '1382'],
    [AUSTRIA, 'SK Rapid Wien', 'Rapid Wien', '519'],
    [AUSTRIA, 'SCR Altach', 'Altach', '4405'],
    [BELGICA, 'RC Sporting Charleroi', 'Charleroi', '3616'],
    [SUIZA, 'FC Lausanne-Sport', 'Lausanne', '11551'],
    [SUIZA, 'Grasshopper Club Z\u00fcrich', 'Grasshopper', '492'],
    [SUIZA, 'BSC Young Boys', 'Young Boys', '2722'],
    [SUIZA, 'FC St. Gallen 1879', 'St. Gallen', '557'],
  ];

  it.each(PAREJAS)('%s: «%s» y «%s» son el mismo club', (league, largo, corto, espnId) => {
    expect(id(largo, league)).toBe(espnId);
    expect(id(corto, league)).toBe(espnId);
  });

  it('los dos nombres conservan su referencia, así que se pueden fundir', () => {
    // Con un solo alias, uno de los dos se quedaba sin referencia y el club seguía partido en dos.
    for (const [league, largo, corto, espnId] of PAREJAS) {
      const r = attachTeamRefs({
        leagues: [league],
        matches: [partido(league.id, largo, corto)],
        fixtures: [],
      });
      expect([r.matches[0].homeTeamRef, r.matches[0].awayTeamRef]).toEqual([teamRef(espnId), teamRef(espnId)]);
    }
  });

  it('«FC Stade-Lausanne-Ouchy» NO es el Lausanne', () => {
    // Comparten la palabra «Lausanne» y son clubes distintos: el alias no puede arrastrarlo.
    expect(id('FC Stade-Lausanne-Ouchy', SUIZA)).not.toBe('11551');
  });
});
