/**
 * Los filtros, en la dirección.
 *
 * Vivían solo en el store: al recargar se perdía el contexto, no se podía guardar en marcadores ni enviar
 * «Proyecciones de la Premier, jornada 12», y el botón atrás no deshacía un filtro. Ahora la dirección los
 * lleva y son el estado compartible de la aplicación.
 *
 * Quién manda lo decide CÓMO se ha llegado a la dirección, que es lo que dice `useNavigationType`:
 *
 *  - **`POP`** —carga inicial, marcador, enlace pegado, botón atrás o adelante—: manda la dirección. Es lo
 *    que hace que un enlace compartido llegue con sus filtros puestos y que atrás deshaga un filtro.
 *  - **`PUSH` / `REPLACE`** —se ha seguido un enlace de la aplicación—: mandan los filtros, y se escriben en
 *    la dirección nueva. Los enlaces del menú no llevan parámetros, así que leer la dirección aquí borraría
 *    la competición elegida al pasar de Partidos a Proyecciones.
 *
 * El primer intento distinguía los dos casos comparando el `pathname` con el anterior, y se rompía en un
 * caso muy normal: pulsar en el menú la pantalla en la que YA estabas. El camino no cambiaba, así que la
 * dirección limpia del enlace se interpretaba como «quita los filtros» y se borraban sin avisar. El tipo de
 * navegación no tiene esa ambigüedad.
 *
 * Los parámetros ajenos se respetan: `/picks?f=…` y los del Historial conviven sin tocarse, y por eso se
 * parte siempre de los parámetros que ya hay en vez de construir una lista nueva.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { useNavigationType, useSearchParams } from 'react-router-dom';
import { useStore } from './useStore';
import { EMPTY_FILTERS, type EmptyStat, type Filters } from '../types';

/** Nombre corto de cada filtro en la dirección. En castellano, porque la dirección la lee una persona. */
const CLAVES = {
  country: 'pais',
  leagueId: 'liga',
  teamId: 'equipo',
  season: 'temporada',
  round: 'jornada',
  dateFrom: 'desde',
  dateTo: 'hasta',
  emptyStat: 'falta',
} as const satisfies Record<keyof Filters, string>;

function leer(params: URLSearchParams): Filters {
  const texto = (k: keyof Filters) => params.get(CLAVES[k]) || null;
  const jornada = texto('round');
  const n = jornada === null ? null : Number(jornada);
  return {
    country: texto('country'),
    leagueId: texto('leagueId'),
    teamId: texto('teamId'),
    season: texto('season'),
    // Una jornada que no sea un número («?jornada=abc») se ignora en vez de propagar un NaN al filtrado.
    round: n !== null && Number.isFinite(n) ? n : null,
    dateFrom: texto('dateFrom'),
    dateTo: texto('dateTo'),
    emptyStat: (texto('emptyStat') as EmptyStat | null) ?? null,
  };
}

/** Los filtros aplicados sobre los parámetros que ya hubiera. Un filtro vacío borra su clave. */
function escribir(params: URLSearchParams, f: Filters): URLSearchParams {
  const out = new URLSearchParams(params);
  for (const k of Object.keys(CLAVES) as (keyof Filters)[]) {
    const v = f[k];
    if (v === null || v === '') out.delete(CLAVES[k]);
    else out.set(CLAVES[k], String(v));
  }
  return out;
}

const iguales = (a: Filters, b: Filters) => (Object.keys(EMPTY_FILTERS) as (keyof Filters)[]).every((k) => a[k] === b[k]);

/**
 * Los parámetros que hay AHORA en la barra de direcciones.
 *
 * No se usan los `searchParams` del render porque cada efecto tiene su propia lista de dependencias y se
 * queda con los de la última vez que se disparó. Con esa copia vieja, entrar en `/picks?f=…` y tocar
 * después un filtro escribía los parámetros del render anterior y **borraba el `f=`**, que es el partido
 * que se estaba evaluando. La barra de direcciones no caduca.
 */
const actuales = () => new URLSearchParams(window.location.search);

export function useFiltersInUrl(): void {
  const [params, setParams] = useSearchParams();
  const tipo = useNavigationType();
  const filters = useStore((s) => s.filters);
  const setFilters = useStore((s) => s.setFilters);

  /**
   * Si los datos ya llegaron de la base local.
   *
   * Entra como dependencia porque la hidratación **reemplaza** el estado del store, y con ella los filtros
   * que este hook acababa de aplicar desde la dirección vuelven a su valor inicial. Es una carrera que se
   * nota más cuanto más tarda la base: con 3.668 partidos, abrir `/partidos?liga=LaLiga` dejaba el filtro
   * sin aplicar. Al re-ejecutar el efecto cuando termina, la dirección vuelve a mandar.
   *
   * No se vio antes porque las pruebas de este hook se hacían con la aplicación ya cargada.
   */
  const hidratado = useSyncExternalStore(
    (avisar) => useStore.persist.onFinishHydration(avisar),
    () => useStore.persist.hasHydrated(),
    () => false,
  );

  // De la dirección al store, y del store a una dirección que aún no los lleva.
  useEffect(() => {
    if (tipo === 'POP') {
      const deLaUrl = leer(params);
      if (!iguales(deLaUrl, filters)) setFilters(deLaUrl);
      return;
    }
    // `replace` para no dejar en el historial una entrada intermedia sin parámetros a la que volver.
    const antes = actuales();
    const siguiente = escribir(antes, filters);
    if (siguiente.toString() !== antes.toString()) setParams(siguiente, { replace: true });
    // `filters` no entra: en este sentido solo se reacciona a la dirección. Del otro se encarga el de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, params, hidratado]);

  // Del store a la dirección: cada filtro deja su entrada en el historial, y por eso atrás lo deshace.
  useEffect(() => {
    const antes = actuales();
    const siguiente = escribir(antes, filters);
    if (siguiente.toString() !== antes.toString()) setParams(siguiente);
    // Igual que arriba, al revés: este efecto solo persigue los cambios del store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);
}
