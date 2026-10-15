# Análisis Estadístico de Fútbol 2026/27

Reconstrucción del libro `Analisis_Futbol_2026-27_2.xlsx` como aplicación web: mismo modelo
estadístico, misma metodología, sin fórmulas de Excel.

- **Qué NO es:** una conversión visual del Excel a React.
- **Qué SÍ es:** las 17 hojas del libro analizadas, sus fórmulas convertidas en funciones
  TypeScript testeables, y 6 pantallas en lugar de 17 pestañas.

El mapeo completo *hoja de Excel → función TypeScript → pantalla* está en
[MODEL_MAPPING.md](MODEL_MAPPING.md), incluidas las **diferencias detectadas** entre las
fórmulas reales del libro y la metodología escrita en su hoja CONFIGURACION.

---

## Arranque rápido

```bash
npm install
npm run dev
```

Abre <http://localhost:5173>, ve a **Configuración → Importar Excel** y selecciona
`Analisis_Futbol_2026-27_2.xlsx` (hay una copia en `data/`).

Deberías ver **998 partidos, 308 equipos, 19 ligas**. Los datos quedan guardados en
`data/analisis-futbol.sqlite` (ver [Datos guardados: SQLite](#datos-guardados-sqlite)), así que no hay que
reimportar en cada visita.

### Comandos

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción (`tsc -b` + `vite build`) |
| `npm test` | Todas las pruebas (100) |
| `npm run validate` | **Compara el motor contra los valores cacheados del propio Excel** |
| `npm run lint` | oxlint |

---

## Validación contra el Excel

`npm run validate` importa LIGAS/PARTIDOS/CONFIGURACION del libro, lo recalcula todo desde
cero y compara campo a campo contra las hojas derivadas que el propio Excel ya tenía
calculadas. Resultado actual:

| Hoja del Excel | Filas comparadas | Diferencias |
|----------------|------------------|-------------|
| EQUIPOS (PJ, PG, PE, PP, Pts, GF, GC, DG, promedios, %, posición, SoS, forma) | 308 | **0** |
| ESTADISTICAS HOME | 308 | **0** |
| ESTADISTICAS AWAY | 308 | **0** |
| FORMA (últimos 5 y 10) | 308 | **0** |
| TABLA DE POSICIONES (orden completo por liga) | 308 | **0** |

Tolerancia `1e-9` en enteros y `1e-6` en promedios. No hay filas de PROYECCIONES que comparar
porque la hoja PARTIDOS PENDIENTES del libro **está vacía**; ese bloque se valida con pruebas
unitarias de casos calculados a mano.

---

## Pantallas

| Ruta | Contenido | Hojas del Excel que sustituye |
|------|-----------|-------------------------------|
| `/` **Dashboard** | Filtros (país, liga, equipo, jornada, rango de fechas), 6 KPIs, resumen por liga, clasificación, forma reciente, tendencia por jornada, próximos partidos con proyección | DASHBOARD |
| `/ligas` **Ligas** | Las competiciones con formato, nº de equipos, jornada actual → próxima, y **botón de actualizar una a una** | LIGAS |
| `/ligas/:id` | Ficha de liga + tabla de posiciones | TABLA DE POSICIONES |
| `/partidos` **Partidos** | Disputados (9 columnas útiles, no 51) y pendientes, con alta manual de fixtures | PARTIDOS, PARTIDOS PENDIENTES |
| `/partidos/:id` | Detalle completo del partido, sus columnas derivadas y el **momentum** del partido | PARTIDOS |
| `/equipos` **Equipos** | Tabla con las 18 métricas principales | EQUIPOS |
| `/equipos/:id` | Resumen, Home/Away, Forma, Métricas y Partidos del equipo | EQUIPOS, ESTADISTICAS HOME/AWAY, FORMA, CORNERS, TARJETAS, GOLES |
| `/proyecciones` **Proyecciones** | Una fila por partido pendiente, de 10 en 10; clic → análisis con **por qué el modelo proyecta esto** (factores ordenados por cuánto se alejan de lo normal en esa competición), la composición del modelo y el pick | PROYECCIONES |
| `/modelos` **Modelos** | Siete modelos de predicción comparados con backtesting temporal (log loss, Brier, acierto, calibración) y los pesos medidos del ensemble | — |
| `/proyeccion-temporada` **Fin de temporada** | Puntos, goles, corners y tarjetas proyectados + posición proyectada | PROYECCION FINAL DE TEMPORADA |
| `/configuracion` **Configuración** | Estado, importación, 9 parámetros editables, proveedor, fuentes de datos, incidencias. En *Proveedor*, cada competición enseña las fuentes que consulta (partidos y estadísticas, del registro del servidor) y, al desplegarla, la fuente guardada en cada partido | CONFIGURACION, FUENTES DE DATOS |
| `/proyecciones/:id` **Ficha del partido** | % 1X2, doble oportunidad, Over goles, BTTS, empate no válido, hándicaps ±1.5, goles por equipo, portería a cero, Over corners y tarjetas; goles/corners/tarjetas esperados con rango, confianza, muestra y calidad de datos | — |
| `/picks` **Evaluador de picks** | Selector de mercado por categorías con la probabilidad de cada opción (1X2, goles con líneas asiáticas, BTTS, doble oportunidad, empate no válido, hándicap asiático y europeo, goles por equipo, portería a cero, corners, tarjetas); tabla de todas las líneas con cuota justa; probabilidad vs cuota, edge, valor esperado, Kelly, stake con límites, riesgo, explicación, simulación y registro | — |
| `/tickets` **Tickets** | Combinadas con probabilidad conjunta (exacta o rango), correlación, Kelly del ticket y avisos. Sin selecciones que puedan devolver el stake | — |
| `/bankroll` **Bankroll** | Wallet virtual por perfil, movimientos, depósitos, reinicio, gestión de riesgo, copia JSON | — |
| `/rendimiento` **Rendimiento** | Bankroll, ROI, yield, acierto, eficacia, drawdown, gráficos por mercado, riesgo y calendario | — |
| `/historial` **Historial y backtesting** | Filtros, Brier, log loss, calibración, Sharpe, por mercado y competición; backtest walk-forward del modelo | — |

Picks, Kelly, wallet y métricas: metodología completa en [PICKS_METHODOLOGY.md](PICKS_METHODOLOGY.md).
Moneda **exclusivamente virtual**: es una herramienta de análisis y simulación, no una promesa de ganancias.

---

## Interfaz

### Sistema de diseño

Todo el color sale de tokens semánticos definidos en `src/index.css`. No hay ni un color
literal en los componentes: se comprueba con
`grep -r "slate-\|sky-[0-9]\|#[0-9a-f]\{6\}" src`.

| Grupo | Tokens |
|---|---|
| Superficies | `canvas`, `surface`, `surface-2`, `surface-3`, `surface-hover`, `surface-active`, `elevated` |
| Texto | `text`, `muted`, `faint` |
| Líneas | `border`, `border-strong` |
| Acento | `accent`, `accent-hover`, `accent-fg`, `accent-soft`, `accent-text`, `accent-border` |
| IA y modelos | `ai`, `ai-soft`, `ai-text`, `ai-border` |
| Semánticos | `positive`, `negative`, `warning`, `neutral` (+ `-soft` y `-text`) |
| Gráficos | `series-1..5`, `grid` |
| Formas | `radius-sm`, `radius-control`, `radius-card`, `radius-pill` |
| Elevación | `shadow-sm`, `shadow-card`, `shadow-md`, `shadow-pop` |

Se usan como utilidades (`bg-surface`, `text-muted`, `rounded-card`). Añadir un color nuevo
significa añadir un token, no una clase suelta.

**Las superficies son una escala de profundidad**, no una paleta de grises a elegir: `canvas`
es el fondo de la ventana y nunca lleva contenido; `surface` es la tarjeta, la barra lateral y
la cabecera; `surface-2` es lo que va dentro de una tarjeta (cabeceras de tabla, detalle de una
fila); `surface-3` es lo que va dentro de eso (rieles de barras); `hover` y `active` son esa
misma superficie bajo el ratón o pulsada; `elevated` es lo que flota sobre todo (popovers,
menús, diálogos). En el tema oscuro una sombra no se ve, así que `shadow-card` cambia allí por
un filo claro en el borde superior, que es lo que da la sensación de relieve.

**El violeta (`ai`) significa una cosa y solo una: lo ha estimado un modelo.** No es decorativo.
Si una cifra es violeta, no ha ocurrido: la ha calculado el motor de predicción. Los datos
observados nunca lo usan. Es jerarquía visual y, sobre todo, honestidad.

### Tipografía

**Inter** para leer e **Inter Tight** para titulares y cifras grandes: misma superfamilia, así
que combinan sin ruido, pero Tight es más estrecha y le da a los números el aire de marcador que
necesitan. Se cargan desde Google Fonts con `preconnect` y `display=swap`; **sin red, la pila del
sistema** (Segoe UI Variable, SF, Roboto) cubre las dos y la aplicación se ve igual de bien.

Hay una escala con nombre para cada papel, en `@layer components`, en vez de un `text-[13px]`
elegido a ojo en cada pantalla:

| Clase | Para qué |
|---|---|
| `.t-h1` | título de pantalla |
| `.t-h2` | título de tarjeta |
| `.t-h3` | título dentro de una tarjeta |
| `.t-stat` / `.t-stat-lg` | la cifra protagonista de una tarjeta |
| `.t-label` | rótulo de un dato, en versales |
| `.t-meta` | fecha, muestra, fuente |

### Gráficos

`src/components/Charts/chartStyle.ts` decide una sola vez cómo se ven: rejilla, ejes y tooltip. Antes esa
configuración estaba copiada en los seis gráficos de cuatro pantallas y había divergido —unos con
`tickLine`, otros sin él; el `contentStyle` del tooltip escrito a mano cuatro veces con esquinas y sombras
distintas; rejillas verticales en unos sí y en otros no, sin motivo—. Recharts no entiende clases de CSS,
así que los valores salen de los tokens ya resueltos y se repintan solos al cambiar de tema.

Las decisiones que toma, y por qué:

| Decisión | Motivo |
|---|---|
| Rejilla solo horizontal | Las verticales duplican las marcas del eje X y ensucian |
| El eje X conserva su línea | Es la base de la que salen las barras |
| El eje Y no la lleva | Las marcas ya la sugieren |
| Tooltip con `shadow-pop` | El mismo relieve que los popovers del resto de la aplicación |

Las excepciones son explícitas y llevan su comentario: el gráfico de calibración sí lleva las dos rejillas
(se compara contra la diagonal y una sola dirección no sitúa el punto), y las barras horizontales de
«Yield por mercado» invierten la suya.

Cada gráfico responde a una pregunta concreta, escrita en el subtítulo de su tarjeta. Los que no la tenían
no se han añadido: no hay ningún gráfico decorativo.

### Estados: sin datos no es lo mismo que error

El momentum lo enseña bien porque es donde más se nota. Hay **tres** finales posibles y antes dos de ellos
se veían igual, como un párrafo gris:

| Situación | Qué se ve |
|---|---|
| La consulta falla (red, fuente caída) | `ErrorState` en rojo, con **Reintentar** |
| La fuente contesta pero sin tiros minuto a minuto | `Empty`, explicando que no es un fallo y que no hay nada que reintentar |
| Hay cronología | El gráfico |

Es la diferencia entre «algo se ha roto, prueba otra vez» y «esta competición no publica ese dato», y
confundirlas hace que el usuario reintente para siempre algo que nunca va a llegar.

### Microinteracciones

Dos gestos y se acabó: `.card-interactive` levanta la sombra de lo que se puede pulsar sin mover
el contenido ni un píxel, y `.enter` hace entrar desde abajo lo que acaba de aparecer. Quien tenga
activado `prefers-reduced-motion` no ve ninguno de los dos.

La transición de color del cambio de tema sigue en `body, body *`. Se probó a limitarla solo a
`body` porque un selector universal con transición es un coste conocido, pero **midiendo contra una
línea base no se vio ninguna mejora** (el *Rendering* se mueve entre 438 y 527 ms con y sin ella),
así que se dejó como estaba: no se cambia código que funciona por una sospecha que la medición no
respalda.

### Contraste

Medido en la aplicación, convirtiendo los `oklch` a sRGB con un canvas y calculando la relación
WCAG. En los dos temas, **todos** los pares de texto sobre fondo llegan a AA (4,5:1): lo más justo
es `faint` sobre `surface-2`, con 4,62 en claro y 4,81 en oscuro. Lighthouse da **100 en
Accesibilidad**.

### Carga y rendimiento

Cada pantalla va en su propio trozo (`lazy` de React Router en `src/main.tsx`), y las dos
dependencias pesadas se piden solo cuando hacen falta: el lector de Excel (`xlsx`) al importar un
libro, y la librería de gráficos al llegar al primer gráfico. El dashboard se queda estático
porque es la pantalla de entrada y cargarlo aparte solo añadiría un viaje de ida y vuelta.

| | Antes | Después |
|---|---|---|
| Trozo principal | 1.773 kB (506 kB gzip) | 455 kB (117 kB gzip) |
| `xlsx` + importador | en el principal | 337 kB aparte, solo al importar |
| Gráficos | en el principal | 338 kB aparte, solo con gráfico en pantalla |

Esas cifras salen del `build` y son deterministas. **La nota de Lighthouse, en cambio, no sirve
para comparar aquí**: en seis pasadas sobre esta máquina dio entre 38 y 51 de Performance, con el
TBT moviéndose entre 581 y 1.609 ms *sobre el mismo código*. Con esa dispersión no se le puede
atribuir una mejora ni un empeoramiento a ningún cambio, y cualquier «subió X puntos» sería ruido.
Además la prueba corre sobre `localhost`, donde descargar 506 kB o 117 kB cuesta casi lo mismo: lo
que mide es CPU. El troceado se queda porque su beneficio es real fuera de ese laboratorio, con
caché fría o red lenta.

Lo que sí sale igual en todas las pasadas es dónde está el problema: LCP de ~4 s **del que 3,9 s
son *render delay***, no red. Al abrir, `recalculateAll` recalcula de golpe los 2.941 partidos y
las 644 proyecciones en el hilo principal. El arreglo es un Web Worker, no un cambio de estilos ni
de empaquetado, y está pendiente.

Estable en todas las pasadas: **Accesibilidad 100, Prácticas recomendadas 96, SEO 91, CLS ~0**.

`npm run preview` sirve la compilación de producción **con la API local** (`configurePreviewServer`
en `vite.config.ts`), así que se puede comprobar el build contra la base real y no contra una
aplicación vacía.

### Tema claro, oscuro y del sistema

Selector de tres estados en la barra superior. `system` no escribe nada en el DOM y deja
mandar a `prefers-color-scheme`; `light`/`dark` fijan `data-theme` en `<html>` y ganan
siempre. La preferencia se guarda aparte de los datos (`useTheme.ts`), así que no entra en el
JSON exportado ni obliga a recalcular nada.

Los gráficos no pueden usar clases CSS, así que `useChartTheme()` lee los tokens ya
resueltos y repinta al cambiar de tema. Ejes, rejilla, tooltip y series salen de ahí.

### Banderas

`<Flag>` las dibuja en **SVG**, no con emoji. Comprobado en la propia aplicación midiendo el
ancho de un par de indicadores regionales: **Windows no trae esos glifos** y pinta las dos
letras del código (`ES` en vez de la bandera). Son simplificaciones a 20×14 px —lo que hace
reconocible una bandera a ese tamaño son sus franjas, no el escudo— y el nombre del país va
siempre en `title`/`aria-label`, así que la identificación nunca depende solo del dibujo.

El país sale de `League.country`, que ya estaba en la hoja LIGAS. `<LeagueLabel>` es el
**único** sitio donde se decide cómo se pinta una competición, así que se ve igual en el
dashboard, las tablas y los desplegables.

### Tablas

`<DataTable>` reúne lo que antes faltaba o estaba repetido por pantallas: ordenación por
columna, búsqueda (con botón para borrarla), paginación, encabezado fijo, esqueleto de carga,
estado vacío, columnas que se ocultan en móvil, **acciones con iconos** y **filas que se
despliegan** (explicación de un pick, selecciones de un ticket). Las páginas solo describen
columnas.

Detalles pensados para comparar: los números van en cifras tabulares y alineados a la
derecha, las métricas clave llevan una barra proporcional (`<MiniBar>`) para barrer una
columna con la vista, y **los datos ausentes se ordenan siempre al final** — no se puede
ordenar por lo que no hay. Las cabeceras abreviadas (PJ, O2.5, SoS) explican qué son en un
tooltip; las ordenables enseñan su flecha al pasar el ratón. La columna de acciones queda fija a
la derecha, así sus botones se ven aunque la tabla tenga scroll horizontal. Una fila que abre
algo se abre también con Enter.

### Botones, tooltips y avisos

- **`<IconButton>`**: acciones de tabla y barras de herramientas. Su `label` es a la vez el
  nombre accesible y el tooltip («Actualizar estadísticas del partido», no «Botón»). Desactivado
  sigue siendo enfocable y su tooltip dice por qué. Las acciones que borran piden una **segunda
  pulsación** (`confirm`) en lugar de un diálogo.
- **`<Tooltip>` / `useTooltip`**: un solo posicionamiento para todo, en un portal con posición
  fija, así una tabla con scroll ya no recorta el tooltip. Se abre con el ratón (tras un momento)
  y con el foco de teclado (al instante); se cierra con Escape o al hacer scroll. `<InfoTip>`
  usa el mismo posicionamiento para las explicaciones largas y queda abierto con un clic.
- **`<Button>`**: estados hover, activo, foco visible, desactivado y `loading` (con spinner y
  `aria-busy`). `<ButtonLink>` para lo que navega.
- **Cursor**: Tailwind 4 ya no pone la mano en los botones; una sola regla en `index.css` se la
  devuelve a todo lo que se pulsa de verdad y pone `not-allowed` en lo desactivado.
- **`toast()`**: aviso tras una acción (pick registrado, depósito, copia importada) en una región
  `aria-live`, con enlace a donde mirar el resultado.
- **`<Modal>`**: `<dialog>` nativo, así el navegador atrapa el foco, cierra con Escape y deja el
  fondo inerte.
- **`<PageHeader>`**: título, descripción y acciones iguales en todas las pantallas.

### Navegación

- **Escritorio**: panel lateral fijo agrupado por intención (Resumen · Datos · Predicción ·
  Simulación), no por hoja de Excel; selector de competición en la barra superior, porque es el
  filtro que manda; migas dentro de las fichas; enlace «Saltar al contenido» para teclado.
- **Móvil**: barra inferior con los cuatro destinos más usados y «Más», que abre el menú
  completo. El panel lateral es un cajón que se cierra con Escape, no la versión encogida del
  escritorio.
- **Filtros**: un botón con popover y **chips de lo aplicado**. Antes eran seis desplegables
  siempre visibles; lo que debe estar a la vista es *qué* está filtrado, no los controles.

### Comparación de equipos

Ficha de equipo → pestaña **Comparar**: dos equipos de la misma competición enfrentados
métrica a métrica, con el ganador de cada fila resaltado y una barra que muestra la distancia.
Respeta la dirección de cada métrica (en goles en contra gana el más bajo) y **no declara
ganador si a alguno le falta el dato**.

---

## Modelo de proyección

Reproduce la metodología de CONFIGURACION. Parámetros editables en pantalla:

```
W_BASE = 0.45   W_FORM5 = 0.20   W_FORM10 = 0.15   W_XG = 0.20
K_SHRINK = 5    W_H2H = 0.10     W_SOS = 0.06
K_LOGISTIC = 1.1                 K_DRAWDECAY = 0.5
```

**Goles esperados** (`domain/projections/expectedGoals.ts`):

```
base   = shrink(ataque del local en casa) × shrink(defensa del visitante fuera) / mediaLiga
blend  = (W_BASE·base + W_FORM5·promGF5 + W_FORM10·promGF10 + W_XG·promXG)
         / (W_BASE + W_FORM5 + W_FORM10 + W_XG)
λ_L    = MAX(0.1, (blend_L + ajusteH2H) · (1 + ajusteSoS_L))
λ_V    = MAX(0.1, (blend_V − ajusteH2H) · (1 + ajusteSoS_V))
```

**Contracción bayesiana** (`domain/probability/shrink.ts`): `peso = PJ / (PJ + K_SHRINK)`.
Evita que un equipo con 2 partidos dispare la proyección.

**Probabilidades** (`domain/probability/`): Poisson independiente, sin redondear λ.

```
P(Over X.5)   = 1 − POISSON(X, λ_L + λ_V)
P(BTTS)       = 1 − e^(−λ_L) − e^(−λ_V) + e^(−λ_L−λ_V)
P(CS local)   = e^(−λ_V)          P(CS visitante) = e^(−λ_L)
P(X)          = %empates de la liga · e^(−K_DRAWDECAY·(λ_L−λ_V)²)
P(1)          = (1 − P(X)) · 1/(1 + e^(−K_LOGISTIC·(λ_L−λ_V)))
P(2)          = (1 − P(X)) · (1 − esa logística)          ⇒ P(1)+P(X)+P(2) = 1
```

**Fin de temporada**: puntos restantes = Σ (P(victoria)·3 + P(empate)·1) sobre los partidos
pendientes de cada equipo.

---

## Identidad global de equipos

Cada partido y cada pendiente llevan `homeTeamRef` y `awayTeamRef`: una referencia que es **la
misma para un club en todas sus competiciones**. Así la app sabe que el «Real Madrid» de LaLiga
y el «Real Madrid CF» de la Champions son el mismo club.

La referencia es **interna**: no cambia ningún nombre visible, ni `homeTeamId`, ni ninguna
estadística. La clasificación de cada liga sigue siendo la suya.

### De dónde sale

Del id de equipo de ESPN, que es el mismo para un club en todas las competiciones que cubre
(Real Madrid = 86 en LaLiga y en Champions). Nunca se muestra: los nombres y escudos visibles
saldrán de la fuente oficial de cada liga.

El catálogo está en `src/data/teamCatalog.ts` y se genera con
`npm run catalog` a partir de las plantillas de las 23 competiciones:
**411 clubes únicos, 61 en más de una competición**. Se guarda en el repositorio para que la
identificación funcione sin red y sea reproducible; se regenera al empezar cada temporada.

### La regla que evita fusiones falsas

Un nombre se busca **solo dentro de la plantilla de su competición**, nunca en todo el
catálogo. En LaLiga, «Real Madrid CF» solo puede ser uno de 20 clubes; buscando en todo el
catálogo, «Inter» sería también Internacional de Porto Alegre o Internacional de Bogotá.

Dentro de la plantilla, en este orden ([`resolveInCompetition`](src/domain/models/teamIdentity.ts)):

1. **Alias**: primero los confirmados por el usuario, luego los revisados. Solo valen si el club
   juega esa competición.
2. **Mismo nombre sin sufijos genéricos** (FC, CF, AFC, Club…).
3. **Uno contiene todas las palabras del otro**, y solo si el candidato es único.

Si encajan dos clubes, no se elige ninguno: el equipo queda sin referencia y aparece en
**Configuración → Equipos** para confirmarlo a mano.

Hay una comprobación más entre nombres de una misma competición. Si dos nombres distintos
acaban en el mismo club y uno solo casaba **por contención**, ese pierde la referencia y pasa a
revisión. Dos formas de escribir el mismo club («Real Madrid» y «Real Madrid CF», ambos por
nombre exacto) siguen unidas; dos clubes parecidos («FK Žalgiris» de Vilnius y «Kauno
Žalgiris») ya no se funden.

### Alias revisados

[`src/data/teamAliasSeed.ts`](src/data/teamAliasSeed.ts) tiene 19 nombres del Excel que no
casan solos, y 11 nombres de UEFA para los 6 clubes de fase liga que UEFA y ESPN escriben
distinto («SK Slavia Praha», «GNK Dinamo», «F.C. Copenhagen», «FK Crvena Zvezda»…). Cada uno se emparejó 1 a 1 con el único club de ESPN que quedaba libre en su liga:

- **Exónimos en español**: Marsella, Niza, Estrasburgo, FC Copenhague, Club Brujas, Cercle Brujas,
  Standard Lieja, KAA Gante, KV Malinas y FC Köln.
- **Variantes oficiales**: Atlético Mineiro → Atlético-MG, Academia del Balompié → ABB, entre otras.
- **Palabra genérica que casaba con dos clubes**: «Deportivo Alavés» contiene a Alavés y a
  Deportivo de La Coruña; «RCD Espanyol de Barcelona», a Espanyol y a Barcelona.

### Dónde se aplica

En el `recompute` del store, cada vez que cambian partidos, pendientes, competiciones o alias,
y al cargar los datos guardados. Así ninguna vía de entrada (Excel, «Actualizar partidos», alta
manual) se la puede saltar.

### Verificado

[`teamIdentity.integration.test.ts`](src/domain/models/teamIdentity.integration.test.ts), contra
el libro real:

- Los **308 equipos** del Excel quedan identificados, **ninguno dudoso**.
- **Ningún par** de equipos distintos de una misma liga comparte referencia.
- **Ninguna clasificación cambia** al añadir la identidad.

De paso se corrigió `normalizeTeamName`, que convertía en espacios las letras que NFD no
descompone: «Kasımpaşa» quedaba «kas mpasa», «København» quedaba «k benhavn», y «F.C.» no
casaba con «FC».

---

## Nombres y escudos oficiales

Lo que se ve de un equipo, nombre y escudo, sale de su **fuente oficial**. El id de ESPN solo
enlaza clubes; nunca se muestra.

### Hoy: UEFA y diez ligas domésticas

`src/data/officialTeams.ts` se genera con `npm run official-teams` y reúne **411 clubes** con
nombre, nombre corto, país y escudo (verificado el 13/09/2026):

| Fuente | De dónde salen nombre y escudo | Clubes |
|---|---|---|
| UEFA | API `comp.uefa.com` (Champions, Europa League, Conference League) | 108 · 36 de 36 en cada fase liga |
| premierleague.com | API de Pulselive; escudo PNG de `resources.premierleague.com` | 20 de 20 · 11 nuevos |
| laliga.com | `__NEXT_DATA__` de la página de clubes; escudo de `assets.laliga.com` | 20 de 20 · 12 nuevos |
| legaseriea.it | carga RSC de la página de la Serie A; escudo de `media-sdp.legaseriea.it` | 20 de 20 · 13 nuevos |
| bundesliga.com | página de clubes; escudo SVG de `/assets/clublogo/` | 18 de 18 · 11 nuevos |
| ligue1.com | API `ma-api.ligue1.fr` (jornada 1); escudo en su bucket de S3 | 18 de 18 · 11 nuevos |
| eredivisie.nl | página de clubes; escudo de `eredivisie.b-cdn.net` a 96 px | 18 de 18 · 12 nuevos |
| proleague.be | `__NEXT_DATA__` de la página de la JPL; escudo de `statics-maker.llt-services.com` | 18 de 18 · 13 nuevos |
| dimayor.com.co | API de su WordPress (`dimayor_team`), imagen destacada a 300 px | 20 de 20 · 20 nuevos |
| anfp.cl | listado de `/clubes/`: escudo y nombre de cada ficha | 16 de 16 · 16 nuevos |
| apf.org.py | `__NEXT_DATA__` de la portada (la misma plataforma que la Pro League) | 12 de 12 · 12 nuevos |
| auf.org.uy | portada (ISO-8859-1), sin las secciones femenina y de sala | 15 de 16 · 15 nuevos |
| ligafutve.org | API de SportsPress, miniatura de 150 px | 14 de 14 · 14 nuevos |
| fbf.com.bo | API de SportsPress, sin divisiones inferiores ni selecciones; miniatura de 150 px | 16 de 16 · 16 nuevos |
| FotMob (secundaria) | **solo el escudo**: Liga Portugal, Superliga, Süper Lig, Brasileirão, Argentina, LigaPro, Championship y Juventud (Uruguay) | 127 nuevos |

UEFA va primero: un club que juega en Europa conserva el nombre y el escudo de UEFA, y su liga
solo añade los que UEFA no cubre. Cada club se enlaza con la misma regla que la app, solo dentro
de la plantilla de su competición. Si una fuente falla, el generador se detiene sin escribir el
archivo, para no borrar los escudos que ya había.

**Secundaria, solo escudo.** Siete webs oficiales no dejan leer sus escudos (medido el 13/09/2026):
ligaportugal.pt pinta los clubes con JavaScript y su API no tiene la temporada 2026/27;
superliga.dk solo los publica en su API, que exige credenciales; tff.org y cbf.com.br los sirven
desde `fys.tff.org` y `conteudo.cbf.com.br`, que no aceptan conexiones; afa.com.ar no los publica;
ligapro.ec carga clubes y tabla con un widget de JavaScript y cierra su API de WordPress; efl.com
carga los clubes con JavaScript y su API exige credenciales. Para esas siete se sigue el orden
autorizado (FBref > Sofascore > FotMob > Flashscore): FBref y Sofascore responden 403, así que el
escudo sale de FotMob. En Uruguay, FotMob solo rellena a Juventud: auf.org.uy la publica con dos
escudos distintos y no se elige uno a ojo. La app muestra el escudo, pero **el nombre sigue siendo
el de tus datos** y el rótulo lo indica («escudo de FotMob (secundaria)»).

Siete nombres no casaban solos con la plantilla (STVV, Royale Union Saint-Gilloise, OB, Amed
Sportif, Erzurumspor FK, Cerro Largo Fútbol Club y G Villarroel CD San José). Cada uno correspondía
a un único club libre de su liga, así que se añadieron 1 a 1 en `src/data/teamAliasSeed.ts`.

UEFA lista también a los eliminados en las rondas previas. Si dos clubes distintos de una fuente
caen en el mismo club, gana el emparejamiento exacto sobre el de contención; si empatan, no se
enlaza ninguno, y el generador lo informa en ambos casos. Pasó con «FK Žalgiris» (Vilnius) frente
a «FK Kauno Žalgiris»: se enlaza Kauno, que es quien juega la fase liga. En las ligas domésticas,
así pierden los filiales («Zamora FC «B»») y los clubes de otra división con nombre parecido
(«Bogotá F.C.» frente a «Internacional de Bogotá»).

Un club sin entrada se muestra con el nombre de tus datos e iniciales en lugar de escudo. Hoy no
pasa en ninguna de las 23 competiciones; sí pasará con un club que entre nuevo en una plantilla
(un ascenso, por ejemplo) hasta volver a ejecutar `npm run official-teams`.

### Escudos a través de caché

El navegador nunca pide un escudo al CDN oficial. Pide `/api/crest`, y el servidor
([`server/crestProxy.ts`](server/crestProxy.ts)) descarga cada escudo **una sola vez**, lo guarda
en `node_modules/.cache/crests` y lo sirve desde disco. El motivo está medido: `img.uefa.com` y
`www.uefa.com` dejaron de responder a esta máquina tras una ronda de consultas.

- Solo `https` y solo orígenes de la lista `CREST_HOSTS`, que fija dominio **y ruta**: el S3 de
  Ligue 1 es compartido y solo se admite su bucket. No es un proxy abierto.
- Un escudo que falla no se vuelve a pedir durante 10 minutos.
- Si no carga, se muestran las iniciales del club: nunca una imagen rota ni el escudo de otro.

Los escudos aparecen en partidos, detalle de partido, equipos, ficha de equipo, clasificación,
proyecciones, dashboard y comparación. En los desplegables (filtros, alta de partido,
comparación) solo va el nombre, porque un `<option>` no admite imágenes.

La pestaña **Configuración → Equipos**, que sirve para asignar a mano un nombre dudoso, lista
los clubes de la plantilla con su nombre de ESPN. Es la única pantalla donde aparece.

Pruebas: [`server/crestProxy.test.ts`](server/crestProxy.test.ts) (lista de dominios, una sola
descarga, sin reintentos contra un CDN que ha cortado) y
[`teamDisplay.test.ts`](src/domain/models/teamDisplay.test.ts).

---

## El xG no se muestra

Ninguna tabla ni ficha muestra xG. Se retiró de la columna de Partidos (sustituida por
**Posesión**, en formato `48.0% – 52.0%`), de la tabla de Equipos, de la ficha de equipo
(Métricas, Home/Away y Partidos), de la comparación entre equipos, del desglose del modelo en
Proyecciones y del Dashboard, donde había una tarjeta «Top xG a favor».

El motivo es de disponibilidad: **ninguna fuente gratuita lo publica por equipo y partido.**
ESPN solo lo trae dentro de `leaders`, que es un top-3 por jugador; football-data.org no lo
tiene en ningún plan; Understat sí, pero únicamente en las cinco grandes ligas europeas.
Una columna que siempre dice N/D solo ocupa sitio.

**El modelo sí lo sigue usando.** `W_XG` vale 0.20 y el interruptor de Configuración →
Modelo (`xgMissingMode`) sigue existiendo: los 144 partidos del Excel que traen xG continúan
pesando en sus proyecciones, y donde no hay, el peso se redistribuye hacia la fuerza base
(MODEL_MAPPING.md · DIFF-01). Quitarlo del modelo sería un cambio de metodología, no de
interfaz.

---

## Regla de datos: nunca inventar

- Dato que el proveedor no entrega ⇒ `null`. **Nunca 0.**
- La interfaz lo muestra como **N/D**.
- Cada agregado guarda su **tamaño de muestra**, así que se distingue "0 corners" de "sin
  datos de corners".
- Los KPIs indican `n=` (cuántas filas del filtro tenían realmente ese dato).
- En este libro: 144 de 998 partidos tienen corners/tiros/posesión/xG; 138 tienen tarjetas.
  Ecuador y Venezuela **no tienen partidos** y así se muestran.

Esto tiene una consecuencia importante y documentada: el Excel real, por cómo funciona
`SUMIFS`, trata el xG ausente como 0 y hunde la proyección un 20 % en las ligas sin xG. La app
implementa la metodología documentada (redistribuir `W_XG` hacia la fuerza base) y deja un
interruptor **"Modo compatible con Excel"** en Configuración → Modelo. Ver
[MODEL_MAPPING.md · DIFF-01](MODEL_MAPPING.md#diff-01--el-peso-w_xg-no-se-redistribuye-cuando-no-hay-xg).

---

## Estadísticas de un partido (botón «Actualizar» de cada fila)

Cada partido disputado tiene en **Acciones** un botón que trae sus corners, tarjetas, tiros,
tiros a puerta, posesión, faltas y fueras de juego **desde la fuente de su liga**: la misma
cadena que «Actualizar partidos», solo para ese partido. **Ni ESPN ni IA.**

```
Botón ↻  →  POST /api/match-stats  →  web oficial de la liga
                                     →  FBref → Sofascore → FotMob → Flashscore
         ←  cifras + URL de origen + qué respondió cada fuente
```

La orquestación está en [`server/matches/matchStats.ts`](server/matches/matchStats.ts); cada
fuente lee sus cifras en su propio extractor de `server/matches/sources/` (`matchStats`).

### Qué publica cada fuente (medido el 12/09/2026)

| Fuente | Cifras por partido |
|---|---|
| premierleague.com (Opta) | tiros, a puerta, posesión, corners, amarillas, faltas, fueras de juego. Opta omite los valores 0 (un equipo sin rojas no trae el dato): quedan N/D, no 0 |
| laliga.com (Opta, ficha del partido) | lo mismo que la Premier League |
| uefa.com (`matchstats.uefa.com`) | todas, con ceros explícitos |
| ligue1.com | todas, con ceros explícitos |
| bundesliga.com | a puerta, posesión, corners, faltas y fueras de juego. No publica tiros totales ni tarjetas |
| tff.org | ninguna: la ficha del partido no trae estadísticas, así que pasa a las secundarias |
| FotMob (secundaria) | todas. Responde en las 17 ligas cuya web oficial no deja leer partidos, y en la Süper Lig |

FBref y Sofascore responden 403 y Flashscore no trae datos en el HTML: se prueban igualmente y
el mensaje dice qué contestó cada una.

### Cómo sabe que es ESTE partido

- Si el partido ya está enlazado con esa fuente (lo enlaza «Actualizar partidos»), se usa su id.
- Si no, se busca en el calendario de la fuente: fecha ±1 día, mismo marcador y los dos equipos
  reconocidos por la identidad global. Con cero candidatos o con varios, no se elige.
- El marcador que publica la fuente tiene que coincidir con el guardado; si no, se descarta todo.
- Rangos imposibles fuera, y no puede haber más tiros a puerta que tiros. Menos tiros a puerta que
  goles sí vale: un autogol suma al marcador sin ser tiro del equipo.

Lo que pasa los filtros se guarda con su `statsSource` (`uefa.com`, `FotMob (secundaria)`…) y la
URL de origen, visible en el detalle del partido. Un dato vacío nunca borra uno guardado. El xG que
publica FotMob no se usa: la app no muestra xG. Se procesa un partido cada vez.

Corners, tarjetas, tiros y tiros a puerta **no tocan** goles, 1X2, Over/Under ni BTTS: solo
alimentan sus propios valores esperados (`calculateExpectedMetric`).

### Lo que había antes

El botón usaba ESPN y, si ESPN no tenía el partido, una búsqueda web con Claude. Ninguna de las
dos es una fuente autorizada, así que se retiraron con todo su código, junto con el botón
«Pendientes» de Competiciones, que revisaba los pendientes contra ESPN. De aquella búsqueda solo
quedan los filtros (`sanitize`), ahora en `server/matches/matchStats.ts`. La `ANTHROPIC_API_KEY`
del `.env` ya no se usa.

---

## Cargar el Excel de una competición (botón «Excel»)

Tercer botón de cada fila en **Competiciones**. Abre el selector de archivos y carga un libro
de **una sola liga** — `Analisis_Futbol_2026-27_[Liga].xlsx` o cualquiera con las hojas
`LIGAS`, `PARTIDOS` y `PARTIDOS PENDIENTES` — sobre lo que ya hay.

Es lo contrario del importador de Configuración: aquel **reemplaza** el libro entero; este
**fusiona** una competición y no toca las demás.

| | |
|---|---|
| Partido que no teníamos | se añade |
| Partido que ya existe | se completa campo a campo; **un `null` del archivo nunca borra** un dato que ya había |
| Pendiente nuevo | se añade |
| Pendiente que el archivo trae ya jugado | pasa a disputados y se retira de pendientes |
| Otras competiciones | intactas |
| Parámetros del modelo | **no se tocan** — son globales y el archivo es de una liga |

Cargar dos veces el mismo archivo no duplica nada: la identidad es la clave natural
`liga + temporada + fecha + local + visitante`.

### El archivo tiene que ser de esa competición

El nombre del libro no importa; lo que se mira es la hoja `LIGAS`. Se acepta que abrevie
—«Liga BetPlay» contra «Primera A (Liga BetPlay Dimayor)»— porque los nombres normalizados se
contienen. Si no se corresponden, **no se carga nada** y el mensaje dice qué contiene el
archivo.

Esa comprobación se añadió después de reproducir el fallo: sin ella, soltar el archivo de
Colombia en la fila de LaLiga metía sus 65 partidos como españoles, en silencio. Ver
[`pickLeagueFromFile`](src/services/import/mergeLeague.ts) y sus pruebas.

### Pruebas

[`mergeLeague.test.ts`](src/services/import/mergeLeague.test.ts) cubre la fusión con datos
sintéticos, y
[`mergeLeague.integration.test.ts`](src/services/import/mergeLeague.integration.test.ts)
lo hace **contra el libro real**: corta del `Analisis_Futbol_2026-27_2.xlsx` un archivo de
una sola liga y comprueba que carga los 65 partidos colombianos, que cargarlo dos veces no
duplica ninguno, y que una base a medias se completa sin pisar lo que ya tenía.

---

## Actualizar partidos (fuentes oficiales)

**Actualizar partidos** en *Configuración* recorre las 23 competiciones, una a una; el botón
**Actualizar** de cada fila en *Competiciones* hace lo mismo con una sola. Para cada liga:

> Fuente oficial → partidos actuales → comparación con lo guardado → Excel de la liga actualizado

Una competición del registro que la app aún no tenga (Championship, las tres UEFA) se da de alta
si su actualización sale bien, con lo desconocido vacío.

Con una competición elegida (selector de la barra superior o Filtros) aparece arriba a la derecha
otro **Actualizar partidos**: trae los partidos de esa competición y después las estadísticas
(corners, tiros, tarjetas, posesión…) de cada disputado al que le falte alguna, con la misma cadena
que el botón de cada fila. Sin competición elegida no se muestra. *Partidos → Filtros → Columna
vacía* deja ver los que siguen con Posesión, Corners o Tarjetas en N/D.

### De dónde sale cada liga

Cada competición tiene su propio extractor en `server/matches/sources/` (no hay un scraper
genérico) y su entrada en `server/matches/registry.ts`. Medido el 12/09/2026:

| Competición | Web oficial | Cómo se lee |
|---|---|---|
| Premier League | premierleague.com | API de datos de su web: temporada y 380 partidos |
| LaLiga | laliga.com | datos incrustados en la página de cada jornada |
| Bundesliga | bundesliga.com | estado incrustado en la página de cada jornada (con marcador al descanso) |
| Ligue 1 | ligue1.com | API de su web, jornada a jornada |
| Süper Lig | tff.org | HTML de cada semana (codificación windows-1254) |
| Champions, Europa y Conference League | uefa.com | API de partidos de UEFA; solo la fase liga |

Las otras 24 usan solo FotMob (`src/domain/models/sourcePolicy.ts`): su web oficial no deja leer los
partidos o las estadísticas (los carga con JavaScript, exige credenciales o no publica la jornada), y el
registro guarda el motivo medido de cada una. FBref y Sofascore responden 403 y los términos de
Flashscore prohíben extraer sus datos. Cada partido guarda su fuente, p. ej. `FotMob (secundaria)`.

**Competiciones revisadas** (14/09/2026, `src/domain/models/sourcePolicy.ts`): solo consultan sus
fuentes y piden 10 datos al actualizar un partido, o la competición con sus estadísticas: posesión,
tiros, tiros a puerta, córners, faltas, fueras de juego, amarillas, rojas, xG y marcador al descanso
(de ahí salen los goles de 1.ª y 2.ª parte). La primera fuente manda y FotMob **solo completa lo que
ella no publica** (medido el 14/09/2026):

| Competición | Fuentes | Qué completa FotMob |
|---|---|---|
| Premier League | premierleague.com + FotMob | xG y los ceros que Opta omite (tarjetas) |
| LaLiga | laliga.com + FotMob | xG, descanso y los ceros que Opta omite |
| Ligue 1 | ligue1.com + FotMob | descanso |
| Champions, Europa y Conference League | uefa.com + FotMob | xG y descanso |
| Bundesliga | bundesliga.com + FotMob | tiros totales, amarillas y rojas |
| Süper Lig | tff.org (partidos) + FotMob | todas las estadísticas: la TFF no publica ninguna |
| Serie A, Eredivisie, Liga Portugal, Superliga, Pro League y Championship | solo FotMob | — (FotMob da los 10) |
| Brasileirão, Argentina y Colombia | solo FotMob | — (los 10; en Brasil y Colombia las amarillas no son fiables, ver abajo) |
| Chile, Venezuela, Bolivia, Ecuador y Paraguay | solo FotMob | — (sin xG; las amarillas no son fiables, ver abajo) |
| Uruguay | solo FotMob | — (solo el marcador al descanso: FotMob no publica estadísticas de esta liga) |
| Austria, Grecia, Noruega, Polonia, Escocia, Suiza, Suecia, Liga MX y MLS (15/09/2026) | solo FotMob | — (los 10; en Liga MX las amarillas no son fiables) |

Nadie consulta ya FBref, Sofascore ni Flashscore. El partido guarda sus fuentes
(`premierleague.com + FotMob (secundaria)`) con sus enlaces, y el aviso de la actualización dice
cuántos datos dio cada una y cuáles siguen sin publicarse. Un descanso con más goles que el final se
descarta.

**Ligas añadidas el 15/09/2026.** Las webs oficiales de Austria (7 de los 10 datos) y Polonia (8 de los 10)
sí los publican en cada ficha, pero dentro del código de su web: pasarán a web oficial + FotMob cuando
tengan extractor. Los términos de MLS prohíben leer su web con un programa. ESPN no tiene la Ekstraklasa, así
que sus clubes no tienen identidad global (no se reconocen en otras competiciones); sus estadísticas se piden
igual, por el id de FotMob de cada partido.

**Tarjetas contra la cronología.** En Brasil, Colombia, Chile, Venezuela, Bolivia, Ecuador y Paraguay
FotMob publica «0 amarillas» aunque su propia cronología enseña las tarjetas (medido el 14/09/2026 en
4 partidos de cada liga; las rojas sí cuadran). Una cifra de tarjetas por debajo de las que enseña la
cronología de la fuente se descarta, y la que ya estuviera guardada se borra: no es un 0, es un dato
no registrado. Al actualizar la competición se vuelven a comprobar los partidos con amarillas 0-0.

**Datos escritos a mano.** Si una fuente no publica alguno, el lápiz de cada partido en *Partidos*
abre un formulario con los 10 datos. Pasan las mismas reglas que los de las fuentes (rangos, no más
tiros a puerta que tiros, descanso sin superar el final); vacío es «sin dato»,
nunca 0. Quedan marcados como «Manual» en la ficha del partido y en *Configuración → Proveedor*, y
ninguna actualización los sustituye; si se borran, la fuente puede volver a llenarlos.

Resultado de la prueba real: **23/23 ligas con datos en 18 s**.

### Reglas

- Solo pasan a **Partidos disputados** los partidos **terminados** y con marcador oficial. En
  juego, aplazados, suspendidos, cancelados o por jugar van a pendientes con su estado.
- **La jornada nunca se inventa**: un partido sin jornada se descarta y se avisa.
- **Temporada verificada**: si la fuente publica otra temporada (2025/26 en vez de 2026/27), se
  rechaza y se prueba la siguiente fuente.
- **Torneo en curso**: en las ligas con Apertura y Clausura solo se toma el torneo en curso, como
  en el Excel. FotMob a veces numera igual los dos torneos (Argentina: «1…16» dos veces; Uruguay,
  tres torneos); se separan porque un equipo juega una sola vez por jornada.
- **Fecha y hora oficiales**, en la zona horaria de la competición. Con estas fuentes la fecha de
  la fuente manda sobre la guardada. La hora se ve junto a la fecha en *Partidos*.
- **Sin duplicados**: un partido se reconoce por su id oficial y, si no lo tiene, por liga +
  temporada + fecha (±1 día) + local + visitante. Nunca solo por la fecha. Si otra fuente ya lo
  guardó con otra fecha (un aplazado, hasta dos meses) o con la localía invertida, en la misma
  jornada y entre los mismos equipos, no se añade: el registro lo avisa para que revises cuál es
  el correcto.
- **Nunca se borra histórico**, y un dato vacío de la fuente no borra uno guardado.
- Los nombres de la fuente se traducen a los que ya usa la app a través de la identidad global
  (`Olympique de Marseille` → `Marsella`), y solo cuando no hay duda. Los alias puestos a mano en
  *Configuración* mandan.
- **Sin equipos duplicados**: si LIGAS no dice cuántos equipos tiene la liga, la plantilla de ESPN
  hace de tope. Con la liga completa, un nombre desconocido se descarta y se avisa en vez de crear
  un equipo nuevo.
- **Un error en una liga no detiene las demás**: se reintenta lo pasajero (sin respuesta, 5xx), se
  prueba la sección alternativa del mismo dominio donde hay una verificada (LaLiga:
  `/es-ES/laliga-easports/resultados` → `/laliga-easports/resultados`), después la siguiente
  fuente, se registra y se sigue.

### Excel por liga

Cada liga actualizada guarda `data/ligas/<Liga>.xlsx` con la estructura del libro: hojas LIGAS,
PARTIDOS y PARTIDOS PENDIENTES, cabecera en la fila 4, mismas columnas y formatos (fecha, `J5`,
`64%`). Si el archivo ya existe, sus columnas se localizan **por nombre** y las filas que tenía se
conservan aunque no lleguen en la actualización; si no existe, se crea.

El libro combinado `Analisis_Futbol_2026-27_2.xlsx` **no se toca**: tiene 91.908 fórmulas y
203.872 celdas con formato que la librería de Excel no conserva al reescribir.

### Registro

Debajo de *Competiciones* queda el registro de la última ejecución, con el resumen arriba
(`23/23 ligas procesadas correctamente`). Por liga: fuente usada (oficial o secundaria), URL,
temporada según la fuente, archivo, partidos **encontrados / nuevos / actualizados / sin cambios /
duplicados evitados**, pendientes nuevos, y cada fuente probada con lo que respondió.

- **Actualizados**: cambió algún dato (marcador, fecha…). Poner el id o la hora oficiales no cuenta.
- **Duplicados evitados**: registros que ya existían sin su id oficial (Excel, otra fuente), o que
  la fuente repite, reconocidos en vez de duplicarse.

### football-data.org

Ya no interviene en «Actualizar partidos». Sigue en *Configuración → Proveedor* solo para buscar
códigos de competición.

#### Por qué solo este

Se probaron otros tres y ninguno servía hoy:

| Fuente | Resultado de la prueba |
|---|---|
| **SofaScore** | 403 en la **primera** petición, en `api.` y en `www.`, con `Server: Varnish`. Bloqueo de borde a cualquier cliente que no sea su web; no publican claves. Ir liga por liga no cambia nada. |
| **API-Football** | Tiene corners, tarjetas y xG, pero su **plan gratuito no da acceso a la temporada en curso**: solo 2022–2024. Con 2026/27 responde `Free plans do not have access to this season`. |
| **TheSportsDB** | Con la clave libre **trunca**: 5 partidos de una jornada de 15, 1 solo fixture. |

Los adaptadores de SofaScore y API-Football se escribieron y se retiraron: no aportaban nada
mientras no haya un plan de pago detrás. Volverán como adaptador nuevo cuando toque.

### Códigos de competición sin teclearlos

*Configuración → Proveedor → «Buscar códigos automáticamente»* descarga el catálogo del
proveedor (**1 petición**) y rellena el **código**, la **temporada** y el **plan** de cada
competición. El emparejamiento traduce el país (`Espana` → `Spain`) y los nombres que no
coinciden (`LaLiga` → `Primera Division`, `Brasileirao Serie A` → `Campeonato Brasileiro
Série A`).

Lo que **no** hace es adivinar:

- Nunca busca fuera del país de la competición. Sin esa regla, «Liga FUTVE» (Venezuela)
  acababa asignada a la «Primera División» **de Chile** — lo cazó un test.
- Prefiere torneos de tipo liga antes que copas.
- Si hay más de una candidata razonable, **no elige**: te las lista con un desplegable.

La columna **Plan** te dice después cuáles cubre tu clave, con el dato que da el propio
proveedor en vez de una lista quemada en el código.

### Jornadas: la ventana deslizante

Por defecto cada actualización deja en **Partidos → Pendientes** exactamente **la jornada que
toca en cada liga**. El ciclo es:

1. Se traen los resultados y el calendario de cada liga configurada.
2. Se calcula en qué jornada va la liga = la más alta **con partidos finalizados**.
3. Los pendientes cuyo partido ya está **finalizado** salen de Pendientes y entran en
   Disputados. Un partido en juego, aplazado o cargado sin marcador **sigue pendiente**.
4. Los pendientes que quedan fuera del horizonte se podan, así la lista no crece sin fin.
5. Entran los de la nueva jornada.

Reglas que protegen los datos:

- **Solo lo finalizado pasa a disputado.** La condición es que exista un partido con marcador,
  no que el proveedor lo mencione.
- **Nunca se duplica un pendiente**: la identidad es el id del proveedor y, si no,
  `liga+temporada+fecha+local+visitante`. Un pendiente cargado a mano que luego llega del
  proveedor se fusiona, no se repite.
- **Los aplazados no se pierden**: un pendiente de una jornada ya jugada se conserva siempre y
  no consume horizonte (si no, un aplazado de la J2 taparía la J5, que es la que toca).
- **Los cargados a mano no se podan**, solo desaparecen cuando se juegan.
- **Si el proveedor devuelve el calendario vacío no se borra nada**: un fallo transitorio no
  puede vaciar la lista de pendientes.

El horizonte se cambia en **Configuración → Proveedor**: próxima jornada (por defecto), 2, 3,
5, o todo el calendario restante.

> ⚠️ La *Proyección final de temporada* solo puede sumar los partidos que estén cargados. Con
> horizonte corto refleja la próxima jornada, no lo que queda de temporada; la pantalla lo
> avisa. Para una proyección a final de temporada real, pon «todo el calendario restante».

También **calcula en qué jornada va cada liga**
(`domain/statistics/leagueRounds.ts`) y lo enseña:

- **Ligas** tiene una columna `Jornada`: `J3 → J4 (10)` = va por la 3, la próxima pendiente
  es la 4 y tiene 10 partidos.
- **Proyecciones** tiene la casilla **«Solo próxima jornada»**, que filtra por la próxima de
  *cada* liga (no por un número global: cada liga va por su cuenta).
- El resumen de sincronización desglosa, liga por liga, en qué jornada quedó.

Se distinguen **dos cosas que antes se mezclaban**:

- **Lo que falta de una jornada ya empezada** (aplazados y rezagados): la liga «va por J6» y
  quedan 2 partidos de esa J6 sin jugar.
- **La próxima jornada nueva**: la primera que aún no ha empezado.

Antes se anunciaba una sola «próxima jornada» y salían frases sin sentido como *«va por J6 ·
próxima J13»*. Ahora la frase es explícita: *«va por J6 · quedan 2 de jornadas ya empezadas
(hasta la J6) · próxima nueva J7 (12)»*.

La ficha de cada competición (**Ligas → una liga**) trae un **desglose por jornada** con
jugados y pendientes, en ámbar lo que falta de jornadas ya empezadas. Ahí se ve de un vistazo
si un salto de J6 a J13 es porque esas jornadas no están cargadas, no porque no existan.

**La jornada nunca se inventa.** Si el proveedor no reporta el número de jornada de un
evento, ese evento se descarta y se cuenta en el resumen («N eventos descartados por datos
incompletos»). Escribir un `0` rompería las ventanas de FORMA, que comparan jornadas.

### Reconciliación de nombres: por qué no se duplican los equipos

El Excel dice `Manchester City` y el proveedor `Manchester City FC`. Sin reconciliar, la liga
acabaría con 40 fichas en vez de 20 y la clasificación sería basura.

`domain/models/teamResolver.ts` resuelve lo inequívoco y **deja lo dudoso sin resolver**:

1. Alias manual, si lo hay.
2. Nombre exacto.
3. Mismo nombre salvo acentos, mayúsculas y puntuación (`Atletico Mineiro` → `Atlético Mineiro`).
4. Uno contiene todas las palabras del otro **y** empieza igual **y** la coincidencia es única
   (`Manchester City FC` → `Manchester City`). `Manchester` a secas es ambiguo: no se resuelve.
5. Si no, depende de si la plantilla está completa (columna `N Equipos` de LIGAS):
   - **Con hueco** → es un equipo que no conocíamos: entra.
   - **Completa** → solo puede ser el mismo equipo escrito distinto: **se descarta el partido**
     y se lista en *Configuración* con un desplegable para decir a qué equipo corresponde.

También se tolera **±1 día** al casar un partido: un proveedor que publica el timestamp en UTC
pone un partido nocturno de Sudamérica al día siguiente. Con esos proveedores la fecha que ya
tenías **manda**. Con las fuentes de «Actualizar partidos», que dan la fecha oficial local, manda
la de la fuente.

### Añadir competiciones

**Configuración → Proveedor → Añadir competición** da de alta cualquier torneo sin tocar
código. El botón **«Añadir Championship y competiciones UEFA»** da de alta las que falten de las
cuatro (EFL Championship, Champions, Europa y Conference League) y trae al momento sus partidos
desde su fuente: uefa.com para las tres UEFA y FotMob, como secundaria, para la Championship. Se
quitan desde la misma tabla, como cualquier alta manual.

Qué esperar según el tipo de torneo:

| Competición | Encaja en el modelo | Notas |
|---|---|---|
| **Championship** y cualquier liga de todos-contra-todos | Sí, completo | Es una liga normal: clasificación, home/away, forma por jornada y proyección de temporada funcionan igual que en Premier League. Gratis en football-data.org. |
| **Champions / Europa / Conference League — fase de liga** | Sí, con matices | Hay jornadas (1-8), así que la forma y las proyecciones funcionan. Pero cada equipo juega contra rivales distintos, así que el **Strength of Schedule pesa mucho más** y las muestras son minúsculas (4 partidos en casa): la contracción bayesiana tirará fuerte hacia la media del torneo. El desempate real de la UEFA es más largo que `Pts → DG → GF`, así que la tabla puede diferir en empates de puntos. |
| **Champions / Europa / Conference League — eliminatorias** | No | Son cruces a doble partido con eliminación: repartir 3/1/0 puntos no significa nada, y no hay "posición proyectada". Las proyecciones de goles/corners/tarjetas de cada partido **sí** son válidas; ignora la pantalla de fin de temporada para esos torneos. |

Un detalle del modelo, heredado del Excel: el equipo es `liga|nombre`, así que *Arsenal
(Premier League)* y *Arsenal (Champions League)* son dos fichas separadas, cada una con sus
estadísticas de esa competición. Es lo correcto para comparar contra el rival del mismo
torneo, pero no mezcla la forma de ambas.

**Clave de deduplicación:** el id del proveedor si existe; si no,
`liga + temporada + fecha + local + visitante`. Un `null` entrante nunca borra un dato que ya
teníamos.

### Antes de usarlo, dos requisitos reales

1. **CORS.** `api.sofascore.com` no envía cabeceras CORS. En desarrollo, `vite.config.ts`
   incluye un proxy en `/sofascore`. En producción hay que servir un proxy equivalente.
2. **Id de temporada por liga.** El proveedor los exige y no son adivinables: se introducen en
   *Configuración → Proveedor*. Una liga sin id (o sin torneo mapeado) se **omite** y aparece
   listada como omitida en el resumen. No se inventan datos para rellenar el hueco.

---

## Motor de predicción (siete modelos)

Además de la proyección del libro, la aplicación tiene un **motor de predicción modular** con siete
modelos sobre los mismos datos reales: Poisson, Dixon-Coles, Elo, xG, Random Forest, Gradient Boosting y
una red neuronal, combinados por un ensemble cuyos pesos salen del backtesting, no de una elección a
mano.

- **Qué hace cada modelo, cómo se evita la fuga temporal, qué mide el backtest y qué sale mejor**:
  [PREDICTION_ENGINE.md](PREDICTION_ENGINE.md).
- **Dónde se ve**: *Predicción → Modelos* compara los siete y enseña los pesos; la ficha de cada partido
  pendiente enseña lo que dice cada modelo por separado, quién entró en la mezcla y una confianza
  calculada con la muestra, el acuerdo entre modelos y la calibración medida.
- **Entra en las proyecciones y en los picks**: por defecto, cada proyección es un 70 % del modelo del
  libro y un 30 % de la mezcla de los siete modelos (`FUENTE_PROYECCION` en Configuración). Es lo que
  mejor salió medido sobre 1.628 partidos, mejor que cualquiera de los dos por separado.
- **Sin dependencias nuevas**: los árboles, el bosque, el boosting y la red neuronal están escritos en
  TypeScript en `src/domain/prediction/`.
- **Lo que no puede entrar**: no hay datos de lesiones, alineaciones ni sanciones en ninguna fuente
  actual, y solo hay una temporada cargada. Los dos límites están medidos y escritos en el documento.

---

## Horarios: siempre hora de Colombia

Todo lo que se ve en la aplicación está en **hora de Colombia** (`America/Bogota`): los partidos
disputados, los pendientes, las proyecciones, el calendario y los selectores de picks.

Por dentro se guardan tres cosas distintas, y conviene no confundirlas:

| Campo | Qué es | Para qué |
|-------|--------|----------|
| `date` | Fecha **oficial de la competición** (`YYYY-MM-DD`) | Ordena jornadas y temporadas. Un partido de la Liga BetPlay a las 20:00 de Bogotá es la 01:00 UTC del día siguiente: guardar la fecha UTC lo movería de jornada |
| `kickoffTime` | Hora **oficial local** (`HH:mm`) | Es la que publica la fuente |
| `kickoffUtc` | **Instante** del saque inicial (ISO con `Z`) | Es lo único que permite convertir a Colombia sin suponer nada |

La conversión ocurre en un solo sitio (`src/utils/matchTime.ts`, que pinta `src/components/Kickoff.tsx`):

1. **Con `kickoffUtc`** (lo publican las seis fuentes) la hora de Colombia es exacta, juegue donde juegue.
2. **Sin él**, en una competición de un solo país, el instante se reconstruye con la zona de esa
   competición (`src/domain/models/leagueTimeZones.ts`), que es la que usó la fuente al guardar la hora.
   Sale exacto, con horario de verano incluido.
3. **Sin él**, en una competición que cambia de país cada jornada (las tres de la UEFA), no se convierte
   a ojo: se enseña la hora del estadio, marcada como tal, hasta que una actualización traiga el instante.
   Dos partidos de la misma jornada de Champions a las 18:45 en Brujas y a las 19:45 en Atenas son el
   mismo instante; una zona fija los separaría una hora.

Medido el 19/09/2026 sobre los 3.519 partidos guardados: 3.423 en hora de Colombia, 90 en hora del
estadio (las tres competiciones UEFA, hasta su próxima actualización) y 6 sin hora publicada por la fuente.

---

## Formatos de competición

No todas las ligas juegan de agosto a mayo con una jornada detrás de otra. El formato de cada una de
las 32 competiciones está en `src/domain/models/competitionFormat.ts`, con dos orígenes distintos y
marcados: lo **medido** en la fuente el 19/09/2026 (tipo de temporada, jornadas de la fase regular y
fases con nombre propio) y la **estructura publicada** por cada competición (tipo, fase final, grupos,
ascenso, descenso y particularidades). Lo que no está claro se marca «sin documentar», nunca se supone.

**El número de equipos no se declara: se cuenta.** Sale de los equipos que aparecen en los partidos y
pendientes cargados, así que siempre es el real. Antes, 14 de las 32 competiciones no tenían el dato en
el Excel y la pantalla enseñaba «Confirmar»; ahora ninguna lo hace.

Cada competición enseña su formato entero en su ficha: tipo, temporada, equipos, jornadas de la fase
regular, grupos, fase final, ascenso, descenso, etapas y particularidad.

- **Cruzada** (europea, ago–may), **año calendario**, **torneos** (Apertura/Clausura, cada uno con su
  tabla) y **fases** (fase regular + playoffs, hexagonales, liguillas o cuadrangulares).
- La **fase** de cada partido se guarda tal como la nombra su fuente (`phase`: «Clausura»,
  «Championship Round»…), sin traducir: es un dato, no una interpretación.
- **La jornada solo es única dentro de su fase.** La fase final de la LigaPro ecuatoriana vuelve a
  numerar desde la J1, así que sin la fase se mezclaría con la J1 de febrero. Por eso las jornadas se
  cuentan por `(fase, jornada)` (`roundKey`) en Competiciones, Proyecciones y el calendario.
- La LigaPro reparte además su fase final en **tres grupos a la vez** («Championship Round»,
  «Relegation Round» y «Copa Sudamericana Play-off»). Antes solo entraba uno de los tres y 10 de sus 16
  clubes se quedaban sin calendario; ahora entran los tres. La prueba es de los propios datos, no una
  lista de competiciones: una fase que se solapa en fechas con la que está en curso y no comparte
  ningún equipo con ella es otro grupo del mismo torneo, no un torneo posterior.

---

## Momentum del partido

En la ficha de un partido (y en la de uno pendiente, cuando ya ha empezado) hay un gráfico de
**momentum**: qué equipo aprieta en cada minuto, arriba el local y abajo el visitante.

Ningún proveedor publica un momentum que la aplicación pueda usar como dato, así que se calcula con una
metodología propia y documentada (`src/domain/statistics/momentum.ts`) a partir de lo que sí es un dato:
**los tiros con su minuto y su xG y los goles** que publica la fuente del partido.

- Cada tiro pesa su **xG**; uno sin xG publicado pesa 0,03 (el de un disparo lejano), nunca 0.
- Un tiro **a puerta** suma además la mitad de su **xGOT** (el xG después del tiro, que mide lo difícil
  que era pararlo).
- Un **gol** suma además 0,30.
- El efecto se desvanece: en el minuto *t*, cada tiro anterior pesa `peso · exp(-(t - minuto) / 5)`.
- La curva es lo del local menos lo del visitante, y la **escala es relativa al propio partido**: el
  máximo es su momento más dominante, así que no se puede comparar con otro partido.
- Las **tarjetas y expulsiones** se marcan en el gráfico, pero no entran en la curva.

El gráfico es un SVG propio (`src/components/Match/MomentumChart.tsx`): barras por minuto alrededor de
un eje central, el local arriba y el visitante abajo con su color, hueco real en el descanso y los goles
y expulsiones marcados sobre su minuto.

**Qué no entra, porque la fuente no lo publica minuto a minuto**: corners, posesión, ataques y ataques
peligrosos. Solo existen como totales del partido, y un total no sitúa nada en el tiempo.

Se pide a la fuente al pulsar, no se guarda, y **mientras el partido está en juego se actualiza solo**
cada minuto. Donde la fuente no publica tiros con minuto no hay gráfico: lo dice y no inventa una curva
con los goles. Medido el 19/09/2026: hay tiros con minuto en las cinco grandes europeas, Brasil,
Argentina, Colombia, México, MLS y Polonia, y no los hay en Ecuador, Bolivia, Paraguay, Uruguay ni
Venezuela (FotMob los cubre con `coverageLevel` «ratings» o «lower»).

---

## Datos guardados: SQLite

Desde el 15/09/2026 los datos del análisis (ligas, partidos, pendientes, parámetros, alias y registro) viven en
`data/analisis-futbol.sqlite` y no en el `localStorage` del navegador, que tenía ~5 MB de límite, se reescribía entero
en cada cambio y se borraba al limpiar los datos del sitio.

- **Dónde**: `node:sqlite` (viene con Node 24, sin dependencias) dentro del mismo servidor de `npm run dev` que ya
  sirve `/api/*`, en la ruta `/api/store` (`server/storage/appStore.ts`).
- **Tablas**: `leagues`, `matches` y `fixtures` con una columna por dato (lo que no tiene columna va a `extra`, así
  que nada se pierde); `team_aliases`, `identity_aliases`, `settings` (JSON), `store_meta` y `storage_backups`.
  Esquema versionado con `PRAGMA user_version`.
- **Escrituras**: solo viajan los partidos y pendientes que cambian (`src/store/storeSync.ts`), en una transacción.
  Si una falla, la siguiente sustituye todo y se reintenta sola; cerrar la pestaña con cambios pendientes pide
  confirmación. Nada se escribe antes de haber leído lo guardado.
- **Migración**: al abrir la app con la base sin estrenar, se copia el `localStorage` una sola vez y su texto
  original queda en `storage_backups`. El `localStorage` no se borra. Una pestaña sin datos no estrena la base.
- **Sin servidor** (`vite preview` o la app compilada): se ven los datos del navegador en solo lectura y no se guarda
  nada.
- **Picks y bankroll** (también desde el 15/09/2026): tablas `betting_profiles`, `betting_movements`,
  `betting_picks` y `betting_tickets` (columnas para consultar y el objeto completo en `data`), en la ruta
  `/api/betting` (`server/storage/bettingStore.ts`). La primera vez se copian de IndexedDB, que no se borra; un
  perfil recién creado sin movimientos no estrena la base. Cada cambio sustituye todo en una transacción.
- **Clave de football-data.org**: tabla `server_secrets`, solo del servidor. Se guarda en Configuración →
  Proveedor (`/api/football-data/key` solo dice si hay clave) y el proxy `/football-data` la añade a cada
  petición: el navegador ya no la guarda ni la lee. La que hubiera en `localStorage` pasa ahí al copiarlo.
- **Si la lectura falla** (un `migrate` o un `merge` con error), ninguno de los dos stores escribe: persist
  guardaría el estado vacío de arranque encima de los datos.
- **Sigue en el navegador**: solo el tema (`localStorage`, preferencia de cada dispositivo).
- **Límites**: un usuario en un equipo. Dos pestañas no se pisan partido a partido, pero no hay control de
  versiones; varios usuarios exigen un servidor con autenticación.

## Arquitectura

```
src/
  domain/            ← el modelo estadístico, sin React
    models/          ids.ts, params.ts, leagueTimeZones.ts, competitionFormat.ts
    calculations/    matchDerived.ts        (columnas calculadas de PARTIDOS)
    statistics/      teamStats, splitStats, form, standings, sos, leagueAverages, dashboard, momentum
    probability/     poisson, shrink, matchProbabilities, negativeBinomial
    projections/     expectedValues, expectedGoals, matchProjection, seasonProjection
    prediction/      features, models (Poisson, Dixon-Coles, Elo, xG, RF, boosting, red neuronal),
                     ml/ (árboles e histogramas, red neuronal), calibration, ensemble, backtest,
                     metrics, evaluate, engine   (PREDICTION_ENGINE.md)
    betting/         odds, kelly, markets, tickets, risk, wallet, settlement, metrics, backtest,
                     evaluation, settings, backup   (PICKS_METHODOLOGY.md)
    engine.ts        orquesta el recálculo completo
  services/
    import/          excelImport.ts         (LIGAS, PARTIDOS, PARTIDOS PENDIENTES, CONFIGURACION)
    providers/       types.ts, footballData.ts, dataSources.ts
    sync/            syncEngine.ts
  store/             useStore.ts            (Zustand; se guarda en SQLite: sqliteStorage.ts + storeSync.ts)
                     useBetting.ts          (perfiles, wallet, picks y tickets; en SQLite)
  workers/           prediction.worker.ts   (entrenamiento de los 7 modelos fuera del hilo de la interfaz)
                     predictionClient.ts
  components/        Layout, Filters, Match, ui.tsx
  pages/             las pantallas de la tabla de arriba
  types/             entidades tipadas
  validation/        validateVsExcel.test.ts
```

`domain/` no importa nada de React ni del store: se puede ejecutar en Node, y de hecho es lo
que hacen las pruebas. `workers/` es solo el paso de mensajes: el trabajo que hace dentro son esas
mismas funciones del dominio, así que entrenar en un worker no cambia ningún número.

**Recálculo**: `recalculateAll()` rehace las 308 fichas de equipo, los splits, la forma, las
tablas y las proyecciones en una sola pasada por partido y otra por equipo. Con 998 partidos
tarda milisegundos, así que no hay caché ni invalidación selectiva que mantener.

---

## Pruebas

`npm test` — 373 pruebas en 31 archivos (14/09/2026). Además de las del modelo:

- **Mercados nuevos** (`markets.test.ts`, `goalDifference.test.ts`, `tickets.test.ts`, `odds.test.ts`): la
  diferencia de goles suma 1 y reparte exactamente el 1X2; hándicap asiático ±0.5 = 1X2 y empate no válido =
  P(1) / (P(1) + P(2)); hándicap −1 con su devolución; los tres resultados del europeo suman 1; goles por
  equipo y portería a cero con Poisson; líneas asiáticas de goles; liquidación con devolución; claves que
  rechazan cuartos de línea; correlación idéntica entre mercados equivalentes y excluyente entre imposibles;
  conjuntas exactas de hándicap europeo + doble oportunidad y goles del local + BTTS; valor esperado con
  devolución.
- **Picks y riesgo** (`src/domain/betting/*.test.ts`): Kelly con el ejemplo de cuota 2.00 y p = 55 %,
  Kelly negativo, probabilidad 0 % y 100 %, cuotas no válidas y ≤ 1, bankroll vacío, stake superior al
  saldo, cada tope de exposición, correlación y picks duplicados; probabilidad implícita, cuota justa,
  mínima y valor esperado; wallet (10.000 − 350 a 1.90 → 10.315 / 9.650, reembolso, sin saldo negativo,
  reinicio); tickets correlacionados con conjunta exacta y cotas de Fréchet; liquidación con resultado,
  sin resultado, cancelado y sin la cifra publicada; ROI negativo que sigue negativo, Brier, log loss,
  calibración y drawdown; backtest sin información futura; binomial negativa y promedios por muestra.

- **Poisson**: pmf, cdf, Over 1.5/2.5/3.5 con valores cerrados, BTTS por dos caminos
  independientes, portería a cero, matriz de marcadores.
- **1X2**: suma exacta 1, réplica de la fórmula del Excel, simetría, puntos esperados, resultado
  1 / 1X / X / 2X / 2 y un marcador que nunca lo contradice (MODEL_MAPPING.md · DIFF-03).
- **Contracción bayesiana**: peso, casos límite (PJ = 0, valor ausente, muestra grande), clamp.
- **Estadísticas**: PJ/PG/PE/PP/Pts/GF/GC sobre una mini-liga escrita a mano, invariantes
  (goles marcados = goles encajados, Home + Away = total).
- **Clasificación**: comparador completo y posiciones sin repetir.
- **Forma**: ventanas de últimos 5 y 10 **por jornada**, incluido el caso de una jornada
  saltada (ahí está la diferencia con "últimos N partidos").
- **SoS**, **deduplicación** (clave natural, prioridad del id de proveedor, `mergeMatch` que no
  borra con `null`), **proyección de puntos** de fin de temporada.
- **Sincronización** con un proveedor de mentira: ventana de jornadas, aplazados que no
  consumen horizonte, pendiente que solo pasa a disputado si está finalizado, no duplicar un
  pendiente que cambia de fecha ni uno manual que luego llega del proveedor, poda del
  horizonte, y que una respuesta vacía no borre nada.
- **Reconciliación de nombres**: acentos y puntuación, sufijos genéricos, ambigüedades que
  NO se resuelven, alias manual, plantilla llena vs. con hueco, y el desfase UTC de un día.
- **Jornadas**: lo que falta de una jornada ya empezada frente a la próxima jornada nueva,
  y el desglose por jornada.
- **Emparejar competiciones**: traducción de país, nombres que no coinciden, ligas homónimas
  en países distintos (Serie A de Italia vs Campeonato Brasileiro), competiciones UEFA sin
  país, y que un país no cubierto por el proveedor **no** asigne una liga de otro país.
- **Validación contra el Excel**: 5 pruebas, 308 equipos cada una.

---

## Stack

React 19 · TypeScript (strict) · Vite · Tailwind CSS 4 · Recharts · Lucide · Zustand ·
`xlsx` para leer el libro. Nada más.
