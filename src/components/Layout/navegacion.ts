/**
 * Los cuatro modos de trabajo, en lugar de catorce enlaces en una lista.
 *
 * El menú anterior ponía al mismo nivel «Dashboard» y «Tickets»: catorce destinos planos en un riel de
 * iconos, sin jerarquía y sin decir en qué estás trabajando. Aquí lo primero que se elige es el MODO
 * —qué estás haciendo— y los destinos de ese modo aparecen como pestañas. Dos niveles de verdad.
 *
 * Los modos salen de las cuatro preguntas que se le hacen a esta herramienta:
 *   Hoy     → ¿qué miro ahora?
 *   Datos   → ¿qué ha pasado?
 *   Modelo  → ¿qué estima el modelo y cuánto me fío?
 *   Banca   → ¿cómo va mi simulación?
 *
 * Configuración no es un modo: es ajuste, y vive como icono en la barra de contexto.
 */
import { Activity, BarChart3, Calculator, Database, FlaskConical, LayoutDashboard, Layers, ListChecks, Table2, Target, Trophy, Users, Wallet, Zap } from 'lucide-react';
import type { ComponentType } from 'react';

export interface Destino {
  to: string;
  label: string;
  icon: ComponentType<{ size?: number | string; className?: string }>;
  /** El modo al que pertenece. Lo usa la paleta para situar cada pantalla. */
  modo: string;
  /** `end` de React Router: solo la raíz lo necesita. */
  end?: boolean;
}

export interface Modo {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number | string; className?: string }>;
  destinos: Destino[];
}

const destino = (modo: string) => (to: string, label: string, icon: Destino['icon'], end?: boolean): Destino => ({ to, label, icon, modo, end });

const hoy = destino('Hoy');
const datos = destino('Datos');
const modelo = destino('Modelo');
const banca = destino('Banca');

export const MODOS: Modo[] = [
  {
    id: 'hoy',
    label: 'Hoy',
    icon: Zap,
    destinos: [hoy('/', 'Resumen', LayoutDashboard, true), hoy('/oportunidades', 'Oportunidades', Target)],
  },
  {
    id: 'datos',
    label: 'Datos',
    icon: Database,
    destinos: [datos('/ligas', 'Competiciones', Trophy), datos('/partidos', 'Partidos', Table2), datos('/equipos', 'Equipos', Users)],
  },
  {
    id: 'modelo',
    label: 'Modelo',
    icon: FlaskConical,
    destinos: [
      modelo('/proyecciones', 'Proyecciones', Target),
      modelo('/proyeccion-temporada', 'Fin de temporada', BarChart3),
      modelo('/modelos', 'Modelos', FlaskConical),
    ],
  },
  {
    id: 'banca',
    label: 'Banca',
    icon: Wallet,
    destinos: [
      banca('/picks', 'Evaluador', Calculator),
      banca('/tickets', 'Tickets', Layers),
      banca('/bankroll', 'Bankroll', Wallet),
      banca('/rendimiento', 'Rendimiento', Activity),
      banca('/historial', 'Historial', ListChecks),
    ],
  },
];

/** Todos los destinos en plano, para la paleta. */
export const DESTINOS: Destino[] = MODOS.flatMap((m) => m.destinos);

/**
 * A qué modo pertenece una dirección.
 *
 * Se compara por prefijo para que las fichas cuenten como su listado: `/equipos/LaLiga|Getafe` sigue
 * estando en «Datos», y el riel no se queda sin ningún modo marcado. La raíz se compara exacta, o
 * cualquier dirección caería en ella.
 */
export function modoDe(pathname: string): Modo | undefined {
  return MODOS.find((m) =>
    m.destinos.some((d) => (d.to === '/' ? pathname === '/' : pathname === d.to || pathname.startsWith(`${d.to}/`))),
  );
}
