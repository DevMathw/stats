# Auditoría: árbitro por competición

Medido el 21/10/2026 contra las fuentes que la plataforma ya consulta. Ninguna cifra de aqui
está estimada: cada fila sale de una petición real, y los scripts estan en el scratchpad de la
sesión (`auditArbitro2.py`, `auditPrevio.py`, `auditPrevio3.py`).

## Por qué hay dos columnas y no una

Saber el árbitro **después** del partido sirve para construir su historial. Para elegir un pick
hace falta saberlo **antes**, y no todas las ligas publican la designacion con antelación. Las dos
columnas se midieron por separado.

La media de amarillas se puede obtener por dos caminos: FotMob la trae ya calculada
(`yellowCards` por partido más la media de la liga), o se calcula con los ~27.000 partidos de
tarjetas que la plataforma ya tiene, que solo necesitan la etiqueta del árbitro.

## Resumen

- **16 de 32** sirven hoy para un pick: árbitro conocido antes del partido y con su media.
- **1 de 32** dan el nombre antes pero sin media: habría que calcularla con tus propios partidos.
- **14 de 32** solo lo publican después: valen para el histórico, no para decidir el pick.
- **1 de 32** no lo publican en ninguna fuente: queda `null`.

## Las 32, una por una

| # | Competición | Fuentes | Antes del partido | Después | Veredicto |
|---|---|---|---|---|---|
| 1 | Premier League | oficial+fotmob | 3/3 con nombre, 3 con media | media 3.48 | **Sí** |
| 2 | LaLiga | oficial+fotmob | 0/3 con nombre | media 4.63 | **Sí (por la oficial)** |
| 3 | Serie A | fotmob | 3/3 con nombre, 3 con media | media 5.26 | **Sí** |
| 4 | Bundesliga | oficial+fotmob | 0/3 con nombre | media 4.63 | **No** |
| 5 | Ligue 1 | oficial+fotmob | 3/3 con nombre, 3 con media | media 3.91 | **Sí** |
| 6 | Eredivisie | fotmob | 3/3 con nombre, 3 con media | media 2.66 | **Sí** |
| 7 | Liga Portugal | fotmob | 0/3 con nombre | media 5.79 | **No** |
| 8 | Superliga Dinamarca | fotmob | 3/3 con nombre, 3 con media | media 3.91 | **Sí** |
| 9 | Belgian Pro League | fotmob | 0/3 con nombre | media 2.73 | **No** |
| 10 | Süper Lig | oficial+fotmob | 0/3 con nombre | media 4.54 | **No** |
| 11 | Bundesliga Austria | fotmob | 3/3 con nombre, 2 con media | media 3.74 | **Sí** |
| 12 | Super League Grecia | fotmob | 0/3 con nombre | media 4.88 | **No** |
| 13 | Eliteserien | fotmob | 3/3 con nombre | media 3.79 | **Solo nombre** |
| 14 | Ekstraklasa | fotmob | 0/3 con nombre | media 5 | **No** |
| 15 | Scottish Premiership | fotmob | 3/3 con nombre, 3 con media | media 4.23 | **Sí** |
| 16 | Super League Suiza | fotmob | 0/3 con nombre | media 4.77 | **No** |
| 17 | Allsvenskan | fotmob | 0/3 con nombre | media 2.67 | **No** |
| 18 | Brasileirão Série A | fotmob | 3/3 con nombre, 3 con media | media 3.52 | **Sí** |
| 19 | Primera División Argentina | fotmob | 3/3 con nombre, 3 con media | media 4.38 | **Sí** |
| 20 | Liga BetPlay Dimayor | fotmob | 2/3 con nombre, 2 con media | media 4.64 | **Sí** |
| 21 | Primera División Chile | fotmob | 0/3 con nombre | media 5.1 | **No** |
| 22 | Primera División Paraguay | fotmob | 0/3 con nombre | media 4.95 | **No** |
| 23 | Primera División Uruguay | fotmob | 0/3 con nombre | nada | **Nada** |
| 24 | Liga FUTVE | fotmob | 0/3 con nombre | media 6.22 | **No** |
| 25 | División Profesional Bolivia | fotmob | 0/3 con nombre | media 6.67 | **No** |
| 26 | LigaPro Serie A Ecuador | fotmob | 0/3 con nombre | media 4.12 | **No** |
| 27 | Liga MX | fotmob | 0/3 con nombre | media 4.34 | **No** |
| 28 | MLS | fotmob | 1/3 con nombre, 1 con media | media 4.18 | **Sí** |
| 29 | EFL Championship | fotmob | 3/3 con nombre, 3 con media | media 3.93 | **Sí** |
| 30 | UEFA Champions League | oficial+fotmob | 3/3 con nombre, 3 con media | media 3.13 | **Sí** |
| 31 | UEFA Europa League | oficial+fotmob | 3/3 con nombre, 3 con media | media 4.6 | **Sí** |
| 32 | UEFA Conference League | oficial+fotmob | 2/3 con nombre, 1 con media | media 4.61 | **Sí** |

## Las 8 webs oficiales, por separado

Importa porque FotMob prohíbe la extracción en sus terminos. Donde la oficial lo da, se puede
tomar de ahi, y en los 7 casos que lo dan viene **en una respuesta que el adaptador ya descarga**:
no hace falta ni una petición mas.

| Competición | Qué publica la oficial | ¿Lo da antes del partido? |
|---|---|---|
| Premier League | `matchOfficials` (`role: MAIN`) en `/fixtures/{id}` | No: con `status: U` llega vacío |
| LaLiga | `icon-match-referee` en la ficha del partido | Sí: verificado en una jornada pendiente |
| Bundesliga | `"referee":{"displayName"}` en la pagina `/stats` | No: la ficha PRE_MATCH llega vacía |
| Ligue 1 | `officials` (`type: 1`) en `/championship-match/{id}` | Sin medir: su proxima jornada esta a 9 días |
| Süper Lig | No lo publica (solo menús "Hakem") | No |
| UEFA Champions League | `referees[]` (`role: REFEREE`) en la lista de partidos | Sí, pero solo cerca del partido |
| UEFA Europa League | `referees[]` (`role: REFEREE`) en la lista de partidos | Sí, pero solo cerca del partido |
| UEFA Conference League | `referees[]` (`role: REFEREE`) en la lista de partidos | Sí, pero solo cerca del partido |

## Lo que recomiendo

1. Guardar el árbitro en `Match` y leerlo de la oficial donde exista (Premier, LaLiga, Bundesliga,
   Ligue 1 y las 3 UEFA) y de FotMob en el resto. Son datos que ya se estan descargando.
2. Calcular la media de amarillas de cada árbitro con los partidos de la propia plataforma, no con
   la de FotMob: así la cifra es tuya, es auditable y funciona igual en las ligas que solo dan el nombre.
3. Activar el ajuste por árbitro solo en las 16 competiciones que lo publican antes del partido.
   En las demás el campo queda `null` y el modelo sigue como hoy, sin tocar nada.

## Límite de esta medida

Los "no" se midieron con el proximo partido de cada liga a ~2 días. Una federación que designe
24 horas antes aparece aqui como "no" sin serlo. Para cerrarlo habría que repetir la pasada el mismo
dia del partido; UEFA, por ejemplo, a 13 días llega vacía y el mismo dia trae el árbitro completo.

Uruguay es el único caso cerrado: el campo `Referee` existe pero llega vacío tambien en partidos
ya jugados, así que ahi no hay dato que recuperar.
