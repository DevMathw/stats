import { useEffect, useSyncExternalStore } from 'react';

/**
 * Tema de la interfaz.
 *
 * Vive fuera del store de datos a propósito: es preferencia de dispositivo, no del análisis,
 * y así no entra en el JSON que se exporta ni obliga a recalcular nada al cambiarlo.
 *
 * `system` no fija nada en el DOM: deja que mande `prefers-color-scheme` (index.css ya
 * define ambas paletas). `light`/`dark` escriben `data-theme` y ganan siempre.
 */
export type ThemeChoice = 'light' | 'dark' | 'system';

const KEY = 'analisis-futbol-theme';

function read(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

let current: ThemeChoice = read();
const listeners = new Set<() => void>();

function apply(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', choice);
}

export function setTheme(choice: ThemeChoice) {
  current = choice;
  try {
    if (choice === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {
    // Navegación privada o almacenamiento bloqueado: el tema vale para esta sesión.
  }
  apply(choice);
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Se aplica antes del primer render para no pintar el tema equivocado. */
apply(current);

export function useTheme(): [ThemeChoice, (c: ThemeChoice) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => current,
    () => 'system' as ThemeChoice,
  );
  return [value, setTheme];
}

/**
 * Tema efectivo (`light` o `dark`), resolviendo `system`. Lo necesitan los gráficos, que no
 * pueden usar clases CSS y leen los tokens calculados.
 */
/**
 * La consulta vive fuera del hook. Creándola dentro, cada render devolvía un `MediaQueryList` nuevo y
 * `useSyncExternalStore` se quedaba sin suscripción viva: con el tema en `system`, cambiar el del sistema
 * operativo no repintaba los gráficos, que son los únicos que leen los tokens en JavaScript. Se descubrió
 * al escribir la misma consulta en `DataTable`, donde el fallo se veía a simple vista.
 */
const OSCURO = typeof window === 'undefined' ? null : window.matchMedia('(prefers-color-scheme: dark)');
const suscribirOscuro = (avisar: () => void) => {
  OSCURO?.addEventListener('change', avisar);
  return () => OSCURO?.removeEventListener('change', avisar);
};
const leerOscuro = () => OSCURO?.matches ?? false;
const oscuroEnServidor = () => false;

export function useResolvedTheme(): 'light' | 'dark' {
  const [choice] = useTheme();
  const systemDark = useSyncExternalStore(suscribirOscuro, leerOscuro, oscuroEnServidor);
  return choice === 'system' ? (systemDark ? 'dark' : 'light') : choice;
}

/** Relee un token de color ya resuelto. Para Recharts, que necesita valores literales. */
export function useToken(name: string): string {
  const theme = useResolvedTheme();
  // El tema entra como dependencia: al cambiar hay que releer el valor calculado.
  void theme;
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Hook de conveniencia para pintar la paleta de un gráfico completo. */
export function useChartTheme() {
  const theme = useResolvedTheme();
  void theme;
  const read = (n: string) =>
    typeof window === 'undefined'
      ? ''
      : getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  return {
    theme,
    grid: read('--grid'),
    /** Para ejes y etiquetas: es texto secundario, no debe competir con las series. */
    text: read('--muted'),
    /** Para el texto del tooltip, que sí es contenido y tiene que leerse. */
    strong: read('--text'),
    surface: read('--surface'),
    border: read('--border'),
    series: [
      read('--series-1'),
      read('--series-2'),
      read('--series-3'),
      read('--series-4'),
      read('--series-5'),
    ],
    positive: read('--positive'),
    negative: read('--negative'),
  };
}

/** Fuerza un repintado de los gráficos cuando cambia el tema. */
export function useThemeKey(): string {
  return useResolvedTheme();
}

/** Aplica el tema si otra pestaña lo cambia. */
export function useThemeSync() {
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) {
        current = read();
        apply(current);
        listeners.forEach((l) => l());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
}
