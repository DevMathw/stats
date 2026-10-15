import { useMemo, useState, type ReactNode } from 'react';
import type { Selection } from '../../types/betting';
import { COUNT_MARKETS, MARKET_LINES, canPush, describeSelection, formatLine, selectionKey, selectionLabel, type MarketEstimate } from '../../domain/betting/markets';
import { useStore } from '../../store/useStore';
import { Field, SegmentedControl, inputClass } from '../ui';
import { InfoTip } from '../InfoTip';
import { Tooltip } from '../Tooltip';
import { useLeagueZones } from '../Kickoff';
import { kickoffOf } from '../../utils/matchTime';
import type { Fixture } from '../../types';

/** Partido pendiente con proyección. Con buscador y agrupado por fecha: hay cientos. */
export function FixturePicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const fixtures = useStore((s) => s.fixtures);
  const projections = useStore((s) => s.derived.projectionsByFixtureId);
  const leagues = useStore((s) => s.leagues);
  const zonas = useLeagueZones();
  const [q, setQ] = useState('');

  const { grupos, total } = useMemo(() => {
    const nombre = new Map(leagues.map((l) => [l.id, l.name]));
    const texto = q.trim().toLowerCase();
    // Agrupados por el día de Colombia y con su hora de Colombia: es la que ve el usuario en todas partes.
    const cuando = (f: Fixture) => kickoffOf(f, zonas.get(f.leagueId) ?? null);
    const lista = fixtures
      .filter((f) => projections.has(f.id))
      .filter((f) => !texto || `${f.homeTeamName} ${f.awayTeamName} ${f.leagueId}`.toLowerCase().includes(texto) || f.id === value)
      .sort((a, b) => {
        const [x, y] = [cuando(a), cuando(b)];
        return x.date.localeCompare(y.date) || (x.time ?? '').localeCompare(y.time ?? '') || a.leagueId.localeCompare(b.leagueId);
      });
    const porFecha = new Map<string, { id: string; label: string }[]>();
    for (const f of lista) {
      const k = cuando(f);
      const g = porFecha.get(k.date) ?? [];
      g.push({ id: f.id, label: `${k.time ? `${k.time} · ` : ''}${f.homeTeamName} – ${f.awayTeamName} · ${nombre.get(f.leagueId) ?? f.leagueId}` });
      porFecha.set(k.date, g);
    }
    return { grupos: [...porFecha], total: lista.length };
  }, [fixtures, projections, leagues, q, value, zonas]);

  return (
    <div className="grid gap-2">
      <Field label="Buscar partido">
        <input type="search" className={`${inputClass} w-full min-w-0`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Equipo o competición…" />
      </Field>
      <Field label={`Partido pendiente (${total})`} hint={total === 0 ? 'Ningún partido pendiente con proyección coincide con la búsqueda.' : undefined}>
        <select className={`${inputClass} w-full min-w-0`} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Elige un partido…</option>
          {grupos.map(([fecha, opciones]) => (
            <optgroup key={fecha} label={new Date(`${fecha}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}>
              {opciones.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </Field>
    </div>
  );
}

/** Mercado tal y como se elige en la interfaz: el empate no válido es el hándicap asiático 0. */
type MercadoUI =
  | 'resultado' | 'goles' | 'mitad' | 'btts' | 'doble' | 'dnb' | 'asiatico' | 'europeo' | 'equipo' | 'cero'
  | 'corners' | 'tarjetas' | 'tiros' | 'sot'
  | 'cornersEquipo' | 'tarjetasEquipo' | 'tirosEquipo' | 'sotEquipo';

const AYUDA: Record<MercadoUI, string> = {
  resultado: 'Resultado final a 90 minutos: 1 gana el local, X empate, 2 gana el visitante.',
  goles: 'Goles de los dos equipos sumados. Over 2.5 = 3 o más. Las líneas enteras (asiáticas) devuelven el stake si el total cae justo en la línea.',
  mitad:
    'Goles de los dos equipos en la 1.ª o en la 2.ª parte. Se liquida con el resultado al descanso: los de la 2.ª parte son los del final menos los del descanso.',
  btts: 'Si los dos equipos marcan al menos un gol cada uno.',
  doble: 'Cubre dos de los tres resultados (1X, X2 o 12): acierta más a menudo y por eso paga menos.',
  dnb: 'Eliges un equipo: si gana, ganas; si empatan, se devuelve el stake; si pierde, pierdes. Es el hándicap asiático 0.',
  asiatico:
    'Se suma la línea a los goles del equipo elegido y se compara con los del rival. Con línea .5 no puede quedar empate. Con línea entera, si queda empate tras sumarla se devuelve el stake. Ejemplo: Local −1 gana si vence por 2 o más, devuelve si gana por 1 exacto y pierde con empate o derrota. «Partido» enseña cada línea con sus dos lados: Local −1 y Visitante +1 son la misma línea vista desde cada equipo.',
  europeo:
    'Como el asiático, pero con tres resultados y sin devolución: la línea se suma a los goles del local. Local −1: «1» si gana por 2 o más, «X» si gana por 1 exacto, «2» si empata o pierde.',
  equipo: 'Goles de un solo equipo, sin contar los del rival.',
  cero: 'Si el equipo elegido termina sin encajar ningún gol.',
  corners: 'Corners de los dos equipos. Solo se estima en ligas cuya fuente publica corners reales.',
  tarjetas: 'Amarillas de los dos equipos, que es lo que registran los datos. Comprueba si tu casa cuenta también las rojas.',
  tiros: 'Tiros de los dos equipos sumados, a puerta y fuera. En esta base la media es de 26 por partido.',
  sot: 'Solo los tiros que van a puerta, de los dos equipos. Media de 8,9 por partido. Comprueba si tu casa cuenta los bloqueados.',
  cornersEquipo: 'Corners de UN equipo. Media de 4,9 por equipo y partido. Lleva su propia dispersión: varía más que el total.',
  tarjetasEquipo: 'Amarillas de UN equipo. Media de 2,2, y en el 10,6 % de los casos ninguna, así que las líneas bajas son habituales.',
  tirosEquipo: 'Tiros de UN equipo. Media de 13,0, y es el conteo que más varía de todos (φ 2,18): la probabilidad es menos fiable.',
  sotEquipo: 'Tiros a puerta de UN equipo. Media de 4,4 por equipo y partido.',
};

const CATEGORIAS: { id: string; label: string; mercados: { id: MercadoUI; label: string }[] }[] = [
  {
    id: 'principales',
    label: 'Principales',
    mercados: [
      { id: 'resultado', label: '1X2' },
      { id: 'goles', label: 'Más/menos goles' },
      { id: 'mitad', label: 'Goles por parte' },
      { id: 'btts', label: 'Ambos marcan' },
    ],
  },
  {
    id: 'avanzados',
    label: 'Avanzados',
    mercados: [
      { id: 'doble', label: 'Doble oportunidad' },
      { id: 'dnb', label: 'Empate no válido' },
      { id: 'asiatico', label: 'Hándicap asiático' },
      { id: 'europeo', label: 'Hándicap europeo' },
    ],
  },
  {
    id: 'estadisticos',
    label: 'Equipos y estadísticas',
    mercados: [
      { id: 'equipo', label: 'Goles por equipo' },
      { id: 'cero', label: 'Portería a cero' },
      { id: 'corners', label: 'Corners' },
      { id: 'tarjetas', label: 'Tarjetas' },
      { id: 'tiros', label: 'Tiros' },
      { id: 'sot', label: 'Tiros a puerta' },
    ],
  },
  {
    id: 'porEquipo',
    label: 'Por equipo',
    mercados: [
      { id: 'cornersEquipo', label: 'Corners' },
      { id: 'tarjetasEquipo', label: 'Tarjetas' },
      { id: 'tirosEquipo', label: 'Tiros' },
      { id: 'sotEquipo', label: 'Tiros a puerta' },
    ],
  },
];


/** Líneas del hándicap asiático sin la 0, que tiene su propio mercado (empate no válido). */
const LINEAS_ASIATICO = MARKET_LINES.asiatico.filter((l) => l !== 0);

function mercadoUI(s: Selection): MercadoUI {
  if (s.market === 'asiatico' && s.line === 0) return 'dnb';
  if (s.market === 'conteoEquipo') return `${s.stat}Equipo`;
  return s.market;
}

function porDefecto(m: MercadoUI): Selection {
  switch (m) {
    case 'resultado':
      return { market: m, outcome: 'home' };
    case 'doble':
      return { market: m, outcome: '1X' };
    case 'btts':
      return { market: m, outcome: 'si' };
    case 'goles':
      return { market: m, side: 'over', line: 2.5 };
    case 'mitad':
      return { market: m, half: 1, side: 'over', line: 0.5 };
    case 'dnb':
      return { market: 'asiatico', team: 'home', line: 0 };
    case 'asiatico':
      return { market: m, team: 'home', line: -0.5 };
    case 'europeo':
      return { market: m, line: -1, outcome: 'home' };
    case 'equipo':
      return { market: m, team: 'home', side: 'over', line: 0.5 };
    case 'cero':
      return { market: m, team: 'home', outcome: 'si' };
    case 'corners':
      return { market: m, side: 'over', line: 9.5 };
    case 'tarjetas':
      return { market: m, side: 'over', line: 4.5 };
    // La linea por defecto es la mediana medida en la base: 26 tiros y 9 a puerta por partido.
    case 'tiros':
      return { market: m, side: 'over', line: 26.5 };
    case 'sot':
      return { market: m, side: 'over', line: 8.5 };
    // Por equipo: la línea de salida es la mediana medida de esa variable por equipo y partido.
    case 'cornersEquipo':
      return { market: 'conteoEquipo', stat: 'corners', team: 'home', side: 'over', line: 4.5 };
    case 'tarjetasEquipo':
      return { market: 'conteoEquipo', stat: 'tarjetas', team: 'home', side: 'over', line: 1.5 };
    case 'tirosEquipo':
      return { market: 'conteoEquipo', stat: 'tiros', team: 'home', side: 'over', line: 12.5 };
    case 'sotEquipo':
      return { market: 'conteoEquipo', stat: 'sot', team: 'home', side: 'over', line: 4.5 };
  }
}

const pct = (x: number) => `${(x * 100).toFixed(0)} %`;

/** Una opción del selector: su nombre y, con partido elegido, la probabilidad del modelo debajo. */
function Opcion({
  activa,
  onClick,
  children,
  estimate,
  bloqueo,
}: {
  activa: boolean;
  onClick: () => void;
  children: ReactNode;
  estimate?: MarketEstimate | null;
  /** Motivo por el que no se puede elegir en este contexto. */
  bloqueo?: string | null;
}) {
  const boton = (
    <button
      type="button"
      aria-pressed={activa}
      aria-disabled={bloqueo ? true : undefined}
      onClick={() => !bloqueo && onClick()}
      className={`flex min-h-10 w-full min-w-0 flex-col items-center justify-center rounded-control border px-1.5 py-1 text-[12px] font-medium transition-colors aria-disabled:opacity-45 ${
        activa ? 'border-accent bg-accent-soft text-accent-text ring-1 ring-accent/30' : 'border-border bg-surface hover:border-border-strong hover:bg-surface-2'
      }`}
    >
      <span className="max-w-full truncate">{children}</span>
      {estimate !== undefined && (
        <span className={`text-[11px] tabular-nums ${activa ? 'text-accent-text' : 'text-muted'}`}>
          {estimate?.probability == null ? '—' : pct(estimate.probability)}
          {estimate?.push ? <span className="text-faint"> ↺</span> : null}
        </span>
      )}
    </button>
  );
  return bloqueo ? (
    <Tooltip content={bloqueo} className="w-full">
      {boton}
    </Tooltip>
  ) : (
    boton
  );
}

function Rejilla({ children, cols }: { children: ReactNode; cols: 2 | 3 | 4 | 6 }) {
  const clases = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4', 6: 'grid-cols-3 sm:grid-cols-6' };
  return <div className={`grid gap-1.5 ${clases[cols]}`}>{children}</div>;
}

function Etiqueta({ children, tip }: { children: ReactNode; tip?: string }) {
  return (
    <div className="mb-1.5 flex items-center gap-1 text-[11px] font-medium text-muted">
      {children}
      {tip && <InfoTip>{tip}</InfoTip>}
    </div>
  );
}

/**
 * Selector de mercado por categorías. Solo ofrece mercados que el modelo sabe calcular con los datos que
 * existen (PICKS_METHODOLOGY.md §2); con partido elegido, cada opción enseña su probabilidad.
 */
export function MarketPicker({
  value,
  onChange,
  homeName = 'Local',
  awayName = 'Visitante',
  estimate,
  allowPush = true,
}: {
  value: Selection;
  onChange: (s: Selection) => void;
  homeName?: string;
  awayName?: string;
  /** Estimación del modelo para una selección del partido elegido. */
  estimate?: (s: Selection) => MarketEstimate | null;
  /** `false` en tickets: las líneas con devolución no se combinan. */
  allowPush?: boolean;
}) {
  // Vista «Partido» del hándicap asiático: no es una selección, es cómo se enseñan sus líneas.
  const [asiaticoPartido, setAsiaticoPartido] = useState(false);
  const actual = mercadoUI(value);
  const categoria = CATEGORIAS.find((c) => c.mercados.some((m) => m.id === actual))!;
  const est = (s: Selection) => (estimate ? estimate(s) : undefined);
  const bloqueo = (s: Selection) => (!allowPush && canPush(s) ? 'Puede acabar en devolución del stake: los tickets todavía no combinan devoluciones' : null);
  const opcion = (s: Selection, label: ReactNode) => (
    <Opcion key={selectionKey(s)} activa={selectionKey(s) === selectionKey(value)} onClick={() => onChange(s)} estimate={est(s)} bloqueo={bloqueo(s)}>
      {label}
    </Opcion>
  );
  const equipos = (team: 'home' | 'away', set: (t: 'home' | 'away') => void) => (
    <SegmentedControl
      size="sm"
      label="Equipo"
      value={team}
      onChange={set}
      options={[
        { value: 'home', label: <span className="max-w-32 truncate">{homeName}</span> },
        { value: 'away', label: <span className="max-w-32 truncate">{awayName}</span> },
      ]}
    />
  );
  const lados = (side: 'over' | 'under', set: (s: 'over' | 'under') => void) => (
    <SegmentedControl
      size="sm"
      label="Lado"
      value={side}
      onChange={set}
      options={[
        { value: 'over', label: 'Más de (Over)' },
        { value: 'under', label: 'Menos de (Under)' },
      ]}
    />
  );
  const texto = describeSelection(value, homeName, awayName);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <SegmentedControl
          label="Categoría de mercado"
          size="sm"
          value={categoria.id}
          onChange={(id) => onChange(porDefecto(CATEGORIAS.find((c) => c.id === id)!.mercados[0].id))}
          options={CATEGORIAS.map((c) => ({ value: c.id, label: c.label }))}
        />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Mercado">
          {categoria.mercados.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={m.id === actual}
              onClick={() => m.id !== actual && onChange(porDefecto(m.id))}
              className={`min-h-8 rounded-pill border px-3 py-1 text-[12px] font-medium transition-colors ${
                m.id === actual ? 'border-transparent bg-text text-canvas' : 'border-border bg-surface text-muted hover:border-border-strong hover:text-text'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5 rounded-card border border-border bg-surface-2/60 p-3">
        {value.market === 'resultado' && (
          <>
            <Etiqueta tip={AYUDA.resultado}>Resultado</Etiqueta>
            <Rejilla cols={3}>
              {opcion({ market: 'resultado', outcome: 'home' }, `1 · ${homeName}`)}
              {opcion({ market: 'resultado', outcome: 'draw' }, 'X · Empate')}
              {opcion({ market: 'resultado', outcome: 'away' }, `2 · ${awayName}`)}
            </Rejilla>
          </>
        )}

        {value.market === 'doble' && (
          <>
            <Etiqueta tip={AYUDA.doble}>Doble oportunidad</Etiqueta>
            <Rejilla cols={3}>
              {opcion({ market: 'doble', outcome: '1X' }, '1X')}
              {opcion({ market: 'doble', outcome: 'X2' }, 'X2')}
              {opcion({ market: 'doble', outcome: '12' }, '12')}
            </Rejilla>
          </>
        )}

        {value.market === 'btts' && (
          <>
            <Etiqueta tip={AYUDA.btts}>Ambos marcan</Etiqueta>
            <Rejilla cols={2}>
              {opcion({ market: 'btts', outcome: 'si' }, 'Sí')}
              {opcion({ market: 'btts', outcome: 'no' }, 'No')}
            </Rejilla>
          </>
        )}

        {(value.market === 'goles' || value.market === 'corners' || value.market === 'tarjetas') && (
          <>
            <Etiqueta tip={AYUDA[value.market]}>{value.market === 'goles' ? 'Goles del partido' : value.market === 'corners' ? 'Corners del partido' : 'Tarjetas amarillas del partido'}</Etiqueta>
            {lados(value.side, (side) => onChange({ ...value, side }))}
            <Rejilla cols={value.market === 'corners' ? 4 : 6}>
              {MARKET_LINES[value.market].map((line) => opcion({ ...value, line }, line))}
            </Rejilla>
            {value.market === 'goles' && (
              <>
                <Etiqueta tip="Con el total justo en la línea se devuelve el stake. La probabilidad mostrada es la de ganar sin contar la devolución (↺).">Líneas asiáticas</Etiqueta>
                <Rejilla cols={4}>{MARKET_LINES.golesAsiaticas.map((line) => opcion({ ...value, line }, `${line}.0`))}</Rejilla>
              </>
            )}
          </>
        )}

        {value.market === 'mitad' && (
          <>
            <Etiqueta tip={AYUDA.mitad}>Goles por parte</Etiqueta>
            <div className="flex flex-wrap gap-2">
              <SegmentedControl
                size="sm"
                label="Parte"
                value={value.half === 1 ? '1' : '2'}
                onChange={(h) => onChange({ ...value, half: h === '1' ? 1 : 2 })}
                options={[
                  { value: '1', label: '1.ª parte' },
                  { value: '2', label: '2.ª parte' },
                ]}
              />
              {lados(value.side, (side) => onChange({ ...value, side }))}
            </div>
            <Rejilla cols={3}>{MARKET_LINES.mitad.map((line) => opcion({ ...value, line }, line))}</Rejilla>
          </>
        )}

        {value.market === 'asiatico' && value.line === 0 && (
          <>
            <Etiqueta tip={AYUDA.dnb}>Empate no válido</Etiqueta>
            <Rejilla cols={2}>
              {opcion({ market: 'asiatico', team: 'home', line: 0 }, homeName)}
              {opcion({ market: 'asiatico', team: 'away', line: 0 }, awayName)}
            </Rejilla>
          </>
        )}

        {value.market === 'asiatico' && value.line !== 0 && (
          <>
            <Etiqueta tip={AYUDA.asiatico}>Hándicap asiático</Etiqueta>
            <SegmentedControl
              size="sm"
              label="A qué se aplica el hándicap"
              value={asiaticoPartido ? 'partido' : value.team}
              onChange={(v) => {
                setAsiaticoPartido(v === 'partido');
                if (v !== 'partido') onChange({ ...value, team: v });
              }}
              options={[
                { value: 'home', label: 'Local', title: `Líneas para ${homeName}: se suman a sus goles` },
                { value: 'away', label: 'Visitante', title: `Líneas para ${awayName}: se suman a sus goles` },
                { value: 'partido', label: 'Partido', title: 'Cada línea del partido con sus dos lados: el hándicap de un equipo es el contrario del otro' },
              ]}
            />
            {asiaticoPartido ? (
              <div className="space-y-1.5">
                <div className="grid grid-cols-2 gap-1.5 text-center text-[11px] font-medium text-muted">
                  <span className="truncate">Local · {homeName}</span>
                  <span className="truncate">Visitante · {awayName}</span>
                </div>
                {LINEAS_ASIATICO.map((line) => (
                  <div key={line} className="grid grid-cols-2 gap-1.5">
                    {opcion({ market: 'asiatico', team: 'home', line }, formatLine(line))}
                    {opcion({ market: 'asiatico', team: 'away', line: -line }, formatLine(-line))}
                  </div>
                ))}
              </div>
            ) : (
              <>
                <p className="text-[11px] text-muted">
                  Líneas para {value.team === 'home' ? `el local, ${homeName}` : `el visitante, ${awayName}`}
                </p>
                <Rejilla cols={6}>{LINEAS_ASIATICO.map((line) => opcion({ ...value, line }, formatLine(line)))}</Rejilla>
              </>
            )}
          </>
        )}

        {value.market === 'europeo' && (
          <>
            <Etiqueta tip={AYUDA.europeo}>Hándicap europeo (se aplica al local)</Etiqueta>
            <Rejilla cols={6}>
              {MARKET_LINES.europeo.map((line) => opcion({ ...value, line }, `${homeName.split(' ')[0]} ${formatLine(line)}`))}
            </Rejilla>
            <Rejilla cols={3}>
              {opcion({ market: 'europeo', line: value.line, outcome: 'home' }, `1 (${formatLine(value.line)})`)}
              {opcion({ market: 'europeo', line: value.line, outcome: 'draw' }, `X (${formatLine(value.line)})`)}
              {opcion({ market: 'europeo', line: value.line, outcome: 'away' }, `2 (${formatLine(-value.line)})`)}
            </Rejilla>
          </>
        )}

        {value.market === 'equipo' && (
          <>
            <Etiqueta tip={AYUDA.equipo}>Goles por equipo</Etiqueta>
            <div className="flex flex-wrap gap-2">
              {equipos(value.team, (team) => onChange({ ...value, team }))}
              {lados(value.side, (side) => onChange({ ...value, side }))}
            </div>
            <Rejilla cols={4}>{MARKET_LINES.equipo.map((line) => opcion({ ...value, line }, line))}</Rejilla>
          </>
        )}

        {value.market === 'conteoEquipo' && (
          <>
            <Etiqueta tip={AYUDA[`${value.stat}Equipo`]}>{COUNT_MARKETS[value.stat].label} por equipo</Etiqueta>
            <div className="flex flex-wrap gap-2">
              {equipos(value.team, (team) => onChange({ ...value, team }))}
              {lados(value.side, (side) => onChange({ ...value, side }))}
            </div>
            <Rejilla cols={4}>{COUNT_MARKETS[value.stat].teamLines.map((line) => opcion({ ...value, line }, line))}</Rejilla>
          </>
        )}

        {value.market === 'cero' && (
          <>
            <Etiqueta tip={AYUDA.cero}>Portería a cero</Etiqueta>
            {equipos(value.team, (team) => onChange({ ...value, team }))}
            <Rejilla cols={2}>
              {opcion({ ...value, outcome: 'si' }, 'Sí, no encaja')}
              {opcion({ ...value, outcome: 'no' }, 'No, encaja')}
            </Rejilla>
          </>
        )}
      </div>

      <p className="rounded-control border border-border px-3 py-2 text-[12px] leading-relaxed">
        <span className="font-medium">{selectionLabel(value, homeName, awayName)}.</span> Gana si {texto.gana}.
        {texto.devuelve && <> Se devuelve el stake si {texto.devuelve}.</>} Pierde en cualquier otro caso.
      </p>
    </div>
  );
}

/**
 * Todas las líneas del mercado elegido, lado a lado, con su probabilidad y su cuota justa. Sirve para
 * comparar dónde está cada línea sin ir eligiéndolas una a una; pulsar una celda la selecciona.
 */
export function LineLadder({
  value,
  onChange,
  estimate,
  homeName = 'Local',
  awayName = 'Visitante',
}: {
  value: Selection;
  onChange: (s: Selection) => void;
  estimate: (s: Selection) => MarketEstimate | null;
  homeName?: string;
  awayName?: string;
}) {
  const celda = (s: Selection, extra?: string) => {
    const e = estimate(s);
    const p = e?.probability ?? null;
    const activa = selectionKey(s) === selectionKey(value);
    return (
      <td className="p-0.5" key={selectionKey(s)}>
        <button
          type="button"
          aria-pressed={activa}
          aria-label={`${selectionLabel(s, homeName, awayName)}: ${p === null ? 'datos insuficientes' : pct(p)}`}
          onClick={() => onChange(s)}
          className={`relative flex w-full items-center justify-between gap-2 overflow-hidden rounded-control border px-2 py-1.5 text-[12px] tabular-nums transition-colors ${
            activa ? 'border-accent ring-1 ring-accent/30' : 'border-transparent hover:border-border-strong'
          }`}
        >
          {p !== null && <span aria-hidden className="absolute inset-y-0 left-0 bg-accent-soft" style={{ width: `${p * 100}%` }} />}
          <span className="relative font-semibold">{p === null ? '—' : `${(p * 100).toFixed(1)} %`}</span>
          <span className="relative text-muted">
            {p ? (1 / p).toFixed(2) : ''}
            {extra}
            {e?.push ? <span className="text-faint"> ↺{(e.push * 100).toFixed(0)} %</span> : null}
          </span>
        </button>
      </td>
    );
  };
  const cabecera = (cols: string[]) => (
    <thead>
      <tr>
        {cols.map((c, i) => (
          <th scope="col" key={c} className={i === 0 ? '' : 'num'}>
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );

  let tabla: ReactNode;
  if (
    value.market === 'goles' ||
    value.market === 'mitad' ||
    value.market === 'corners' ||
    value.market === 'tarjetas' ||
    value.market === 'tiros' ||
    value.market === 'sot' ||
    value.market === 'equipo' ||
    value.market === 'conteoEquipo'
  ) {
    const base = value;
    const lineas =
      base.market === 'goles'
        ? [...MARKET_LINES.goles, ...MARKET_LINES.golesAsiaticas].sort((a, b) => a - b)
        : base.market === 'equipo'
          ? MARKET_LINES.equipo
          : base.market === 'conteoEquipo'
            ? COUNT_MARKETS[base.stat].teamLines
            : MARKET_LINES[base.market];
    tabla = (
      <table className="data">
        {cabecera(['Línea', 'Over · cuota justa', 'Under · cuota justa'])}
        <tbody>
          {lineas.map((line) => (
            <tr key={line}>
              <td className="font-medium tabular-nums">{Number.isInteger(line) ? `${line}.0` : line}</td>
              {celda({ ...base, side: 'over', line } as Selection)}
              {celda({ ...base, side: 'under', line } as Selection)}
            </tr>
          ))}
        </tbody>
      </table>
    );
  } else if (value.market === 'asiatico') {
    tabla = (
      <table className="data">
        {cabecera(['Línea del local', `Local · ${homeName}`, `Visitante · ${awayName}`])}
        <tbody>
          {MARKET_LINES.asiatico.map((line) => (
            <tr key={line}>
              <td className="font-medium tabular-nums">{line === 0 ? '0 (DNB)' : formatLine(line)}</td>
              {celda({ market: 'asiatico', team: 'home', line })}
              {celda({ market: 'asiatico', team: 'away', line: -line || 0 })}
            </tr>
          ))}
        </tbody>
      </table>
    );
  } else if (value.market === 'europeo') {
    tabla = (
      <table className="data">
        {cabecera(['Línea del local', '1', 'X', '2'])}
        <tbody>
          {MARKET_LINES.europeo.map((line) => (
            <tr key={line}>
              <td className="font-medium tabular-nums">{formatLine(line)}</td>
              {celda({ market: 'europeo', line, outcome: 'home' })}
              {celda({ market: 'europeo', line, outcome: 'draw' })}
              {celda({ market: 'europeo', line, outcome: 'away' })}
            </tr>
          ))}
        </tbody>
      </table>
    );
  } else {
    const filas: [string, Selection][] =
      value.market === 'cero'
        ? [
            [`${homeName}: sí`, { market: 'cero', team: 'home', outcome: 'si' }],
            [`${homeName}: no`, { market: 'cero', team: 'home', outcome: 'no' }],
            [`${awayName}: sí`, { market: 'cero', team: 'away', outcome: 'si' }],
            [`${awayName}: no`, { market: 'cero', team: 'away', outcome: 'no' }],
          ]
        : [
            [`1 · ${homeName}`, { market: 'resultado', outcome: 'home' }],
            ['X · Empate', { market: 'resultado', outcome: 'draw' }],
            [`2 · ${awayName}`, { market: 'resultado', outcome: 'away' }],
            ['1X', { market: 'doble', outcome: '1X' }],
            ['X2', { market: 'doble', outcome: 'X2' }],
            ['12', { market: 'doble', outcome: '12' }],
            ['Ambos marcan: sí', { market: 'btts', outcome: 'si' }],
            ['Ambos marcan: no', { market: 'btts', outcome: 'no' }],
          ];
    tabla = (
      <table className="data">
        {cabecera(['Selección', 'Probabilidad · cuota justa'])}
        <tbody>
          {filas.map(([label, s]) => (
            <tr key={selectionKey(s)}>
              <td className="font-medium">{label}</td>
              {celda(s)}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return <div className="overflow-x-auto">{tabla}</div>;
}
