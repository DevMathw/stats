/**
 * Nombres (del libro Excel y de las fuentes de «Actualizar partidos») que no casan solos con la
 * plantilla de ESPN de su competición.
 *
 * Revisados a mano el 12/09/2026. Cada uno se emparejó 1 a 1 con el único club de ESPN que
 * quedaba libre en esa misma liga, así que no hay suposición: es la única pieza que falta.
 *
 *  - Exónimos en español (Marsella, Club Brujas…) frente al nombre local o inglés.
 *  - Variantes oficiales (Atlético Mineiro → Atlético-MG).
 *  - Nombres con una palabra genérica que casaba con dos clubes: «Deportivo Alavés» contiene a
 *    Alavés y a Deportivo de La Coruña; sin este alias se quedaría sin resolver.
 */
export const TEAM_ALIAS_SEED: { name: string; espnId: string }[] = [
  // LaLiga
  { name: 'Deportivo Alavés', espnId: '96' },
  { name: 'RCD Espanyol de Barcelona', espnId: '88' },
  // Bundesliga
  { name: 'FC Köln', espnId: '122' },
  { name: 'Hamburger SV', espnId: '127' },
  { name: '1. FC Köln', espnId: '122' }, // bundesliga.com
  // Ligue 1
  { name: 'Marsella', espnId: '176' },
  { name: 'Estrasburgo', espnId: '180' },
  { name: 'Niza', espnId: '2502' },
  // ligue1.com
  { name: 'Olympique Lyonnais', espnId: '167' },
  { name: 'Stade Brestois 29', espnId: '6997' },
  { name: 'Havre Athletic Club', espnId: '3236' },
  // Superliga
  { name: 'FC Copenhague', espnId: '909' },
  // Belgian Pro League
  { name: 'Club Brujas', espnId: '570' },
  { name: 'Cercle Brujas', espnId: '3610' },
  { name: 'Standard Lieja', espnId: '559' },
  { name: 'Union Saint-Gilloise', espnId: '5807' },
  { name: 'Sint-Truiden', espnId: '936' },
  { name: 'KAA Gante', espnId: '3611' },
  { name: 'KV Malinas', espnId: '7879' },
  // FotMob (secundaria de la Pro League)
  { name: 'St.Truiden', espnId: '936' },
  // Fuentes de escudos (scripts/buildOfficialTeams.mjs), 13/09/2026: en cada liga, tantos nombres
  // sin enlazar como clubes libres en la plantilla, 1 a 1.
  { name: 'STVV', espnId: '936' }, // proleague.be
  { name: 'Royale Union Saint-Gilloise', espnId: '5807' }, // proleague.be
  { name: 'OB', espnId: '11550' }, // FotMob, Superliga
  { name: 'Amed Sportif', espnId: '132335' }, // FotMob, Süper Lig
  { name: 'Erzurumspor FK', espnId: '19267' }, // FotMob, Süper Lig
  { name: 'Cerro Largo Fútbol Club', espnId: '9902' }, // auf.org.uy: sin alias casaba también con «Cerro»
  { name: 'G Villarroel CD San José', espnId: '22174' }, // fbf.com.bo: «GV San José» en la plantilla
  { name: 'Union St.Gilloise', espnId: '5807' },
  { name: 'Sporting Charleroi', espnId: '3616' },
  // Süper Lig
  { name: 'Kasımpaşa', espnId: '6870' },
  { name: 'Erzurumspor', espnId: '19267' },
  // Nombre oficial en tff.org; el único Amed de la plantilla es «Amed SFK» (Sportif Faaliyetler Kulübü).
  { name: 'Amed Sportif Faaliyetler', espnId: '132335' },
  // Brasileirão
  { name: 'Atlético Mineiro', espnId: '7632' },
  // Bolivia
  { name: 'Academia del Balompié', espnId: '130875' },

  // Competiciones UEFA: nombre internacional y oficial que publica UEFA (comp.uefa.com) para
  // los 6 clubes de fase liga que no casaban con ESPN. Revisados el 12/09/2026.
  { name: 'Slavia Praha', espnId: '494' },
  { name: 'SK Slavia Praha', espnId: '494' },
  { name: 'GNK Dinamo', espnId: '597' },
  { name: 'H. Beer-Sheva', espnId: '13083' },
  { name: 'Hapoel Beer-Sheva FC', espnId: '13083' },
  { name: 'Copenhagen', espnId: '909' },
  { name: 'F.C. Copenhagen', espnId: '909' },
  { name: 'Crvena Zvezda', espnId: '2290' },
  { name: 'FK Crvena Zvezda', espnId: '2290' },
  { name: 'U. Craiova', espnId: '8089' },
  { name: 'Universitatea Craiova', espnId: '8089' },

  // Ligas añadidas el 15/09/2026, nombres de FotMob. En cada liga, tantos nombres sin enlazar como clubes libres en la
  // plantilla de ESPN, 1 a 1. «FC Vaduz» (Super League Suiza) queda sin alias: el club libre en ESPN es Winterthur.
  { name: 'Austria Wien', espnId: '1382' }, // ESPN «Austria Vienna»
  { name: 'Rapid Wien', espnId: '519' }, // ESPN «Rapid Vienna»
  { name: 'Asteras Tripolis', espnId: '8354' }, // ESPN «Asteras Tripoli»
  { name: 'Grasshopper', espnId: '492' }, // ESPN «Grasshoppers»
  { name: 'Chivas', espnId: '219' }, // ESPN «Guadalajara»
  { name: 'Los Angeles FC', espnId: '18966' }, // ESPN «LAFC»: «Los Angeles» casaba también con LA Galaxy

  /*
   * Primera A (Liga BetPlay Dimayor), 26/09/2026. El mismo club con otro nombre, no un parecido: La
   * Equidad pasó a llamarse Internacional de Bogotá, y lo dice la fuente, no una deducción nuestra.
   *  - El marcador histórico de ESPN de la propia competición devuelve el id 7445 para el partido que los
   *    históricos llaman «Rionegro Águilas 1-1 Deportivo La Equidad»: `col.1/scoreboard?dates=20250127`
   *    → «9762:Águilas Doradas 1 vs 7445:Internacional de Bogotá 1».
   *  - dimayor.com.co ya no lista a La Equidad entre sus 39 clubes, y sí a Internacional de Bogotá.
   * Quitar estas dos líneas devuelve a La Equidad su identidad propia (sin escudo) y separa su histórico.
   */
  { name: 'Deportivo La Equidad', espnId: '7445' },
  { name: 'La Equidad', espnId: '7445' },

  /*
   * Nombres largos de los libros históricos, 12/10/2026.
   *
   * Los libros de `data_statistics/` escriben el nombre oficial completo y las fuentes en vivo el corto,
   * así que el mismo club entraba DOS VECES en su competición: la temporada en curso con referencia a
   * ESPN y escudo, y las tres históricas sin ninguna de las dos. Ocho clubes en tres ligas.
   *
   * Cada emparejamiento es el que ya estaba hecho, no uno nuevo: el nombre corto de la temporada en curso
   * resuelve a ese id de ESPN por su cuenta, y el largo es el mismo club de la misma liga. No hay
   * suposición posible porque el club de ESPN ya estaba ocupado por su otra grafia.
   */
  // Bundesliga Austria
  { name: 'FK Austria Wien', espnId: '1382' }, // junto a «Austria Wien»; ESPN «Austria Vienna»
  { name: 'SK Rapid Wien', espnId: '519' }, // junto a «Rapid Wien»; ESPN «Rapid Vienna»
  // Belgian Pro League
  { name: 'RC Sporting Charleroi', espnId: '3616' }, // junto a «Charleroi»
  // Super League Suiza
  { name: 'FC Lausanne-Sport', espnId: '11551' }, // junto a «Lausanne». OJO: «FC Stade-Lausanne-Ouchy» es OTRO club
  { name: 'Grasshopper Club Zürich', espnId: '492' }, // junto a «Grasshopper»; ESPN «Grasshoppers»
  { name: 'BSC Young Boys', espnId: '2722' }, // junto a «Young Boys»
  { name: 'FC St. Gallen 1879', espnId: '557' }, // junto a «St. Gallen»

  /*
   * Y los nombres CORTOS de esos mismos tres clubes.
   *
   * Hacen falta porque `attachTeamRefs` quita la referencia al nombre que llega a un club «por
   * contención» cuando otro nombre de la misma liga ya lo reclama: es la regla que impide fundir
   * «FK Žalgiris» con «Kauno Žalgiris». Con el nombre largo puesto arriba, el corto pasaba a ser el
   * sospechoso y perdía su escudo en la temporada en curso. Declarados los dos a mano, los dos
   * sobreviven y `unifyTeamNames` los funde en uno, que es el objetivo.
   */
  { name: 'SCR Altach', espnId: '4405' },
  { name: 'Altach', espnId: '4405' },
  { name: 'Charleroi', espnId: '3616' },
  { name: 'Lausanne', espnId: '11551' },

  /*
   * Eliteserien: «HamKam» es como el libro histórico llama al Hamarkameratene, y no se parecen en
   * ninguna palabra, así que ninguna regla podía juntarlos. Salió al revisar los escudos: los dos
   * recibían el mismo (FotMob 8448), que es la prueba de que son un club y no dos.
   */
  { name: 'HamKam', espnId: '21380' },
];
