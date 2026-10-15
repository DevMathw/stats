/**
 * Hoja FUENTES DE DATOS: de dónde procede cada variable y cuánto se puede confiar en ella.
 * Es documentación transcrita del libro, no datos calculados.
 */
export interface DataSourceRow {
  variable: string;
  provider: string;
  availability: string;
  notes: string;
}

export const DATA_SOURCES: DataSourceRow[] = [
  {
    variable: 'Fecha, jornada, equipos y marcador (partidos ya cargados)',
    provider: 'worldfootball.net, contrastado con ESPN y prensa local',
    availability: 'Alta en 17 de 19 ligas',
    notes:
      'Ecuador (LigaPro) y Venezuela (Liga FUTVE) no tienen partidos: solo se encontró una ' +
      'parrilla equipo-vs-equipo sin fecha, insuficiente. Se dejan vacías antes que inventar.',
  },
  {
    variable: 'Fecha, jornada, equipos y marcador (partidos nuevos)',
    provider: 'Sitio oficial de la liga / Transfermarkt / SofaScore / FBref',
    availability: 'Alta en las 19 ligas',
    notes: 'Base mínima; siempre disponible.',
  },
  {
    variable: 'Goles 1T (marcador al descanso)',
    provider: 'SofaScore / Flashscore / Transfermarkt',
    availability: 'Alta en la mayoría; media en ligas menores sudamericanas',
    notes: 'Si no está, la celda queda vacía (N/D). No se estima.',
  },
  {
    variable: 'Corners, tarjetas, tiros, tiros a puerta, posesión, faltas, fuera de juego, xG',
    provider: 'SofaScore (api.sofascore.com), partido a partido',
    availability: 'Cargado en las 5 grandes ligas europeas (144 partidos)',
    notes:
      'Cada partido se aceptó tras cuadrar equipos y marcador. Se descartó 1 partido ' +
      '(Friburgo-Werder Bremen J1) por incoherencia de la fuente. Las otras 12 ligas aún no ' +
      'tienen estas columnas.',
  },
  {
    variable: 'xG (Expected Goals) / xGA',
    provider: 'FBref (StatsBomb/Opta) / Understat',
    availability:
      'Alta: Premier, LaLiga, Serie A, Bundesliga, Ligue 1. Baja o inexistente en el resto',
    notes:
      'Sin xG del proveedor la celda queda vacía y el modelo redistribuye W_XG hacia la ' +
      'fuerza base (ver MODEL_MAPPING.md · DIFF-01).',
  },
  {
    variable: 'BTTS, Over/Under, Clean Sheet, Resultado HT/FT, Marcador',
    provider: 'Calculado por la aplicación',
    availability: '100 % si hay marcador',
    notes: 'Nunca se carga a mano: son columnas derivadas.',
  },
  {
    variable: 'Calendario de próximos partidos (fixtures)',
    provider: 'Sitio oficial de la liga / Transfermarkt / ESPN / SofaScore',
    availability: 'Alta, pero sujeta a aplazamientos',
    notes: 'Se marca Estado = Aplazado / Cancelado cuando corresponde.',
  },
  {
    variable: 'Formato de competición, nº de equipos, jornadas',
    provider: 'Medido en la fuente de cada competición (19/09/2026) + estructura publicada por la propia competición',
    availability: 'Las 32 competiciones',
    notes:
      'El nº de equipos se cuenta de los partidos cargados, así que siempre es el real. Las jornadas de la ' +
      'fase regular y las fases con nombre propio salen del calendario de la fuente; ascenso, descenso, ' +
      'grupos y fase final, de lo que publica la competición. Lo que no está claro se marca «sin documentar» ' +
      'en la ficha de la competición, nunca se supone. Ver src/domain/models/competitionFormat.ts.',
  },
];
