import { isRouteErrorResponse, useLocation, useRouteError } from 'react-router-dom';
import { Compass, RefreshCw } from 'lucide-react';
import { Button, ButtonLink, Empty, ErrorState } from '../components/ui';

/**
 * Qué se ve cuando una pantalla se rompe.
 *
 * Sin esto, un error de render dejaba la ventana **en blanco**: ni menú, ni explicación, ni forma de salir
 * que no fuera escribir la dirección a mano. Es el hueco más grande que había entre esta aplicación y algo
 * que se pueda dejar funcionando sin vigilar.
 *
 * Va montado dos veces en `main.tsx`: en una ruta sin camino que envuelve a todas las pantallas —así el
 * error sale DENTRO del layout y el menú sigue ahí para irse a otro sitio— y en la raíz, que es la única
 * que puede recoger un fallo del propio layout.
 *
 * El motivo real se enseña, no se esconde. Es una herramienta de análisis de una sola persona: un
 * «Algo ha salido mal» genérico solo obliga a abrir la consola para averiguar lo mismo.
 */
export function ErrorScreen() {
  const error = useRouteError();

  const motivo = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : String(error);

  return (
    <ErrorState
      title="Esta pantalla se ha roto"
      detail={
        <>
          <span className="block">{motivo}</span>
          <span className="mt-2 block text-faint">
            Los datos guardados no se han tocado: están en la base local y siguen ahí al recargar.
          </span>
          <span className="mt-3 flex flex-wrap justify-center gap-2">
            <Button onClick={() => window.location.reload()}>
              <RefreshCw size={14} aria-hidden /> Recargar
            </Button>
            <ButtonLink to="/">Ir al dashboard</ButtonLink>
          </span>
        </>
      }
    />
  );
}

/** Dirección que no existe. Antes pintaba el layout con el contenido vacío, sin decir por qué. */
export function NotFound() {
  const { pathname } = useLocation();
  return (
    <Empty icon={<Compass />} title="Esta página no existe" action={<ButtonLink to="/">Ir al dashboard</ButtonLink>}>
      La dirección <code className="rounded bg-surface-2 px-1 py-0.5 text-[12px]">{pathname}</code> no corresponde a
      ninguna pantalla. Puede que el enlace esté mal escrito o que sea de una versión anterior.
    </Empty>
  );
}
