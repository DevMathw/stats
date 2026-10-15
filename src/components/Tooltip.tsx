// oxlint-disable react/only-export-components -- el hook y el componente comparten posicionamiento
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type FocusEvent, type PointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Tooltips y popovers de la aplicación, con un solo posicionamiento.
 *
 * Se pintan en un portal con posición fija: un tooltip absoluto dentro de una tabla con scroll quedaba
 * recortado por su contenedor. Arriba del elemento si cabe, si no debajo, y siempre dentro de la ventana.
 */

export type Placement = 'top' | 'bottom';

const SEPARACION = 6;
const MARGEN = 8;

export function useFloatingPosition(open: boolean, anchor: HTMLElement | null, placement: Placement, content: unknown) {
  const floating = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({ position: 'fixed', top: 0, left: 0, visibility: 'hidden' });

  useLayoutEffect(() => {
    if (!open || !anchor || !floating.current) return;
    const a = anchor.getBoundingClientRect();
    const f = floating.current.getBoundingClientRect();
    const arriba = a.top - f.height - SEPARACION;
    const abajo = a.bottom + SEPARACION;
    const cabeArriba = arriba >= MARGEN;
    const cabeAbajo = abajo + f.height <= window.innerHeight - MARGEN;
    const top = placement === 'top' ? (cabeArriba || !cabeAbajo ? arriba : abajo) : cabeAbajo || !cabeArriba ? abajo : arriba;
    const left = Math.max(MARGEN, Math.min(a.left + a.width / 2 - f.width / 2, window.innerWidth - f.width - MARGEN));
    setStyle({ position: 'fixed', top: Math.max(MARGEN, top), left });
  }, [open, anchor, placement, content]);

  return { floating, style };
}

/** Cierra con Escape y, como la posición es fija, también al hacer scroll o cambiar el tamaño. */
export function useDismiss(open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open, close]);
}

/**
 * Tooltip de un control: con el ratón, tras un momento (recorrer una fila no debe encender tooltips); con
 * el teclado, al instante. Al pulsar se oculta para no tapar lo que la acción cambia.
 *
 * `trigger` va en el elemento que se enfoca; `node`, en cualquier sitio del árbol.
 */
export function useTooltip(content: ReactNode, { placement = 'top', delay = 300 }: { placement?: Placement; delay?: number } = {}) {
  const id = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const hide = useCallback(() => {
    window.clearTimeout(timer.current);
    setOpen(false);
  }, []);
  const show = (el: HTMLElement, wait: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setAnchor(el);
      setOpen(true);
    }, wait);
  };

  useDismiss(open, hide);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const { floating, style } = useFloatingPosition(open, anchor, placement, content);

  const visible = open && content !== null && content !== undefined && content !== '';
  return {
    /** Abre sin esperar, p. ej. al armar una confirmación. */
    show: (el: HTMLElement) => show(el, 0),
    trigger: {
      'aria-describedby': visible ? id : undefined,
      onPointerEnter: (e: PointerEvent<HTMLElement>) => {
        if (e.pointerType === 'mouse') show(e.currentTarget, delay);
      },
      onPointerLeave: hide,
      onPointerDown: hide,
      onFocus: (e: FocusEvent<HTMLElement>) => {
        if ((e.target as HTMLElement).matches(':focus-visible')) show(e.currentTarget, 0);
      },
      onBlur: hide,
    },
    node: visible
      ? createPortal(
          <div
            ref={floating}
            id={id}
            role="tooltip"
            style={style}
            className="pointer-events-none z-[100] max-w-72 animate-[fade-in_120ms_ease-out] rounded-control bg-text px-2 py-1 text-[12px] leading-snug font-medium text-canvas shadow-pop"
          >
            {content}
          </div>,
          document.body,
        )
      : null,
  };
}

/**
 * Tooltip para cualquier contenido (una cifra, un badge, un enlace). En un botón de icono usa `IconButton`,
 * que además lo anuncia como su nombre accesible.
 */
export function Tooltip({ content, children, placement, className = '' }: { content: ReactNode; children: ReactNode; placement?: Placement; className?: string }) {
  const t = useTooltip(content, { placement });
  return (
    <span className={`inline-flex min-w-0 ${className}`} {...t.trigger}>
      {children}
      {t.node}
    </span>
  );
}
