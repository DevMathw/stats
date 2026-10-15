/**
 * Descargar un archivo generado en el navegador.
 *
 * Estaba copiado en `BankrollPage` y en `SettingsPage`; al aparecer el tercer caso (exportar partidos a
 * .txt) se saca aquí. Son seis líneas, pero las seis incluyen el `revokeObjectURL` que es fácil olvidar y
 * deja el blob retenido en memoria.
 */
export function descargarArchivo(nombre: string, contenido: BlobPart, tipo: string): void {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Texto plano en UTF-8, sin marca de orden de bytes.
 *
 * Se probó a anteponer el BOM que pide el Bloc de notas antiguo, pero el archivo está pensado para
 * copiarse y pegarse en otra herramienta, y allí el BOM aparece como un carácter invisible pegado a la
 * primera línea. `charset=utf-8` basta para que los acentos salgan bien.
 */
export const descargarTexto = (nombre: string, texto: string): void =>
  descargarArchivo(nombre, texto, 'text/plain;charset=utf-8');

/** Convierte un texto libre en algo válido para un nombre de archivo. */
export const paraNombreDeArchivo = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
