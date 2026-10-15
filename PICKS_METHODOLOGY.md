# Picks, Kelly y simulación: metodología

Evaluación de picks, gestión de riesgo con Kelly, wallet **virtual**, tickets, métricas y backtesting.
Es una herramienta de análisis y simulación: **no usa dinero real ni promete ganancias**.

Todo el cálculo vive en `src/domain/betting/` (TypeScript puro, sin React) y está cubierto por pruebas.

---

## 1. Qué es dato, qué es estimación y qué es simulación

| Tipo | Ejemplos | De dónde sale |
|---|---|---|
| **Dato real** | Marcadores, corners, tarjetas, fechas | Fuentes oficiales o secundarias registradas (ver README) |
| **Estimación del modelo** | Probabilidades, goles/corners esperados, rango probable, confianza | El modelo del libro (MODEL_MAPPING.md) + lo descrito aquí |
| **Introducido por ti** | Cuotas | No hay un proveedor de cuotas verificado: ninguna cuota se rellena sola |
| **Simulación** | Stakes, saldo, retornos, métricas de rendimiento | Moneda interna (SportCoins por defecto), sin valor real |

La interfaz lo recuerda donde importa: ficha del partido, evaluador y bankroll.

---

## 2. Probabilidad de cada mercado (`markets.ts`)

No se añade ninguna probabilidad ajena al modelo existente: todos los mercados salen de las λ de goles, del
1X2 o de los conteos esperados de la proyección.

| Mercado | Probabilidad |
|---|---|
| 1 / X / 2 | `probs1x2` de la proyección: matriz de marcadores Poisson con λ_L y λ_V (por defecto) o logística + decaimiento del empate del libro (DIFF-11) |
| Doble oportunidad | 1X = P(1)+P(X) · X2 = P(X)+P(2) · 12 = P(1)+P(2) |
| Over/Under goles X.5 | Poisson sobre λ_L + λ_V |
| Over/Under goles asiático (1.0, 2.0, 3.0, 4.0) | Poisson sobre λ_L + λ_V; con el total justo en la línea se devuelve el stake |
| Ambos marcan | 1 − e^(−λ_L) − e^(−λ_V) + e^(−λ_L−λ_V) |
| Empate no válido | Hándicap asiático 0: gana P(1) / (P(1) + P(2)); el empate devuelve el stake |
| Hándicap asiático (−2.5 a +2.5, líneas .5 y enteras) | Distribución de la diferencia de goles (abajo) |
| Hándicap europeo (−3 a +3, entero, tres resultados) | La misma distribución de la diferencia de goles |
| Goles por equipo X.5 | Poisson sobre la λ de ese equipo |
| Over/Under goles de la 1.ª o 2.ª parte (0.5, 1.5, 2.5) | Poisson sobre (λ_L + λ_V) × proporción de la liga en esa parte (abajo) |
| Portería a cero | e^(−λ del rival) |
| Over/Under corners X.5 | Corners esperados del modelo con **binomial negativa** |
| Over/Under tarjetas X.5 | Amarillas esperadas del modelo con **binomial negativa** |
| Over/Under tiros X.5 | Tiros esperados del modelo con **binomial negativa** |
| Over/Under tiros a puerta X.5 | Tiros a puerta esperados del modelo con **binomial negativa** |
| Corners, tarjetas, tiros o tiros a puerta **de un equipo** X.5 | El valor esperado de ESE equipo con la **dispersión por equipo** de la liga |

**Añadido el 14/10/2026: tiros, tiros a puerta y los cuatro conteos por equipo.** La proyección ya
calculaba `expectedShots*` y `expectedSot*`, y también el valor esperado de cada lado, así que lo único
que faltaba era su dispersión y el mercado. Dos decisiones, las dos medidas sobre los 26.921 partidos de
la base:

- **La dispersión de un equipo no es la del total** y se mide aparte (`teamDispersionKey`). En corners,
  φ = 1,19 en el total y 1,65 por equipo; en tiros, 1,42 y 2,18. Usar la del total habría dado
  probabilidades demasiado estrechas, que es justo el error que la binomial negativa viene a evitar.
- **El umbral de ceros también es propio.** Que un partido tenga 0 corners delata a la fuente; que un
  EQUIPO no vea una amarilla es corriente (pasa en el 10,6 % de los casos), así que ahí el umbral sube a
  0,35 o el mercado no se evaluaría nunca.

Las líneas de cada mercado salen de los percentiles 10–90 de esa misma medición, no de una impresión.

**Medido** con el backtest de `/historial` sobre 20.885 partidos de 32 ligas y 662.945 predicciones
(14/10/2026). Los diez mercados nuevos dan **skill positivo**, y seis baten a todos los de goles:

| mercado | skill | ECE |
|---|---|---|
| Local: Over 12.5 tiros | +0,0976 | 0,0349 |
| Visitante: Over 12.5 tiros | +0,0828 | 0,0173 |
| Local: Over 4.5 tiros a puerta | +0,0678 | 0,0187 |
| Over 26.5 tiros | +0,0542 | 0,0155 |
| Over 24.5 tiros | +0,0528 | 0,0188 |
| Local: Over 1.5 tarjetas | +0,0431 | 0,0223 |
| Local / Visitante: Over 4.5 corners | +0,0334 / +0,0305 | 0,0206 / 0,0153 |
| Over 8.5 / 7.5 tiros a puerta | +0,0226 / +0,0160 | 0,0310 / 0,0313 |

Y un resultado que conviene tener a la vista: **los corners por equipo (+0,033) van mucho mejor que los
corners totales (−0,004), que llevan publicados desde el principio.** Los tres totales de corners y el
BTTS son los únicos mercados con skill negativo de los 32.

**Añadido (corners y tarjetas).** El libro solo publica el valor esperado. Para pasar a probabilidades se
usa una binomial negativa con el índice de dispersión de la liga, φ = varianza / media de los totales por
partido: `Var(X) = φ·μ` ⇒ tamaño `r = μ / (φ − 1)`; con φ ≤ 1, Poisson. Motivo: en las ligas la varianza
supera a la media y Poisson estrecharía las colas, inventando edges lejos de la media. La dispersión de
liga incluye también la diferencia entre partidos, así que sobreestima algo la varianza: el error va hacia
probabilidades menos extremas, no hacia edges falsos.

**Tarjetas = amarillas**, que es lo que registran los datos. Una casa puede contar las rojas (o puntos de
tarjeta): compruébalo antes de comparar la cuota.

### Añadido (14/09/2026): hándicaps y empate no válido (`goalDifference.ts`)

Un hándicap depende de la diferencia de goles D = goles del local − goles del visitante. El modelo ya da
quién gana (el 1X2) pero no por cuánto. Se reparte así:

```
P(D = k) = P(1) · S(k) / S(D > 0)     k > 0
P(D = 0) = P(X)
P(D = k) = P(2) · S(k) / S(D < 0)     k < 0
```

con S la diferencia de dos Poisson independientes con las λ de la proyección (la misma hipótesis que ya
usan goles y BTTS). Así el **signo** sale del 1X2 del modelo y el **tamaño** del margen, de Poisson.

Por qué no Poisson a secas: con el 1X2 logístico del libro, su P(D > 0) no coincide con P(1). El hándicap −0.5
del local ES «gana el local»; con Poisson puro tendría otra probabilidad que el 1X2 y la interfaz mostraría dos
precios para el mismo evento, un edge inventado entre mercados idénticos. Con este reparto, hándicap −0.5 = P(1),
+0.5 = 1X, empate no válido = P(1) / (P(1) + P(2)), exactamente. El supuesto nuevo (la forma del margen) no está
validado: por eso los hándicaps suman riesgo de modelo (§7) y entran en el backtest (§9). Con el 1X2 de Poisson,
por defecto desde el 18/09/2026 (DIFF-11), los dos repartos coinciden y esto es Poisson a secas.

### Añadido (18/09/2026): goles por parte (DIFF-10)

Con el resultado al descanso publicado en el 100 % de los 2.804 partidos jugados (medido el 18/09/2026), el
modelo reparte sus goles esperados entre las dos partes:

```
proporción de la liga = (goles 1.ª parte + m · 0,447) / (goles + m)      m = 2.000 goles
λ 1.ª parte = (λ_L + λ_V) · proporción        λ 2.ª parte = (λ_L + λ_V) · (1 − proporción)
P(Over X.5 en una parte) = Poisson sobre su λ
```

- **0,447** es la proporción global: 3.585 de 8.020 goles llegaron en la 1.ª parte, en 31 competiciones.
- **La contracción es fuerte a propósito.** Las ligas van del 35,6 % (Bundesliga, 104 goles) al 55,3 % (Europa
  League, 47 goles). Descontada la varianza binomial, la diferencia real entre ligas es de ~1 punto (τ ≈ 0,011),
  así que casi todo lo que se ve es ruido de muestra. m = p(1 − p)/τ² da ≈ 2.150 goles ponderando por goles y
  ≈ 1.360 sin ponderar; se redondea a 2.000. Una liga necesita miles de goles para separarse de la global.
- **Sin 20 partidos con descanso en la liga** (`MIN_HALF_TIME_MATCHES`) no hay λ por parte: sin probabilidad.
- **Supuestos:** cada partido reparte sus goles como su liga, y las dos partes son Poisson independientes. En la
  muestra encaja (Over 0.5 / 1.5 de cada parte, real frente a modelo, a 0–2 puntos, 15/09/2026). Suma +5 al
  riesgo de modelo (§7).
- **Liquidación con el descanso:** 2.ª parte = goles del final − goles del descanso. Sin descanso publicado, o
  con uno mayor que el final, no se liquida (`sin-datos`), igual que corners y tarjetas.
- **Correlación:** misma parte, por líneas (Over 1.5 y Under 1.5 de la 1.ª parte son excluyentes); alta con
  los mercados de goles del partido; media con el resultado; baja entre las dos partes. Dos selecciones de la
  misma parte tienen probabilidad conjunta exacta sobre su Poisson.

**Backtest walk-forward del 18/09/2026** (1.267 partidos, cada uno proyectado solo con los anteriores), con el modelo
de ese día ya mejorado (MODEL_MAPPING.md DIFF-11 a DIFF-13):

| Mercado | Modelo | Real | Skill | ECE |
|---|---|---|---|---|
| Over 0.5 1.ª parte | 70,7 % | 75,0 % | +0,4 % | 4,3 pp |
| Over 1.5 1.ª parte | 35,6 % | 37,5 % | +1,4 % | 2,8 pp |
| Over 0.5 2.ª parte | 77,9 % | 80,8 % | −2,3 % | 4,2 pp |
| Over 1.5 2.ª parte | 45,4 % | 46,5 % | +0,7 % | 3,9 pp |
| *Over 1.5 partido (referencia)* | *75,5 %* | *79,5 %* | *+0,7 %* | *4,0 pp* |
| *Over 2.5 partido (referencia)* | *52,3 %* | *56,3 %* | *+1,2 %* | *4,3 pp* |

Las partes heredan la precisión del modelo de goles: la misma infraestimación de 1–4 puntos y un skill
cerca de 0 frente a la frecuencia de la liga. El reparto por partes no añade error visible. Con skill
negativo en el último backtest, el pick del modelo descarta el mercado (criterio 3).

### Líneas enteras: devolución del stake

En una línea entera el resultado puede quedar justo en la línea (Over 2.0 con 2 goles; Local −1 ganando por 1;
empate no válido con empate). Entonces **se devuelve el stake**: la liquidación lo registra como `anulado` y
el movimiento es un reembolso. Para estas selecciones:

- `probability` = P(gana) / (P(gana) + P(pierde)), la probabilidad de ganar sin contar la devolución, que es
  la que paga la cuota; `push` = P(devolución). La interfaz enseña las tres: gana, se devuelve, pierde.
- Edge, cuota justa, cuota mínima y Kelly se calculan con esa probabilidad (§3 y §4).
- El backtest no cuenta las devoluciones: no son acierto ni fallo.
- **No se admiten en tickets** (§5).

No hay **cuartos de línea** (x.25, x.75): se liquidan a medias (medio stake gana y medio se devuelve) y
necesitarían otro estado de apuesta y otro Kelly. Se rechazan al leer la selección.

### Qué no se ofrece y por qué

| Mercado | Qué falta |
|---|---|
| Resultado al descanso / descanso-final | Hay λ por parte (arriba), pero falta validar un 1X2 por partes con el marcador al descanso |
| Goles de un equipo en una parte | La proporción se mide para el total del partido, no por equipo |
| Primer equipo en marcar, minuto del gol | Los datos no tienen el minuto de los goles: no se podría liquidar |
| Combinaciones del mismo partido entre variables (gana local + Over 2.5, goles + corners) | El modelo no mide su dependencia: se muestra el rango de Fréchet, no una probabilidad (§5) |
| Cuartos de línea asiáticos | Liquidación a medias (arriba) |

### Datos insuficientes

Un mercado no se evalúa (sin probabilidad, sin stake) si:

- cada equipo tiene menos partidos que la **muestra mínima** en su condición (local en casa, visitante
  fuera; por defecto 3). En corners y tarjetas cuentan solo los partidos con el dato publicado;
- la liga no proyecta la estadística;
- la liga tiene menos de **20 partidos** con el dato (no se puede medir su dispersión);
- **datos inconsistentes**: más del 5 % de partidos con 0 corners o más del 10 % con 0 tarjetas. Un 0 así es
  rarísimo en un partido real; muchos seguidos significan que la fuente publica 0 cuando no registra.
  Medido el 13/09/2026: Bolivia, Chile, Paraguay, Colombia y FUTVE tienen 0 tarjetas en el 100 % de sus
  partidos, Brasil en el 90 % y LigaPro en el 71 %. El dato guardado no se toca: solo no se usa para picks;
- en los hándicaps, un equipo con 0 goles esperados (no hay margen que repartir).

### Calidad y confianza

- **Calidad**: alta (≥ 10 partidos de cada equipo y el dato en ≥ 90 %), media (≥ 5 y ≥ 60 %), baja, o
  insuficiente.
- **Confianza 0–10** = `10 · evidencia · cobertura`. Desde el 27/09/2026 la `n` de cada equipo son sus partidos
  de esta temporada **más la mitad de los de temporadas anteriores** (`PESO_HISTORICO_CONFIANZA` = 0,5), porque
  la estimación también los usa (MODEL_MAPPING.md DIFF-14): antes, con 4 jornadas jugadas, ningún partido
  llegaba al mínimo de 7,5 por mucho histórico que hubiera. La muestra que se **enseña** sigue siendo la de
  esta temporada, con el histórico al lado. Con `PRIOR = liga` no cuenta, porque entonces la estimación tampoco
  lo usa. Evidencia = media de `n / (n + 5)` de los dos
  equipos (`CONFIDENCE_K` = 5, el K_SHRINK del libro, aunque el modelo contraiga con 10 desde el 18/09/2026: la
  confianza mide la muestra, no la contracción). Mide cuánta muestra respalda la estimación, **no** la
  probabilidad de acertar. No llega a 10.
- **Rango probable**: percentiles 10 y 90 de la distribución del modelo.

### Cambio de metodología asociado: promedios por muestra (DIFF-07)

El libro divide los promedios de corners/tarjetas/tiros entre PJ. Con cobertura parcial eso hunde la
proyección (con un 87 % de cobertura, 10 corners pasan a 8,75: P(Over 9.5) bajaría del 54 % al 36 %). Para
picks sería un edge falso sistemático hacia el Under. Nuevo parámetro `PROMEDIO_STATS`:

- `muestra` (por defecto): cada promedio se divide entre los partidos con el dato, y la contracción usa esos
  partidos como evidencia.
- `excel`: ÷ PJ, como el libro. La validación contra el Excel se ejecuta en este modo.

En ligas con cobertura completa no cambia nada. Configuración → Modelo.

### Pick del modelo (`modelPick.ts`, 16/09/2026)

En Proyecciones (tabla, análisis rápido y ficha del partido) y en el evaluador, cada partido muestra un **pick del
modelo** o «Sin selección recomendada». Lo elige la plataforma **sin cuotas** y con criterios medibles. No cambia ninguna
probabilidad del modelo: usa las mismas estimaciones de este apartado.

**Referencia sin cuotas.** La plataforma no recibe las cuotas de ninguna casa. En su lugar, cada mercado se compara con la
**frecuencia con la que se ha dado en los partidos jugados de su liga** (sin adjudicados y, en corners y tarjetas, solo
con el dato publicado). La **ventaja** es la probabilidad del modelo menos esa frecuencia: cuánto se sale este partido de lo
habitual en su competición. No es el edge frente a una cuota. El pick dice además su cuota justa y desde qué cuota tendría
el edge mínimo del perfil (§3): sin la cuota de la casa, el valor no se puede asegurar.

**Mercados que compiten** (56): 1X2, doble oportunidad, goles Over/Under 0.5–4.5, goles de cada parte Over/Under
0.5–1.5, ambos marcan, goles por equipo Over/Under 0.5–2.5, corners Over/Under 7.5–11.5 y tarjetas Over/Under 2.5–5.5. Quedan fuera las líneas enteras, que
pueden devolver el stake, y los hándicaps: los ±0.5 repiten el 1X2 y la doble oportunidad, y el resto añade un supuesto
sin validar sobre el tamaño del margen (arriba).

**Criterios mínimos**, en este orden. El primero que falla es el motivo; sin pick, se resumen por motivo:

1. Probabilidad estimada, calidad de datos media o alta y confianza ≥ 7.5/10 (`MIN_CONFIDENCE`: con `CONFIDENCE_K` = 5, unos
   15 partidos de cada equipo en su condición con el dato completo; un 8 pediría 40 jornadas, más de lo que dura una liga).
2. Probabilidad entre el **80 % y el 85 %** (`PICK_PROBABILITY`), y no menor que la mínima del perfil. Por debajo del
   80 % el pick no es lo bastante seguro. Por encima del 85 % la cuota justa baja de 1.18 y la de una casa, con su margen, casi nunca compensa.
3. Sin skill negativo en el último backtest del mercado (30 predicciones o más).
4. Al menos 20 partidos de la liga con el dato para medir su frecuencia (`MIN_LEAGUE_COUNT_SAMPLE`).
5. Ventaja sobre la liga ≥ el edge mínimo del perfil (2 pp por defecto).
6. Riesgo bajo o medio (§7), calculado a la cuota justa y con la ventaja sobre la liga como edge.

**Orden** entre los que cumplen: mayor **ventaja ajustada por confianza**; a igualdad, menor score de riesgo y después
mayor probabilidad.

```
ventaja          = p − frecuencia en la liga
ventaja ajustada = ventaja · confianza / 10
```

La confianza es 10 · evidencia · cobertura, con la evidencia de la contracción bayesiana del modelo (§2, «Calidad y
confianza»). Con poca muestra, la ventaja pesa menos: no gana un partido raro con tres jornadas jugadas.

**Justificación.** El pick dice su probabilidad y la frecuencia en la liga, que es la mayor ventaja ajustada de los que
cumplen, su confianza, calidad y riesgo, la cuota justa, desde qué cuota tiene valor y la siguiente opción. Sin pick, dice
cuántos mercados cayeron por cada motivo.

**Límites.**
- La frecuencia de la liga no es la cuota de una casa, que ya descuenta lo que sabe de los dos equipos. Un pick con ventaja
  sobre la liga puede no tener valor frente a la cuota real: compruébalo en el evaluador.
- Los mercados de un mismo partido no son independientes.
- Los umbrales (50–85 %, confianza 5, riesgo alto fuera) son fijos. El edge mínimo, la probabilidad mínima y la muestra
  mínima salen del perfil.

---

## 3. Cuotas (`odds.ts`)

```
probabilidad implícita = 1 / cuota
cuota justa            = 1 / p
edge                   = p − 1 / cuota                 (puntos porcentuales)
valor esperado         = (1 − push) · (p · cuota − 1)  (por unidad apostada)
cuota mínima aceptable = 1 / (p − edge mínimo)
```

Sin devolución posible, push = 0 y el valor esperado es el de siempre, p · cuota − 1. Con devolución, p es la
probabilidad de ganar sin contarla (§2): con devolución ni se gana ni se pierde, así que el valor esperado se
multiplica por la probabilidad de que no la haya.

Cuota válida: número finito, > 1 y ≤ 1000. Estados: **Valor potencial** (edge ≥ mínimo), **Sin valor**,
**Datos insuficientes**. La implícita incluye el margen de la casa, que no se puede quitar sin las cuotas
del resto del mercado.

Un pick con alta probabilidad no es un buen pick si la cuota no la paga: se evalúa siempre probabilidad +
cuota + riesgo.

---

## 4. Kelly y límites (`kelly.ts`)

```
f* = (b·p − q) / b      b = cuota − 1, q = 1 − p
```

Ejemplo: cuota 2.00 y p = 55 % → f* = (0,55 − 0,45) / 1 = **10 %**.

Con devolución posible (p_g gana, p_d devuelve, p_p pierde), maximizar `p_g·ln(1 + b·f) + p_p·ln(1 − f)` da
`f* = (b·p_g − p_p) / (b·(p_g + p_p))`, que es exactamente la fórmula de arriba con p = p_g / (p_g + p_p). Por
eso a Kelly le basta la probabilidad sin contar la devolución.

Orden de la recomendación:

1. Cuota no válida → **bloqueado**.
2. Sin probabilidad o datos insuficientes → **datos insuficientes**.
3. p = 100 % → **bloqueado** (ningún modelo estadístico asegura un resultado).
4. Pick idéntico pendiente o excluyente con uno pendiente (p. ej. «gana local» y «gana visitante», o «gana
   local» y «hándicap asiático local −0.5», que es el mismo evento) → **bloqueado**.
5. f* ≤ 0 o edge < mínimo → **sin valor estadístico suficiente**, stake 0. Nunca un stake negativo.
6. p < probabilidad mínima (25 %) o cuota > máxima (10) → **bloqueado**.
7. Bankroll o saldo a 0 → **bloqueado**.
8. Kelly aplicado = f* × fracción × correlación. Fracción: **Half 0,5** (recomendado), **Quarter 0,25**
   (conservador) o personalizada ≤ 0,5. **Kelly completo solo se muestra.** Correlación con un pick
   pendiente del mismo partido: alta × 0,5, media × 0,75.
9. Stake = mínimo de: Kelly aplicado · bankroll, stake máximo por pick (5 %), tope absoluto, lo que queda de
   exposición diaria (15 %), por partido (5 %) y por competición (20 %), y el saldo disponible. Se redondea
   hacia abajo a 0.01 monedas. La interfaz dice qué límite ha mandado.
   **Stake mínimo 1 moneda**: si los topes dejan menos → **bloqueado**; si solo la fracción de Kelly da menos
   → se sube a 1 moneda cuando Kelly completo y los topes lo cubren; si ni Kelly completo llega → sin stake (§6).
10. Máximo registrable = mínimo de Kelly **completo** y los mismos topes: se puede bajar o subir el stake,
    nunca por encima.

Bankroll = disponible + comprometido. La exposición diaria agrupa por fecha del partido. Un ticket cuenta
su stake entero en cada partido, competición y día que toca.

---

## 5. Tickets (`tickets.ts`)

- **Cuota combinada** = producto de cuotas, o la que ofrezca la casa (en combinadas del mismo partido suele
  ser distinta: se avisa).
- **Probabilidad combinada**, sin multiplicar a ciegas:
  - partidos distintos: producto (supuesto de independencia, indicado);
  - mismo partido y misma variable: **conjunta exacta** con la misma distribución que dio las individuales:
    goles, BTTS, goles por equipo y portería a cero sobre la matriz de marcadores Poisson; 1X2, doble
    oportunidad y hándicaps sobre la distribución de la diferencia de goles (§2); corners, tarjetas o goles de
    una misma parte sobre el intervalo de su distribución;
  - mismo partido y variables distintas (resultado y goles, goles y corners): el modelo no mide su
    dependencia. **No es estimable**; se dan las cotas de Fréchet, válidas para cualquier dependencia:
    `máx(0, pA + pB − 1) ≤ P ≤ mín(pA, pB)`.
- P(falla al menos una) = 1 − P(todas).
- **Kelly del ticket** = Kelly con la cuota combinada y la conjunta; si solo hay cotas, con la cota inferior
  (conservador) cuando esta ya da valor; si no, no corresponde.
- Selecciones repetidas o incompatibles → ticket no válido. Ticket idéntico pendiente → bloqueado.
- **Selecciones que pueden devolver el stake** (líneas enteras de goles y del hándicap asiático, empate no
  válido) → ticket no válido. Una devolución cambia a la vez la cuota del ticket y su probabilidad; no se
  simula hasta modelarlo. Las líneas .5 y el hándicap europeo sí se combinan.
- Liquidación: una perdida lo pierde; una anulada sale de la cuota; todas anuladas → reembolso.
- Avisos de concentración: 4+ selecciones, cuota ≥ 6, P(falla) ≥ 75 %, 3+ selecciones de una competición.

**Correlación entre dos selecciones del mismo partido.** Una sola regla de liquidación por marcador
(`outcomeOnScore`) decide la liquidación real, la correlación y las conjuntas, así no pueden contradecirse:

- **idéntica** si se liquidan igual con todos los marcadores (gana local = hándicap asiático local −0.5;
  hándicap asiático local −1.5 = hándicap europeo local −1 con «1»; portería a cero local = Under 0.5 del
  visitante);
- **excluyente** si ningún marcador las hace ganar a la vez;
- **alta** si dependen de la misma variable, **media** entre resultado y goles, **baja** con corners o tarjetas.

Cambio respecto a la regla anterior (14/09/2026): antes una pareja de goles solo era excluyente si eran la
misma línea en lados opuestos o BTTS sí/no; «Under 1.5 goles» con «Ambos marcan: sí» salía **alta** aunque no
pueden ganar a la vez. Ahora sale **excluyente**. Las demás parejas que ya existían dan el mismo nivel que antes.

---

## 6. Wallet virtual (`wallet.ts`)

Un libro de movimientos. El saldo **no se guarda**: disponible = suma de movimientos del ciclo, así no se
puede descuadrar.

| Movimiento | Importe |
|---|---|
| inicial / reinicio | + saldo inicial |
| depósito | + importe |
| stake | − stake |
| retorno (ganado) | + stake × cuota, redondeado a 0.01 monedas |
| pérdida | 0 (deja rastro) |
| reembolso (anulado o devolución de una línea entera) | + stake |

Ejemplo: 30 monedas, stake 1 moneda a 1.90 → gana: +0.9 netas, 30.9 · pierde: 29.

**Monedas.** Los importes se leen y se escriben en monedas: 1 moneda = 30.000 SC por defecto (Bankroll →
Gestión de riesgo → «Valor de 1 moneda»). Stakes, ganancias, pérdidas, saldos y movimientos se muestran en
monedas con su equivalencia en SC entre paréntesis, p. ej. «+0.9 monedas (+27 000 SC)». Todo se guarda en SC
(`coins.ts`), pero desde el 13/09/2026 **el importe mínimo es 0.01 monedas** (300 SC con el valor por defecto),
como el céntimo de una moneda real:

- Depósitos, stake escrito, saldo inicial y tope absoluto por pick se escriben en monedas con 2 decimales como
  mucho; con más, se rechazan. El saldo inicial por defecto es 30 monedas.
- El stake recomendado (Kelly con topes) se redondea **hacia abajo** a 0.01 monedas, para no pasar nunca de
  Kelly ni de un tope.
- **Stake mínimo: 1 moneda** por pick o ticket (desde el 14/09/2026). Si los topes (stake máximo, tope absoluto,
  exposición diaria, por partido o por competición, o saldo) dejan menos de 1 moneda, el pick queda
  **bloqueado** y se dice cuánto margen queda: ningún tope se rompe para llegar al mínimo. Si solo la fracción
  de Kelly da menos de 1 moneda, el stake **se sube a 1 moneda** siempre que Kelly completo y los topes lo
  cubran (el stake queda entre la fracción elegida y Kelly completo, y lo indica); si ni Kelly completo llega a
  1 moneda, no se recomienda stake. Un stake escrito a mano por debajo de 1 moneda se rechaza. Los depósitos
  pueden ser menores.
- El retorno de un pick o ticket ganado (stake × cuota) se redondea a la centésima de moneda **más cercana**:
  0.37 monedas × 1.85 = 0.6845 → 0.68. La diferencia es como mucho de 0.005 monedas por liquidación. La
  simulación «si gana» usa el mismo redondeo.
- Las cifras se muestran con 2 decimales como mucho. Un importe que no es 0 pero redondea a 0 se muestra
  «<0.01 monedas».
- Los movimientos ya registrados no se reescriben: un depósito de 910 000 SC se sigue leyendo 30.33 monedas.
  El saldo inicial y el tope guardados antes se llevan a 0.01 monedas al cargarse (1 000 000 SC → 999 900 SC
  = 33.33 monedas).

Cambiar el valor de la moneda no cambia ningún saldo en SC. Al guardar, lo escrito en monedas (saldo inicial
y tope) se convierte con el valor de moneda del formulario.

El 13/09/2026 se vaciaron los tickets (registrados, borrador y sus movimientos) para empezar con las monedas:
migración v2 del almacenamiento (`withoutTickets`), que recalcula el saldo como si no hubieran existido.

Ese mismo día, a petición del usuario, su perfil (saldo inicial de 10 000 SC y depósitos virtuales de 910 000 y
80 000 SC) pasó a empezar con **33.33 monedas** (999 900 SC: lo más cercano a 1 000 000 SC con el mínimo de
0.01 monedas) y sin esos dos depósitos. `rebuildBalances` recalcula el saldo tras cada movimiento y, en cada
pick, el bankroll antes del stake, su % sobre él y el bankroll tras liquidarse. Stakes, cuotas, resultados y
explicaciones de los picks no cambian. El capital aportado del ciclo pasa a ser solo el saldo inicial, así que
ROI y rentabilidad se calculan sobre 33.33 monedas.

**Incidente.** El primer intento fue una migración automática (v3) escrita en dos ediciones. La app, abierta,
recargó en caliente la versión intermedia; la migración falló y el almacén guardó el perfil vacío de arranque
encima de los datos. La última versión buena se recuperó del registro de IndexedDB de Chrome, el ajuste se
aplicó sobre esa copia y se carga con «Importar copia». Desde entonces el almacén no escribe nada hasta haber
leído bien lo guardado (`lecturaCorrecta` en `useBetting.ts`): un error de lectura muestra un aviso y no borra
nada.

Cada pick guarda stake, cuota, retorno bruto, ganancia neta, resultado, fechas, partido, mercado,
probabilidad, Kelly usado, riesgo, explicación y bankroll antes y después. No hay saldo negativo: un stake
mayor que el disponible se rechaza. El reinicio abre un ciclo nuevo (con apuestas pendientes no se
permite) y conserva el historial. Unidad = 1 % del saldo inicial (configurable).

**Liquidación** (`settlement.ts`): solo con resultados reales de PARTIDOS, cada vez que cambian los datos.
El partido se busca por id, por id de proveedor o, si se aplazó y cambió la clave, por los mismos equipos
en ±21 días; con dos candidatos no se liquida. Cancelado → reembolso. Resultado justo en una línea entera →
reembolso. Sin la cifra que decide el mercado → sigue pendiente con el motivo. **No se puede marcar un
resultado a mano.** Anular a mano solo se permite cuando los datos no pueden liquidar (antes del partido,
aplazado, ambiguo, sin la cifra o 14 días sin resultado): con resultado disponible sería esquivar una pérdida.

**Perfiles**: cada perfil tiene su wallet, picks y configuración. Son perfiles locales del navegador, no
cuentas: no hay autenticación. Datos en SQLite (`data/analisis-futbol.sqlite`, tablas `betting_*`, desde el
15/09/2026; antes en IndexedDB, que se copia la primera vez y no se borra), con exportación e importación de
copia JSON validada.

---

## 7. Riesgo (`risk.ts`)

Score 0–100 = 25 % datos + 20 % modelo + 15 % mercado + 25 % varianza + 15 % correlación.

| Componente | Cálculo |
|---|---|
| Datos | 100 · (1 − evidencia · cobertura) |
| Modelo | edge < 3 pp: 15 · < 6: 30 · < 10: 50 · ≥ 10: 75 (un edge enorme suele ser error del modelo) + mercado: corners +15, tarjetas +25, **hándicaps +10** (supuesto de forma del margen sin validar), 1X2, doble y goles por parte +5, goles, BTTS, goles por equipo y portería a cero +0 + **25 si el último backtest dio skill negativo en ese mercado** |
| Mercado | implícita ≥ 60 %: 15 · ≥ 45: 30 · ≥ 30: 50 · ≥ 20: 70 · menos: 90 (+10 tarjetas) |
| Varianza | 100 · (1 − p) |
| Correlación | ninguna 0 · baja 15 · media 40 · alta 75 · excluyente/idéntica 100 |

Bajo < 40 ≤ medio < 65 ≤ alto. Reglas encima: tres componentes ≥ 60 → alto; calidad baja → al menos medio;
correlación alta → alto. En tickets: el peor componente de las selecciones, el mercado de la cuota
combinada, la varianza con la probabilidad conservadora y +3 por selección a partir de la tercera.

---

## 8. Métricas (`metrics.ts`)

| Métrica | Fórmula | Mínimo |
|---|---|---|
| % picks ganados / perdidos | sobre ganados + perdidos + anulados | 1 |
| % acierto | ganados / (ganados + perdidos) | 1 |
| Yield | beneficio neto / total apostado | 1 |
| ROI | beneficio neto / capital aportado (inicial + depósitos) | 1 |
| Profit factor | ganancias / pérdidas acumuladas | 1 de cada |
| Drawdown máximo | mayor caída del beneficio acumulado desde su máximo; % sobre el bankroll en ese máximo | 1 |
| Rentabilidad por unidad | beneficio / valor de la unidad | 1 |
| Brier | media de (p − resultado)² | 20 |
| Log loss | −media de [o·ln p + (1−o)·ln(1−p)] | 20 |
| **Eficacia vs cuota** | 1 − Brier(modelo) / Brier(implícita de la cuota), mismos picks | 20 |
| ECE (calibración) | Σ (n_tramo/N)·\|frecuencia − p media\|, tramos de 10 pp | 50 |
| Sharpe adaptado | media / desviación de (neto / stake) por pick, sin anualizar | 20 |

Por debajo del mínimo: **Datos insuficientes**, con n. El acierto no es rentabilidad: 70 % de acierto a
cuota 1.30 pierde dinero (probado en `metrics.test.ts`). Un ROI negativo se muestra negativo. Una devolución
es un anulado: no cuenta en acierto, yield ni Brier, que comparan con la probabilidad sin devolución.

La **eficacia** responde a la pregunta útil para apostar: ¿las probabilidades del modelo estuvieron más
cerca de lo que pasó que las de las cuotas? Positiva, sí; negativa, fiarse de la cuota habría sido mejor. Como
la implícita lleva el margen de la casa, la comparación favorece algo al modelo.

---

## 9. Backtest del modelo (`backtest.ts`)

Walk-forward: para cada fecha de cada liga el modelo se recalcula con los partidos anteriores y predice los
de ese día. Se evalúan 1X2, Over 1.5/2.5/3.5, Over 0.5/1.5 de cada parte, BTTS, hándicap asiático del local −1.5 / +1.5 y empate no válido
del local, Over 1.5 goles del local, Over 0.5 goles del visitante, portería a cero del local, corners
8.5/9.5/10.5 y tarjetas 3.5/4.5, con las mismas reglas de muestra y datos inconsistentes que los picks. Las
devoluciones no cuentan. Skill = 1 − Brier / Brier de predecir siempre la frecuencia observada.

Límites: usa los parámetros actuales (no los de cada fecha); no hay cuotas históricas, así que no mide
rentabilidad; los mercados del mismo partido no son independientes.

**Resultado medido el 13/09/2026** (libro base + Excel de las 19 ligas de `data/ligas`, muestra mínima 3):
1.524 partidos, 12.795 predicciones. Los mercados añadidos el 14/09/2026 aún no tienen medición guardada aquí:
ejecuta el backtest de todas las competiciones en Historial → Backtesting.

| Mercado | n | Skill | ECE |
|---|---|---|---|
| Gana local | 1.524 | +4,6 % | 3,5 pp |
| Empate | 1.524 | **−1,6 %** | 4,9 pp |
| Gana visitante | 1.524 | +4,5 % | 4,6 pp |
| Over 1.5 / 2.5 / 3.5 | 1.524 | +1,6 % / +2,5 % / +5,5 % | 4,5 / 5,5 / 1,9 pp |
| Ambos marcan | 1.524 | **−0,6 %** | 7,3 pp |
| Corners Over 8.5 / 9.5 / 10.5 | 709 | **−4,0 % / −4,6 % / −5,9 %** | 7,0 / 8,0 / 8,5 pp |

Lectura: el modelo aporta poco sobre la frecuencia base en goles y resultado, y **no aporta en empate, BTTS
ni corners**. Al ejecutar el backtest de todas las competiciones, esos mercados suben su riesgo de modelo.
Tarjetas: sin predicciones, porque las ligas con muestra suficiente publican ceros.

---

## 10. Qué falta para que sea realmente fiable

1. **Cuotas reales e históricas** de un proveedor con licencia verificada: sin ellas no hay backtest de
   rentabilidad ni se puede quitar el margen de la casa.
2. **Tarjetas reales** en las ligas sudamericanas (hoy la fuente publica 0) y **corners** en Eredivisie,
   Liga Portugal, Superliga, Süper Lig, Argentina y Uruguay.
3. **Más jornadas** en las ligas europeas (3–5 jugadas): casi todo sale «Datos insuficientes».
4. **Árbitro, alineaciones, lesiones y calendario**: el modelo no los ve y deciden tarjetas y resultados.
5. **Un modelo de corners con skill positivo**: el actual (solo fuerza base) no mejora a la frecuencia.
6. **Calibrar el empate**: el decaimiento del empate da skill negativo.
7. **Marcador al descanso y minuto de los goles** con cobertura medida por liga, para resultado al descanso y
   primer equipo en marcar (§2).
8. Un backend con cuentas reales y base de datos si varios usuarios van a usarlo.

## 11. Mejoras propuestas

- Recalibración de probabilidades (Platt/isotónica) con el backtest, por mercado y liga.
- Validar la forma del margen de los hándicaps contra la diferencia de goles real, por liga.
- Modelo de corners y tarjetas con forma, H2H y árbitro; conjunta goles–corners para tickets.
- Devoluciones y cuartos de línea en tickets, con Kelly de varios resultados.
- Kelly simultáneo para varios picks del mismo día en lugar de topes independientes.
- Cierre de línea (CLV) si se registran las cuotas de cierre.
- Ajuste de parámetros del modelo con validación cruzada temporal, no a mano. Primer paso hecho el 18/09/2026:
  K_SHRINK, 1X2 y término de xG elegidos en walk-forward (MODEL_MAPPING.md DIFF-11 a DIFF-13).
