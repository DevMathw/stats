/**
 * Cómo se ven los gráficos. Un solo sitio.
 *
 * Los ejes, la rejilla y el tooltip estaban copiados en seis gráficos repartidos por cuatro pantallas, y
 * habían ido divergiendo: unos tenían `tickLine`, otros no; el `contentStyle` del tooltip estaba escrito a
 * mano cuatro veces con esquinas y sombras distintas; y la rejilla salía a veces con líneas verticales y a
 * veces sin ellas sin ningún motivo. Aquí se decide una vez y se reparte.
 *
 * Recharts no entiende clases de CSS, así que los valores salen de los tokens ya resueltos
 * (`useChartTheme`) y se repintan solos al cambiar de tema.
 */
import { useChartTheme } from '../../store/useTheme';

export function useChartStyle() {
  const chart = useChartTheme();

  return {
    chart,

    /**
     * Rejilla: solo horizontales. Las verticales duplican las marcas del eje X y ensucian; para barras
     * horizontales se pasa `{ ...rejilla, vertical: true, horizontal: false }`.
     */
    rejilla: { stroke: chart.grid, strokeDasharray: '3 3', vertical: false },

    /** El eje X conserva su línea de base, que es la referencia de las barras. */
    ejeX: { fontSize: 11, stroke: chart.text, tickLine: false, axisLine: { stroke: chart.grid } },

    /** El eje Y no la necesita: las marcas ya la sugieren y sin ella respira. */
    ejeY: { fontSize: 11, stroke: chart.text, tickLine: false, axisLine: false as const },

    /** Tooltip con el mismo relieve que los popovers de la aplicación. */
    tooltip: {
      contentStyle: {
        background: chart.surface,
        border: `1px solid ${chart.border}`,
        borderRadius: 8,
        fontSize: 12,
        boxShadow: 'var(--shadow-pop)',
        color: chart.strong,
      },
      labelStyle: { color: chart.strong, fontWeight: 600 },
      cursor: { fill: chart.grid, fillOpacity: 0.4 },
    },
  };
}
