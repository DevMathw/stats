/**
 * Deja que node importe los módulos de `src/` tal y como están escritos.
 *
 * `buildTeamCatalog.mjs` y `buildOfficialTeams.mjs` importan de `src/` con la extensión `.ts` puesta, que es
 * lo que pide node. El dominio entero no la lleva —lo resuelve Vite—, así que para ejecutarlo desde un
 * script hace falta este gancho: prueba `.ts`, `.tsx` e `/index.ts` como haría el empaquetador.
 *
 *   node --experimental-strip-types --import ./scripts/tsResolve.mjs scripts/mi-script.mts
 */
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register(new URL('./tsResolveHook.mjs', import.meta.url), pathToFileURL('./'));
