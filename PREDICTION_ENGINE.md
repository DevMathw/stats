# Motor de predicción

Siete modelos sobre los mismos datos reales, medidos con backtesting temporal y combinados con pesos
que salen de esa medición.

```
Datos reales → Elo · xG · Poisson · Dixon-Coles · Random Forest · Gradient Boosting · Red neuronal
             → Backtesting temporal → Calibración → Ensemble → Probabilidades finales
```

Dónde se ve: **Predicción → Modelos** (comparación y pesos) y la ficha de cada partido pendiente
(qué dice cada modelo de ESE partido).

---

## 1. Qué datos hay de verdad

Medido el 19/09/2026 sobre la base real: **2.907 partidos disputados en 32 competiciones**, con
cobertura del **100 %** en los diez datos de partido (marcador, descanso, tiros, tiros a puerta,
posesión, corners, amarillas, rojas, faltas, fueras de juego y xG; xG y amarillas al 99,9 %).

De ahí salen **41 variables por partido**, todas anteriores a jugarse (`src/domain/prediction/features.ts`):

| Grupo | Variables |
|---|---|
| Fuerza | Elo de cada equipo y su diferencia |
| Muestra | partidos jugados, en total y en su condición |
| Rendimiento | puntos por partido (total y por condición), goles a favor y en contra por condición |
| Forma | puntos, goles a favor y en contra de los últimos 5 |
| Creación | xG a favor y en contra, tiros, tiros a puerta, posesión |
| Disciplina y juego | corners y tarjetas por partido |
| Contexto | días de descanso, enfrentamientos directos previos y su diferencia de goles, goles por partido de la liga, ventaja de campo de la liga |

**Lo que no hay, y por tanto no entra en ningún modelo:** lesiones, alineaciones, sanciones, cambios de
entrenador, clima y cuotas. Ninguna de las fuentes actuales las publica de forma explotable. No se
sustituyen por aproximaciones.

**Una sola temporada.** Todas las competiciones tienen la temporada 2026 (o 2026/27). Es el límite más
serio del motor: los modelos de aprendizaje automático y la red neuronal están pensados para decenas de
miles de partidos y aquí entrenan con unos miles. Se ve en los resultados.

---

## 2. Los modelos

Todos implementan el mismo contrato (`PredictionModel`): declaran cuántos partidos necesitan, se
entrenan con un corte temporal y devuelven `null` cuando no pueden. Activar o quitar uno no toca nada
del resto.

| Modelo | Qué mira | Mínimo | Da |
|---|---|---|---|
| **Poisson** | goles marcados y encajados por condición, contraídos a la media de la liga | 20 partidos | 1X2, Over, BTTS, marcadores, goles esperados |
| **Dixon-Coles** | lo mismo por máxima verosimilitud, con corrección de marcadores bajos (`rho`) y memoria que decae (vida media 90 días) | 60 partidos por liga | igual |
| **Elo** | solo resultados: rating dinámico con margen de goles | 100 partidos | 1X2 |
| **xG** | fuerzas calculadas con xG a favor y en contra, reescaladas a los goles reales de la liga | 20 partidos | 1X2, Over, BTTS, marcadores, goles esperados |
| **Random Forest** | las 41 variables; 120 árboles con muestreo bootstrap | 300 filas | 1X2, Over 2.5, BTTS |
| **Gradient Boosting** | las 41 variables; 80 rondas de árboles sobre el gradiente (esquema de XGBoost) | 300 filas | 1X2, Over 2.5, BTTS |
| **Red neuronal** | las 41 variables; una capa oculta de 12 neuronas, L2 y parada temprana | 300 filas | 1X2, Over 2.5, BTTS |

Los tres de aprendizaje automático están escritos en TypeScript sin dependencias
(`src/domain/prediction/ml/`). A esta escala entrenan en segundos, y una dependencia con binarios
nativos o WebAssembly sería un problema de instalación a cambio de nada. Los cortes usan **histogramas**
de 32 tramos por variable, que es lo que hacen LightGBM y el modo `hist` de XGBoost.

**Elo:** la ventaja de campo no se fija a ojo, se mide con el propio histórico (salió **54 puntos de
Elo**), y la probabilidad de empate sale de una curva `base · exp(-|dif| / escala)` ajustada por máxima
verosimilitud.

**Dixon-Coles:** ataque y defensa de cada equipo, ventaja de campo y `rho` por descenso de gradiente con
gradientes analíticos, con la restricción habitual de media de ataques = 1.

---

## 3. Cómo se evita la fuga de información

Es lo único que hace creíble a un backtest, y aquí se cuida en cuatro sitios:

1. **Variables**: cada fila mira solo fechas estrictamente anteriores. Los partidos se procesan por días
   completos, así que dos partidos del mismo sábado no se ven entre ellos.
2. **Entrenamiento**: los modelos se reentrenan por cortes (cada 21 días de calendario) y en cada corte
   solo entran partidos anteriores a esa fecha. Entre corte y corte se predice con el modelo del último,
   que es lo que se podría haber hecho en la vida real.
3. **Calibración**: se ajusta con las predicciones **crudas** de partidos ya pasados. (Ajustarla sobre
   salidas ya calibradas las comprime un poco en cada corte; es un error silencioso que se ve en las
   métricas y no en el código.)
4. **Pesos del ensemble**: se ajustan con las predicciones de partidos anteriores, en ventana expansiva.
   Hasta las primeras 150 predicciones no hay nada que medir y se reparte por igual, diciéndolo.

Solo se evalúan partidos en los que **los dos equipos llevaban al menos 5 partidos jugados**: antes de
eso no hay historia con la que predecir. De 2.907 partidos, eso deja 1.594 evaluables.

---

## 4. Calibración y ensemble

- **Calibración 1X2**: escalado de temperatura con sesgo por clase, `softmax(a · log p_k + b_k)`, ajustado
  por descenso de gradiente sobre la log loss. Con `a = 1` y `b = 0` no hace nada, que es donde empieza.
- **Calibración sí/no** (Over, BTTS): escalado de Platt, `sigmoide(a · logit(p) + b)`.
- **Pesos del ensemble**: minimizan la log loss de la propia mezcla por **gradiente exponenciado** sobre
  el símplex (los pesos son positivos y suman 1 en todas las iteraciones). Un peso por debajo del 0,5 %
  se poda y se reparte.
- Un modelo que no responde a un partido no participa: su peso se reparte entre los que sí, y la ficha
  del partido enseña quién entró y con cuánto.

---

## 5. Confianza

No es una impresión: sale de tres cosas medibles (`confidenceOf`), en una escala de 0 a 10 que **nunca
llega a 10**, porque una predicción de fútbol no es una certeza.

| Componente | Peso | Qué mide |
|---|---|---|
| Muestra | 40 % | partidos previos del equipo con menos historia, hasta 15 |
| Acuerdo | 35 % | cuánto se parecen entre sí los 1X2 de los modelos que respondieron |
| Calibración | 25 % | ECE del ensemble en el último backtest; sin backtest, esta parte se queda a medias y se dice |

---

## 6. Resultados medidos

Backtest completo del **20/09/2026** sobre 2.937 partidos: 11 cortes de reentrenamiento, **1.624
partidos evaluados**, 1.310 descartados por falta de historia previa.

**Menos log loss es mejor.** El «aporte» es `1 − log loss / log loss de predecir siempre la frecuencia
base`: negativo significa que ese modelo es peor que no modelar nada.

### 1X2, cara a cara (los 917 partidos que respondieron TODOS)

| Modelo | Log loss | Brier | Acierto | ECE | Aporte |
|---|---|---|---|---|---|
| **Ensemble** | **1,0397** | 0,6239 | 47,4 % | 2,6 % | **+2,9 %** |
| Gradient Boosting | 1,0412 | 0,6243 | 47,8 % | 1,0 % | +2,7 % |
| Poisson | 1,0423 | 0,6264 | 46,6 % | 3,2 % | +2,6 % |
| Dixon-Coles | 1,0425 | 0,6262 | 47,8 % | 1,7 % | +2,6 % |
| Random Forest | 1,0427 | 0,6259 | 47,5 % | 2,9 % | +2,6 % |
| Elo | 1,0462 | 0,6286 | **48,0 %** | 5,3 % | +2,3 % |
| xG | 1,0498 | 0,6310 | 47,5 % | 1,1 % | +1,9 % |
| Red neuronal | 1,0832 | 0,6533 | 43,4 % | 7,1 % | −1,2 % |

### Over 2.5, cara a cara

| Modelo | Log loss | Acierto | ECE | Aporte |
|---|---|---|---|---|
| **Dixon-Coles** | **0,6728** | 57,8 % | 1,1 % | **+1,5 %** |
| Poisson | 0,6750 | 57,8 % | 1,4 % | +1,2 % |
| Ensemble | 0,6768 | 58,2 % | 2,2 % | +0,9 % |
| Gradient Boosting | 0,6798 | 58,1 % | 1,4 % | +0,5 % |
| Random Forest | 0,6800 | 56,6 % | 2,0 % | +0,5 % |
| xG | 0,6812 | 57,0 % | 1,8 % | +0,3 % |
| Red neuronal | 0,7025 | 56,6 % | 3,6 % | −2,8 % |

### Ambos marcan, cara a cara

| Modelo | Log loss | Acierto | ECE | Aporte |
|---|---|---|---|---|
| Dixon-Coles | 0,6773 | 59,1 % | 3,6 % | −0,4 % |
| Ensemble | 0,6801 | 58,6 % | 3,9 % | −0,8 % |
| xG | 0,6815 | 57,5 % | 2,8 % | −1,0 % |
| Gradient Boosting | 0,6818 | 59,3 % | 4,8 % | −1,0 % |
| Random Forest | 0,6824 | **59,7 %** | 4,7 % | −1,1 % |
| Poisson | 0,6836 | 57,5 % | 5,1 % | −1,3 % |
| Red neuronal | 0,7141 | 58,6 % | 7,6 % | −5,8 % |

### Pesos que sacó el ensemble

| Mercado | Pesos |
|---|---|
| 1X2 | Elo 27,6 % · Gradient Boosting 17,9 % · Random Forest 15,9 % · xG 15,3 % · Dixon-Coles 14,3 % · Poisson 4,9 % · Red neuronal 4,0 % |
| Over 2.5 | xG 30,2 % · Poisson 26,1 % · Dixon-Coles 14,5 % · Random Forest 11,1 % · Gradient Boosting 10,2 % · Red neuronal 7,8 % |
| BTTS | xG 35,4 % · Poisson 31,5 % · Dixon-Coles 11,1 % · Gradient Boosting 10,0 % · Random Forest 9,8 % · Red neuronal 2,2 % |

### Por competición (ensemble, 1X2)

| Competición | Partidos | Log loss | Acierto | Aporte |
|---|---|---|---|---|
| Eliteserien | 121 | 0,9807 | 55,4 % | +3,3 % |
| División Profesional (Bolivia) | 120 | 1,0191 | 55,0 % | +3,3 % |
| Allsvenskan | 131 | 1,0283 | 48,1 % | +2,9 % |
| Primera División (Chile) | 138 | 1,0332 | 47,1 % | +2,3 % |
| LigaPro Serie A | 202 | 1,0326 | 49,5 % | +1,3 % |
| Brasileirão | 220 | 1,0517 | 48,6 % | +0,2 % |
| MLS | 306 | 1,0789 | 43,8 % | −0,3 % |
| Primera División (Argentina) | 67 | 1,0933 | 37,3 % | −2,3 % |

### Qué se aprende de esto

- **El ensemble gana, pero por poquísimo** sobre el gradient boosting (1,0397 frente a 1,0412). No es un
  modelo mágico: es un seguro contra que el mejor de hoy no sea el mejor mañana.
- **Los cinco primeros están empatados dentro del ruido** (1,0397–1,0427 en 917 partidos). Con este
  histórico, afirmar que uno es mejor que otro por tres milésimas no se sostiene; lo que sí se sostiene es
  que los cinco aportan sobre la frecuencia base y que la red neuronal no.
- **El Elo es el que más veces acierta el resultado (48,0 %)** y solo mira resultados. Es el más barato y
  el que más peso se lleva en 1X2.
- **Dixon-Coles manda en goles** (Over 2.5 y BTTS), que es justo para lo que se diseñó.
- **La red neuronal es la peor de las siete**, y no por poco. Con una sola temporada no tiene con qué
  aprender; se queda en la tabla y su peso lo refleja.
- **En BTTS ningún modelo bate a la frecuencia base en log loss.** Aciertan más veces (hasta el 59,7 %),
  pero sus probabilidades no están mejor puestas que decir siempre lo mismo. Es el mercado donde el motor,
  hoy, no aporta.
- **Hay competiciones donde no aporta nada**: MLS y Argentina salen en negativo. La MLS son 306 partidos,
  así que no es casualidad.

## 7. Cómo entra en las proyecciones y en los picks

Desde el 20/09/2026 el motor **alimenta las proyecciones**, y con ellas todo lo que cuelga de ellas:
mercados, pick del modelo, tickets y evaluador.

### Qué sale mejor, medido

Comparación cara a cara sobre **1.628 partidos**, con los dos motores en walk-forward (cada partido
predicho solo con lo anterior):

| Fuente | Log loss | Brier | Acierto | ECE | Aporte |
|---|---|---|---|---|---|
| **Mixto (70 % libro + 30 % modelos)** | **1,0416** | 0,6261 | **47,6 %** | 1,1 % | **+2,7 %** |
| Mezcla 50/50 | 1,0420 | 0,6263 | 47,5 % | 1,2 % | +2,6 % |
| Solo el libro | 1,0434 | 0,6275 | 47,1 % | 1,0 % | +2,5 % |
| Mezcla 30/70 | 1,0437 | 0,6273 | 47,1 % | 1,1 % | +2,5 % |
| Solo el ensemble | 1,0486 | 0,6306 | 46,7 % | 0,9 % | +2,0 % |

Diferencias pareadas de log loss frente al libro (negativo = mejor):

| | Diferencia | Veredicto |
|---|---|---|
| Mixto 70/30 | −0,0018 ± 0,0014 | empate dentro del ruido, con el punto a favor |
| Mezcla 50/50 | −0,0014 ± 0,0022 | empate dentro del ruido |
| Solo el ensemble | +0,0051 ± 0,0044 | empate dentro del ruido, con el punto en contra |

**Lo que dice esto, sin adornos:** con una temporada de datos, **ninguna fuente gana de forma
concluyente**. Sustituir el libro por el ensemble a secas habría sido un empeoramiento (pequeño y no
significativo, pero medido). La mezcla 70/30 es la única que no pierde contra ninguna de las dos y la
que más acierta, así que es la que queda por defecto.

### Cómo se configura

En **Configuración → FUENTE_PROYECCION**:

| Valor | Qué manda |
|---|---|
| `mixto` (por defecto) | 70 % del modelo del libro + 30 % de la mezcla de los siete modelos |
| `libro` | El modelo de siempre, como antes del 20/09/2026 |
| `ensemble` | Solo los siete modelos |

Lo que **no** cambia en ningún caso, porque el motor no lo modela: corners, tarjetas, tiros y el reparto
de goles por partes siguen saliendo del libro. Un partido **sin predicción** (equipo sin historial,
competición sin datos) se queda con el libro entero, y la proyección lo dice en `source`.

**Cómo se calculan las predicciones.** Entrenar los siete modelos tarda segundos, así que no puede pasar
dentro del recálculo, que corre en cada cambio. Se hace aparte:

- botón **«Calcular con los modelos»** en Proyecciones, o
- automáticamente al terminar **«Actualizar partidos»**.

El resultado se guarda con la aplicación. Si luego entran partidos nuevos, la franja de Proyecciones
avisa de que las predicciones se quedaron viejas y con cuántos partidos se calcularon.

**El desglose del modelo sigue enseñándose**, pero la ficha dice que esa tabla es la del libro y cuánto
pesa: una tabla cuyo total no cuadra con la λ de arriba, sin avisar, sería peor que no enseñarla.

---

## 8. Rendimiento

Medido el **10/10/2026** sobre esta base (9.845 partidos, 32 competiciones) en el equipo del proyecto, un
Celeron N4020 de dos núcleos a 1,1 GHz. Con otra máquina los segundos cambian; las proporciones, no.

**El entrenamiento corre en un Web Worker** (`src/workers/`), no en el hilo de la interfaz. Mientras
entrena se puede escribir en los filtros, ordenar la tabla y cambiar de pantalla. El worker **guarda el
motor entrenado** con la clave de los datos, así que la ficha de un partido reutiliza el entrenamiento
del lote de Proyecciones en vez de repetirlo.

### Entrenar una vez con todo el histórico

| | antes | ahora |
|---|---|---|
| Gradient Boosting | 107,3 s | 7,1 s |
| Random Forest | 39,8 s | 6,9 s |
| Red neuronal | 35,8 s | 14,9 s |
| Elo | 1,09 s | 0,35 s |
| Dixon-Coles | 0,54 s | 0,44 s |
| Poisson + xG | 0,06 s | 0,05 s |
| `buildDataset` | 0,34 s | 0,24 s |
| **`trainEngine` completo** | **263,7 s** | **29,2 s** |
| Predecir 515 pendientes | 2,17 s | 0,49 s |

### Backtest

`npm run medir-entrenamiento` (`MODO=backtest`) lo mide y, sobre todo, imprime una **HUELLA**: un hash de
todas las probabilidades de todos los partidos con 17 cifras significativas. Dos versiones del código que
dan la misma huella dan exactamente los mismos números, no números parecidos. Es lo que se usó para
comprobar que las optimizaciones del 10/10/2026 no movían el modelo: sobre 2.500 partidos y 7 reentrenos,
**57,8 s → 18,4 s con la misma huella `6f911ce9`**.

### De dónde salió el 9x

Ninguna de estas optimizaciones toca el modelo: ni quita datos, ni quita variables, ni cambia una
fórmula. Son la misma aritmética en el mismo orden, hecha menos veces.

1. **Lo invariante, fuera del bucle.** `fit1X2` recalculaba el logaritmo de cada probabilidad en sus 400
   iteraciones, y `fitBinary` el logit; `fitDrawCurve` repetía una potencia y una exponencial por cada
   una de las 675 curvas de su rejilla. Nada de eso depende de lo que se está ajustando.
2. **Datos por columnas.** Los tramos del histograma (`Binned.bins`) iban por filas, así que buscar el
   corte de una variable salía y entraba de la caché 41 veces por fila. Ahora van por variable.
3. **Tablas planas en vez de arrays de arrays.** Las etiquetas de los árboles, los logits del boosting y
   las muestras de `fitWeights` eran miles de objetos pequeños; ahora son un `Float64Array` cada uno.
4. **Trabajo compartido dentro de un corte.** Tres modelos pedían el mismo dataset codificado y dos los
   mismos tramos; Poisson y xG calculaban las mismas fuerzas por goles. Ahora se calcula una vez
   (`TrainingContext.cache`).
5. **La red, con las entradas ya tipificadas.** `(x - media) / desviación` se recalculaba una vez por
   neurona, doce veces por variable y pasada.

### Cómo escala

`trainEngine` es **lineal** en el número de partidos: con 50.000 serían del orden de 150 s en esta
máquina, en el worker y sin bloquear nada.

El backtest **no**: reentrena cada 21 días, así que el número de cortes crece con los años de histórico
a la vez que el coste de cada uno crece con los partidos. Es cuadrático. Cuando empiece a doler, las
dos palancas, por este orden:

- **Repartir los cortes entre varios núcleos.** El entrenamiento de un corte no depende de los demás:
  solo la calibración es secuencial, y es barata. Aquí no se ha hecho porque esta máquina tiene dos
  núcleos y el segundo lo necesita la interfaz; en una de ocho el backtest bajaría otras seis o siete
  veces sin tocar un solo número.
- **Guardar los cortes entre ejecuciones.** Un corte depende solo de los partidos anteriores a su fecha,
  así que al añadir una jornada todos los cortes viejos dan exactamente lo mismo. Con esa caché, volver
  a medir tras una jornada costaría un corte en vez de sesenta. No está hecho.

**Lo que NO es una palanca: `refitDays`.** Reentrenar cada 42 días en vez de 21 parte el tiempo por
tres (68,1 s → 19,4 s sobre 2.500 partidos), pero **empeora el modelo**: la log loss del ensemble sube
de 1,0495 a 1,0587 y su ECE de 0,0143 a 0,0243. Medido el 10/10/2026 con `MODO=backtest REFIT=42`. Se
deja en 21.

---

## 9. Límites, dichos aquí

1. **Una sola temporada.** Es la limitación que más pesa, sobre todo para la red neuronal.
2. **Sin lesiones, alineaciones ni sanciones.** No hay fuente.
3. **Sin cuotas históricas**: esto mide acierto y calibración, no rentabilidad.
4. **Las primeras jornadas no se predicen**: 1.310 de 2.907 partidos quedan fuera por falta de historia.
5. **Dixon-Coles no llega a todas las competiciones**: necesita 60 partidos por liga y en el primer corte
   20 de 32 no los tenían.
6. **Los modelos de aprendizaje automático tardan en poder entrenarse**: necesitan 300 filas útiles, que
   en esta base no existen hasta el tercer corte.
7. **El ensemble hereda la cobertura de sus modelos**: en un partido al que solo responde Poisson, el
   ensemble *es* Poisson. Por eso la tabla «cara a cara» es la comparación justa.
8. **Fallo corregido el 20/09/2026**: la contracción bayesiana de Poisson y xG recibía la media de la
   liga y el número de partidos en orden cambiado, lo que inflaba las fuerzas y daba goles esperados
   absurdos (4,8–5,8 en un partido normal). Se vio mirando la ficha de un partido, no en los tests.
   Con el fallo, Poisson quedaba por debajo de la frecuencia base (−0,5 %); corregido, es el tercer
   modelo (+2,6 %). Las cifras de §6 son todas posteriores a la corrección, y ahora hay un test que
   comprueba que los goles esperados no se alejan de la media de la liga.
