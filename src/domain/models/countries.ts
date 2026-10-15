/**
 * Países → código ISO y bandera.
 *
 * La hoja LIGAS guarda el país en español y sin acentos ("Espana", "Belgica"). Este es el
 * ÚNICO sitio donde se hace esa traducción: los componentes piden el país y reciben la
 * bandera ya resuelta, así que no hay emojis sueltos por las pantallas.
 */
import { normalizeTeamName } from './teamResolver';

export interface Country {
  /** ISO 3166-1 alfa-2. */
  code: string;
  /** Nombre para mostrar, con acentos. */
  name: string;
}

/**
 * Clave: nombre del país normalizado (minúsculas, sin acentos), tal como puede venir del
 * Excel o del proveedor. Se aceptan las dos formas para no depender de la fuente.
 */
const COUNTRIES: Record<string, Country> = {
  alemania: { code: 'DE', name: 'Alemania' },
  germany: { code: 'DE', name: 'Alemania' },
  argentina: { code: 'AR', name: 'Argentina' },
  austria: { code: 'AT', name: 'Austria' },
  belgica: { code: 'BE', name: 'Bélgica' },
  belgium: { code: 'BE', name: 'Bélgica' },
  bolivia: { code: 'BO', name: 'Bolivia' },
  brasil: { code: 'BR', name: 'Brasil' },
  brazil: { code: 'BR', name: 'Brasil' },
  chile: { code: 'CL', name: 'Chile' },
  colombia: { code: 'CO', name: 'Colombia' },
  dinamarca: { code: 'DK', name: 'Dinamarca' },
  denmark: { code: 'DK', name: 'Dinamarca' },
  ecuador: { code: 'EC', name: 'Ecuador' },
  // Escocia, como Inglaterra, con su propia bandera y no la del Reino Unido.
  escocia: { code: 'GB-SCT', name: 'Escocia' },
  scotland: { code: 'GB-SCT', name: 'Escocia' },
  espana: { code: 'ES', name: 'España' },
  spain: { code: 'ES', name: 'España' },
  'estados unidos': { code: 'US', name: 'Estados Unidos' },
  'united states': { code: 'US', name: 'Estados Unidos' },
  usa: { code: 'US', name: 'Estados Unidos' },
  grecia: { code: 'GR', name: 'Grecia' },
  greece: { code: 'GR', name: 'Grecia' },
  francia: { code: 'FR', name: 'Francia' },
  france: { code: 'FR', name: 'Francia' },
  // Las ligas inglesas usan la bandera de Inglaterra, no la del Reino Unido.
  inglaterra: { code: 'GB-ENG', name: 'Inglaterra' },
  england: { code: 'GB-ENG', name: 'Inglaterra' },
  italia: { code: 'IT', name: 'Italia' },
  italy: { code: 'IT', name: 'Italia' },
  mexico: { code: 'MX', name: 'México' },
  noruega: { code: 'NO', name: 'Noruega' },
  norway: { code: 'NO', name: 'Noruega' },
  'paises bajos': { code: 'NL', name: 'Países Bajos' },
  netherlands: { code: 'NL', name: 'Países Bajos' },
  paraguay: { code: 'PY', name: 'Paraguay' },
  polonia: { code: 'PL', name: 'Polonia' },
  poland: { code: 'PL', name: 'Polonia' },
  portugal: { code: 'PT', name: 'Portugal' },
  suecia: { code: 'SE', name: 'Suecia' },
  sweden: { code: 'SE', name: 'Suecia' },
  suiza: { code: 'CH', name: 'Suiza' },
  switzerland: { code: 'CH', name: 'Suiza' },
  turquia: { code: 'TR', name: 'Turquía' },
  turkey: { code: 'TR', name: 'Turquía' },
  uruguay: { code: 'UY', name: 'Uruguay' },
  venezuela: { code: 'VE', name: 'Venezuela' },
  // Ámbitos supranacionales: las competiciones UEFA no son de un país.
  europa: { code: 'EU', name: 'Europa' },
  europe: { code: 'EU', name: 'Europa' },
  mundo: { code: 'UN', name: 'Mundo' },
  world: { code: 'UN', name: 'Mundo' },
};

export function lookupCountry(country: string | null | undefined): Country | null {
  if (!country) return null;
  return COUNTRIES[normalizeTeamName(country)] ?? null;
}

/** Nombre con acentos para mostrar; si no se conoce, se devuelve el original. */
export function countryName(country: string | null | undefined): string {
  return lookupCountry(country)?.name ?? country ?? '';
}
