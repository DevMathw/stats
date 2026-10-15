/**
 * Goles y corners por partido, jornada a jornada.
 *
 * Vive en su propio archivo para poder cargarse aparte: la librería de gráficos pesa unos 350 kB y este
 * es el único gráfico del dashboard, que además queda por debajo de la primera pantalla. Así arrancar la
 * aplicación no obliga a descargarla.
 *
 * La pregunta que responde es concreta: ¿se están marcando más goles según avanza la temporada? Por eso
 * son dos líneas y no seis, y por eso el eje no empieza forzado en cero.
 */
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatRound } from '../../domain/models/ids';
import { useChartStyle } from './chartStyle';
import type { RoundTrendPoint } from '../../domain/statistics/dashboard';

const NOMBRES: Record<string, string> = { avgGoals: 'Goles', avgCorners: 'Corners' };

export default function TrendChart({ data }: { data: RoundTrendPoint[] }) {
  const { chart, rejilla, ejeX, ejeY, tooltip } = useChartStyle();
  return (
    <div className="h-72 p-3">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid {...rejilla} />
          <XAxis dataKey="round" tickFormatter={(v) => formatRound(Number(v))} {...ejeX} />
          <YAxis width={38} {...ejeY} />
          <Tooltip
            {...tooltip}
            labelFormatter={(v) => `Jornada ${v}`}
            formatter={(v, name) => [typeof v === 'number' ? v.toFixed(2) : 'N/D', NOMBRES[String(name)] ?? String(name)]}
          />
          <Line type="monotone" dataKey="avgGoals" name="avgGoals" stroke={chart.series[0]} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="avgCorners" name="avgCorners" stroke={chart.series[1]} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
