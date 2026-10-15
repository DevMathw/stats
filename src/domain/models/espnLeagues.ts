/**
 * Competición de la aplicación → identificador de ESPN.
 *
 * Lo comparten el cliente (catálogo global de equipos) y el servidor (búsquedas en ESPN),
 * por eso vive en `src/`. La extensión `.ts` en el import es necesaria para que también
 * compile con la configuración de Node del servidor.
 */
import { normalizeTeamName } from './teamResolver.ts';

/**
 * Por nombre de competición tal como aparece en la hoja LIGAS.
 * Verificado contra `/teams` de ESPN: responden todas menos la Ekstraklasa (404 el 15/09/2026), cuyo `pol.1` solo
 * sirve de clave del registro.
 */
export const ESPN_LEAGUES: Record<string, string> = {
  'Premier League': 'eng.1',
  Championship: 'eng.2',
  'EFL Championship': 'eng.2',
  LaLiga: 'esp.1',
  'Serie A': 'ita.1',
  Bundesliga: 'ger.1',
  'Ligue 1': 'fra.1',
  Eredivisie: 'ned.1',
  'Liga Portugal (Primeira Liga)': 'por.1',
  Superliga: 'den.1',
  'Belgian Pro League': 'bel.1',
  'Super Lig': 'tur.1',
  'Champions League': 'uefa.champions',
  'UEFA Champions League': 'uefa.champions',
  'Europa League': 'uefa.europa',
  'UEFA Europa League': 'uefa.europa',
  'Conference League': 'uefa.europa.conf',
  'UEFA Conference League': 'uefa.europa.conf',
  'Brasileirao Serie A': 'bra.1',
  'Primera Division (Liga Profesional)': 'arg.1',
  'Primera A (Liga BetPlay Dimayor)': 'col.1',
  'Primera Division (Campeonato Nacional)': 'chi.1',
  'Primera Division (Paraguay)': 'par.1',
  'Primera Division (Uruguay)': 'uru.1',
  'Division Profesional': 'bol.1',
  'LigaPro Serie A': 'ecu.1',
  'Liga FUTVE': 'ven.1',
  'Bundesliga Austria': 'aut.1',
  'Super League Grecia': 'gre.1',
  Eliteserien: 'nor.1',
  Ekstraklasa: 'pol.1',
  'Scottish Premiership': 'sco.1',
  'Super League Suiza': 'sui.1',
  Allsvenskan: 'swe.1',
  'Liga MX': 'mex.1',
  MLS: 'usa.1',
};

/** Respaldo cuando el nombre no está en la tabla: una liga por país. */
const ESPN_BY_COUNTRY: Record<string, string> = {
  brasil: 'bra.1',
  argentina: 'arg.1',
  colombia: 'col.1',
  chile: 'chi.1',
  uruguay: 'uru.1',
  paraguay: 'par.1',
  bolivia: 'bol.1',
  ecuador: 'ecu.1',
  venezuela: 'ven.1',
  turquia: 'tur.1',
  dinamarca: 'den.1',
  belgica: 'bel.1',
  portugal: 'por.1',
  'paises bajos': 'ned.1',
  holanda: 'ned.1',
  austria: 'aut.1',
  grecia: 'gre.1',
  noruega: 'nor.1',
  polonia: 'pol.1',
  escocia: 'sco.1',
  suiza: 'sui.1',
  suecia: 'swe.1',
  mexico: 'mex.1',
  'estados unidos': 'usa.1',
};

export function espnLeagueId(league: string, country: string): string | null {
  return ESPN_LEAGUES[league] ?? ESPN_BY_COUNTRY[normalizeTeamName(country)] ?? null;
}
