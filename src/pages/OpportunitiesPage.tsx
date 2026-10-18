/**
 * Oportunidades: los partidos pendientes en los que el modelo SÍ tiene un pick.
 *
 * Es la pantalla que contesta «¿qué miro hoy?». Hasta ahora la respuesta estaba en Proyecciones, repartida
 * entre 542 filas de diez en diez: **37 partidos con pick en 55 páginas**, y para dar con ellos había que
 * saber que la columna del pick se podía ordenar. Aquí se llega y están.
 *
 * No hay ni un criterio nuevo: el pick es el mismo `selectModelPick` de siempre, con sus seis descartes
 * (confianza, calidad del dato, probabilidad, skill en el backtest, muestra de la liga y riesgo). Esta
 * pantalla solo es la lista de los que pasan. Si no pasa ninguno, lo dice y explica por qué, en vez de
 * enseñar un hueco.
 *
 * Agrupado por día y, dentro del día, por ventaja ajustada: primero cuándo se juega, que es lo que no se
 * puede mover, y después cuál se sale más de lo normal en su competición.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, CalendarX, SearchX } from 'lucide-react';
import { FilterBar } from '../components/Filters/FilterBar';
import { Card, Empty, PageHeader, SectionTitle, Stat, StatRow } from '../components/ui';
import { MatchCard } from '../components/Match/MatchCard';
import { useModelPicks } from '../components/Betting/useFixtureData';
import { MIN_CONFIDENCE, PICK_PROBABILITY } from '../domain/betting/modelPick';
import { FAMILY_LABEL, MARKET_FAMILIES, marketFamily, type MarketFamily } from '../domain/betting/marketFamily';
import { longDate } from '../utils/matchTime';
import { fmt, fmtInt, fmtPct } from '../utils/format';
import { useStore } from '../store/useStore';
import type { MatchProjection } from '../types';

/** Chip de filtro: el estado activo se ve por color y por `aria-pressed`, no solo por color. */
function Chip({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`toque-alto inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-[13px] font-medium transition-colors ${
        activo ? 'border-accent bg-accent text-accent-fg' : 'border-border-strong bg-surface text-muted hover:bg-surface-2 hover:text-text'
      }`}
    >
      {children}
    </button>
  );
}

const Cuenta = ({ n, activo }: { n: number; activo: boolean }) => (
  <span className={`rounded-pill px-1.5 text-[11px] tabular-nums ${activo ? 'bg-black/20' : 'bg-surface-2 text-faint'}`}>{n}</span>
);

export function OpportunitiesPage() {
  const projections = useStore((s) => s.derived.projections);
  const filters = useStore((s) => s.filters);
  const teams = useStore((s) => s.derived.teams);
  const leagues = useStore((s) => s.leagues);

  // `MatchProjection` no lleva el país: sale de su competición. Sin esto, elegir solo un país no filtraría
  // nada, que es lo que pasa hoy en Proyecciones.
  const paisDeLiga = useMemo(() => new Map(leagues.map((l) => [l.id, l.country])), [leagues]);

  const visibles = useMemo(() => {
    const teamName = filters.teamId ? teams.find((t) => t.id === filters.teamId)?.name : null;
    return projections
      .filter((p) => !filters.leagueId || p.leagueId === filters.leagueId)
      .filter((p) => !filters.country || paisDeLiga.get(p.leagueId) === filters.country)
      .filter((p) => filters.round === null || p.round === filters.round)
      .filter((p) => !filters.dateFrom || p.date >= filters.dateFrom)
      .filter((p) => !filters.dateTo || p.date <= filters.dateTo)
      .filter((p) => !teamName || p.homeTeamName === teamName || p.awayTeamName === teamName);
  }, [projections, filters, teams, paisDeLiga]);

  const ids = useMemo(() => visibles.map((p) => p.fixtureId), [visibles]);
  const picks = useModelPicks(ids);

  /**
   * Filtro por tipo de mercado.
   *
   * De las 1.856 oportunidades, unas son de goles y otras de corners o tarjetas, y quien busca un pick ya
   * sabe de cual lo quiere. Sin esto habia que recorrer las tarjetas una a una leyendo el mercado.
   */
  const [familia, setFamilia] = useState<MarketFamily | null>(null);

  /** Cuantas hay de cada familia, ANTES de filtrar: si no, los recuentos cambiarian al elegir uno. */
  const porFamilia = useMemo(() => {
    const cuenta = new Map<MarketFamily, number>();
    for (const p of visibles) {
      const mejor = picks.get(p.fixtureId)?.best;
      if (!mejor) continue;
      const f = marketFamily(mejor.selection);
      cuenta.set(f, (cuenta.get(f) ?? 0) + 1);
    }
    return cuenta;
  }, [visibles, picks]);

  /** Los que tienen pick, por día y, dentro del día, por ventaja ajustada. */
  const porDia = useMemo(() => {
    const conPick = visibles
      .filter((p) => picks.get(p.fixtureId)?.best)
      .filter((p) => familia === null || marketFamily(picks.get(p.fixtureId)!.best!.selection) === familia);
    const dias = new Map<string, MatchProjection[]>();
    for (const p of conPick) {
      const lista = dias.get(p.date);
      if (lista) lista.push(p);
      else dias.set(p.date, [p]);
    }
    for (const lista of dias.values()) {
      lista.sort((a, b) => (picks.get(b.fixtureId)!.best!.score ?? 0) - (picks.get(a.fixtureId)!.best!.score ?? 0));
    }
    return [...dias].sort(([a], [b]) => a.localeCompare(b));
  }, [visibles, picks, familia]);

  const total = porDia.reduce((n, [, lista]) => n + lista.length, 0);
  const hayFiltro = Object.values(filters).some((v) => v !== null);

  /**
   * El resumen de la banda. Son recuentos y medias de los picks que YA están en pantalla, no un cálculo
   * nuevo: si la lista enseña 1.856 oportunidades, la confianza media es la de esas 1.856.
   *
   * Las medias se devuelven `null` sin muestra, nunca 0: cero de confianza significa otra cosa.
   */
  const resumen = useMemo(() => {
    const mejores = porDia.flatMap(([, lista]) => lista.map((p) => picks.get(p.fixtureId)!.best!));
    const ligas = new Set(porDia.flatMap(([, lista]) => lista.map((p) => p.leagueId)));
    const confianzas = mejores.map((b) => b.estimate.confidence).filter((v) => Number.isFinite(v));
    const probabilidades = mejores.map((b) => b.estimate.probability).filter((v): v is number => v !== null);
    const media = (xs: number[]) => (xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length);
    return { ligas: ligas.size, confianza: media(confianzas), probabilidad: media(probabilidades) };
  }, [porDia, picks]);

  return (
    <div>
      <PageHeader
        title="Oportunidades"
        description="Los partidos pendientes en los que el modelo encuentra un pick. Sin cuotas de ninguna casa: la referencia es lo habitual en cada competición. Son estimaciones, no pronósticos seguros."
      />
      <FilterBar show={['country', 'league', 'team', 'round', 'dates']} />

      {/* Tipo de mercado. Solo se ensenan las familias que de verdad tienen algun pick hoy. */}
      {porFamilia.size > 0 && (
        <div className="tira-filtros mb-3" role="group" aria-label="Tipo de mercado">
          <Chip activo={familia === null} onClick={() => setFamilia(null)}>
            Todos <Cuenta n={[...porFamilia.values()].reduce((a, b) => a + b, 0)} activo={familia === null} />
          </Chip>
          {MARKET_FAMILIES.filter((f) => porFamilia.has(f)).map((f) => (
            <Chip key={f} activo={familia === f} onClick={() => setFamilia(familia === f ? null : f)}>
              {FAMILY_LABEL[f]} <Cuenta n={porFamilia.get(f)!} activo={familia === f} />
            </Chip>
          ))}
        </div>
      )}

      {total > 0 && (
        <>
          {/*
            * Misma banda que el Dashboard, Bankroll y Rendimiento: una cifra manda y las demás son contexto.
            * Antes esto era un párrafo con los números dentro del texto, que hay que leer entero para sacar
            * el dato. El párrafo sigue debajo, pero ya solo con lo que es explicación.
            */}
          <div className="mb-3">
            <StatRow>
              <Stat
                label="Oportunidades"
                value={fmtInt(total)}
                hint={`de ${visibles.length} partidos pendientes`}
                icon={<Award />}
                hero
              />
              <Stat label="Competiciones" value={fmtInt(resumen.ligas)} tip="Competiciones distintas entre las oportunidades de la lista." />
              <Stat label="Días con pick" value={fmtInt(porDia.length)} />
              <Stat label="Confianza media" value={fmt(resumen.confianza, 1)} hint="sobre 10" tip="Media de la confianza de los picks de la lista. No es una probabilidad: mide cuánto dato hay detrás." />
              <Stat label="Probabilidad media" value={fmtPct(resumen.probabilidad)} tip="Media de la probabilidad que el modelo da a cada pick de la lista." />
            </StatRow>
          </div>
          <p className="mb-3 text-[13px] text-muted">
            Cada oportunidad supera el {PICK_PROBABILITY.min * 100} % de probabilidad, {MIN_CONFIDENCE} de confianza y la
            frecuencia de su mercado en la competición.{' '}
            <Link className="text-accent-text hover:underline" to="/proyecciones">
              Ver todas las proyecciones
            </Link>
            .
          </p>
        </>
      )}

      {total === 0 ? (
        <Card>
          {visibles.length === 0 ? (
            <Empty icon={<CalendarX />} title={hayFiltro ? 'Sin partidos pendientes con estos filtros' : 'Sin partidos pendientes'}>
              {hayFiltro ? (
                <>Prueba a quitar algún filtro: no hay ningún partido por jugar que los cumpla.</>
              ) : (
                <>
                  Cárgalos con «Actualizar partidos» o añádelos en{' '}
                  <Link className="text-accent-text hover:underline" to="/partidos">
                    Partidos → Pendientes
                  </Link>
                  .
                </>
              )}
            </Empty>
          ) : (
            // NO es un error ni un fallo de datos: es que ninguno pasa el filtro, y eso es lo normal.
            <Empty icon={<SearchX />} title="Ninguna oportunidad ahora mismo">
              De los {visibles.length} partidos pendientes, ninguno cumple los criterios: probabilidad entre el{' '}
              {PICK_PROBABILITY.min * 100} y el {PICK_PROBABILITY.max * 100} %, confianza de al menos {MIN_CONFIDENCE}/10,
              calidad de datos suficiente, muestra en la competición y riesgo aceptable a la cuota justa. Que la lista esté
              vacía es una respuesta, no un fallo: el modelo no fuerza un pick cuando no lo ve.{' '}
              <Link className="text-accent-text hover:underline" to="/proyecciones">
                En Proyecciones
              </Link>{' '}
              están todos con sus probabilidades, y cada ficha explica qué descartó cada mercado.
            </Empty>
          )}
        </Card>
      ) : (
        porDia.map(([dia, lista]) => (
          <section key={dia} className="mb-5">
            <SectionTitle
              right={
                <span className="flex items-center gap-1 text-[12px] text-faint">
                  <Award size={13} aria-hidden />
                  {lista.length}
                </span>
              }
            >
              <span className="first-letter:uppercase">{longDate(dia)}</span>
            </SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {lista.map((p) => (
                <MatchCard key={p.fixtureId} p={p} pick={picks.get(p.fixtureId)} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
