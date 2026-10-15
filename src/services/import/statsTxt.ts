/**
 * Carga de UN dato que falta desde un .txt, para los partidos que se están viendo en Partidos.
 *
 * El caso que lo trajo: la Bundesliga de Austria tenía 385 partidos sin xG. Ninguna de las fuentes
 * autorizadas lo publica para esa competición, así que el dato solo puede entrar a mano, y a mano son
 * 385 formularios. Un .txt con una línea por partido lo hace de una vez.
 *
 * El formato es el que ya exporta esta misma pantalla, con el dato añadido al final:
 *
 *     Fecha: 2025-05-24 | SK Sturm Graz 1-1 Wolfsberger AC | xG: 1.42 - 1.35
 *
 * Lo que NO hace, que es lo que lo mantiene fiable:
 *
 *  - **No busca el partido por parecido de nombre y ya.** Usa `sameClub`, el mismo resolutor de alias que
 *    la fusión de Excel, así que «FC Salzburg» encuentra a «Salzburg»; y además **comprueba el marcador**
 *    de la línea contra el que ya consta. Una línea cuyo marcador no cuadra no se escribe: es la señal de
 *    que no es ese partido, y escribirla habría metido el xG de otro encuentro.
 *  - **No rellena lo que ya tiene dato.** Solo el lado que estaba vacío.
 *  - **No se fía de la etiqueta.** Si el .txt dice «xG» y el filtro activo es «córners», se niega entero
 *    en vez de meter goles esperados en la columna de córners.
 *  - **No completa lo que la línea no trae.** Una línea ilegible se cuenta y se dice; no se adivina.
 */
import type { CatalogTeam } from '../../domain/models/teamCatalog';
import { rosterFor, sameClub } from '../../domain/models/teamIdentity';
import { fillMissing, isMissing, type MatchDatum } from '../../domain/models/matchDataRules';
import type { League, Match } from '../../types';

/** Dos días, igual que `findTwin`: la fecha UTC de una fuente frente a la local de otra. */
const MARGEN_DIAS = 2;

/**
 * `Fecha: 2025-05-24 | SK Sturm Graz 1-1 Wolfsberger AC | xG: 1.42 - 1.35`
 *
 * Los nombres de equipo son perezosos para que el primer `n-n` suelto sea el marcador; un club con un
 * número en el nombre («Bayer 04 Leverkusen») no estorba porque el número no va seguido de guion.
 */
const LINEA = /^Fecha:\s*(\d{4}-\d{2}-\d{2})\s*\|\s*(.+?)\s+(\d+)\s*-\s*(\d+)\s+(.+?)\s*\|\s*([^:|]+):\s*(-?[\d.]+)\s*-\s*(-?[\d.]+)\s*$/;

export interface StatsTxtLine {
  date: string;
  home: string;
  away: string;
  homeGoals: number;
  awayGoals: number;
  /** Lo que el archivo dice que es el dato: `xG`, `Córners`… */
  label: string;
  values: [number, number];
}

export interface ParsedStatsTxt {
  rows: StatsTxtLine[];
  /** Líneas con texto que no son una línea de partido: cabeceras, separadores, cualquier cosa. */
  ignored: number;
  /** La etiqueta del archivo, si todas las líneas dicen lo mismo. */
  label: string | null;
}

export function parseStatsTxt(text: string): ParsedStatsTxt {
  const rows: StatsTxtLine[] = [];
  let ignored = 0;
  for (const bruto of text.split(/\r?\n/)) {
    const linea = bruto.trim();
    if (!linea) continue;
    const m = LINEA.exec(linea);
    if (!m) {
      ignored++;
      continue;
    }
    const [, date, home, gl, gv, away, label, a, b] = m;
    const values: [number, number] = [Number(a), Number(b)];
    if (!Number.isFinite(values[0]) || !Number.isFinite(values[1])) {
      ignored++;
      continue;
    }
    rows.push({ date, home: home.trim(), away: away.trim(), homeGoals: Number(gl), awayGoals: Number(gv), label: label.trim(), values });
  }
  const etiquetas = new Set(rows.map((r) => r.label.toLowerCase()));
  return { rows, ignored, label: etiquetas.size === 1 ? rows[0].label : null };
}

const sinAcentos = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/** ¿Habla el archivo del dato que se está cargando? Vale que uno contenga al otro: «rojas» / «Tarjetas rojas». */
export function labelMatches(label: string | null, d: MatchDatum): boolean {
  if (!label) return true;
  const a = sinAcentos(label);
  const nombres = [sinAcentos(d.name), sinAcentos(d.label)];
  return nombres.some((n) => n.includes(a) || a.includes(n));
}

export interface StatsTxtResult {
  matches: Match[];
  /** Partidos escritos. */
  written: number;
  /** Líneas cuyo partido no está entre los que se están viendo. */
  notFound: number;
  /** Líneas cuyo marcador no coincide con el del partido encontrado: no se escriben. */
  wrongScore: number;
  /** Líneas correctas cuyo partido ya tenía el dato. */
  already: number;
  /** Líneas rechazadas por la validación: el valor es imposible para ese dato. */
  rejected: number;
  ignored: number;
  /** Por qué no se pudo cargar nada, si es el caso. */
  error: string | null;
}

/**
 * Escribe el dato `datum` en los partidos de `target` a partir del .txt.
 *
 * `target` son los ids de las filas que el usuario está viendo: la carga no sale de ahí ni toca partidos
 * de otra competición o temporada por mucho que el archivo los traiga.
 */
export function applyStatsTxt(input: {
  matches: Match[];
  target: ReadonlySet<string>;
  leagues: League[];
  datum: MatchDatum;
  text: string;
  now: string;
}): StatsTxtResult {
  const { matches, target, leagues, datum, text, now } = input;
  const vacio = { matches, written: 0, notFound: 0, wrongScore: 0, already: 0, rejected: 0 };
  const parsed = parseStatsTxt(text);

  if (parsed.rows.length === 0) {
    return { ...vacio, ignored: parsed.ignored, error: 'Ninguna línea del archivo tiene el formato «Fecha: AAAA-MM-DD | Local n-n Visitante | Dato: a - b».' };
  }
  if (!labelMatches(parsed.label, datum)) {
    return { ...vacio, ignored: parsed.ignored, error: `El archivo trae «${parsed.label}» y el filtro activo es «${datum.name}». Cambia el filtro o el archivo.` };
  }

  // La posesión se escribe en % en el archivo y se guarda en fracción, igual que en el formulario.
  const escala = datum.home === 'possessionHome' ? 0.01 : 1;
  const rosters = new Map<string, CatalogTeam[]>();
  const rosterDe = (leagueId: string) => {
    const ya = rosters.get(leagueId);
    if (ya) return ya;
    const liga = leagues.find((l) => l.id === leagueId);
    const r = liga ? rosterFor(liga) : [];
    rosters.set(leagueId, r);
    return r;
  };

  const candidatos = matches.filter((m) => target.has(m.id));
  const escritos = new Map<string, Match>();
  let written = 0;
  let notFound = 0;
  let wrongScore = 0;
  let already = 0;
  let rejected = 0;

  for (const fila of parsed.rows) {
    const dia = Date.parse(fila.date);
    const mismos = candidatos.filter(
      (m) =>
        !escritos.has(m.id) &&
        Math.abs(Date.parse(m.date) - dia) / 86_400_000 <= MARGEN_DIAS &&
        sameClub(m.homeTeamName, fila.home, rosterDe(m.leagueId)) &&
        sameClub(m.awayTeamName, fila.away, rosterDe(m.leagueId)),
    );
    if (mismos.length === 0) {
      notFound++;
      continue;
    }
    // El marcador confirma que es ESE partido. Si el nuestro no lo tiene, no hay nada que confirmar.
    const conMarcador = mismos.filter((m) => m.homeGoals === null || m.awayGoals === null || (m.homeGoals === fila.homeGoals && m.awayGoals === fila.awayGoals));
    if (conMarcador.length === 0) {
      wrongScore++;
      continue;
    }

    const m = conMarcador[0];
    if (!isMissing(m, datum)) {
      already++;
      continue;
    }
    const next = fillMissing(m, datum, [fila.values[0] * escala, fila.values[1] * escala], now);
    if (!next) {
      rejected++;
      continue;
    }
    escritos.set(m.id, next);
    written++;
  }

  return {
    matches: written ? matches.map((m) => escritos.get(m.id) ?? m) : matches,
    written,
    notFound,
    wrongScore,
    already,
    rejected,
    ignored: parsed.ignored,
    error: null,
  };
}
