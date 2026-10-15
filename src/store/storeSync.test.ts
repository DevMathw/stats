import { describe, expect, it } from 'vitest';
import { diffStore } from './storeSync';

const partido = (id: string, goles = 1) => ({ id, leagueId: 'LaLiga', homeGoals: goles, awayGoals: 0 });
const valor = (state: Record<string, unknown>) => ({ state, version: 4 });

describe('diffStore', () => {
  it('sin nada guardado sustituye todo, con el orden', () => {
    const { patch } = diffStore(null, valor({ leagues: [{ id: 'LaLiga' }], matches: [partido('a'), partido('b')], params: { wBase: 0.45 }, lastUpdate: null }));
    expect(patch?.matches).toEqual({ upsert: [partido('a'), partido('b')], remove: [], order: ['a', 'b'], replace: true });
    expect(patch?.leagues).toEqual([{ id: 'LaLiga' }]);
    expect(patch?.settings).toEqual({ params: { wBase: 0.45 }, lastUpdate: null });
  });

  it('sin cambios no envía nada, aunque los partidos sean objetos nuevos', () => {
    const a = valor({ leagues: [], matches: [partido('a')], teamAliases: {}, identityAliases: {} });
    const { snapshot } = diffStore(null, a);
    expect(diffStore(snapshot, a).patch).toBeNull();
    expect(diffStore(snapshot, valor({ ...a.state, matches: [partido('a')] })).patch).toBeNull();
  });

  it('solo viajan el partido cambiado, el nuevo, el borrado y el orden', () => {
    const { snapshot } = diffStore(null, valor({ matches: [partido('a'), partido('b'), partido('c')] }));
    const { patch } = diffStore(snapshot, valor({ matches: [partido('c'), partido('a', 3), partido('d')] }));
    expect(patch?.matches).toEqual({ upsert: [partido('a', 3), partido('d')], remove: ['b'], order: ['c', 'a', 'd'] });
    expect(patch?.leagues).toBeUndefined();
    expect(patch?.settings).toBeUndefined();
  });

  it('un ajuste cambiado o quitado viaja solo', () => {
    const { snapshot } = diffStore(null, valor({ matches: [], apiKey: 'x', fixtureHorizon: 1 }));
    expect(diffStore(snapshot, valor({ matches: [], fixtureHorizon: 2 })).patch).toEqual({
      version: 4,
      settings: { fixtureHorizon: 2 },
      removeSettings: ['apiKey'],
    });
  });
});
