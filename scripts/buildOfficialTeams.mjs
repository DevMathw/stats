/**
 * Genera `src/data/officialTeams.ts`: nombre y escudo de cada club, enlazados a la clave interna de
 * equipos (id de ESPN).
 *
 *   npm run official-teams
 *
 * Fuentes, en este orden:
 *  1. UEFA (`comp.uefa.com`): las tres competiciones europeas, con id, nombre oficial, país y escudo.
 *  2. La web oficial de cada liga doméstica que publica sus clubes con escudo. Solo añaden los
 *     clubes que UEFA no cubre: los que ya tenían nombre y escudo de UEFA no cambian.
 *  3. Para las ligas cuya web oficial no deja leer los escudos, la secundaria autorizada (FotMob),
 *     marcada como tal: la app muestra ese escudo, pero no su nombre. También rellena los clubes
 *     que una oficial deja sin enlazar cuando se indica expresamente.
 *
 * Cada club se enlaza buscándolo SOLO dentro de la plantilla de su misma competición, con el mismo
 * resolvedor que usa la app. UEFA lista también a los equipos eliminados en las rondas previas; esos
 * no están en la fase liga y se quedan sin enlazar, que es lo correcto.
 *
 * Solo se guardan las URL de los escudos, no las imágenes: los CDN oficiales cortan el acceso tras
 * muchas peticiones seguidas, así que la app las pide a través de una caché.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildTeamId } from '../src/domain/models/ids.ts';
import { resolveInCompetition, rosterFor } from '../src/domain/models/teamIdentity.ts';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';
const TEMPORADA = 2027; // UEFA numera la temporada 2026/27 como 2027
const INICIO = TEMPORADA - 1; // las ligas europeas la numeran por su año de inicio

/** [id de competición en UEFA, nombre de la competición en la app]. */
const COMPETICIONES = [
  [1, 'UEFA Champions League'],
  [14, 'UEFA Europa League'],
  [2019, 'UEFA Conference League'],
];

const oficiales = new Map();
const informe = [];

async function pedir(url, headers = {}) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, ...headers } });
  if (!res.ok) throw new Error(`${url} respondió ${res.status}`);
  return res;
}

/** Datos incrustados de una página Next.js (`__NEXT_DATA__`), o `null`. */
function nextData(html) {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  return m ? JSON.parse(m[1]) : null;
}

/** Entidades HTML de los títulos de WordPress («&#8211;», «&amp;»). */
const decodificar = (s) =>
  s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, '&').trim();

/**
 * Enlaza los clubes de una fuente con la plantilla de su competición.
 *
 * Primero se resuelve todo y después se decide. Dos clubes distintos de la fuente (ids distintos)
 * pueden caer en el mismo club de la plantilla por parecido de nombre: pasó con «Žalgiris»
 * (Vilnius, eliminado en la previa), que casaba por contención con «Kauno Žalgiris». Gana el
 * emparejamiento más fuerte (alias o nombre exacto frente a contención); si empatan, no se
 * enlaza ninguno. Nunca decide el orden en que llegan.
 *
 * @param clubes `{ id, nombres (se prueban en orden), name, shortName, crestUrl, country, url }`
 * @returns `espnId → club` y los clubes que no se pudieron enlazar
 */
function enlazar(liga, fuente, clubes) {
  const plantilla = rosterFor({ name: liga, country: '' });
  const FUERZA = { alias: 2, exact: 2, subset: 1 };
  const porClub = new Map();
  for (const c of clubes) {
    let r;
    for (const nombre of c.nombres) {
      r = resolveInCompetition(nombre, plantilla);
      if (r.status === 'resolved') break;
    }
    if (r?.status !== 'resolved') continue;
    const lista = porClub.get(r.team.espnId) ?? [];
    lista.push({ c, fuerza: FUERZA[r.via] });
    porClub.set(r.team.espnId, lista);
  }

  const enlazados = new Map();
  for (const [espnId, candidatos] of porClub) {
    const max = Math.max(...candidatos.map((x) => x.fuerza));
    const mejores = candidatos.filter((x) => x.fuerza === max);
    if (candidatos.length > 1) {
      informe.push(
        `  ${liga} · club ${espnId}: ${candidatos.map((x) => `«${x.c.name}» (${fuente} ${x.c.id})`).join(' y ')} → ` +
          (mejores.length === 1 ? `se enlaza «${mejores[0].c.name}»` : 'empate: no se enlaza ninguno'),
      );
    }
    if (mejores.length === 1) enlazados.set(espnId, mejores[0].c);
  }
  const usados = new Set(enlazados.values());
  return { enlazados, plantilla, sinEnlazar: clubes.filter((c) => !usados.has(c)).map((c) => c.name) };
}

/** Guarda los enlazados que ninguna fuente anterior cubría. Devuelve cuántos entraron. */
function guardar(enlazados, source, secondary = false) {
  let nuevos = 0;
  for (const [espnId, c] of enlazados) {
    if (oficiales.has(espnId)) continue;
    oficiales.set(espnId, {
      espnId,
      name: c.name,
      shortName: c.shortName,
      crestUrl: c.crestUrl,
      country: c.country,
      source,
      secondary,
      sourceTeamId: c.id,
      sourceUrl: c.url,
    });
    nuevos++;
  }
  return nuevos;
}

// ---------------------------------------------------------------------------
// 1. UEFA
// ---------------------------------------------------------------------------

for (const [competitionId, liga] of COMPETICIONES) {
  const url = `https://comp.uefa.com/v2/teams?competitionId=${competitionId}&seasonYear=${TEMPORADA}&offset=0&limit=200`;
  const equipos = (await (await pedir(url, { Accept: 'application/json' })).json()).filter((t) => !t.isPlaceHolder);
  if (equipos.length === 0) throw new Error(`${liga}: UEFA devolvió la lista vacía`);

  const clubes = equipos.map((t) => {
    const tr = t.translations ?? {};
    const name = tr.displayOfficialName?.ES ?? tr.displayOfficialName?.EN ?? t.internationalName;
    return {
      id: String(t.id),
      // Se prueba con el nombre internacional y, si no, con el oficial largo.
      nombres: [t.internationalName, name],
      name,
      shortName: tr.displayName?.ES ?? tr.displayName?.EN ?? t.internationalName,
      crestUrl: t.mediumLogoUrl ?? t.logoUrl ?? null,
      country: t.countryCode ?? null,
      url,
    };
  });
  const { enlazados, plantilla } = enlazar(liga, 'UEFA', clubes);
  guardar(enlazados, 'UEFA');
  informe.push(`${liga}: ${enlazados.size} de ${plantilla.length} clubes de la fase liga enlazados (${equipos.length} en la lista de UEFA)`);
}

// ---------------------------------------------------------------------------
// 2. Webs oficiales de las ligas domésticas (verificadas el 13/09/2026)
// ---------------------------------------------------------------------------

const PULSELIVE = 'https://footballapi.pulselive.com/football';
const ORIGEN_PL = { Origin: 'https://www.premierleague.com', Referer: 'https://www.premierleague.com/' };

/**
 * Clubes de la página de la Serie A. Es Next.js con carga RSC (`self.__next_f.push`): los clubes de
 * la temporada llevan `imagery.teamLogo` (`clubLogos/{id}.webp`), servido desde
 * `media-sdp.legaseriea.it`, la misma dirección que usa la página en sus `<img>`.
 */
function clubesSerieA(html) {
  let rsc = '';
  for (const m of html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)) rsc += JSON.parse(m[1]);
  const clubes = new Map();
  for (const m of rsc.matchAll(/"teamLogo":"(clubLogos\/([0-9a-f]+)\.webp)"/g)) {
    const antes = rsc.slice(Math.max(0, m.index - 3000), m.index);
    const ultimo = (re) => [...antes.matchAll(re)].pop()?.[1];
    // El escudo tiene que ser del mismo equipo cuyo id lo precede: si no, no se adivina.
    const id = ultimo(/"teamId":"serie-a::Football_Team::([0-9a-f]+)"/g);
    if (id !== m[2] || clubes.has(id)) continue;
    const name = ultimo(/"officialName":"([^"]+)"/g);
    const shortName = ultimo(/"shortName":"([^"]+)"/g) ?? name;
    if (!name) continue;
    clubes.set(id, {
      id,
      nombres: [name, shortName],
      name,
      shortName,
      crestUrl: `https://media-sdp.legaseriea.it/${m[1]}`,
      country: 'ITA',
    });
  }
  return [...clubes.values()];
}

/**
 * Equipos de una web de la plataforma «maker» (Pro League, APF): vienen en los partidos de
 * `__NEXT_DATA__`, con su escudo en `image.url`. Solo los partidos cuyo slug es de la competición:
 * la página enlaza también otras (filiales, Challenger, femenino).
 */
function equiposMaker(data, competicion) {
  const equipos = new Map();
  const recorrer = (o) => {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) return o.forEach(recorrer);
    if (typeof o.slug === 'string' && o.slug.includes(competicion) && o.homeTeam && o.awayTeam) {
      for (const t of [o.homeTeam, o.awayTeam]) if (t.id && t.image?.url) equipos.set(t.id, t);
    }
    Object.values(o).forEach(recorrer);
  };
  recorrer(data);
  return [...equipos.values()];
}

/** Equipos de la plataforma «maker» en el formato común. */
const deMaker = (equipos, country, url) =>
  equipos.map((t) => ({
    id: t.id,
    nombres: [t.name, t.shortName, t.nickname].filter(Boolean),
    name: t.name,
    shortName: t.shortName ?? t.name,
    crestUrl: t.image.url,
    country,
    url,
  }));

/** Equipos de un WordPress con el escudo como imagen destacada (`_embed=wp:featuredmedia`). */
function deWordPress(equipos, tamano, country, url) {
  const clubes = new Map();
  for (const t of equipos) {
    const media = t._embedded?.['wp:featuredmedia']?.[0];
    const crestUrl = media?.media_details?.sizes?.[tamano]?.source_url ?? media?.source_url;
    const nombre = decodificar(t.title?.rendered ?? '');
    // Sin escudo no aporta nada; el mismo club dado de alta dos veces con el mismo escudo, una vez.
    if (!crestUrl || !nombre || clubes.has(`${nombre}|${crestUrl}`)) continue;
    clubes.set(`${nombre}|${crestUrl}`, { id: String(t.id), nombres: [nombre], name: nombre, shortName: nombre, crestUrl, country, url });
  }
  return [...clubes.values()];
}

const DOMESTICAS = [
  {
    liga: 'Premier League',
    fuente: 'premierleague.com',
    async clubes() {
      const temporadas = await (await pedir(`${PULSELIVE}/competitions/1/compseasons?page=0&pageSize=1`, ORIGEN_PL)).json();
      const url = `${PULSELIVE}/teams?pageSize=100&compSeasons=${temporadas.content[0].id}&comps=1&altIds=true&page=0`;
      const equipos = (await (await pedir(url, ORIGEN_PL)).json()).content ?? [];
      return equipos.map((t) => ({
        id: String(t.id),
        nombres: [t.name, t.club?.name, t.shortName].filter(Boolean),
        name: t.name,
        shortName: t.shortName ?? t.name,
        // PNG de 100 px: el SVG da 403 para algunos clubes y en otros pasa de 1 MB.
        crestUrl: t.altIds?.opta ? `https://resources.premierleague.com/premierleague/badges/100/${t.altIds.opta}.png` : null,
        country: 'ENG',
        url,
      }));
    },
  },
  {
    liga: 'LaLiga',
    fuente: 'laliga.com',
    async clubes() {
      const url = 'https://www.laliga.com/laliga-easports/clubes';
      const equipos = nextData(await (await pedir(url)).text())?.props?.pageProps?.teams ?? [];
      return equipos.map((t) => ({
        id: String(t.id),
        nombres: [t.nickname, t.name].filter(Boolean),
        name: t.nickname ?? t.name,
        shortName: t.nickname ?? t.name,
        crestUrl: t.shield?.resizes?.medium ?? t.shield?.url ?? null,
        country: 'ESP',
        url,
      }));
    },
  },
  {
    liga: 'Serie A',
    fuente: 'legaseriea.it',
    async clubes() {
      const url = 'https://www.legaseriea.it/serie-a';
      return clubesSerieA(await (await pedir(url)).text()).map((c) => ({ ...c, url }));
    },
  },
  {
    liga: 'Bundesliga',
    fuente: 'bundesliga.com',
    async clubes() {
      const url = 'https://www.bundesliga.com/de/bundesliga/clubs';
      const html = await (await pedir(url)).text();
      const clubes = new Map();
      for (const m of html.matchAll(/<img[^>]*alt="([^"]+)"[^>]*src="\/assets\/clublogo\/(DFL-CLU-[0-9A-Z]+)\.svg"/g)) {
        if (clubes.has(m[2])) continue;
        clubes.set(m[2], {
          id: m[2],
          nombres: [m[1]],
          name: m[1],
          shortName: m[1],
          crestUrl: `https://www.bundesliga.com/assets/clublogo/${m[2]}.svg`,
          country: 'GER',
          url,
        });
      }
      return [...clubes.values()];
    },
  },
  {
    liga: 'Ligue 1',
    fuente: 'ligue1.com',
    async clubes() {
      // La API de ligue1.com (la misma que usa «Actualizar partidos»): la jornada 1 trae a los 18 clubes.
      const url = `https://ma-api.ligue1.fr/championship-matches/championship/1/game-week/1?season=${INICIO}`;
      const cabeceras = { Accept: 'application/json', Origin: 'https://ligue1.com', Referer: 'https://ligue1.com/' };
      const { matches = [] } = await (await pedir(url, cabeceras)).json();
      const clubes = new Map();
      for (const m of matches) {
        for (const c of [m.home?.clubIdentity, m.away?.clubIdentity]) {
          if (!c?.id || clubes.has(c.id)) continue;
          clubes.set(c.id, {
            id: c.id,
            nombres: [c.name, c.officialName, c.displayName].filter(Boolean),
            name: c.name,
            shortName: c.officialName ?? c.name,
            crestUrl: c.assets?.logo?.small ?? c.assets?.logo?.medium ?? null,
            country: 'FRA',
            url,
          });
        }
      }
      return [...clubes.values()];
    },
  },
  {
    liga: 'Eredivisie',
    fuente: 'eredivisie.nl',
    async clubes() {
      const url = 'https://eredivisie.nl/competitie/clubs/';
      const html = await (await pedir(url)).text();
      const clubes = new Map();
      for (const m of html.matchAll(/alt="Logo ([^"]+)"\s+src="(https:\/\/eredivisie\.b-cdn\.net\/production\/clubs\/[^"?]+)/g)) {
        if (clubes.has(m[2])) continue;
        clubes.set(m[2], {
          id: m[2].split('/').at(-2),
          nombres: [m[1]],
          name: m[1],
          shortName: m[1],
          // Con tamaño, como lo pide la propia web: el PNG original llega a 230 KB.
          crestUrl: `${m[2]}?width=96&height=96&quality=85`,
          country: 'NED',
          url,
        });
      }
      return [...clubes.values()];
    },
  },
  {
    liga: 'Belgian Pro League',
    fuente: 'proleague.be',
    async clubes() {
      const url = 'https://www.proleague.be/jpl';
      return deMaker(equiposMaker(nextData(await (await pedir(url)).text()), 'jupiler-pro-league'), 'BEL', url);
    },
  },
  {
    liga: 'Primera A (Liga BetPlay Dimayor)',
    fuente: 'dimayor.com.co',
    async clubes() {
      // Tipo de contenido de equipos de su WordPress: 300 px, unos 20 KB.
      const url = 'https://dimayor.com.co/wp-json/wp/v2/dimayor_team?per_page=100&_embed=wp:featuredmedia';
      return deWordPress(await (await pedir(url, { Accept: 'application/json' })).json(), 'medium', 'COL', url);
    },
  },
  {
    liga: 'Primera Division (Campeonato Nacional)',
    fuente: 'anfp.cl',
    async clubes() {
      // Listado de clubes (JetEngine): cada ficha lleva el escudo y, después, el nombre en su encabezado.
      const url = 'https://www.anfp.cl/clubes/';
      const html = await (await pedir(url)).text();
      const clubes = [];
      for (const ficha of html.split('jet-listing-grid__item').slice(1)) {
        const crestUrl = ficha.match(/<img[^>]*\ssrc="(https:\/\/www\.anfp\.cl\/wp-content\/uploads\/[^"]+)"/)?.[1];
        const nombre = ficha.match(/elementor-heading-title[^>]*>([^<]+)</)?.[1];
        if (!crestUrl || !nombre) continue;
        const id = ficha.match(/data-post-id="(\d+)"/)?.[1] ?? nombre;
        clubes.push({ id, nombres: [decodificar(nombre)], name: decodificar(nombre), shortName: decodificar(nombre), crestUrl, country: 'CHI', url });
      }
      return clubes;
    },
  },
  {
    liga: 'Primera Division (Paraguay)',
    fuente: 'apf.org.py',
    async clubes() {
      const url = 'https://www.apf.org.py/';
      return deMaker(equiposMaker(nextData(await (await pedir(url)).text()), 'paraguay-primera-division'), 'PAR', url);
    },
  },
  {
    liga: 'Primera Division (Uruguay)',
    fuente: 'auf.org.uy',
    async clubes() {
      const url = 'https://www.auf.org.uy/';
      // La portada lista a todos los afiliados con su escudo; está en ISO-8859-1.
      const html = new TextDecoder('iso-8859-1').decode(await (await pedir(url)).arrayBuffer());
      const clubes = new Map();
      for (const m of html.matchAll(/<img src="(\/imagenes\/img_contenido\/club_club\/[^"]+)" alt="([^"]+)"/g)) {
        const nombre = m[2].replace(/\s+/g, ' ').trim();
        // Fuera las secciones femeninas y de fútbol sala: el mismo club, en otra competición.
        if (/ - |futsal|f[uú]tbol sala/i.test(nombre) || clubes.has(`${nombre}|${m[1]}`)) continue;
        clubes.set(`${nombre}|${m[1]}`, {
          id: m[1].split('/').pop(),
          nombres: [nombre],
          name: nombre,
          shortName: nombre,
          crestUrl: `https://www.auf.org.uy${m[1]}`,
          country: 'URU',
          url,
        });
      }
      return [...clubes.values()];
    },
  },
  {
    liga: 'Liga FUTVE',
    fuente: 'ligafutve.org',
    async clubes() {
      // Equipos de su SportsPress, con miniatura de 150 px.
      const url = 'https://ligafutve.org/wp-json/sportspress/v2/teams?per_page=100&_embed=wp:featuredmedia';
      return deWordPress(await (await pedir(url, { Accept: 'application/json' })).json(), 'thumbnail', 'VEN', url);
    },
  },
  {
    liga: 'Division Profesional',
    fuente: 'fbf.com.bo',
    async clubes() {
      // SportsPress de la FBF: también da de alta divisiones inferiores y selecciones, que se quitan.
      const url = 'https://fbf.com.bo/wp-json/sportspress/v2/teams?per_page=100&_embed=wp:featuredmedia';
      const equipos = await (await pedir(url, { Accept: 'application/json' })).json();
      const primera = equipos.filter((t) => !/sub-\d|femenin|absolut/i.test(t.title?.rendered ?? ''));
      return deWordPress(primera, 'thumbnail', 'BOL', url);
    },
  },
];

// ---------------------------------------------------------------------------
// 3. Secundaria autorizada, solo donde la web oficial no deja leer escudos
// ---------------------------------------------------------------------------

/**
 * Orden autorizado: FBref > Sofascore > FotMob > Flashscore. Medido el 13/09/2026: FBref y Sofascore
 * responden 403; FotMob publica la tabla con el id de cada equipo, y el escudo sale de ese id. Hay
 * ligas con varias tablas (Argentina juega en dos zonas): se juntan todas.
 * ponytail: la oficial no se vuelve a probar en cada ejecución; si alguna abre sus escudos, la liga
 * pasa a DOMESTICAS.
 */
function fotmob(liga, id, country, motivo) {
  return {
    liga,
    fuente: 'FotMob',
    motivo,
    async clubes() {
      const url = `https://www.fotmob.com/api/data/leagues?id=${id}`;
      const tablas = (await (await pedir(url, { Accept: 'application/json' })).json()).table ?? [];
      const filas = tablas.flatMap((t) => (t.data?.table ? [t.data.table.all] : (t.data?.tables ?? []).map((x) => x.table?.all)));
      const clubes = new Map();
      for (const f of filas.flat().filter(Boolean)) {
        if (clubes.has(f.id)) continue;
        clubes.set(f.id, {
          id: String(f.id),
          nombres: [f.name, f.shortName].filter(Boolean),
          name: f.name,
          shortName: f.shortName ?? f.name,
          crestUrl: `https://images.fotmob.com/image_resources/logo/teamlogo/${f.id}.png`,
          country,
          url,
        });
      }
      return [...clubes.values()];
    },
  };
}

const SECUNDARIAS = [
  fotmob('Liga Portugal (Primeira Liga)', 61, 'POR', 'ligaportugal.pt pinta los clubes con JavaScript y su API no tiene la temporada 2026/27'),
  fotmob('Superliga', 46, 'DEN', 'superliga.dk solo publica los escudos en su API, que exige credenciales'),
  fotmob('Super Lig', 71, 'TUR', 'tff.org sirve los escudos desde fys.tff.org, que no acepta conexiones'),
  fotmob('Brasileirao Serie A', 268, 'BRA', 'cbf.com.br sirve los escudos desde conteudo.cbf.com.br, que no acepta conexiones'),
  fotmob('Primera Division (Liga Profesional)', 112, 'ARG', 'afa.com.ar no publica los escudos de los clubes'),
  fotmob('LigaPro Serie A', 246, 'ECU', 'ligapro.ec carga clubes y tabla con un widget de JavaScript y cierra su API de WordPress'),
  fotmob('EFL Championship', 48, 'ENG', 'efl.com carga los clubes con JavaScript y su API exige credenciales'),
  // Relleno: la oficial va antes, así que aquí solo entran los clubes que dejó sin enlazar.
  fotmob('Primera Division (Uruguay)', 161, 'URU', 'relleno de los clubes que auf.org.uy publica con dos escudos distintos'),
  // Ligas añadidas el 15/09/2026. Sus partidos y estadísticas salen solo de FotMob (decisión del usuario), y los escudos, de la misma fuente.
  fotmob('Bundesliga Austria', 38, 'AUT', 'la liga usa solo FotMob desde el 15/09/2026'),
  fotmob('Super League Grecia', 135, 'GRE', 'la liga usa solo FotMob desde el 15/09/2026'),
  fotmob('Eliteserien', 59, 'NOR', 'la liga usa solo FotMob desde el 15/09/2026'),
  fotmob('Ekstraklasa', 196, 'POL', 'la liga usa solo FotMob desde el 15/09/2026'),
  fotmob('Scottish Premiership', 64, 'SCO', 'la liga usa solo FotMob desde el 15/09/2026'),
  fotmob('Super League Suiza', 69, 'SUI', 'la liga usa solo FotMob desde el 15/09/2026'),
  fotmob('Allsvenskan', 67, 'SWE', 'la liga usa solo FotMob desde el 15/09/2026'),
  fotmob('Liga MX', 230, 'MEX', 'la liga usa solo FotMob desde el 15/09/2026'),
  fotmob('MLS', 130, 'USA', 'la liga usa solo FotMob: los términos de mlssoccer.com prohíben robots y scraping'),
];

// Una fuente que falla corta la generación: escribir el archivo sin ella borraría sus escudos.
for (const d of [...DOMESTICAS, ...SECUNDARIAS]) {
  const clubes = await d.clubes();
  if (clubes.length === 0) throw new Error(`${d.liga}: ${d.fuente} no publicó ningún club`);
  if (rosterFor({ name: d.liga, country: '' }).length === 0) {
    // Liga sin plantilla en ESPN (la Ekstraklasa): sin id global, el escudo se enlaza con la clave del equipo en su
    // competición (`liga|nombre`). El nombre es el de la fuente, la misma que da sus partidos.
    let nuevos = 0;
    for (const c of clubes) {
      const teamId = buildTeamId(d.liga, c.name);
      if (oficiales.has(teamId)) continue;
      oficiales.set(teamId, {
        espnId: '',
        teamId,
        names: c.nombres,
        name: c.name,
        shortName: c.shortName,
        crestUrl: c.crestUrl,
        country: c.country,
        source: d.fuente,
        secondary: Boolean(d.motivo),
        sourceTeamId: c.id,
        sourceUrl: c.url,
      });
      nuevos++;
    }
    informe.push(`${d.liga} (${d.fuente}${d.motivo ? `, secundaria: ${d.motivo}` : ''}): sin plantilla en ESPN, ${nuevos} clubes enlazados por su nombre en la competición`);
    continue;
  }
  const { enlazados, plantilla, sinEnlazar } = enlazar(d.liga, d.fuente, clubes);
  const nuevos = guardar(enlazados, d.fuente, Boolean(d.motivo));
  informe.push(
    `${d.liga} (${d.fuente}${d.motivo ? `, secundaria: ${d.motivo}` : ''}): ` +
      `${enlazados.size} de ${clubes.length} clubes enlazados (plantilla de ${plantilla.length}), ${nuevos} nuevos` +
      (sinEnlazar.length && sinEnlazar.length <= 12 ? ` · sin enlazar: ${sinEnlazar.join(', ')}` : ''),
  );
}

// ---------------------------------------------------------------------------
// 4. Clubes que ya NO juegan la competicion: los historicos
// ---------------------------------------------------------------------------

/**
 * [liga en la app, id en FotMob, pais] de las competiciones con temporadas historicas cargadas.
 *
 * Por que hace falta un paso aparte: los pasos 1 a 3 enlazan cada club con la plantilla ACTUAL de ESPN
 * de su competicion, y un club que descendio ya no esta en ella. Medido el 12/10/2026, 117 de los 442
 * equipos de las ligas con historico se quedaban sin escudo por eso, y no por un error de nombre:
 * Almeria, Cadiz, Granada, Bochum o Salernitana no estan en el catalogo en absoluto, porque juegan en
 * segundas divisiones que la app no cubre. Nunca se les podra enlazar desde Configuracion > Equipos.
 *
 * La procedencia es la misma idea que el `HISTORICOS` de `buildTeamCatalog.mjs`: el club no se busca
 * por parecido en todo el proveedor, se pide **la tabla de ESA liga en ESA temporada**, que es la lista
 * de los clubes que de verdad la jugaron. De cada uno sale su id y, del id, su escudo.
 *
 * Estos clubes NO reciben id de ESPN ni nombre oficial: solo escudo, y enlazado por su nombre dentro de
 * su competicion, igual que las ligas que ESPN no cubre. Van al final a proposito: `oficiales.has` deja
 * intacto todo lo que ya pusieron las fuentes de los pasos 1 a 3.
 */
const HISTORICOS = [
  ['Premier League', 47, 'ENG'],
  ['LaLiga', 87, 'ESP'],
  ['Serie A', 55, 'ITA'],
  ['Bundesliga', 54, 'GER'],
  ['Ligue 1', 53, 'FRA'],
  ['Eredivisie', 57, 'NED'],
  ['Liga Portugal (Primeira Liga)', 61, 'POR'],
  ['Superliga', 46, 'DEN'],
  ['Belgian Pro League', 40, 'BEL'],
  ['Super Lig', 71, 'TUR'],
  ['Primera A (Liga BetPlay Dimayor)', 274, 'COL'],
  ['EFL Championship', 48, 'ENG'],
  ['Bundesliga Austria', 38, 'AUT'],
  ['Super League Grecia', 135, 'GRE'],
  ['Eliteserien', 59, 'NOR'],
  ['Ekstraklasa', 196, 'POL'],
  ['Scottish Premiership', 64, 'SCO'],
  ['Super League Suiza', 69, 'SUI'],
  ['Allsvenskan', 67, 'SWE'],
];

/** Cuantas temporadas se piden, contando la actual. Los libros de `data_statistics/` traen tres mas la actual. */
const TEMPORADAS = 4;

/** Clubes de la tabla de una liga de FotMob, en la temporada indicada o en la actual. */
async function tablaFotMob(id, season) {
  const url = `https://www.fotmob.com/api/data/leagues?id=${id}${season ? `&season=${encodeURIComponent(season)}` : ''}`;
  const j = await (await pedir(url, { Accept: 'application/json' })).json();
  const tablas = j.table ?? [];
  const filas = tablas.flatMap((t) => (t.data?.table ? [t.data.table.all] : (t.data?.tables ?? []).map((x) => x.table?.all)));
  return { clubes: filas.flat().filter(Boolean), temporadas: j.allAvailableSeasons ?? [] };
}

for (const [liga, id, pais] of HISTORICOS) {
  const actual = await tablaFotMob(id, null);
  // Las temporadas las dice la propia fuente: asi no hay que acertar con el formato de la etiqueta.
  const pedidas = actual.temporadas.slice(0, TEMPORADAS);
  const clubes = new Map();
  for (const f of actual.clubes) clubes.set(f.id, f);
  let fallos = 0;
  for (const t of pedidas.slice(1)) {
    try {
      for (const f of (await tablaFotMob(id, t)).clubes) if (!clubes.has(f.id)) clubes.set(f.id, f);
    } catch {
      fallos++;
    }
  }
  // Que falle una temporada se tolera; que fallen todas es un bloqueo, y seguir borraria escudos sin avisar.
  if (clubes.size === 0) throw new Error(`${liga}: FotMob no devolvio ningun club (id ${id})`);

  let nuevos = 0;
  for (const f of clubes.values()) {
    const teamId = buildTeamId(liga, f.name);
    if (oficiales.has(teamId)) continue;
    oficiales.set(teamId, {
      espnId: '',
      teamId,
      names: [f.name, f.shortName].filter(Boolean),
      name: f.name,
      shortName: f.shortName ?? f.name,
      crestUrl: `https://images.fotmob.com/image_resources/logo/teamlogo/${f.id}.png`,
      country: pais,
      source: 'FotMob',
      secondary: true,
      sourceTeamId: String(f.id),
      sourceUrl: `https://www.fotmob.com/api/data/leagues?id=${id}`,
    });
    nuevos++;
  }
  informe.push(
    `${liga} (FotMob, historicos): ${nuevos} clubes nuevos de ${pedidas.length} temporadas (${pedidas.join(', ')})` +
      (fallos ? ` - ${fallos} temporadas no respondieron` : ''),
  );
}

const lista = [...oficiales.values()].sort((a, b) => Number(a.espnId) - Number(b.espnId) || (a.teamId ?? '').localeCompare(b.teamId ?? ''));
const fecha = new Date().toISOString().slice(0, 10);

const salida = `// GENERADO por scripts/buildOfficialTeams.mjs el ${fecha}. No editar a mano: \`npm run official-teams\`.

/** Nombre y escudo de un club, enlazados a la clave interna (id de ESPN). */
export interface OfficialTeam {
  /** Vacío si la liga no está en ESPN: entonces enlaza \`teamId\`. */
  espnId: string;
  /** Clave del equipo en su competición (\`liga|nombre\`), solo para las ligas que ESPN no tiene. */
  teamId?: string;
  /** Variantes del nombre en la fuente. Solo en las entradas con \`teamId\`: con ellas se busca por nombre. */
  names?: string[];
  /** Nombre oficial completo, tal como lo publica la fuente. */
  name: string;
  /** Nombre corto que publica la misma fuente. */
  shortName: string;
  /** URL del escudo en el CDN de la fuente. Se pide a través de caché, nunca en vivo. */
  crestUrl: string | null;
  /** País en código de tres letras (ESP, ENG…), como lo usa UEFA. */
  country: string | null;
  /** UEFA, la web oficial de la liga o, si esa no deja leer escudos, la secundaria autorizada. */
  source: string;
  /** \`true\` si viene de la secundaria: la app muestra su escudo, pero no su nombre. */
  secondary: boolean;
  /** Id del club en la fuente. */
  sourceTeamId: string;
  /** Dónde se consultó. */
  sourceUrl: string;
}

export const OFFICIAL_TEAMS_GENERATED_AT = '${fecha}';

export const OFFICIAL_TEAMS: OfficialTeam[] = ${JSON.stringify(lista, null, 2)};
`;

mkdirSync('src/data', { recursive: true });
writeFileSync('src/data/officialTeams.ts', salida);
console.log(informe.join('\n'));
const secundarios = lista.filter((t) => t.secondary).length;
console.log(`${lista.length} clubes con escudo · ${secundarios} de fuente secundaria`);
