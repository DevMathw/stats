/**
 * La escala de stake 1–100: cada punto es un 1 % del bank.
 *
 * Es una UNIDAD DE LECTURA, no un método para decidir cuánto apostar. El stake lo sigue calculando Kelly
 * con los topes del perfil, exactamente igual que antes; esto solo lo expresa en una escala en la que
 * «stake 3» se compara de un vistazo con «stake 25» sin tener que mirar el bank de cada momento.
 *
 * Por qué es exacta y no una aproximación: `PickRecord.stakeFraction` ya guarda «stake / bankroll al
 * registrar» y `bankrollBefore` el bank de ese instante. El stake en la escala es esa fracción por 100,
 * así que un pick de hace tres meses se lee en la misma escala que uno de hoy aunque el bank haya
 * cambiado por el camino. Sin ese dato guardado habría que reconstruir el bank histórico y la cifra
 * sería una estimación.
 *
 * Las bandas salen de las recomendaciones del sistema, no de un criterio propio:
 *   1–10   la mayoría de las apuestas
 *   11–19  por encima de lo habitual
 *   20+    solo para oportunidades de alta confianza
 *   >100   apostar más del bank entero, que el sistema marca como error
 */

export type BandaStake = 'conservador' | 'moderado' | 'agresivo' | 'excesivo';

/** Stake en la escala a partir de la fracción del bank (0.03 → 3). */
export const stakeDeFraccion = (fraccion: number): number => fraccion * 100;

/** Fracción del bank a partir del stake de la escala (3 → 0.03). */
export const fraccionDeStake = (stake: number): number => stake / 100;

/** Lo que vale un stake con un bank concreto. En la misma unidad que el bank (SC). */
export const importeDeStake = (stake: number, bank: number): number => (bank * stake) / 100;

/** El stake que representa un importe sobre un bank. `null` sin bank: dividir por cero no es un stake. */
export function stakeDeImporte(importe: number, bank: number): number | null {
  if (!Number.isFinite(importe) || !Number.isFinite(bank) || bank <= 0) return null;
  return (importe / bank) * 100;
}

export function bandaDe(stake: number): BandaStake {
  if (stake > 100) return 'excesivo';
  if (stake >= 20) return 'agresivo';
  if (stake > 10) return 'moderado';
  return 'conservador';
}

export const BANDAS: Record<BandaStake, { label: string; tono: 'positive' | 'neutral' | 'warning' | 'negative'; consejo: string }> = {
  conservador: {
    label: 'Conservador',
    tono: 'positive',
    consejo: 'Entre 1 y 10. Es donde debería estar la mayoría de las apuestas.',
  },
  moderado: {
    label: 'Moderado',
    tono: 'neutral',
    consejo: 'Por encima de 10. Asegúrate de que el análisis lo respalda.',
  },
  agresivo: {
    label: 'Agresivo',
    tono: 'warning',
    consejo: 'De 20 para arriba. Resérvalo solo para oportunidades de alta confianza.',
  },
  excesivo: {
    label: 'Por encima del bank',
    tono: 'negative',
    consejo: 'Más de 100 es apostar más de lo que tienes. El sistema lo marca como error.',
  },
};

/** Los peldaños que enseña la tabla de la escala. */
export const PELDANOS = [1, 5, 10, 20, 30, 50, 70, 100] as const;
