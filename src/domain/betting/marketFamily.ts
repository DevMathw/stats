/**
 * A qué familia pertenece un mercado: goles, corners, tarjetas, tiros o resultado.
 *
 * El modelo estima 162 mercados por partido y los pick pueden salir de cualquiera de ellos. Para quien
 * mira Oportunidades, «Under 5.5 corners» y «Over 8.5 corners del local» son lo mismo —corners— aunque
 * sean selecciones distintas, y lo que quiere es filtrar por eso. Agrupar por `market` a secas no vale:
 * `conteoEquipo` lleva la variable dentro, en `stat`.
 *
 * Los mercados de goles incluyen los que se resuelven CON el marcador aunque no cuenten goles totales:
 * ambos marcan, portería a cero y los goles por equipo o por parte. Todos dependen de la misma variable.
 */
import type { Selection } from '../../types/betting';

export type MarketFamily = 'resultado' | 'goles' | 'corners' | 'tarjetas' | 'tiros';

export const FAMILY_LABEL: Record<MarketFamily, string> = {
  resultado: 'Resultado',
  goles: 'Goles',
  corners: 'Corners',
  tarjetas: 'Tarjetas',
  tiros: 'Tiros',
};

/** Orden en el que se enseñan: de lo más común a lo más específico. */
export const MARKET_FAMILIES: MarketFamily[] = ['resultado', 'goles', 'corners', 'tarjetas', 'tiros'];

export function marketFamily(sel: Selection): MarketFamily {
  switch (sel.market) {
    case 'resultado':
    case 'doble':
    case 'asiatico':
    case 'europeo':
      return 'resultado';
    case 'corners':
      return 'corners';
    case 'tarjetas':
      return 'tarjetas';
    case 'tiros':
    case 'sot':
      return 'tiros';
    case 'conteoEquipo':
      // Aquí la variable va dentro de la selección, no en `market`.
      return sel.stat === 'sot' ? 'tiros' : sel.stat;
    default:
      // goles, mitad, btts, equipo, cero: todos se resuelven con el marcador.
      return 'goles';
  }
}
