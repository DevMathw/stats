// GENERADO por scripts/buildOfficialTeams.mjs el 2026-10-12. No editar a mano: `npm run official-teams`.

/** Nombre y escudo de un club, enlazados a la clave interna (id de ESPN). */
export interface OfficialTeam {
  /** Vacío si la liga no está en ESPN: entonces enlaza `teamId`. */
  espnId: string;
  /** Clave del equipo en su competición (`liga|nombre`), solo para las ligas que ESPN no tiene. */
  teamId?: string;
  /** Variantes del nombre en la fuente. Solo en las entradas con `teamId`: con ellas se busca por nombre. */
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
  /** `true` si viene de la secundaria: la app muestra su escudo, pero no su nombre. */
  secondary: boolean;
  /** Id del club en la fuente. */
  sourceTeamId: string;
  /** Dónde se consultó. */
  sourceUrl: string;
}

export const OFFICIAL_TEAMS_GENERATED_AT = '2026-10-12';

export const OFFICIAL_TEAMS: OfficialTeam[] = [
  {
    "espnId": "",
    "teamId": "Allsvenskan|AIK",
    "names": [
      "AIK",
      "AIK"
    ],
    "name": "AIK",
    "shortName": "AIK",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8349.png",
    "country": "SWE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8349",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=67"
  },
  {
    "espnId": "",
    "teamId": "Allsvenskan|Brommapojkarna",
    "names": [
      "Brommapojkarna",
      "Brommapojkarna"
    ],
    "name": "Brommapojkarna",
    "shortName": "Brommapojkarna",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8501.png",
    "country": "SWE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8501",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=67"
  },
  {
    "espnId": "",
    "teamId": "Allsvenskan|Degerfors",
    "names": [
      "Degerfors",
      "Degerfors"
    ],
    "name": "Degerfors",
    "shortName": "Degerfors",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6544.png",
    "country": "SWE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6544",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=67"
  },
  {
    "espnId": "",
    "teamId": "Allsvenskan|Djurgården",
    "names": [
      "Djurgården",
      "Djurgården"
    ],
    "name": "Djurgården",
    "shortName": "Djurgården",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9802.png",
    "country": "SWE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9802",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=67"
  },
  {
    "espnId": "",
    "teamId": "Allsvenskan|Elfsborg",
    "names": [
      "Elfsborg",
      "Elfsborg"
    ],
    "name": "Elfsborg",
    "shortName": "Elfsborg",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8014.png",
    "country": "SWE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8014",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=67"
  },
  {
    "espnId": "",
    "teamId": "Allsvenskan|GAIS",
    "names": [
      "GAIS",
      "GAIS"
    ],
    "name": "GAIS",
    "shortName": "GAIS",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8297.png",
    "country": "SWE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8297",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=67"
  },
  {
    "espnId": "",
    "teamId": "Allsvenskan|Häcken",
    "names": [
      "Häcken",
      "Häcken"
    ],
    "name": "Häcken",
    "shortName": "Häcken",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8428.png",
    "country": "SWE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8428",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=67"
  },
  {
    "espnId": "",
    "teamId": "Allsvenskan|Halmstads BK",
    "names": [
      "Halmstads BK",
      "Halmstads BK"
    ],
    "name": "Halmstads BK",
    "shortName": "Halmstads BK",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8310.png",
    "country": "SWE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8310",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=67"
  },
  {
    "espnId": "",
    "teamId": "Allsvenskan|Hammarby",
    "names": [
      "Hammarby",
      "Hammarby"
    ],
    "name": "Hammarby",
    "shortName": "Hammarby",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8248.png",
    "country": "SWE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8248",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=67"
  },
  {
    "espnId": "",
    "teamId": "Allsvenskan|IFK Göteborg",
    "names": [
      "IFK Göteborg",
      "IFK Göteborg"
    ],
    "name": "IFK Göteborg",
    "shortName": "IFK Göteborg",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9893.png",
    "country": "SWE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9893",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=67"
  },
  {
    "espnId": "",
    "teamId": "Allsvenskan|IFK Norrköping",
    "names": [
      "IFK Norrköping",
      "IFK Norrköping"
    ],
    "name": "IFK Norrköping",
    "shortName": "IFK Norrköping",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8449.png",
    "country": "SWE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8449",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=67"
  },
  {
    "espnId": "",
    "teamId": "Allsvenskan|IFK Värnamo",
    "names": [
      "IFK Värnamo",
      "IFK Värnamo"
    ],
    "name": "IFK Värnamo",
    "shortName": "IFK Värnamo",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6181.png",
    "country": "SWE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6181",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=67"
  },
  {
    "espnId": "",
    "teamId": "Allsvenskan|Kalmar FF",
    "names": [
      "Kalmar FF",
      "Kalmar FF"
    ],
    "name": "Kalmar FF",
    "shortName": "Kalmar FF",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9892.png",
    "country": "SWE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9892",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=67"
  },
  {
    "espnId": "",
    "teamId": "Allsvenskan|Malmö FF",
    "names": [
      "Malmö FF",
      "Malmö FF"
    ],
    "name": "Malmö FF",
    "shortName": "Malmö FF",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10237.png",
    "country": "SWE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10237",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=67"
  },
  {
    "espnId": "",
    "teamId": "Allsvenskan|Mjällby",
    "names": [
      "Mjällby",
      "Mjällby"
    ],
    "name": "Mjällby",
    "shortName": "Mjällby",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8127.png",
    "country": "SWE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8127",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=67"
  },
  {
    "espnId": "",
    "teamId": "Allsvenskan|Örgryte",
    "names": [
      "Örgryte",
      "Örgryte"
    ],
    "name": "Örgryte",
    "shortName": "Örgryte",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10002.png",
    "country": "SWE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10002",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=67"
  },
  {
    "espnId": "",
    "teamId": "Allsvenskan|Östers IF",
    "names": [
      "Östers IF",
      "Östers IF"
    ],
    "name": "Östers IF",
    "shortName": "Östers IF",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8641.png",
    "country": "SWE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8641",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=67"
  },
  {
    "espnId": "",
    "teamId": "Allsvenskan|Sirius",
    "names": [
      "Sirius",
      "Sirius"
    ],
    "name": "Sirius",
    "shortName": "Sirius",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6694.png",
    "country": "SWE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6694",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=67"
  },
  {
    "espnId": "",
    "teamId": "Allsvenskan|Varbergs BoIS FC",
    "names": [
      "Varbergs BoIS FC",
      "Varbergs BoIS FC"
    ],
    "name": "Varbergs BoIS FC",
    "shortName": "Varbergs BoIS FC",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6692.png",
    "country": "SWE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6692",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=67"
  },
  {
    "espnId": "",
    "teamId": "Allsvenskan|Västerås SK",
    "names": [
      "Västerås SK",
      "Västerås SK"
    ],
    "name": "Västerås SK",
    "shortName": "Västerås SK",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6194.png",
    "country": "SWE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6194",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=67"
  },
  {
    "espnId": "",
    "teamId": "Belgian Pro League|Anderlecht",
    "names": [
      "Anderlecht",
      "Anderlecht"
    ],
    "name": "Anderlecht",
    "shortName": "Anderlecht",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8635.png",
    "country": "BEL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8635",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=40"
  },
  {
    "espnId": "",
    "teamId": "Belgian Pro League|Beerschot",
    "names": [
      "Beerschot",
      "Beerschot"
    ],
    "name": "Beerschot",
    "shortName": "Beerschot",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/583877.png",
    "country": "BEL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "583877",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=40"
  },
  {
    "espnId": "",
    "teamId": "Belgian Pro League|Cercle Brugge",
    "names": [
      "Cercle Brugge",
      "Cercle Brugge"
    ],
    "name": "Cercle Brugge",
    "shortName": "Cercle Brugge",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9984.png",
    "country": "BEL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9984",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=40"
  },
  {
    "espnId": "",
    "teamId": "Belgian Pro League|Club Brugge",
    "names": [
      "Club Brugge",
      "Club Brugge"
    ],
    "name": "Club Brugge",
    "shortName": "Club Brugge",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8342.png",
    "country": "BEL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8342",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=40"
  },
  {
    "espnId": "",
    "teamId": "Belgian Pro League|Eupen",
    "names": [
      "Eupen",
      "Eupen"
    ],
    "name": "Eupen",
    "shortName": "Eupen",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6351.png",
    "country": "BEL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6351",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=40"
  },
  {
    "espnId": "",
    "teamId": "Belgian Pro League|FCV Dender EH",
    "names": [
      "FCV Dender EH",
      "FCV Dender EH"
    ],
    "name": "FCV Dender EH",
    "shortName": "FCV Dender EH",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/7947.png",
    "country": "BEL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "7947",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=40"
  },
  {
    "espnId": "",
    "teamId": "Belgian Pro League|Genk",
    "names": [
      "Genk",
      "Genk"
    ],
    "name": "Genk",
    "shortName": "Genk",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9987.png",
    "country": "BEL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9987",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=40"
  },
  {
    "espnId": "",
    "teamId": "Belgian Pro League|Gent",
    "names": [
      "Gent",
      "Gent"
    ],
    "name": "Gent",
    "shortName": "Gent",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9991.png",
    "country": "BEL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9991",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=40"
  },
  {
    "espnId": "",
    "teamId": "Belgian Pro League|Kortrijk",
    "names": [
      "Kortrijk",
      "Kortrijk"
    ],
    "name": "Kortrijk",
    "shortName": "Kortrijk",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8571.png",
    "country": "BEL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8571",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=40"
  },
  {
    "espnId": "",
    "teamId": "Belgian Pro League|KV Mechelen",
    "names": [
      "KV Mechelen",
      "KV Mechelen"
    ],
    "name": "KV Mechelen",
    "shortName": "KV Mechelen",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8203.png",
    "country": "BEL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8203",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=40"
  },
  {
    "espnId": "",
    "teamId": "Belgian Pro League|Lommel",
    "names": [
      "Lommel",
      "Lommel"
    ],
    "name": "Lommel",
    "shortName": "Lommel",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6702.png",
    "country": "BEL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6702",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=40"
  },
  {
    "espnId": "",
    "teamId": "Belgian Pro League|OH Leuven",
    "names": [
      "OH Leuven",
      "OH Leuven"
    ],
    "name": "OH Leuven",
    "shortName": "OH Leuven",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1773.png",
    "country": "BEL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1773",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=40"
  },
  {
    "espnId": "",
    "teamId": "Belgian Pro League|RAAL La Louvière",
    "names": [
      "RAAL La Louvière",
      "RAAL La Louvière"
    ],
    "name": "RAAL La Louvière",
    "shortName": "RAAL La Louvière",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1218969.png",
    "country": "BEL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1218969",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=40"
  },
  {
    "espnId": "",
    "teamId": "Belgian Pro League|Royal Antwerp",
    "names": [
      "Royal Antwerp",
      "Royal Antwerp"
    ],
    "name": "Royal Antwerp",
    "shortName": "Royal Antwerp",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9988.png",
    "country": "BEL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9988",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=40"
  },
  {
    "espnId": "",
    "teamId": "Belgian Pro League|RWDM Brussels",
    "names": [
      "RWDM Brussels",
      "RWDM Brussels"
    ],
    "name": "RWDM Brussels",
    "shortName": "RWDM Brussels",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9992.png",
    "country": "BEL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9992",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=40"
  },
  {
    "espnId": "",
    "teamId": "Belgian Pro League|SK Beveren",
    "names": [
      "SK Beveren",
      "SK Beveren"
    ],
    "name": "SK Beveren",
    "shortName": "SK Beveren",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8475.png",
    "country": "BEL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8475",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=40"
  },
  {
    "espnId": "",
    "teamId": "Belgian Pro League|Sporting Charleroi",
    "names": [
      "Sporting Charleroi",
      "Sporting Charleroi"
    ],
    "name": "Sporting Charleroi",
    "shortName": "Sporting Charleroi",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9986.png",
    "country": "BEL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9986",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=40"
  },
  {
    "espnId": "",
    "teamId": "Belgian Pro League|St.Truiden",
    "names": [
      "St.Truiden",
      "St.Truiden"
    ],
    "name": "St.Truiden",
    "shortName": "St.Truiden",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9997.png",
    "country": "BEL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9997",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=40"
  },
  {
    "espnId": "",
    "teamId": "Belgian Pro League|Standard Liège",
    "names": [
      "Standard Liège",
      "Standard Liège"
    ],
    "name": "Standard Liège",
    "shortName": "Standard Liège",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9985.png",
    "country": "BEL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9985",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=40"
  },
  {
    "espnId": "",
    "teamId": "Belgian Pro League|Union St.Gilloise",
    "names": [
      "Union St.Gilloise",
      "Union St.Gilloise"
    ],
    "name": "Union St.Gilloise",
    "shortName": "Union St.Gilloise",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/7978.png",
    "country": "BEL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "7978",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=40"
  },
  {
    "espnId": "",
    "teamId": "Belgian Pro League|Westerlo",
    "names": [
      "Westerlo",
      "Westerlo"
    ],
    "name": "Westerlo",
    "shortName": "Westerlo",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10001.png",
    "country": "BEL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10001",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=40"
  },
  {
    "espnId": "",
    "teamId": "Belgian Pro League|Zulte Waregem",
    "names": [
      "Zulte Waregem",
      "Zulte Waregem"
    ],
    "name": "Zulte Waregem",
    "shortName": "Zulte Waregem",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10000.png",
    "country": "BEL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10000",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=40"
  },
  {
    "espnId": "",
    "teamId": "Bundesliga Austria|Altach",
    "names": [
      "Altach",
      "Altach"
    ],
    "name": "Altach",
    "shortName": "Altach",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10008.png",
    "country": "AUT",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10008",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=38"
  },
  {
    "espnId": "",
    "teamId": "Bundesliga Austria|Austria Lustenau",
    "names": [
      "Austria Lustenau",
      "Austria Lustenau"
    ],
    "name": "Austria Lustenau",
    "shortName": "Austria Lustenau",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9982.png",
    "country": "AUT",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9982",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=38"
  },
  {
    "espnId": "",
    "teamId": "Bundesliga Austria|Austria Wien",
    "names": [
      "Austria Wien",
      "Austria Wien"
    ],
    "name": "Austria Wien",
    "shortName": "Austria Wien",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10011.png",
    "country": "AUT",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10011",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=38"
  },
  {
    "espnId": "",
    "teamId": "Bundesliga Austria|BW Linz",
    "names": [
      "BW Linz",
      "BW Linz"
    ],
    "name": "BW Linz",
    "shortName": "BW Linz",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/2433.png",
    "country": "AUT",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "2433",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=38"
  },
  {
    "espnId": "",
    "teamId": "Bundesliga Austria|Grazer AK",
    "names": [
      "Grazer AK",
      "Grazer AK"
    ],
    "name": "Grazer AK",
    "shortName": "Grazer AK",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10012.png",
    "country": "AUT",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10012",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=38"
  },
  {
    "espnId": "",
    "teamId": "Bundesliga Austria|Hartberg",
    "names": [
      "Hartberg",
      "Hartberg"
    ],
    "name": "Hartberg",
    "shortName": "Hartberg",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10056.png",
    "country": "AUT",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10056",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=38"
  },
  {
    "espnId": "",
    "teamId": "Bundesliga Austria|LASK",
    "names": [
      "LASK",
      "LASK"
    ],
    "name": "LASK",
    "shortName": "LASK",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9977.png",
    "country": "AUT",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9977",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=38"
  },
  {
    "espnId": "",
    "teamId": "Bundesliga Austria|Rapid Wien",
    "names": [
      "Rapid Wien",
      "Rapid Wien"
    ],
    "name": "Rapid Wien",
    "shortName": "Rapid Wien",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10015.png",
    "country": "AUT",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10015",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=38"
  },
  {
    "espnId": "",
    "teamId": "Bundesliga Austria|Ried",
    "names": [
      "Ried",
      "Ried"
    ],
    "name": "Ried",
    "shortName": "Ried",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10017.png",
    "country": "AUT",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10017",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=38"
  },
  {
    "espnId": "",
    "teamId": "Bundesliga Austria|Salzburg",
    "names": [
      "Salzburg",
      "Salzburg"
    ],
    "name": "Salzburg",
    "shortName": "Salzburg",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10013.png",
    "country": "AUT",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10013",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=38"
  },
  {
    "espnId": "",
    "teamId": "Bundesliga Austria|SK Austria Klagenfurt",
    "names": [
      "SK Austria Klagenfurt",
      "SK Austria Klagenfurt"
    ],
    "name": "SK Austria Klagenfurt",
    "shortName": "SK Austria Klagenfurt",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10009.png",
    "country": "AUT",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10009",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=38"
  },
  {
    "espnId": "",
    "teamId": "Bundesliga Austria|Sturm Graz",
    "names": [
      "Sturm Graz",
      "Sturm Graz"
    ],
    "name": "Sturm Graz",
    "shortName": "Sturm Graz",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10014.png",
    "country": "AUT",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10014",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=38"
  },
  {
    "espnId": "",
    "teamId": "Bundesliga Austria|Wolfsberger AC",
    "names": [
      "Wolfsberger AC",
      "Wolfsberger AC"
    ],
    "name": "Wolfsberger AC",
    "shortName": "Wolfsberger AC",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1954.png",
    "country": "AUT",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1954",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=38"
  },
  {
    "espnId": "",
    "teamId": "Bundesliga Austria|WSG Tirol",
    "names": [
      "WSG Tirol",
      "WSG Tirol"
    ],
    "name": "WSG Tirol",
    "shortName": "WSG Tirol",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1583.png",
    "country": "AUT",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1583",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=38"
  },
  {
    "espnId": "",
    "teamId": "Bundesliga|1. FC Köln",
    "names": [
      "1. FC Köln",
      "Köln"
    ],
    "name": "1. FC Köln",
    "shortName": "Köln",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8722.png",
    "country": "GER",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8722",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=54"
  },
  {
    "espnId": "",
    "teamId": "Bundesliga|Augsburg",
    "names": [
      "Augsburg",
      "Augsburg"
    ],
    "name": "Augsburg",
    "shortName": "Augsburg",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8406.png",
    "country": "GER",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8406",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=54"
  },
  {
    "espnId": "",
    "teamId": "Bundesliga|Bayer Leverkusen",
    "names": [
      "Bayer Leverkusen",
      "Leverkusen"
    ],
    "name": "Bayer Leverkusen",
    "shortName": "Leverkusen",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8178.png",
    "country": "GER",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8178",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=54"
  },
  {
    "espnId": "",
    "teamId": "Bundesliga|Bayern München",
    "names": [
      "Bayern München",
      "Bayern München"
    ],
    "name": "Bayern München",
    "shortName": "Bayern München",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9823.png",
    "country": "GER",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9823",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=54"
  },
  {
    "espnId": "",
    "teamId": "Bundesliga|Bochum",
    "names": [
      "Bochum",
      "Bochum"
    ],
    "name": "Bochum",
    "shortName": "Bochum",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9911.png",
    "country": "GER",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9911",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=54"
  },
  {
    "espnId": "",
    "teamId": "Bundesliga|Borussia Dortmund",
    "names": [
      "Borussia Dortmund",
      "Dortmund"
    ],
    "name": "Borussia Dortmund",
    "shortName": "Dortmund",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9789.png",
    "country": "GER",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9789",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=54"
  },
  {
    "espnId": "",
    "teamId": "Bundesliga|Borussia Mönchengladbach",
    "names": [
      "Borussia Mönchengladbach",
      "M'gladbach"
    ],
    "name": "Borussia Mönchengladbach",
    "shortName": "M'gladbach",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9788.png",
    "country": "GER",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9788",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=54"
  },
  {
    "espnId": "",
    "teamId": "Bundesliga|Darmstadt",
    "names": [
      "Darmstadt",
      "Darmstadt"
    ],
    "name": "Darmstadt",
    "shortName": "Darmstadt",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8262.png",
    "country": "GER",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8262",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=54"
  },
  {
    "espnId": "",
    "teamId": "Bundesliga|Eintracht Frankfurt",
    "names": [
      "Eintracht Frankfurt",
      "Frankfurt"
    ],
    "name": "Eintracht Frankfurt",
    "shortName": "Frankfurt",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9810.png",
    "country": "GER",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9810",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=54"
  },
  {
    "espnId": "",
    "teamId": "Bundesliga|Elversberg",
    "names": [
      "Elversberg",
      "Elversberg"
    ],
    "name": "Elversberg",
    "shortName": "Elversberg",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8232.png",
    "country": "GER",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8232",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=54"
  },
  {
    "espnId": "",
    "teamId": "Bundesliga|FC Heidenheim",
    "names": [
      "FC Heidenheim",
      "FC Heidenheim"
    ],
    "name": "FC Heidenheim",
    "shortName": "FC Heidenheim",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/94937.png",
    "country": "GER",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "94937",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=54"
  },
  {
    "espnId": "",
    "teamId": "Bundesliga|Freiburg",
    "names": [
      "Freiburg",
      "Freiburg"
    ],
    "name": "Freiburg",
    "shortName": "Freiburg",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8358.png",
    "country": "GER",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8358",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=54"
  },
  {
    "espnId": "",
    "teamId": "Bundesliga|Hamburger SV",
    "names": [
      "Hamburger SV",
      "Hamburger SV"
    ],
    "name": "Hamburger SV",
    "shortName": "Hamburger SV",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9790.png",
    "country": "GER",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9790",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=54"
  },
  {
    "espnId": "",
    "teamId": "Bundesliga|Hoffenheim",
    "names": [
      "Hoffenheim",
      "Hoffenheim"
    ],
    "name": "Hoffenheim",
    "shortName": "Hoffenheim",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8226.png",
    "country": "GER",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8226",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=54"
  },
  {
    "espnId": "",
    "teamId": "Bundesliga|Holstein Kiel",
    "names": [
      "Holstein Kiel",
      "Holstein Kiel"
    ],
    "name": "Holstein Kiel",
    "shortName": "Holstein Kiel",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8150.png",
    "country": "GER",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8150",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=54"
  },
  {
    "espnId": "",
    "teamId": "Bundesliga|Mainz 05",
    "names": [
      "Mainz 05",
      "Mainz"
    ],
    "name": "Mainz 05",
    "shortName": "Mainz",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9905.png",
    "country": "GER",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9905",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=54"
  },
  {
    "espnId": "",
    "teamId": "Bundesliga|Paderborn",
    "names": [
      "Paderborn",
      "Paderborn"
    ],
    "name": "Paderborn",
    "shortName": "Paderborn",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8460.png",
    "country": "GER",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8460",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=54"
  },
  {
    "espnId": "",
    "teamId": "Bundesliga|RB Leipzig",
    "names": [
      "RB Leipzig",
      "RB Leipzig"
    ],
    "name": "RB Leipzig",
    "shortName": "RB Leipzig",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/178475.png",
    "country": "GER",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "178475",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=54"
  },
  {
    "espnId": "",
    "teamId": "Bundesliga|Schalke 04",
    "names": [
      "Schalke 04",
      "Schalke 04"
    ],
    "name": "Schalke 04",
    "shortName": "Schalke 04",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10189.png",
    "country": "GER",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10189",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=54"
  },
  {
    "espnId": "",
    "teamId": "Bundesliga|St. Pauli",
    "names": [
      "St. Pauli",
      "St. Pauli"
    ],
    "name": "St. Pauli",
    "shortName": "St. Pauli",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8152.png",
    "country": "GER",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8152",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=54"
  },
  {
    "espnId": "",
    "teamId": "Bundesliga|Union Berlin",
    "names": [
      "Union Berlin",
      "Union Berlin"
    ],
    "name": "Union Berlin",
    "shortName": "Union Berlin",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8149.png",
    "country": "GER",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8149",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=54"
  },
  {
    "espnId": "",
    "teamId": "Bundesliga|VfB Stuttgart",
    "names": [
      "VfB Stuttgart",
      "VfB Stuttgart"
    ],
    "name": "VfB Stuttgart",
    "shortName": "VfB Stuttgart",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10269.png",
    "country": "GER",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10269",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=54"
  },
  {
    "espnId": "",
    "teamId": "Bundesliga|Werder Bremen",
    "names": [
      "Werder Bremen",
      "Werder Bremen"
    ],
    "name": "Werder Bremen",
    "shortName": "Werder Bremen",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8697.png",
    "country": "GER",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8697",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=54"
  },
  {
    "espnId": "",
    "teamId": "Bundesliga|Wolfsburg",
    "names": [
      "Wolfsburg",
      "Wolfsburg"
    ],
    "name": "Wolfsburg",
    "shortName": "Wolfsburg",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8721.png",
    "country": "GER",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8721",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=54"
  },
  {
    "espnId": "",
    "teamId": "EFL Championship|Birmingham City",
    "names": [
      "Birmingham City",
      "Birmingham"
    ],
    "name": "Birmingham City",
    "shortName": "Birmingham",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8658.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8658",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "",
    "teamId": "EFL Championship|Blackburn Rovers",
    "names": [
      "Blackburn Rovers",
      "Blackburn"
    ],
    "name": "Blackburn Rovers",
    "shortName": "Blackburn",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8655.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8655",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "",
    "teamId": "EFL Championship|Bolton Wanderers",
    "names": [
      "Bolton Wanderers",
      "Bolton"
    ],
    "name": "Bolton Wanderers",
    "shortName": "Bolton",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8559.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8559",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "",
    "teamId": "EFL Championship|Bristol City",
    "names": [
      "Bristol City",
      "Bristol City"
    ],
    "name": "Bristol City",
    "shortName": "Bristol City",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8427.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8427",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "",
    "teamId": "EFL Championship|Burnley",
    "names": [
      "Burnley",
      "Burnley"
    ],
    "name": "Burnley",
    "shortName": "Burnley",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8191.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8191",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "",
    "teamId": "EFL Championship|Cardiff City",
    "names": [
      "Cardiff City",
      "Cardiff"
    ],
    "name": "Cardiff City",
    "shortName": "Cardiff",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8344.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8344",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "",
    "teamId": "EFL Championship|Charlton Athletic",
    "names": [
      "Charlton Athletic",
      "Charlton"
    ],
    "name": "Charlton Athletic",
    "shortName": "Charlton",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8451.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8451",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "",
    "teamId": "EFL Championship|Coventry City",
    "names": [
      "Coventry City",
      "Coventry"
    ],
    "name": "Coventry City",
    "shortName": "Coventry",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8669.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8669",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "",
    "teamId": "EFL Championship|Derby County",
    "names": [
      "Derby County",
      "Derby"
    ],
    "name": "Derby County",
    "shortName": "Derby",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10170.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10170",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "",
    "teamId": "EFL Championship|Huddersfield Town",
    "names": [
      "Huddersfield Town",
      "Huddersfield"
    ],
    "name": "Huddersfield Town",
    "shortName": "Huddersfield",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9796.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9796",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "",
    "teamId": "EFL Championship|Hull City",
    "names": [
      "Hull City",
      "Hull"
    ],
    "name": "Hull City",
    "shortName": "Hull",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8667.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8667",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "",
    "teamId": "EFL Championship|Ipswich Town",
    "names": [
      "Ipswich Town",
      "Ipswich"
    ],
    "name": "Ipswich Town",
    "shortName": "Ipswich",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9902.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9902",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "",
    "teamId": "EFL Championship|Leeds United",
    "names": [
      "Leeds United",
      "Leeds"
    ],
    "name": "Leeds United",
    "shortName": "Leeds",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8463.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8463",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "",
    "teamId": "EFL Championship|Leicester City",
    "names": [
      "Leicester City",
      "Leicester"
    ],
    "name": "Leicester City",
    "shortName": "Leicester",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8197.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8197",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "",
    "teamId": "EFL Championship|Lincoln City",
    "names": [
      "Lincoln City",
      "Lincoln"
    ],
    "name": "Lincoln City",
    "shortName": "Lincoln",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8430.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8430",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "",
    "teamId": "EFL Championship|Luton Town",
    "names": [
      "Luton Town",
      "Luton"
    ],
    "name": "Luton Town",
    "shortName": "Luton",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8346.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8346",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "",
    "teamId": "EFL Championship|Middlesbrough",
    "names": [
      "Middlesbrough",
      "Middlesbrough"
    ],
    "name": "Middlesbrough",
    "shortName": "Middlesbrough",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8549.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8549",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "",
    "teamId": "EFL Championship|Millwall",
    "names": [
      "Millwall",
      "Millwall"
    ],
    "name": "Millwall",
    "shortName": "Millwall",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10004.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10004",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "",
    "teamId": "EFL Championship|Norwich City",
    "names": [
      "Norwich City",
      "Norwich"
    ],
    "name": "Norwich City",
    "shortName": "Norwich",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9850.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9850",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "",
    "teamId": "EFL Championship|Oxford United",
    "names": [
      "Oxford United",
      "Oxford Utd"
    ],
    "name": "Oxford United",
    "shortName": "Oxford Utd",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8653.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8653",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "",
    "teamId": "EFL Championship|Plymouth Argyle",
    "names": [
      "Plymouth Argyle",
      "Plymouth"
    ],
    "name": "Plymouth Argyle",
    "shortName": "Plymouth",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8401.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8401",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "",
    "teamId": "EFL Championship|Portsmouth",
    "names": [
      "Portsmouth",
      "Portsmouth"
    ],
    "name": "Portsmouth",
    "shortName": "Portsmouth",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8462.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8462",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "",
    "teamId": "EFL Championship|Preston North End",
    "names": [
      "Preston North End",
      "Preston"
    ],
    "name": "Preston North End",
    "shortName": "Preston",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8411.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8411",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "",
    "teamId": "EFL Championship|Queens Park Rangers",
    "names": [
      "Queens Park Rangers",
      "QPR"
    ],
    "name": "Queens Park Rangers",
    "shortName": "QPR",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10172.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10172",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "",
    "teamId": "EFL Championship|Rotherham United",
    "names": [
      "Rotherham United",
      "Rotherham"
    ],
    "name": "Rotherham United",
    "shortName": "Rotherham",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8119.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8119",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "",
    "teamId": "EFL Championship|Sheffield United",
    "names": [
      "Sheffield United",
      "Sheff Utd"
    ],
    "name": "Sheffield United",
    "shortName": "Sheff Utd",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8657.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8657",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "",
    "teamId": "EFL Championship|Sheffield Wednesday",
    "names": [
      "Sheffield Wednesday",
      "Sheff Wed"
    ],
    "name": "Sheffield Wednesday",
    "shortName": "Sheff Wed",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10163.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10163",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "",
    "teamId": "EFL Championship|Southampton",
    "names": [
      "Southampton",
      "Southampton"
    ],
    "name": "Southampton",
    "shortName": "Southampton",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8466.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8466",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "",
    "teamId": "EFL Championship|Stoke City",
    "names": [
      "Stoke City",
      "Stoke"
    ],
    "name": "Stoke City",
    "shortName": "Stoke",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10194.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10194",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "",
    "teamId": "EFL Championship|Sunderland",
    "names": [
      "Sunderland",
      "Sunderland"
    ],
    "name": "Sunderland",
    "shortName": "Sunderland",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8472.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8472",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "",
    "teamId": "EFL Championship|Swansea City",
    "names": [
      "Swansea City",
      "Swansea"
    ],
    "name": "Swansea City",
    "shortName": "Swansea",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10003.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10003",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "",
    "teamId": "EFL Championship|Watford",
    "names": [
      "Watford",
      "Watford"
    ],
    "name": "Watford",
    "shortName": "Watford",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9817.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9817",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "",
    "teamId": "EFL Championship|West Bromwich Albion",
    "names": [
      "West Bromwich Albion",
      "West Brom"
    ],
    "name": "West Bromwich Albion",
    "shortName": "West Brom",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8659.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8659",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "",
    "teamId": "EFL Championship|West Ham United",
    "names": [
      "West Ham United",
      "West Ham"
    ],
    "name": "West Ham United",
    "shortName": "West Ham",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8654.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8654",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "",
    "teamId": "EFL Championship|Wolverhampton Wanderers",
    "names": [
      "Wolverhampton Wanderers",
      "Wolves"
    ],
    "name": "Wolverhampton Wanderers",
    "shortName": "Wolves",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8602.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8602",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "",
    "teamId": "EFL Championship|Wrexham",
    "names": [
      "Wrexham",
      "Wrexham"
    ],
    "name": "Wrexham",
    "shortName": "Wrexham",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9841.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9841",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "",
    "teamId": "Ekstraklasa|Arka Gdynia",
    "names": [
      "Arka Gdynia",
      "Arka Gdynia"
    ],
    "name": "Arka Gdynia",
    "shortName": "Arka Gdynia",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8322.png",
    "country": "POL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8322",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=196"
  },
  {
    "espnId": "",
    "teamId": "Ekstraklasa|Cracovia",
    "names": [
      "Cracovia",
      "Cracovia"
    ],
    "name": "Cracovia",
    "shortName": "Cracovia",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/2186.png",
    "country": "POL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "2186",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=196"
  },
  {
    "espnId": "",
    "teamId": "Ekstraklasa|GKS Katowice",
    "names": [
      "GKS Katowice",
      "GKS Katowice"
    ],
    "name": "GKS Katowice",
    "shortName": "GKS Katowice",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/4023.png",
    "country": "POL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "4023",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=196"
  },
  {
    "espnId": "",
    "teamId": "Ekstraklasa|Górnik Zabrze",
    "names": [
      "Górnik Zabrze",
      "Górnik Zabrze"
    ],
    "name": "Górnik Zabrze",
    "shortName": "Górnik Zabrze",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8020.png",
    "country": "POL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8020",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=196"
  },
  {
    "espnId": "",
    "teamId": "Ekstraklasa|Jagiellonia Białystok",
    "names": [
      "Jagiellonia Białystok",
      "Jagiellonia Białystok"
    ],
    "name": "Jagiellonia Białystok",
    "shortName": "Jagiellonia Białystok",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1957.png",
    "country": "POL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1957",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=196"
  },
  {
    "espnId": "",
    "teamId": "Ekstraklasa|Korona Kielce",
    "names": [
      "Korona Kielce",
      "Korona Kielce"
    ],
    "name": "Korona Kielce",
    "shortName": "Korona Kielce",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8245.png",
    "country": "POL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8245",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=196"
  },
  {
    "espnId": "",
    "teamId": "Ekstraklasa|Lech Poznań",
    "names": [
      "Lech Poznań",
      "Lech Poznań"
    ],
    "name": "Lech Poznań",
    "shortName": "Lech Poznań",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/2182.png",
    "country": "POL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "2182",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=196"
  },
  {
    "espnId": "",
    "teamId": "Ekstraklasa|Lechia Gdańsk",
    "names": [
      "Lechia Gdańsk",
      "Lechia Gdańsk"
    ],
    "name": "Lechia Gdańsk",
    "shortName": "Lechia Gdańsk",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8030.png",
    "country": "POL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8030",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=196"
  },
  {
    "espnId": "",
    "teamId": "Ekstraklasa|Legia Warszawa",
    "names": [
      "Legia Warszawa",
      "Legia Warszawa"
    ],
    "name": "Legia Warszawa",
    "shortName": "Legia Warszawa",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8673.png",
    "country": "POL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8673",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=196"
  },
  {
    "espnId": "",
    "teamId": "Ekstraklasa|ŁKS Łódź",
    "names": [
      "ŁKS Łódź",
      "ŁKS Łódź"
    ],
    "name": "ŁKS Łódź",
    "shortName": "ŁKS Łódź",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8244.png",
    "country": "POL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8244",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=196"
  },
  {
    "espnId": "",
    "teamId": "Ekstraklasa|Motor Lublin",
    "names": [
      "Motor Lublin",
      "Motor Lublin"
    ],
    "name": "Motor Lublin",
    "shortName": "Motor Lublin",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/89466.png",
    "country": "POL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "89466",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=196"
  },
  {
    "espnId": "",
    "teamId": "Ekstraklasa|Piast Gliwice",
    "names": [
      "Piast Gliwice",
      "Piast Gliwice"
    ],
    "name": "Piast Gliwice",
    "shortName": "Piast Gliwice",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8028.png",
    "country": "POL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8028",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=196"
  },
  {
    "espnId": "",
    "teamId": "Ekstraklasa|Pogoń Szczecin",
    "names": [
      "Pogoń Szczecin",
      "Pogoń Szczecin"
    ],
    "name": "Pogoń Szczecin",
    "shortName": "Pogoń Szczecin",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8023.png",
    "country": "POL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8023",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=196"
  },
  {
    "espnId": "",
    "teamId": "Ekstraklasa|Puszcza Niepołomice",
    "names": [
      "Puszcza Niepołomice",
      "Puszcza Niepołomice"
    ],
    "name": "Puszcza Niepołomice",
    "shortName": "Puszcza Niepołomice",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/205870.png",
    "country": "POL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "205870",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=196"
  },
  {
    "espnId": "",
    "teamId": "Ekstraklasa|Radomiak Radom",
    "names": [
      "Radomiak Radom",
      "Radomiak Radom"
    ],
    "name": "Radomiak Radom",
    "shortName": "Radomiak Radom",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/5769.png",
    "country": "POL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "5769",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=196"
  },
  {
    "espnId": "",
    "teamId": "Ekstraklasa|Raków Częstochowa",
    "names": [
      "Raków Częstochowa",
      "Raków Częstochowa"
    ],
    "name": "Raków Częstochowa",
    "shortName": "Raków Częstochowa",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/4024.png",
    "country": "POL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "4024",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=196"
  },
  {
    "espnId": "",
    "teamId": "Ekstraklasa|Ruch Chorzów",
    "names": [
      "Ruch Chorzów",
      "Ruch Chorzów"
    ],
    "name": "Ruch Chorzów",
    "shortName": "Ruch Chorzów",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1601.png",
    "country": "POL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1601",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=196"
  },
  {
    "espnId": "",
    "teamId": "Ekstraklasa|Śląsk Wrocław",
    "names": [
      "Śląsk Wrocław",
      "Śląsk Wrocław"
    ],
    "name": "Śląsk Wrocław",
    "shortName": "Śląsk Wrocław",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8025.png",
    "country": "POL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8025",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=196"
  },
  {
    "espnId": "",
    "teamId": "Ekstraklasa|Stal Mielec",
    "names": [
      "Stal Mielec",
      "Stal Mielec"
    ],
    "name": "Stal Mielec",
    "shortName": "Stal Mielec",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/458623.png",
    "country": "POL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "458623",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=196"
  },
  {
    "espnId": "",
    "teamId": "Ekstraklasa|Termalica Nieciecza",
    "names": [
      "Termalica Nieciecza",
      "Termalica Nieciecza"
    ],
    "name": "Termalica Nieciecza",
    "shortName": "Termalica Nieciecza",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/177361.png",
    "country": "POL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "177361",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=196"
  },
  {
    "espnId": "",
    "teamId": "Ekstraklasa|Warta Poznań",
    "names": [
      "Warta Poznań",
      "Warta Poznań"
    ],
    "name": "Warta Poznań",
    "shortName": "Warta Poznań",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/89467.png",
    "country": "POL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "89467",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=196"
  },
  {
    "espnId": "",
    "teamId": "Ekstraklasa|Widzew Łódź",
    "names": [
      "Widzew Łódź",
      "Widzew Łódź"
    ],
    "name": "Widzew Łódź",
    "shortName": "Widzew Łódź",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8024.png",
    "country": "POL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8024",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=196"
  },
  {
    "espnId": "",
    "teamId": "Ekstraklasa|Wieczysta Kraków",
    "names": [
      "Wieczysta Kraków",
      "Wieczysta Kraków"
    ],
    "name": "Wieczysta Kraków",
    "shortName": "Wieczysta Kraków",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1286895.png",
    "country": "POL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1286895",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=196"
  },
  {
    "espnId": "",
    "teamId": "Ekstraklasa|Wisła Kraków",
    "names": [
      "Wisła Kraków",
      "Wisła Kraków"
    ],
    "name": "Wisła Kraków",
    "shortName": "Wisła Kraków",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10265.png",
    "country": "POL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10265",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=196"
  },
  {
    "espnId": "",
    "teamId": "Ekstraklasa|Wisła Płock",
    "names": [
      "Wisła Płock",
      "Wisła Płock"
    ],
    "name": "Wisła Płock",
    "shortName": "Wisła Płock",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8243.png",
    "country": "POL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8243",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=196"
  },
  {
    "espnId": "",
    "teamId": "Ekstraklasa|Zagłębie Lubin",
    "names": [
      "Zagłębie Lubin",
      "Zagłębie Lubin"
    ],
    "name": "Zagłębie Lubin",
    "shortName": "Zagłębie Lubin",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8021.png",
    "country": "POL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8021",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=196"
  },
  {
    "espnId": "",
    "teamId": "Eliteserien|Aalesund",
    "names": [
      "Aalesund",
      "Aalesund"
    ],
    "name": "Aalesund",
    "shortName": "Aalesund",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8404.png",
    "country": "NOR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8404",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=59"
  },
  {
    "espnId": "",
    "teamId": "Eliteserien|Bodø/Glimt",
    "names": [
      "Bodø/Glimt",
      "Bodø/Glimt"
    ],
    "name": "Bodø/Glimt",
    "shortName": "Bodø/Glimt",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8402.png",
    "country": "NOR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8402",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=59"
  },
  {
    "espnId": "",
    "teamId": "Eliteserien|Brann",
    "names": [
      "Brann",
      "Brann"
    ],
    "name": "Brann",
    "shortName": "Brann",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8468.png",
    "country": "NOR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8468",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=59"
  },
  {
    "espnId": "",
    "teamId": "Eliteserien|Bryne",
    "names": [
      "Bryne",
      "Bryne"
    ],
    "name": "Bryne",
    "shortName": "Bryne",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8531.png",
    "country": "NOR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8531",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=59"
  },
  {
    "espnId": "",
    "teamId": "Eliteserien|FK Haugesund",
    "names": [
      "FK Haugesund",
      "FK Haugesund"
    ],
    "name": "FK Haugesund",
    "shortName": "FK Haugesund",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8512.png",
    "country": "NOR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8512",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=59"
  },
  {
    "espnId": "",
    "teamId": "Eliteserien|Fredrikstad",
    "names": [
      "Fredrikstad",
      "Fredrikstad"
    ],
    "name": "Fredrikstad",
    "shortName": "Fredrikstad",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8417.png",
    "country": "NOR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8417",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=59"
  },
  {
    "espnId": "",
    "teamId": "Eliteserien|Hamarkameratene",
    "names": [
      "Hamarkameratene",
      "HamKam"
    ],
    "name": "Hamarkameratene",
    "shortName": "HamKam",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8448.png",
    "country": "NOR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8448",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=59"
  },
  {
    "espnId": "",
    "teamId": "Eliteserien|KFUM",
    "names": [
      "KFUM",
      "KFUM"
    ],
    "name": "KFUM",
    "shortName": "KFUM",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/2305.png",
    "country": "NOR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "2305",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=59"
  },
  {
    "espnId": "",
    "teamId": "Eliteserien|Kristiansund",
    "names": [
      "Kristiansund",
      "Kristiansund"
    ],
    "name": "Kristiansund",
    "shortName": "Kristiansund",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8605.png",
    "country": "NOR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8605",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=59"
  },
  {
    "espnId": "",
    "teamId": "Eliteserien|Lillestrøm",
    "names": [
      "Lillestrøm",
      "Lillestrøm"
    ],
    "name": "Lillestrøm",
    "shortName": "Lillestrøm",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8476.png",
    "country": "NOR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8476",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=59"
  },
  {
    "espnId": "",
    "teamId": "Eliteserien|Molde",
    "names": [
      "Molde",
      "Molde"
    ],
    "name": "Molde",
    "shortName": "Molde",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9917.png",
    "country": "NOR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9917",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=59"
  },
  {
    "espnId": "",
    "teamId": "Eliteserien|Odds Ballklubb",
    "names": [
      "Odds Ballklubb",
      "Odd"
    ],
    "name": "Odds Ballklubb",
    "shortName": "Odd",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/7988.png",
    "country": "NOR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "7988",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=59"
  },
  {
    "espnId": "",
    "teamId": "Eliteserien|Rosenborg",
    "names": [
      "Rosenborg",
      "Rosenborg"
    ],
    "name": "Rosenborg",
    "shortName": "Rosenborg",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8422.png",
    "country": "NOR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8422",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=59"
  },
  {
    "espnId": "",
    "teamId": "Eliteserien|Sandefjord",
    "names": [
      "Sandefjord",
      "Sandefjord"
    ],
    "name": "Sandefjord",
    "shortName": "Sandefjord",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8609.png",
    "country": "NOR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8609",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=59"
  },
  {
    "espnId": "",
    "teamId": "Eliteserien|Sarpsborg 08",
    "names": [
      "Sarpsborg 08",
      "Sarpsborg 08"
    ],
    "name": "Sarpsborg 08",
    "shortName": "Sarpsborg 08",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8509.png",
    "country": "NOR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8509",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=59"
  },
  {
    "espnId": "",
    "teamId": "Eliteserien|Stabæk",
    "names": [
      "Stabæk",
      "Stabæk"
    ],
    "name": "Stabæk",
    "shortName": "Stabæk",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9918.png",
    "country": "NOR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9918",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=59"
  },
  {
    "espnId": "",
    "teamId": "Eliteserien|Start",
    "names": [
      "Start",
      "Start"
    ],
    "name": "Start",
    "shortName": "Start",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9919.png",
    "country": "NOR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9919",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=59"
  },
  {
    "espnId": "",
    "teamId": "Eliteserien|Strømsgodset",
    "names": [
      "Strømsgodset",
      "Strømsgodset"
    ],
    "name": "Strømsgodset",
    "shortName": "Strømsgodset",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8180.png",
    "country": "NOR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8180",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=59"
  },
  {
    "espnId": "",
    "teamId": "Eliteserien|Tromsø",
    "names": [
      "Tromsø",
      "Tromsø"
    ],
    "name": "Tromsø",
    "shortName": "Tromsø",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8608.png",
    "country": "NOR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8608",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=59"
  },
  {
    "espnId": "",
    "teamId": "Eliteserien|Vålerenga",
    "names": [
      "Vålerenga",
      "Vålerenga"
    ],
    "name": "Vålerenga",
    "shortName": "Vålerenga",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8007.png",
    "country": "NOR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8007",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=59"
  },
  {
    "espnId": "",
    "teamId": "Eliteserien|Viking",
    "names": [
      "Viking",
      "Viking"
    ],
    "name": "Viking",
    "shortName": "Viking",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8478.png",
    "country": "NOR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8478",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=59"
  },
  {
    "espnId": "",
    "teamId": "Eredivisie|ADO Den Haag",
    "names": [
      "ADO Den Haag",
      "ADO Den Haag"
    ],
    "name": "ADO Den Haag",
    "shortName": "ADO Den Haag",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10217.png",
    "country": "NED",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10217",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=57"
  },
  {
    "espnId": "",
    "teamId": "Eredivisie|Ajax",
    "names": [
      "Ajax",
      "Ajax"
    ],
    "name": "Ajax",
    "shortName": "Ajax",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8593.png",
    "country": "NED",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8593",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=57"
  },
  {
    "espnId": "",
    "teamId": "Eredivisie|Almere City FC",
    "names": [
      "Almere City FC",
      "Almere City FC"
    ],
    "name": "Almere City FC",
    "shortName": "Almere City FC",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/4116.png",
    "country": "NED",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "4116",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=57"
  },
  {
    "espnId": "",
    "teamId": "Eredivisie|AZ Alkmaar",
    "names": [
      "AZ Alkmaar",
      "AZ Alkmaar"
    ],
    "name": "AZ Alkmaar",
    "shortName": "AZ Alkmaar",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10229.png",
    "country": "NED",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10229",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=57"
  },
  {
    "espnId": "",
    "teamId": "Eredivisie|Cambuur",
    "names": [
      "Cambuur",
      "Cambuur"
    ],
    "name": "Cambuur",
    "shortName": "Cambuur",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/7788.png",
    "country": "NED",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "7788",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=57"
  },
  {
    "espnId": "",
    "teamId": "Eredivisie|Excelsior",
    "names": [
      "Excelsior",
      "Excelsior"
    ],
    "name": "Excelsior",
    "shortName": "Excelsior",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10218.png",
    "country": "NED",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10218",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=57"
  },
  {
    "espnId": "",
    "teamId": "Eredivisie|FC Groningen",
    "names": [
      "FC Groningen",
      "FC Groningen"
    ],
    "name": "FC Groningen",
    "shortName": "FC Groningen",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8674.png",
    "country": "NED",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8674",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=57"
  },
  {
    "espnId": "",
    "teamId": "Eredivisie|FC Twente",
    "names": [
      "FC Twente",
      "FC Twente"
    ],
    "name": "FC Twente",
    "shortName": "FC Twente",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8611.png",
    "country": "NED",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8611",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=57"
  },
  {
    "espnId": "",
    "teamId": "Eredivisie|FC Utrecht",
    "names": [
      "FC Utrecht",
      "FC Utrecht"
    ],
    "name": "FC Utrecht",
    "shortName": "FC Utrecht",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9908.png",
    "country": "NED",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9908",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=57"
  },
  {
    "espnId": "",
    "teamId": "Eredivisie|FC Volendam",
    "names": [
      "FC Volendam",
      "FC Volendam"
    ],
    "name": "FC Volendam",
    "shortName": "FC Volendam",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6601.png",
    "country": "NED",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6601",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=57"
  },
  {
    "espnId": "",
    "teamId": "Eredivisie|Feyenoord",
    "names": [
      "Feyenoord",
      "Feyenoord"
    ],
    "name": "Feyenoord",
    "shortName": "Feyenoord",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10235.png",
    "country": "NED",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10235",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=57"
  },
  {
    "espnId": "",
    "teamId": "Eredivisie|Fortuna Sittard",
    "names": [
      "Fortuna Sittard",
      "Fortuna Sittard"
    ],
    "name": "Fortuna Sittard",
    "shortName": "Fortuna Sittard",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6422.png",
    "country": "NED",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6422",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=57"
  },
  {
    "espnId": "",
    "teamId": "Eredivisie|Go Ahead Eagles",
    "names": [
      "Go Ahead Eagles",
      "Go Ahead Eagles"
    ],
    "name": "Go Ahead Eagles",
    "shortName": "Go Ahead Eagles",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6433.png",
    "country": "NED",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6433",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=57"
  },
  {
    "espnId": "",
    "teamId": "Eredivisie|Heracles",
    "names": [
      "Heracles",
      "Heracles"
    ],
    "name": "Heracles",
    "shortName": "Heracles",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9791.png",
    "country": "NED",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9791",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=57"
  },
  {
    "espnId": "",
    "teamId": "Eredivisie|NAC Breda",
    "names": [
      "NAC Breda",
      "NAC Breda"
    ],
    "name": "NAC Breda",
    "shortName": "NAC Breda",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9761.png",
    "country": "NED",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9761",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=57"
  },
  {
    "espnId": "",
    "teamId": "Eredivisie|NEC Nijmegen",
    "names": [
      "NEC Nijmegen",
      "NEC Nijmegen"
    ],
    "name": "NEC Nijmegen",
    "shortName": "NEC Nijmegen",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8464.png",
    "country": "NED",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8464",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=57"
  },
  {
    "espnId": "",
    "teamId": "Eredivisie|PEC Zwolle",
    "names": [
      "PEC Zwolle",
      "PEC Zwolle"
    ],
    "name": "PEC Zwolle",
    "shortName": "PEC Zwolle",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6413.png",
    "country": "NED",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6413",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=57"
  },
  {
    "espnId": "",
    "teamId": "Eredivisie|PSV Eindhoven",
    "names": [
      "PSV Eindhoven",
      "PSV Eindhoven"
    ],
    "name": "PSV Eindhoven",
    "shortName": "PSV Eindhoven",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8640.png",
    "country": "NED",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8640",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=57"
  },
  {
    "espnId": "",
    "teamId": "Eredivisie|RKC Waalwijk",
    "names": [
      "RKC Waalwijk",
      "RKC Waalwijk"
    ],
    "name": "RKC Waalwijk",
    "shortName": "RKC Waalwijk",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10219.png",
    "country": "NED",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10219",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=57"
  },
  {
    "espnId": "",
    "teamId": "Eredivisie|SC Heerenveen",
    "names": [
      "SC Heerenveen",
      "SC Heerenveen"
    ],
    "name": "SC Heerenveen",
    "shortName": "SC Heerenveen",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10228.png",
    "country": "NED",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10228",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=57"
  },
  {
    "espnId": "",
    "teamId": "Eredivisie|Sparta Rotterdam",
    "names": [
      "Sparta Rotterdam",
      "Sparta Rotterdam"
    ],
    "name": "Sparta Rotterdam",
    "shortName": "Sparta Rotterdam",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8614.png",
    "country": "NED",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8614",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=57"
  },
  {
    "espnId": "",
    "teamId": "Eredivisie|Telstar",
    "names": [
      "Telstar",
      "Telstar"
    ],
    "name": "Telstar",
    "shortName": "Telstar",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6414.png",
    "country": "NED",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6414",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=57"
  },
  {
    "espnId": "",
    "teamId": "Eredivisie|Vitesse",
    "names": [
      "Vitesse",
      "Vitesse"
    ],
    "name": "Vitesse",
    "shortName": "Vitesse",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8277.png",
    "country": "NED",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8277",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=57"
  },
  {
    "espnId": "",
    "teamId": "Eredivisie|Willem II",
    "names": [
      "Willem II",
      "Willem II"
    ],
    "name": "Willem II",
    "shortName": "Willem II",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8525.png",
    "country": "NED",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8525",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=57"
  },
  {
    "espnId": "",
    "teamId": "LaLiga|Almería",
    "names": [
      "Almería",
      "Almería"
    ],
    "name": "Almería",
    "shortName": "Almería",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9865.png",
    "country": "ESP",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9865",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=87"
  },
  {
    "espnId": "",
    "teamId": "LaLiga|Athletic Club",
    "names": [
      "Athletic Club",
      "Athletic Club"
    ],
    "name": "Athletic Club",
    "shortName": "Athletic Club",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8315.png",
    "country": "ESP",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8315",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=87"
  },
  {
    "espnId": "",
    "teamId": "LaLiga|Atlético Madrid",
    "names": [
      "Atlético Madrid",
      "Atlético Madrid"
    ],
    "name": "Atlético Madrid",
    "shortName": "Atlético Madrid",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9906.png",
    "country": "ESP",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9906",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=87"
  },
  {
    "espnId": "",
    "teamId": "LaLiga|Barcelona",
    "names": [
      "Barcelona",
      "Barcelona"
    ],
    "name": "Barcelona",
    "shortName": "Barcelona",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8634.png",
    "country": "ESP",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8634",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=87"
  },
  {
    "espnId": "",
    "teamId": "LaLiga|Cádiz",
    "names": [
      "Cádiz",
      "Cádiz"
    ],
    "name": "Cádiz",
    "shortName": "Cádiz",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8385.png",
    "country": "ESP",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8385",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=87"
  },
  {
    "espnId": "",
    "teamId": "LaLiga|Celta Vigo",
    "names": [
      "Celta Vigo",
      "Celta Vigo"
    ],
    "name": "Celta Vigo",
    "shortName": "Celta Vigo",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9910.png",
    "country": "ESP",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9910",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=87"
  },
  {
    "espnId": "",
    "teamId": "LaLiga|Deportivo A Coruña",
    "names": [
      "Deportivo A Coruña",
      "Deportivo A Coruña"
    ],
    "name": "Deportivo A Coruña",
    "shortName": "Deportivo A Coruña",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9783.png",
    "country": "ESP",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9783",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=87"
  },
  {
    "espnId": "",
    "teamId": "LaLiga|Deportivo Alavés",
    "names": [
      "Deportivo Alavés",
      "Deportivo Alavés"
    ],
    "name": "Deportivo Alavés",
    "shortName": "Deportivo Alavés",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9866.png",
    "country": "ESP",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9866",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=87"
  },
  {
    "espnId": "",
    "teamId": "LaLiga|Elche",
    "names": [
      "Elche",
      "Elche"
    ],
    "name": "Elche",
    "shortName": "Elche",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10268.png",
    "country": "ESP",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10268",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=87"
  },
  {
    "espnId": "",
    "teamId": "LaLiga|Espanyol",
    "names": [
      "Espanyol",
      "Espanyol"
    ],
    "name": "Espanyol",
    "shortName": "Espanyol",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8558.png",
    "country": "ESP",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8558",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=87"
  },
  {
    "espnId": "",
    "teamId": "LaLiga|Getafe",
    "names": [
      "Getafe",
      "Getafe"
    ],
    "name": "Getafe",
    "shortName": "Getafe",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8305.png",
    "country": "ESP",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8305",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=87"
  },
  {
    "espnId": "",
    "teamId": "LaLiga|Girona",
    "names": [
      "Girona",
      "Girona"
    ],
    "name": "Girona",
    "shortName": "Girona",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/7732.png",
    "country": "ESP",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "7732",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=87"
  },
  {
    "espnId": "",
    "teamId": "LaLiga|Granada",
    "names": [
      "Granada",
      "Granada"
    ],
    "name": "Granada",
    "shortName": "Granada",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/7878.png",
    "country": "ESP",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "7878",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=87"
  },
  {
    "espnId": "",
    "teamId": "LaLiga|Las Palmas",
    "names": [
      "Las Palmas",
      "Las Palmas"
    ],
    "name": "Las Palmas",
    "shortName": "Las Palmas",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8306.png",
    "country": "ESP",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8306",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=87"
  },
  {
    "espnId": "",
    "teamId": "LaLiga|Leganés",
    "names": [
      "Leganés",
      "Leganés"
    ],
    "name": "Leganés",
    "shortName": "Leganés",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/7854.png",
    "country": "ESP",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "7854",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=87"
  },
  {
    "espnId": "",
    "teamId": "LaLiga|Levante",
    "names": [
      "Levante",
      "Levante"
    ],
    "name": "Levante",
    "shortName": "Levante",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8581.png",
    "country": "ESP",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8581",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=87"
  },
  {
    "espnId": "",
    "teamId": "LaLiga|Málaga",
    "names": [
      "Málaga",
      "Málaga"
    ],
    "name": "Málaga",
    "shortName": "Málaga",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9864.png",
    "country": "ESP",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9864",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=87"
  },
  {
    "espnId": "",
    "teamId": "LaLiga|Mallorca",
    "names": [
      "Mallorca",
      "Mallorca"
    ],
    "name": "Mallorca",
    "shortName": "Mallorca",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8661.png",
    "country": "ESP",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8661",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=87"
  },
  {
    "espnId": "",
    "teamId": "LaLiga|Osasuna",
    "names": [
      "Osasuna",
      "Osasuna"
    ],
    "name": "Osasuna",
    "shortName": "Osasuna",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8371.png",
    "country": "ESP",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8371",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=87"
  },
  {
    "espnId": "",
    "teamId": "LaLiga|Racing Santander",
    "names": [
      "Racing Santander",
      "Racing Santander"
    ],
    "name": "Racing Santander",
    "shortName": "Racing Santander",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8696.png",
    "country": "ESP",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8696",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=87"
  },
  {
    "espnId": "",
    "teamId": "LaLiga|Rayo Vallecano",
    "names": [
      "Rayo Vallecano",
      "Rayo Vallecano"
    ],
    "name": "Rayo Vallecano",
    "shortName": "Rayo Vallecano",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8370.png",
    "country": "ESP",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8370",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=87"
  },
  {
    "espnId": "",
    "teamId": "LaLiga|Real Betis",
    "names": [
      "Real Betis",
      "Real Betis"
    ],
    "name": "Real Betis",
    "shortName": "Real Betis",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8603.png",
    "country": "ESP",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8603",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=87"
  },
  {
    "espnId": "",
    "teamId": "LaLiga|Real Madrid",
    "names": [
      "Real Madrid",
      "Real Madrid"
    ],
    "name": "Real Madrid",
    "shortName": "Real Madrid",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8633.png",
    "country": "ESP",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8633",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=87"
  },
  {
    "espnId": "",
    "teamId": "LaLiga|Real Oviedo",
    "names": [
      "Real Oviedo",
      "Real Oviedo"
    ],
    "name": "Real Oviedo",
    "shortName": "Real Oviedo",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8670.png",
    "country": "ESP",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8670",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=87"
  },
  {
    "espnId": "",
    "teamId": "LaLiga|Real Sociedad",
    "names": [
      "Real Sociedad",
      "Real Sociedad"
    ],
    "name": "Real Sociedad",
    "shortName": "Real Sociedad",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8560.png",
    "country": "ESP",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8560",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=87"
  },
  {
    "espnId": "",
    "teamId": "LaLiga|Real Valladolid",
    "names": [
      "Real Valladolid",
      "Real Valladolid"
    ],
    "name": "Real Valladolid",
    "shortName": "Real Valladolid",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10281.png",
    "country": "ESP",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10281",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=87"
  },
  {
    "espnId": "",
    "teamId": "LaLiga|Sevilla",
    "names": [
      "Sevilla",
      "Sevilla"
    ],
    "name": "Sevilla",
    "shortName": "Sevilla",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8302.png",
    "country": "ESP",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8302",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=87"
  },
  {
    "espnId": "",
    "teamId": "LaLiga|Valencia",
    "names": [
      "Valencia",
      "Valencia"
    ],
    "name": "Valencia",
    "shortName": "Valencia",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10267.png",
    "country": "ESP",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10267",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=87"
  },
  {
    "espnId": "",
    "teamId": "LaLiga|Villarreal",
    "names": [
      "Villarreal",
      "Villarreal"
    ],
    "name": "Villarreal",
    "shortName": "Villarreal",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10205.png",
    "country": "ESP",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10205",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=87"
  },
  {
    "espnId": "",
    "teamId": "Liga Portugal (Primeira Liga)|Académico Viseu",
    "names": [
      "Académico Viseu",
      "Académico Viseu"
    ],
    "name": "Académico Viseu",
    "shortName": "Académico Viseu",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1786.png",
    "country": "POR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1786",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=61"
  },
  {
    "espnId": "",
    "teamId": "Liga Portugal (Primeira Liga)|Alverca",
    "names": [
      "Alverca",
      "Alverca"
    ],
    "name": "Alverca",
    "shortName": "Alverca",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9780.png",
    "country": "POR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9780",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=61"
  },
  {
    "espnId": "",
    "teamId": "Liga Portugal (Primeira Liga)|Arouca",
    "names": [
      "Arouca",
      "Arouca"
    ],
    "name": "Arouca",
    "shortName": "Arouca",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/158085.png",
    "country": "POR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "158085",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=61"
  },
  {
    "espnId": "",
    "teamId": "Liga Portugal (Primeira Liga)|AVS Futebol SAD",
    "names": [
      "AVS Futebol SAD",
      "AVS Futebol SAD"
    ],
    "name": "AVS Futebol SAD",
    "shortName": "AVS Futebol SAD",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1889.png",
    "country": "POR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1889",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=61"
  },
  {
    "espnId": "",
    "teamId": "Liga Portugal (Primeira Liga)|Benfica",
    "names": [
      "Benfica",
      "Benfica"
    ],
    "name": "Benfica",
    "shortName": "Benfica",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9772.png",
    "country": "POR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9772",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=61"
  },
  {
    "espnId": "",
    "teamId": "Liga Portugal (Primeira Liga)|Boavista",
    "names": [
      "Boavista",
      "Boavista"
    ],
    "name": "Boavista",
    "shortName": "Boavista",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8613.png",
    "country": "POR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8613",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=61"
  },
  {
    "espnId": "",
    "teamId": "Liga Portugal (Primeira Liga)|Braga",
    "names": [
      "Braga",
      "Braga"
    ],
    "name": "Braga",
    "shortName": "Braga",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10264.png",
    "country": "POR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10264",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=61"
  },
  {
    "espnId": "",
    "teamId": "Liga Portugal (Primeira Liga)|Casa Pia AC",
    "names": [
      "Casa Pia AC",
      "Casa Pia AC"
    ],
    "name": "Casa Pia AC",
    "shortName": "Casa Pia AC",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/212821.png",
    "country": "POR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "212821",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=61"
  },
  {
    "espnId": "",
    "teamId": "Liga Portugal (Primeira Liga)|Chaves",
    "names": [
      "Chaves",
      "Chaves"
    ],
    "name": "Chaves",
    "shortName": "Chaves",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9774.png",
    "country": "POR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9774",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=61"
  },
  {
    "espnId": "",
    "teamId": "Liga Portugal (Primeira Liga)|Estoril",
    "names": [
      "Estoril",
      "Estoril"
    ],
    "name": "Estoril",
    "shortName": "Estoril",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/7842.png",
    "country": "POR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "7842",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=61"
  },
  {
    "espnId": "",
    "teamId": "Liga Portugal (Primeira Liga)|Estrela da Amadora",
    "names": [
      "Estrela da Amadora",
      "Estrela da Amadora"
    ],
    "name": "Estrela da Amadora",
    "shortName": "Estrela da Amadora",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1074320.png",
    "country": "POR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1074320",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=61"
  },
  {
    "espnId": "",
    "teamId": "Liga Portugal (Primeira Liga)|Famalicão",
    "names": [
      "Famalicão",
      "Famalicão"
    ],
    "name": "Famalicão",
    "shortName": "Famalicão",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1634.png",
    "country": "POR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1634",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=61"
  },
  {
    "espnId": "",
    "teamId": "Liga Portugal (Primeira Liga)|Farense",
    "names": [
      "Farense",
      "Farense"
    ],
    "name": "Farense",
    "shortName": "Farense",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6004.png",
    "country": "POR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6004",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=61"
  },
  {
    "espnId": "",
    "teamId": "Liga Portugal (Primeira Liga)|FC Porto",
    "names": [
      "FC Porto",
      "FC Porto"
    ],
    "name": "FC Porto",
    "shortName": "FC Porto",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9773.png",
    "country": "POR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9773",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=61"
  },
  {
    "espnId": "",
    "teamId": "Liga Portugal (Primeira Liga)|Gil Vicente",
    "names": [
      "Gil Vicente",
      "Gil Vicente"
    ],
    "name": "Gil Vicente",
    "shortName": "Gil Vicente",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9764.png",
    "country": "POR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9764",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=61"
  },
  {
    "espnId": "",
    "teamId": "Liga Portugal (Primeira Liga)|Marítimo",
    "names": [
      "Marítimo",
      "Marítimo"
    ],
    "name": "Marítimo",
    "shortName": "Marítimo",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10212.png",
    "country": "POR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10212",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=61"
  },
  {
    "espnId": "",
    "teamId": "Liga Portugal (Primeira Liga)|Moreirense",
    "names": [
      "Moreirense",
      "Moreirense"
    ],
    "name": "Moreirense",
    "shortName": "Moreirense",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8348.png",
    "country": "POR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8348",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=61"
  },
  {
    "espnId": "",
    "teamId": "Liga Portugal (Primeira Liga)|Nacional",
    "names": [
      "Nacional",
      "Nacional"
    ],
    "name": "Nacional",
    "shortName": "Nacional",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10214.png",
    "country": "POR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10214",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=61"
  },
  {
    "espnId": "",
    "teamId": "Liga Portugal (Primeira Liga)|Portimonense",
    "names": [
      "Portimonense",
      "Portimonense"
    ],
    "name": "Portimonense",
    "shortName": "Portimonense",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9765.png",
    "country": "POR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9765",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=61"
  },
  {
    "espnId": "",
    "teamId": "Liga Portugal (Primeira Liga)|Rio Ave",
    "names": [
      "Rio Ave",
      "Rio Ave"
    ],
    "name": "Rio Ave",
    "shortName": "Rio Ave",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/7841.png",
    "country": "POR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "7841",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=61"
  },
  {
    "espnId": "",
    "teamId": "Liga Portugal (Primeira Liga)|Santa Clara",
    "names": [
      "Santa Clara",
      "Santa Clara"
    ],
    "name": "Santa Clara",
    "shortName": "Santa Clara",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1567.png",
    "country": "POR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1567",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=61"
  },
  {
    "espnId": "",
    "teamId": "Liga Portugal (Primeira Liga)|Sporting CP",
    "names": [
      "Sporting CP",
      "Sporting CP"
    ],
    "name": "Sporting CP",
    "shortName": "Sporting CP",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9768.png",
    "country": "POR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9768",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=61"
  },
  {
    "espnId": "",
    "teamId": "Liga Portugal (Primeira Liga)|Tondela",
    "names": [
      "Tondela",
      "Tondela"
    ],
    "name": "Tondela",
    "shortName": "Tondela",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/188163.png",
    "country": "POR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "188163",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=61"
  },
  {
    "espnId": "",
    "teamId": "Liga Portugal (Primeira Liga)|Vitória de Guimarães",
    "names": [
      "Vitória de Guimarães",
      "Vitória de Guimarães"
    ],
    "name": "Vitória de Guimarães",
    "shortName": "Vitória de Guimarães",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/7844.png",
    "country": "POR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "7844",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=61"
  },
  {
    "espnId": "",
    "teamId": "Liga Portugal (Primeira Liga)|Vizela",
    "names": [
      "Vizela",
      "Vizela"
    ],
    "name": "Vizela",
    "shortName": "Vizela",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/4531.png",
    "country": "POR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "4531",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=61"
  },
  {
    "espnId": "",
    "teamId": "Ligue 1|Angers",
    "names": [
      "Angers",
      "Angers"
    ],
    "name": "Angers",
    "shortName": "Angers",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8121.png",
    "country": "FRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8121",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=53"
  },
  {
    "espnId": "",
    "teamId": "Ligue 1|Auxerre",
    "names": [
      "Auxerre",
      "Auxerre"
    ],
    "name": "Auxerre",
    "shortName": "Auxerre",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8583.png",
    "country": "FRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8583",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=53"
  },
  {
    "espnId": "",
    "teamId": "Ligue 1|Brest",
    "names": [
      "Brest",
      "Brest"
    ],
    "name": "Brest",
    "shortName": "Brest",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8521.png",
    "country": "FRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8521",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=53"
  },
  {
    "espnId": "",
    "teamId": "Ligue 1|Clermont Foot",
    "names": [
      "Clermont Foot",
      "Clermont Foot"
    ],
    "name": "Clermont Foot",
    "shortName": "Clermont Foot",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8311.png",
    "country": "FRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8311",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=53"
  },
  {
    "espnId": "",
    "teamId": "Ligue 1|Le Havre",
    "names": [
      "Le Havre",
      "Le Havre"
    ],
    "name": "Le Havre",
    "shortName": "Le Havre",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9746.png",
    "country": "FRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9746",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=53"
  },
  {
    "espnId": "",
    "teamId": "Ligue 1|Le Mans",
    "names": [
      "Le Mans",
      "Le Mans"
    ],
    "name": "Le Mans",
    "shortName": "Le Mans",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8682.png",
    "country": "FRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8682",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=53"
  },
  {
    "espnId": "",
    "teamId": "Ligue 1|Lens",
    "names": [
      "Lens",
      "Lens"
    ],
    "name": "Lens",
    "shortName": "Lens",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8588.png",
    "country": "FRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8588",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=53"
  },
  {
    "espnId": "",
    "teamId": "Ligue 1|Lille",
    "names": [
      "Lille",
      "Lille"
    ],
    "name": "Lille",
    "shortName": "Lille",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8639.png",
    "country": "FRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8639",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=53"
  },
  {
    "espnId": "",
    "teamId": "Ligue 1|Lorient",
    "names": [
      "Lorient",
      "Lorient"
    ],
    "name": "Lorient",
    "shortName": "Lorient",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8689.png",
    "country": "FRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8689",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=53"
  },
  {
    "espnId": "",
    "teamId": "Ligue 1|Lyon",
    "names": [
      "Lyon",
      "Lyon"
    ],
    "name": "Lyon",
    "shortName": "Lyon",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9748.png",
    "country": "FRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9748",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=53"
  },
  {
    "espnId": "",
    "teamId": "Ligue 1|Marseille",
    "names": [
      "Marseille",
      "Marseille"
    ],
    "name": "Marseille",
    "shortName": "Marseille",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8592.png",
    "country": "FRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8592",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=53"
  },
  {
    "espnId": "",
    "teamId": "Ligue 1|Metz",
    "names": [
      "Metz",
      "Metz"
    ],
    "name": "Metz",
    "shortName": "Metz",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8550.png",
    "country": "FRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8550",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=53"
  },
  {
    "espnId": "",
    "teamId": "Ligue 1|Monaco",
    "names": [
      "Monaco",
      "Monaco"
    ],
    "name": "Monaco",
    "shortName": "Monaco",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9829.png",
    "country": "FRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9829",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=53"
  },
  {
    "espnId": "",
    "teamId": "Ligue 1|Montpellier",
    "names": [
      "Montpellier",
      "Montpellier"
    ],
    "name": "Montpellier",
    "shortName": "Montpellier",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10249.png",
    "country": "FRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10249",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=53"
  },
  {
    "espnId": "",
    "teamId": "Ligue 1|Nantes",
    "names": [
      "Nantes",
      "Nantes"
    ],
    "name": "Nantes",
    "shortName": "Nantes",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9830.png",
    "country": "FRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9830",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=53"
  },
  {
    "espnId": "",
    "teamId": "Ligue 1|Nice",
    "names": [
      "Nice",
      "Nice"
    ],
    "name": "Nice",
    "shortName": "Nice",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9831.png",
    "country": "FRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9831",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=53"
  },
  {
    "espnId": "",
    "teamId": "Ligue 1|Paris FC",
    "names": [
      "Paris FC",
      "Paris FC"
    ],
    "name": "Paris FC",
    "shortName": "Paris FC",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6379.png",
    "country": "FRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6379",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=53"
  },
  {
    "espnId": "",
    "teamId": "Ligue 1|Paris Saint-Germain",
    "names": [
      "Paris Saint-Germain",
      "PSG"
    ],
    "name": "Paris Saint-Germain",
    "shortName": "PSG",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9847.png",
    "country": "FRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9847",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=53"
  },
  {
    "espnId": "",
    "teamId": "Ligue 1|Reims",
    "names": [
      "Reims",
      "Reims"
    ],
    "name": "Reims",
    "shortName": "Reims",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9837.png",
    "country": "FRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9837",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=53"
  },
  {
    "espnId": "",
    "teamId": "Ligue 1|Rennes",
    "names": [
      "Rennes",
      "Rennes"
    ],
    "name": "Rennes",
    "shortName": "Rennes",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9851.png",
    "country": "FRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9851",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=53"
  },
  {
    "espnId": "",
    "teamId": "Ligue 1|Saint-Étienne",
    "names": [
      "Saint-Étienne",
      "Saint-Étienne"
    ],
    "name": "Saint-Étienne",
    "shortName": "Saint-Étienne",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9853.png",
    "country": "FRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9853",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=53"
  },
  {
    "espnId": "",
    "teamId": "Ligue 1|Strasbourg",
    "names": [
      "Strasbourg",
      "Strasbourg"
    ],
    "name": "Strasbourg",
    "shortName": "Strasbourg",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9848.png",
    "country": "FRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9848",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=53"
  },
  {
    "espnId": "",
    "teamId": "Ligue 1|Toulouse",
    "names": [
      "Toulouse",
      "Toulouse"
    ],
    "name": "Toulouse",
    "shortName": "Toulouse",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9941.png",
    "country": "FRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9941",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=53"
  },
  {
    "espnId": "",
    "teamId": "Ligue 1|Troyes",
    "names": [
      "Troyes",
      "Troyes"
    ],
    "name": "Troyes",
    "shortName": "Troyes",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10242.png",
    "country": "FRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10242",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=53"
  },
  {
    "espnId": "",
    "teamId": "Premier League|AFC Bournemouth",
    "names": [
      "AFC Bournemouth",
      "Bournemouth"
    ],
    "name": "AFC Bournemouth",
    "shortName": "Bournemouth",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8678.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8678",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=47"
  },
  {
    "espnId": "",
    "teamId": "Premier League|Arsenal",
    "names": [
      "Arsenal",
      "Arsenal"
    ],
    "name": "Arsenal",
    "shortName": "Arsenal",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9825.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9825",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=47"
  },
  {
    "espnId": "",
    "teamId": "Premier League|Aston Villa",
    "names": [
      "Aston Villa",
      "Aston Villa"
    ],
    "name": "Aston Villa",
    "shortName": "Aston Villa",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10252.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10252",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=47"
  },
  {
    "espnId": "",
    "teamId": "Premier League|Brentford",
    "names": [
      "Brentford",
      "Brentford"
    ],
    "name": "Brentford",
    "shortName": "Brentford",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9937.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9937",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=47"
  },
  {
    "espnId": "",
    "teamId": "Premier League|Brighton & Hove Albion",
    "names": [
      "Brighton & Hove Albion",
      "Brighton"
    ],
    "name": "Brighton & Hove Albion",
    "shortName": "Brighton",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10204.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10204",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=47"
  },
  {
    "espnId": "",
    "teamId": "Premier League|Burnley",
    "names": [
      "Burnley",
      "Burnley"
    ],
    "name": "Burnley",
    "shortName": "Burnley",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8191.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8191",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=47"
  },
  {
    "espnId": "",
    "teamId": "Premier League|Chelsea",
    "names": [
      "Chelsea",
      "Chelsea"
    ],
    "name": "Chelsea",
    "shortName": "Chelsea",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8455.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8455",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=47"
  },
  {
    "espnId": "",
    "teamId": "Premier League|Coventry City",
    "names": [
      "Coventry City",
      "Coventry"
    ],
    "name": "Coventry City",
    "shortName": "Coventry",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8669.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8669",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=47"
  },
  {
    "espnId": "",
    "teamId": "Premier League|Crystal Palace",
    "names": [
      "Crystal Palace",
      "Crystal Palace"
    ],
    "name": "Crystal Palace",
    "shortName": "Crystal Palace",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9826.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9826",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=47"
  },
  {
    "espnId": "",
    "teamId": "Premier League|Everton",
    "names": [
      "Everton",
      "Everton"
    ],
    "name": "Everton",
    "shortName": "Everton",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8668.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8668",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=47"
  },
  {
    "espnId": "",
    "teamId": "Premier League|Fulham",
    "names": [
      "Fulham",
      "Fulham"
    ],
    "name": "Fulham",
    "shortName": "Fulham",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9879.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9879",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=47"
  },
  {
    "espnId": "",
    "teamId": "Premier League|Hull City",
    "names": [
      "Hull City",
      "Hull"
    ],
    "name": "Hull City",
    "shortName": "Hull",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8667.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8667",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=47"
  },
  {
    "espnId": "",
    "teamId": "Premier League|Ipswich Town",
    "names": [
      "Ipswich Town",
      "Ipswich"
    ],
    "name": "Ipswich Town",
    "shortName": "Ipswich",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9902.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9902",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=47"
  },
  {
    "espnId": "",
    "teamId": "Premier League|Leeds United",
    "names": [
      "Leeds United",
      "Leeds"
    ],
    "name": "Leeds United",
    "shortName": "Leeds",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8463.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8463",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=47"
  },
  {
    "espnId": "",
    "teamId": "Premier League|Leicester City",
    "names": [
      "Leicester City",
      "Leicester"
    ],
    "name": "Leicester City",
    "shortName": "Leicester",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8197.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8197",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=47"
  },
  {
    "espnId": "",
    "teamId": "Premier League|Liverpool",
    "names": [
      "Liverpool",
      "Liverpool"
    ],
    "name": "Liverpool",
    "shortName": "Liverpool",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8650.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8650",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=47"
  },
  {
    "espnId": "",
    "teamId": "Premier League|Luton Town",
    "names": [
      "Luton Town",
      "Luton"
    ],
    "name": "Luton Town",
    "shortName": "Luton",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8346.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8346",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=47"
  },
  {
    "espnId": "",
    "teamId": "Premier League|Manchester City",
    "names": [
      "Manchester City",
      "Man City"
    ],
    "name": "Manchester City",
    "shortName": "Man City",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8456.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8456",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=47"
  },
  {
    "espnId": "",
    "teamId": "Premier League|Manchester United",
    "names": [
      "Manchester United",
      "Man United"
    ],
    "name": "Manchester United",
    "shortName": "Man United",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10260.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10260",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=47"
  },
  {
    "espnId": "",
    "teamId": "Premier League|Newcastle United",
    "names": [
      "Newcastle United",
      "Newcastle"
    ],
    "name": "Newcastle United",
    "shortName": "Newcastle",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10261.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10261",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=47"
  },
  {
    "espnId": "",
    "teamId": "Premier League|Nottingham Forest",
    "names": [
      "Nottingham Forest",
      "Nottm Forest"
    ],
    "name": "Nottingham Forest",
    "shortName": "Nottm Forest",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10203.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10203",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=47"
  },
  {
    "espnId": "",
    "teamId": "Premier League|Sheffield United",
    "names": [
      "Sheffield United",
      "Sheff Utd"
    ],
    "name": "Sheffield United",
    "shortName": "Sheff Utd",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8657.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8657",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=47"
  },
  {
    "espnId": "",
    "teamId": "Premier League|Southampton",
    "names": [
      "Southampton",
      "Southampton"
    ],
    "name": "Southampton",
    "shortName": "Southampton",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8466.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8466",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=47"
  },
  {
    "espnId": "",
    "teamId": "Premier League|Sunderland",
    "names": [
      "Sunderland",
      "Sunderland"
    ],
    "name": "Sunderland",
    "shortName": "Sunderland",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8472.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8472",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=47"
  },
  {
    "espnId": "",
    "teamId": "Premier League|Tottenham Hotspur",
    "names": [
      "Tottenham Hotspur",
      "Tottenham"
    ],
    "name": "Tottenham Hotspur",
    "shortName": "Tottenham",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8586.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8586",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=47"
  },
  {
    "espnId": "",
    "teamId": "Premier League|West Ham United",
    "names": [
      "West Ham United",
      "West Ham"
    ],
    "name": "West Ham United",
    "shortName": "West Ham",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8654.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8654",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=47"
  },
  {
    "espnId": "",
    "teamId": "Premier League|Wolverhampton Wanderers",
    "names": [
      "Wolverhampton Wanderers",
      "Wolves"
    ],
    "name": "Wolverhampton Wanderers",
    "shortName": "Wolves",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8602.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8602",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=47"
  },
  {
    "espnId": "",
    "teamId": "Primera A (Liga BetPlay Dimayor)|Águilas Doradas",
    "names": [
      "Águilas Doradas",
      "Águilas Doradas"
    ],
    "name": "Águilas Doradas",
    "shortName": "Águilas Doradas",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/193025.png",
    "country": "COL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "193025",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=274"
  },
  {
    "espnId": "",
    "teamId": "Primera A (Liga BetPlay Dimayor)|Alianza FC",
    "names": [
      "Alianza FC",
      "Alianza FC"
    ],
    "name": "Alianza FC",
    "shortName": "Alianza FC",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/193029.png",
    "country": "COL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "193029",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=274"
  },
  {
    "espnId": "",
    "teamId": "Primera A (Liga BetPlay Dimayor)|América de Cali",
    "names": [
      "América de Cali",
      "América de Cali"
    ],
    "name": "América de Cali",
    "shortName": "América de Cali",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10280.png",
    "country": "COL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10280",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=274"
  },
  {
    "espnId": "",
    "teamId": "Primera A (Liga BetPlay Dimayor)|Atlético Nacional",
    "names": [
      "Atlético Nacional",
      "Atlético Nacional"
    ],
    "name": "Atlético Nacional",
    "shortName": "Atlético Nacional",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6368.png",
    "country": "COL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6368",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=274"
  },
  {
    "espnId": "",
    "teamId": "Primera A (Liga BetPlay Dimayor)|Bucaramanga",
    "names": [
      "Bucaramanga",
      "Bucaramanga"
    ],
    "name": "Bucaramanga",
    "shortName": "Bucaramanga",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/4401.png",
    "country": "COL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "4401",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=274"
  },
  {
    "espnId": "",
    "teamId": "Primera A (Liga BetPlay Dimayor)|CD Jaguares",
    "names": [
      "CD Jaguares",
      "CD Jaguares"
    ],
    "name": "CD Jaguares",
    "shortName": "CD Jaguares",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/424270.png",
    "country": "COL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "424270",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=274"
  },
  {
    "espnId": "",
    "teamId": "Primera A (Liga BetPlay Dimayor)|Chicó FC",
    "names": [
      "Chicó FC",
      "Chicó FC"
    ],
    "name": "Chicó FC",
    "shortName": "Chicó FC",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6255.png",
    "country": "COL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6255",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=274"
  },
  {
    "espnId": "",
    "teamId": "Primera A (Liga BetPlay Dimayor)|Cúcuta",
    "names": [
      "Cúcuta",
      "Cúcuta"
    ],
    "name": "Cúcuta",
    "shortName": "Cúcuta",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6254.png",
    "country": "COL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6254",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=274"
  },
  {
    "espnId": "",
    "teamId": "Primera A (Liga BetPlay Dimayor)|Deportivo Cali",
    "names": [
      "Deportivo Cali",
      "Deportivo Cali"
    ],
    "name": "Deportivo Cali",
    "shortName": "Deportivo Cali",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6387.png",
    "country": "COL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6387",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=274"
  },
  {
    "espnId": "",
    "teamId": "Primera A (Liga BetPlay Dimayor)|Deportivo Pasto",
    "names": [
      "Deportivo Pasto",
      "Deportivo Pasto"
    ],
    "name": "Deportivo Pasto",
    "shortName": "Deportivo Pasto",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/4405.png",
    "country": "COL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "4405",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=274"
  },
  {
    "espnId": "",
    "teamId": "Primera A (Liga BetPlay Dimayor)|Deportivo Pereira",
    "names": [
      "Deportivo Pereira",
      "Deportivo Pereira"
    ],
    "name": "Deportivo Pereira",
    "shortName": "Deportivo Pereira",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/4404.png",
    "country": "COL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "4404",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=274"
  },
  {
    "espnId": "",
    "teamId": "Primera A (Liga BetPlay Dimayor)|Envigado",
    "names": [
      "Envigado",
      "Envigado"
    ],
    "name": "Envigado",
    "shortName": "Envigado",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/4402.png",
    "country": "COL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "4402",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=274"
  },
  {
    "espnId": "",
    "teamId": "Primera A (Liga BetPlay Dimayor)|Fortaleza FC",
    "names": [
      "Fortaleza FC",
      "Fortaleza FC"
    ],
    "name": "Fortaleza FC",
    "shortName": "Fortaleza FC",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/244167.png",
    "country": "COL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "244167",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=274"
  },
  {
    "espnId": "",
    "teamId": "Primera A (Liga BetPlay Dimayor)|Independiente Medellín",
    "names": [
      "Independiente Medellín",
      "Independiente Medellín"
    ],
    "name": "Independiente Medellín",
    "shortName": "Independiente Medellín",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/2528.png",
    "country": "COL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "2528",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=274"
  },
  {
    "espnId": "",
    "teamId": "Primera A (Liga BetPlay Dimayor)|Internacional de Bogotá",
    "names": [
      "Internacional de Bogotá",
      "Internacional de Bogotá"
    ],
    "name": "Internacional de Bogotá",
    "shortName": "Internacional de Bogotá",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/47240.png",
    "country": "COL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "47240",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=274"
  },
  {
    "espnId": "",
    "teamId": "Primera A (Liga BetPlay Dimayor)|Junior FC",
    "names": [
      "Junior FC",
      "Junior FC"
    ],
    "name": "Junior FC",
    "shortName": "Junior FC",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/2254.png",
    "country": "COL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "2254",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=274"
  },
  {
    "espnId": "",
    "teamId": "Primera A (Liga BetPlay Dimayor)|Llaneros FC",
    "names": [
      "Llaneros FC",
      "Llaneros FC"
    ],
    "name": "Llaneros FC",
    "shortName": "Llaneros FC",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/348397.png",
    "country": "COL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "348397",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=274"
  },
  {
    "espnId": "",
    "teamId": "Primera A (Liga BetPlay Dimayor)|Millonarios",
    "names": [
      "Millonarios",
      "Millonarios"
    ],
    "name": "Millonarios",
    "shortName": "Millonarios",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/4403.png",
    "country": "COL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "4403",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=274"
  },
  {
    "espnId": "",
    "teamId": "Primera A (Liga BetPlay Dimayor)|Once Caldas",
    "names": [
      "Once Caldas",
      "Once Caldas"
    ],
    "name": "Once Caldas",
    "shortName": "Once Caldas",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6024.png",
    "country": "COL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6024",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=274"
  },
  {
    "espnId": "",
    "teamId": "Primera A (Liga BetPlay Dimayor)|Santa Fe",
    "names": [
      "Santa Fe",
      "Santa Fe"
    ],
    "name": "Santa Fe",
    "shortName": "Santa Fe",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/7818.png",
    "country": "COL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "7818",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=274"
  },
  {
    "espnId": "",
    "teamId": "Primera A (Liga BetPlay Dimayor)|Tolima",
    "names": [
      "Tolima",
      "Tolima"
    ],
    "name": "Tolima",
    "shortName": "Tolima",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1894.png",
    "country": "COL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1894",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=274"
  },
  {
    "espnId": "",
    "teamId": "Primera A (Liga BetPlay Dimayor)|Unión Magdalena",
    "names": [
      "Unión Magdalena",
      "Unión Magdalena"
    ],
    "name": "Unión Magdalena",
    "shortName": "Unión Magdalena",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/4408.png",
    "country": "COL",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "4408",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=274"
  },
  {
    "espnId": "",
    "teamId": "Scottish Premiership|Aberdeen",
    "names": [
      "Aberdeen",
      "Aberdeen"
    ],
    "name": "Aberdeen",
    "shortName": "Aberdeen",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8485.png",
    "country": "SCO",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8485",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=64"
  },
  {
    "espnId": "",
    "teamId": "Scottish Premiership|Celtic",
    "names": [
      "Celtic",
      "Celtic"
    ],
    "name": "Celtic",
    "shortName": "Celtic",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9925.png",
    "country": "SCO",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9925",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=64"
  },
  {
    "espnId": "",
    "teamId": "Scottish Premiership|Dundee FC",
    "names": [
      "Dundee FC",
      "Dundee FC"
    ],
    "name": "Dundee FC",
    "shortName": "Dundee FC",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8284.png",
    "country": "SCO",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8284",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=64"
  },
  {
    "espnId": "",
    "teamId": "Scottish Premiership|Dundee United",
    "names": [
      "Dundee United",
      "Dundee United"
    ],
    "name": "Dundee United",
    "shortName": "Dundee United",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9938.png",
    "country": "SCO",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9938",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=64"
  },
  {
    "espnId": "",
    "teamId": "Scottish Premiership|Falkirk",
    "names": [
      "Falkirk",
      "Falkirk"
    ],
    "name": "Falkirk",
    "shortName": "Falkirk",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8596.png",
    "country": "SCO",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8596",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=64"
  },
  {
    "espnId": "",
    "teamId": "Scottish Premiership|Heart of Midlothian",
    "names": [
      "Heart of Midlothian",
      "Hearts"
    ],
    "name": "Heart of Midlothian",
    "shortName": "Hearts",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9860.png",
    "country": "SCO",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9860",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=64"
  },
  {
    "espnId": "",
    "teamId": "Scottish Premiership|Hibernian",
    "names": [
      "Hibernian",
      "Hibernian"
    ],
    "name": "Hibernian",
    "shortName": "Hibernian",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10251.png",
    "country": "SCO",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10251",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=64"
  },
  {
    "espnId": "",
    "teamId": "Scottish Premiership|Kilmarnock",
    "names": [
      "Kilmarnock",
      "Kilmarnock"
    ],
    "name": "Kilmarnock",
    "shortName": "Kilmarnock",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8597.png",
    "country": "SCO",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8597",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=64"
  },
  {
    "espnId": "",
    "teamId": "Scottish Premiership|Livingston",
    "names": [
      "Livingston",
      "Livingston"
    ],
    "name": "Livingston",
    "shortName": "Livingston",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8282.png",
    "country": "SCO",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8282",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=64"
  },
  {
    "espnId": "",
    "teamId": "Scottish Premiership|Motherwell",
    "names": [
      "Motherwell",
      "Motherwell"
    ],
    "name": "Motherwell",
    "shortName": "Motherwell",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9927.png",
    "country": "SCO",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9927",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=64"
  },
  {
    "espnId": "",
    "teamId": "Scottish Premiership|Rangers",
    "names": [
      "Rangers",
      "Rangers"
    ],
    "name": "Rangers",
    "shortName": "Rangers",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8548.png",
    "country": "SCO",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8548",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=64"
  },
  {
    "espnId": "",
    "teamId": "Scottish Premiership|Ross County",
    "names": [
      "Ross County",
      "Ross County"
    ],
    "name": "Ross County",
    "shortName": "Ross County",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8649.png",
    "country": "SCO",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8649",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=64"
  },
  {
    "espnId": "",
    "teamId": "Scottish Premiership|St. Johnstone",
    "names": [
      "St. Johnstone",
      "St. Johnstone"
    ],
    "name": "St. Johnstone",
    "shortName": "St. Johnstone",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8467.png",
    "country": "SCO",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8467",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=64"
  },
  {
    "espnId": "",
    "teamId": "Scottish Premiership|St. Mirren",
    "names": [
      "St. Mirren",
      "St. Mirren"
    ],
    "name": "St. Mirren",
    "shortName": "St. Mirren",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9800.png",
    "country": "SCO",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9800",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=64"
  },
  {
    "espnId": "",
    "teamId": "Serie A|Atalanta",
    "names": [
      "Atalanta",
      "Atalanta"
    ],
    "name": "Atalanta",
    "shortName": "Atalanta",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8524.png",
    "country": "ITA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8524",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=55"
  },
  {
    "espnId": "",
    "teamId": "Serie A|Bologna",
    "names": [
      "Bologna",
      "Bologna"
    ],
    "name": "Bologna",
    "shortName": "Bologna",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9857.png",
    "country": "ITA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9857",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=55"
  },
  {
    "espnId": "",
    "teamId": "Serie A|Cagliari",
    "names": [
      "Cagliari",
      "Cagliari"
    ],
    "name": "Cagliari",
    "shortName": "Cagliari",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8529.png",
    "country": "ITA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8529",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=55"
  },
  {
    "espnId": "",
    "teamId": "Serie A|Como",
    "names": [
      "Como",
      "Como"
    ],
    "name": "Como",
    "shortName": "Como",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10171.png",
    "country": "ITA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10171",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=55"
  },
  {
    "espnId": "",
    "teamId": "Serie A|Cremonese",
    "names": [
      "Cremonese",
      "Cremonese"
    ],
    "name": "Cremonese",
    "shortName": "Cremonese",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/7801.png",
    "country": "ITA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "7801",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=55"
  },
  {
    "espnId": "",
    "teamId": "Serie A|Empoli",
    "names": [
      "Empoli",
      "Empoli"
    ],
    "name": "Empoli",
    "shortName": "Empoli",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8534.png",
    "country": "ITA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8534",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=55"
  },
  {
    "espnId": "",
    "teamId": "Serie A|Fiorentina",
    "names": [
      "Fiorentina",
      "Fiorentina"
    ],
    "name": "Fiorentina",
    "shortName": "Fiorentina",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8535.png",
    "country": "ITA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8535",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=55"
  },
  {
    "espnId": "",
    "teamId": "Serie A|Frosinone",
    "names": [
      "Frosinone",
      "Frosinone"
    ],
    "name": "Frosinone",
    "shortName": "Frosinone",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9891.png",
    "country": "ITA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9891",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=55"
  },
  {
    "espnId": "",
    "teamId": "Serie A|Genoa",
    "names": [
      "Genoa",
      "Genoa"
    ],
    "name": "Genoa",
    "shortName": "Genoa",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10233.png",
    "country": "ITA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10233",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=55"
  },
  {
    "espnId": "",
    "teamId": "Serie A|Hellas Verona",
    "names": [
      "Hellas Verona",
      "Hellas Verona"
    ],
    "name": "Hellas Verona",
    "shortName": "Hellas Verona",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9876.png",
    "country": "ITA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9876",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=55"
  },
  {
    "espnId": "",
    "teamId": "Serie A|Inter",
    "names": [
      "Inter",
      "Inter"
    ],
    "name": "Inter",
    "shortName": "Inter",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8636.png",
    "country": "ITA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8636",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=55"
  },
  {
    "espnId": "",
    "teamId": "Serie A|Juventus",
    "names": [
      "Juventus",
      "Juventus"
    ],
    "name": "Juventus",
    "shortName": "Juventus",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9885.png",
    "country": "ITA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9885",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=55"
  },
  {
    "espnId": "",
    "teamId": "Serie A|Lazio",
    "names": [
      "Lazio",
      "Lazio"
    ],
    "name": "Lazio",
    "shortName": "Lazio",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8543.png",
    "country": "ITA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8543",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=55"
  },
  {
    "espnId": "",
    "teamId": "Serie A|Lecce",
    "names": [
      "Lecce",
      "Lecce"
    ],
    "name": "Lecce",
    "shortName": "Lecce",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9888.png",
    "country": "ITA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9888",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=55"
  },
  {
    "espnId": "",
    "teamId": "Serie A|Milan",
    "names": [
      "Milan",
      "Milan"
    ],
    "name": "Milan",
    "shortName": "Milan",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8564.png",
    "country": "ITA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8564",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=55"
  },
  {
    "espnId": "",
    "teamId": "Serie A|Monza",
    "names": [
      "Monza",
      "Monza"
    ],
    "name": "Monza",
    "shortName": "Monza",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6504.png",
    "country": "ITA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6504",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=55"
  },
  {
    "espnId": "",
    "teamId": "Serie A|Napoli",
    "names": [
      "Napoli",
      "Napoli"
    ],
    "name": "Napoli",
    "shortName": "Napoli",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9875.png",
    "country": "ITA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9875",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=55"
  },
  {
    "espnId": "",
    "teamId": "Serie A|Parma",
    "names": [
      "Parma",
      "Parma"
    ],
    "name": "Parma",
    "shortName": "Parma",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10167.png",
    "country": "ITA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10167",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=55"
  },
  {
    "espnId": "",
    "teamId": "Serie A|Pisa",
    "names": [
      "Pisa",
      "Pisa"
    ],
    "name": "Pisa",
    "shortName": "Pisa",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6479.png",
    "country": "ITA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6479",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=55"
  },
  {
    "espnId": "",
    "teamId": "Serie A|Roma",
    "names": [
      "Roma",
      "Roma"
    ],
    "name": "Roma",
    "shortName": "Roma",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8686.png",
    "country": "ITA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8686",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=55"
  },
  {
    "espnId": "",
    "teamId": "Serie A|Salernitana",
    "names": [
      "Salernitana",
      "Salernitana"
    ],
    "name": "Salernitana",
    "shortName": "Salernitana",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6480.png",
    "country": "ITA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6480",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=55"
  },
  {
    "espnId": "",
    "teamId": "Serie A|Sassuolo",
    "names": [
      "Sassuolo",
      "Sassuolo"
    ],
    "name": "Sassuolo",
    "shortName": "Sassuolo",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/7943.png",
    "country": "ITA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "7943",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=55"
  },
  {
    "espnId": "",
    "teamId": "Serie A|Torino",
    "names": [
      "Torino",
      "Torino"
    ],
    "name": "Torino",
    "shortName": "Torino",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9804.png",
    "country": "ITA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9804",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=55"
  },
  {
    "espnId": "",
    "teamId": "Serie A|Udinese",
    "names": [
      "Udinese",
      "Udinese"
    ],
    "name": "Udinese",
    "shortName": "Udinese",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8600.png",
    "country": "ITA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8600",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=55"
  },
  {
    "espnId": "",
    "teamId": "Serie A|Venezia",
    "names": [
      "Venezia",
      "Venezia"
    ],
    "name": "Venezia",
    "shortName": "Venezia",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/7881.png",
    "country": "ITA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "7881",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=55"
  },
  {
    "espnId": "",
    "teamId": "Super League Grecia|AE Larissa",
    "names": [
      "AE Larissa",
      "AE Larissa"
    ],
    "name": "AE Larissa",
    "shortName": "AE Larissa",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8120.png",
    "country": "GRE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8120",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=135"
  },
  {
    "espnId": "",
    "teamId": "Super League Grecia|AEK Athens",
    "names": [
      "AEK Athens",
      "AEK Athens"
    ],
    "name": "AEK Athens",
    "shortName": "AEK Athens",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8563.png",
    "country": "GRE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8563",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=135"
  },
  {
    "espnId": "",
    "teamId": "Super League Grecia|Aris Thessaloniki",
    "names": [
      "Aris Thessaloniki",
      "Aris Thessaloniki"
    ],
    "name": "Aris Thessaloniki",
    "shortName": "Aris Thessaloniki",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8239.png",
    "country": "GRE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8239",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=135"
  },
  {
    "espnId": "",
    "teamId": "Super League Grecia|Asteras Tripolis",
    "names": [
      "Asteras Tripolis",
      "Asteras Tripolis"
    ],
    "name": "Asteras Tripolis",
    "shortName": "Asteras Tripolis",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/80654.png",
    "country": "GRE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "80654",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=135"
  },
  {
    "espnId": "",
    "teamId": "Super League Grecia|Athens Kallithea FC",
    "names": [
      "Athens Kallithea FC",
      "Athens Kallithea FC"
    ],
    "name": "Athens Kallithea FC",
    "shortName": "Athens Kallithea FC",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/7975.png",
    "country": "GRE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "7975",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=135"
  },
  {
    "espnId": "",
    "teamId": "Super League Grecia|Atromitos",
    "names": [
      "Atromitos",
      "Atromitos"
    ],
    "name": "Atromitos",
    "shortName": "Atromitos",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10187.png",
    "country": "GRE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10187",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=135"
  },
  {
    "espnId": "",
    "teamId": "Super League Grecia|Iraklis",
    "names": [
      "Iraklis",
      "Iraklis"
    ],
    "name": "Iraklis",
    "shortName": "Iraklis",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8675.png",
    "country": "GRE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8675",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=135"
  },
  {
    "espnId": "",
    "teamId": "Super League Grecia|Kalamata",
    "names": [
      "Kalamata",
      "Kalamata"
    ],
    "name": "Kalamata",
    "shortName": "Kalamata",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1585.png",
    "country": "GRE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1585",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=135"
  },
  {
    "espnId": "",
    "teamId": "Super League Grecia|Kifisia FC",
    "names": [
      "Kifisia FC",
      "Kifisia FC"
    ],
    "name": "Kifisia FC",
    "shortName": "Kifisia FC",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/488099.png",
    "country": "GRE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "488099",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=135"
  },
  {
    "espnId": "",
    "teamId": "Super League Grecia|Lamia",
    "names": [
      "Lamia",
      "Lamia"
    ],
    "name": "Lamia",
    "shortName": "Lamia",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/162389.png",
    "country": "GRE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "162389",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=135"
  },
  {
    "espnId": "",
    "teamId": "Super League Grecia|Levadiakos",
    "names": [
      "Levadiakos",
      "Levadiakos"
    ],
    "name": "Levadiakos",
    "shortName": "Levadiakos",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/4493.png",
    "country": "GRE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "4493",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=135"
  },
  {
    "espnId": "",
    "teamId": "Super League Grecia|NFC Volos",
    "names": [
      "NFC Volos",
      "NFC Volos"
    ],
    "name": "NFC Volos",
    "shortName": "NFC Volos",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/885256.png",
    "country": "GRE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "885256",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=135"
  },
  {
    "espnId": "",
    "teamId": "Super League Grecia|OFI Crete",
    "names": [
      "OFI Crete",
      "OFI Crete"
    ],
    "name": "OFI Crete",
    "shortName": "OFI Crete",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/7753.png",
    "country": "GRE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "7753",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=135"
  },
  {
    "espnId": "",
    "teamId": "Super League Grecia|Olympiacos",
    "names": [
      "Olympiacos",
      "Olympiacos"
    ],
    "name": "Olympiacos",
    "shortName": "Olympiacos",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8638.png",
    "country": "GRE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8638",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=135"
  },
  {
    "espnId": "",
    "teamId": "Super League Grecia|Panathinaikos",
    "names": [
      "Panathinaikos",
      "Panathinaikos"
    ],
    "name": "Panathinaikos",
    "shortName": "Panathinaikos",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10200.png",
    "country": "GRE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10200",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=135"
  },
  {
    "espnId": "",
    "teamId": "Super League Grecia|Panetolikos",
    "names": [
      "Panetolikos",
      "Panetolikos"
    ],
    "name": "Panetolikos",
    "shortName": "Panetolikos",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/162386.png",
    "country": "GRE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "162386",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=135"
  },
  {
    "espnId": "",
    "teamId": "Super League Grecia|Panserraikos FC",
    "names": [
      "Panserraikos FC",
      "Panserraikos FC"
    ],
    "name": "Panserraikos FC",
    "shortName": "Panserraikos FC",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/104814.png",
    "country": "GRE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "104814",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=135"
  },
  {
    "espnId": "",
    "teamId": "Super League Grecia|PAOK Thessaloniki",
    "names": [
      "PAOK Thessaloniki",
      "PAOK Thessaloniki"
    ],
    "name": "PAOK Thessaloniki",
    "shortName": "PAOK Thessaloniki",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8619.png",
    "country": "GRE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8619",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=135"
  },
  {
    "espnId": "",
    "teamId": "Super League Grecia|PAS Giannina",
    "names": [
      "PAS Giannina",
      "PAS Giannina"
    ],
    "name": "PAS Giannina",
    "shortName": "PAS Giannina",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1620.png",
    "country": "GRE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1620",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=135"
  },
  {
    "espnId": "",
    "teamId": "Super League Suiza|Basel",
    "names": [
      "Basel",
      "Basel"
    ],
    "name": "Basel",
    "shortName": "Basel",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9931.png",
    "country": "SUI",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9931",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=69"
  },
  {
    "espnId": "",
    "teamId": "Super League Suiza|FC Stade Lausanne-Ouchy",
    "names": [
      "FC Stade Lausanne-Ouchy",
      "FC Stade Lausanne-Ouchy"
    ],
    "name": "FC Stade Lausanne-Ouchy",
    "shortName": "FC Stade Lausanne-Ouchy",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/289334.png",
    "country": "SUI",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "289334",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=69"
  },
  {
    "espnId": "",
    "teamId": "Super League Suiza|FC Vaduz",
    "names": [
      "FC Vaduz",
      "FC Vaduz"
    ],
    "name": "FC Vaduz",
    "shortName": "FC Vaduz",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9824.png",
    "country": "SUI",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9824",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=69"
  },
  {
    "espnId": "",
    "teamId": "Super League Suiza|FC Zürich",
    "names": [
      "FC Zürich",
      "FC Zürich"
    ],
    "name": "FC Zürich",
    "shortName": "FC Zürich",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10243.png",
    "country": "SUI",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10243",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=69"
  },
  {
    "espnId": "",
    "teamId": "Super League Suiza|Grasshopper",
    "names": [
      "Grasshopper",
      "Grasshopper"
    ],
    "name": "Grasshopper",
    "shortName": "Grasshopper",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9956.png",
    "country": "SUI",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9956",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=69"
  },
  {
    "espnId": "",
    "teamId": "Super League Suiza|Lausanne",
    "names": [
      "Lausanne",
      "Lausanne"
    ],
    "name": "Lausanne",
    "shortName": "Lausanne",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/7730.png",
    "country": "SUI",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "7730",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=69"
  },
  {
    "espnId": "",
    "teamId": "Super League Suiza|Lugano",
    "names": [
      "Lugano",
      "Lugano"
    ],
    "name": "Lugano",
    "shortName": "Lugano",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/7896.png",
    "country": "SUI",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "7896",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=69"
  },
  {
    "espnId": "",
    "teamId": "Super League Suiza|Luzern",
    "names": [
      "Luzern",
      "Luzern"
    ],
    "name": "Luzern",
    "shortName": "Luzern",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10199.png",
    "country": "SUI",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10199",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=69"
  },
  {
    "espnId": "",
    "teamId": "Super League Suiza|Servette",
    "names": [
      "Servette",
      "Servette"
    ],
    "name": "Servette",
    "shortName": "Servette",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9777.png",
    "country": "SUI",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9777",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=69"
  },
  {
    "espnId": "",
    "teamId": "Super League Suiza|Sion",
    "names": [
      "Sion",
      "Sion"
    ],
    "name": "Sion",
    "shortName": "Sion",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10179.png",
    "country": "SUI",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10179",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=69"
  },
  {
    "espnId": "",
    "teamId": "Super League Suiza|St. Gallen",
    "names": [
      "St. Gallen",
      "St. Gallen"
    ],
    "name": "St. Gallen",
    "shortName": "St. Gallen",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10190.png",
    "country": "SUI",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10190",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=69"
  },
  {
    "espnId": "",
    "teamId": "Super League Suiza|Thun",
    "names": [
      "Thun",
      "Thun"
    ],
    "name": "Thun",
    "shortName": "Thun",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10191.png",
    "country": "SUI",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10191",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=69"
  },
  {
    "espnId": "",
    "teamId": "Super League Suiza|Winterthur",
    "names": [
      "Winterthur",
      "Winterthur"
    ],
    "name": "Winterthur",
    "shortName": "Winterthur",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/7894.png",
    "country": "SUI",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "7894",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=69"
  },
  {
    "espnId": "",
    "teamId": "Super League Suiza|Young Boys",
    "names": [
      "Young Boys",
      "Young Boys"
    ],
    "name": "Young Boys",
    "shortName": "Young Boys",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10192.png",
    "country": "SUI",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10192",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=69"
  },
  {
    "espnId": "",
    "teamId": "Super League Suiza|Yverdon",
    "names": [
      "Yverdon",
      "Yverdon"
    ],
    "name": "Yverdon",
    "shortName": "Yverdon",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6447.png",
    "country": "SUI",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6447",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=69"
  },
  {
    "espnId": "",
    "teamId": "Super Lig|Adana Demirspor",
    "names": [
      "Adana Demirspor",
      "Demirspor"
    ],
    "name": "Adana Demirspor",
    "shortName": "Demirspor",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1926.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1926",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "",
    "teamId": "Super Lig|Alanyaspor",
    "names": [
      "Alanyaspor",
      "Alanyaspor"
    ],
    "name": "Alanyaspor",
    "shortName": "Alanyaspor",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/4678.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "4678",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "",
    "teamId": "Super Lig|Amed Sportif",
    "names": [
      "Amed Sportif",
      "Amed Sportif"
    ],
    "name": "Amed Sportif",
    "shortName": "Amed Sportif",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/96498.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "96498",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "",
    "teamId": "Super Lig|Ankaragücü",
    "names": [
      "Ankaragücü",
      "Ankaragücü"
    ],
    "name": "Ankaragücü",
    "shortName": "Ankaragücü",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9742.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9742",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "",
    "teamId": "Super Lig|Antalyaspor",
    "names": [
      "Antalyaspor",
      "Antalyaspor"
    ],
    "name": "Antalyaspor",
    "shortName": "Antalyaspor",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1931.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1931",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "",
    "teamId": "Super Lig|Başakşehir",
    "names": [
      "Başakşehir",
      "Başakşehir"
    ],
    "name": "Başakşehir",
    "shortName": "Başakşehir",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1933.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1933",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "",
    "teamId": "Super Lig|Beşiktaş",
    "names": [
      "Beşiktaş",
      "Beşiktaş"
    ],
    "name": "Beşiktaş",
    "shortName": "Beşiktaş",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10188.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10188",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "",
    "teamId": "Super Lig|Bodrum FK",
    "names": [
      "Bodrum FK",
      "Bodrum FK"
    ],
    "name": "Bodrum FK",
    "shortName": "Bodrum FK",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/658811.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "658811",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "",
    "teamId": "Super Lig|Çorum FK",
    "names": [
      "Çorum FK",
      "Çorum FK"
    ],
    "name": "Çorum FK",
    "shortName": "Çorum FK",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/357274.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "357274",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "",
    "teamId": "Super Lig|Erzurumspor FK",
    "names": [
      "Erzurumspor FK",
      "Erzurumspor FK"
    ],
    "name": "Erzurumspor FK",
    "shortName": "Erzurumspor FK",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/281467.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "281467",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "",
    "teamId": "Super Lig|Eyüpspor",
    "names": [
      "Eyüpspor",
      "Eyüpspor"
    ],
    "name": "Eyüpspor",
    "shortName": "Eyüpspor",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/4681.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "4681",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "",
    "teamId": "Super Lig|Fatih Karagümrük",
    "names": [
      "Fatih Karagümrük",
      "Karagümrük"
    ],
    "name": "Fatih Karagümrük",
    "shortName": "Karagümrük",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/2088.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "2088",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "",
    "teamId": "Super Lig|Fenerbahçe",
    "names": [
      "Fenerbahçe",
      "Fenerbahçe"
    ],
    "name": "Fenerbahçe",
    "shortName": "Fenerbahçe",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8695.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8695",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "",
    "teamId": "Super Lig|Galatasaray",
    "names": [
      "Galatasaray",
      "Galatasaray"
    ],
    "name": "Galatasaray",
    "shortName": "Galatasaray",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8637.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8637",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "",
    "teamId": "Super Lig|Gaziantep FK",
    "names": [
      "Gaziantep FK",
      "Gaziantep FK"
    ],
    "name": "Gaziantep FK",
    "shortName": "Gaziantep FK",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/4081.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "4081",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "",
    "teamId": "Super Lig|Gençlerbirliği",
    "names": [
      "Gençlerbirliği",
      "Gençlerbirliği"
    ],
    "name": "Gençlerbirliği",
    "shortName": "Gençlerbirliği",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/7800.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "7800",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "",
    "teamId": "Super Lig|Göztepe",
    "names": [
      "Göztepe",
      "Göztepe"
    ],
    "name": "Göztepe",
    "shortName": "Göztepe",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1925.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1925",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "",
    "teamId": "Super Lig|Hatayspor",
    "names": [
      "Hatayspor",
      "Hatayspor"
    ],
    "name": "Hatayspor",
    "shortName": "Hatayspor",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/95749.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "95749",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "",
    "teamId": "Super Lig|İstanbulspor",
    "names": [
      "İstanbulspor",
      "İstanbulspor"
    ],
    "name": "İstanbulspor",
    "shortName": "İstanbulspor",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/106560.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "106560",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "",
    "teamId": "Super Lig|Kasımpaşa",
    "names": [
      "Kasımpaşa",
      "Kasımpaşa"
    ],
    "name": "Kasımpaşa",
    "shortName": "Kasımpaşa",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/4685.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "4685",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "",
    "teamId": "Super Lig|Kayserispor",
    "names": [
      "Kayserispor",
      "Kayserispor"
    ],
    "name": "Kayserispor",
    "shortName": "Kayserispor",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10182.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10182",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "",
    "teamId": "Super Lig|Kocaelispor",
    "names": [
      "Kocaelispor",
      "Kocaelispor"
    ],
    "name": "Kocaelispor",
    "shortName": "Kocaelispor",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1569.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1569",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "",
    "teamId": "Super Lig|Konyaspor",
    "names": [
      "Konyaspor",
      "Konyaspor"
    ],
    "name": "Konyaspor",
    "shortName": "Konyaspor",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8622.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8622",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "",
    "teamId": "Super Lig|Pendikspor",
    "names": [
      "Pendikspor",
      "Pendikspor"
    ],
    "name": "Pendikspor",
    "shortName": "Pendikspor",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/95745.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "95745",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "",
    "teamId": "Super Lig|Rizespor",
    "names": [
      "Rizespor",
      "Rizespor"
    ],
    "name": "Rizespor",
    "shortName": "Rizespor",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/2166.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "2166",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "",
    "teamId": "Super Lig|Samsunspor",
    "names": [
      "Samsunspor",
      "Samsunspor"
    ],
    "name": "Samsunspor",
    "shortName": "Samsunspor",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9750.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9750",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "",
    "teamId": "Super Lig|Sivasspor",
    "names": [
      "Sivasspor",
      "Sivasspor"
    ],
    "name": "Sivasspor",
    "shortName": "Sivasspor",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6265.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6265",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "",
    "teamId": "Super Lig|Trabzonspor",
    "names": [
      "Trabzonspor",
      "Trabzonspor"
    ],
    "name": "Trabzonspor",
    "shortName": "Trabzonspor",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9752.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9752",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "",
    "teamId": "Superliga|AaB",
    "names": [
      "AaB",
      "AaB"
    ],
    "name": "AaB",
    "shortName": "AaB",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8470.png",
    "country": "DEN",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8470",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=46"
  },
  {
    "espnId": "",
    "teamId": "Superliga|AC Horsens",
    "names": [
      "AC Horsens",
      "AC Horsens"
    ],
    "name": "AC Horsens",
    "shortName": "AC Horsens",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9814.png",
    "country": "DEN",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9814",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=46"
  },
  {
    "espnId": "",
    "teamId": "Superliga|AGF",
    "names": [
      "AGF",
      "AGF"
    ],
    "name": "AGF",
    "shortName": "AGF",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8071.png",
    "country": "DEN",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8071",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=46"
  },
  {
    "espnId": "",
    "teamId": "Superliga|Brøndby IF",
    "names": [
      "Brøndby IF",
      "Brøndby IF"
    ],
    "name": "Brøndby IF",
    "shortName": "Brøndby IF",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8595.png",
    "country": "DEN",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8595",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=46"
  },
  {
    "espnId": "",
    "teamId": "Superliga|FC København",
    "names": [
      "FC København",
      "FC København"
    ],
    "name": "FC København",
    "shortName": "FC København",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8391.png",
    "country": "DEN",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8391",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=46"
  },
  {
    "espnId": "",
    "teamId": "Superliga|FC Midtjylland",
    "names": [
      "FC Midtjylland",
      "FC Midtjylland"
    ],
    "name": "FC Midtjylland",
    "shortName": "FC Midtjylland",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8113.png",
    "country": "DEN",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8113",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=46"
  },
  {
    "espnId": "",
    "teamId": "Superliga|Fredericia",
    "names": [
      "Fredericia",
      "Fredericia"
    ],
    "name": "Fredericia",
    "shortName": "Fredericia",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8454.png",
    "country": "DEN",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8454",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=46"
  },
  {
    "espnId": "",
    "teamId": "Superliga|Hvidovre",
    "names": [
      "Hvidovre",
      "Hvidovre"
    ],
    "name": "Hvidovre",
    "shortName": "Hvidovre",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10240.png",
    "country": "DEN",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10240",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=46"
  },
  {
    "espnId": "",
    "teamId": "Superliga|Lyngby",
    "names": [
      "Lyngby",
      "Lyngby"
    ],
    "name": "Lyngby",
    "shortName": "Lyngby",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9907.png",
    "country": "DEN",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9907",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=46"
  },
  {
    "espnId": "",
    "teamId": "Superliga|Nordsjælland",
    "names": [
      "Nordsjælland",
      "Nordsjælland"
    ],
    "name": "Nordsjælland",
    "shortName": "Nordsjælland",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10202.png",
    "country": "DEN",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10202",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=46"
  },
  {
    "espnId": "",
    "teamId": "Superliga|OB",
    "names": [
      "OB",
      "OB"
    ],
    "name": "OB",
    "shortName": "OB",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8414.png",
    "country": "DEN",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8414",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=46"
  },
  {
    "espnId": "",
    "teamId": "Superliga|Randers FC",
    "names": [
      "Randers FC",
      "Randers FC"
    ],
    "name": "Randers FC",
    "shortName": "Randers FC",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8410.png",
    "country": "DEN",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8410",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=46"
  },
  {
    "espnId": "",
    "teamId": "Superliga|Silkeborg",
    "names": [
      "Silkeborg",
      "Silkeborg"
    ],
    "name": "Silkeborg",
    "shortName": "Silkeborg",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8415.png",
    "country": "DEN",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8415",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=46"
  },
  {
    "espnId": "",
    "teamId": "Superliga|Sønderjyske",
    "names": [
      "Sønderjyske",
      "Sønderjyske"
    ],
    "name": "Sønderjyske",
    "shortName": "Sønderjyske",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8487.png",
    "country": "DEN",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8487",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=46"
  },
  {
    "espnId": "",
    "teamId": "Superliga|Vejle Boldklub",
    "names": [
      "Vejle Boldklub",
      "Vejle Boldklub"
    ],
    "name": "Vejle Boldklub",
    "shortName": "Vejle Boldklub",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8231.png",
    "country": "DEN",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8231",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=46"
  },
  {
    "espnId": "",
    "teamId": "Superliga|Viborg",
    "names": [
      "Viborg",
      "Viborg"
    ],
    "name": "Viborg",
    "shortName": "Viborg",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9939.png",
    "country": "DEN",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9939",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=46"
  },
  {
    "espnId": "3",
    "name": "Argentinos Juniors",
    "shortName": "Argentinos Juniors",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10086.png",
    "country": "ARG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10086",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=112"
  },
  {
    "espnId": "4",
    "name": "Belgrano",
    "shortName": "Belgrano",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10092.png",
    "country": "ARG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10092",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=112"
  },
  {
    "espnId": "5",
    "name": "Boca Juniors",
    "shortName": "Boca Juniors",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10077.png",
    "country": "ARG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10077",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=112"
  },
  {
    "espnId": "8",
    "name": "Estudiantes",
    "shortName": "Estudiantes",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10094.png",
    "country": "ARG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10094",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=112"
  },
  {
    "espnId": "9",
    "name": "Gimnasia LP",
    "shortName": "Gimnasia LP",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10103.png",
    "country": "ARG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10103",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=112"
  },
  {
    "espnId": "10",
    "name": "Huracán",
    "shortName": "Huracán",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10081.png",
    "country": "ARG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10081",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=112"
  },
  {
    "espnId": "11",
    "name": "Independiente",
    "shortName": "Independiente",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10078.png",
    "country": "ARG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10078",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=112"
  },
  {
    "espnId": "12",
    "name": "Lanús",
    "shortName": "Lanús",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10082.png",
    "country": "ARG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10082",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=112"
  },
  {
    "espnId": "14",
    "name": "Newell's Old Boys",
    "shortName": "Newell's Old Boys",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10201.png",
    "country": "ARG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10201",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=112"
  },
  {
    "espnId": "15",
    "name": "Racing Club",
    "shortName": "Racing Club",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10080.png",
    "country": "ARG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10080",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=112"
  },
  {
    "espnId": "16",
    "name": "River Plate",
    "shortName": "River Plate",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10076.png",
    "country": "ARG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10076",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=112"
  },
  {
    "espnId": "17",
    "name": "Rosario Central",
    "shortName": "Rosario Central",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10084.png",
    "country": "ARG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10084",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=112"
  },
  {
    "espnId": "18",
    "name": "San Lorenzo",
    "shortName": "San Lorenzo",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10083.png",
    "country": "ARG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10083",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=112"
  },
  {
    "espnId": "19",
    "name": "Talleres",
    "shortName": "Talleres",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10101.png",
    "country": "ARG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10101",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=112"
  },
  {
    "espnId": "20",
    "name": "Unión",
    "shortName": "Unión",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10096.png",
    "country": "ARG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10096",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=112"
  },
  {
    "espnId": "21",
    "name": "Vélez Sarsfield",
    "shortName": "Vélez Sarsfield",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10079.png",
    "country": "ARG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10079",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=112"
  },
  {
    "espnId": "83",
    "name": "FC Barcelona",
    "shortName": "Barcelona",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/50080.png",
    "country": "ESP",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "50080",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=1&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "85",
    "name": "Real Club Celta",
    "shortName": "Celta",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/53043.png",
    "country": "ESP",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "53043",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=14&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "86",
    "name": "Real Madrid C.F.",
    "shortName": "Real Madrid",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/50051.png",
    "country": "ESP",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "50051",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=1&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "87",
    "name": "R. Racing Club",
    "shortName": "R. Racing Club",
    "crestUrl": "https://assets.laliga.com/assets/2019/06/07/medium/racing.png",
    "country": "ESP",
    "source": "laliga.com",
    "secondary": false,
    "sourceTeamId": "49",
    "sourceUrl": "https://www.laliga.com/laliga-easports/clubes"
  },
  {
    "espnId": "88",
    "name": "RCD Espanyol de Barcelona",
    "shortName": "RCD Espanyol de Barcelona",
    "crestUrl": "https://assets.laliga.com/assets/2025/07/02/medium/e9177f6edd72c6360602adbca85e442f.png",
    "country": "ESP",
    "source": "laliga.com",
    "secondary": false,
    "sourceTeamId": "8",
    "sourceUrl": "https://www.laliga.com/laliga-easports/clubes"
  },
  {
    "espnId": "89",
    "name": "Real Sociedad de Fútbol",
    "shortName": "Real Sociedad",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/50123.png",
    "country": "ESP",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "50123",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=14&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "90",
    "name": "RC Deportivo",
    "shortName": "RC Deportivo",
    "crestUrl": "https://assets.laliga.com/assets/2026/06/24/medium/6b88661529a2c06840c8bf6bddd90970.png",
    "country": "ESP",
    "source": "laliga.com",
    "secondary": false,
    "sourceTeamId": "26",
    "sourceUrl": "https://www.laliga.com/laliga-easports/clubes"
  },
  {
    "espnId": "93",
    "name": "Athletic Club",
    "shortName": "Athletic Club",
    "crestUrl": "https://assets.laliga.com/assets/2019/06/07/medium/athletic.png",
    "country": "ESP",
    "source": "laliga.com",
    "secondary": false,
    "sourceTeamId": "3",
    "sourceUrl": "https://www.laliga.com/laliga-easports/clubes"
  },
  {
    "espnId": "94",
    "name": "Valencia CF",
    "shortName": "Valencia CF",
    "crestUrl": "https://assets.laliga.com/assets/2019/06/07/medium/valencia.png",
    "country": "ESP",
    "source": "laliga.com",
    "secondary": false,
    "sourceTeamId": "18",
    "sourceUrl": "https://www.laliga.com/laliga-easports/clubes"
  },
  {
    "espnId": "96",
    "name": "Deportivo Alavés",
    "shortName": "Deportivo Alavés",
    "crestUrl": "https://assets.laliga.com/assets/2020/09/01/medium/27002754a98bf535807fe49a24cc63ea.png",
    "country": "ESP",
    "source": "laliga.com",
    "secondary": false,
    "sourceTeamId": "21",
    "sourceUrl": "https://www.laliga.com/laliga-easports/clubes"
  },
  {
    "espnId": "97",
    "name": "CA Osasuna",
    "shortName": "CA Osasuna",
    "crestUrl": "https://assets.laliga.com/assets/2019/06/07/medium/osasuna.png",
    "country": "ESP",
    "source": "laliga.com",
    "secondary": false,
    "sourceTeamId": "13",
    "sourceUrl": "https://www.laliga.com/laliga-easports/clubes"
  },
  {
    "espnId": "99",
    "name": "Málaga CF",
    "shortName": "Málaga CF",
    "crestUrl": "https://assets.laliga.com/assets/2019/06/07/medium/malaga.png",
    "country": "ESP",
    "source": "laliga.com",
    "secondary": false,
    "sourceTeamId": "12",
    "sourceUrl": "https://www.laliga.com/laliga-easports/clubes"
  },
  {
    "espnId": "101",
    "name": "Rayo Vallecano",
    "shortName": "Rayo Vallecano",
    "crestUrl": "https://assets.laliga.com/assets/2023/04/27/medium/57d9950a8745ead226c04d37235c0786.png",
    "country": "ESP",
    "source": "laliga.com",
    "secondary": false,
    "sourceTeamId": "14",
    "sourceUrl": "https://www.laliga.com/laliga-easports/clubes"
  },
  {
    "espnId": "102",
    "name": "Villarreal CF",
    "shortName": "Villarreal",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/70691.png",
    "country": "ESP",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "70691",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=1&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "103",
    "name": "AC Milan",
    "shortName": "Milan",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/50058.png",
    "country": "ITA",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "50058",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=14&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "104",
    "name": "AS Roma",
    "shortName": "Roma",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/50137.png",
    "country": "ITA",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "50137",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=1&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "105",
    "name": "Atalanta BC",
    "shortName": "Atalanta",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/52816.png",
    "country": "ITA",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "52816",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=2019&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "107",
    "name": "Bologna",
    "shortName": "Bologna",
    "crestUrl": "https://media-sdp.legaseriea.it/clubLogos/4af71b35aab34ad5a7d06148abe66ad6.webp",
    "country": "ITA",
    "source": "legaseriea.it",
    "secondary": false,
    "sourceTeamId": "4af71b35aab34ad5a7d06148abe66ad6",
    "sourceUrl": "https://www.legaseriea.it/serie-a"
  },
  {
    "espnId": "109",
    "name": "Fiorentina",
    "shortName": "Fiorentina",
    "crestUrl": "https://media-sdp.legaseriea.it/clubLogos/5bce12d5bd864c2297695d970f92576d.webp",
    "country": "ITA",
    "source": "legaseriea.it",
    "secondary": false,
    "sourceTeamId": "5bce12d5bd864c2297695d970f92576d",
    "sourceUrl": "https://www.legaseriea.it/serie-a"
  },
  {
    "espnId": "110",
    "name": "FC Internazionale Milano",
    "shortName": "Inter",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/50138.png",
    "country": "ITA",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "50138",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=1&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "111",
    "name": "Juventus",
    "shortName": "Juventus",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/50139.png",
    "country": "ITA",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "50139",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=14&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "112",
    "name": "Lazio",
    "shortName": "Lazio",
    "crestUrl": "https://media-sdp.legaseriea.it/clubLogos/fe6490f2b16e45be9956a1cd04aaf3a2.webp",
    "country": "ITA",
    "source": "legaseriea.it",
    "secondary": false,
    "sourceTeamId": "fe6490f2b16e45be9956a1cd04aaf3a2",
    "sourceUrl": "https://www.legaseriea.it/serie-a"
  },
  {
    "espnId": "113",
    "name": "Lecce",
    "shortName": "Lecce",
    "crestUrl": "https://media-sdp.legaseriea.it/clubLogos/ced7bf0df3a140dfa48138311122133b.webp",
    "country": "ITA",
    "source": "legaseriea.it",
    "secondary": false,
    "sourceTeamId": "ced7bf0df3a140dfa48138311122133b",
    "sourceUrl": "https://www.legaseriea.it/serie-a"
  },
  {
    "espnId": "114",
    "name": "SSC Napoli",
    "shortName": "Napoli",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/50136.png",
    "country": "ITA",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "50136",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=1&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "115",
    "name": "Parma",
    "shortName": "Parma",
    "crestUrl": "https://media-sdp.legaseriea.it/clubLogos/3294993c79b14d918ccdc78da0fb90c5.webp",
    "country": "ITA",
    "source": "legaseriea.it",
    "secondary": false,
    "sourceTeamId": "3294993c79b14d918ccdc78da0fb90c5",
    "sourceUrl": "https://www.legaseriea.it/serie-a"
  },
  {
    "espnId": "118",
    "name": "Udinese",
    "shortName": "Udinese",
    "crestUrl": "https://media-sdp.legaseriea.it/clubLogos/630b1e3631db42498d1b7bc94595c5e0.webp",
    "country": "ITA",
    "source": "legaseriea.it",
    "secondary": false,
    "sourceTeamId": "630b1e3631db42498d1b7bc94595c5e0",
    "sourceUrl": "https://www.legaseriea.it/serie-a"
  },
  {
    "espnId": "122",
    "name": "1. FC Köln",
    "shortName": "1. FC Köln",
    "crestUrl": "https://www.bundesliga.com/assets/clublogo/DFL-CLU-000008.svg",
    "country": "GER",
    "source": "bundesliga.com",
    "secondary": false,
    "sourceTeamId": "DFL-CLU-000008",
    "sourceUrl": "https://www.bundesliga.com/de/bundesliga/clubs"
  },
  {
    "espnId": "124",
    "name": "Borussia Dortmund",
    "shortName": "B. Dortmund",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/52758.png",
    "country": "GER",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "52758",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=1&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "125",
    "name": "Eintracht Frankfurt",
    "shortName": "Eintracht Frankfurt",
    "crestUrl": "https://www.bundesliga.com/assets/clublogo/DFL-CLU-00000F.svg",
    "country": "GER",
    "source": "bundesliga.com",
    "secondary": false,
    "sourceTeamId": "DFL-CLU-00000F",
    "sourceUrl": "https://www.bundesliga.com/de/bundesliga/clubs"
  },
  {
    "espnId": "126",
    "name": "SC Freiburg",
    "shortName": "Freiburg",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/59880.png",
    "country": "GER",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "59880",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=2019&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "127",
    "name": "Hamburger SV",
    "shortName": "Hamburger SV",
    "crestUrl": "https://www.bundesliga.com/assets/clublogo/DFL-CLU-00000C.svg",
    "country": "GER",
    "source": "bundesliga.com",
    "secondary": false,
    "sourceTeamId": "DFL-CLU-00000C",
    "sourceUrl": "https://www.bundesliga.com/de/bundesliga/clubs"
  },
  {
    "espnId": "131",
    "name": "Bayer 04 Leverkusen",
    "shortName": "Leverkusen",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/50109.png",
    "country": "GER",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "50109",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=14&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "132",
    "name": "FC Bayern München",
    "shortName": "Bayern München",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/50037.png",
    "country": "GER",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "50037",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=1&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "133",
    "name": "FC Schalke 04",
    "shortName": "FC Schalke 04",
    "crestUrl": "https://www.bundesliga.com/assets/clublogo/DFL-CLU-000009.svg",
    "country": "GER",
    "source": "bundesliga.com",
    "secondary": false,
    "sourceTeamId": "DFL-CLU-000009",
    "sourceUrl": "https://www.bundesliga.com/de/bundesliga/clubs"
  },
  {
    "espnId": "134",
    "name": "VfB Stuttgart",
    "shortName": "Stuttgart",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/50107.png",
    "country": "GER",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "50107",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=1&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "137",
    "name": "SV Werder Bremen",
    "shortName": "SV Werder Bremen",
    "crestUrl": "https://www.bundesliga.com/assets/clublogo/DFL-CLU-00000E.svg",
    "country": "GER",
    "source": "bundesliga.com",
    "secondary": false,
    "sourceTeamId": "DFL-CLU-00000E",
    "sourceUrl": "https://www.bundesliga.com/de/bundesliga/clubs"
  },
  {
    "espnId": "139",
    "name": "AFC Ajax",
    "shortName": "Ajax",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/50143.png",
    "country": "NED",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "50143",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=2019&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "140",
    "name": "AZ Alkmaar",
    "shortName": "AZ Alkmaar",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/52327.png",
    "country": "NED",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "52327",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=14&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "142",
    "name": "Feyenoord",
    "shortName": "Feyenoord",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/52749.png",
    "country": "NED",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "52749",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=1&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "143",
    "name": "Fortuna Sittard",
    "shortName": "Fortuna Sittard",
    "crestUrl": "https://eredivisie.b-cdn.net/production/clubs/fortuna-sittard/FortunaSittard_Logo.png?width=96&height=96&quality=85",
    "country": "NED",
    "source": "eredivisie.nl",
    "secondary": false,
    "sourceTeamId": "fortuna-sittard",
    "sourceUrl": "https://eredivisie.nl/competitie/clubs/"
  },
  {
    "espnId": "145",
    "name": "FC Groningen",
    "shortName": "FC Groningen",
    "crestUrl": "https://eredivisie.b-cdn.net/production/clubs/fc-groningen/FCGroningen_Logo.png?width=96&height=96&quality=85",
    "country": "NED",
    "source": "eredivisie.nl",
    "secondary": false,
    "sourceTeamId": "fc-groningen",
    "sourceUrl": "https://eredivisie.nl/competitie/clubs/"
  },
  {
    "espnId": "146",
    "name": "sc Heerenveen",
    "shortName": "sc Heerenveen",
    "crestUrl": "https://eredivisie.b-cdn.net/production/clubs/sc-heerenveen/scHeerenveen_Logo.png?width=96&height=96&quality=85",
    "country": "NED",
    "source": "eredivisie.nl",
    "secondary": false,
    "sourceTeamId": "sc-heerenveen",
    "sourceUrl": "https://eredivisie.nl/competitie/clubs/"
  },
  {
    "espnId": "147",
    "name": "N.E.C. Nijmegen",
    "shortName": "N.E.C.",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/52330.png",
    "country": "NED",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "52330",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=14&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "148",
    "name": "PSV Eindhoven",
    "shortName": "PSV",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/50062.png",
    "country": "NED",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "50062",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=1&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "151",
    "name": "Sparta Rotterdam",
    "shortName": "Sparta Rotterdam",
    "crestUrl": "https://eredivisie.b-cdn.net/production/clubs/sparta-rotterdam/SpartaRotterdam_Logo.png?width=96&height=96&quality=85",
    "country": "NED",
    "source": "eredivisie.nl",
    "secondary": false,
    "sourceTeamId": "sparta-rotterdam",
    "sourceUrl": "https://eredivisie.nl/competitie/clubs/"
  },
  {
    "espnId": "152",
    "name": "FC Twente",
    "shortName": "Twente",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/52818.png",
    "country": "NED",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "52818",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=2019&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "153",
    "name": "FC Utrecht",
    "shortName": "FC Utrecht",
    "crestUrl": "https://eredivisie.b-cdn.net/production/clubs/fc-utrecht/FCUtrecht_Logo.png?width=96&height=96&quality=85",
    "country": "NED",
    "source": "eredivisie.nl",
    "secondary": false,
    "sourceTeamId": "fc-utrecht",
    "sourceUrl": "https://eredivisie.nl/competitie/clubs/"
  },
  {
    "espnId": "156",
    "name": "Willem II",
    "shortName": "Willem II",
    "crestUrl": "https://eredivisie.b-cdn.net/production/clubs/willem-ii/WillemII_Logo.png?width=96&height=96&quality=85",
    "country": "NED",
    "source": "eredivisie.nl",
    "secondary": false,
    "sourceTeamId": "willem-ii",
    "sourceUrl": "https://eredivisie.nl/competitie/clubs/"
  },
  {
    "espnId": "160",
    "name": "Paris Saint-Germain",
    "shortName": "Paris",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/52747.png",
    "country": "FRA",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "52747",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=1&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "166",
    "name": "LOSC Lille",
    "shortName": "Lille",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/75797.png",
    "country": "FRA",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "75797",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=1&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "167",
    "name": "Olympique Lyonnais",
    "shortName": "Lyon",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/5312.png",
    "country": "FRA",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "5312",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=14&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "169",
    "name": "Stade Rennais FC",
    "shortName": "Rennes",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/55031.png",
    "country": "FRA",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "55031",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=14&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "170",
    "name": "Estac Troyes",
    "shortName": "Troyes",
    "crestUrl": "https://s3.eu-west-1.amazonaws.com/image.mpg/assets/clubs/logo/2023_4_33_128x128_fda89ec63ce6cd3429cf0d4c366bddee.png",
    "country": "FRA",
    "source": "ligue1.com",
    "secondary": false,
    "sourceTeamId": "l1_championship_club_2026_33",
    "sourceUrl": "https://ma-api.ligue1.fr/championship-matches/championship/1/game-week/1?season=2026"
  },
  {
    "espnId": "172",
    "name": "AJ Auxerre",
    "shortName": "Auxerre",
    "crestUrl": "https://s3.eu-west-1.amazonaws.com/image.mpg/assets/clubs/logo/2023_4_2_128x128_f25b3b461b1ed57875618ac6f3ea96e8.png",
    "country": "FRA",
    "source": "ligue1.com",
    "secondary": false,
    "sourceTeamId": "l1_championship_club_2026_2",
    "sourceUrl": "https://ma-api.ligue1.fr/championship-matches/championship/1/game-week/1?season=2026"
  },
  {
    "espnId": "174",
    "name": "AS Monaco",
    "shortName": "Monaco",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/50023.png",
    "country": "FRA",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "50023",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=2019&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "175",
    "name": "RC Lens",
    "shortName": "Lens",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/52277.png",
    "country": "FRA",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "52277",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=1&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "176",
    "name": "Olympique de Marseille",
    "shortName": "Marseille",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/52748.png",
    "country": "FRA",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "52748",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=14&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "179",
    "name": "Toulouse FC",
    "shortName": "Toulouse",
    "crestUrl": "https://s3.eu-west-1.amazonaws.com/image.mpg/assets/clubs/logo/2023_1_16_128x128_a5add8c2d780e5d231b1b2732e313eeb.png",
    "country": "FRA",
    "source": "ligue1.com",
    "secondary": false,
    "sourceTeamId": "l1_championship_club_2026_16",
    "sourceUrl": "https://ma-api.ligue1.fr/championship-matches/championship/1/game-week/1?season=2026"
  },
  {
    "espnId": "180",
    "name": "RC Strasbourg Alsace",
    "shortName": "Strasbourg",
    "crestUrl": "https://s3.eu-west-1.amazonaws.com/image.mpg/assets/clubs/logo/2023_1_15_128x128_b0690caabe8c7f44215d7664eed973b4.png",
    "country": "FRA",
    "source": "ligue1.com",
    "secondary": false,
    "sourceTeamId": "l1_championship_club_2026_15",
    "sourceUrl": "https://ma-api.ligue1.fr/championship-matches/championship/1/game-week/1?season=2026"
  },
  {
    "espnId": "182",
    "name": "Chicago Fire FC",
    "shortName": "Chicago",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6397.png",
    "country": "USA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6397",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=130"
  },
  {
    "espnId": "183",
    "name": "Columbus Crew",
    "shortName": "Columbus",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6001.png",
    "country": "USA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6001",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=130"
  },
  {
    "espnId": "184",
    "name": "Colorado Rapids",
    "shortName": "Colorado",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8314.png",
    "country": "USA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8314",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=130"
  },
  {
    "espnId": "185",
    "name": "FC Dallas",
    "shortName": "Dallas",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6399.png",
    "country": "USA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6399",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=130"
  },
  {
    "espnId": "186",
    "name": "Sporting Kansas City",
    "shortName": "Sporting KC",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6604.png",
    "country": "USA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6604",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=130"
  },
  {
    "espnId": "187",
    "name": "LA Galaxy",
    "shortName": "LA Galaxy",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6637.png",
    "country": "USA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6637",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=130"
  },
  {
    "espnId": "189",
    "name": "New England Revolution",
    "shortName": "New England",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6580.png",
    "country": "USA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6580",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=130"
  },
  {
    "espnId": "190",
    "name": "Red Bull New York",
    "shortName": "NY Red Bulls",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6514.png",
    "country": "USA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6514",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=130"
  },
  {
    "espnId": "191",
    "name": "San Jose Earthquakes",
    "shortName": "San Jose",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6603.png",
    "country": "USA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6603",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=130"
  },
  {
    "espnId": "193",
    "name": "DC United",
    "shortName": "DC United",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6602.png",
    "country": "USA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6602",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=130"
  },
  {
    "espnId": "216",
    "name": "Atlas",
    "shortName": "Atlas",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6577.png",
    "country": "MEX",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6577",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=230"
  },
  {
    "espnId": "218",
    "name": "Cruz Azul",
    "shortName": "Cruz Azul",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6578.png",
    "country": "MEX",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6578",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=230"
  },
  {
    "espnId": "219",
    "name": "Chivas",
    "shortName": "Chivas",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/7807.png",
    "country": "MEX",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "7807",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=230"
  },
  {
    "espnId": "220",
    "name": "Monterrey",
    "shortName": "Monterrey",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/7849.png",
    "country": "MEX",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "7849",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=230"
  },
  {
    "espnId": "222",
    "name": "Querétaro FC",
    "shortName": "Querétaro",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1943.png",
    "country": "MEX",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1943",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=230"
  },
  {
    "espnId": "223",
    "name": "Toluca",
    "shortName": "Toluca",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6618.png",
    "country": "MEX",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6618",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=230"
  },
  {
    "espnId": "225",
    "name": "Santos Laguna",
    "shortName": "Santos",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/7857.png",
    "country": "MEX",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "7857",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=230"
  },
  {
    "espnId": "226",
    "name": "Atlante",
    "shortName": "Atlante",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1942.png",
    "country": "MEX",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1942",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=230"
  },
  {
    "espnId": "227",
    "name": "CF América",
    "shortName": "América",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6576.png",
    "country": "MEX",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6576",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=230"
  },
  {
    "espnId": "228",
    "name": "León",
    "shortName": "León",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1841.png",
    "country": "MEX",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1841",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=230"
  },
  {
    "espnId": "229",
    "name": "Necaxa",
    "shortName": "Necaxa",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1842.png",
    "country": "MEX",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1842",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=230"
  },
  {
    "espnId": "231",
    "name": "Puebla",
    "shortName": "Puebla",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/7847.png",
    "country": "MEX",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "7847",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=230"
  },
  {
    "espnId": "232",
    "name": "Tigres",
    "shortName": "Tigres",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8561.png",
    "country": "MEX",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8561",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=230"
  },
  {
    "espnId": "233",
    "name": "Pumas",
    "shortName": "Pumas",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1946.png",
    "country": "MEX",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1946",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=230"
  },
  {
    "espnId": "234",
    "name": "Pachuca",
    "shortName": "Pachuca",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/7848.png",
    "country": "MEX",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "7848",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=230"
  },
  {
    "espnId": "235",
    "name": "Banfield",
    "shortName": "Banfield",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10087.png",
    "country": "ARG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10087",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=112"
  },
  {
    "espnId": "239",
    "name": "Torino",
    "shortName": "Torino",
    "crestUrl": "https://media-sdp.legaseriea.it/clubLogos/a55dcc2058e94976b572262fc564a74c.webp",
    "country": "ITA",
    "source": "legaseriea.it",
    "secondary": false,
    "sourceTeamId": "a55dcc2058e94976b572262fc564a74c",
    "sourceUrl": "https://www.legaseriea.it/serie-a"
  },
  {
    "espnId": "243",
    "name": "Sevilla FC",
    "shortName": "Sevilla FC",
    "crestUrl": "https://assets.laliga.com/assets/2019/06/07/medium/sevilla.png",
    "country": "ESP",
    "source": "laliga.com",
    "secondary": false,
    "sourceTeamId": "17",
    "sourceUrl": "https://www.laliga.com/laliga-easports/clubes"
  },
  {
    "espnId": "244",
    "name": "Real Betis Balompié",
    "shortName": "Real Betis",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/52265.png",
    "country": "ESP",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "52265",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=1&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "250",
    "name": "St. Mirren",
    "shortName": "St. Mirren",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9800.png",
    "country": "SCO",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9800",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=64"
  },
  {
    "espnId": "254",
    "name": "Falkirk",
    "shortName": "Falkirk",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8596.png",
    "country": "SCO",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8596",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=64"
  },
  {
    "espnId": "256",
    "name": "Celtic FC",
    "shortName": "Celtic",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/50050.png",
    "country": "SCO",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "50050",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=14&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "257",
    "name": "Rangers",
    "shortName": "Rangers",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8548.png",
    "country": "SCO",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8548",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=64"
  },
  {
    "espnId": "258",
    "name": "Hibernian",
    "shortName": "Hibernian",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10251.png",
    "country": "SCO",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10251",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=64"
  },
  {
    "espnId": "260",
    "name": "Kilmarnock",
    "shortName": "Kilmarnock",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8597.png",
    "country": "SCO",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8597",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=64"
  },
  {
    "espnId": "261",
    "name": "Dundee FC",
    "shortName": "Dundee FC",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8284.png",
    "country": "SCO",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8284",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=64"
  },
  {
    "espnId": "262",
    "name": "Heart of Midlothian FC",
    "shortName": "Hearts",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/50120.png",
    "country": "SCO",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "50120",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=2019&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "263",
    "name": "Aberdeen",
    "shortName": "Aberdeen",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8485.png",
    "country": "SCO",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8485",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=64"
  },
  {
    "espnId": "264",
    "name": "Dundee United",
    "shortName": "Dundee United",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9938.png",
    "country": "SCO",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9938",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=64"
  },
  {
    "espnId": "266",
    "name": "Motherwell",
    "shortName": "Motherwell",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9927.png",
    "country": "SCO",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9927",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=64"
  },
  {
    "espnId": "267",
    "name": "St. Johnstone",
    "shortName": "St. Johnstone",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8467.png",
    "country": "SCO",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8467",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=64"
  },
  {
    "espnId": "268",
    "name": "Borussia Mönchengladbach",
    "shortName": "Borussia Mönchengladbach",
    "crestUrl": "https://www.bundesliga.com/assets/clublogo/DFL-CLU-000004.svg",
    "country": "GER",
    "source": "bundesliga.com",
    "secondary": false,
    "sourceTeamId": "DFL-CLU-000004",
    "sourceUrl": "https://www.bundesliga.com/de/bundesliga/clubs"
  },
  {
    "espnId": "273",
    "name": "FC Lorient",
    "shortName": "Lorient",
    "crestUrl": "https://s3.eu-west-1.amazonaws.com/image.mpg/assets/clubs/logo/2023_1_7_128x128_3d6b3608abb5b1dfa14a5e0c138c6c9d.png",
    "country": "FRA",
    "source": "ligue1.com",
    "secondary": false,
    "sourceTeamId": "l1_championship_club_2026_7",
    "sourceUrl": "https://ma-api.ligue1.fr/championship-matches/championship/1/game-week/1?season=2026"
  },
  {
    "espnId": "306",
    "name": "Hull City",
    "shortName": "Hull",
    "crestUrl": "https://resources.premierleague.com/premierleague/badges/100/t88.png",
    "country": "ENG",
    "source": "premierleague.com",
    "secondary": false,
    "sourceTeamId": "41",
    "sourceUrl": "https://footballapi.pulselive.com/football/teams?pageSize=100&compSeasons=841&comps=1&altIds=true&page=0"
  },
  {
    "espnId": "314",
    "name": "Lincoln City",
    "shortName": "Lincoln",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8430.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8430",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "318",
    "name": "Swansea City",
    "shortName": "Swansea",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10003.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10003",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "331",
    "name": "Brighton & Hove Albion",
    "shortName": "Brighton",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/2601105.png",
    "country": "ENG",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "2601105",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=2019&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "333",
    "name": "Bristol City",
    "shortName": "Bristol City",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8427.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8427",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "334",
    "name": "Queens Park Rangers",
    "shortName": "QPR",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10172.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10172",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "336",
    "name": "Stoke City",
    "shortName": "Stoke",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10194.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10194",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "337",
    "name": "Brentford",
    "shortName": "Brentford",
    "crestUrl": "https://resources.premierleague.com/premierleague/badges/100/t94.png",
    "country": "ENG",
    "source": "premierleague.com",
    "secondary": false,
    "sourceTeamId": "130",
    "sourceUrl": "https://footballapi.pulselive.com/football/teams?pageSize=100&compSeasons=841&comps=1&altIds=true&page=0"
  },
  {
    "espnId": "347",
    "name": "Cardiff City",
    "shortName": "Cardiff",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8344.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8344",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "349",
    "name": "AFC Bournemouth",
    "shortName": "Bournemouth",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/2601124.png",
    "country": "ENG",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "2601124",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=14&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "352",
    "name": "Wrexham",
    "shortName": "Wrexham",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9841.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9841",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "357",
    "name": "Leeds United",
    "shortName": "Leeds",
    "crestUrl": "https://resources.premierleague.com/premierleague/badges/100/t2.png",
    "country": "ENG",
    "source": "premierleague.com",
    "secondary": false,
    "sourceTeamId": "9",
    "sourceUrl": "https://footballapi.pulselive.com/football/teams?pageSize=100&compSeasons=841&comps=1&altIds=true&page=0"
  },
  {
    "espnId": "358",
    "name": "Bolton Wanderers",
    "shortName": "Bolton",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8559.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8559",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "359",
    "name": "Arsenal FC",
    "shortName": "Arsenal",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/52280.png",
    "country": "ENG",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "52280",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=1&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "360",
    "name": "Manchester United",
    "shortName": "Man Utd",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/52682.png",
    "country": "ENG",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "52682",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=1&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "361",
    "name": "Newcastle United",
    "shortName": "Newcastle",
    "crestUrl": "https://resources.premierleague.com/premierleague/badges/100/t4.png",
    "country": "ENG",
    "source": "premierleague.com",
    "secondary": false,
    "sourceTeamId": "23",
    "sourceUrl": "https://footballapi.pulselive.com/football/teams?pageSize=100&compSeasons=841&comps=1&altIds=true&page=0"
  },
  {
    "espnId": "362",
    "name": "Aston Villa",
    "shortName": "Aston Villa",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/52683.png",
    "country": "ENG",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "52683",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=1&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "363",
    "name": "Chelsea",
    "shortName": "Chelsea",
    "crestUrl": "https://resources.premierleague.com/premierleague/badges/100/t8.png",
    "country": "ENG",
    "source": "premierleague.com",
    "secondary": false,
    "sourceTeamId": "4",
    "sourceUrl": "https://footballapi.pulselive.com/football/teams?pageSize=100&compSeasons=841&comps=1&altIds=true&page=0"
  },
  {
    "espnId": "364",
    "name": "Liverpool FC",
    "shortName": "Liverpool",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/7889.png",
    "country": "ENG",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "7889",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=1&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "365",
    "name": "Blackburn Rovers",
    "shortName": "Blackburn",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8655.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8655",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "366",
    "name": "Sunderland AFC",
    "shortName": "Sunderland",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/53360.png",
    "country": "ENG",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "53360",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=14&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "367",
    "name": "Tottenham Hotspur",
    "shortName": "Spurs",
    "crestUrl": "https://resources.premierleague.com/premierleague/badges/100/t6.png",
    "country": "ENG",
    "source": "premierleague.com",
    "secondary": false,
    "sourceTeamId": "21",
    "sourceUrl": "https://footballapi.pulselive.com/football/teams?pageSize=100&compSeasons=841&comps=1&altIds=true&page=0"
  },
  {
    "espnId": "368",
    "name": "Everton",
    "shortName": "Everton",
    "crestUrl": "https://resources.premierleague.com/premierleague/badges/100/t11.png",
    "country": "ENG",
    "source": "premierleague.com",
    "secondary": false,
    "sourceTeamId": "7",
    "sourceUrl": "https://footballapi.pulselive.com/football/teams?pageSize=100&compSeasons=841&comps=1&altIds=true&page=0"
  },
  {
    "espnId": "369",
    "name": "Middlesbrough",
    "shortName": "Middlesbrough",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8549.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8549",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "370",
    "name": "Fulham",
    "shortName": "Fulham",
    "crestUrl": "https://resources.premierleague.com/premierleague/badges/100/t54.png",
    "country": "ENG",
    "source": "premierleague.com",
    "secondary": false,
    "sourceTeamId": "34",
    "sourceUrl": "https://footballapi.pulselive.com/football/teams?pageSize=100&compSeasons=841&comps=1&altIds=true&page=0"
  },
  {
    "espnId": "371",
    "name": "West Ham United",
    "shortName": "West Ham",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8654.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8654",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "372",
    "name": "Charlton Athletic",
    "shortName": "Charlton",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8451.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8451",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "373",
    "name": "Ipswich Town",
    "shortName": "Ipswich",
    "crestUrl": "https://resources.premierleague.com/premierleague/badges/100/t40.png",
    "country": "ENG",
    "source": "premierleague.com",
    "secondary": false,
    "sourceTeamId": "8",
    "sourceUrl": "https://footballapi.pulselive.com/football/teams?pageSize=100&compSeasons=841&comps=1&altIds=true&page=0"
  },
  {
    "espnId": "374",
    "name": "Derby County",
    "shortName": "Derby",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10170.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10170",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "376",
    "name": "Southampton",
    "shortName": "Southampton",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8466.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8466",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "379",
    "name": "Burnley",
    "shortName": "Burnley",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8191.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8191",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "380",
    "name": "Wolverhampton Wanderers",
    "shortName": "Wolves",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8602.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8602",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "381",
    "name": "Norwich City",
    "shortName": "Norwich",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9850.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9850",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "382",
    "name": "Manchester City",
    "shortName": "Man City",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/52919.png",
    "country": "ENG",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "52919",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=1&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "383",
    "name": "West Bromwich Albion",
    "shortName": "West Brom",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8659.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8659",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "384",
    "name": "Crystal Palace F.C.",
    "shortName": "Crystal Palace",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/52916.png",
    "country": "ENG",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "52916",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=14&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "385",
    "name": "Portsmouth",
    "shortName": "Portsmouth",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8462.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8462",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "388",
    "name": "Coventry City",
    "shortName": "Coventry",
    "crestUrl": "https://resources.premierleague.com/premierleague/badges/100/t9.png",
    "country": "ENG",
    "source": "premierleague.com",
    "secondary": false,
    "sourceTeamId": "5",
    "sourceUrl": "https://footballapi.pulselive.com/football/teams?pageSize=100&compSeasons=841&comps=1&altIds=true&page=0"
  },
  {
    "espnId": "391",
    "name": "Millwall",
    "shortName": "Millwall",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10004.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10004",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "392",
    "name": "Birmingham City",
    "shortName": "Birmingham",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8658.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8658",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "393",
    "name": "Nottingham Forest",
    "shortName": "Nott'm Forest",
    "crestUrl": "https://resources.premierleague.com/premierleague/badges/100/t17.png",
    "country": "ENG",
    "source": "premierleague.com",
    "secondary": false,
    "sourceTeamId": "15",
    "sourceUrl": "https://footballapi.pulselive.com/football/teams?pageSize=100&compSeasons=841&comps=1&altIds=true&page=0"
  },
  {
    "espnId": "394",
    "name": "Preston North End",
    "shortName": "Preston",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8411.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8411",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "395",
    "name": "Watford",
    "shortName": "Watford",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9817.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9817",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "398",
    "name": "Sheffield United",
    "shortName": "Sheff Utd",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8657.png",
    "country": "ENG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8657",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=48"
  },
  {
    "espnId": "432",
    "name": "Galatasaray A.Ş.",
    "shortName": "Galatasaray",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/50067.png",
    "country": "TUR",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "50067",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=1&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "433",
    "name": "AC Sparta Praha",
    "shortName": "Sparta Praha",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/50033.png",
    "country": "CZE",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "50033",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=14&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "435",
    "name": "Olympiacos FC",
    "shortName": "Olympiacos",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/2610.png",
    "country": "GRE",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "2610",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=14&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "436",
    "name": "Fenerbahçe SK",
    "shortName": "Fenerbahçe",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/52692.png",
    "country": "TUR",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "52692",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=1&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "437",
    "name": "FC Porto",
    "shortName": "Porto",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/50064.png",
    "country": "POR",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "50064",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=1&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "438",
    "name": "Rosenborg",
    "shortName": "Rosenborg",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8422.png",
    "country": "NOR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8422",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=59"
  },
  {
    "espnId": "441",
    "name": "RSC Anderlecht",
    "shortName": "Anderlecht",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/50074.png",
    "country": "BEL",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "50074",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=14&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "443",
    "name": "Panathinaikos FC",
    "shortName": "Panathinaikos",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/50084.png",
    "country": "GRE",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "50084",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=2019&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "489",
    "name": "HNK Hajduk Split",
    "shortName": "Hajduk Split",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/52359.png",
    "country": "CRO",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "52359",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=2019&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "490",
    "name": "PFC Levski Sofia",
    "shortName": "Levski Sofia",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/50044.png",
    "country": "BUL",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "50044",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=14&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "492",
    "name": "Grasshopper",
    "shortName": "Grasshopper",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9956.png",
    "country": "SUI",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9956",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=69"
  },
  {
    "espnId": "493",
    "name": "FC Shakhtar Donetsk",
    "shortName": "Shakhtar",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/52707.png",
    "country": "UKR",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "52707",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=1&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "494",
    "name": "SK Slavia Praha",
    "shortName": "Slavia Praha",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/52498.png",
    "country": "CZE",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "52498",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=1&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "510",
    "name": "Viking FK",
    "shortName": "Viking",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/52319.png",
    "country": "NOR",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "52319",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=1&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "519",
    "name": "Rapid Wien",
    "shortName": "Rapid Wien",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10015.png",
    "country": "AUT",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10015",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=38"
  },
  {
    "espnId": "521",
    "name": "ŠK Slovan Bratislava",
    "shortName": "S. Bratislava",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/52797.png",
    "country": "SVK",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "52797",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=1&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "529",
    "name": "Elfsborg",
    "shortName": "Elfsborg",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8014.png",
    "country": "SWE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8014",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=67"
  },
  {
    "espnId": "552",
    "name": "Marítimo",
    "shortName": "Marítimo",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10212.png",
    "country": "POR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10212",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=61"
  },
  {
    "espnId": "557",
    "name": "St. Gallen",
    "shortName": "St. Gallen",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10190.png",
    "country": "SUI",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10190",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=69"
  },
  {
    "espnId": "559",
    "name": "Standard de Liège",
    "shortName": "Standard de Liège",
    "crestUrl": "https://statics-maker.llt-services.com/prl/images/2024/08/01/original/cf44703b-48d2-4a92-b859-968d86e19340-383.png",
    "country": "BEL",
    "source": "proleague.be",
    "secondary": false,
    "sourceTeamId": "13ceba74-ed6b-4027-bfcc-c8e45337ef98",
    "sourceUrl": "https://www.proleague.be/jpl"
  },
  {
    "espnId": "570",
    "name": "Club Brugge KV",
    "shortName": "Club Brugge",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/50043.png",
    "country": "BEL",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "50043",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=1&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "572",
    "name": "FC Midtjylland",
    "shortName": "Midtjylland",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/75795.png",
    "country": "DEN",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "75795",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=2019&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "575",
    "name": "Brøndby IF",
    "shortName": "Brøndby IF",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8595.png",
    "country": "DEN",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8595",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=46"
  },
  {
    "espnId": "597",
    "name": "GNK Dinamo",
    "shortName": "GNK Dinamo",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/50164.png",
    "country": "CRO",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "50164",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=14&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "598",
    "name": "1. FC Union Berlin",
    "shortName": "1. FC Union Berlin",
    "crestUrl": "https://www.bundesliga.com/assets/clublogo/DFL-CLU-00000V.svg",
    "country": "GER",
    "source": "bundesliga.com",
    "secondary": false,
    "sourceTeamId": "DFL-CLU-00000V",
    "sourceUrl": "https://www.bundesliga.com/de/bundesliga/clubs"
  },
  {
    "espnId": "605",
    "name": "PAOK Thessaloniki",
    "shortName": "PAOK Thessaloniki",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8619.png",
    "country": "GRE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8619",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=135"
  },
  {
    "espnId": "606",
    "name": "KVC Westerlo",
    "shortName": "KVC Westerlo",
    "crestUrl": "https://statics-maker.llt-services.com/prl/images/2023/06/22/optimized/3d32fc5b-587f-4880-8ba7-2b88316e6cbe-745.png",
    "country": "BEL",
    "source": "proleague.be",
    "secondary": false,
    "sourceTeamId": "fb0037bb-e6f4-474f-8fb2-ab873e7df147",
    "sourceUrl": "https://www.proleague.be/jpl"
  },
  {
    "espnId": "607",
    "name": "Silkeborg",
    "shortName": "Silkeborg",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8415.png",
    "country": "DEN",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8415",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=46"
  },
  {
    "espnId": "617",
    "name": "Omonia FC",
    "shortName": "Omonia",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/50077.png",
    "country": "CYP",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "50077",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=14&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "620",
    "name": "SK Brann",
    "shortName": "Brann",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/52770.png",
    "country": "NOR",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "52770",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=2019&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "622",
    "name": "Ferencvárosi TC",
    "shortName": "Ferencváros",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/52298.png",
    "country": "HUN",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "52298",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=14&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "789",
    "name": "Göztepe",
    "shortName": "Göztepe",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1925.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1925",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "819",
    "name": "Flamengo",
    "shortName": "Flamengo",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9770.png",
    "country": "BRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9770",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=268"
  },
  {
    "espnId": "874",
    "name": "Corinthians",
    "shortName": "Corinthians",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9808.png",
    "country": "BRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9808",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=268"
  },
  {
    "espnId": "885",
    "name": "Universidad Católica",
    "shortName": "Universidad Católica",
    "crestUrl": "https://www.anfp.cl/wp-content/uploads/2025/01/U-Catolica.png",
    "country": "CHI",
    "source": "anfp.cl",
    "secondary": false,
    "sourceTeamId": "164",
    "sourceUrl": "https://www.anfp.cl/clubes/"
  },
  {
    "espnId": "887",
    "name": "AEK Athens FC",
    "shortName": "AEK Athens",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/50129.png",
    "country": "GRE",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "50129",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=1&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "909",
    "name": "F.C. Copenhagen",
    "shortName": "Copenhagen",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/52709.png",
    "country": "DEN",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "52709",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=2019&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "936",
    "name": "K. Sint-Truidense VV",
    "shortName": "Sint-Truidense",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/52883.png",
    "country": "BEL",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "52883",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=2019&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "938",
    "name": "KRC Genk",
    "shortName": "KRC Genk",
    "crestUrl": "https://statics-maker.llt-services.com/prl/images/2026/07/17/original/a933c4c1-7731-4003-8402-9cfe8f9e5cc5-508.png",
    "country": "BEL",
    "source": "proleague.be",
    "secondary": false,
    "sourceTeamId": "e79bacb9-c33a-44ac-a450-f18396b6b4ff",
    "sourceUrl": "https://www.proleague.be/jpl"
  },
  {
    "espnId": "987",
    "name": "Lillestrøm SK",
    "shortName": "Lillestrøm",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/52314.png",
    "country": "NOR",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "52314",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=14&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "989",
    "name": "Basel",
    "shortName": "Basel",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9931.png",
    "country": "SUI",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9931",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=69"
  },
  {
    "espnId": "994",
    "name": "AIK",
    "shortName": "AIK",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8349.png",
    "country": "SWE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8349",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=67"
  },
  {
    "espnId": "995",
    "name": "Kocaelispor",
    "shortName": "Kocaelispor",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1569.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1569",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "996",
    "name": "Gençlerbirliği",
    "shortName": "Gençlerbirliği",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/7800.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "7800",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "997",
    "name": "Trabzonspor A.Ş.",
    "shortName": "Trabzonspor",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/52731.png",
    "country": "TUR",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "52731",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=2019&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "1007",
    "name": "Defensor Sporting Club",
    "shortName": "Defensor Sporting Club",
    "crestUrl": "https://www.auf.org.uy/imagenes/img_contenido/club_club/a/defensor_22.png",
    "country": "URU",
    "source": "auf.org.uy",
    "secondary": false,
    "sourceTeamId": "defensor_22.png",
    "sourceUrl": "https://www.auf.org.uy/"
  },
  {
    "espnId": "1010",
    "name": "OFI Crete FC",
    "shortName": "OFI Crete",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/52953.png",
    "country": "GRE",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "52953",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=14&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "1011",
    "name": "Delfín",
    "shortName": "Delfín",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/519457.png",
    "country": "ECU",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "519457",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=246"
  },
  {
    "espnId": "1068",
    "name": "Atlético de Madrid",
    "shortName": "Atleti",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/50124.png",
    "country": "ESP",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "50124",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=1&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "1382",
    "name": "Austria Wien",
    "shortName": "Austria Wien",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10011.png",
    "country": "AUT",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10011",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=38"
  },
  {
    "espnId": "1538",
    "name": "Levante UD",
    "shortName": "Levante UD",
    "crestUrl": "https://assets.laliga.com/assets/2019/06/07/medium/levante.png",
    "country": "ESP",
    "source": "laliga.com",
    "secondary": false,
    "sourceTeamId": "11",
    "sourceUrl": "https://www.laliga.com/laliga-easports/clubes"
  },
  {
    "espnId": "1895",
    "name": "Beşiktaş JK",
    "shortName": "Beşiktaş",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/50157.png",
    "country": "TUR",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "50157",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=14&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "1929",
    "name": "SL Benfica",
    "shortName": "Benfica",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/50147.png",
    "country": "POR",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "50147",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=14&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "1936",
    "name": "Internacional",
    "shortName": "Internacional",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8702.png",
    "country": "BRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8702",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=268"
  },
  {
    "espnId": "2022",
    "name": "Cruzeiro",
    "shortName": "Cruzeiro",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9781.png",
    "country": "BRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9781",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=268"
  },
  {
    "espnId": "2026",
    "name": "São Paulo",
    "shortName": "São Paulo",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10277.png",
    "country": "BRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10277",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=268"
  },
  {
    "espnId": "2029",
    "name": "Palmeiras",
    "shortName": "Palmeiras",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10283.png",
    "country": "BRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10283",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=268"
  },
  {
    "espnId": "2250",
    "name": "Sporting Clube de Portugal",
    "shortName": "Sporting CP",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/50149.png",
    "country": "POR",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "50149",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=1&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "2290",
    "name": "FK Crvena Zvezda",
    "shortName": "Crvena Zvezda",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/50069.png",
    "country": "SRB",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "50069",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=2019&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "2339",
    "name": "Djurgården",
    "shortName": "Djurgården",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9802.png",
    "country": "SWE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9802",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=67"
  },
  {
    "espnId": "2495",
    "name": "Hammarby",
    "shortName": "Hammarby",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8248.png",
    "country": "SWE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8248",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=67"
  },
  {
    "espnId": "2502",
    "name": "OGC Nice",
    "shortName": "Nice",
    "crestUrl": "https://s3.eu-west-1.amazonaws.com/image.mpg/assets/clubs/logo/2023_1_30_128x128_eb33f30ec2a8dfbebe1f8d5b49149451.png",
    "country": "FRA",
    "source": "ligue1.com",
    "secondary": false,
    "sourceTeamId": "l1_championship_club_2026_30",
    "sourceUrl": "https://ma-api.ligue1.fr/championship-matches/championship/1/game-week/1?season=2026"
  },
  {
    "espnId": "2528",
    "name": "FC Kairat Almaty",
    "shortName": "Kairat Almaty",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/79970.png",
    "country": "KAZ",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "79970",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=2019&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "2556",
    "name": "IFK Göteborg",
    "shortName": "IFK Göteborg",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9893.png",
    "country": "SWE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9893",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=67"
  },
  {
    "espnId": "2565",
    "name": "PEC Zwolle",
    "shortName": "PEC Zwolle",
    "crestUrl": "https://eredivisie.b-cdn.net/production/clubs/pec-zwolle/PECZwolle_Logo.png?width=96&height=96&quality=85",
    "country": "NED",
    "source": "eredivisie.nl",
    "secondary": false,
    "sourceTeamId": "pec-zwolle",
    "sourceUrl": "https://eredivisie.nl/competitie/clubs/"
  },
  {
    "espnId": "2566",
    "name": "Excelsior Rotterdam",
    "shortName": "Excelsior Rotterdam",
    "crestUrl": "https://eredivisie.b-cdn.net/production/clubs/excelsior-rotterdam/ExcelsiorRotterdam_Logo.png?width=96&height=96&quality=85",
    "country": "NED",
    "source": "eredivisie.nl",
    "secondary": false,
    "sourceTeamId": "excelsior-rotterdam",
    "sourceUrl": "https://eredivisie.nl/competitie/clubs/"
  },
  {
    "espnId": "2572",
    "name": "Como 1907",
    "shortName": "Como",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/79946.png",
    "country": "ITA",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "79946",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=1&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "2575",
    "name": "Iraklis",
    "shortName": "Iraklis",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8675.png",
    "country": "GRE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8675",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=135"
  },
  {
    "espnId": "2668",
    "name": "Emelec",
    "shortName": "Emelec",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1850.png",
    "country": "ECU",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1850",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=246"
  },
  {
    "espnId": "2670",
    "name": "Club Libertad",
    "shortName": "Libertad",
    "crestUrl": "https://statics-maker.llt-services.com/apf/images/2024/06/13/original/82e27fcb-621c-46e4-9e62-21c67384e045-769.png",
    "country": "PAR",
    "source": "apf.org.py",
    "secondary": false,
    "sourceTeamId": "4f4aa07c-3e10-47ca-be0c-1ceade8f2ed5",
    "sourceUrl": "https://www.apf.org.py/"
  },
  {
    "espnId": "2671",
    "name": "Club Cerro Porteño",
    "shortName": "Cerro Porteño",
    "crestUrl": "https://statics-maker.llt-services.com/apf/images/2025/06/04/original/50f0da33-cae8-4d6d-8ed3-bb11f1934b72-977.png",
    "country": "PAR",
    "source": "apf.org.py",
    "secondary": false,
    "sourceTeamId": "7fd7d89e-9550-4fd3-88cb-92dbd4eca817",
    "sourceUrl": "https://www.apf.org.py/"
  },
  {
    "espnId": "2672",
    "name": "Deportivo Cali",
    "shortName": "Deportivo Cali",
    "crestUrl": "https://dimayor.com.co/wp-content/uploads/2025/11/escudos-1080p_0012_DEPORTIVO-CALI-5-300x300.png",
    "country": "COL",
    "source": "dimayor.com.co",
    "secondary": false,
    "sourceTeamId": "165359",
    "sourceUrl": "https://dimayor.com.co/wp-json/wp/v2/dimayor_team?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "2674",
    "name": "Santos",
    "shortName": "Santos",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8514.png",
    "country": "BRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8514",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=268"
  },
  {
    "espnId": "2675",
    "name": "Club Olimpia",
    "shortName": "Olimpia",
    "crestUrl": "https://statics-maker.llt-services.com/apf/images/2024/06/04/original/db37e69a-06d5-4ef1-9528-a142d9b1ea64-673.png",
    "country": "PAR",
    "source": "apf.org.py",
    "secondary": false,
    "sourceTeamId": "bbfd88b8-fe7a-4248-93f4-709e36f75fa4",
    "sourceUrl": "https://www.apf.org.py/"
  },
  {
    "espnId": "2681",
    "name": "Bolívar",
    "shortName": "Bolívar",
    "crestUrl": "https://fbf.com.bo/wp-content/uploads/2025/12/1-3-150x150.png",
    "country": "BOL",
    "source": "fbf.com.bo",
    "secondary": false,
    "sourceTeamId": "47217",
    "sourceUrl": "https://fbf.com.bo/wp-json/sportspress/v2/teams?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "2682",
    "name": "CD Oriente Petrolero",
    "shortName": "CD Oriente Petrolero",
    "crestUrl": "https://fbf.com.bo/wp-content/uploads/2025/12/1-7-150x150.png",
    "country": "BOL",
    "source": "fbf.com.bo",
    "secondary": false,
    "sourceTeamId": "47234",
    "sourceUrl": "https://fbf.com.bo/wp-json/sportspress/v2/teams?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "2683",
    "name": "Club Atlético Peñarol",
    "shortName": "Club Atlético Peñarol",
    "crestUrl": "https://www.auf.org.uy/imagenes/img_contenido/club_club/a/1922.png",
    "country": "URU",
    "source": "auf.org.uy",
    "secondary": false,
    "sourceTeamId": "1922.png",
    "sourceUrl": "https://www.auf.org.uy/"
  },
  {
    "espnId": "2684",
    "name": "Club Nacional de Football",
    "shortName": "Club Nacional de Football",
    "crestUrl": "https://www.auf.org.uy/imagenes/img_contenido/club_club/a/nacional248709.png",
    "country": "URU",
    "source": "auf.org.uy",
    "secondary": false,
    "sourceTeamId": "nacional248709.png",
    "sourceUrl": "https://www.auf.org.uy/"
  },
  {
    "espnId": "2686",
    "name": "Barcelona SC",
    "shortName": "Barcelona SC",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6453.png",
    "country": "ECU",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6453",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=246"
  },
  {
    "espnId": "2687",
    "name": "The Strongest",
    "shortName": "The Strongest",
    "crestUrl": "https://fbf.com.bo/wp-content/uploads/2025/12/1-11-150x150.png",
    "country": "BOL",
    "source": "fbf.com.bo",
    "secondary": false,
    "sourceTeamId": "47219",
    "sourceUrl": "https://fbf.com.bo/wp-json/sportspress/v2/teams?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "2688",
    "name": "Colo Colo",
    "shortName": "Colo Colo",
    "crestUrl": "https://www.anfp.cl/wp-content/uploads/2024/11/colo-colo-2019-logo-295F85E3FE-seeklogo.com_.png",
    "country": "CHI",
    "source": "anfp.cl",
    "secondary": false,
    "sourceTeamId": "124",
    "sourceUrl": "https://www.anfp.cl/clubes/"
  },
  {
    "espnId": "2690",
    "name": "Independiente Medellín",
    "shortName": "Independiente Medellín",
    "crestUrl": "https://dimayor.com.co/wp-content/uploads/2026/06/dim-nuevop-300x300.png",
    "country": "COL",
    "source": "dimayor.com.co",
    "secondary": false,
    "sourceTeamId": "165369",
    "sourceUrl": "https://dimayor.com.co/wp-json/wp/v2/dimayor_team?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "2697",
    "name": "Le Mans FC",
    "shortName": "Le Mans",
    "crestUrl": "https://s3.eu-west-1.amazonaws.com/image.mpg/7f0c4f0c-37e4-411f-b765-fbe1b5f4732e",
    "country": "FRA",
    "source": "ligue1.com",
    "secondary": false,
    "sourceTeamId": "l1_championship_club_2026_26",
    "sourceUrl": "https://ma-api.ligue1.fr/championship-matches/championship/1/game-week/1?season=2026"
  },
  {
    "espnId": "2715",
    "name": "Molde",
    "shortName": "Molde",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9917.png",
    "country": "NOR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9917",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=59"
  },
  {
    "espnId": "2720",
    "name": "Malmö FF",
    "shortName": "Malmö FF",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10237.png",
    "country": "SWE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10237",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=67"
  },
  {
    "espnId": "2722",
    "name": "Young Boys",
    "shortName": "Young Boys",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10192.png",
    "country": "SUI",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10192",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=69"
  },
  {
    "espnId": "2726",
    "name": "ADO Den Haag",
    "shortName": "ADO Den Haag",
    "crestUrl": "https://eredivisie.b-cdn.net/production/clubs/ado-den-haag/ADODenHaag_Logo.png?width=96&height=96&quality=85",
    "country": "NED",
    "source": "eredivisie.nl",
    "secondary": false,
    "sourceTeamId": "ado-den-haag",
    "sourceUrl": "https://eredivisie.nl/competitie/clubs/"
  },
  {
    "espnId": "2790",
    "name": "FC Salzburg",
    "shortName": "Salzburg",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/50030.png",
    "country": "AUT",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "50030",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=14&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "2791",
    "name": "Vålerenga",
    "shortName": "Vålerenga",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8007.png",
    "country": "NOR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8007",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=59"
  },
  {
    "espnId": "2919",
    "name": "Once Caldas DAF",
    "shortName": "Once Caldas DAF",
    "crestUrl": "https://dimayor.com.co/wp-content/uploads/2025/11/escudos-1080p_0001_ONCE-CALDAS-DAF-5-300x300.png",
    "country": "COL",
    "source": "dimayor.com.co",
    "secondary": false,
    "sourceTeamId": "165387",
    "sourceUrl": "https://dimayor.com.co/wp-json/wp/v2/dimayor_team?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "2922",
    "name": "Getafe CF",
    "shortName": "Getafe",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/87960.png",
    "country": "ESP",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "87960",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=2019&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "2925",
    "name": "Cagliari",
    "shortName": "Cagliari",
    "crestUrl": "https://media-sdp.legaseriea.it/clubLogos/25aecd0eda3e4453aabd9a9d5e7fba0d.webp",
    "country": "ITA",
    "source": "legaseriea.it",
    "secondary": false,
    "sourceTeamId": "25aecd0eda3e4453aabd9a9d5e7fba0d",
    "sourceUrl": "https://www.legaseriea.it/serie-a"
  },
  {
    "espnId": "2950",
    "name": "1. FSV Mainz 05",
    "shortName": "1. FSV Mainz 05",
    "crestUrl": "https://www.bundesliga.com/assets/clublogo/DFL-CLU-000006.svg",
    "country": "GER",
    "source": "bundesliga.com",
    "secondary": false,
    "sourceTeamId": "DFL-CLU-000006",
    "sourceUrl": "https://www.bundesliga.com/de/bundesliga/clubs"
  },
  {
    "espnId": "2975",
    "name": "Instituto",
    "shortName": "Instituto",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10090.png",
    "country": "ARG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10090",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=112"
  },
  {
    "espnId": "2980",
    "name": "FK Bodø/Glimt",
    "shortName": "Bodø/Glimt",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/59333.png",
    "country": "NOR",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "59333",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=1&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "2990",
    "name": "KKS Lech Poznań",
    "shortName": "Lech Poznań",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/64227.png",
    "country": "POL",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "64227",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=14&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "2994",
    "name": "SC Braga",
    "shortName": "Braga",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/52336.png",
    "country": "POR",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "52336",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=2019&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "3017",
    "name": "Halmstads BK",
    "shortName": "Halmstads BK",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8310.png",
    "country": "SWE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8310",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=67"
  },
  {
    "espnId": "3019",
    "name": "FC Zürich",
    "shortName": "FC Zürich",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10243.png",
    "country": "SUI",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10243",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=69"
  },
  {
    "espnId": "3024",
    "name": "FC Thun",
    "shortName": "Thun",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/80409.png",
    "country": "SUI",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "80409",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=2019&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "3039",
    "name": "Fredrikstad",
    "shortName": "Fredrikstad",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8417.png",
    "country": "NOR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8417",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=59"
  },
  {
    "espnId": "3052",
    "name": "Kalmar FF",
    "shortName": "Kalmar FF",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9892.png",
    "country": "SWE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9892",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=67"
  },
  {
    "espnId": "3076",
    "name": "Sion",
    "shortName": "Sion",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10179.png",
    "country": "SUI",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10179",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=69"
  },
  {
    "espnId": "3101",
    "name": "FC Nordsjælland",
    "shortName": "Nordsjælland",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/79940.png",
    "country": "DEN",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "79940",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=2019&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "3132",
    "name": "Randers FC",
    "shortName": "Randers FC",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8410.png",
    "country": "DEN",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8410",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=46"
  },
  {
    "espnId": "3153",
    "name": "Viborg",
    "shortName": "Viborg",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9939.png",
    "country": "DEN",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9939",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=46"
  },
  {
    "espnId": "3236",
    "name": "Havre Athletic Club",
    "shortName": "Le Havre",
    "crestUrl": "https://s3.eu-west-1.amazonaws.com/image.mpg/assets/clubs/logo/2023_1_5_128x128_08ea6f21e63bbc926a6b2e99a54d66b9.png",
    "country": "FRA",
    "source": "ligue1.com",
    "secondary": false,
    "sourceTeamId": "l1_championship_club_2026_5",
    "sourceUrl": "https://ma-api.ligue1.fr/championship-matches/championship/1/game-week/1?season=2026"
  },
  {
    "espnId": "3263",
    "name": "Genoa",
    "shortName": "Genoa",
    "crestUrl": "https://media-sdp.legaseriea.it/clubLogos/8c7aa94d22f44738951748e2ccdf319a.webp",
    "country": "ITA",
    "source": "legaseriea.it",
    "secondary": false,
    "sourceTeamId": "8c7aa94d22f44738951748e2ccdf319a",
    "sourceUrl": "https://www.legaseriea.it/serie-a"
  },
  {
    "espnId": "3278",
    "name": "Aalesund",
    "shortName": "Aalesund",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8404.png",
    "country": "NOR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8404",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=59"
  },
  {
    "espnId": "3279",
    "name": "Sandefjord",
    "shortName": "Sandefjord",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8609.png",
    "country": "NOR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8609",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=59"
  },
  {
    "espnId": "3307",
    "name": "SC Paderborn 07",
    "shortName": "SC Paderborn 07",
    "crestUrl": "https://www.bundesliga.com/assets/clublogo/DFL-CLU-00000L.svg",
    "country": "GER",
    "source": "bundesliga.com",
    "secondary": false,
    "sourceTeamId": "DFL-CLU-00000L",
    "sourceUrl": "https://www.bundesliga.com/de/bundesliga/clubs"
  },
  {
    "espnId": "3362",
    "name": "NK Celje",
    "shortName": "Celje",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/59030.png",
    "country": "SVN",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "59030",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=14&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "3445",
    "name": "Fluminense",
    "shortName": "Fluminense",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9863.png",
    "country": "BRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9863",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=268"
  },
  {
    "espnId": "3454",
    "name": "Vasco da Gama",
    "shortName": "Vasco da Gama",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10276.png",
    "country": "BRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10276",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=268"
  },
  {
    "espnId": "3456",
    "name": "Coritiba",
    "shortName": "Coritiba",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9767.png",
    "country": "BRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9767",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=268"
  },
  {
    "espnId": "3457",
    "name": "Vitória",
    "shortName": "Vitória",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/7733.png",
    "country": "BRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "7733",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=268"
  },
  {
    "espnId": "3458",
    "name": "Athletico Paranaense",
    "shortName": "Athletico Paranaense",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10273.png",
    "country": "BRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10273",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=268"
  },
  {
    "espnId": "3472",
    "name": "Nacional",
    "shortName": "Nacional",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10214.png",
    "country": "POR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10214",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=61"
  },
  {
    "espnId": "3585",
    "name": "AC Horsens",
    "shortName": "AC Horsens",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9814.png",
    "country": "DEN",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9814",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=46"
  },
  {
    "espnId": "3610",
    "name": "Cercle Brugge",
    "shortName": "Cercle Brugge",
    "crestUrl": "https://statics-maker.llt-services.com/prl/images/2023/06/22/optimized/056065e8-3441-4645-a903-3c93c396627b-657.png",
    "country": "BEL",
    "source": "proleague.be",
    "secondary": false,
    "sourceTeamId": "4c804f0f-414d-4c53-8b84-b2bbb9cc9b1a",
    "sourceUrl": "https://www.proleague.be/jpl"
  },
  {
    "espnId": "3611",
    "name": "KAA Gent",
    "shortName": "Gent",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/4608.png",
    "country": "BEL",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "4608",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=2019&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "3616",
    "name": "Sporting Charleroi",
    "shortName": "Sporting Charleroi",
    "crestUrl": "https://statics-maker.llt-services.com/prl/images/2024/09/18/original/55b8f4cf-9d25-4165-881f-917dbd1a3600-545.png",
    "country": "BEL",
    "source": "proleague.be",
    "secondary": false,
    "sourceTeamId": "304d6c29-ca06-46c1-805e-ef07a1005ad6",
    "sourceUrl": "https://www.proleague.be/jpl"
  },
  {
    "espnId": "3696",
    "name": "Moreirense",
    "shortName": "Moreirense",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8348.png",
    "country": "POR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8348",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=61"
  },
  {
    "espnId": "3699",
    "name": "Gil Vicente",
    "shortName": "Gil Vicente",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9764.png",
    "country": "POR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9764",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=61"
  },
  {
    "espnId": "3706",
    "name": "Go Ahead Eagles",
    "shortName": "Go Ahead Eagles",
    "crestUrl": "https://eredivisie.b-cdn.net/production/clubs/go-ahead-eagles/GoAheadEagles_Logo.png?width=96&height=96&quality=85",
    "country": "NED",
    "source": "eredivisie.nl",
    "secondary": false,
    "sourceTeamId": "go-ahead-eagles",
    "sourceUrl": "https://eredivisie.nl/competitie/clubs/"
  },
  {
    "espnId": "3735",
    "name": "Telstar",
    "shortName": "Telstar",
    "crestUrl": "https://eredivisie.b-cdn.net/production/clubs/telstar/Telstar_Logo.png?width=96&height=96&quality=85",
    "country": "NED",
    "source": "eredivisie.nl",
    "secondary": false,
    "sourceTeamId": "telstar",
    "sourceUrl": "https://eredivisie.nl/competitie/clubs/"
  },
  {
    "espnId": "3736",
    "name": "SC Cambuur",
    "shortName": "SC Cambuur",
    "crestUrl": "https://eredivisie.b-cdn.net/production/clubs/sc-cambuur/SCCambuur_Logo.png?width=96&height=96&quality=85",
    "country": "NED",
    "source": "eredivisie.nl",
    "secondary": false,
    "sourceTeamId": "sc-cambuur",
    "sourceUrl": "https://eredivisie.nl/competitie/clubs/"
  },
  {
    "espnId": "3746",
    "name": "SK Sturm Graz",
    "shortName": "Sturm Graz",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/50111.png",
    "country": "AUT",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "50111",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=14&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "3751",
    "name": "Elche CF",
    "shortName": "Elche CF",
    "crestUrl": "https://assets.laliga.com/assets/2019/06/07/medium/elche.png",
    "country": "ESP",
    "source": "laliga.com",
    "secondary": false,
    "sourceTeamId": "7",
    "sourceUrl": "https://www.laliga.com/laliga-easports/clubes"
  },
  {
    "espnId": "3759",
    "name": "Ried",
    "shortName": "Ried",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10017.png",
    "country": "AUT",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10017",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=38"
  },
  {
    "espnId": "3822",
    "name": "Rio Ave",
    "shortName": "Rio Ave",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/7841.png",
    "country": "POR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "7841",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=61"
  },
  {
    "espnId": "3841",
    "name": "FC Augsburg",
    "shortName": "FC Augsburg",
    "crestUrl": "https://www.bundesliga.com/assets/clublogo/DFL-CLU-000010.svg",
    "country": "GER",
    "source": "bundesliga.com",
    "secondary": false,
    "sourceTeamId": "DFL-CLU-000010",
    "sourceUrl": "https://www.bundesliga.com/de/bundesliga/clubs"
  },
  {
    "espnId": "3997",
    "name": "Sassuolo",
    "shortName": "Sassuolo",
    "crestUrl": "https://media-sdp.legaseriea.it/clubLogos/b70390ba4e3c4bc2947a37617d53e8a3.webp",
    "country": "ITA",
    "source": "legaseriea.it",
    "secondary": false,
    "sourceTeamId": "b70390ba4e3c4bc2947a37617d53e8a3",
    "sourceUrl": "https://www.legaseriea.it/serie-a"
  },
  {
    "espnId": "4007",
    "name": "Monza",
    "shortName": "Monza",
    "crestUrl": "https://media-sdp.legaseriea.it/clubLogos/9ba470f39580450fac7654956ba574fa.webp",
    "country": "ITA",
    "source": "legaseriea.it",
    "secondary": false,
    "sourceTeamId": "9ba470f39580450fac7654956ba574fa",
    "sourceUrl": "https://www.legaseriea.it/serie-a"
  },
  {
    "espnId": "4057",
    "name": "Frosinone",
    "shortName": "Frosinone",
    "crestUrl": "https://media-sdp.legaseriea.it/clubLogos/b283fcc0aeda401bb081fcd764e290db.webp",
    "country": "ITA",
    "source": "legaseriea.it",
    "secondary": false,
    "sourceTeamId": "b283fcc0aeda401bb081fcd764e290db",
    "sourceUrl": "https://www.legaseriea.it/serie-a"
  },
  {
    "espnId": "4129",
    "name": "Everton de Viña del Mar",
    "shortName": "Everton de Viña del Mar",
    "crestUrl": "https://www.anfp.cl/wp-content/uploads/2024/11/EVE25_Escudo.png",
    "country": "CHI",
    "source": "anfp.cl",
    "secondary": false,
    "sourceTeamId": "175",
    "sourceUrl": "https://www.anfp.cl/clubes/"
  },
  {
    "espnId": "4133",
    "name": "Cobresal",
    "shortName": "Cobresal",
    "crestUrl": "https://www.anfp.cl/wp-content/uploads/2024/11/Escudo_Cobresal.webp",
    "country": "CHI",
    "source": "anfp.cl",
    "secondary": false,
    "sourceTeamId": "196",
    "sourceUrl": "https://www.anfp.cl/clubes/"
  },
  {
    "espnId": "4134",
    "name": "Huachipato",
    "shortName": "Huachipato",
    "crestUrl": "https://www.anfp.cl/wp-content/uploads/2024/11/b93bf99aee062db5b3f7e71b8311387c.png",
    "country": "CHI",
    "source": "anfp.cl",
    "secondary": false,
    "sourceTeamId": "192",
    "sourceUrl": "https://www.anfp.cl/clubes/"
  },
  {
    "espnId": "4137",
    "name": "Deportes La Serena",
    "shortName": "Deportes La Serena",
    "crestUrl": "https://www.anfp.cl/wp-content/uploads/2024/11/D-La-Serena.png",
    "country": "CHI",
    "source": "anfp.cl",
    "secondary": false,
    "sourceTeamId": "209",
    "sourceUrl": "https://www.anfp.cl/clubes/"
  },
  {
    "espnId": "4138",
    "name": "Audax Italiano",
    "shortName": "Audax Italiano",
    "crestUrl": "https://www.anfp.cl/wp-content/uploads/2024/11/0761d723a884d13d188a777e009b5fab.svg",
    "country": "CHI",
    "source": "anfp.cl",
    "secondary": false,
    "sourceTeamId": "184",
    "sourceUrl": "https://www.anfp.cl/clubes/"
  },
  {
    "espnId": "4139",
    "name": "Universidad de Chile",
    "shortName": "Universidad de Chile",
    "crestUrl": "https://www.anfp.cl/wp-content/uploads/2024/11/U-Chile-e1746463888853.png",
    "country": "CHI",
    "source": "anfp.cl",
    "secondary": false,
    "sourceTeamId": "136",
    "sourceUrl": "https://www.anfp.cl/clubes/"
  },
  {
    "espnId": "4405",
    "name": "Altach",
    "shortName": "Altach",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10008.png",
    "country": "AUT",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10008",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=38"
  },
  {
    "espnId": "4411",
    "name": "LASK",
    "shortName": "LASK",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/63405.png",
    "country": "AUT",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "63405",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=1&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "4422",
    "name": "Palestino",
    "shortName": "Palestino",
    "crestUrl": "https://www.anfp.cl/wp-content/uploads/2024/11/Palestino_Oficial.png",
    "country": "CHI",
    "source": "anfp.cl",
    "secondary": false,
    "sourceTeamId": "161",
    "sourceUrl": "https://www.anfp.cl/clubes/"
  },
  {
    "espnId": "4691",
    "name": "SV Zulte Waregem",
    "shortName": "SV Zulte Waregem",
    "crestUrl": "https://statics-maker.llt-services.com/prl/images/2023/08/10/optimized/b0108679-5ce7-49c4-96b2-2ac11137410c-102.png",
    "country": "BEL",
    "source": "proleague.be",
    "secondary": false,
    "sourceTeamId": "2fc41f83-c2fd-4bfd-a39f-1c5566e06ee0",
    "sourceUrl": "https://www.proleague.be/jpl"
  },
  {
    "espnId": "4771",
    "name": "Real Salt Lake",
    "shortName": "Salt Lake",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6606.png",
    "country": "USA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6606",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=130"
  },
  {
    "espnId": "4811",
    "name": "Caracas FC",
    "shortName": "Caracas FC",
    "crestUrl": "https://ligafutve.org/wp-content/uploads/2023/02/LOGO-CARACAS-FC-LF2023-150x150.png",
    "country": "VEN",
    "source": "ligafutve.org",
    "secondary": false,
    "sourceTeamId": "3395",
    "sourceUrl": "https://ligafutve.org/wp-json/sportspress/v2/teams?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "4812",
    "name": "Deportivo Cuenca",
    "shortName": "Deportivo Cuenca",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/4144.png",
    "country": "ECU",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "4144",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=246"
  },
  {
    "espnId": "4815",
    "name": "Junior F.C.",
    "shortName": "Junior F.C.",
    "crestUrl": "https://dimayor.com.co/wp-content/uploads/2025/11/ESCUDO-JUNIOR-SIN-ESTRELLAS-5-300x300.png",
    "country": "COL",
    "source": "dimayor.com.co",
    "secondary": false,
    "sourceTeamId": "165377",
    "sourceUrl": "https://dimayor.com.co/wp-json/wp/v2/dimayor_team?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "4816",
    "name": "LDU de Quito",
    "shortName": "LDU de Quito",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6721.png",
    "country": "ECU",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6721",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=246"
  },
  {
    "espnId": "4817",
    "name": "Danubio Fútbol Club",
    "shortName": "Danubio Fútbol Club",
    "crestUrl": "https://www.auf.org.uy/imagenes/img_contenido/club_club/a/danubio.png",
    "country": "URU",
    "source": "auf.org.uy",
    "secondary": false,
    "sourceTeamId": "danubio.png",
    "sourceUrl": "https://www.auf.org.uy/"
  },
  {
    "espnId": "4818",
    "name": "Deportivo Táchira FC",
    "shortName": "Deportivo Táchira FC",
    "crestUrl": "https://ligafutve.org/wp-content/uploads/2025/01/escudo-TAC-11-150x150.png",
    "country": "VEN",
    "source": "ligafutve.org",
    "secondary": false,
    "sourceTeamId": "3453",
    "sourceUrl": "https://ligafutve.org/wp-json/sportspress/v2/teams?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "4928",
    "name": "Fortaleza",
    "shortName": "Fortaleza",
    "crestUrl": "https://dimayor.com.co/wp-content/uploads/2025/11/escudos-1080p_0008_Fortaleza-nuevo-3-5-300x300.png",
    "country": "COL",
    "source": "dimayor.com.co",
    "secondary": false,
    "sourceTeamId": "165367",
    "sourceUrl": "https://dimayor.com.co/wp-json/wp/v2/dimayor_team?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "4936",
    "name": "Remo",
    "shortName": "Remo",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1626.png",
    "country": "BRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1626",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=268"
  },
  {
    "espnId": "5002",
    "name": "Sarpsborg 08",
    "shortName": "Sarpsborg 08",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8509.png",
    "country": "NOR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8509",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=59"
  },
  {
    "espnId": "5264",
    "name": "Atlético Nacional",
    "shortName": "Atlético Nacional",
    "crestUrl": "https://dimayor.com.co/wp-content/uploads/2025/11/escudos-1080p_0015_ATLETICO-NACIONAL-5-300x300.png",
    "country": "COL",
    "source": "dimayor.com.co",
    "secondary": false,
    "sourceTeamId": "165343",
    "sourceUrl": "https://dimayor.com.co/wp-json/wp/v2/dimayor_team?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "5268",
    "name": "Trujillanos FC",
    "shortName": "Trujillanos FC",
    "crestUrl": "https://ligafutve.org/wp-content/uploads/2021/05/escudo-TRU-150x150.png",
    "country": "VEN",
    "source": "ligafutve.org",
    "secondary": false,
    "sourceTeamId": "3440",
    "sourceUrl": "https://ligafutve.org/wp-json/sportspress/v2/teams?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "5270",
    "name": "Tromsø",
    "shortName": "Tromsø",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8608.png",
    "country": "NOR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8608",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=59"
  },
  {
    "espnId": "5276",
    "name": "Levadiakos",
    "shortName": "Levadiakos",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/4493.png",
    "country": "GRE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "4493",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=135"
  },
  {
    "espnId": "5309",
    "name": "Vitória de Guimarães",
    "shortName": "Vitória de Guimarães",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/7844.png",
    "country": "POR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "7844",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=61"
  },
  {
    "espnId": "5362",
    "name": "U. de Concepción",
    "shortName": "U. de Concepción",
    "crestUrl": "https://www.anfp.cl/wp-content/uploads/2024/11/U.-de-Concepcion.png",
    "country": "CHI",
    "source": "anfp.cl",
    "secondary": false,
    "sourceTeamId": "251",
    "sourceUrl": "https://www.anfp.cl/clubes/"
  },
  {
    "espnId": "5480",
    "name": "Boyacá Chicó F.C.",
    "shortName": "Boyacá Chicó F.C.",
    "crestUrl": "https://dimayor.com.co/wp-content/uploads/2025/11/escudos-1080p_0014_BOYACA-CHICO-5-300x300.png",
    "country": "COL",
    "source": "dimayor.com.co",
    "secondary": false,
    "sourceTeamId": "165351",
    "sourceUrl": "https://dimayor.com.co/wp-json/wp/v2/dimayor_team?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "5481",
    "name": "Envigado F.C.",
    "shortName": "Envigado F.C.",
    "crestUrl": "https://dimayor.com.co/wp-content/uploads/2025/11/escudos-1080p_0010_ENVIGADO-FC-5-300x300.png",
    "country": "COL",
    "source": "dimayor.com.co",
    "secondary": false,
    "sourceTeamId": "165365",
    "sourceUrl": "https://dimayor.com.co/wp-json/wp/v2/dimayor_team?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "5484",
    "name": "Millonarios F.C.",
    "shortName": "Millonarios F.C.",
    "crestUrl": "https://dimayor.com.co/wp-content/uploads/2025/11/escudos-1080p_0002_MILLONARIOS-FC-5-300x300.png",
    "country": "COL",
    "source": "dimayor.com.co",
    "secondary": false,
    "sourceTeamId": "165385",
    "sourceUrl": "https://dimayor.com.co/wp-json/wp/v2/dimayor_team?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "5485",
    "name": "Deportivo Pasto",
    "shortName": "Deportivo Pasto",
    "crestUrl": "https://dimayor.com.co/wp-content/uploads/2025/11/escudos-1080p_0011_DEPORTIVO-PASTO-5-300x300.png",
    "country": "COL",
    "source": "dimayor.com.co",
    "secondary": false,
    "sourceTeamId": "165361",
    "sourceUrl": "https://dimayor.com.co/wp-json/wp/v2/dimayor_team?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "5486",
    "name": "Deportivo Pereira",
    "shortName": "Deportivo Pereira",
    "crestUrl": "https://dimayor.com.co/wp-content/uploads/2025/11/escudos-1080p_0009_Escudo-Pereira-1-5-300x300.png",
    "country": "COL",
    "source": "dimayor.com.co",
    "secondary": false,
    "sourceTeamId": "165363",
    "sourceUrl": "https://dimayor.com.co/wp-json/wp/v2/dimayor_team?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "5488",
    "name": "Independiente Santa Fe",
    "shortName": "Independiente Santa Fe",
    "crestUrl": "https://dimayor.com.co/wp-content/uploads/2025/11/escudos-1080p_0007_INDEPENDIENTE-SANTA-FE-5-300x300.png",
    "country": "COL",
    "source": "dimayor.com.co",
    "secondary": false,
    "sourceTeamId": "165371",
    "sourceUrl": "https://dimayor.com.co/wp-json/wp/v2/dimayor_team?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "5489",
    "name": "Deportes Tolima",
    "shortName": "Deportes Tolima",
    "crestUrl": "https://dimayor.com.co/wp-content/uploads/2025/11/escudos-1080p_0013_DEPORTES-TOLIMA-FONDO-OSCURO-5-300x300.png",
    "country": "COL",
    "source": "dimayor.com.co",
    "secondary": false,
    "sourceTeamId": "165357",
    "sourceUrl": "https://dimayor.com.co/wp-json/wp/v2/dimayor_team?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "5490",
    "name": "Club Atlético Cerro",
    "shortName": "Club Atlético Cerro",
    "crestUrl": "https://www.auf.org.uy/imagenes/img_contenido/club_club/a/cerro.png",
    "country": "URU",
    "source": "auf.org.uy",
    "secondary": false,
    "sourceTeamId": "cerro.png",
    "sourceUrl": "https://www.auf.org.uy/"
  },
  {
    "espnId": "5492",
    "name": "Liverpool Fútbol Club",
    "shortName": "Liverpool Fútbol Club",
    "crestUrl": "https://www.auf.org.uy/imagenes/img_contenido/club_club/a/logo-dark.png",
    "country": "URU",
    "source": "auf.org.uy",
    "secondary": false,
    "sourceTeamId": "logo-dark.png",
    "sourceUrl": "https://www.auf.org.uy/"
  },
  {
    "espnId": "5501",
    "name": "Montevideo Wanderers Fútbol Club",
    "shortName": "Montevideo Wanderers Fútbol Club",
    "crestUrl": "https://www.auf.org.uy/imagenes/img_contenido/club_club/a/1926.png",
    "country": "URU",
    "source": "auf.org.uy",
    "secondary": false,
    "sourceTeamId": "1926.png",
    "sourceUrl": "https://www.auf.org.uy/"
  },
  {
    "espnId": "5579",
    "name": "OH Leuven",
    "shortName": "OH Leuven",
    "crestUrl": "https://statics-maker.llt-services.com/prl/images/2023/06/26/optimized/a9dba384-b8bf-4d57-a74a-77e527394daf-239.png",
    "country": "BEL",
    "source": "proleague.be",
    "secondary": false,
    "sourceTeamId": "0623a7ea-b0ab-4f8e-81d1-d0c8c4321205",
    "sourceUrl": "https://www.proleague.be/jpl"
  },
  {
    "espnId": "5583",
    "name": "Club Sportivo Luqueño",
    "shortName": "Sportivo Luqueño",
    "crestUrl": "https://statics-maker.llt-services.com/apf/images/2024/06/13/original/0755e5d8-a876-44e6-9577-6f3536ca82a7-951.png",
    "country": "PAR",
    "source": "apf.org.py",
    "secondary": false,
    "sourceTeamId": "24be19f1-43e4-4a0c-863f-18815c54c825",
    "sourceUrl": "https://www.apf.org.py/"
  },
  {
    "espnId": "5584",
    "name": "Club Nacional Asunción",
    "shortName": "Nacional Asunción",
    "crestUrl": "https://statics-maker.llt-services.com/apf/images/2024/06/13/original/c4de65af-19b2-4e73-926a-b4392eb519c0-981.png",
    "country": "PAR",
    "source": "apf.org.py",
    "secondary": false,
    "sourceTeamId": "f0f42369-0c41-40ad-88a3-62c2b0e71b93",
    "sourceUrl": "https://www.apf.org.py/"
  },
  {
    "espnId": "5786",
    "name": "KV Kortrijk",
    "shortName": "KV Kortrijk",
    "crestUrl": "https://statics-maker.llt-services.com/prl/images/2023/06/22/optimized/7d33db93-57e0-4b63-975a-145fb2f8bf25-197.png",
    "country": "BEL",
    "source": "proleague.be",
    "secondary": false,
    "sourceTeamId": "16b7d834-4446-4a79-8fb6-d73c65ea6504",
    "sourceUrl": "https://www.proleague.be/jpl"
  },
  {
    "espnId": "5807",
    "name": "R. Union Saint-Gilloise",
    "shortName": "Union SG",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/64125.png",
    "country": "BEL",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "64125",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=14&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "6017",
    "name": "Aucas",
    "shortName": "Aucas",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6608.png",
    "country": "ECU",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6608",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=246"
  },
  {
    "espnId": "6037",
    "name": "Carabobo FC",
    "shortName": "Carabobo FC",
    "crestUrl": "https://ligafutve.org/wp-content/uploads/2023/02/LOGO-CARABOBO-LF2023-150x150.png",
    "country": "VEN",
    "source": "ligafutve.org",
    "secondary": false,
    "sourceTeamId": "20257",
    "sourceUrl": "https://ligafutve.org/wp-json/sportspress/v2/teams?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "6038",
    "name": "Estudiantes de Mérida FC",
    "shortName": "Estudiantes de Mérida FC",
    "crestUrl": "https://ligafutve.org/wp-content/uploads/2023/02/LOGO-ESTUDIANTES-DE-MERIDA-LF2023-150x150.png",
    "country": "VEN",
    "source": "ligafutve.org",
    "secondary": false,
    "sourceTeamId": "3464",
    "sourceUrl": "https://ligafutve.org/wp-json/sportspress/v2/teams?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "6041",
    "name": "Monagas SC",
    "shortName": "Monagas SC",
    "crestUrl": "https://ligafutve.org/wp-content/uploads/2023/02/LOGO-MONAGAS-SC-LF2023-150x150.png",
    "country": "VEN",
    "source": "ligafutve.org",
    "secondary": false,
    "sourceTeamId": "3468",
    "sourceUrl": "https://ligafutve.org/wp-json/sportspress/v2/teams?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "6046",
    "name": "Aurora",
    "shortName": "Aurora",
    "crestUrl": "https://fbf.com.bo/wp-content/uploads/2025/12/1-2-150x150.png",
    "country": "BOL",
    "source": "fbf.com.bo",
    "secondary": false,
    "sourceTeamId": "47246",
    "sourceUrl": "https://fbf.com.bo/wp-json/sportspress/v2/teams?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "6047",
    "name": "Blooming",
    "shortName": "Blooming",
    "crestUrl": "https://fbf.com.bo/wp-content/uploads/2025/12/1-4-150x150.png",
    "country": "BOL",
    "source": "fbf.com.bo",
    "secondary": false,
    "sourceTeamId": "47224",
    "sourceUrl": "https://fbf.com.bo/wp-json/sportspress/v2/teams?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "6051",
    "name": "Real Potosi",
    "shortName": "Real Potosi",
    "crestUrl": "https://fbf.com.bo/wp-content/uploads/2026/04/WhatsApp-Image-2026-04-24-at-11.21.32-150x150.jpeg",
    "country": "BOL",
    "source": "fbf.com.bo",
    "secondary": false,
    "sourceTeamId": "48240",
    "sourceUrl": "https://fbf.com.bo/wp-json/sportspress/v2/teams?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "6072",
    "name": "O´Higgins",
    "shortName": "O´Higgins",
    "crestUrl": "https://www.anfp.cl/wp-content/uploads/2024/11/9c27509ed8b5acfedfea1cecbe0014d3.png",
    "country": "CHI",
    "source": "anfp.cl",
    "secondary": false,
    "sourceTeamId": "200",
    "sourceUrl": "https://www.anfp.cl/clubes/"
  },
  {
    "espnId": "6077",
    "name": "Houston Dynamo FC",
    "shortName": "Houston",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8259.png",
    "country": "USA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8259",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=130"
  },
  {
    "espnId": "6079",
    "name": "RB Bragantino",
    "shortName": "RB Bragantino",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/109705.png",
    "country": "BRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "109705",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=268"
  },
  {
    "espnId": "6086",
    "name": "Botafogo",
    "shortName": "Botafogo",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8517.png",
    "country": "BRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8517",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=268"
  },
  {
    "espnId": "6097",
    "name": "Club 2 de Mayo",
    "shortName": "2 de Mayo",
    "crestUrl": "https://statics-maker.llt-services.com/apf/images/2024/11/04/original/2c786e36-fcca-415d-913b-25c1b685bc39-937.png",
    "country": "PAR",
    "source": "apf.org.py",
    "secondary": false,
    "sourceTeamId": "ea3730f0-23e1-4a2c-b6e1-6fcb3fe5dcd4",
    "sourceUrl": "https://www.apf.org.py/"
  },
  {
    "espnId": "6101",
    "name": "Cúcuta Deportivo",
    "shortName": "Cúcuta Deportivo",
    "crestUrl": "https://dimayor.com.co/wp-content/uploads/2025/11/escudos-1080p-copia_0015_CUCUTA-DEPORTIVO-5-300x300.png",
    "country": "COL",
    "source": "dimayor.com.co",
    "secondary": false,
    "sourceTeamId": "165353",
    "sourceUrl": "https://dimayor.com.co/wp-json/wp/v2/dimayor_team?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "6137",
    "name": "Atlético Bucaramanga",
    "shortName": "Atlético Bucaramanga",
    "crestUrl": "https://dimayor.com.co/wp-content/uploads/2025/11/escudos-1080p_0016_ATLETICO-BUCARAMANGA-5-300x300.png",
    "country": "COL",
    "source": "dimayor.com.co",
    "secondary": false,
    "sourceTeamId": "165337",
    "sourceUrl": "https://dimayor.com.co/wp-json/wp/v2/dimayor_team?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "6273",
    "name": "Grêmio",
    "shortName": "Grêmio",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9769.png",
    "country": "BRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9769",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=268"
  },
  {
    "espnId": "6672",
    "name": "Kristiansund",
    "shortName": "Kristiansund",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8605.png",
    "country": "NOR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8605",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=59"
  },
  {
    "espnId": "6750",
    "name": "Start",
    "shortName": "Start",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9919.png",
    "country": "NOR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9919",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=59"
  },
  {
    "espnId": "6762",
    "name": "Portuguesa FC",
    "shortName": "Portuguesa FC",
    "crestUrl": "https://ligafutve.org/wp-content/uploads/2023/02/LOGO-PORTUGUESA-FC-A2021-150x150.png",
    "country": "VEN",
    "source": "ligafutve.org",
    "secondary": false,
    "sourceTeamId": "3437",
    "sourceUrl": "https://ligafutve.org/wp-json/sportspress/v2/teams?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "6763",
    "name": "Zamora FC",
    "shortName": "Zamora FC",
    "crestUrl": "https://ligafutve.org/wp-content/uploads/2023/02/LOGO-ZAMORA-LF2023-150x150.png",
    "country": "VEN",
    "source": "ligafutve.org",
    "secondary": false,
    "sourceTeamId": "3452",
    "sourceUrl": "https://ligafutve.org/wp-json/sportspress/v2/teams?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "6790",
    "name": "Atromitos",
    "shortName": "Atromitos",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10187.png",
    "country": "GRE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10187",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=135"
  },
  {
    "espnId": "6851",
    "name": "Paris FC",
    "shortName": "Paris FC",
    "crestUrl": "https://s3.eu-west-1.amazonaws.com/image.mpg/assets/clubs/logo/2026_1_90_128x128_dc9d2c4c7ba86ab318ff003c7a65cbf0.png",
    "country": "FRA",
    "source": "ligue1.com",
    "secondary": false,
    "sourceTeamId": "l1_championship_club_2026_90",
    "sourceUrl": "https://ma-api.ligue1.fr/championship-matches/championship/1/game-week/1?season=2026"
  },
  {
    "espnId": "6866",
    "name": "Club Atlético Progreso",
    "shortName": "Club Atlético Progreso",
    "crestUrl": "https://www.auf.org.uy/imagenes/img_contenido/club_club/a/proescdd0e7f389ecd12f0d0141750.png",
    "country": "URU",
    "source": "auf.org.uy",
    "secondary": false,
    "sourceTeamId": "proescdd0e7f389ecd12f0d0141750.png",
    "sourceUrl": "https://www.auf.org.uy/"
  },
  {
    "espnId": "6870",
    "name": "Kasımpaşa",
    "shortName": "Kasımpaşa",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/4685.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "4685",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "6907",
    "name": "Hartberg",
    "shortName": "Hartberg",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10056.png",
    "country": "AUT",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10056",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=38"
  },
  {
    "espnId": "6997",
    "name": "Stade Brestois 29",
    "shortName": "Brest",
    "crestUrl": "https://s3.eu-west-1.amazonaws.com/image.mpg/assets/clubs/logo/2023_1_44_128x128_6e80f6db6cec2117be34cd65ab9edbd1.png",
    "country": "FRA",
    "source": "ligue1.com",
    "secondary": false,
    "sourceTeamId": "l1_championship_club_2026_44",
    "sourceUrl": "https://ma-api.ligue1.fr/championship-matches/championship/1/game-week/1?season=2026"
  },
  {
    "espnId": "7318",
    "name": "Toronto FC",
    "shortName": "Toronto",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/56453.png",
    "country": "USA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "56453",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=130"
  },
  {
    "espnId": "7385",
    "name": "Club Guaraní",
    "shortName": "Club Guaraní",
    "crestUrl": "https://statics-maker.llt-services.com/apf/images/2024/06/04/original/c472ce25-ad80-40a1-a431-f19cbd2043c8-496.png",
    "country": "PAR",
    "source": "apf.org.py",
    "secondary": false,
    "sourceTeamId": "4c806e48-5f52-4d98-9151-ab4d828fbead",
    "sourceUrl": "https://www.apf.org.py/"
  },
  {
    "espnId": "7427",
    "name": "Ñublense",
    "shortName": "Ñublense",
    "crestUrl": "https://www.anfp.cl/wp-content/uploads/2024/11/Nublense_.png",
    "country": "CHI",
    "source": "anfp.cl",
    "secondary": false,
    "sourceTeamId": "181",
    "sourceUrl": "https://www.anfp.cl/clubes/"
  },
  {
    "espnId": "7445",
    "name": "Internacional de Bogotá",
    "shortName": "Internacional de Bogotá",
    "crestUrl": "https://dimayor.com.co/wp-content/uploads/2026/01/Escudo-Internacional-de-Bogota-300x300.png",
    "country": "COL",
    "source": "dimayor.com.co",
    "secondary": false,
    "sourceTeamId": "169835",
    "sourceUrl": "https://dimayor.com.co/wp-json/wp/v2/dimayor_team?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "7466",
    "name": "Club Sportivo Trinidense",
    "shortName": "Sportivo Trinidense",
    "crestUrl": "https://statics-maker.llt-services.com/apf/images/2024/06/04/original/06b6d2db-1990-42b4-a278-461286d95202-430.png",
    "country": "PAR",
    "source": "apf.org.py",
    "secondary": false,
    "sourceTeamId": "376dd4b4-a2b6-4a09-ae18-4c245e1aef05",
    "sourceUrl": "https://www.apf.org.py/"
  },
  {
    "espnId": "7632",
    "name": "Atlético-MG",
    "shortName": "Atlético-MG",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10272.png",
    "country": "BRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10272",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=268"
  },
  {
    "espnId": "7640",
    "name": "Luzern",
    "shortName": "Luzern",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10199.png",
    "country": "SUI",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10199",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=69"
  },
  {
    "espnId": "7648",
    "name": "Konyaspor",
    "shortName": "Konyaspor",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8622.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8622",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "7656",
    "name": "Rizespor",
    "shortName": "Rizespor",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/2166.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "2166",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "7672",
    "name": "FC Lugano",
    "shortName": "Lugano",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/8538.png",
    "country": "SUI",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "8538",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=2019&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "7764",
    "name": "Club Atlético Platense",
    "shortName": "Club Atlético Platense",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10089.png",
    "country": "ARG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10089",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=112"
  },
  {
    "espnId": "7767",
    "name": "Tigre",
    "shortName": "Tigre",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/89396.png",
    "country": "ARG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "89396",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=112"
  },
  {
    "espnId": "7834",
    "name": "Häcken",
    "shortName": "Häcken",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8428.png",
    "country": "SWE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8428",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=67"
  },
  {
    "espnId": "7853",
    "name": "AGF Aarhus",
    "shortName": "Aarhus",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/50019.png",
    "country": "DEN",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "50019",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=2019&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "7860",
    "name": "Lyngby",
    "shortName": "Lyngby",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9907.png",
    "country": "DEN",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9907",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=46"
  },
  {
    "espnId": "7868",
    "name": "Angers SCO",
    "shortName": "Angers",
    "crestUrl": "https://s3.eu-west-1.amazonaws.com/image.mpg/assets/clubs/logo/2023_4_37_128x128_22f933b61100266bf7f510aad9b5ad28.png",
    "country": "FRA",
    "source": "ligue1.com",
    "secondary": false,
    "sourceTeamId": "l1_championship_club_2026_37",
    "sourceUrl": "https://ma-api.ligue1.fr/championship-matches/championship/1/game-week/1?season=2026"
  },
  {
    "espnId": "7879",
    "name": "KV Mechelen",
    "shortName": "KV Mechelen",
    "crestUrl": "https://statics-maker.llt-services.com/prl/images/2024/09/18/original/9f1986e1-deaa-48a2-8d55-7304f4106590-47.png",
    "country": "BEL",
    "source": "proleague.be",
    "secondary": false,
    "sourceTeamId": "afe133f7-22d8-4d0f-ace3-7bbd4d0f7ba5",
    "sourceUrl": "https://www.proleague.be/jpl"
  },
  {
    "espnId": "7911",
    "name": "TSG 1899 Hoffenheim",
    "shortName": "Hoffenheim",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/2600431.png",
    "country": "GER",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "2600431",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=14&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "7914",
    "name": "Başakşehir",
    "shortName": "Başakşehir",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1933.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1933",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "7915",
    "name": "Llaneros F.C.",
    "shortName": "Llaneros F.C.",
    "crestUrl": "https://dimayor.com.co/wp-content/uploads/2025/11/escudos-1080p_0003_LLANEROS-FC-5-300x300.png",
    "country": "COL",
    "source": "dimayor.com.co",
    "secondary": false,
    "sourceTeamId": "165383",
    "sourceUrl": "https://dimayor.com.co/wp-json/wp/v2/dimayor_team?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "7922",
    "name": "FK Jablonec",
    "shortName": "Jablonec",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/62169.png",
    "country": "CZE",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "62169",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=2019&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "8089",
    "name": "Universitatea Craiova",
    "shortName": "Univ. Craiova",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/2606501.png",
    "country": "ROU",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "2606501",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=2019&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "8109",
    "name": "América de Cali",
    "shortName": "América de Cali",
    "crestUrl": "https://dimayor.com.co/wp-content/uploads/2025/11/escudos-1080p_0017_Objeto-inteligente-vectorial-5-300x300.png",
    "country": "COL",
    "source": "dimayor.com.co",
    "secondary": false,
    "sourceTeamId": "165335",
    "sourceUrl": "https://dimayor.com.co/wp-json/wp/v2/dimayor_team?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "8110",
    "name": "Deportes Concepción",
    "shortName": "Deportes Concepción",
    "crestUrl": "https://www.anfp.cl/wp-content/uploads/2024/11/D.-Concepcion.png",
    "country": "CHI",
    "source": "anfp.cl",
    "secondary": false,
    "sourceTeamId": "283",
    "sourceUrl": "https://www.anfp.cl/clubes/"
  },
  {
    "espnId": "8118",
    "name": "Sønderjyske",
    "shortName": "Sønderjyske",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8487.png",
    "country": "DEN",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8487",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=46"
  },
  {
    "espnId": "8169",
    "name": "KuPS Kuopio",
    "shortName": "KuPS Kuopio",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/52350.png",
    "country": "FIN",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "52350",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=2019&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "8186",
    "name": "Coquimbo Unido",
    "shortName": "Coquimbo Unido",
    "crestUrl": "https://www.anfp.cl/wp-content/uploads/2024/11/c016a84a402cb6399df331159734488f.png",
    "country": "CHI",
    "source": "anfp.cl",
    "secondary": false,
    "sourceTeamId": "178",
    "sourceUrl": "https://www.anfp.cl/clubes/"
  },
  {
    "espnId": "8221",
    "name": "Brommapojkarna",
    "shortName": "Brommapojkarna",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8501.png",
    "country": "SWE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8501",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=67"
  },
  {
    "espnId": "8222",
    "name": "GAIS",
    "shortName": "GAIS",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8297.png",
    "country": "SWE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8297",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=67"
  },
  {
    "espnId": "8354",
    "name": "Asteras Tripolis",
    "shortName": "Asteras Tripolis",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/80654.png",
    "country": "GRE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "80654",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=135"
  },
  {
    "espnId": "8416",
    "name": "Juventud de las Piedras",
    "shortName": "Juventud de las Piedras",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9883.png",
    "country": "URU",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9883",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=161"
  },
  {
    "espnId": "8547",
    "name": "Sirius",
    "shortName": "Sirius",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6694.png",
    "country": "SWE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6694",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=67"
  },
  {
    "espnId": "8950",
    "name": "Defensa y Justicia",
    "shortName": "Defensa y Justicia",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/161730.png",
    "country": "ARG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "161730",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=112"
  },
  {
    "espnId": "9078",
    "name": "Alanyaspor",
    "shortName": "Alanyaspor",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/4678.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "4678",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "9169",
    "name": "Mirassol",
    "shortName": "Mirassol",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/163782.png",
    "country": "BRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "163782",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=268"
  },
  {
    "espnId": "9283",
    "name": "Universidad Católica",
    "shortName": "Universidad Católica",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/113053.png",
    "country": "ECU",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "113053",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=246"
  },
  {
    "espnId": "9292",
    "name": "Técnico Universitario",
    "shortName": "Técnico Universitario",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/113054.png",
    "country": "ECU",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "113054",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=246"
  },
  {
    "espnId": "9318",
    "name": "Chapecoense",
    "shortName": "Chapecoense",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/197693.png",
    "country": "BRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "197693",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=268"
  },
  {
    "espnId": "9497",
    "name": "CD Guabirá",
    "shortName": "CD Guabirá",
    "crestUrl": "https://fbf.com.bo/wp-content/uploads/2025/12/1-8-150x150.png",
    "country": "BOL",
    "source": "fbf.com.bo",
    "secondary": false,
    "sourceTeamId": "47226",
    "sourceUrl": "https://fbf.com.bo/wp-json/sportspress/v2/teams?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "9720",
    "name": "CF Montréal",
    "shortName": "Montreal",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/161195.png",
    "country": "USA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "161195",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=130"
  },
  {
    "espnId": "9723",
    "name": "Portland Timbers",
    "shortName": "Portland",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/307690.png",
    "country": "USA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "307690",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=130"
  },
  {
    "espnId": "9726",
    "name": "Seattle Sounders FC",
    "shortName": "Seattle Sounders",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/130394.png",
    "country": "USA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "130394",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=130"
  },
  {
    "espnId": "9727",
    "name": "Vancouver Whitecaps",
    "shortName": "Vancouver",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/307691.png",
    "country": "USA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "307691",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=130"
  },
  {
    "espnId": "9739",
    "name": "Aldosivi",
    "shortName": "Aldosivi",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/161728.png",
    "country": "ARG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "161728",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=112"
  },
  {
    "espnId": "9744",
    "name": "Independiente Rivadavia",
    "shortName": "Independiente Rivadavia",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/161729.png",
    "country": "ARG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "161729",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=112"
  },
  {
    "espnId": "9761",
    "name": "Alianza Valledupar F.C.",
    "shortName": "Alianza Valledupar F.C.",
    "crestUrl": "https://dimayor.com.co/wp-content/uploads/2026/01/Alianza-fx-4-300x300.png",
    "country": "COL",
    "source": "dimayor.com.co",
    "secondary": false,
    "sourceTeamId": "169833",
    "sourceUrl": "https://dimayor.com.co/wp-json/wp/v2/dimayor_team?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "9762",
    "name": "Águilas Doradas",
    "shortName": "Águilas Doradas",
    "crestUrl": "https://dimayor.com.co/wp-content/uploads/2025/11/escudos-1080p_0019_AGUILAS-DORADAS-5-300x300.png",
    "country": "COL",
    "source": "dimayor.com.co",
    "secondary": false,
    "sourceTeamId": "165330",
    "sourceUrl": "https://dimayor.com.co/wp-json/wp/v2/dimayor_team?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "9785",
    "name": "Atlético Tucumán",
    "shortName": "Atlético Tucumán",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/161727.png",
    "country": "ARG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "161727",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=112"
  },
  {
    "espnId": "9902",
    "name": "Cerro Largo Fútbol Club",
    "shortName": "Cerro Largo Fútbol Club",
    "crestUrl": "https://www.auf.org.uy/imagenes/img_contenido/club_club/a/cerrolargo.png",
    "country": "URU",
    "source": "auf.org.uy",
    "secondary": false,
    "sourceTeamId": "cerrolargo.png",
    "sourceUrl": "https://www.auf.org.uy/"
  },
  {
    "espnId": "9903",
    "name": "Racing Club de Montevideo",
    "shortName": "Racing Club de Montevideo",
    "crestUrl": "https://www.auf.org.uy/imagenes/img_contenido/club_club/a/130849.png",
    "country": "URU",
    "source": "auf.org.uy",
    "secondary": false,
    "sourceTeamId": "130849.png",
    "sourceUrl": "https://www.auf.org.uy/"
  },
  {
    "espnId": "9967",
    "name": "Bahia",
    "shortName": "Bahia",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/7877.png",
    "country": "BRA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "7877",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=268"
  },
  {
    "espnId": "9999",
    "name": "Club Atlético Boston River",
    "shortName": "Club Atlético Boston River",
    "crestUrl": "https://www.auf.org.uy/imagenes/img_contenido/club_club/a/300x300briveriajwbanva.png",
    "country": "URU",
    "source": "auf.org.uy",
    "secondary": false,
    "sourceTeamId": "300x300briveriajwbanva.png",
    "sourceUrl": "https://www.auf.org.uy/"
  },
  {
    "espnId": "10000",
    "name": "Club Deportivo Maldonado",
    "shortName": "Club Deportivo Maldonado",
    "crestUrl": "https://www.auf.org.uy/imagenes/img_contenido/club_club/a/116309.png",
    "country": "URU",
    "source": "auf.org.uy",
    "secondary": false,
    "sourceTeamId": "116309.png",
    "sourceUrl": "https://www.auf.org.uy/"
  },
  {
    "espnId": "10060",
    "name": "Barracas Central",
    "shortName": "Barracas Central",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/213534.png",
    "country": "ARG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "213534",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=112"
  },
  {
    "espnId": "10080",
    "name": "Club Rubio Ñú",
    "shortName": "Rubio Ñú",
    "crestUrl": "https://statics-maker.llt-services.com/apf/images/2026/01/13/original/a3f8e92f-7faa-48b8-a27e-c0fb55104eee-876.png",
    "country": "PAR",
    "source": "apf.org.py",
    "secondary": false,
    "sourceTeamId": "ffc746b2-fa9b-4174-b79a-c6175824d1a5",
    "sourceUrl": "https://www.apf.org.py/"
  },
  {
    "espnId": "10094",
    "name": "UCV FC",
    "shortName": "UCV FC",
    "crestUrl": "https://ligafutve.org/wp-content/uploads/2021/05/UCV-FC-2-estrellas-2026-peq-150x150.png",
    "country": "VEN",
    "source": "ligafutve.org",
    "secondary": false,
    "sourceTeamId": "3459",
    "sourceUrl": "https://ligafutve.org/wp-json/sportspress/v2/teams?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "10125",
    "name": "Tijuana",
    "shortName": "Tijuana",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/162418.png",
    "country": "MEX",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "162418",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=230"
  },
  {
    "espnId": "10144",
    "name": "Unión La Calera",
    "shortName": "Unión La Calera",
    "crestUrl": "https://www.anfp.cl/wp-content/uploads/2024/11/LOGO-ULC-ORIGINAL-1-scaled-e1770910118442.png",
    "country": "CHI",
    "source": "anfp.cl",
    "secondary": false,
    "sourceTeamId": "187",
    "sourceUrl": "https://www.anfp.cl/clubes/"
  },
  {
    "espnId": "10158",
    "name": "Sarmiento",
    "shortName": "Sarmiento",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/202757.png",
    "country": "ARG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "202757",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=112"
  },
  {
    "espnId": "10307",
    "name": "Manta",
    "shortName": "Manta",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/162922.png",
    "country": "ECU",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "162922",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=246"
  },
  {
    "espnId": "10309",
    "name": "Jaguares F.C.",
    "shortName": "Jaguares F.C.",
    "crestUrl": "https://dimayor.com.co/wp-content/uploads/2025/11/escudos-1080p-copia_0012_JAGUARES-FC-5-300x300.png",
    "country": "COL",
    "source": "dimayor.com.co",
    "secondary": false,
    "sourceTeamId": "165375",
    "sourceUrl": "https://dimayor.com.co/wp-json/wp/v2/dimayor_team?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "10311",
    "name": "Nacional Potosí",
    "shortName": "Nacional Potosí",
    "crestUrl": "https://fbf.com.bo/wp-content/uploads/2025/12/1-9-150x150.png",
    "country": "BOL",
    "source": "fbf.com.bo",
    "secondary": false,
    "sourceTeamId": "47230",
    "sourceUrl": "https://fbf.com.bo/wp-json/sportspress/v2/teams?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "10388",
    "name": "SV Elversberg",
    "shortName": "SV Elversberg",
    "crestUrl": "https://www.bundesliga.com/assets/clublogo/DFL-CLU-000N6L.svg",
    "country": "GER",
    "source": "bundesliga.com",
    "secondary": false,
    "sourceTeamId": "DFL-CLU-000N6L",
    "sourceUrl": "https://www.bundesliga.com/de/bundesliga/clubs"
  },
  {
    "espnId": "10739",
    "name": "Philadelphia Union",
    "shortName": "Philadelphia",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/191716.png",
    "country": "USA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "191716",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=130"
  },
  {
    "espnId": "10834",
    "name": "PFC CSKA Sofia",
    "shortName": "CSKA Sofia",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/2608297.png",
    "country": "BUL",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "2608297",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=2019&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "11124",
    "name": "Guayaquil City",
    "shortName": "Guayaquil City",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/194754.png",
    "country": "ECU",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "194754",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=246"
  },
  {
    "espnId": "11420",
    "name": "RB Leipzig",
    "shortName": "Leipzig",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/2603790.png",
    "country": "GER",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "2603790",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=1&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "11429",
    "name": "Samsunspor",
    "shortName": "Samsunspor",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9750.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9750",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "11431",
    "name": "Panetolikos",
    "shortName": "Panetolikos",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/162386.png",
    "country": "GRE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "162386",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=135"
  },
  {
    "espnId": "11505",
    "name": "Jagiellonia Białystok",
    "shortName": "Jagiellonia",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/2600277.png",
    "country": "POL",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "2600277",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=14&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "11550",
    "name": "OB",
    "shortName": "OB",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8414.png",
    "country": "DEN",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8414",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=46"
  },
  {
    "espnId": "11551",
    "name": "Lausanne",
    "shortName": "Lausanne",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/7730.png",
    "country": "SUI",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "7730",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=69"
  },
  {
    "espnId": "11553",
    "name": "Aris Thessaloniki",
    "shortName": "Aris Thessaloniki",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8239.png",
    "country": "GRE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8239",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=135"
  },
  {
    "espnId": "11706",
    "name": "FC Viktoria Plzeň",
    "shortName": "Viktoria Plzeň",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/64388.png",
    "country": "CZE",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "64388",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=14&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "11972",
    "name": "Gimnasia Mendoza",
    "shortName": "Gimnasia Mendoza",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/568727.png",
    "country": "ARG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "568727",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=112"
  },
  {
    "espnId": "11989",
    "name": "Central Córdoba de Santiago",
    "shortName": "Central Córdoba de Santiago",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/213596.png",
    "country": "ARG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "213596",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=112"
  },
  {
    "espnId": "12011",
    "name": "Orlando City",
    "shortName": "Orlando",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/267810.png",
    "country": "USA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "267810",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=130"
  },
  {
    "espnId": "12215",
    "name": "Santa Clara",
    "shortName": "Santa Clara",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1567.png",
    "country": "POR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1567",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=61"
  },
  {
    "espnId": "12216",
    "name": "Estoril",
    "shortName": "Estoril",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/7842.png",
    "country": "POR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "7842",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=61"
  },
  {
    "espnId": "12698",
    "name": "Famalicão",
    "shortName": "Famalicão",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1634.png",
    "country": "POR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1634",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=61"
  },
  {
    "espnId": "13083",
    "name": "Hapoel Beer-Sheva FC",
    "shortName": "H. Beer-Sheva",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/59340.png",
    "country": "ISR",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "59340",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=14&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "13294",
    "name": "Wolfsberger AC",
    "shortName": "Wolfsberger AC",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1954.png",
    "country": "AUT",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1954",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=38"
  },
  {
    "espnId": "13450",
    "name": "SK Beveren",
    "shortName": "SK Beveren",
    "crestUrl": "https://statics-maker.llt-services.com/prl/images/2023/06/22/optimized/70e8afdf-d259-4748-9805-101f69a41dce-610.png",
    "country": "BEL",
    "source": "proleague.be",
    "secondary": false,
    "sourceTeamId": "2b991075-4bde-4641-8c4f-3dd6e10ebbf3",
    "sourceUrl": "https://www.proleague.be/jpl"
  },
  {
    "espnId": "13481",
    "name": "Metropolitanos FC",
    "shortName": "Metropolitanos FC",
    "crestUrl": "https://ligafutve.org/wp-content/uploads/2023/02/LOGO-METROPOLITANOS-LF2023-150x150.png",
    "country": "VEN",
    "source": "ligafutve.org",
    "secondary": false,
    "sourceTeamId": "3458",
    "sourceUrl": "https://ligafutve.org/wp-json/sportspress/v2/teams?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "13783",
    "name": "Anzoátegui FC",
    "shortName": "Anzoátegui FC",
    "crestUrl": "https://ligafutve.org/wp-content/uploads/2022/03/escudo-ANZOATEGUI-FC-2024-150x150.png",
    "country": "VEN",
    "source": "ligafutve.org",
    "secondary": false,
    "sourceTeamId": "25269",
    "sourceUrl": "https://ligafutve.org/wp-json/sportspress/v2/teams?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "15720",
    "name": "Atlético de San Luis",
    "shortName": "San Luis",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6358.png",
    "country": "MEX",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6358",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=230"
  },
  {
    "espnId": "15784",
    "name": "Arouca",
    "shortName": "Arouca",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/158085.png",
    "country": "POR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "158085",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=61"
  },
  {
    "espnId": "17086",
    "name": "Independiente del Valle",
    "shortName": "Independiente del Valle",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/192875.png",
    "country": "ECU",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "192875",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=246"
  },
  {
    "espnId": "17090",
    "name": "Deportivo La Guaira FC",
    "shortName": "Deportivo La Guaira FC",
    "crestUrl": "https://ligafutve.org/wp-content/uploads/2023/02/LOGO-LA-GUAIRA-LF2023-150x150.png",
    "country": "VEN",
    "source": "ligafutve.org",
    "secondary": false,
    "sourceTeamId": "3450",
    "sourceUrl": "https://ligafutve.org/wp-json/sportspress/v2/teams?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "17176",
    "name": "Mushuc Runa",
    "shortName": "Mushuc Runa",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/304929.png",
    "country": "ECU",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "304929",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=246"
  },
  {
    "espnId": "17362",
    "name": "Minnesota United",
    "shortName": "Minnesota",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/207242.png",
    "country": "USA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "207242",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=130"
  },
  {
    "espnId": "17374",
    "name": "Unión Magdalena",
    "shortName": "Unión Magdalena",
    "crestUrl": "https://dimayor.com.co/wp-content/uploads/2025/11/escudos-1080p_0000_UNION-MAGADALENA-5-300x300.png",
    "country": "COL",
    "source": "dimayor.com.co",
    "secondary": false,
    "sourceTeamId": "165401",
    "sourceUrl": "https://dimayor.com.co/wp-json/wp/v2/dimayor_team?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "17530",
    "name": "Venezia",
    "shortName": "Venezia",
    "crestUrl": "https://media-sdp.legaseriea.it/clubLogos/a28236708d214df3a2e2e04ceb7e5c54.webp",
    "country": "ITA",
    "source": "legaseriea.it",
    "secondary": false,
    "sourceTeamId": "a28236708d214df3a2e2e04ceb7e5c54",
    "sourceUrl": "https://www.legaseriea.it/serie-a"
  },
  {
    "espnId": "17544",
    "name": "Royal Antwerp FC",
    "shortName": "Royal Antwerp FC",
    "crestUrl": "https://statics-maker.llt-services.com/prl/images/2023/06/22/optimized/3b2d3230-be64-4d75-8971-d507f92b498e-599.png",
    "country": "BEL",
    "source": "proleague.be",
    "secondary": false,
    "sourceTeamId": "ab0c5675-38b2-4b78-8f47-c48cc209d205",
    "sourceUrl": "https://www.proleague.be/jpl"
  },
  {
    "espnId": "17606",
    "name": "New York City FC",
    "shortName": "NYCFC",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/546238.png",
    "country": "USA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "546238",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=130"
  },
  {
    "espnId": "17671",
    "name": "Club Sportivo San Lorenzo",
    "shortName": "Sportivo San Lorenzo",
    "crestUrl": "https://statics-maker.llt-services.com/apf/images/2024/10/09/original/c42c7b29-edc6-45d9-a431-6b89618827d1-150.png",
    "country": "PAR",
    "source": "apf.org.py",
    "secondary": false,
    "sourceTeamId": "37178384-bb92-4666-b05e-d27681f5c086",
    "sourceUrl": "https://www.apf.org.py/"
  },
  {
    "espnId": "17702",
    "name": "Deportivo Riestra",
    "shortName": "Deportivo Riestra",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/298629.png",
    "country": "ARG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "298629",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=112"
  },
  {
    "espnId": "17851",
    "name": "FC Juárez",
    "shortName": "Juárez",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/649424.png",
    "country": "MEX",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "649424",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=230"
  },
  {
    "espnId": "17856",
    "name": "Lincoln Red Imps FC",
    "shortName": "L. Red Imps",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/2605572.png",
    "country": "GIB",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "2605572",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=2019&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "18267",
    "name": "FC Cincinnati",
    "shortName": "Cincinnati",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/722265.png",
    "country": "USA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "722265",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=130"
  },
  {
    "espnId": "18418",
    "name": "Atlanta United",
    "shortName": "Atlanta United",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/773958.png",
    "country": "USA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "773958",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=130"
  },
  {
    "espnId": "18439",
    "name": "CSD Macará",
    "shortName": "CSD Macará",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6609.png",
    "country": "ECU",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6609",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=246"
  },
  {
    "espnId": "18794",
    "name": "WSG Tirol",
    "shortName": "WSG Tirol",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1583.png",
    "country": "AUT",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1583",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=38"
  },
  {
    "espnId": "18966",
    "name": "Los Angeles FC",
    "shortName": "LAFC",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/867280.png",
    "country": "USA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "867280",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=130"
  },
  {
    "espnId": "18986",
    "name": "Nashville SC",
    "shortName": "Nashville SC",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/915807.png",
    "country": "USA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "915807",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=130"
  },
  {
    "espnId": "18995",
    "name": "Academia Puerto Cabello FC",
    "shortName": "Academia Puerto Cabello FC",
    "crestUrl": "https://ligafutve.org/wp-content/uploads/2023/02/LOGO-PUERTO-CABELLO-LF2023-150x150.png",
    "country": "VEN",
    "source": "ligafutve.org",
    "secondary": false,
    "sourceTeamId": "3445",
    "sourceUrl": "https://ligafutve.org/wp-json/sportspress/v2/teams?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "19002",
    "name": "Montevideo City Torque",
    "shortName": "Montevideo City Torque",
    "crestUrl": "https://www.auf.org.uy/imagenes/img_contenido/club_club/a/mdeocitytorque-escudo.png",
    "country": "URU",
    "source": "auf.org.uy",
    "secondary": false,
    "sourceTeamId": "mdeocitytorque-escudo.png",
    "sourceUrl": "https://www.auf.org.uy/"
  },
  {
    "espnId": "19195",
    "name": "Deportes Limache",
    "shortName": "Deportes Limache",
    "crestUrl": "https://www.anfp.cl/wp-content/uploads/2024/11/Escudo_Deportes_Limache.webp",
    "country": "CHI",
    "source": "anfp.cl",
    "secondary": false,
    "sourceTeamId": "243",
    "sourceUrl": "https://www.anfp.cl/clubes/"
  },
  {
    "espnId": "19246",
    "name": "Riga FC",
    "shortName": "Riga",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/2607924.png",
    "country": "LVA",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "2607924",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=2019&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "19267",
    "name": "Erzurumspor FK",
    "shortName": "Erzurumspor FK",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/281467.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "281467",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "19425",
    "name": "Always Ready",
    "shortName": "Always Ready",
    "crestUrl": "https://fbf.com.bo/wp-content/uploads/2025/12/1-1-150x150.png",
    "country": "BOL",
    "source": "fbf.com.bo",
    "secondary": false,
    "sourceTeamId": "47215",
    "sourceUrl": "https://fbf.com.bo/wp-json/sportspress/v2/teams?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "19685",
    "name": "Estudiantes de Río Cuarto",
    "shortName": "Estudiantes de Río Cuarto",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/213591.png",
    "country": "ARG",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "213591",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=112"
  },
  {
    "espnId": "20024",
    "name": "FC Ararat-Armenia",
    "shortName": "Ararat-Armenia",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/2610304.png",
    "country": "ARM",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "2610304",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=14&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "20025",
    "name": "FC Iberia 1999 Tbilisi",
    "shortName": "Iberia Tbilisi",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/2605905.png",
    "country": "GEO",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "2605905",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=2019&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "20028",
    "name": "FK Kauno Žalgiris",
    "shortName": "Kauno Žalgiris",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/2605907.png",
    "country": "LTU",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "2605907",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=2019&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "20032",
    "name": "Servette",
    "shortName": "Servette",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9777.png",
    "country": "SUI",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9777",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=69"
  },
  {
    "espnId": "20043",
    "name": "NFC Volos",
    "shortName": "NFC Volos",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/885256.png",
    "country": "GRE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "885256",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=135"
  },
  {
    "espnId": "20070",
    "name": "Gaziantep FK",
    "shortName": "Gaziantep FK",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/4081.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "4081",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "20232",
    "name": "Inter Miami CF",
    "shortName": "Inter Miami CF",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/960720.png",
    "country": "USA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "960720",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=130"
  },
  {
    "espnId": "20301",
    "name": "Mjällby AIF",
    "shortName": "Mjällby",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/74233.png",
    "country": "SWE",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "74233",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=2019&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "20695",
    "name": "Orense",
    "shortName": "Orense",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1014174.png",
    "country": "ECU",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1014174",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=246"
  },
  {
    "espnId": "20703",
    "name": "Inter Club d'Escaldes",
    "shortName": "Inter Escaldes",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/63401.png",
    "country": "AND",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "63401",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=2019&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "20710",
    "name": "FK Borac",
    "shortName": "Borac",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/50104.png",
    "country": "BIH",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "50104",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=2019&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "20729",
    "name": "Eyüpspor",
    "shortName": "Eyüpspor",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/4681.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "4681",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "20856",
    "name": "Degerfors",
    "shortName": "Degerfors",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6544.png",
    "country": "SWE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6544",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=67"
  },
  {
    "espnId": "20889",
    "name": "Independiente",
    "shortName": "Independiente",
    "crestUrl": "https://fbf.com.bo/wp-content/uploads/2025/12/1-12-150x150.png",
    "country": "BOL",
    "source": "fbf.com.bo",
    "secondary": false,
    "sourceTeamId": "47228",
    "sourceUrl": "https://fbf.com.bo/wp-json/sportspress/v2/teams?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "20890",
    "name": "Real Tomayapo",
    "shortName": "Real Tomayapo",
    "crestUrl": "https://fbf.com.bo/wp-content/uploads/2025/12/1-6-150x150.png",
    "country": "BOL",
    "source": "fbf.com.bo",
    "secondary": false,
    "sourceTeamId": "47236",
    "sourceUrl": "https://fbf.com.bo/wp-json/sportspress/v2/teams?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "20906",
    "name": "Austin FC",
    "shortName": "Austin FC",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1218886.png",
    "country": "USA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1218886",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=130"
  },
  {
    "espnId": "21300",
    "name": "Charlotte FC",
    "shortName": "Charlotte FC",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1323940.png",
    "country": "USA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1323940",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=130"
  },
  {
    "espnId": "21313",
    "name": "Sportivo Ameliano",
    "shortName": "Sportivo Ameliano",
    "crestUrl": "https://statics-maker.llt-services.com/apf/images/2024/06/13/original/60b9bf0a-f019-4ea0-8887-9a5f58d26d26-900.png",
    "country": "PAR",
    "source": "apf.org.py",
    "secondary": false,
    "sourceTeamId": "08dd91da-e1cb-4a2a-87c8-c41fedbff124",
    "sourceUrl": "https://www.apf.org.py/"
  },
  {
    "espnId": "21379",
    "name": "FC Universitario",
    "shortName": "FC Universitario",
    "crestUrl": "https://fbf.com.bo/wp-content/uploads/2025/12/1-5-150x150.png",
    "country": "BOL",
    "source": "fbf.com.bo",
    "secondary": false,
    "sourceTeamId": "47240",
    "sourceUrl": "https://fbf.com.bo/wp-json/sportspress/v2/teams?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "21380",
    "name": "Hamarkameratene",
    "shortName": "HamKam",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/8448.png",
    "country": "NOR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "8448",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=59"
  },
  {
    "espnId": "21403",
    "name": "Albion Football Club",
    "shortName": "Albion Football Club",
    "crestUrl": "https://www.auf.org.uy/imagenes/img_contenido/club_club/a/alibakjbnombapomajwbom.png",
    "country": "URU",
    "source": "auf.org.uy",
    "secondary": false,
    "sourceTeamId": "alibakjbnombapomajwbom.png",
    "sourceUrl": "https://www.auf.org.uy/"
  },
  {
    "espnId": "21540",
    "name": "Austria Lustenau",
    "shortName": "Austria Lustenau",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9982.png",
    "country": "AUT",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9982",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=38"
  },
  {
    "espnId": "21581",
    "name": "Casa Pia AC",
    "shortName": "Casa Pia AC",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/212821.png",
    "country": "POR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "212821",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=61"
  },
  {
    "espnId": "21607",
    "name": "Académico Viseu",
    "shortName": "Académico Viseu",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1786.png",
    "country": "POR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1786",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=61"
  },
  {
    "espnId": "21610",
    "name": "Estrela da Amadora",
    "shortName": "Estrela da Amadora",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1074320.png",
    "country": "POR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1074320",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=61"
  },
  {
    "espnId": "21613",
    "name": "Alverca",
    "shortName": "Alverca",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/9780.png",
    "country": "POR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "9780",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=61"
  },
  {
    "espnId": "21615",
    "name": "SCU Torreense",
    "shortName": "Torreense",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/2603107.png",
    "country": "POR",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "2603107",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=14&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "21812",
    "name": "St. Louis City",
    "shortName": "St. Louis City",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1427963.png",
    "country": "USA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1427963",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=130"
  },
  {
    "espnId": "21843",
    "name": "Libertad",
    "shortName": "Libertad",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1345405.png",
    "country": "ECU",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1345405",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=246"
  },
  {
    "espnId": "21846",
    "name": "Grazer AK",
    "shortName": "Grazer AK",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10012.png",
    "country": "AUT",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10012",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=38"
  },
  {
    "espnId": "21850",
    "name": "Deportivo Rayo Zuliano",
    "shortName": "Deportivo Rayo Zuliano",
    "crestUrl": "https://ligafutve.org/wp-content/uploads/2023/02/LOGO-RAYO-ZULIANO-LF2023-150x150.png",
    "country": "VEN",
    "source": "ligafutve.org",
    "secondary": false,
    "sourceTeamId": "13363",
    "sourceUrl": "https://ligafutve.org/wp-json/sportspress/v2/teams?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "21922",
    "name": "Sabah FC",
    "shortName": "Sabah",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/2609356.png",
    "country": "AZE",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "2609356",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=1&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "21943",
    "name": "KF Egnatia",
    "shortName": "Egnatia",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/88148.png",
    "country": "ALB",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "88148",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=2019&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "21969",
    "name": "Kifisia FC",
    "shortName": "Kifisia FC",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/488099.png",
    "country": "GRE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "488099",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=135"
  },
  {
    "espnId": "22137",
    "name": "C.D. San Antonio",
    "shortName": "C.D. San Antonio",
    "crestUrl": "https://fbf.com.bo/wp-content/uploads/2025/12/1-13-150x150.png",
    "country": "BOL",
    "source": "fbf.com.bo",
    "secondary": false,
    "sourceTeamId": "47222",
    "sourceUrl": "https://fbf.com.bo/wp-json/sportspress/v2/teams?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "22163",
    "name": "Västerås SK",
    "shortName": "Västerås SK",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/6194.png",
    "country": "SWE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "6194",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=67"
  },
  {
    "espnId": "22165",
    "name": "KFUM",
    "shortName": "KFUM",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/2305.png",
    "country": "NOR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "2305",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=59"
  },
  {
    "espnId": "22174",
    "name": "G Villarroel CD San José",
    "shortName": "G Villarroel CD San José",
    "crestUrl": "https://fbf.com.bo/wp-content/uploads/2025/12/1-14-150x150.png",
    "country": "BOL",
    "source": "fbf.com.bo",
    "secondary": false,
    "sourceTeamId": "47232",
    "sourceUrl": "https://fbf.com.bo/wp-json/sportspress/v2/teams?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "22269",
    "name": "Lommel SK",
    "shortName": "Lommel SK",
    "crestUrl": "https://statics-maker.llt-services.com/prl/images/2023/06/20/optimized/952bb151-1764-4419-a6d2-8d0678d34257-512.png",
    "country": "BEL",
    "source": "proleague.be",
    "secondary": false,
    "sourceTeamId": "09120bf9-6534-459f-b32a-615c6c366e7d",
    "sourceUrl": "https://www.proleague.be/jpl"
  },
  {
    "espnId": "22281",
    "name": "Pafos FC",
    "shortName": "Pafos",
    "crestUrl": "https://img.uefa.com/imgml/TP/teams/logos/240x240/2609532.png",
    "country": "CYP",
    "source": "UEFA",
    "secondary": false,
    "sourceTeamId": "2609532",
    "sourceUrl": "https://comp.uefa.com/v2/teams?competitionId=2019&seasonYear=2027&offset=0&limit=200"
  },
  {
    "espnId": "22517",
    "name": "Recoleta FC",
    "shortName": "Recoleta",
    "crestUrl": "https://statics-maker.llt-services.com/apf/images/2025/01/20/original/1a197ff3-634e-4760-bb62-ec0f3d9ac5bd-357.png",
    "country": "PAR",
    "source": "apf.org.py",
    "secondary": false,
    "sourceTeamId": "56a7cef9-00ff-4b97-9c6a-9da38bee0619",
    "sourceUrl": "https://www.apf.org.py/"
  },
  {
    "espnId": "22523",
    "name": "CD Totora Real Oruro",
    "shortName": "CD Totora Real Oruro",
    "crestUrl": "https://fbf.com.bo/wp-content/uploads/2025/12/1-15-150x150.png",
    "country": "BOL",
    "source": "fbf.com.bo",
    "secondary": false,
    "sourceTeamId": "47238",
    "sourceUrl": "https://fbf.com.bo/wp-json/sportspress/v2/teams?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "22529",
    "name": "San Diego FC",
    "shortName": "San Diego FC",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1701119.png",
    "country": "USA",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1701119",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=130"
  },
  {
    "espnId": "130875",
    "name": "A.B.B.",
    "shortName": "A.B.B.",
    "crestUrl": "https://fbf.com.bo/wp-content/uploads/2025/12/1-16-150x150.png",
    "country": "BOL",
    "source": "fbf.com.bo",
    "secondary": false,
    "sourceTeamId": "47242",
    "sourceUrl": "https://fbf.com.bo/wp-json/sportspress/v2/teams?per_page=100&_embed=wp:featuredmedia"
  },
  {
    "espnId": "131235",
    "name": "RAAL La Louvière",
    "shortName": "RAAL La Louvière",
    "crestUrl": "https://statics-maker.llt-services.com/prl/images/2025/07/02/original/3712148e-c565-422a-9dc8-fef2387b22de-872.png",
    "country": "BEL",
    "source": "proleague.be",
    "secondary": false,
    "sourceTeamId": "3dcdb287-a7ca-400f-b697-c1f9161864e8",
    "sourceUrl": "https://www.proleague.be/jpl"
  },
  {
    "espnId": "131552",
    "name": "Örgryte",
    "shortName": "Örgryte",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/10002.png",
    "country": "SWE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "10002",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=67"
  },
  {
    "espnId": "131688",
    "name": "Central Español Fútbol Club",
    "shortName": "Central Español Fútbol Club",
    "crestUrl": "https://www.auf.org.uy/imagenes/img_contenido/club_club/a/1916.png",
    "country": "URU",
    "source": "auf.org.uy",
    "secondary": false,
    "sourceTeamId": "1916.png",
    "sourceUrl": "https://www.auf.org.uy/"
  },
  {
    "espnId": "131702",
    "name": "Leones del Norte",
    "shortName": "Leones del Norte",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1370528.png",
    "country": "ECU",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1370528",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=246"
  },
  {
    "espnId": "132334",
    "name": "Çorum FK",
    "shortName": "Çorum FK",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/357274.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "357274",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "132335",
    "name": "Amed Sportif",
    "shortName": "Amed Sportif",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/96498.png",
    "country": "TUR",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "96498",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=71"
  },
  {
    "espnId": "132429",
    "name": "Kalamata",
    "shortName": "Kalamata",
    "crestUrl": "https://images.fotmob.com/image_resources/logo/teamlogo/1585.png",
    "country": "GRE",
    "source": "FotMob",
    "secondary": true,
    "sourceTeamId": "1585",
    "sourceUrl": "https://www.fotmob.com/api/data/leagues?id=135"
  }
];
