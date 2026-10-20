/**
 * Paleta de comandos: escribir y saltar.
 *
 * Es la navegación principal de la aplicación, no un adorno. Con 32 competiciones, 768 equipos y 27.000
 * partidos cargados, llegar a «Barcelona» o a «LaLiga 2024-25» por un menú son cuatro pulsaciones y dos
 * pantallas intermedias; aquí son tres letras. Por eso el menú lateral pudo bajar de catorce enlaces a
 * cuatro modos: lo que antes resolvía la lista, lo resuelve esto mejor.
 *
 * Busca en tres sitios a la vez —pantallas, competiciones y equipos— porque quien la abre no piensa en
 * «qué sección», piensa en «qué quiero ver».
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Trophy, Users, LayoutGrid } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { normalizeTeamName } from '../../domain/models/teamResolver';
import { DESTINOS } from './navegacion';

interface Opcion {
  id: string;
  texto: string;
  detalle?: string;
  grupo: 'Pantallas' | 'Competiciones' | 'Equipos';
  to: string;
  /** Si lleva el rótulo del grupo encima. Se decide al construir la lista, no pintando. */
  abreGrupo?: boolean;
}

/** Sin tildes y en minúsculas: buscar «Atletico» tiene que encontrar «Atlético». */
const plano = (s: string) => normalizeTeamName(s);

/** Marca la primera opción de cada grupo, para que el rótulo no dependa de mutar nada al pintar. */
const marcarGrupos = (opciones: Opcion[]): Opcion[] =>
  opciones.map((o, i) => ({ ...o, abreGrupo: i === 0 || opciones[i - 1].grupo !== o.grupo }));

export function CommandPalette({ abierta, cerrar }: { abierta: boolean; cerrar: () => void }) {
  const navigate = useNavigate();
  const leagues = useStore((s) => s.leagues);
  const teams = useStore((s) => s.derived.teams);
  const [texto, setTexto] = useState('');
  const [cursor, setCursor] = useState(0);
  const dialogo = useRef<HTMLDialogElement>(null);
  const lista = useRef<HTMLUListElement>(null);

  // Solo el diálogo nativo, que es un sistema externo. El estado se ajusta abajo, durante el render.
  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (abierta && !d.open) d.showModal();
    if (!abierta && d.open) d.close();
  }, [abierta]);

  /*
   * Al abrirse, la paleta empieza vacía.
   *
   * Se ajusta durante el render comparando con el valor anterior, que es el patrón que documenta React
   * para reaccionar al cambio de una prop. Hacerlo en un efecto provoca un render de más con el texto de
   * la vez anterior todavía puesto, y se ve el parpadeo.
   */
  const [estabaAbierta, setEstabaAbierta] = useState(abierta);
  if (estabaAbierta !== abierta) {
    setEstabaAbierta(abierta);
    if (abierta) {
      setTexto('');
      setCursor(0);
    }
  }

  const opciones = useMemo(() => {
    const q = plano(texto.trim());
    const pantallas: Opcion[] = DESTINOS.map((d) => ({ id: `p:${d.to}`, texto: d.label, detalle: d.modo, grupo: 'Pantallas', to: d.to }));
    if (!q) return pantallas;

    const coincide = (s: string) => plano(s).includes(q);
    const ligas: Opcion[] = leagues
      .filter((l) => coincide(l.name))
      .map((l) => ({ id: `l:${l.id}`, texto: l.name, detalle: l.country, grupo: 'Competiciones', to: `/ligas/${encodeURIComponent(l.id)}` }));
    // Los equipos se cortan a diez: son 768 y la lista dejaria de poder recorrerse con el teclado.
    const equipos: Opcion[] = teams
      .filter((t) => coincide(t.name))
      .slice(0, 10)
      .map((t) => ({ id: `e:${t.id}`, texto: t.name, detalle: t.leagueId, grupo: 'Equipos', to: `/equipos/${encodeURIComponent(t.id)}` }));

    return marcarGrupos([...pantallas.filter((p) => coincide(p.texto)), ...ligas, ...equipos]);
  }, [texto, leagues, teams]);

  const ir = (o: Opcion | undefined) => {
    if (!o) return;
    cerrar();
    navigate(o.to);
  };

  // El cursor no puede quedarse fuera cuando la lista se acorta al escribir.
  const activo = Math.min(cursor, Math.max(opciones.length - 1, 0));

  useEffect(() => {
    lista.current?.querySelector('[data-activo="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [activo, texto]);


  return (
    <dialog
      ref={dialogo}
      aria-label="Ir a"
      onClose={cerrar}
      onClick={(e) => {
        if (e.target === dialogo.current) cerrar();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          cerrar();
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setCursor((c) => Math.min(c + 1, opciones.length - 1));
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setCursor((c) => Math.max(c - 1, 0));
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          ir(opciones[activo]);
        }
      }}
      className="mx-auto mt-[12vh] w-[min(calc(100%-1.5rem),36rem)] overflow-hidden rounded-card border border-border bg-elevated p-0 text-left text-text shadow-pop"
    >
      {abierta && (
        <>
          <div className="flex items-center gap-2 border-b border-border px-3.5">
            <Search size={16} className="shrink-0 text-faint" aria-hidden />
            <input
              autoFocus
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                setCursor(0);
              }}
              placeholder="Ir a una pantalla, competición o equipo…"
              aria-label="Buscar"
              className="min-h-12 w-full bg-transparent text-[15px] outline-none placeholder:text-faint"
            />
            <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-faint sm:block">esc</kbd>
          </div>

          <ul ref={lista} className="max-h-[50vh] overflow-y-auto py-1.5">
            {opciones.length === 0 && <li className="px-3.5 py-6 text-center text-[13px] text-muted">Nada con «{texto}».</li>}
            {opciones.map((o, i) => {
              const Icono = o.grupo === 'Competiciones' ? Trophy : o.grupo === 'Equipos' ? Users : LayoutGrid;
              return (
                <li key={o.id}>
                  {o.abreGrupo && <div className="t-label px-3.5 pt-2 pb-1 text-[10px] text-faint">{o.grupo}</div>}
                  <button
                    type="button"
                    data-activo={i === activo}
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => ir(o)}
                    className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] transition-colors ${
                      i === activo ? 'bg-accent-soft text-accent-text' : 'text-text hover:bg-surface-2'
                    }`}
                  >
                    <Icono size={15} className={`shrink-0 ${i === activo ? 'text-accent' : 'text-faint'}`} aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{o.texto}</span>
                    {o.detalle && <span className="shrink-0 text-[11px] text-faint">{o.detalle}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </dialog>
  );
}
