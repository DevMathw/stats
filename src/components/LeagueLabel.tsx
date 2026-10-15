import { Link } from 'react-router-dom';
import { Flag } from './Flag';
import { countryName } from '../domain/models/countries';
import { useStore } from '../store/useStore';

/** Bandera de un país. Se dibuja en SVG: los emoji de bandera no existen en Windows. */
export function CountryFlag({ country, className = '' }: { country: string; className?: string }) {
  return <Flag country={country} className={className} />;
}

/**
 * Nombre de competición con su bandera. Es el ÚNICO sitio donde se decide cómo se pinta una
 * liga, así que se ve igual en el dashboard, en las tablas y en los desplegables.
 *
 * El país sale de la hoja LIGAS; si la liga no está dada de alta, se muestra su id sin
 * bandera en vez de inventar una.
 */
export function LeagueLabel({
  leagueId,
  link = false,
  size = 'md',
  showCountry = false,
  className = '',
}: {
  leagueId: string;
  /** Enlaza a la ficha de la competición. */
  link?: boolean;
  size?: 'sm' | 'md';
  /** Añade el nombre del país debajo, para vistas con espacio. */
  showCountry?: boolean;
  className?: string;
}) {
  const league = useStore((s) => s.leagues.find((l) => l.id === leagueId));
  const country = league?.country ?? '';
  const name = league?.name ?? leagueId;

  const body = (
    <span className="flex min-w-0 items-center gap-1.5">
      {country && <CountryFlag country={country} className={size === 'sm' ? 'text-xs' : ''} />}
      <span className="truncate">{name}</span>
    </span>
  );

  const cls = `${size === 'sm' ? 'text-[12px]' : 'text-[13px]'} ${className}`;

  if (showCountry) {
    return (
      <span className={`flex min-w-0 flex-col ${cls}`}>
        {link ? (
          <Link className="hover:text-accent-text" to={`/ligas/${encodeURIComponent(leagueId)}`}>
            {body}
          </Link>
        ) : (
          body
        )}
        <span className="truncate pl-[1.375rem] text-[11px] text-faint">
          {countryName(country)}
        </span>
      </span>
    );
  }

  return link ? (
    <Link
      className={`min-w-0 hover:text-accent-text ${cls}`}
      to={`/ligas/${encodeURIComponent(leagueId)}`}
    >
      {body}
    </Link>
  ) : (
    <span className={`min-w-0 ${cls}`}>{body}</span>
  );
}
