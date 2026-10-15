import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { countryName } from '../../domain/models/countries';
import { Button, Field, inputClass } from '../ui';
import { CountryFlag } from '../LeagueLabel';
import { teamDisplay } from '../../domain/models/teamDisplay';
import type { EmptyStat } from '../../types';
import { MATCH_DATA } from '../../domain/models/matchDataRules';
import { compareSeasons, seasonKey } from '../../domain/models/season';
import { parseTeamId } from '../../domain/models/ids';

export type FilterKey = 'country' | 'league' | 'team' | 'season' | 'round' | 'dates' | 'empty';

/** Datos del partido que se pueden buscar sin publicar (N/D) en Partidos, con su rótulo en el chip. */
const COLUMNAS_VACIAS: { value: EmptyStat; label: string; chip: string }[] = [
  { value: 'any', label: `Cualquiera de los ${MATCH_DATA.length}`, chip: 'Falta algún dato' },
  ...MATCH_DATA.map((d) => ({ value: d.id, label: d.label, chip: `Falta: ${d.name}` })),
];

/**
 * Filtros en un popover, con chips de lo aplicado.
 *
 * Antes eran seis desplegables siempre visibles ocupando una banda entera. El usuario pasa
 * la mayor parte del tiempo *leyendo* datos, no cambiando filtros: lo que debe estar siempre
 * a la vista es QUÉ está filtrado, no los controles para cambiarlo.
 */
export function FilterBar({ show = ['country', 'league', 'team', 'round', 'dates'] }: { show?: FilterKey[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const filters = useStore((s) => s.filters);
  const setFilters = useStore((s) => s.setFilters);
  const resetFilters = useStore((s) => s.resetFilters);
  const leagues = useStore((s) => s.leagues);
  const matches = useStore((s) => s.matches);
  const fixtures = useStore((s) => s.fixtures);

  useEffect(() => {
    if (!open) return;
    // El foco entra en el panel: con teclado no hay que buscarlo.
    panel.current?.querySelector<HTMLElement>('select, input')?.focus();
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const countries = useMemo(() => [...new Set(leagues.map((l) => l.country).filter(Boolean))].sort(), [leagues]);
  const visibleLeagues = useMemo(() => leagues.filter((l) => !filters.country || l.country === filters.country), [leagues, filters.country]);
  /** Solo Partidos filtra por temporada; en las demás pantallas el desplegable no existe. */
  const porTemporada = show.includes('season');

  /**
   * Los equipos que se pueden elegir, con el nombre que se LEE.
   *
   * Salen de los propios partidos y no de `derived.teams`, que son solo los de la temporada en curso: con
   * el histórico cargado faltaban los clubes que ya no juegan la competición (Envigado y Unión Magdalena en
   * la BetPlay), que salían en la tabla y no se podían filtrar. Y se limitan a la temporada elegida, para no
   * ofrecer un equipo que dejaría la tabla vacía.
   *
   * El orden es por el nombre visible: por el guardado, «Independiente Santa Fe» caía al final de la lista
   * porque dentro se llama «Santa Fe».
   */
  const visibleTeams = useMemo(() => {
    const porId = new Map<string, { id: string; nombre: string }>();
    for (const r of [...matches, ...fixtures]) {
      if (filters.leagueId && r.leagueId !== filters.leagueId) continue;
      if (filters.country && r.country !== filters.country) continue;
      if (porTemporada && filters.season && seasonKey(r.season) !== filters.season) continue;
      for (const [id, name, ref] of [
        [r.homeTeamId, r.homeTeamName, r.homeTeamRef],
        [r.awayTeamId, r.awayTeamName, r.awayTeamRef],
      ] as const) {
        if (!porId.has(id)) porId.set(id, { id, nombre: teamDisplay(ref, name, id).name });
      }
    }
    return [...porId.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [matches, fixtures, filters.leagueId, filters.country, filters.season, porTemporada]);
  const rounds = useMemo(() => [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b), [matches]);

  /**
   * Las temporadas que de verdad hay cargadas, en clave canónica y de la más nueva a la más vieja.
   *
   * Se limitan a la competición elegida: enseñar «2025» mirando LaLiga, que solo tiene la actual, sería
   * ofrecer un filtro que deja la lista vacía.
   */
  const seasons = useMemo(() => {
    const suyos = filters.leagueId ? matches.filter((m) => m.leagueId === filters.leagueId) : matches;
    const claves = new Set<string>();
    for (const m of suyos) {
      const k = seasonKey(m.season);
      if (k) claves.add(k);
    }
    return [...claves].sort(compareSeasons).reverse();
  }, [matches, filters.leagueId]);
  const vigente = useMemo(() => seasonKey(leagues.find((l) => l.id === filters.leagueId)?.season), [leagues, filters.leagueId]);

  /** Un chip por filtro activo: se ve y se quita desde el mismo sitio. */
  const chips = useMemo(() => {
    const out: { key: string; texto: string; label: ReactNode; clear: () => void }[] = [];
    if (filters.country) {
      const texto = countryName(filters.country);
      out.push({
        key: 'country',
        texto,
        label: (
          <>
            <CountryFlag country={filters.country} /> {texto}
          </>
        ),
        clear: () => setFilters({ country: null, leagueId: null, teamId: null }),
      });
    }
    if (filters.leagueId) {
      const texto = leagues.find((l) => l.id === filters.leagueId)?.name ?? filters.leagueId;
      out.push({ key: 'league', texto, label: texto, clear: () => setFilters({ leagueId: null, teamId: null }) });
    }
    if (filters.teamId) {
      // El nombre que se lee, y si el equipo ya no está en la selección, el que lleva su propia clave.
      const texto = visibleTeams.find((t) => t.id === filters.teamId)?.nombre ?? parseTeamId(filters.teamId).teamName;
      out.push({ key: 'team', texto, label: texto, clear: () => setFilters({ teamId: null }) });
    }
    if (filters.round !== null) out.push({ key: 'round', texto: `Jornada ${filters.round}`, label: `Jornada ${filters.round}`, clear: () => setFilters({ round: null }) });
    if (filters.dateFrom) out.push({ key: 'from', texto: `Desde ${filters.dateFrom}`, label: `Desde ${filters.dateFrom}`, clear: () => setFilters({ dateFrom: null }) });
    if (filters.dateTo) out.push({ key: 'to', texto: `Hasta ${filters.dateTo}`, label: `Hasta ${filters.dateTo}`, clear: () => setFilters({ dateTo: null }) });
    // Solo donde se aplica (Partidos): en otra página sería un chip que no filtra nada.
    if (show.includes('season') && filters.season) {
      out.push({ key: 'season', texto: `Temporada ${filters.season}`, label: `Temporada ${filters.season}`, clear: () => setFilters({ season: null }) });
    }
    const vacio = show.includes('empty') ? COLUMNAS_VACIAS.find((c) => c.value === filters.emptyStat) : undefined;
    if (vacio) out.push({ key: 'empty', texto: vacio.chip, label: vacio.chip, clear: () => setFilters({ emptyStat: null }) });
    return out;
  }, [filters, leagues, visibleTeams, setFilters, show]);

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2" ref={ref}>
      <div className="relative">
        <Button onClick={() => setOpen((o) => !o)} variant={chips.length ? 'primary' : 'default'}>
          <SlidersHorizontal size={14} aria-hidden />
          Filtros
          {chips.length > 0 && <span className="rounded-pill bg-black/15 px-1.5 text-[11px] tabular-nums">{chips.length}</span>}
        </Button>

        {open && (
          <div
            ref={panel}
            role="dialog"
            aria-label="Filtros"
            className="enter absolute top-full left-0 z-30 mt-2 w-[min(92vw,26rem)] rounded-card border border-border bg-elevated p-3 shadow-pop"
          >
            <div className="grid grid-cols-2 gap-3">
              {show.includes('country') && (
                <Field label="País">
                  <select className={inputClass} value={filters.country ?? ''} onChange={(e) => setFilters({ country: e.target.value || null, leagueId: null, teamId: null })}>
                    <option value="">Todos</option>
                    {countries.map((c) => (
                      <option key={c} value={c}>
                        {countryName(c)}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              {show.includes('league') && (
                <Field label="Competición">
                  <select className={inputClass} value={filters.leagueId ?? ''} onChange={(e) => setFilters({ leagueId: e.target.value || null, teamId: null })}>
                    <option value="">Todas</option>
                    {visibleLeagues.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              {show.includes('season') && seasons.length > 1 && (
                <Field label="Temporada">
                  <select className={inputClass} value={filters.season ?? ''} onChange={(e) => setFilters({ season: e.target.value || null })}>
                    <option value="">Todas</option>
                    {seasons.map((t) => (
                      <option key={t} value={t}>
                        {t}
                        {t === vigente ? ' (en curso)' : ''}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              {show.includes('team') && (
                <Field label="Equipo" className="col-span-2">
                  <select className={inputClass} value={filters.teamId ?? ''} onChange={(e) => setFilters({ teamId: e.target.value || null })}>
                    <option value="">Todos</option>
                    {visibleTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              {show.includes('round') && (
                <Field label="Jornada" className="col-span-2">
                  <select className={inputClass} value={filters.round ?? ''} onChange={(e) => setFilters({ round: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">Todas</option>
                    {rounds.map((r) => (
                      <option key={r} value={r}>
                        J{r}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              {show.includes('dates') && (
                // Desde y Hasta van juntos en su propia fila, pase lo que pase con los campos de antes.
                <div className="col-span-2 grid grid-cols-2 gap-3">
                  <Field label="Desde">
                    <input type="date" className={inputClass} value={filters.dateFrom ?? ''} onChange={(e) => setFilters({ dateFrom: e.target.value || null })} />
                  </Field>
                  <Field label="Hasta">
                    <input type="date" className={inputClass} value={filters.dateTo ?? ''} onChange={(e) => setFilters({ dateTo: e.target.value || null })} />
                  </Field>
                </div>
              )}

              {show.includes('empty') && (
                <Field label="Dato que falta" className="col-span-2">
                  <select className={inputClass} value={filters.emptyStat ?? ''} onChange={(e) => setFilters({ emptyStat: (e.target.value || null) as EmptyStat | null })}>
                    <option value="">Sin filtrar</option>
                    {COLUMNAS_VACIAS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>

            <div className="mt-3 flex justify-between border-t border-border pt-3">
              <Button variant="ghost" size="sm" onClick={resetFilters} disabled={!chips.length}>
                Limpiar todo
              </Button>
              <Button size="sm" onClick={() => setOpen(false)}>
                Listo
              </Button>
            </div>
          </div>
        )}
      </div>

      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={c.clear}
          aria-label={`Quitar filtro: ${c.texto}`}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-pill border border-border-strong bg-surface px-2.5 py-1 text-[12px] text-muted transition-colors hover:text-text sm:min-h-7"
        >
          {c.label}
          <X size={12} className="text-faint" aria-hidden />
        </button>
      ))}
    </div>
  );
}
