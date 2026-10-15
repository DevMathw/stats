/**
 * Fuentes de cada competición, decididas una a una con el usuario el 14/09/2026.
 *
 * - `oficial+fotmob`: su web oficial y FotMob, que completa SOLO lo que la oficial no publica.
 * - `fotmob`: solo FotMob, para partidos y estadísticas, porque de su web oficial no se puede leer nada útil.
 *
 * Todas piden los 10 datos del partido: posesión, tiros, tiros a puerta, córners, faltas, fueras de juego,
 * amarillas, rojas, xG y marcador al descanso. Lo que ninguna fuente dé se escribe a mano en Partidos.
 */
export type SourcePolicy = 'oficial+fotmob' | 'fotmob';

export const SOURCE_POLICY: ReadonlyMap<string, SourcePolicy> = new Map<string, SourcePolicy>([
  ['eng.1', 'oficial+fotmob'],
  ['esp.1', 'oficial+fotmob'],
  ['fra.1', 'oficial+fotmob'],
  ['uefa.champions', 'oficial+fotmob'],
  ['uefa.europa', 'oficial+fotmob'],
  ['uefa.europa.conf', 'oficial+fotmob'],
  ['ger.1', 'oficial+fotmob'],
  // tff.org da los partidos, pero ninguna estadística: esas las pone FotMob.
  ['tur.1', 'oficial+fotmob'],
  ['ita.1', 'fotmob'],
  ['ned.1', 'fotmob'],
  ['por.1', 'fotmob'],
  ['den.1', 'fotmob'],
  ['bel.1', 'fotmob'],
  ['eng.2', 'fotmob'],
  ['bra.1', 'fotmob'],
  ['arg.1', 'fotmob'],
  ['col.1', 'fotmob'],
  ['chi.1', 'fotmob'],
  ['ven.1', 'fotmob'],
  ['bol.1', 'fotmob'],
  ['ecu.1', 'fotmob'],
  ['uru.1', 'fotmob'],
  ['par.1', 'fotmob'],
  // 15/09/2026: ligas de clubes de las copas UEFA, Liga MX y MLS. FotMob da los 10 datos en todas (medido); sus webs
  // oficiales no dejan leerlos o, en MLS, sus términos prohíben leerla con un programa. Las de Austria (7 de los 10)
  // y Polonia (8 de los 10) sí los publican en sus fichas: pasarán a `oficial+fotmob` cuando tengan extractor.
  ['aut.1', 'fotmob'],
  ['gre.1', 'fotmob'],
  ['nor.1', 'fotmob'],
  ['pol.1', 'fotmob'],
  ['sco.1', 'fotmob'],
  ['sui.1', 'fotmob'],
  ['swe.1', 'fotmob'],
  ['mex.1', 'fotmob'],
  ['usa.1', 'fotmob'],
]);
