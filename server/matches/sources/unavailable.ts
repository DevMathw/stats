/**
 * Una fuente que se consulta de verdad pero de la que hoy no se pueden extraer los partidos.
 *
 * Sirve para dos casos medidos: las webs oficiales que solo cargan los partidos con JavaScript
 * o piden credenciales, y las secundarias que no se pueden usar (FBref y Sofascore devuelven 403;
 * los términos de Flashscore prohíben extraer sus datos). En vez de saltarlas en silencio, se piden y el log
 * recoge exactamente qué respondieron.
 */
import { getText } from '../http.ts';
import { SourceError, type MatchSource } from '../types.ts';

export function unavailableSource(name: string, url: string, reason: string, secondary: boolean): MatchSource {
  return {
    name,
    secondary,
    site: url,
    unavailable: reason,
    async fetch() {
      await getText(url, { retries: 0 }); // si falla, el error ya dice qué respondió la fuente
      throw new SourceError(`respondió, pero ${reason}`, url);
    },
  };
}
