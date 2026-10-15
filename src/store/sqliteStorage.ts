import type { PersistStorage, StorageValue } from 'zustand/middleware';
import { idbStorage } from './idbStorage';
import { bettingHasData, diffStore, idsDistintos, type PersistedValue, type Snapshot } from './storeSync';
import { api, API_BASE } from '../services/apiBase';

/**
 * Persistencia de los stores en la base SQLite del servidor local, en lugar del almacenamiento del navegador:
 * `sqliteStorage` para los datos (antes en `localStorage`) y `bettingSqliteStorage` para picks y bankroll (antes en
 * IndexedDB).
 *
 * - Nada se escribe hasta haber leído bien lo guardado: así se perdieron los picks el 13/09/2026.
 * - La primera vez copia lo que había en el navegador y no lo borra: queda como copia de seguridad.
 * - Una base sin estrenar no recibe un estado vacío: taparía la copia que aún no ha hecho otro navegador.
 * - Si una escritura falla, la siguiente sustituye todo y se reintenta sola.
 * - Sin servidor local, lo del navegador se ve en solo lectura: nada queda guardado a medias en dos sitios.
 */

interface Lectura {
  value: PersistedValue | null;
  initialized: boolean;
}

interface Envio {
  /** Lo que se manda; `null` si no cambió nada. */
  cuerpo: unknown;
  foto: unknown;
  /** Filas que debe tener la base después de escribir. */
  esperado: Record<string, number>;
}

interface Almacen {
  api: string;
  /** «los datos», «los picks»: para los avisos. */
  nombre: string;
  /** Lo guardado en el navegador, como texto JSON. */
  leerNavegador: (name: string) => Promise<string | null>;
  hayDatos: (v: PersistedValue) => boolean;
  /** Qué enviar para llevar la base de `antes` (`null`: nada guardado) a `v`. */
  preparar: (antes: unknown, v: PersistedValue) => Envio;
  /** «2390 partidos», para el aviso de la copia inicial. */
  resumen: (v: PersistedValue) => string;
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

function crear<S>(a: Almacen, avisar: (mensaje: string) => void): PersistStorage<S> {
  let lecturaCorrecta = false;
  let estrenada = false;
  let foto: unknown = null;
  let ultimo: PersistedValue | null = null;
  let cola = Promise.resolve();
  let pendientes = 0;
  let fallo = false;
  let reintento: ReturnType<typeof setTimeout> | undefined;

  // Cerrar la pestaña con cambios sin guardar pide confirmación.
  globalThis.addEventListener?.('beforeunload', (e) => {
    if (pendientes > 0 || fallo) e.preventDefault();
  });

  const enviar = ({ cuerpo, esperado }: Envio) => {
    pendientes++;
    cola = cola.then(async () => {
      try {
        const r = await fetch(a.api, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) });
        const respuesta = (await r.json().catch(() => null)) as { counts?: Record<string, number>; error?: string } | null;
        if (!r.ok || !respuesta?.counts) throw new Error(respuesta?.error ?? `respuesta ${r.status}`);
        for (const [clave, n] of Object.entries(esperado)) {
          if (respuesta.counts[clave] !== n) throw new Error(`la base tiene ${respuesta.counts[clave]} ${clave} y la app ${n}`);
        }
        estrenada = true;
        if (fallo) {
          fallo = false;
          avisar('Cambios guardados en la base de datos local.');
        }
      } catch (e) {
        fallo = true;
        foto = null; // la próxima escritura sustituye todo
        avisar(`No se pudieron guardar ${a.nombre} en la base de datos local (${(e as Error).message}). Se reintenta en unos segundos.`);
        clearTimeout(reintento);
        reintento = setTimeout(() => ultimo && guardar(ultimo), 5000);
      } finally {
        pendientes--;
      }
    });
  };

  const guardar = (value: PersistedValue) => {
    ultimo = value;
    if (!estrenada && !a.hayDatos(value)) return;
    const envio = a.preparar(foto, value);
    foto = envio.foto;
    if (envio.cuerpo !== null) enviar(envio);
  };

  /** `null` si no hay servidor local (app compilada, o sin arrancar con `npm run dev`). */
  const leerServidor = async (): Promise<Lectura | null> => {
    for (const ms of [0, 400, 1200, 2500]) {
      await esperar(ms);
      try {
        const r = await fetch(a.api);
        if (r.ok) return (await r.json()) as Lectura;
        if (r.status < 500) return null;
      } catch {
        // Servidor reiniciándose o respuesta que no es JSON: se vuelve a intentar.
      }
    }
    return null;
  };

  const leerNavegador = async (name: string): Promise<{ raw: string; value: PersistedValue } | null> => {
    try {
      const raw = await a.leerNavegador(name);
      if (!raw) return null;
      const value = JSON.parse(raw) as PersistedValue;
      return value && typeof value.state === 'object' && value.state !== null ? { raw, value } : null;
    } catch {
      return null;
    }
  };

  const desdeServidor = (lectura: Lectura): StorageValue<S> | null => {
    estrenada = true;
    lecturaCorrecta = true;
    if (!lectura.value) return null;
    foto = a.preparar(null, lectura.value).foto;
    return lectura.value as unknown as StorageValue<S>;
  };

  return {
    getItem: async (name) => {
      const lectura = await leerServidor();
      if (!lectura) {
        /*
         * Decir DÓNDE se intentó conectar, que es el dato que hace falta para arreglarlo.
         *
         * El aviso mandaba a «npm run dev», que en una web desplegada es un consejo falso: allí el
         * problema es que `VITE_API_URL` no apunta al backend, o que el backend no autoriza ese dominio.
         * Con la dirección a la vista se distinguen los dos casos de un vistazo.
         */
        const donde = API_BASE ? API_BASE : 'esta misma web';
        const consejo = API_BASE
          ? 'Comprueba que el servidor está en marcha y que autoriza a este dominio.'
          : 'Arranca la app con «npm run dev», o configura VITE_API_URL si el servidor está en otro sitio.';
        avisar(`Sin conexión con la base de datos (${donde}): se ven ${a.nombre} de este navegador y los cambios no se guardan. ${consejo}`);
        return ((await leerNavegador(name))?.value ?? null) as StorageValue<S> | null;
      }
      if (lectura.initialized) return desdeServidor(lectura);

      // Un navegador sin datos (o solo con el perfil recién creado) no tiene nada que copiar y no estrena la base. El
      // 15/09/2026 el navegador de pruebas copió su perfil vacío 12 s antes que el Chrome con los picks, y la copia buena
      // ya no se hizo.
      const local = await leerNavegador(name);
      if (!local || !a.hayDatos(local.value)) {
        lecturaCorrecta = true;
        return (local?.value ?? null) as StorageValue<S> | null;
      }
      const r = await fetch(`${a.api}/migrate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ raw: local.raw }),
      }).catch(() => null);
      if (r?.status === 409) {
        // Otra pestaña hizo la copia antes: vale lo que ya está en la base.
        const otra = await leerServidor();
        if (otra?.initialized) return desdeServidor(otra);
      }
      if (!r?.ok) {
        avisar(`No se pudieron copiar ${a.nombre} del navegador a la base de datos local: se ven en solo lectura y se reintenta al recargar.`);
        return local.value as unknown as StorageValue<S>;
      }
      estrenada = true;
      lecturaCorrecta = true;
      foto = a.preparar(null, local.value).foto;
      avisar(`Copiados ${a.nombre} de este navegador a la base de datos local (${a.resumen(local.value)}). La copia del navegador se conserva.`);
      return local.value as unknown as StorageValue<S>;
    },
    setItem: (_name, value) => {
      if (lecturaCorrecta) guardar(value as unknown as PersistedValue);
    },
    removeItem: async () => {
      if (!lecturaCorrecta) return;
      foto = null;
      await fetch(a.api, { method: 'DELETE' }).catch(() => avisar(`No se pudieron borrar ${a.nombre} de la base de datos local.`));
    },
  };
}

const cuentasDatos = (v: PersistedValue) => ({
  leagues: idsDistintos(v.state.leagues),
  matches: idsDistintos(v.state.matches),
  fixtures: idsDistintos(v.state.fixtures),
});

/** Datos del análisis: ligas, partidos, pendientes y configuración. Solo viajan los cambios. */
export const sqliteStorage = <S>(avisar: (mensaje: string) => void): PersistStorage<S> =>
  crear<S>(
    {
      api: api('/api/store'),
      nombre: 'los datos',
      leerNavegador: async (name) => globalThis.localStorage?.getItem(name) ?? null,
      hayDatos: (v) => Object.values(cuentasDatos(v)).some((n) => n > 0),
      preparar: (antes, v) => {
        const { patch, snapshot } = diffStore(antes as Snapshot | null, v);
        return { cuerpo: patch, foto: snapshot, esperado: cuentasDatos(v) };
      },
      resumen: (v) => `${cuentasDatos(v).matches} partidos`,
    },
    avisar,
  );

const perfiles = (v: PersistedValue): Record<string, unknown>[] =>
  typeof v.state.profiles === 'object' && v.state.profiles !== null
    ? Object.values(v.state.profiles).filter((p): p is Record<string, unknown> => typeof p === 'object' && p !== null)
    : [];

const cuantos = (v: PersistedValue, lista: 'picks' | 'tickets') =>
  perfiles(v).reduce((n, p) => n + (Array.isArray(p[lista]) ? (p[lista] as unknown[]).length : 0), 0);

/**
 * JSON con las claves ordenadas. La base devuelve el estado en otro orden que la app (`activeProfileId` antes que
 * `profiles`): comparando el texto tal cual, cada apertura de la app reescribía los picks.
 */
const textoOrdenado = (v: unknown) =>
  JSON.stringify(v, (_clave, x: unknown) =>
    x && typeof x === 'object' && !Array.isArray(x)
      ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : x,
  );

/** Picks, tickets y bankroll virtual. Son pocos datos: cada cambio los envía enteros. */
export const bettingSqliteStorage = <S>(avisar: (mensaje: string) => void): PersistStorage<S> =>
  crear<S>(
    {
      api: api('/api/betting'),
      nombre: 'los picks',
      leerNavegador: async (name) => idbStorage.getItem(name),
      hayDatos: (v) => bettingHasData(v.state),
      preparar: (antes, v) => {
        const s = textoOrdenado(v);
        const ids = new Set(perfiles(v).flatMap((p) => (typeof p.id === 'string' ? [p.id] : [])));
        return { cuerpo: s === antes ? null : v, foto: s, esperado: { profiles: ids.size } };
      },
      resumen: (v) => `${cuantos(v, 'picks')} picks y ${cuantos(v, 'tickets')} tickets`,
    },
    avisar,
  );
