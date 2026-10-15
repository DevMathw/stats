import { describe, expect, it } from 'vitest';
import { BONO_GOL, buildMomentum, momentumCurve, shotTotals, type TimelineShot } from './momentum';

const tiro = (minute: number, home: boolean, xg: number | null = 0.1, extra: Partial<TimelineShot> = {}): TimelineShot => ({
  minute,
  home,
  xg,
  xgOnTarget: null,
  onTarget: false,
  goal: false,
  player: null,
  ...extra,
});

describe('curva de momentum', () => {
  it('sin tiros no dibuja nada: no se inventa una curva con los goles', () => {
    expect(momentumCurve([], 90)).toEqual([]);
  });

  it('un tiro del local empuja la curva hacia arriba y se desvanece', () => {
    const c = momentumCurve([tiro(10, true)], 90);
    expect(c[9].value).toBe(0); // antes del tiro no hay nada
    expect(c[10].value).toBe(100); // su propio máximo
    expect(c[15].value).toBeLessThan(40); // a los 5 minutos queda el 37 %
    expect(c[30].value).toBeLessThan(5); // 20 minutos después ya casi no queda nada
  });

  it('un tiro del visitante la empuja hacia abajo', () => {
    expect(momentumCurve([tiro(10, false)], 90)[10].value).toBe(-100);
  });

  it('un tiro a puerta pesa más que el mismo tiro fuera', () => {
    const fuera = momentumCurve([tiro(10, true, 0.2), tiro(40, false, 0.2)], 90);
    const aPuerta = momentumCurve([tiro(10, true, 0.2, { onTarget: true, xgOnTarget: 0.4 }), tiro(40, false, 0.2)], 90);
    // Con el mismo xG, el que va a puerta domina más su minuto frente al tiro del rival.
    expect(Math.abs(aPuerta[10].value)).toBeGreaterThanOrEqual(Math.abs(fuera[10].value));
    expect(aPuerta[40].value).toBeGreaterThan(fuera[40].value);
  });

  it('pesa más un tiro claro que uno lejano', () => {
    const [claro] = [momentumCurve([tiro(10, true, 0.6), tiro(10, false, 0.05)], 90)];
    expect(claro[10].value).toBe(100); // manda el local pese a tirar los dos
  });

  it('un gol pesa más que el tiro solo', () => {
    const conGol = momentumCurve([tiro(10, true, 0.1, { goal: true }), tiro(40, false, 0.1 + BONO_GOL)], 90);
    expect(conGol[10].value).toBe(100);
    expect(conGol[40].value).toBe(-100);
  });

  it('un gol en propia puerta cuenta para el equipo que se lo lleva', () => {
    const c = momentumCurve([tiro(10, true, 0.05, { goal: true, ownGoal: true })], 90);
    expect(c[10].value).toBe(-100);
  });
});

describe('resumen del momentum', () => {
  it('cuenta tiros y suma xG por lado', () => {
    expect(shotTotals([tiro(5, true, 0.2), tiro(8, true, 0.3), tiro(9, false, 0.25)])).toEqual({
      shotsHome: 2,
      shotsAway: 1,
      xgHome: 0.5,
      xgAway: 0.25,
    });
  });

  it('sin xG publicado el total es N/D, nunca 0', () => {
    expect(shotTotals([tiro(5, true, null)]).xgHome).toBeNull();
  });

  it('un partido sin tiros con minuto dice por qué no hay gráfico', () => {
    const m = buildMomentum('FotMob', { url: 'https://x', ongoing: false, finished: true, shots: [], events: [] });
    expect(m.points).toEqual([]);
    expect(m.note).toContain('no publica los tiros');
  });

  it('un partido en juego llega solo hasta donde hay datos', () => {
    const m = buildMomentum('FotMob', {
      url: 'https://x',
      ongoing: true,
      finished: false,
      shots: [tiro(12, true)],
      events: [{ minute: 12, home: true, kind: 'gol', player: 'X' }],
    });
    expect(m.lastMinute).toBe(12);
    expect(m.points).toHaveLength(13);
    expect(m.ongoing).toBe(true);
  });
});
