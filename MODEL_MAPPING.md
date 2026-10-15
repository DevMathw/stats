# MODEL_MAPPING.md

Mapeo completo `Analisis_Futbol_2026-27_2.xlsx` → funciones TypeScript → pantallas React.

Este documento se escribió **antes** de programar la aplicación, leyendo las fórmulas reales
del libro (no la documentación del libro). Cuando la fórmula y la metodología escrita en
`CONFIGURACION` no coinciden, se documenta la diferencia en la sección
[Diferencias detectadas](#18-diferencias-detectadas-excel-vs-metodología-documentada).

---

## 1. Inventario del libro

| # | Hoja | Filas útiles | Naturaleza | Destino en la app |
|---|------|--------------|------------|-------------------|
| 1 | DASHBOARD | 106 | **Derivada** (KPIs + gráficos sobre PARTIDOS/EQUIPOS) | `DashboardPage` |
| 2 | LIGAS | 5–23 (19 ligas) | **PRIMARIA** (datos estructurales) | `League[]`, `LeaguesPage` |
| 3 | PARTIDOS | 5–4000 (**998 reales**) | **PRIMARIA** + 12 columnas derivadas | `Match[]`, `MatchesPage` |
| 4 | EQUIPOS | 5–404 (**308 reales**) | Solo `Liga`+`Equipo` primarios; 56 columnas derivadas | `TeamSeasonStats` |
| 5 | TABLA DE POSICIONES | 614 | **Derivada** (vista ordenada de EQUIPOS) | `LeagueDetailPage` |
| 6 | ESTADISTICAS HOME | 406 | **Derivada** | `SplitStats` (home) |
| 7 | ESTADISTICAS AWAY | 406 | **Derivada** | `SplitStats` (away) |
| 8 | CORNERS | 404 | **Derivada, redundante** (subconjunto de HOME/AWAY) | pestaña Corners de `TeamDetailPage` |
| 9 | TARJETAS | 404 | **Derivada, redundante** | pestaña Tarjetas |
| 10 | GOLES | 404 | **Derivada, redundante** | pestaña Goles |
| 11 | xG | 404 | **Derivada, redundante** | pestaña xG |
| 12 | FORMA | 406 | **Derivada** | `RecentForm` |
| 13 | PARTIDOS PENDIENTES | **0 filas cargadas** | **PRIMARIA** (fixtures) | `Fixture[]` |
| 14 | PROYECCIONES | 506 (0 con datos) | **Derivada** (modelo) | `MatchProjection`, `ProjectionsPage` |
| 15 | PROYECCION FINAL DE TEMPORADA | 406 | **Derivada** (modelo) | `SeasonProjectionPage` |
| 16 | CONFIGURACION | 37 | **PRIMARIA** (9 parámetros) + metodología | `ModelParams`, `SettingsPage` |
| 17 | FUENTES DE DATOS | 26 | **PRIMARIA** (documental) | `SettingsPage` → Fuentes |

**Regla de importación derivada de esto:** solo se importan **LIGAS, PARTIDOS,
PARTIDOS PENDIENTES y CONFIGURACION**. Todo lo demás se recalcula. Las hojas 4–12, 14 y 15
se usan únicamente como *oráculo de validación* (`src/validation/validateVsExcel.test.ts`).

### Estado real de los datos en este archivo

- 998 partidos, 17 ligas con partidos (Ecuador y Venezuela **sin cargar**, a propósito).
- 308 equipos.
- 144 partidos (las 5 grandes ligas europeas) con corners/tiros/posesión/xG; **854 sin ellos**.
- 138 partidos con tarjetas, 131 con goles de 1T.
- **0 fixtures** en PARTIDOS PENDIENTES ⇒ 0 proyecciones y "puntos proyectados restantes" = 0.
- `Jornada` es **numérica** (1…18), como avisa la fila 3 de PARTIDOS.

---

## 2. Claves, identidad y deduplicación

| Excel | App |
|-------|-----|
| `EQUIPOS!D` = `Liga & "\|" & Equipo` | `teamId = leagueId + "\|" + name` — `domain/models/ids.ts` |
| `EQUIPOS!BD` = `Liga & "-" & Posicion` | no se necesita: la tabla se ordena en memoria |
| PARTIDOS no tiene clave de partido | `matchId` = `providerId` si existe, si no `liga\|temporada\|fecha\|local\|visitante` (`buildMatchKey`) |

`buildMatchKey` es exactamente la clave de fallback que pide el enunciado y la que usa
`services/sync/syncEngine.ts` para no duplicar.

---

## 3. PARTIDOS — columnas primarias vs derivadas

Columnas **primarias** (se importan tal cual; vacío ⇒ `null`, nunca `0`):

`A Liga, B Pais*, C Temporada*, D Fecha, E Jornada, F Local, G Visitante, H GL, I GV,
K G1T L, L G1T V, O Tiros L, P Tiros V, R TP L, S TP V, U Posesion L, W Corners L,
X Corners V, Z Amarillas L, AA Amarillas V, AC Rojas L, AD Rojas V, AF Faltas L,
AG Faltas V, AI Offside L, AJ Offside V, AK xG L, AL xG V, AV Fuente, AW Fecha Act.`

\* `B` y `C` son en realidad fórmulas `INDEX/MATCH` contra LIGAS; en la app se derivan de la liga.

Columnas **derivadas** (fórmula en Excel → función en `domain/calculations/matchDerived.ts`):

| Col | Fórmula Excel | Función TS |
|-----|---------------|------------|
| J Goles Totales | `=IF(OR(H="",I=""),"",H+I)` | `totalGoals(m)` |
| M / N Goles 1T/2T | `K+L` / `J-M` | `firstHalfTotal`, `secondHalfTotal` |
| Q / T / Y / AB / AE / AH | sumas Local+Visitante | `sumPair(a,b)` genérica |
| V Posesion Visitante | `=IF(U="","",1-U)` | `awayPossession(m)` |
| AM BTTS | `H>0 AND I>0` | `isBtts(m)` |
| AN/AO/AP Over 1.5/2.5/3.5 | `J>1.5 / 2.5 / 3.5` | `isOver(m, line)` |
| AQ/AR Clean Sheet L/V | `I=0` / `H=0` | `homeCleanSheet`, `awayCleanSheet` |
| AS/AT Resultado HT/FT | `1 / X / 2` | `resultHT`, `resultFT` |
| AU Marcador | `H&"-"&I` | `scoreline(m)` |
| AX/AY PPG Rival | PPG del rival (de EQUIPOS!BB) | `attachOpponentPpg` (2ª pasada) |

> **Nota `sumPair`:** Excel devuelve `""` si *cualquiera* de los dos lados falta.
> `sumPair` devuelve `null` en ese caso. Esto es deliberado: nunca se convierte un dato
> desconocido en 0.

---

## 4. EQUIPOS → `calculateTeamStats()`

`domain/statistics/teamStats.ts`

| Excel | Fórmula | TS |
|-------|---------|-----|
| E PJ | `COUNTIFS(local)+COUNTIFS(visitante)` | `played` |
| F PG | `COUNTIFS(local, FT="1") + COUNTIFS(visitante, FT="2")` | `won` |
| G PE | `COUNTIFS(… FT="X")` ×2 | `drawn` |
| H PP | `PJ-PG-PE` | `lost` |
| I Pts | `PG*3+PE` | `points` |
| J/K GF/GC | `SUMIFS` cruzados | `goalsFor` / `goalsAgainst` |
| L DG | `GF-GC` | `goalDiff` |
| M/N/O Prom | `/PJ`, `"N/A"` si PJ=0 | `avgGoalsFor`… (`null` si PJ=0) |
| P–AS corners/tarjetas/tiros/TP/xG | mismo patrón *Favor / Contra / Total* + promedios | bloque `StatAggregate` reutilizable |
| AT–AW BTTS/Over % | `COUNTIFS(…="Si")/PJ` | `bttsPct`, `over15Pct`, `over25Pct`, `over35Pct` |
| AX Under 2.5 % | `1-Over2.5%` | `under25Pct` |
| AY Porterías a Cero % | CS local + CS visitante / PJ | `cleanSheetPct` |
| AZ Prom Goles Local | `SUMIFS(GL, local)/COUNTIFS(local)` | `avgGoalsAsHome` |
| BA Prom Goles Visitante | `SUMIFS(GV, visitante)/COUNTIFS(visitante)` | `avgGoalsAsAway` |
| BB PPG | `Pts/PJ` | `ppg` |
| BC Posicion | `SUMPRODUCT` de rango (ver §6) | `calculateStandings()` |
| BE/BF Forma Pts Ult5/10 | `INDEX(FORMA!I / FORMA!R)` | `form.last5.points` |
| BG SoS | `(Σ PPG rival)/PJ` | `calculateStrengthOfSchedule()` |

**Contadores "Favor / Contra"** — patrón único en TS:

```
como local:      Favor = columna Local,      Contra = columna Visitante
como visitante:  Favor = columna Visitante,  Contra = columna Local
```

> ⚠️ **Detalle importante**: `SUMIFS` sobre celdas vacías devuelve `0`. Por eso en Excel un
> equipo sin xG tiene `xG Favor = 0` y `Prom xG Favor = 0` (**no** `"N/A"`). Ver [DIFF-01](#diff-01--el-peso-w_xg-no-se-redistribuye-cuando-no-hay-xg).
> En la app cada agregado guarda además su `sample` (nº de partidos con ese dato reportado),
> de modo que se distingue "0 xG" de "sin datos de xG" y la interfaz muestra **N/D**.

---

## 5. ESTADISTICAS HOME / AWAY → `calculateHomeStats()` / `calculateAwayStats()`

`domain/statistics/splitStats.ts`

Misma familia de fórmulas pero filtrando **solo** por `PARTIDOS!F = equipo` (HOME) o
`PARTIDOS!G = equipo` (AWAY):

- HOME: `Favor` = columnas *Local*, `Contra` = columnas *Visitante*.
- AWAY: `Favor` = columnas *Visitante*, `Contra` = columnas *Local*.

Una sola función `calculateSplitStats(matches, teamName, side)` cubre ambas hojas.
Columnas relevantes para el modelo de proyección:

| Hoja/col | Significado | Se usa en |
|----------|-------------|-----------|
| HOME `D` / AWAY `D` | PJ del split | contracción bayesiana |
| HOME `L` | Prom GF en casa | λ local (ataque) |
| HOME `M` | Prom GC en casa | λ visitante (defensa) |
| AWAY `L` | Prom GF fuera | λ visitante (ataque) |
| AWAY `M` | Prom GC fuera | λ local (defensa) |
| HOME `R` / `S` | Prom corners favor / contra en casa | corners |
| AWAY `R` / `S` | idem fuera | corners |
| HOME `X` / `Y` | Prom tarjetas favor / contra | tarjetas |
| HOME `AD` / `AE` | Prom tiros favor / contra | tiros |
| HOME `AJ` / `AK` | Prom tiros a puerta favor / contra | tiros a puerta |
| HOME `AP` | Prom xG favor en casa | término W_XG local |
| AWAY `AP` | Prom xG favor fuera | término W_XG visitante |

**CORNERS / TARJETAS / GOLES / xG** (hojas 8–11) son *proyecciones de columnas* de
HOME+AWAY: no generan código nuevo, solo vistas (`TeamDetailPage`, pestañas).

---

## 6. TABLA DE POSICIONES → `calculateStandings()`

`domain/statistics/standings.ts`

`EQUIPOS!BC` es un `SUMPRODUCT` que cuenta cuántos equipos de la misma liga son "mejores":

```
Pos = 1 + #{ rivales de la misma liga con
        Pts > Pts
     |  Pts = Pts y DG > DG
     |  Pts = Pts y DG = DG y GF > GF
     |  Pts = Pts y DG = DG y GF = GF y Nombre < Nombre  (orden alfabético) }
```

⇒ En TS es un `sort` con el comparador equivalente (O(n log n) en vez de O(n²)):

```
puntos desc → diferencia de goles desc → goles a favor desc → nombre asc
```

Es **exactamente** el desempate que pide el enunciado, más el 4.º criterio alfabético que
usa el Excel para que la posición nunca se repita.

---

## 7. FORMA → `calculateRecentForm()`

`domain/statistics/form.ts`

**Esta es la parte más fácil de implementar mal.** El Excel **no** toma "los últimos 5
partidos por fecha": toma una **ventana de jornadas**.

```
D  UltimaJornadaJugada = MAX( MAXIFS(Jornada | liga, local=eq),
                              MAXIFS(Jornada | liga, visitante=eq) )
E  PJ Ult5  = COUNTIFS(… Jornada > D-5  y Jornada <= D )
N  PJ Ult10 = COUNTIFS(… Jornada > D-10 y Jornada <= D )
```

Consecuencias que se replican tal cual:

1. Si un equipo tiene un partido aplazado y hay huecos de jornada, `PJ Ult5 < 5`.
2. Si jugó **dos** partidos con el mismo número de jornada, cuentan los dos.
3. La ventana es por **número de jornada**, no por fecha ni por orden cronológico.

```ts
calculateRecentForm(matches, teamName, leagueId, window: 5 | 10): FormWindow
// filtra: round > lastRound - window && round <= lastRound
```

Campos: `played, won, drawn, lost, points, goalsFor, goalsAgainst, avgGoalsFor, avgGoalsAgainst`
(`avg* = null` si `played = 0`, igual que el `"N/A"` del Excel).

`EQUIPOS!BE/BF` (Forma Pts Ult5/Ult10) son solo `INDEX` sobre esta hoja.

---

## 7-bis. Jornada actual y siguiente → `calculateLeagueRounds()`

`domain/statistics/leagueRounds.ts`

**No existe en el Excel**: allí la jornada de los fixtures se escribe a mano al pegarlos en
PARTIDOS PENDIENTES. Se añade porque la sincronización con el proveedor necesita responder
"¿en qué jornada va esta liga?" sin que el usuario lo teclee.

```
currentPhase = fase del ÚLTIMO partido disputado (por fecha)              ; null sin fases
currentRound = MAX(jornada de los partidos CON RESULTADO de esa fase)     ; null si no hay
nextRound    = jornada de la primera casilla (fase, jornada) con pendientes no cancelados
```

`nextRound` **no** es `currentRound + 1`: si la jornada en curso tiene partidos aplazados,
la próxima pendiente es esa misma jornada. Se usa en la columna `Jornada` de `LeaguesPage`,
en el filtro «Solo próxima jornada» de `ProjectionsPage` y en el resumen de sincronización.

**La jornada solo es única dentro de su fase** (DIFF-14): el desglose se cuenta por
`roundKey = fase|jornada` y las fases se ordenan por su primera fecha. Sin eso, la J1 del hexagonal
de la LigaPro se sumaría a la J1 de febrero.

---

## 8. Strength of Schedule → `calculateStrengthOfSchedule()`

`domain/statistics/sos.ts`

Dos pasadas, tal como el Excel (PARTIDOS!AX/AY dependen de EQUIPOS!BB, que **no** depende de
SoS, así que no hay circularidad):

1. Pasada 1: `ppg` de cada equipo (`calculateTeamStats`).
2. Pasada 2 (`PARTIDOS!AX/AY`): a cada partido se le adjunta el PPG del rival.
3. `EQUIPOS!BG` = `(Σ PPG del rival en cada partido) / PJ`.

---

## 9. Parámetros del modelo (CONFIGURACION)

`domain/models/params.ts` → `DEFAULT_MODEL_PARAMS`

| Nombre definido en Excel | Celda | Valor | Campo TS |
|--------------------------|-------|-------|----------|
| `W_BASE` | C12 | 0.45 | `wBase` |
| `W_FORM5` | C13 | 0.20 | `wForm5` |
| `W_FORM10` | C14 | 0.15 | `wForm10` |
| `W_XG` | C15 | 0.20 | `wXg` |
| `K_SHRINK` | C16 | 5 (la app usa 10 por defecto: DIFF-13) | `kShrink` |
| `W_H2H` | C17 | 0.10 (medido, DIFF-16) | `wH2h` |
| `W_SOS` | C18 | 0.06 | `wSos` |
| `K_LOGISTIC` | C19 | 1.1 | `kLogistic` |
| `K_DRAWDECAY` | C20 | 0.5 | `kDrawDecay` |
| `K_PRIOR` | no existe en el libro | 10 (DIFF-14) | `kPrior` |

Editables en `SettingsPage`; se valida `wBase+wForm5+wForm10+wXg = 1` (aviso, no bloqueo —
el Excel también normaliza dividiendo por la suma, así que ≠1 funciona pero cambia la escala).

---

## 10. Contracción bayesiana → `shrinkToLeagueMean()`

`domain/probability/shrink.ts`

Patrón que aparece decenas de veces dentro de `PROYECCIONES!F5` (una por cada media que entra
al modelo):

```
Excel:  (PJ/(PJ+K_SHRINK)) * valorEquipo  +  (K_SHRINK/(PJ+K_SHRINK)) * mediaLiga
```

```ts
export function shrinkToLeagueMean(
  teamValue: number | null, played: number, leagueMean: number, kShrink: number
): number {
  const w = played / (played + kShrink);          // peso = PJ/(PJ+K)
  return w * (teamValue ?? leagueMean) + (1 - w) * leagueMean;
}
```

`teamValue = null` (Excel: `ISNUMBER` falso) ⇒ se usa la media de liga, que es lo que hace
el `AVERAGEIFS` de fallback dentro de la fórmula.
`played = 0` ⇒ `w = 0` ⇒ resultado = media de liga. Idéntico al Excel.

### Hacia dónde se contrae: `PRIOR` (DIFF-14)

`domain/projections/expectedValues.ts` — `priorMean()`

El libro contrae **siempre** hacia la media de la liga. Eso es lo correcto cuando de ese equipo no se sabe
nada más, y deja de serlo en cuanto hay temporadas anteriores suyas cargadas: en la jornada 3, con
`K_SHRINK` 10, la fórmula está diciendo que el equipo es en un 77 % «la liga».

Con `PRIOR = historico` (el valor por defecto desde el 26/09/2026) la contracción de los **goles y el xG**
parte de lo que hizo **ese mismo equipo** en las temporadas anteriores de su competición, contraído a su vez
hacia la liga según cuántos partidos lo respalden:

Y hay una segunda mitad, añadida el 27/09/2026: **las medias de la propia liga también arrancan del
histórico** (`blendLeagueAverages`). Sin eso, en la jornada 1 todas valen 0 y el prior del equipo se contrae
hacia 0 (con 30 partidos de histórico salía rebajado un 25 %) mientras la fuerza defensiva del rival
desaparece, porque `calculateDefenseStrength` divide por esa media. Un 0 en una media de liga se lee como
«todavía no hay dato» y no como una medición, la misma convención que usa el `noData` de
`calculateExpectedMetric`.

```
prior  = shrink(historicoDelEquipo, PJhistorico, mediaLiga, K_PRIOR)
valor  = shrink(valorDeEstaTemporada, PJ, prior, K_SHRINK)
```

Dos cosas que **no** cambian:

- La media de liga sigue siendo el divisor de la fuerza defensiva relativa: «1.0 = defensa del montón»
  sigue queriendo decir eso.
- El histórico sigue fuera de la tabla, de la forma, de las medias de liga y de la dispersión
  (`domain/models/seasonScope.ts`). Solo es el punto de partida de la contracción.

Sin histórico cargado, `prior === mediaLiga` y el resultado es **idéntico** al del libro. Por eso el cambio
no toca a ninguna competición que no tenga temporadas anteriores en la base.

No hay fuga de información: las temporadas anteriores están cerradas y son, por construcción, todas
anteriores a cualquier partido pendiente de la que se está jugando.

**Córners, tarjetas, tiros y tiros a puerta NO usan el prior**, y eso es una medición, no un olvido: ver
DIFF-14.

---

## 11. Fuerza base → `calculateAttackStrength()` / `calculateDefenseStrength()`

`domain/projections/expectedValues.ts`

Núcleo de `PROYECCIONES!F5`, tras desanidar los `INDEX/MATCH`:

```
baseLocal = shrink(HOME.promGF[local], HOME.PJ[local], avgLiga(HOME.promGF))
          × shrink(AWAY.promGC[visit], AWAY.PJ[visit], avgLiga(AWAY.promGC))
          ÷ avgLiga(AWAY.promGC)
```

Es decir: **ataque del local en casa × fuerza defensiva relativa del visitante fuera**,
donde la fuerza relativa es `defensaRival / mediaDeLaLiga` = `calculateDefenseStrength()`.

```ts
calculateAttackStrength(teamAvgFor, played, leagueAvgFor, k)      // shrink(...)  [absoluto]
calculateDefenseStrength(teamAvgAgainst, played, leagueAvgAgainst, k)
  // shrink(...) / leagueAvgAgainst                                [relativo, 1.0 = media]
expectedBase = attack × defenseOpponent
```

Simétrico para el visitante (`G5`): `AWAY.promGF[visit] × HOME.promGC[local] / avgLiga(HOME.promGC)`.

> El `IFERROR(..., soloAtaque)` externo del Excel se replica: si la media de liga es 0
> (división por cero), se usa solo el término de ataque.

---

## 12. Mezcla de pesos → `calculateExpectedGoals()`

`domain/projections/expectedGoals.ts`

Estructura literal de `PROYECCIONES!F5` / `G5`:

```
blend = ( W_BASE  * base
        + W_FORM5 * (FORMA.promGFUlt5  ?? base)
        + W_FORM10* (FORMA.promGFUlt10 ?? base)
        + W_XG    * (SPLIT.promXgFavor ?? base) )
        / (W_BASE + W_FORM5 + W_FORM10 + W_XG)

λ_local     = MAX(0.1, (blend_local  + h2hAdj) * (1 + sosAdj_local))
λ_visitante = MAX(0.1, (blend_visit  - h2hAdj) * (1 + sosAdj_visit))
```

Puntos que se replican exactamente:

- **Normalización por la suma de pesos** (por eso una suma ≠1 no rompe nada).
- **El fallback de cada término es `base`**, no 0. Matemáticamente eso *es* la
  "redistribución de W_XG hacia W_BASE" que documenta CONFIGURACION.
- `MAX(0.1, …)`: λ nunca baja de 0.1.
- El ajuste H2H se **suma** al local y se **resta** al visitante (misma magnitud).
- El ajuste SoS es **multiplicativo** y usa el SoS de *cada* equipo.

### H2H → `calculateH2HAdjustment()`

```
difMedia = ( GF_local_en_H2H − GC_local_en_H2H ) / (nº partidos H2H en ambos sentidos)
h2hAdj   = clamp(difMedia, −2, +2) × (W_H2H / 2)      ⇒ máx ±0.10 goles
```

Sin partidos H2H → `IFERROR(...,0)` → 0.

### SoS → `calculateSosAdjustment()`

```
ratio  = SoS(equipo) / mediaLiga(PPG)          ; si no es número → 1
sosAdj = clamp(ratio − 1, −0.5, +0.5) × W_SOS  ⇒ máx ±0.03 (3 %)
```

---

## 13. Corners, tarjetas, tiros → `calculateExpectedCorners/Cards/Shots()`

`domain/projections/expectedValues.ts`

**No** usan pesos, ni forma, ni xG, ni H2H, ni SoS. Solo base con contracción:

| Excel | Fórmula | Función |
|-------|---------|---------|
| `I5` Corners Esp. Local | `shrink(HOME.R[loc]) × shrink(AWAY.S[vis]) / avg(AWAY.S)` | `calculateExpectedCorners().home` |
| `J5` Corners Esp. Visit. | `shrink(AWAY.R[vis]) × shrink(HOME.S[loc]) / avg(HOME.S)` | `.away` |
| `K5` | `I+J` | `.total` |
| `L5`/`M5` Tarjetas | idem con `X` (favor) e `Y` (contra) | `calculateExpectedCards()` |
| `N5` | `L+M` | |
| `O5` Tiros Esperados | `[HOME.AD × AWAY.AE / avg(AWAY.AE)] + [AWAY.AD × HOME.AE / avg(HOME.AE)]` (**total**) | `calculateExpectedShots()` |
| `P5` Tiros a Puerta Esp. | idem con `AJ` / `AK` | `calculateExpectedShotsOnTarget()` |

> `O5` y `P5` son **totales de partido** en el Excel (suma de los dos lados en una sola celda).
> La app calcula y muestra también el desglose local/visitante, que es exactamente cada
> sumando de esa suma — el total no cambia.

---

## 14. Probabilidades

`domain/probability/poisson.ts`, `domain/probability/matchProbabilities.ts`

El 1X2 del libro (logística, abajo) se usa solo con `MODELO_1X2` = «Compatible con Excel». Por defecto la app
lo saca de la matriz Poisson (`poisson1X2Probabilities`, DIFF-11).

| Excel | Fórmula | Función TS |
|-------|---------|------------|
| `Q5` Over 1.5 | `1-POISSON(1, λtot, TRUE)` | `calculateOverProbability(λtot, 1.5)` |
| `R5` Over 2.5 | `1-POISSON(2, λtot, TRUE)` | idem 2.5 |
| `S5` Over 3.5 | `1-POISSON(3, λtot, TRUE)` | idem 3.5 |
| `T5` BTTS | `1−e^(−λL) − e^(−λV) + e^(−λL−λV)` | `calculateBTTSProbability()` |
| `U5` CS Local | `e^(−λV)` | `calculateCleanSheetProbability(λaway)` |
| `V5` CS Visitante | `e^(−λL)` | `calculateCleanSheetProbability(λhome)` |

```
poissonPmf(k, λ)  = e^-λ λ^k / k!
poissonCdf(k, λ)  = Σ_{i=0..k} pmf(i, λ)          // = POISSON(k, λ, TRUE)
calculateOverProbability(λ, line) = 1 - poissonCdf(floor(line), λ)
```

`λ` **no se redondea** en ningún punto antes de calcular probabilidades.

### 1X2 → `calculate1X2Probabilities()`

```
drawRate = COUNTIFS(liga, FT="X") / COUNTIFS(liga, FT<>"")   ; fallback 0.25
P(X)     = drawRate × e^(−K_DRAWDECAY × (λL−λV)²)
logistic = 1 / (1 + e^(−K_LOGISTIC × (λL−λV)))
P(1)     = (1 − P(X)) × logistic
P(2)     = (1 − P(X)) × (1 − logistic)
```

**Ya suman 1 exactamente** por construcción (`P1+P2 = (1−PX)·1`). La app aplica igualmente
una normalización defensiva `p/Σp` (no-op numéricamente) para cumplir el requisito explícito
del enunciado y protegerse de parámetros extremos.

### Resultado y marcador

- Excel `Z5` devuelve una **etiqueta**: `"Victoria Local" | "Empate" | "Victoria Visitante"`,
  el máximo de las tres probabilidades (`IF(AND(W>=X,W>=Y),…)`). **La app ya no la usa** (ver
  [DIFF-03](#diff-03--resultado-con-doble-oportunidad-y-marcador-coherente)). Con la logística del libro
  `P(X)` nunca es el máximo, porque su tope es la tasa de empates de la liga y con λ iguales cada equipo
  recibe `(1 − P(X)) / 2`, así que un partido igualado salía «1» o «2», con un marcador 0-0. Con la matriz
  Poisson (DIFF-11) casi nunca lo es: 6 de 1.287 partidos en el walk-forward del 19/09/2026.
- **Resultado** (`resultPick`), con la probabilidad del favorito `f = máx(P(1), P(2))`:

  | Condición | Resultado | Significado |
  |---|---|---|
  | `f ≥ 55 %` (`CLEAR_FAVORITE`) | `1` / `2` | gana el favorito |
  | `45 % ≤ f < 55 %` (`MIN_FAVORITE`) | `1X` / `2X` (se enseña «X2») | el favorito o el empate |
  | `f < 45 %` | `sinFavorito` (se enseña «—») | no se pronostica |

- **Marcador** (`mostLikelyScoreline(λL, λV, resultado)`): argmax sobre la matriz Poisson
  independiente `P(i,j) = pmf(i,λL)·pmf(j,λV)` con `i,j ∈ [0,10]`, **solo entre los marcadores que
  caben en ese resultado** (`1`: i>j · `1X`: i≥j · `2X`: j≥i · `2`: j>i; sin favorito, cualquiera). El Excel no
  calcula marcador; se deriva del mismo modelo y nunca contradice el resultado.
- Ninguna probabilidad cambia: ni 1X2, ni λ, ni Over/BTTS/portería a cero.

---

## 15. PROYECCION FINAL DE TEMPORADA → `calculateSeasonProjection()`

`domain/projections/seasonProjection.ts`

| Excel | Fórmula | TS |
|-------|---------|-----|
| `D` Posición actual | `EQUIPOS!BC` | `currentPosition` |
| `E` Puntos actuales | `EQUIPOS!I` | `currentPoints` |
| `F` PJ actuales | `EQUIPOS!E` | `currentPlayed` |
| `G` Partidos restantes | `COUNTIFS` sobre PARTIDOS PENDIENTES (local + visitante) | `remainingMatches` |
| `H` Pts proy. restantes | `Σ_como_local (P1·3 + PX·1) + Σ_como_visitante (P2·3 + PX·1)` | `projectedRemainingPoints` |
| `I` Pts proy. totales | `E + H` | `projectedPoints` |
| `K` GF proy. | `GF + Σ λL(local) + Σ λV(visitante)` | `projectedGoalsFor` |
| `M` GC proy. | `GC + Σ λV(local) + Σ λL(visitante)` | `projectedGoalsAgainst` |
| `O` Corners proy. | `Corners Favor + Σ corners esperados a favor` | `projectedCorners` |
| `Q` Tarjetas proy. | `Tarjetas Favor + Σ tarjetas esperadas a favor` | `projectedCards` |
| `R` Posición proyectada | `SUMPRODUCT`: Pts proy. → GF proy. → nombre | `projectedPosition` |
| `S` Orden (desempate) | `I - ROW()/100000` | **no se replica**: truco de Excel para gráficos |

> ⚠️ El desempate de la **posición proyectada** es `Pts → GF → nombre` (sin diferencia de
> goles), distinto del de la tabla actual (`Pts → DG → GF → nombre`). Se replica tal cual.

---

## 16. DASHBOARD → `DashboardPage`

| Excel | TS |
|-------|-----|
| Filtros `F_PAIS, F_LIGA, F_EQUIPO, F_JORNADA, F_DESDE, F_HASTA` (nombres definidos) | `Filters` en el store; `applyFilters(matches, filters)` |
| `B13` Partidos en el filtro | `kpis.matches` |
| `B14–B18` Prom goles / corners / tarjetas, BTTS %, Over 2.5 % | `calculateKpis(filtered)` |
| `M6:O24` Resumen por liga | `calculateLeagueSummary()` |
| `L28:M42` Top 15 por xG (`LARGE(EQUIPOS!AQ)`, oculta ≤0) | `topTeamsByXg(15)` — oculta equipos sin xG, igual que el Excel |
| `L46:N…` Tendencia por jornada | `roundTrend()` → `LineChart` de Recharts |

Los KPIs del Excel promedian **solo las filas con dato** (`AVERAGEIFS` ignora vacíos):
`calculateKpis` hace lo mismo y además devuelve el tamaño de muestra de cada KPI, para
mostrar "N/D" cuando ninguna fila del filtro tiene ese dato.

---

## 17. Mapa Excel → función → pantalla (resumen)

| Hoja Excel | Funciones TypeScript | Pantalla React |
|-----------|----------------------|----------------|
| DASHBOARD | `applyFilters`, `calculateKpis`, `calculateLeagueSummary`, `topTeamsByXg`, `roundTrend` | `/` DashboardPage |
| LIGAS | `parseLeaguesSheet` | `/ligas` LeaguesPage |
| PARTIDOS | `parseMatchesSheet`, `matchDerived.*` | `/partidos` MatchesPage, `/partidos/:id` MatchDetailPage |
| EQUIPOS | `calculateTeamStats` | `/equipos` TeamsPage, `/equipos/:id` TeamDetailPage |
| TABLA DE POSICIONES | `calculateStandings` | `/ligas/:id` LeagueDetailPage |
| ESTADISTICAS HOME/AWAY | `calculateHomeStats`, `calculateAwayStats` | TeamDetailPage → Home / Away |
| CORNERS/TARJETAS/GOLES/xG | (vistas de las anteriores) | TeamDetailPage → pestañas |
| FORMA | `calculateRecentForm` | TeamDetailPage → Forma, Dashboard |
| PARTIDOS PENDIENTES | `parseFixturesSheet` | `/partidos` (pestaña Pendientes) |
| PROYECCIONES | `calculateMatchProjection` (+ §11–14) | `/proyecciones` ProjectionsPage |
| PROYECCION FINAL | `calculateSeasonProjection` | `/proyeccion-temporada` SeasonProjectionPage |
| CONFIGURACION | `ModelParams`, `validateWeights` | `/configuracion` SettingsPage |
| FUENTES DE DATOS | `DATA_SOURCES` | `/configuracion` → Fuentes |

Orden de recálculo (`domain/engine.ts` → `recalculateAll`), que respeta las dependencias
entre hojas del libro:

```
PARTIDOS
  → teamStats (EQUIPOS sin SoS)
  → opponentPpg (PARTIDOS!AX/AY)
  → SoS (EQUIPOS!BG)
  → splitStats (HOME/AWAY) + form (FORMA)
  → standings (TABLA DE POSICIONES)
  → leagueAverages
  → projections (PROYECCIONES)   [una por fixture]
  → seasonProjection (PROYECCION FINAL)
```

---

## 18. Diferencias detectadas (Excel vs metodología documentada)

### DIFF-01 — El peso `W_XG` no se redistribuye cuando no hay xG

- **CONFIGURACION dice:** *"si no hay xG disponible ese peso se redistribuye proporcionalmente a W_BASE"*.
- **La fórmula hace:** `IF(ISNUMBER(HOME!AP), HOME!AP, base)`. Pero `HOME!AP` es
  `IFERROR(ΣxG / PJ, "N/A")`, y `SUMIFS` sobre celdas vacías devuelve **0**, no un error.
  Con `PJ > 0` el resultado es `0/PJ = 0`, que **sí** es número.
- **Consecuencia:** en las 12 ligas sin xG (854 de los 998 partidos), el término `W_XG`
  aporta `0.20 × 0` en lugar de `0.20 × base`, hundiendo λ un **20 %**.
  Verificado en el archivo: p. ej. Brasileirao, `Prom xG Favor = 0` en los 20 equipos.
  Solo con `PJ = 0` (Ecuador, Venezuela) daría `"N/A"` y sí caería al fallback.
- **Decisión:** la app implementa la **metodología documentada**, que es además lo que pide
  explícitamente el enunciado (*"No rellenar xG faltante con cero"*). Para ello cada agregado
  guarda su tamaño de muestra; si es 0, `avgXgFor = null` y el término cae a `base`.
  `SettingsPage` incluye el interruptor **"Modo compatible con Excel (xG ausente = 0)"**
  (`xgMissingMode: 'documented' | 'excel'`, por defecto `documented`) para poder reproducir
  el libro celda a celda durante la validación.

### DIFF-02 — `PJ` cuenta filas, no partidos con resultado

`EQUIPOS!E` es `COUNTIFS(liga, equipo)` sin comprobar que `Goles Local` sea numérico.
En este archivo los 998 partidos tienen resultado, así que no hay diferencia. La app
**filtra por `homeGoals != null && awayGoals != null`** al calcular estadísticas, para que
un partido cargado sin marcador no ensucie PJ ni los promedios. Los fixtures viven en otra
colección, así que este filtro nunca resta partidos reales.

### DIFF-03 — Resultado con doble oportunidad y marcador coherente

Ver §14. El Excel etiqueta el máximo de P(1), P(X) y P(2) y no calcula marcador. La app muestra el
resultado según la probabilidad del favorito y el marcador más probable **dentro de ese resultado**. Solo
cambia cómo se resumen las probabilidades; ninguna probabilidad cambia.

- **13/09/2026:** la etiqueta del Excel podía decir «2» con un marcador 0-0 (Tigre - Rosario Central: 37,1 % /
  25,2 % / 37,7 %). Se pasó a `1`, `1X`, `X`, `2X` o `2` según `P(1) − P(2)` y el parámetro `MARGEN_CLARO`.
- **19/09/2026:** medido en walk-forward sobre 1.287 partidos, esa etiqueta acertaba poco. «X · empate
  claro» salía en los partidos igualados y acertaba el 24,9 %; «victoria clara», el 52,9 % (local) y el
  46,1 % (visitante). El empate casi nunca es el resultado más probable (6 de 1.287). Ahora:
  - favorito con 55 % o más: gana, y acierta el 64,3 % (224 partidos);
  - entre 45 y 55 %: el favorito o el empate, y acierta el 75,7 % (448);
  - por debajo del 45 %: sin favorito claro, sin pronóstico (615, casi la mitad). Ahí el favorito solo
    gana el 42 %.
- **`MARGEN_CLARO` desaparece.** Los umbrales son `CLEAR_FAVORITE` y `MIN_FAVORITE` en
  `matchProbabilities.ts`. El valor que quedaba en los parámetros guardados se ignora.

### DIFF-04 — Redondeo de `POISSON` y suma 1X2

Excel `POISSON(k, λ, TRUE)` y la implementación TS coinciden a ~1e-15. Las tres
probabilidades 1X2 ya suman 1 por construcción; la normalización explícita del enunciado
se aplica igualmente y es un no-op (|Σ−1| < 1e-12 en las pruebas).

### DIFF-05 — `Pais` y `Temporada` de PARTIDOS son fórmulas

`PARTIDOS!B/C` hacen `INDEX/MATCH` contra LIGAS. La app no los importa como dato: los
deriva de `leagueId`. Un partido cuya liga no exista en LIGAS se reporta como error de
importación en vez de quedar con país vacío.

### DIFF-06 — La forma usa ventana de jornadas, no "últimos N partidos"

No es una diferencia con el Excel (se replica exactamente), sino con la intuición habitual.
Documentado aquí y en la UI (`TeamDetailPage` → Forma) porque es la fuente de discrepancia
más probable si alguien compara a mano.

### DIFF-07 — Los promedios dividen entre PJ, no entre la muestra de la métrica

`EQUIPOS!S = P/E` divide los corners entre **PJ**, no entre los partidos que tienen corners
reportados. Con cobertura parcial (p. ej. 138 de 144 partidos con tarjetas) el promedio queda
subestimado. Cada agregado guarda su `sample`, así que el promedio se muestra como **N/D** —y no
como 0— cuando la muestra es 0.

**Cambio del 13/09/2026 (motivo: picks).** Con cobertura parcial la proyección de corners queda
por debajo en la misma proporción: con un 87 % de cobertura, 10 corners pasan a 8,75 y P(Over 9.5)
baja del 54 % al 36 %. Para el evaluador de picks eso es un edge falso sistemático hacia el Under.
Nuevo parámetro **`PROMEDIO_STATS`** (`statAverageMode`, Configuración → Modelo):

- `muestra` (**por defecto**): `aggregateStat` divide cada lado entre los partidos en los que está
  reportado, y `calculateExpectedMetric` usa esos partidos (no PJ) como evidencia de la contracción.
- `excel`: ÷ PJ, celda a celda con el libro. `npm run validate` se ejecuta en este modo.

En ligas con cobertura completa los dos modos dan lo mismo. Los datos guardados reciben `muestra` al
migrar (store v4). Ver PICKS_METHODOLOGY.md §2.

### DIFF-08 — Corners/tarjetas/tiros esperados sin datos: `null` en vez de 0

`PROYECCIONES!I:P` devuelven 0 cuando la liga no tiene ninguna observación de la métrica
(todas las medias valen 0). La app devuelve `null` y la interfaz muestra **N/D**: un 0 ahí
parecería una predicción real. No afecta a las ligas con datos, donde el valor coincide con
el del Excel.

### DIFF-09 — Los resultados adjudicados no cuentan en el análisis

Un partido adjudicado por decisión (incomparecencia, sanción o suspensión con resultado dado) tiene
marcador oficial, casi siempre 3-0, pero no se jugó entero ni publica estadísticas. El libro no los
distingue. Desde el 15/09/2026 la app los guarda y los muestra en Partidos con la etiqueta
**Adjudicado**. `countsForAnalysis` los deja fuera de PJ, goles, puntos y tabla, promedios, forma,
H2H, SoS, medias de liga, proyecciones y validación del modelo: un 3-0 de despacho no mide la fuerza
de ningún equipo.

- **Quién lo marca:** FotMob (`status.awarded: true`, «Awarded win»). Medido el 15/09/2026: 1 en la
  Liga FUTVE y 2 en Chile.
- **Tabla:** la de la app puede quedar por detrás de la oficial en los puntos adjudicados.
- **Siguen contando** para liquidar picks y para el avance de jornadas (`hasResult`).

### DIFF-10 — Goles esperados y probabilidades por parte

El libro no proyecta por partes. Desde el 18/09/2026 la app reparte la λ total del partido con la proporción de
goles de la 1.ª parte de la liga, contraída hacia la global del 44,7 % (`calculateFirstHalfShare`, con
`LeagueAverages.firstHalfShare`). Añade a PROYECCIONES `expectedGoalsFirstHalf`, `expectedGoalsSecondHalf` y los
Over 0.5 / 1.5 de cada parte. No cambia ninguna columna del libro: λ local, λ visitante, 1X2 y Over del partido
son los mismos. Sin 20 partidos con resultado al descanso en la liga, los campos nuevos son `null` (N/D).
Fórmula, medición y backtest en PICKS_METHODOLOGY.md §2.

### DIFF-11, DIFF-12 y DIFF-13 — Mejoras del modelo medidas en walk-forward (18/09/2026)

Tres cambios elegidos con un backtest walk-forward sobre 1.267 partidos: cada uno se predijo solo con los partidos
anteriores de su liga, y se comparó con el modelo del libro partido a partido (media ± error estándar). Cada uno se
puede volver a dejar como el libro en Configuración → Modelo.

- **DIFF-11 — 1X2 de la matriz Poisson** (`MODELO_1X2`, `oneXTwoMode: 'poisson'`). `PROYECCIONES!W/X/Y` usan una
  logística con decaimiento del empate (§14). La app suma la matriz de marcadores Poisson con λL y λV, la misma que da
  Over, BTTS y los hándicaps, así que todos los mercados cuadran entre sí. El empate predicho pasa del 20,8 % al 24,6 %
  (real 24,2 %) y el Brier del 1X2 baja 0,0055 ± 0,0021. K_LOGISTIC y K_DRAWDECAY solo cuentan con la logística.
- **DIFF-12 — xG a favor × en contra del rival** (`XG_FUERZA`, `xgStrengthMode: 'favorContra'`). En
  `PROYECCIONES!F/G` el término W_XG es el xG a favor del equipo, sin mirar al rival. La app usa la misma forma que la
  fuerza base: xG a favor del equipo contraído × xG en contra del rival relativo a la media de la liga
  (`LeagueAverages.homeXgFor…awayXgAgainst`). Sin xG de alguno de los dos, el término del libro. Log-verosimilitud de
  goles +0,0028 ± 0,0020 y BTTS −0,0011 ± 0,0005.
- **DIFF-14 — `PRIOR` = temporadas anteriores del propio equipo** (`priorMode: 'historico'`, `K_PRIOR` = 10).
  El libro contrae las medias de cada equipo hacia la media de la liga; con histórico cargado se contraen hacia
  lo que hizo ese equipo (§10). Walk-forward del 26/09/2026 sobre las **303 proyecciones** de la BetPlay 2026 y
  2026/27 (histórico: 2025 Apertura, 2025 Clausura y 2026 Apertura, 413 + 204 partidos), recalculando la
  temporada jornada a jornada con corte estricto por fecha y `FUENTE_PROYECCION = libro`:

  | | media de liga (libro) | temporadas anteriores | diferencia emparejada |
  |---|---|---|---|
  | log loss 1X2 | 1,1244 | **1,0336** | −0,091 ± 0,021 |
  | acierto 1X2 | 44,6 % | **46,2 %** | |
  | log loss Over 2.5 | 0,8615 | **0,7288** | −0,133 ± 0,050 |
  | log loss BTTS | 0,8009 | **0,7201** | −0,081 ± 0,033 |
  | error medio en goles totales | 1,330 | **1,245** | −0,085 ± 0,021 |
  | error medio en córners | 2,664 | 2,664 | sin cambio (no usan el prior) |

  El grueso de la mejora está al principio de temporada, que es donde el libro no tiene con qué trabajar: en
  las 6 primeras jornadas la log loss del 1X2 pasa de **1,2945 a 1,0529**. De la jornada 7 en adelante la
  mejora es pequeña pero del mismo signo (1,0328 → 1,0232).

  `K_PRIOR` 5 sale marginalmente mejor que 10 (log loss 1,0300) y 40 peor (1,0516); se elige 10 por coherencia
  con `K_SHRINK` y porque la diferencia entre 5 y 10 no sale del ruido.

  **Repetido en otras ligas el 14/10/2026**, que es lo que faltaba: estas cifras estaban tomadas solo en
  BetPlay. `K_PRIOR` 10 es el mínimo de log loss también en LaLiga y en la Premier, y la mejora sobre el
  libro es **mayor** que en Colombia (temporadas 2025-26 y 2026-27, `npm run medir-prior`):

  | | LaLiga (458) | Premier (440) |
  |---|---|---|
  | log loss 1X2 | 1,0576 → **0,9887** | 1,1028 → **1,0353** |
  | acierto | 48,9 → **50,4 %** | 44,8 → **47,1 %** |
  | log loss Over 2.5 | 0,8066 → **0,6737** | 0,8677 → **0,7016** |
  | log loss BTTS | 0,7693 → **0,6916** | 0,7432 → **0,6933** |
  | error medio en goles | 1,3123 → **1,2395** | 1,3770 → **1,3107** |

  Y se repite la ganancia de cobertura: el libro no podía puntuar córners ni tarjetas en 20 de esas
  proyecciones y con el prior las puntúa todas.

  **En córners y tarjetas el prior se probó y se quitó**: subía el error medio de córners 0,087 ± 0,048 (con
  `K_PRIOR` 5, 0,126 ± 0,057, ya fuera del ruido) y dejaba las tarjetas igual (0,003 ± 0,033). Lo que un
  equipo marca y encaja se parece de una temporada a otra; sus córners, no lo bastante.

  **Actualización del 27/09/2026.** Con las medias de liga también contraídas (arriba), los mismos 306 partidos
  dan: log loss 1X2 **1,1243 → 1,0282** (emparejado −0,0958 ± 0,0230), acierto **44,1 % → 47,4 %**, Over 2.5
  **0,8606 → 0,7224**, BTTS **0,8008 → 0,7200**, error en goles **1,331 → 1,233**. En las 6 primeras jornadas,
  log loss 1X2 **1,2945 → 1,0365** y acierto **35,9 % → 42,5 %**.

  Y córners y tarjetas dejan de ser N/D al principio de temporada: pasan de tener cifra en **287 de 306**
  partidos a tenerla en **306**, con el error algo más bajo (córners 2,654 → 2,650; tarjetas 2,044 → 2,008). En
  los partidos que ya la tenían no se mueven (emparejado −0,0023 ± 0,0041 y +0,0008 ± 0,0067): la mejora es
  cobertura, no un cambio en lo que ya funcionaba. El prior **por equipo** de córners sigue descartado; lo que
  entra aquí es la media de la liga.

  Medido en **una sola competición**, la única con histórico cargado. `PRIOR = liga` en Configuración → Modelo
  devuelve el comportamiento del libro.

  Se vuelve a medir con `npm run medir-prior` (`LIGA=... TEMPORADAS=...` para otra competición), que rehace
  el walk-forward sobre la base local. Comprobado en LaLiga, que no tiene histórico: las cinco variantes dan
  cifras idénticas hasta el último decimal.

- **DIFF-16 — `W_H2H` se queda en 0,10, y ahora por medición** (14/10/2026). Hasta que el histórico hizo
  que los duelos directos existieran (DIFF-15), el 0,10 del libro no se podía comprobar: las parejas se
  habían visto 0 o 1 vez. Barrido de 0 / 0,05 / 0,10 / 0,20 / 0,40 en cinco ligas
  (`VARIANTES=h2h npm run medir-prior`), log loss del 1X2:

  | liga | n | 0 | 0,05 | **0,10** | 0,20 | 0,40 |
  |---|---|---|---|---|---|---|
  | BetPlay | 331 | **1,0346** | 1,0352 | 1,0366 | 1,0418 | 1,0618 |
  | LaLiga | 458 | 0,9896 | 0,9889 | **0,9887** | 0,9902 | 1,0006 |
  | Premier League | 440 | 1,0365 | 1,0356 | **1,0353** | 1,0367 | 1,0473 |
  | Serie A | 440 | 1,0031 | 1,0021 | **1,0018** | 1,0032 | 1,0145 |
  | Bundesliga | 351 | 0,9864 | 0,9845 | 0,9833 | **0,9828** | 0,9901 |

  El valor del libro es el mínimo o su vecino en 4 de las 5, y las cinco coinciden en que 0,40 es peor.
  Las diferencias son de milésimas, así que esto **no es «el H2H ayuda»**: es que no hay motivo para
  moverlo. El acierto, en cambio, suele preferir 0 (BetPlay 46,5 % con 0 frente a 45,0 % con 0,10); se
  decide por log loss, que es la métrica de la plataforma.

- **DIFF-15 — el histórico en la dispersión, el H2H y la confianza** (27/09/2026, mismo interruptor `PRIOR`).
  Tres sitios más donde la temporada en curso no daba para nada al empezar:

  - **Dispersión de córners y tarjetas** (`φ = varianza / media`, `engine.ts`). Los mercados de conteo exigen 20
    partidos de liga con el dato, así que al empezar la temporada no se podían evaluar. El histórico entra
    **solo como respaldo**, cuando la temporada no llega a esos 20: mezclarlo siempre empeoraba un poco donde ya
    había datos (Over 9.5 córners +0,0019 ± 0,0007 sobre los 250 partidos que ya se podían evaluar, con φ
    bajando de 1,38 a 1,25). Como respaldo: los evaluables pasan de **250 a 287 de 306** (en las 6 primeras
    jornadas, de **50 a 87**) y en los que ya lo eran no cambia nada (−0,0004 ± 0,0004). φ se estima sobre 143
    partidos de media en vez de 75. De la dispersión solo se toma la **variabilidad**, nunca el nivel: la media
    la pone la proyección.
  - **Enfrentamientos directos** (`calculateH2HAdjustment`). En un torneo de 19 jornadas la mayoría de las
    parejas no se han visto: sin histórico el ajuste tenía **0,069 duelos de media**, y **exactamente 0 en las 6
    primeras jornadas**, o sea que `W_H2H` = 0,10 estaba apagado. Con el histórico son 2,44. En precisión
    **no cambia nada medible** (log loss 1X2 −0,0961 → −0,0958, dentro del ruido); lo que arregla es que el
    parámetro exista. Queda pendiente medir si `W_H2H` merece otro valor ahora que se puede medir.
  - **Confianza de los picks** (`PESO_HISTORICO_CONFIANZA` = 0,5, `betting/markets.ts`). Medía solo los partidos
    de la temporada, así que las **88 proyecciones pendientes de la BetPlay estaban por debajo del mínimo de
    7,5** (salían 4,1–5,4 con 3–7 jornadas) y ningún partido podía dar pick, aunque la estimación fuera medida
    mejor que la del libro. Contando cada partido de otra temporada como medio, pasan **73 de 88**. El 0,5 es un
    criterio, no una medición: se vigila con el backtest.

  Validado con el backtest de picks de `/historial` (519 partidos, 11.281 predicciones, 22 mercados): log loss
  0,6133 → 0,6128 y Brier 0,2126 → 0,2124 (iguales), ECE 0,0277 → 0,0304. La subida del ECE está en el tramo
  del 60–70 %, donde el modelo se queda corto (predice 65,0 y sale 68,2) y por tanto no dispara picks; **en el
  tramo que sí los dispara, el 80–90 %, la calibración mejora**: predice 84,7 y sale 84,4, frente a 84,1 antes.

- **El backtest de picks no miraba el histórico** (arreglado el 27/09/2026). `backtestLeague` recorría fechas y
  llamaba a `recalculateAll` con la temporada vigente de la competición, así que en una fecha de 2025 todos los
  partidos anteriores caían fuera de la temporada, los equipos no existían y el partido se saltaba: **32
  evaluados y 687 saltados** de 719 en la BetPlay. Ahora cada corte lleva la temporada de sus propios partidos:
  **519 evaluados y 11.281 predicciones**, con las temporadas anteriores como histórico y sin mirar hacia
  delante.

- **DIFF-13 — K_SHRINK 10 por defecto**. El libro usa 5. Con una sola temporada las medias de cada equipo tienen
  mucho ruido y contraer más hacia la liga predice mejor goles (+0,0051 ± 0,0019), Over 2.5, BTTS, corners
  (−0,0055 ± 0,0009) y tarjetas (−0,0042 ± 0,0009); 3 empeora y 15–20 dan lo mismo que 10. La **confianza** de los
  picks ya no usa K_SHRINK sino `CONFIDENCE_K` = 5, para que mida la muestra y no la contracción
  (PICKS_METHODOLOGY.md §2).

**Las tres juntas**, con el motor real: log-verosimilitud de goles +0,0074 ± 0,0030, Brier 1X2 −0,0053 ± 0,0025,
Over 2.5 −0,0026 ± 0,0008, BTTS −0,0030 ± 0,0007, corners −0,0055 ± 0,0009 y tarjetas −0,0042 ± 0,0009. Es cerca de
un 1 % de Brier: más preciso, pero con poca ventaja demostrada sobre la frecuencia de cada liga. K = 10 se eligió
mirando estos mismos partidos, así que la mejora real puede ser algo menor.

**Sin resolver:** el modelo se queda corto en goles (λ local 1,54 frente a 1,63 real). Calibrarlo por liga empeora
todas las métricas y escalar la forma por condición da resultados mixtos.

**Los datos guardados** pasan a estos valores con la migración v5 del store. K_SHRINK solo pasa a 10 si seguía en 5.
Al importar el libro completo, K_SHRINK vuelve al valor de su CONFIGURACION y los dos modos se conservan.

---

### DIFF-14 — Calendario: hora de Colombia, fases y formato de cada competición (19/09/2026)

El Excel no tiene hora de partido ni fases: la jornada es un número que se escribe a mano. Tres cambios,
ninguno toca el modelo estadístico.

**1. La hora se guarda como instante y se enseña en hora de Colombia.** `SourceMatch.utc` →
`Match.kickoffUtc` / `Fixture.kickoffUtc`, que ya publicaban las seis fuentes y se estaba descartando. La
conversión vive solo en `src/utils/matchTime.ts`; la zona de cada competición, en
`src/domain/models/leagueTimeZones.ts` (una sola tabla, compartida con el registro del servidor).
Sin instante se reconstruye con la zona de la competición, salvo en las tres de la UEFA, donde la sede
cambia de país: ahí se enseña la hora del estadio marcada como tal, en vez de convertir a ojo.
`date` y `kickoffTime` siguen siendo los OFICIALES de la competición y ordenan las jornadas como antes.

**2. La fase de cada partido se guarda** (`phase`), tal como la nombra su fuente. Cada fase vuelve a
numerar desde la J1, así que la jornada solo es única dentro de su fase (`roundKey`). Afecta a
`calculateLeagueRounds`, a la columna Jornada, al filtro «Solo próxima jornada» y al calendario.

**3. El formato de las 32 competiciones está medido** en `src/domain/models/competitionFormat.ts`:
temporada cruzada, año calendario, torneos (Apertura/Clausura) o fases finales, con las jornadas de la
fase regular. Las etapas que la competición numera por separado pero la fuente publica de corrido (las
dos etapas de 15 jornadas de la LigaPro) se etiquetan con `stageOf`, diciendo en el tooltip qué jornada
es en la numeración de la fuente.

Además, FotMob entregaba solo UNO de los grupos de una fase final que se juega en paralelo. Medido en la
LigaPro: entraban 12 partidos de 4 clubes y se quedaban fuera «Championship Round» y «Relegation Round»,
con 12 clubes sin calendario. Ahora entran los tres grupos (72 partidos, 16 clubes), con la prueba
sacada de los propios datos: una fase que se solapa en fechas con la que está en curso y no comparte
ningún equipo con ella es otro grupo del mismo torneo. Un Apertura y un Clausura, que van seguidos y
repiten equipos, no encajan y siguen contándose por separado.

**Lo que NO cambia**: las tablas de posiciones y el modelo siguen agregando todos los partidos cargados
de la competición, sin separar por fase. Si una liga juega una fase final con tabla propia, su tabla en
la aplicación sigue siendo la acumulada.

---

### DIFF-15 — Momentum del partido (19/09/2026)

Visualización nueva, fuera del modelo de proyección: no entra en ninguna probabilidad ni en ningún pick.

Ningún proveedor publica un momentum utilizable como dato, así que se construye
(`src/domain/statistics/momentum.ts`) con los tiros con minuto y xG y los goles de la fuente:

```
peso(tiro) = max(xG, 0.03) + (gol ? 0.30 : 0)
M(t)       = Σ  signo · peso · exp(-(t - minuto) / 5)      ; solo eventos con minuto ≤ t
curva      = M(t) / max|M| · 100                            ; escala relativa a ESE partido
```

`signo` es +1 para el local y −1 para el visitante; un gol en propia puerta cuenta para el equipo que se
lo lleva. `TAU = 5` minutos: a los 5 queda el 37 % y a los 15 el 5 %. Las tarjetas y expulsiones se
marcan en el gráfico pero no entran en la curva. Sin tiros con minuto no hay curva y se dice por qué:
medido el 19/09/2026, hay cobertura en las grandes europeas, Brasil, Argentina, Colombia, México, MLS y
Polonia, y no la hay en Ecuador, Bolivia, Paraguay, Uruguay ni Venezuela.

---

### DIFF-16 — Motor de predicción con siete modelos (20/09/2026)

Módulo nuevo (`src/domain/prediction/`), **separado del modelo del libro**: la proyección de
PROYECCIONES y los picks siguen saliendo del motor de siempre (`domain/engine.ts`). Este compara siete
modelos sobre los mismos datos y los combina.

- **Modelos**: Poisson, Dixon-Coles, Elo, xG, Random Forest, Gradient Boosting y una red neuronal, todos
  con el mismo contrato y todos capaces de quedarse fuera cuando no tienen datos.
- **41 variables por partido**, todas anteriores a jugarse, incluidas las que el Excel no usa: Elo,
  descanso entre partidos, tiros, posesión, corners y tarjetas.
- **Backtesting temporal** con reentrenos cada 21 días, calibración y pesos de ensemble ajustados solo
  con partidos anteriores.
- **Métricas**: log loss, Brier, acierto, ECE y aporte sobre la frecuencia base.

Metodología completa, resultados medidos y límites: [PREDICTION_ENGINE.md](PREDICTION_ENGINE.md).

---

### DIFF-17 — La proyección puede salir del libro, de los modelos o de la mezcla (20/09/2026)

`FUENTE_PROYECCION` (`ModelParams.projectionSource`) decide de dónde salen los **goles esperados** y el
**1X2** de cada proyección, y con ellos todos los mercados y el pick del modelo:

| Valor | Qué manda |
|---|---|
| `mixto` (por defecto) | 70 % libro + 30 % ensemble de los siete modelos |
| `libro` | El modelo de siempre |
| `ensemble` | Solo los siete modelos |

Medido el 20/09/2026 sobre **1.628 partidos** en walk-forward: mixto 1,0416 de log loss y 47,6 % de
acierto; solo libro 1,0434 y 47,1 %; solo ensemble 1,0486 y 46,7 %. Ninguna diferencia supera al ruido
(mixto − libro: −0,0018 ± 0,0014), pero la mezcla es la única que no pierde contra ninguna de las dos.

Corners, tarjetas, tiros y el reparto por partes salen SIEMPRE del libro: el motor no los modela. Un
partido sin predicción calculada usa el libro entero y la proyección lo dice en `source`.

El almacén pasa a la **versión 6**: `params` se guarda como un objeto entero, así que un parámetro nuevo
no llega a un almacén existente si la migración no lo rellena.

---

## 19. Validación contra el Excel

`npm run validate` (`src/validation/validateVsExcel.test.ts`) lee el `.xlsx`, importa
LIGAS/PARTIDOS/CONFIGURACION, recalcula todo y compara **campo a campo** contra los valores
cacheados de las hojas derivadas del propio libro:

- EQUIPOS: PJ, PG, PE, PP, Pts, GF, GC, DG, PPG, promedios, %, posición, SoS (308 equipos)
- ESTADISTICAS HOME / AWAY: PJ, Pts, GF, GC y promedios (308 × 2)
- FORMA: última jornada, PJ/V/E/D/Pts/GF/GC de Ult5 y Ult10 (308)
- TABLA DE POSICIONES: orden completo por liga

Tolerancia `1e-9` para enteros y `1e-6` para promedios. El informe indica **liga, equipo,
campo, valor Excel, valor app**. No hay filas de PROYECCIONES que validar porque
PARTIDOS PENDIENTES está vacío; ese bloque se cubre con tests unitarios de casos calculados
a mano (`src/domain/**/*.test.ts`).

**Resultado actual: 0 diferencias** en los cinco bloques (308 equipos cada uno).

Los promedios de corners/tarjetas/tiros/xG solo se comparan cuando el Excel tiene muestra
real; donde el libro publica un 0 por ausencia de datos, la app publica `null` a propósito
(DIFF-01 y DIFF-07). Las sumas sí se comparan siempre y coinciden exactamente.
