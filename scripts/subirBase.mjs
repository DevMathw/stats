/**
 * Sube la base de datos de casa al servidor desplegado.
 *
 *   npm run subir-base -- https://tu-app.up.railway.app
 *
 * El token sale de `TOKEN_ADMIN`, que tiene que ser el mismo que el del servidor.
 *
 * Manda el FICHERO entero y no un volcado a JSON. Es lo único que no pierde nada: `readStore` no devuelve
 * ni `server_secrets` (la clave de football-data.org) ni `storage_backups` (las copias del localStorage),
 * así que cualquier export por la API dejaría eso fuera sin decirlo.
 *
 * La copia se hace con `VACUUM INTO` y no copiando el archivo: con el WAL activo, los últimos cambios
 * viven en `analisis-futbol.sqlite-wal` y copiar solo el `.sqlite` los perdería. `VACUUM INTO` escribe una
 * base nueva, consistente y sin diario, que es exactamente lo que hay que mandar.
 */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const servidor = process.argv[2]?.replace(/\/$/, '');
const token = process.env.TOKEN_ADMIN;
const origen = process.argv[3] ?? join(process.cwd(), 'data', 'analisis-futbol.sqlite');

if (!servidor || !token) {
  console.error('Uso: TOKEN_ADMIN=xxx npm run subir-base -- https://tu-app.up.railway.app [ruta/a/la.sqlite]');
  process.exit(1);
}

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;
const copia = join(tmpdir(), `analisis-futbol-${Date.now()}.sqlite`);

console.log(`Leyendo ${origen}`);
const db = new DatabaseSync(origen, { readOnly: true });
const local = {};
for (const tabla of ['leagues', 'matches', 'fixtures', 'betting_profiles', 'betting_picks', 'betting_tickets']) {
  local[tabla] = Number(db.prepare(`SELECT COUNT(*) AS n FROM ${tabla}`).get().n);
}
console.log('  ', Object.entries(local).map(([t, n]) => `${n} ${t}`).join(' · '));

// `VACUUM INTO` necesita escribir, así que la base se reabre sin `readOnly`. No la modifica.
db.close();
const escribible = new DatabaseSync(origen);
escribible.exec(`VACUUM INTO '${copia.replace(/'/g, "''")}'`);
escribible.close();
console.log(`Copia consistente: ${mb(statSync(copia).size)}`);

const bytes = readFileSync(copia);
console.log(`Subiendo a ${servidor}/api/admin/base …`);
const r = await fetch(`${servidor}/api/admin/base`, {
  method: 'POST',
  headers: { authorization: `Bearer ${token}`, 'content-type': 'application/octet-stream' },
  body: bytes,
});
const respuesta = await r.json().catch(() => null);
rmSync(copia, { force: true });

if (!r.ok || !respuesta?.counts) {
  console.error(`Falló (${r.status}): ${respuesta?.error ?? 'sin respuesta'}`);
  process.exit(1);
}

// Lo que cuenta el servidor contra lo que había aquí. Si no cuadra, algo se quedó por el camino.
let bien = true;
for (const [tabla, n] of Object.entries(respuesta.counts)) {
  const igual = local[tabla] === n;
  if (!igual) bien = false;
  console.log(`  ${igual ? 'OK ' : '!! '}${tabla}: aquí ${local[tabla]}, allí ${n}`);
}
console.log(bien ? '\nSubida correcta.' : '\nLas cuentas NO cuadran: revisa antes de usar el despliegue.');
process.exit(bien ? 0 : 1);
