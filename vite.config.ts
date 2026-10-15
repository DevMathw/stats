/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';
import { montarApi, baseDeDatos } from './server/api.ts';
import { footballDataKey } from './server/storage/appStore.ts';

function localApi(): Plugin {
  return {
    name: 'api-local',
    configureServer: (server) => montarApi(server.middlewares, server.httpServer),
    configurePreviewServer: (server) => montarApi(server.middlewares, server.httpServer),
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), localApi()],
  build: {
    rollupOptions: {
      output: {
        /**
         * Los catálogos de equipos, en su propio trozo.
         *
         * `src/data/officialTeams.ts` (957 clubes con nombre y escudo, 12/10/2026) y `src/data/teamCatalog.ts` son
         * ficheros GENERADOS que cambian una vez al mes; el código de la aplicación cambia a diario.
         * Mezclados, cada versión obligaba a redescargar los 368 kB del catálogo aunque no hubiera
         * cambiado ni una línea suya. Separados, el navegador lo reutiliza de su caché.
         *
         * Medido sobre el arranque COMPLETO (todos los trozos que precarga `index.html`, no solo el
         * principal): 789.988 B sin esto y 790.185 B con esto. El total es el mismo —los ~200 B de más
         * son la cabecera del trozo extra—; lo que cambia es que 368 kB dejan de caducar en cada
         * despliegue. `index` baja de 456 a 304 kB y `useStore` de 188 a 108 kB.
         *
         * Tiene que ser la forma de función: la de objeto, que permitía nombrar módulos sueltos sin
         * tocar el resto del reparto, ya no existe en Rollup 4 / Vite 8. Rollup normaliza los
         * identificadores a barras hacia delante, también en Windows.
         */
        manualChunks: (id) => (id.includes('/src/data/') ? 'catalogo-equipos' : undefined),
      },
    },
  },
  server: {
    // El proxy evita depender de las cabeceras CORS del proveedor y pone la clave, que se guarda en el servidor y nunca
    // llega al navegador. En producción hay que servir un proxy equivalente.
    proxy: {
      '/football-data': {
        target: 'https://api.football-data.org',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/football-data/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('x-auth-token');
            try {
              const clave = footballDataKey(baseDeDatos());
              if (clave) proxyReq.setHeader('X-Auth-Token', clave);
            } catch {
              // Sin base de datos no hay clave: football-data.org responde 401 y la app lo explica.
            }
          });
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'server/**/*.test.ts'],
  },
});
