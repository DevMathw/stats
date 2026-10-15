# Desplegar la plataforma

La aplicación desplegada es **la misma que en casa**: el mismo `server/api.ts` monta las mismas rutas, y
la base de datos sigue siendo el mismo `analisis-futbol.sqlite`. No hay conversión de datos en ningún
punto, y por eso no hay nada que se pueda perder por el camino.

Lo único que cambia es dónde vive el fichero: en casa, en `data/`; desplegado, en un **volumen** que
sobrevive a los despliegues. Esa es la pieza que no se puede olvidar: la imagen del contenedor se
reconstruye entera cada vez, así que lo que esté dentro de ella desaparece.

```
                    casa                         desplegado
  app          vite dev (5173)              npm start (server/produccion.ts)
  API          server/api.ts         <--- el mismo --->   server/api.ts
  base         data/*.sqlite                /datos/*.sqlite  (volumen)
```

---

## 1. Subir el código a GitHub

Desde `C:\Mateo\statistics`, en Git Bash.

```bash
git init -b main
```

```bash
git add -A
```

Comprobación obligatoria antes de seguir: esto tiene que imprimir `OK: data/ fuera`. La base lleva tu
clave de football-data.org, tus picks y tu bankroll.

```bash
git ls-files --cached | grep "^data/" || echo "OK: data/ fuera"
```

```bash
git commit -m "Plataforma de analisis de futbol"
```

Crea el repositorio vacío en [github.com/new](https://github.com/new) — **Private**, y sin marcar README,
.gitignore ni licencia. Luego:

```bash
git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
```

```bash
git push -u origin main
```

---

## 2. Desplegar en Railway

1. [railway.app](https://railway.app) → **New Project** → *Deploy from GitHub repo* → tu repositorio.
   Detecta el `Dockerfile` solo; no hay que configurar comandos de compilación.

2. **Añade un volumen.** En el servicio → *Variables / Settings* → **Volumes** → *New Volume*, con punto
   de montaje **`/datos`**.

   Sin esto la aplicación funciona, pero cada despliegue arranca con la base vacía.

3. **Variables de entorno.** Solo hace falta una:

   | Variable | Valor |
   |---|---|
   | `TOKEN_ADMIN` | una cadena larga y aleatoria, tuya |

   `DATOS_DIR`, `CACHE_ESCUDOS` y `NODE_ENV` ya vienen en el `Dockerfile`. `PORT` lo pone Railway.

   Para generar el token:

   ```bash
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

4. Espera al despliegue y copia la URL pública (`https://algo.up.railway.app`).

En **Render** es igual: *New → Web Service*, runtime **Docker**, y en *Disks* un disco montado en `/datos`.

---

## 3. Subir tu base de datos

Una sola vez, desde casa. Pon el mismo token que configuraste arriba:

```bash
TOKEN_ADMIN=e2f2f5f3170f66c3508e4696b7656705cd5c56629a49292fe867873a7411b1f4 npm run subir-base -- https://stats-production-e0c8.up.railway.app
```

El script:

- cuenta las filas de tu base;
- hace una copia con `VACUUM INTO` — no copia el fichero a pelo, porque con el WAL activo los últimos
  cambios viven en `analisis-futbol.sqlite-wal` y se perderían;
- la sube entera;
- y **compara las cuentas**. Si no cuadran, sale con error y lo dice tabla por tabla.

Sube el fichero completo y no un volcado a JSON a propósito: `readStore` no devuelve `server_secrets` (la
clave de football-data.org) ni `storage_backups` (las copias de tu `localStorage`), así que un export por
la API los dejaría fuera sin avisar.

Si la subida está rota o no es SQLite, el servidor la rechaza **sin tocar** la base que ya tuviera.

---

## 4. Comprobar

Abre la URL. Deberías ver las mismas competiciones, partidos, picks y bankroll que en casa.

```bash
curl -s https://tu-app.up.railway.app/api/football-data/key
```

`{"configured":true}` confirma que hasta la clave del proveedor viajó.

---

## Después

Cada `git push` a `main` redespliega. **El volumen no se toca**: los datos siguen ahí.

Si vuelves a ejecutar `npm run subir-base`, la base desplegada se **reemplaza** por la de casa. Ten
cuidado si para entonces has registrado picks desde la web: se perderían. Para traértelos primero, baja la
base del servidor antes de volver a subirla.

---

## 5. Opcional: el frontend en Vercel

Railway ya sirve la web. Esto solo tiene sentido si quieres la página en Vercel; **los datos siguen en
Railway en cualquier caso**, porque Vercel no puede guardarlos.

```
  Vercel  ─────  la web (dist/)
     │
     │  VITE_API_URL
     ▼
  Railway ─────  la API y el volumen con la base
```

El orden importa, porque cada uno necesita saber la dirección del otro.

**1. El backend primero.** Haz los pasos 2 y 3 y quédate con su URL
(`https://tu-app.up.railway.app`).

**2. El frontend en Vercel.** [vercel.com/new](https://vercel.com/new) → importa el repositorio. El
`vercel.json` ya trae el framework, el comando y el *fallback* de la SPA. Añade **una variable**:

| Variable | Valor |
|---|---|
| `VITE_API_URL` | `https://tu-app.up.railway.app` |

Despliega y copia la URL de Vercel.

**3. Autoriza ese dominio en Railway.** En el backend, añade:

| Variable | Valor |
|---|---|
| `ORIGENES_PERMITIDOS` | `https://tu-app.vercel.app` |

Son dos dominios distintos, así que el navegador bloquea las llamadas salvo que la API diga que ese origen
vale. La lista es explícita y no `*` a propósito: con `*`, cualquier página de internet podría leer tus
datos y escribir en tu base, porque la API no pide credenciales. Si pones varios, sepáralos por comas.

Railway reinicia solo al cambiar una variable.

### Dos cosas que confunden la primera vez

**`VITE_API_URL` se congela al compilar.** No se lee al abrir la página: queda escrita dentro del
JavaScript. Si la cambias, hay que **volver a desplegar** en Vercel; guardarla no basta.

**Las vistas previas de Vercel tienen otro dominio.** Cada rama genera algo como
`tu-app-git-rama-usuario.vercel.app`, que no está en `ORIGENES_PERMITIDOS` y por tanto se queda sin datos.
Es lo esperado: añádelo a la lista si quieres usarlo, o trabaja contra el dominio de producción.

### Comprobar que se hablan

```bash
curl -s -i -X OPTIONS -H "Origin: https://tu-app.vercel.app" -H "Access-Control-Request-Method: POST" https://tu-app.up.railway.app/api/store
```

Tiene que responder `204` con `access-control-allow-origin` apuntando a tu dominio de Vercel. Si responde
`403`, la variable `ORIGENES_PERMITIDOS` no coincide con el dominio exacto (ojo al `https://` y a que no
sobre una barra final).

---

### Las dos máquinas no se sincronizan solas

Hoy casa y despliegue son dos copias independientes de la misma base. Mientras uses una sola, no hay
problema. Si acabas usando las dos, hay que decidir cuál manda y montar la sincronización — dímelo y lo
vemos, porque hacerlo mal es justo la forma de perder datos.
