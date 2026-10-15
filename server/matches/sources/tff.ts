/**
 * Süper Lig: tff.org, la federación turca. Una página por jornada (`&hafta=N`), en HTML y con
 * codificación `windows-1254` (sin declararla, los nombres turcos salen rotos).
 */
import { getText, pausa } from '../http.ts';
import { utcFromLocalTime } from '../../../src/domain/models/leagueTimeZones.ts';
import type { MatchSource, SourceMatch } from '../types.ts';

const BASE = 'https://www.tff.org/default.aspx?pageID=198';
const MAX_JORNADAS = 38;

const texto = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

const celda = (fila: string, clase: string) =>
  fila.match(new RegExp(`class="${clase}"[^>]*>([\\s\\S]*?)</td>`))?.[1] ?? '';

export function parseTffWeek(html: string, round: number): { season: string | null; matches: SourceMatch[] } {
  const temporada = texto(html).match(/(\d{4})\s*-\s*(\d{4})\s+Sezonu/);
  const matches: SourceMatch[] = [];

  for (const [, fila] of html.matchAll(/<tr class="haftaninMaclariTr">([\s\S]*?)<\/tr>/g)) {
    const fecha = fila.match(/lblTarih"?[^>]*>\s*(\d{2})\.(\d{2})\.(\d{4})\s*</);
    const hora = fila.match(/lblSaat"?[^>]*>\s*(\d{2}:\d{2})\s*</);
    const local = texto(celda(fila, 'haftaninMaclariEv'));
    const visitante = texto(celda(fila, 'haftaninMaclariDeplasman'));
    const marcador = celda(fila, 'haftaninMaclariSkor');
    if (!fecha || !local || !visitante) continue;

    const goles = texto(marcador).match(/^(\d+)\s*-\s*(\d+)$/);
    // La TFF publica la fecha y la hora oficiales de Turquía: se guardan tal cual. El instante sale de
    // esa hora y de la zona del país, que es una sola: no hay nada que suponer.
    const dia = `${fecha[3]}-${fecha[2]}-${fecha[1]}`;
    matches.push({
      sourceId: marcador.match(/macId=(\d+)/i)?.[1] ?? null,
      round,
      date: dia,
      time: hora?.[1] ?? null,
      utc: hora ? utcFromLocalTime(dia, hora[1], 'Europe/Istanbul') : null,
      phase: null,
      homeTeam: local,
      awayTeam: visitante,
      homeGoals: goles ? Number(goles[1]) : null,
      awayGoals: goles ? Number(goles[2]) : null,
      homeHalfTime: null,
      awayHalfTime: null,
      status: goles ? 'finished' : 'scheduled',
    });
  }

  return { season: temporada ? `${temporada[1]}/${temporada[2]}` : null, matches };
}

export function tffSource(): MatchSource {
  return {
    name: 'tff.org',
    secondary: false,
    async fetch() {
      const partidos: SourceMatch[] = [];
      let temporada: string | null = null;
      for (let hafta = 1; hafta <= MAX_JORNADAS; hafta++) {
        if (hafta > 1) await pausa();
        const semana = parseTffWeek(await getText(`${BASE}&hafta=${hafta}`, { charset: 'windows-1254' }), hafta);
        temporada ??= semana.season;
        if (semana.matches.length === 0) break;
        partidos.push(...semana.matches);
        if (semana.matches.every((p) => p.status === 'scheduled')) break;
      }
      return { season: temporada ?? '', url: BASE, matches: partidos, notes: [] };
    },
  };
}
