/** Gancho de resolución: ver `tsResolve.mjs`. */
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve as resolvePath } from 'node:path';

const EXTENSIONES = ['.ts', '.tsx', '/index.ts'];

export async function resolve(spec, ctx, next) {
  const sinExtension = spec.startsWith('.') && !/\.(ts|tsx|mts|js|mjs|json|css)$/.test(spec);
  if (sinExtension && ctx.parentURL?.startsWith('file:')) {
    const base = dirname(fileURLToPath(ctx.parentURL));
    for (const ext of EXTENSIONES) {
      const candidato = resolvePath(base, spec + ext);
      if (existsSync(candidato)) return next(pathToFileURL(candidato).href, ctx);
    }
  }
  return next(spec, ctx);
}
