/**
 * Las 32 competiciones y la fuente de cada una.
 *
 * Cada liga consulta PRIMERO su web oficial, con un extractor propio: no hay un scraper común,
 * porque la API de UEFA, la página de LaLiga y el HTML de la TFF no se parecen en nada.
 *
 * Donde la web oficial no deja leer nada útil, la competición usa solo FotMob (ver `sourcesFor`); el
 * motivo medido de cada web oficial se conserva en `official`.
 *
 * Qué web oficial es legible se midió el 12/09/2026. Si alguna cambia, se ajusta aquí.
 */
import type { MatchSource } from './types.ts';
import { uefaSeasonYear, uefaSource } from './sources/uefa.ts';
import { premierLeagueSource } from './sources/premierLeague.ts';
import { ligue1Source } from './sources/ligue1.ts';
import { laLigaSource } from './sources/laliga.ts';
import { bundesligaSource } from './sources/bundesliga.ts';
import { tffSource } from './sources/tff.ts';
import { fotmobSource } from './sources/fotmob.ts';
import { unavailableSource } from './sources/unavailable.ts';
import { SOURCE_POLICY } from '../../src/domain/models/sourcePolicy.ts';
import { LEAGUE_TIME_ZONES } from '../../src/domain/models/leagueTimeZones.ts';

interface WithoutExtractor {
  site: string;
  /** Sección oficial que se consulta. */
  url: string;
  /** Por qué no se pueden extraer los partidos (medido). */
  reason: string;
}

export interface LeagueEntry {
  /** Id de ESPN de la competición: la misma clave que usa la identidad de equipos. */
  slug: string;
  /** Nombre con el que se da de alta si la app aún no tiene esta competición. */
  name: string;
  /** País y confederación, con la grafía de la hoja LIGAS. */
  country: string;
  confederation: string;
  /** Archivo en `data/ligas/`. */
  file: string;
  officialUrl: string;
  fotmobId: number;
  official: ((now: Date) => MatchSource) | WithoutExtractor;
}

/** Año en que empieza la temporada europea en curso: desde julio, la nueva. */
export const europeanSeasonStart = (now: Date) =>
  now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;

const sin = (site: string, url: string, reason: string): WithoutExtractor => ({ site, url, reason });

export const LEAGUES: LeagueEntry[] = [
  { slug: 'eng.1', name: 'Premier League', country: 'Inglaterra', confederation: 'UEFA', file: 'Premier_League.xlsx', officialUrl: 'https://www.premierleague.com/', fotmobId: 47, official: () => premierLeagueSource() },
  { slug: 'esp.1', name: 'LaLiga', country: 'Espana', confederation: 'UEFA', file: 'LaLiga.xlsx', officialUrl: 'https://www.laliga.com/', fotmobId: 87, official: (now) => laLigaSource(europeanSeasonStart(now)) },
  { slug: 'ita.1', name: 'Serie A', country: 'Italia', confederation: 'UEFA', file: 'Serie_A.xlsx', officialUrl: 'https://www.legaseriea.it/', fotmobId: 55, official: sin('legaseriea.it', 'https://www.legaseriea.it/it/serie-a/calendario-e-risultati', 'carga el calendario con JavaScript y su API interna no expone una ruta de partidos localizable') },
  { slug: 'ger.1', name: 'Bundesliga', country: 'Alemania', confederation: 'UEFA', file: 'Bundesliga.xlsx', officialUrl: 'https://www.bundesliga.com/', fotmobId: 54, official: (now) => bundesligaSource(europeanSeasonStart(now)) },
  { slug: 'fra.1', name: 'Ligue 1', country: 'Francia', confederation: 'UEFA', file: 'Ligue_1.xlsx', officialUrl: 'https://ligue1.com/', fotmobId: 53, official: (now) => ligue1Source(europeanSeasonStart(now)) },
  { slug: 'ned.1', name: 'Eredivisie', country: 'Paises Bajos', confederation: 'UEFA', file: 'Eredivisie.xlsx', officialUrl: 'https://eredivisie.nl/', fotmobId: 57, official: sin('eredivisie.nl', 'https://eredivisie.nl/competitie/wedstrijden/', 'la página de partidos no incluye los resultados en el HTML') },
  { slug: 'por.1', name: 'Liga Portugal', country: 'Portugal', confederation: 'UEFA', file: 'Liga_Portugal.xlsx', officialUrl: 'https://www.ligaportugal.pt/', fotmobId: 61, official: sin('ligaportugal.pt', 'https://www.ligaportugal.pt/api/v3/seasons', 'su API abierta publica las temporadas, pero no una ruta de partidos localizable') },
  { slug: 'den.1', name: 'Superliga Dinamarca', country: 'Dinamarca', confederation: 'UEFA', file: 'Superliga_Dinamarca.xlsx', officialUrl: 'https://superliga.dk/', fotmobId: 46, official: sin('superliga.dk', 'https://superliga.dk/kampprogram', 'carga el calendario con JavaScript y su API exige credenciales') },
  { slug: 'bel.1', name: 'Belgian Pro League', country: 'Belgica', confederation: 'UEFA', file: 'Belgian_Pro_League.xlsx', officialUrl: 'https://www.proleague.be/', fotmobId: 40, official: sin('proleague.be', 'https://www.proleague.be/', 'carga el calendario con JavaScript') },
  { slug: 'tur.1', name: 'Süper Lig', country: 'Turquia', confederation: 'UEFA', file: 'Super_Lig.xlsx', officialUrl: 'https://www.tff.org/', fotmobId: 71, official: () => tffSource() },
  { slug: 'aut.1', name: 'Bundesliga Austria', country: 'Austria', confederation: 'UEFA', file: 'Bundesliga_Austria.xlsx', officialUrl: 'https://www.bundesliga.at/', fotmobId: 38, official: sin('bundesliga.at', 'https://www.bundesliga.at/de/spielplan', 'cada ficha trae 7 de los 10 datos, pero calendario y fichas van dentro del código de su app y el calendario solo enlaza la jornada en curso: falta un extractor') },
  { slug: 'gre.1', name: 'Super League Grecia', country: 'Grecia', confederation: 'UEFA', file: 'Super_League_Grecia.xlsx', officialUrl: 'https://www.slgr.gr/', fotmobId: 135, official: sin('slgr.gr', 'https://www.slgr.gr/en/schedule/', 'las estadísticas de cada partido se cargan con JavaScript') },
  { slug: 'nor.1', name: 'Eliteserien', country: 'Noruega', confederation: 'UEFA', file: 'Eliteserien.xlsx', officialUrl: 'https://www.eliteserien.no/', fotmobId: 59, official: sin('eliteserien.no', 'https://www.eliteserien.no/', 'publica los resultados sin fichas de partido ni estadísticas en el HTML') },
  { slug: 'pol.1', name: 'Ekstraklasa', country: 'Polonia', confederation: 'UEFA', file: 'Ekstraklasa.xlsx', officialUrl: 'https://www.ekstraklasa.org/', fotmobId: 196, official: sin('ekstraklasa.org', 'https://www.ekstraklasa.org/', 'la pestaña de estadísticas de cada ficha trae 8 de los 10 datos en el HTML, pero falta un extractor de su calendario y sus fichas') },
  { slug: 'sco.1', name: 'Scottish Premiership', country: 'Escocia', confederation: 'UEFA', file: 'Scottish_Premiership.xlsx', officialUrl: 'https://spfl.co.uk/', fotmobId: 64, official: sin('spfl.co.uk', 'https://spfl.co.uk/league/premiership/results', 'sus resultados no enlazan fichas de partido y rechaza la lectura automática (403)') },
  { slug: 'sui.1', name: 'Super League Suiza', country: 'Suiza', confederation: 'UEFA', file: 'Super_League_Suiza.xlsx', officialUrl: 'https://www.sfl.ch/', fotmobId: 69, official: sin('sfl.ch', 'https://www.sfl.ch/', 'no publica estadísticas en el HTML: los partidos se cargan con JavaScript en play.sfl.ch') },
  { slug: 'swe.1', name: 'Allsvenskan', country: 'Suecia', confederation: 'UEFA', file: 'Allsvenskan.xlsx', officialUrl: 'https://allsvenskan.se/', fotmobId: 67, official: sin('allsvenskan.se', 'https://allsvenskan.se/', 'la portada no trae resultados, fichas de partido ni estadísticas en el HTML') },
  { slug: 'bra.1', name: 'Brasileirão Série A', country: 'Brasil', confederation: 'CONMEBOL', file: 'Brasileirao_Serie_A.xlsx', officialUrl: 'https://www.cbf.com.br/', fotmobId: 268, official: sin('cbf.com.br', 'https://www.cbf.com.br/futebol-brasileiro/tabelas/campeonato-brasileiro/serie-a/2026', 'carga la tabla con JavaScript') },
  { slug: 'arg.1', name: 'Primera División Argentina', country: 'Argentina', confederation: 'CONMEBOL', file: 'Primera_Division_Argentina.xlsx', officialUrl: 'https://www.afa.com.ar/', fotmobId: 112, official: sin('afa.com.ar', 'https://www.afa.com.ar/', 'no publica los marcadores en el HTML') },
  { slug: 'col.1', name: 'Liga BetPlay Dimayor', country: 'Colombia', confederation: 'CONMEBOL', file: 'Liga_BetPlay_Dimayor.xlsx', officialUrl: 'https://dimayor.com.co/', fotmobId: 274, official: sin('dimayor.com.co', 'https://dimayor.com.co/liga-betplay-dimayor/', 'publica los resultados sin número de jornada por partido, y su servicio de datos de partido devuelve 403') },
  { slug: 'chi.1', name: 'Primera División Chile', country: 'Chile', confederation: 'CONMEBOL', file: 'Primera_Division_Chile.xlsx', officialUrl: 'https://www.anfp.cl/', fotmobId: 273, official: sin('anfp.cl', 'https://www.anfp.cl/', 'no publica los marcadores en el HTML') },
  { slug: 'par.1', name: 'Primera División Paraguay', country: 'Paraguay', confederation: 'CONMEBOL', file: 'Primera_Division_Paraguay.xlsx', officialUrl: 'https://www.apf.org.py/', fotmobId: 199, official: sin('apf.org.py', 'https://www.apf.org.py/', 'su sección de partidos no tiene una ruta estable') },
  { slug: 'uru.1', name: 'Primera División Uruguay', country: 'Uruguay', confederation: 'CONMEBOL', file: 'Primera_Division_Uruguay.xlsx', officialUrl: 'https://www.auf.org.uy/', fotmobId: 161, official: sin('auf.org.uy', 'https://www.auf.org.uy/historico-partidos/1/', 'publica los resultados sin número de jornada') },
  { slug: 'ven.1', name: 'Liga FUTVE', country: 'Venezuela', confederation: 'CONMEBOL', file: 'Liga_FUTVE.xlsx', officialUrl: 'https://ligafutve.org/', fotmobId: 339, official: sin('ligafutve.org', 'https://ligafutve.org/calendario/', 'el calendario publica las jornadas pero no los marcadores') },
  { slug: 'bol.1', name: 'División Profesional Bolivia', country: 'Bolivia', confederation: 'CONMEBOL', file: 'Division_Profesional_Bolivia.xlsx', officialUrl: 'https://www.fbf.com.bo/', fotmobId: 144, official: sin('fbf.com.bo', 'https://www.fbf.com.bo/', 'no publica los partidos de la liga en un formato legible') },
  { slug: 'ecu.1', name: 'LigaPro Serie A Ecuador', country: 'Ecuador', confederation: 'CONMEBOL', file: 'LigaPro_Serie_A.xlsx', officialUrl: 'https://ligapro.ec/', fotmobId: 246, official: sin('ligapro.ec', 'https://ligapro.ec/calendario/', 'carga el calendario con JavaScript (widget de Opta)') },
  { slug: 'mex.1', name: 'Liga MX', country: 'Mexico', confederation: 'CONCACAF', file: 'Liga_MX.xlsx', officialUrl: 'https://ligamx.net/', fotmobId: 230, official: sin('ligamx.net', 'https://ligamx.net/', 'sus fichas «minuto a minuto» no llevan estadísticas en el HTML') },
  // ponytail: hora del Este para toda la liga; un partido que empiece después de las 21:00 del Pacífico quedaría con la
  // fecha del día siguiente. Usar la zona de cada estadio si pasa.
  { slug: 'usa.1', name: 'MLS', country: 'Estados Unidos', confederation: 'CONCACAF', file: 'MLS.xlsx', officialUrl: 'https://www.mlssoccer.com/', fotmobId: 130, official: sin('mlssoccer.com', 'https://www.mlssoccer.com/about/terms-of-service', 'sus términos prohíben navegarla con robots y hacer scraping de sus datos') },
  { slug: 'eng.2', name: 'EFL Championship', country: 'Inglaterra', confederation: 'UEFA', file: 'EFL_Championship.xlsx', officialUrl: 'https://www.efl.com/', fotmobId: 48, official: sin('efl.com', 'https://www.efl.com/fixtures-results/', 'carga los partidos con JavaScript y su API exige credenciales') },
  { slug: 'uefa.champions', name: 'UEFA Champions League', country: 'Europa', confederation: 'UEFA', file: 'UEFA_Champions_League.xlsx', officialUrl: 'https://www.uefa.com/uefachampionsleague/', fotmobId: 42, official: (now) => uefaSource(1, 'uefa.com', uefaSeasonYear(now)) },
  { slug: 'uefa.europa', name: 'UEFA Europa League', country: 'Europa', confederation: 'UEFA', file: 'UEFA_Europa_League.xlsx', officialUrl: 'https://www.uefa.com/uefaeuropaleague/', fotmobId: 73, official: (now) => uefaSource(14, 'uefa.com', uefaSeasonYear(now)) },
  { slug: 'uefa.europa.conf', name: 'UEFA Conference League', country: 'Europa', confederation: 'UEFA', file: 'UEFA_Conference_League.xlsx', officialUrl: 'https://www.uefa.com/uefaconferenceleague/', fotmobId: 10216, official: (now) => uefaSource(2019, 'uefa.com', uefaSeasonYear(now)) },
];

export const leagueBySlug = (slug: string) => LEAGUES.find((l) => l.slug === slug);

/**
 * Lo que necesita el cliente: qué 23 competiciones hay, cómo dar de alta las que le falten y qué
 * fuentes consulta cada una, en su orden. Sale de `sourcesFor`, así la interfaz no copia el registro.
 */
export function leagueList(now = new Date()) {
  const inicio = europeanSeasonStart(now);
  const season = `${inicio}/${String(inicio + 1).slice(2)}`;
  return LEAGUES.map((entry) => ({
    slug: entry.slug,
    name: entry.name,
    country: entry.country,
    confederation: entry.confederation,
    file: entry.file,
    officialUrl: entry.officialUrl,
    season,
    sources: sourcesFor(entry, now).map((s) => ({
      name: s.name,
      secondary: s.secondary,
      url: s.secondary ? (s.site ?? null) : entry.officialUrl,
      matches: !s.unavailable,
      stats: !s.unavailable && typeof s.matchStats === 'function',
      reason: s.unavailable ?? null,
    })),
  }));
}

/**
 * Fuentes de una liga: su web oficial y FotMob en las `oficial+fotmob` de `SOURCE_POLICY`, y solo FotMob
 * en las demás (decidido con el usuario el 14/09/2026). FotMob completa SOLO lo que la oficial no publica.
 * FBref y Sofascore (403) y Flashscore (sus términos prohíben extraer sus datos) ya no se consultan.
 */
export function sourcesFor(entry: LeagueEntry, now = new Date()): MatchSource[] {
  const zona = LEAGUE_TIME_ZONES[entry.slug];
  if (!zona) throw new Error(`${entry.slug} no tiene zona horaria en LEAGUE_TIME_ZONES`);
  const fotmob = fotmobSource(entry.fotmobId, zona);
  if (SOURCE_POLICY.get(entry.slug) !== 'oficial+fotmob') return [fotmob];
  const oficial =
    typeof entry.official === 'function'
      ? entry.official(now)
      : unavailableSource(entry.official.site, entry.official.url, entry.official.reason, false);
  return [oficial, fotmob];
}
