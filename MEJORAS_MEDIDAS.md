# Mejoras medidas sobre la plataforma

Medido el 21/10/2026. Las cifras de mercados salen de **tu propio motor** (`runBacktest`, walk-forward,
cada partido predicho solo con lo anterior a él): 20.906 partidos, 663.610 predicciones. Las de picks,
de tus 50 picks reales.

## Cómo leer la tabla clave

Un pick solo se hace cuando el modelo está muy seguro, así que lo único que importa es cómo se porta
**ahí**. Para cada mercado, en la zona de picks (p ≥ 75 %, contando las dos colas):

- **Desvío** = lo que pasó − lo que el modelo decía.
- Desvío **positivo** = el modelo se queda corto ⇒ tienes ventaja incluso contra una casa sin margen.
- Desvío **negativo** = el modelo se pasa ⇒ es un lastre que la casa tiene que regalarte antes de que
  empieces a ganar.

Esto mide **el error del modelo**, no si el mercado es rentable. Un mercado bien calibrado da 0 % y
aun así puede ser muy rentable si la casa pone mal el precio. Lo que el desvío dice es cuánta ventaja
regalas de entrada.

## Por familia, en la zona de picks

| Familia | n | Decía | Pasó | Desvío |
|---|---|---|---|---|
| conteoEquipo | 9.880 | 79,2 % | 80,4 % | **+1,22 pp** |
| asiático | 35.525 | 85,7 % | 86,5 % | **+0,84 pp** |
| resultado | 19.067 | 79,3 % | 79,2 % | −0,08 pp |
| mitad | 20.896 | 79,8 % | 79,0 % | −0,76 pp |
| goles | 18.715 | 81,0 % | 78,6 % | −2,36 pp |
| cero | 6.951 | 81,0 % | 78,5 % | −2,52 pp |
| tiros (totales) | 3.281 | 79,2 % | 76,5 % | −2,65 pp |
| equipo | 8.808 | 80,7 % | 77,5 % | −3,17 pp |
| tarjetas | 6.967 | 80,7 % | 76,8 % | −3,90 pp |
| sot (totales) | 3.533 | 79,7 % | 75,6 % | −4,10 pp |
| **corners** | 4.717 | 78,8 % | 68,9 % | **−9,88 pp** |

## Los mercados donde el modelo TIENE ventaja

| Mercado | n | Decía | Pasó | Desvío |
|---|---|---|---|---|
| **Local: Over 12.5 tiros** | 1.789 | 79,6 % | 87,6 % | **+8,04 pp** |
| **Local: Over 4.5 tiros a puerta** | 698 | 78,7 % | 84,1 % | **+5,44 pp** |
| Empate no válido: Local | 2.784 | 81,6 % | 84,9 % | +3,28 pp |
| Visitante: Over 12.5 tiros | 2.630 | 79,4 % | 82,6 % | +3,22 pp |
| Gana Visitante | 5.642 | 81,3 % | 83,7 % | +2,46 pp |
| Hándicap asiático Local +1.5 | 18.212 | 87,3 % | 89,3 % | +2,01 pp |
| Over 0.5 goles 2.ª parte | 13.968 | 80,6 % | 80,7 % | +0,03 pp |

## Los mercados que no se pueden ganar

| Mercado | n | Decía | Pasó | Desvío |
|---|---|---|---|---|
| **Over 9.5 corners** | 454 | 77,8 % | 62,1 % | **−15,68 pp** |
| Over 10.5 corners | 1.915 | 78,9 % | 68,0 % | −10,89 pp |
| Over 8.5 corners | 2.348 | 79,0 % | 71,0 % | −7,93 pp |
| Over 2.5 goles | 496 | 78,1 % | 71,8 % | −6,31 pp |
| Over 1.5 goles 1.ª parte | 2.044 | 77,9 % | 71,9 % | −6,07 pp |
| Local: Over 1.5 goles | 1.857 | 79,3 % | 73,7 % | −5,59 pp |
| Over 8.5 tiros a puerta | 704 | 78,6 % | 73,4 % | −5,13 pp |
| Over 3.5 goles | 7.401 | 80,7 % | 76,1 % | −4,59 pp |
| Over 3.5 tarjetas amarillas | 4.609 | 81,4 % | 77,4 % | −4,01 pp |

## Tu cartera real, diagnosticada

29 de tus 50 picks son `goles over 1.5`, con +12,1 % de ROI. ¿Suerte o habilidad?

El backtest dice que en ese mercado, en la zona de picks, el modelo dice 81,3 % y pasa 80,7 % — está
prácticamente calibrado (−0,65 pp). Con las cuotas que conseguiste (media 1,37, o sea un 73 %
implícito), el ROI esperado es **0,807 × 1,37 − 1 = +10,6 %**.

Lograste +12,1 %. **La ventaja es real y repetible**, y no viene del modelo siendo brillante: viene de
que la casa paga Over 1.5 un 8 pp por debajo de la realidad, y de que tu modelo está lo bastante bien
calibrado ahí para detectarlo sin meter error propio.

El resto de tu cartera es lo que te resta: corners −15,5 % y −100 %, tarjetas −100 %, resultado −100 %,
`goles under 2.5` −21,5 %, `goles over 2.5` −20,0 %.

## Estado: implementado el 21/10/2026

| | Cambio | Estado |
|---|---|---|
| 1 | Cerrar corners (totales y por equipo) | **Hecho** — fuera de `PICK_MARKETS` |
| 2 | Tiros por equipo | **Ya estaba** — no hacía falta tocar nada (ver abajo) |
| 3 | Goles solo línea 1.5 | **Hecho** — fuera 0.5, 2.5, 3.5 y 4.5 |
| 4 | Doble oportunidad y gana visitante | **Ya estaban** — no hacía falta tocar nada |
| 5 | Contracción final L | **Hecho** — `CONTRACCION_FINAL` en `expectedValues.ts` |
| + | Cerrar totales de tiros y tiros a puerta | **Hecho** — pedido aparte tras ver el efecto del 1 |
| + | Cerrar goles por equipo (`equipo`) | **Hecho** — pedido aparte tras ver el efecto del anterior |
| + | Cerrar ambos marcan (`btts`) | **Hecho** — era el último desvío negativo que quedaba |

`npx tsc -b` limpio, 653 tests en verde (3 de `modelPick.test.ts` se adaptaron porque probaban con
mercados que ya no compiten, y hay uno nuevo para la contracción).

### Lo que el diagnóstico corrigió de mis recomendaciones

Dije que los tiros por equipo y la doble oportunidad «no se estaban usando». **Era falso.** Ejecutando
`selectModelPick` de verdad sobre la historia de Premier, LaLiga, Serie A y Bundesliga (2.213 picks),
el reparto ANTES de los cambios ya era: `conteoEquipo:corners` 15,0 %, `conteoEquipo:tiros` 14,9 %,
`conteoEquipo:sot` 14,3 %, `equipo` 12,9 %, `doble` 8,5 %, `goles` 4,1 %.

O sea: los mercados con ventaja ya ganaban picks, y el problema real era otro — **corners se llevaba el
21,3 % de todos los picks** (15,0 % por equipo + 6,3 % totales) siendo el peor calibrado.

### Efecto medido de los cambios

Reparto de picks en los cuatro pasos: como estaba, sin corners, sin los totales de tiros, y sin los
goles por equipo. Medido con `selectModelPick` de verdad sobre 4.573 partidos de Premier, LaLiga,
Serie A y Bundesliga.

| Mercado | Antes | Sin corners | Sin totales | Final |
|---|---|---|---|---|
| conteoEquipo:sot | 14,3 % | 22,0 % | 28,8 % | **35,4 %** |
| conteoEquipo:tiros | 14,9 % | 21,4 % | 27,6 % | **33,4 %** |
| doble | 8,5 % | 10,2 % | 11,2 % | **13,9 %** |
| tarjetas | 4,2 % | 2,7 % | 4,3 % | 6,5 % |
| mitad | 0,9 % | 1,7 % | 2,1 % | 3,7 % |
| conteoEquipo:tarjetas | 5,6 % | 1,2 % | 1,9 % | 3,1 % |
| goles | 4,1 % | 1,4 % | 2,0 % | 3,0 % |
| resultado | 0,9 % | 0,9 % | 1,0 % | 1,0 % |
| **corners (todo)** | **21,3 %** | **0 %** | 0 % | 0 % |
| **tiros + sot totales** | 12,3 % | 19,6 % | **0 %** | 0 % |
| **equipo (goles por equipo)** | 12,9 % | 18,7 % | 21,0 % | **0 %** |
| **btts** | 0 % | 0,0 % | 0,0 % | **0 %** |

El **68,7 %** de los picks va a tiros y tiros a puerta por equipo (+8,04 pp y +5,44 pp medidos) y el
13,9 % a la doble oportunidad (+3,28 pp). Antes esas tres cosas eran el 37,7 %, y el 21,3 % se lo
llevaba el mercado peor calibrado de todos.

Las selecciones que compiten bajaron de unas 130 a **84**: 60 de conteo por equipo (tarjetas, tiros y
tiros a puerta, 20 cada uno), 8 de tarjetas totales, 8 de goles por parte, 3 de 1X2, 3 de doble
oportunidad y 2 de goles sobre la línea 1.5.

### El precio: menos picks

| | Con pick | Sin pick | Cobertura |
|---|---|---|---|
| Antes | 2.213 | 2.360 | 48,4 % |
| Sin corners | 2.140 | 2.433 | 46,8 % |
| Sin totales | 2.073 | 2.500 | 45,3 % |
| Final | **1.958** | 2.615 | **42,8 %** |

255 picks menos, un 11,5 % relativo. Es el coste de quitar los mercados malos. Vale la pena mirar de
qué se queja el modelo cuando no hay pick: de **datos** en 2.343 de los 2.615 casos, y de probabilidad
fuera de banda en 272. O sea que el hueco grande no lo abrieron estos cambios: ya estaba, y es falta
de datos del partido, no falta de mercados.

Y la calibración, con `medir-mercados` sobre los mismos 20.906 partidos:

| Mercado | ECE antes | ECE ahora | Skill antes | Skill ahora |
|---|---|---|---|---|
| Over 9.5 corners | 0,0461 | **0,0183** | −0,0045 | **+0,0094** |
| Over 10.5 corners | 0,0441 | **0,0137** | −0,0009 | **+0,0115** |
| Over 8.5 corners | 0,0395 | **0,0125** | −0,0006 | **+0,0111** |
| Over 4.5 tarjetas | 0,0256 | **0,0185** | 0,0590 | **0,0670** |
| Local: Over 1.5 tarjetas | 0,0224 | **0,0042** | 0,0431 | **0,0454** |
| Over 3.5 tarjetas | 0,0208 | **0,0138** | 0,0531 | **0,0589** |

Los corners dejan de tener skill negativo. En los corners **por equipo** el skill baja un poco
(0,0334 → 0,0198) mientras la calibración mejora a la mitad: es el canje normal de contraer, y para
apostar importa más la calibración, porque es la que hace perder de forma sistemática.

### El desvío por familia, vuelto a medir DESPUÉS de los cambios

Las cifras de arriba de tarjetas y corners eran anteriores a la contracción, así que volví a pasar el
backtest completo. Lo que cambió:

| Familia | n | Antes | Ahora |
|---|---|---|---|
| conteoEquipo | 7.146 | +1,22 pp | **+3,79 pp** |
| tarjetas | 5.433 | −3,90 pp | **−0,99 pp** |
| corners | 1.339 | −9,88 pp | **−5,36 pp** |
| asiático | 35.525 | +0,84 pp | +0,84 pp |
| resultado (1X2 y doble) | 19.067 | −0,08 pp | −0,08 pp |
| mitad | 20.896 | −0,76 pp | −0,76 pp |
| goles | 18.715 | −2,36 pp | −2,36 pp |
| equipo | 8.808 | −3,17 pp | −3,17 pp |
| tiros (totales) | 3.281 | −2,65 pp | −2,65 pp |
| sot (totales) | 3.533 | −4,10 pp | −4,10 pp |

La contracción dejó **tarjetas casi calibrado** (−0,99 pp) y subió `conteoEquipo` a +3,79 pp. Corners
mejora a la mitad pero sigue malo, que es por lo que está fuera de los picks de todas formas. Lo que
no se contrajo no se movió, como tenía que ser.

## Dónde queda la cartera

**Todo lo que compite está ahora en −0,99 pp o mejor.** No queda ningún mercado con desvío peor que
un punto:

| Familia | % de los picks | Desvío medido |
|---|---|---|
| conteoEquipo (sot, tiros, tarjetas) | 71,9 % | **+3,79 pp** |
| doble | 13,9 % | **+3,28 pp** |
| tarjetas (totales) | 6,5 % | −0,99 pp |
| mitad | 3,7 % | −0,76 pp |
| goles (solo 1.5) | 3,0 % | −0,65 pp |
| resultado (1X2) | 1,0 % | −0,08 pp |

Haciendo la media ponderada de esas cifras, el desvío de la cartera pasa de unos **+1,0 pp a +3,1 pp**.
Ese número es aritmética mía sobre las piezas medidas, no una medición directa: mezcla desvíos de
familia con desvíos de mercado y algunos son de antes de la contracción. Sirve para el orden de
magnitud, no como cifra exacta.

Cerrar `btts` no costó cobertura: su único pick de los 1.958 pasó a `conteoEquipo:sot`, así que los
números de arriba son los mismos con y sin él.

## Pendiente

- **El modelo de goles por partido** (`goles` entero, no solo la línea 1.5) y `mitad` siguen sin
  medirse línea a línea como se midieron los conteos. Están cerca de cero, así que no urge.
- **Las cuotas.** Con todo esto la cartera es mejor, pero sigue sin poder buscar valor donde no haya
  precio de la casa. Es el cuello de botella y no lo arregla ningún cambio de modelo.

## Lo que recomiendo, por orden

### 1. Cerrar corners por completo

−9,88 pp de lastre en la zona de picks, y −15,68 pp en Over 9.5. Ninguna casa se equivoca tanto como
para cubrir eso. Es el único mercado del que estoy seguro de que no se puede ganar.

### 2. Abrir los mercados de tiros POR EQUIPO

Es lo mejor que tienes y hoy no lo estás usando. `Local: Over 12.5 tiros` tiene el modelo **corto en
8 pp**: ventaja incluso contra una casa sin margen. `Local: Over 4.5 tiros a puerta` +5,44 pp.

Ojo: los tiros **totales** son negativos (−2,65 pp) y los tiros a puerta totales también (−4,10 pp).
La ventaja está en los de un solo equipo, no en las sumas.

### 3. Mantener `goles over 1.5`, cerrar las demás líneas de goles

`Over 1.5` está calibrado (−0,65 pp) y es lo que te está dando dinero. Pero `Over 2.5` (−6,31 pp),
`Over 3.5` (−4,59 pp), `Local Over 1.5` (−5,59 pp) y `Over 1.5 1.ª parte` (−6,07 pp) son lastre.
La familia `goles` entera da −2,36 pp; el detalle importa más que la familia.

### 4. Añadir doble oportunidad y gana visitante

`Empate no válido: Local` +3,28 pp y `Gana Visitante` +2,46 pp, con 2.784 y 5.642 casos. Tus 4 picks
de `doble` hicieron +42,7 %, coherente con eso.

### 5. Corregir la contracción de μ en los conteos (medido aparte)

La μ de los conteos se pasa, y más donde más apuestas: tarjetas +8,5 % y corners +10,1 % en el quinto
superior. La causa es que `ataque × (defensa / media de liga)` compone dos estimaciones ruidosas.
Contraer la μ final —`mu' = mediaLiga + L·(mu − mediaLiga)`— con **L = 0,38** en tarjetas y **0,30**
en corners baja el desvío de corners de −3,24 % a −0,22 %. Que L valga 0,3 significa que solo el 30 %
de la desviación que calcula el modelo es señal; el resto es ruido.

Esto arregla lo que muestras en pantalla aunque dejes de apostar esos mercados.

### 6. Volumen

El motor está calibrado y el edge aparece en la cuenta (+3,17 % prometido, +3,88 % logrado). Pero con
50 picks, un ROI así sale por suerte el 32,9 % de las veces: harían falta 300-500 para demostrarlo. La
ganancia es ROI × volumen, y solo encuentras edge donde tengas el precio de la casa. Ese es el cuello
de botella real, no el modelo.

## Lo que NO recomiendo, ya medido

| Idea | Medición | Veredicto |
|---|---|---|
| Árbitro designado | r = 0,066, el intervalo cruza el cero | Sin señal detectable |
| Faltas de los equipos | Error idéntico con y sin ellas | Cero aporte |
| Disparos por jugador | Entidad nueva, modelo nuevo, solo Premier | Caro y sin evidencia |
| Binomial negativa en tarjetas | φ ≈ 1 en tu base | Ya cae a Poisson; el comentario que la justifica es falso |

## Aviso sobre el margen de la casa

Todos los desvíos de arriba son contra una casa **sin margen**. Una casa real cobra un 4-8 %, y suele
cobrar más en mercados de nicho como los tiros por equipo que en 1X2. Así que de la lista de
«ventaja», la que sobrevive con holgura es la de tiros por equipo (+8 pp y +5,4 pp); doble
oportunidad, gana visitante y el hándicap +1.5 (+2 a +3,3 pp) quedan al filo y hay que comprobarlos
con cuotas reales antes de confiar en ellos.
