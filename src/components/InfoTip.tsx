import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import { useDismiss, useFloatingPosition } from './Tooltip';

/**
 * Explicación de un dato. Se abre con el ratón, con el teclado (foco) y con un toque en móvil, donde
 * `title` no existe; un clic la deja abierta hasta pulsar fuera. El texto dice QUÉ significa el número,
 * no lo repite. Va en un portal: dentro de una tabla con scroll ya no queda recortada.
 */
export function InfoTip({
  children,
  label = 'Qué significa',
}: {
  children: ReactNode;
  label?: string;
  /** Sin efecto: la posición se calcula para que siempre quepa en pantalla. */
  align?: 'center' | 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const [fija, setFija] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const id = useId();
  const close = useCallback(() => {
    setOpen(false);
    setFija(false);
  }, []);
  const abrir = (el: HTMLElement) => {
    setAnchor(el);
    setOpen(true);
  };
  useDismiss(open, close);
  const { floating, style } = useFloatingPosition(open, anchor, 'top', children);

  useEffect(() => {
    if (!fija) return;
    const fuera = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!boton.current?.contains(t) && !floating.current?.contains(t)) close();
    };
    document.addEventListener('pointerdown', fuera);
    return () => document.removeEventListener('pointerdown', fuera);
  }, [fija, close, floating]);

  return (
    <>
      <button
        ref={boton}
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onPointerEnter={(e) => e.pointerType === 'mouse' && abrir(e.currentTarget)}
        onPointerLeave={() => !fija && setOpen(false)}
        onFocus={(e) => e.currentTarget.matches(':focus-visible') && abrir(e.currentTarget)}
        onBlur={() => !fija && setOpen(false)}
        onClick={(e) => {
          e.stopPropagation();
          if (fija) close();
          else {
            abrir(e.currentTarget);
            setFija(true);
          }
        }}
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full align-middle text-faint transition-colors hover:text-accent-text"
      >
        <Info size={12} />
      </button>
      {open &&
        createPortal(
          <div
            ref={floating}
            id={id}
            role="tooltip"
            style={style}
            className="z-[100] w-72 max-w-[calc(100vw-1rem)] animate-[fade-in_120ms_ease-out] rounded-control border border-border bg-surface px-3 py-2 text-left text-[12px] leading-snug font-normal tracking-normal whitespace-normal text-text normal-case shadow-pop"
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  );
}
