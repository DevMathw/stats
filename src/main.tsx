import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css';
import { AppLayout } from './components/Layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ErrorScreen, NotFound } from './pages/ErrorPage';

/**
 * Cada pantalla, en su propio trozo.
 *
 * Antes las diecisiete se empaquetaban juntas y quien abría el dashboard se descargaba también el
 * evaluador de picks, el historial y sus gráficos: 1,7 MB antes de pintar nada. Con `lazy` de React Router
 * el trozo se pide al navegar, que en local tarda milisegundos, y el arranque baja a lo que de verdad se
 * usa. El dashboard se queda estático porque es la pantalla de entrada: cargarlo aparte solo añadiría un
 * salto de ida y vuelta justo al abrir.
 */
const pagina = (carga: () => Promise<Record<string, unknown>>, nombre: string) => async () => ({
  Component: (await carga())[nombre] as React.ComponentType,
});

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    // El único que puede recoger un fallo del propio layout: llegados ahí, no hay layout que conservar.
    errorElement: <ErrorScreen />,
    children: [
      {
        /**
         * Ruta sin camino, que existe solo para llevar este `errorElement`.
         *
         * Es lo que hace que el error de una pantalla salga DENTRO del layout, con el menú todavía puesto
         * para irse a otro sitio. Con el `errorElement` únicamente en la raíz, React Router sustituiría el
         * `<AppLayout />` entero y dejaría al usuario en una página suelta y sin navegación.
         */
        errorElement: <ErrorScreen />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'ligas', lazy: pagina(() => import('./pages/LeaguesPage'), 'LeaguesPage') },
          { path: 'ligas/:leagueId', lazy: pagina(() => import('./pages/LeaguesPage'), 'LeagueDetailPage') },
          { path: 'partidos', lazy: pagina(() => import('./pages/MatchesPage'), 'MatchesPage') },
          { path: 'partidos/:matchId', lazy: pagina(() => import('./pages/MatchesPage'), 'MatchDetailPage') },
          { path: 'equipos', lazy: pagina(() => import('./pages/TeamsPage'), 'TeamsPage') },
          { path: 'equipos/:teamId', lazy: pagina(() => import('./pages/TeamsPage'), 'TeamDetailPage') },
          { path: 'proyecciones', lazy: pagina(() => import('./pages/ProjectionsPage'), 'ProjectionsPage') },
          { path: 'proyecciones/:fixtureId', lazy: pagina(() => import('./pages/FixtureDetailPage'), 'FixtureDetailPage') },
          { path: 'oportunidades', lazy: pagina(() => import('./pages/OpportunitiesPage'), 'OpportunitiesPage') },
          { path: 'picks', lazy: pagina(() => import('./pages/PickEvaluatorPage'), 'PickEvaluatorPage') },
          { path: 'tickets', lazy: pagina(() => import('./pages/TicketsPage'), 'TicketsPage') },
          { path: 'bankroll', lazy: pagina(() => import('./pages/BankrollPage'), 'BankrollPage') },
          { path: 'rendimiento', lazy: pagina(() => import('./pages/PerformancePage'), 'PerformancePage') },
          { path: 'historial', lazy: pagina(() => import('./pages/HistoryPage'), 'HistoryPage') },
          { path: 'modelos', lazy: pagina(() => import('./pages/ModelsPage'), 'ModelsPage') },
          { path: 'proyeccion-temporada', lazy: pagina(() => import('./pages/SeasonProjectionPage'), 'SeasonProjectionPage') },
          { path: 'configuracion', lazy: pagina(() => import('./pages/SettingsPage'), 'SettingsPage') },
          // Cualquier otra dirección. Sin esto pintaba el layout con el contenido vacío y sin explicar por qué.
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
