# Análisis de Fútbol: la aplicación compilada y su API, en un solo contenedor.
#
# Node 24 no es un capricho: `node:sqlite` va con bandera en la 22 y el servidor lo importa, así que con
# una versión menor el proceso ni arranca. Y los `.ts` se ejecutan tal cual con `--experimental-strip-types`
# (lo pone `npm start`), que es como ya se ejecutan los scripts del proyecto.
FROM node:24-slim

WORKDIR /app

# Las dependencias en su propia capa: mientras no cambie el `package-lock.json`, un despliegue no vuelve a
# instalarlas.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# `npm run build` es `tsc -b && vite build`: si algo no compila, el despliegue falla aquí y no al arrancar.
RUN npm run build

# LA BASE NO VA EN LA IMAGEN. La imagen se reconstruye entera en cada despliegue; lo que esté dentro se
# pierde. `DATOS_DIR` apunta al volumen persistente, que es donde viven la base, los Excel de las ligas y
# el caché de escudos. Sin volumen montado ahí, cada despliegue empezaría de cero.
ENV DATOS_DIR=/datos
ENV CACHE_ESCUDOS=/datos/crests
ENV NODE_ENV=production
RUN mkdir -p /datos

EXPOSE 8080
CMD ["npm", "start"]
