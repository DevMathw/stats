import { describe, expect, it } from 'vitest';
import type { LeagueAverages, SplitStats } from '../../types';
import { calculateExpectedCards, calculateExpectedCorners, calculateExpectedShots } from './expectedValues';

/** Un split con el mismo promedio a favor y en contra en las cuatro métricas, y muestra de sobra. */
const split = (side: 'home' | 'away', avgFor: number, avgAgainst: number, played = 100): SplitStats => {
  const stat = { for: 0, against: 0, total: 0, avgFor, avgAgainst, avgTotal: null, sample: played };
  return {
    side,
    played,
    corners: stat,
    cards: stat,
    shots: stat,
    shotsOnTarget: stat,
  } as unknown as SplitStats;
};

/** Medias de liga iguales en los dos lados y en todas las métricas: así el «equipo del montón» es exacto. */
const medias = (m: number): LeagueAverages =>
  ({
    homeCornersFor: m, homeCornersAgainst: m, awayCornersFor: m, awayCornersAgainst: m,
    homeCardsFor: m, homeCardsAgainst: m, awayCardsFor: m, awayCardsAgainst: m,
    homeShotsFor: m, homeShotsAgainst: m, awayShotsFor: m, awayShotsAgainst: m,
    homeSotFor: m, homeSotAgainst: m, awaySotFor: m, awaySotAgainst: m,
  }) as unknown as LeagueAverages;

const PARAMS = { kShrink: 10 };

describe('Contracción final de las esperadas de conteo', () => {
  it('un equipo igual a su liga sale en la media, contraiga o no', () => {
    const r = calculateExpectedCards(split('home', 2.2, 2.2), split('away', 2.2, 2.2), medias(2.2), PARAMS);
    // Contraer hacia la media no mueve lo que YA está en la media: vale para cualquier L.
    expect(r.home).toBeCloseTo(2.2, 10);
    expect(r.away).toBeCloseTo(2.2, 10);
    expect(r.total).toBeCloseTo(4.4, 10);
  });

  it('tiros NO se contrae: sigue siendo el producto ataque × defensa relativa', () => {
    const r = calculateExpectedShots(split('home', 16, 13), split('away', 11, 14), medias(13), PARAMS);
    // Con muestra 100 y k 10 la contracción por factor deja el 100/110 del valor propio.
    const w = 100 / 110;
    const enc = (v: number) => w * v + (1 - w) * 13;
    expect(r.home).toBeCloseTo(enc(16) * (enc(14) / 13), 10);
    expect(r.away).toBeCloseTo(enc(11) * (enc(13) / 13), 10);
  });

  it('tarjetas y corners se quedan entre la media de la liga y el valor sin contraer', () => {
    const sinContraer = calculateExpectedShots(split('home', 16, 13), split('away', 11, 14), medias(13), PARAMS);
    const tar = calculateExpectedCards(split('home', 16, 13), split('away', 11, 14), medias(13), PARAMS);
    const cor = calculateExpectedCorners(split('home', 16, 13), split('away', 11, 14), medias(13), PARAMS);

    // El local está por encima de su liga: la contracción tiene que bajarlo, sin pasarse de la media.
    expect(tar.home!).toBeGreaterThan(13);
    expect(tar.home!).toBeLessThan(sinContraer.home!);
    // Corners contrae más que tarjetas (L 0,30 frente a 0,38), así que queda más cerca de la media.
    expect(cor.home!).toBeLessThan(tar.home!);
    expect(cor.home!).toBeGreaterThan(13);

    // El visitante está por debajo de su liga: ahí la contracción SUBE, no baja.
    expect(tar.away!).toBeLessThan(13);
    expect(tar.away!).toBeGreaterThan(sinContraer.away!);

    // Y el total sigue siendo la suma de los dos lados, que es lo que leen los mercados por equipo.
    expect(tar.total).toBeCloseTo(tar.home! + tar.away!, 10);
  });
});
