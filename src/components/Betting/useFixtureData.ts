import { useCallback, useEffect, useMemo } from 'react';
import type { DataContext } from '../../domain/betting/evaluation';
import { leagueRates, selectModelPick, type LeagueRates, type ModelPick } from '../../domain/betting/modelPick';
import { useActiveProfile, useBetting } from '../../store/useBetting';
import { useStore } from '../../store/useStore';

/** Todo lo que el motor de picks necesita de un partido pendiente, sacado del store de datos. */
export function useFixtureData(): (fixtureId: string) => DataContext | null {
  const fixtures = useStore((s) => s.fixtures);
  const derived = useStore((s) => s.derived);
  const params = useStore((s) => s.params);

  return useCallback(
    (fixtureId: string) => {
      const fixture = fixtures.find((f) => f.id === fixtureId);
      const projection = derived.projectionsByFixtureId.get(fixtureId);
      if (!fixture || !projection) return null;
      return {
        fixture,
        projection,
        homeHistory: derived.historyByTeamId.get(fixture.homeTeamId)?.home ?? null,
        awayHistory: derived.historyByTeamId.get(fixture.awayTeamId)?.away ?? null,
        homeSplit: derived.homeStatsByTeamId.get(fixture.homeTeamId),
        awaySplit: derived.awayStatsByTeamId.get(fixture.awayTeamId),
        dispersion: derived.dispersionByLeague.get(fixture.leagueId),
        params,
      };
    },
    [fixtures, derived, params],
  );
}

const SIN_FRECUENCIAS: LeagueRates = new Map();

/** Frecuencia de los mercados del pick en cada liga: una vez por liga mientras no cambien los partidos. */
function useLeagueRates(): (leagueId: string) => LeagueRates {
  const matches = useStore((s) => s.matches);
  return useMemo(() => {
    const porLiga = new Map<string, typeof matches>();
    for (const m of matches) (porLiga.get(m.leagueId) ?? porLiga.set(m.leagueId, []).get(m.leagueId)!).push(m);
    const frecuencias = new Map([...porLiga].map(([liga, ms]) => [liga, leagueRates(ms)]));
    return (leagueId: string) => frecuencias.get(leagueId) ?? SIN_FRECUENCIAS;
  }, [matches]);
}

/** Pick del modelo de un partido. `null` sin datos del partido. */
export function useModelPick(data: DataContext | null): ModelPick | null {
  const rates = useLeagueRates();
  const settings = useActiveProfile().settings;
  const validation = useBetting((s) => s.modelValidation);
  return useMemo(
    () => (data ? selectModelPick({ data, rates: rates(data.fixture.leagueId), settings, validation: validation?.markets }) : null),
    [data, rates, settings, validation],
  );
}

/**
 * El pick del modelo de TODOS los partidos pendientes.
 *
 * Solo se rehace cuando cambia algo que afecta a todos los picks: los datos (`getData` depende de partidos,
 * pendientes y derivados), las frecuencias de liga, los ajustes del perfil o la validación de los mercados.
 */
function useTodosLosPicks(): Map<string, ModelPick> {
  const fixtures = useStore((s) => s.fixtures);
  const getData = useFixtureData();
  const rates = useLeagueRates();
  const settings = useActiveProfile().settings;
  const validation = useBetting((s) => s.modelValidation);

  return useMemo(() => {
    const out = new Map<string, ModelPick>();
    for (const f of fixtures) {
      const data = getData(f.id);
      if (data) out.set(f.id, selectModelPick({ data, rates: rates(data.fixture.leagueId), settings, validation: validation?.markets }));
    }
    return out;
  }, [fixtures, getData, rates, settings, validation]);
}

/**
 * Los de una lista de partidos, para la tabla de Proyecciones.
 *
 * Se calculan todos de una vez y aquí solo se eligen los pedidos.
 *
 * Antes la dependencia del `useMemo` era la lista de ids, que sale de las filas ya filtradas. Cualquier
 * cambio de competición, jornada o fecha creaba una lista nueva y rehacía los picks de todo lo visible,
 * aunque elegir una liga no cambia el pick de ningún partido: solo cambia cuáles se enseñan. Recorrer los
 * 545 pendientes cuesta **195 ms medidos** con los datos reales, así que eso era el techo de lo que se
 * repetía en cada toque de un filtro. Ahora las dependencias son los datos, las frecuencias de liga, los
 * ajustes del perfil y la validación: nada que `setFilters` toque.
 *
 * Calcular solo la página visible no vale: la columna del pick es ordenable y ordenar exige tenerlos todos.
 */
export function useModelPicks(fixtureIds: string[]): Map<string, ModelPick> {
  const todos = useTodosLosPicks();
  return useMemo(() => {
    const out = new Map<string, ModelPick>();
    for (const id of fixtureIds) {
      const pick = todos.get(id);
      if (pick) out.set(id, pick);
    }
    return out;
  }, [fixtureIds, todos]);
}

/**
 * Liquida los picks pendientes cada vez que cambian los partidos (al cargar la app, tras «Actualizar
 * partidos» o al importar un Excel). Solo con resultados reales.
 */
export function usePickSettlement() {
  const hydrated = useBetting((s) => s.hydrated);
  const settle = useBetting((s) => s.settleFromData);
  const matches = useStore((s) => s.matches);
  const fixtures = useStore((s) => s.fixtures);

  useEffect(() => {
    if (hydrated) settle(matches, fixtures);
  }, [hydrated, settle, matches, fixtures]);
}
