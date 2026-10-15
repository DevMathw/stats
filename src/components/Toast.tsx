// oxlint-disable react/only-export-components -- `toast()` se llama desde cualquier pantalla
import { useSyncExternalStore, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CircleCheck, Info, TriangleAlert, X } from 'lucide-react';

/**
 * Avisos tras una acción («Pick registrado», «Depósito guardado»). Antes cada pantalla ponía su propio
 * mensaje en un sitio distinto, a veces lejos del botón. Van a una región `aria-live`, así también los
 * oye un lector de pantalla.
 */

type Tono = 'success' | 'error' | 'info';

interface Aviso {
  id: number;
  tono: Tono;
  texto: ReactNode;
  enlace?: { label: string; to: string };
}

let avisos: Aviso[] = [];
let siguiente = 0;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((l) => l());

function quitar(id: number) {
  avisos = avisos.filter((a) => a.id !== id);
  avisar();
}

export function toast(texto: ReactNode, tono: Tono = 'success', enlace?: Aviso['enlace']) {
  const id = ++siguiente;
  avisos = [...avisos, { id, tono, texto, enlace }].slice(-3);
  avisar();
  // Un error se lee con más calma.
  window.setTimeout(() => quitar(id), tono === 'error' ? 8000 : 4500);
}

const ICONO = {
  success: <CircleCheck size={16} className="text-positive-text" />,
  error: <TriangleAlert size={16} className="text-negative-text" />,
  info: <Info size={16} className="text-accent-text" />,
};

export function Toaster() {
  const lista = useSyncExternalStore(
    (l) => {
      oyentes.add(l);
      return () => oyentes.delete(l);
    },
    () => avisos,
    () => avisos,
  );
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 bottom-20 z-[90] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:items-end lg:bottom-4"
    >
      {lista.map((a) => (
        <div
          key={a.id}
          role={a.tono === 'error' ? 'alert' : 'status'}
          className="pointer-events-auto flex w-full max-w-sm animate-[toast-in_180ms_ease-out] items-start gap-2.5 rounded-card border border-border bg-surface py-2.5 pr-2 pl-3.5 text-[13px] shadow-pop"
        >
          <span className="mt-0.5 shrink-0">{ICONO[a.tono]}</span>
          <div className="min-w-0 flex-1 py-0.5">
            {a.texto}
            {a.enlace && (
              <Link to={a.enlace.to} onClick={() => quitar(a.id)} className="ml-1.5 font-medium text-accent-text hover:underline">
                {a.enlace.label}
              </Link>
            )}
          </div>
          <button
            type="button"
            onClick={() => quitar(a.id)}
            aria-label="Cerrar aviso"
            className="rounded-control p-1 text-faint transition-colors hover:bg-surface-2 hover:text-text"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
