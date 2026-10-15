import { useState, type ReactNode } from 'react';
import { api } from '../services/apiBase';
import { useStore } from '../store/useStore';
import { crestSrc, teamDisplay } from '../domain/models/teamDisplay';

const RELLENO = /^(fc|cf|afc|club|de|del|la|el|sc|ac|cd|ca|sd|ud)$/i;

/**
 * Escudo del equipo. Sin escudo oficial, o si no carga, se muestran sus iniciales: nunca una
 * imagen rota ni el escudo de otro club.
 *
 * Es decorativo (el nombre va siempre al lado), así que no se anuncia a lectores de pantalla.
 */
export function TeamCrest({ url, name, size = 18 }: { url: string | null; name: string; size?: number }) {
  // Se guarda QUÉ url falló, no un booleano: si la fila pasa a otro equipo, su escudo se intenta.
  const [fallida, setFallida] = useState<string | null>(null);

  if (!url || fallida === url) {
    const iniciales =
      name
        .split(/\s+/)
        .filter((w) => w && !RELLENO.test(w))
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase() || name.slice(0, 2).toUpperCase();
    return (
      <span
        aria-hidden="true"
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-surface-3 font-semibold text-muted"
        style={{ width: size, height: size, fontSize: Math.max(8, Math.round(size * 0.42)) }}
      >
        {iniciales}
      </span>
    );
  }

  return (
    <img
      src={api(crestSrc(url))}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setFallida(url)}
      className="shrink-0 object-contain"
      style={{ width: size, height: size }}
    />
  );
}

/**
 * Escudo + nombre del equipo, con el nombre oficial cuando existe.
 *
 * Recibe el `teamId` por competición (`liga|nombre`) que ya llevan todas las filas, y de ahí
 * saca la referencia global. Así cualquier tabla se adapta sin cambiar sus datos.
 */
export function TeamLabel({
  teamId,
  name,
  align = 'left',
  size = 18,
  className = '',
}: {
  teamId: string;
  /** Nombre en los datos: se usa si el club no tiene nombre oficial. */
  name: string;
  /** `right` pone el escudo a la derecha: el local, pegado al marcador. */
  align?: 'left' | 'right';
  size?: number;
  className?: string;
}) {
  // `refByTeamId` y no `teamsById`: así un club que solo está en el histórico también sale con su escudo.
  const ref = useStore((s) => s.derived.refByTeamId.get(teamId) ?? null);
  const d = teamDisplay(ref, name, teamId);

  return (
    <span
      className={`inline-flex min-w-0 items-center gap-1.5 ${align === 'right' ? 'flex-row-reverse text-right' : ''} ${className}`}
      title={
        d.official
          ? `${d.name} · nombre oficial (${d.source})`
          : d.source
            ? `${d.name} · escudo de ${d.source} (secundaria)`
            : d.name
      }
    >
      <TeamCrest url={d.crestUrl} name={d.name} size={size} />
      <span className="min-w-0 truncate">{d.name}</span>
    </span>
  );
}

/**
 * Los dos equipos de un partido en una celda de tabla, con lo que va en medio: el marcador, «vs», lo que
 * sea.
 *
 * En pantalla ancha van en fila con el separador en el centro, como un marcador. Por debajo de `md` se
 * APILAN, y ese es el motivo de que exista: en fila, el visitante quedaba empujado fuera de la vista por
 * la columna de acciones fija a la derecha, y la celda enseñaba «Albion Foo… vs» y nada más. Estaba igual
 * de roto en las tres tablas que lo pintaban, cada una con su `max-w-` a ojo.
 *
 * El local no usa `align="right"`: apilado tiene que leerse como el visitante (escudo a la izquierda), así
 * que se le da la vuelta solo a partir de `md`, donde sí queda pegado al marcador.
 */
export function MatchTeams({
  homeTeamId,
  homeTeamName,
  awayTeamId,
  awayTeamName,
  middle,
  size,
}: {
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  /** Marcador, «vs» o lo que separe a los dos equipos. */
  middle?: ReactNode;
  size?: number;
}) {
  return (
    <span className="flex w-full max-w-44 min-w-0 flex-col gap-0.5 md:max-w-none md:flex-row md:items-center md:gap-2">
      <TeamLabel teamId={homeTeamId} name={homeTeamName} size={size} className="flex-1 md:flex-row-reverse md:text-right" />
      {middle && <span className="flex shrink-0 items-center gap-1.5 self-start md:self-auto">{middle}</span>}
      <TeamLabel teamId={awayTeamId} name={awayTeamName} size={size} className="flex-1" />
    </span>
  );
}
