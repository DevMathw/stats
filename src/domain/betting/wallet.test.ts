import { describe, expect, it } from 'vitest';
import type { PickRecord, Profile, TicketRecord } from '../../types/betting';
import { DEFAULT_RISK_SETTINGS } from './settings';
import {
  availableBalance,
  bankrollOf,
  committedStake,
  createProfile,
  debitStake,
  deposit,
  rebuildBalances,
  resetBankroll,
  settleAmounts,
  settlementMovement,
  unitValue,
  validateAmount,
  validateStake,
  withoutTickets,
} from './wallet';

let n = 0;
const id = () => `id-${++n}`;
const NOW = '2026-09-13T10:00:00.000Z';
/** SC de una cantidad de monedas con el valor por defecto (1 moneda = 30.000 SC). */
const M = (monedas: number) => Math.round(monedas * 30_000 * 100) / 100;

function perfil(): Profile {
  return createProfile({ id: id(), movementId: id(), name: 'Prueba', now: NOW, settings: DEFAULT_RISK_SETTINGS });
}

function conPick(p: Profile, pickId: string, stake: number, status: PickRecord['status'] = 'pendiente'): Profile {
  return { ...p, picks: [...p.picks, { id: pickId, cycle: p.cycle, stake, status } as PickRecord] };
}

function setStatus(p: Profile, pickId: string, status: PickRecord['status']): Profile {
  return { ...p, picks: p.picks.map((x) => (x.id === pickId ? { ...x, status } : x)) };
}

function ok<T>(r: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!r.ok) throw new Error(r.error);
  return r.value;
}

describe('Wallet virtual', () => {
  it('saldo inicial configurable: 30 monedas por defecto', () => {
    const p = perfil();
    expect(availableBalance(p)).toBe(M(30));
    expect(bankrollOf(p)).toBe(M(30));
    expect(p.movements[0].type).toBe('inicial');
    expect(unitValue(p.settings)).toBe(M(0.3));
  });

  it('un stake pendiente pasa de disponible a comprometido', () => {
    let p = ok(debitStake(perfil(), M(1), 'pick-1', 'stake', NOW, id()));
    p = conPick(p, 'pick-1', M(1));
    expect(availableBalance(p)).toBe(M(29));
    expect(committedStake(p)).toBe(M(1));
    expect(bankrollOf(p)).toBe(M(30));
  });

  it('gana: 1 moneda a 1.90 → ganancia neta 0.9, saldo 30.9', () => {
    let p = conPick(ok(debitStake(perfil(), M(1), 'pick-1', 'stake', NOW, id())), 'pick-1', M(1));
    const r = settleAmounts(M(1), 1.9, 'ganado', 30_000);
    expect(r).toEqual({ grossReturn: M(1.9), netProfit: M(0.9) });
    p = setStatus(settlementMovement(p, 'ganado', r.grossReturn, 'pick-1', 'gana', NOW, id()), 'pick-1', 'ganado');
    expect(availableBalance(p)).toBe(M(30.9));
    expect(bankrollOf(p)).toBe(M(30.9));
  });

  it('pierde: 1 moneda → saldo 29 y queda rastro del movimiento', () => {
    let p = conPick(ok(debitStake(perfil(), M(1), 'pick-1', 'stake', NOW, id())), 'pick-1', M(1));
    const r = settleAmounts(M(1), 1.9, 'perdido', 30_000);
    expect(r).toEqual({ grossReturn: 0, netProfit: -M(1) });
    p = setStatus(settlementMovement(p, 'perdido', 0, 'pick-1', 'pierde', NOW, id()), 'pick-1', 'perdido');
    expect(bankrollOf(p)).toBe(M(29));
    expect(p.movements.at(-1)!.type).toBe('perdida');
  });

  it('10. partido cancelado: reembolso íntegro', () => {
    let p = conPick(ok(debitStake(perfil(), M(1), 'pick-1', 'stake', NOW, id())), 'pick-1', M(1));
    const r = settleAmounts(M(1), 1.9, 'anulado', 30_000);
    expect(r.netProfit).toBe(0);
    p = setStatus(settlementMovement(p, 'anulado', r.grossReturn, 'pick-1', 'anulado', NOW, id()), 'pick-1', 'anulado');
    expect(bankrollOf(p)).toBe(M(30));
  });

  it('7. no permite saldo negativo', () => {
    expect(debitStake(perfil(), M(30.01), 'x', 'stake', NOW, id()).ok).toBe(false);
  });

  it('6. con el saldo a 0 no hay stake posible', () => {
    const p = ok(debitStake(perfil(), M(30), 'x', 'stake', NOW, id()));
    expect(availableBalance(p)).toBe(0);
    expect(debitStake(p, M(1), 'y', 'stake', NOW, id()).ok).toBe(false);
  });

  it('rechaza importes no válidos, también los de más de 2 decimales en monedas', () => {
    // 350 SC = 0.011666… monedas; 30 SC = 0.001 monedas.
    for (const x of [0, -5, Number.NaN, Number.POSITIVE_INFINITY, 350, M(0.001)]) expect(validateAmount(x, 30_000)).not.toBeNull();
    expect(validateAmount(M(12.5), 30_000)).toBeNull();
    expect(validateAmount(M(0.01), 30_000)).toBeNull();
    expect(debitStake(perfil(), -M(1), 'x', 'stake', NOW, id()).ok).toBe(false);
    expect(deposit(perfil(), 0, NOW, id()).ok).toBe(false);
  });

  it('stake mínimo de 1 moneda; los depósitos pueden ser menores', () => {
    expect(validateStake(M(0.99), 30_000)).toContain('1 moneda');
    expect(validateStake(M(1), 30_000)).toBeNull();
    expect(validateStake(M(1.25), 30_000)).toBeNull();
    expect(debitStake(perfil(), M(0.5), 'x', 'stake', NOW, id()).ok).toBe(false);
    expect(deposit(perfil(), M(0.5), NOW, id()).ok).toBe(true);
  });

  it('depósito virtual', () => {
    const p = ok(deposit(perfil(), M(2.5), NOW, id()));
    expect(availableBalance(p)).toBe(M(32.5));
    expect(p.movements.at(-1)!.balanceAfter).toBe(M(32.5));
  });

  it('reinicio: bloqueado con apuestas pendientes', () => {
    const p = conPick(perfil(), 'pick-1', M(1));
    const r = resetBankroll(p, NOW, id());
    expect(r.ok).toBe(false);
  });

  it('reinicio: ciclo nuevo con el saldo inicial y el historial conservado', () => {
    let p = ok(debitStake(perfil(), M(2), 'pick-1', 'stake', NOW, id()));
    p = conPick(p, 'pick-1', M(2), 'perdido');
    const antes = p.movements.length;
    p = ok(resetBankroll(p, NOW, id()));
    expect(p.cycle).toBe(2);
    expect(availableBalance(p)).toBe(M(30));
    expect(p.movements.length).toBe(antes + 1);
    expect(p.picks).toHaveLength(1);
  });

  it('el retorno se redondea a la centésima de moneda más cercana', () => {
    // 0.37 monedas × 1.85 = 0.6845 → 0.68 monedas; ganancia neta 0.31.
    expect(settleAmounts(M(0.37), 1.85, 'ganado', 30_000)).toEqual({ grossReturn: M(0.68), netProfit: M(0.31) });
    // Con 1 moneda = 1 SC, a céntimos.
    expect(settleAmounts(333, 1.87, 'ganado', 1)).toEqual({ grossReturn: 622.71, netProfit: 289.71 });
  });

  it('el error de saldo insuficiente se da en monedas y SC', () => {
    const r = debitStake(perfil(), M(31), 'x', 'stake', NOW, id());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('monedas');
  });
});

describe('Vaciar tickets', () => {
  it('quita tickets, borrador y sus movimientos, conserva los picks y recalcula el saldo', () => {
    let p = conPick(ok(debitStake(perfil(), M(1), 'pick-1', 'stake', NOW, id())), 'pick-1', M(1));
    p = ok(debitStake(p, M(1), 'ticket-1', 'stake ticket', NOW, id()));
    p = {
      ...p,
      tickets: [{ id: 'ticket-1', cycle: 1, stake: M(1), status: 'perdido' } as TicketRecord],
      ticketCounter: 1,
      ticketDraft: [{ fixtureId: 'x', selection: { market: 'btts', outcome: 'si' }, odds: 2 }],
    };
    p = settlementMovement(p, 'perdido', 0, 'ticket-1', 'pierde', NOW, id());
    p = ok(deposit(p, M(2), NOW, id()));

    const v = withoutTickets(p);
    expect(v.tickets).toEqual([]);
    expect(v.ticketDraft).toEqual([]);
    expect(v.ticketCounter).toBe(0);
    expect(v.picks).toHaveLength(1);
    expect(v.movements.some((m) => m.betId === 'ticket-1')).toBe(false);
    expect(availableBalance(v)).toBe(M(31));
    expect(v.movements.map((m) => m.balanceAfter)).toEqual([M(30), M(29), M(31)]);
  });
});

describe('Recalcular saldos', () => {
  it('sin un depósito cambian el saldo tras cada movimiento y el bankroll de cada pick', () => {
    let p = ok(deposit(perfil(), M(2), NOW, id())); // 32
    p = ok(debitStake(p, M(1), 'a', 'stake a', NOW, id())); // 31
    p = ok(debitStake(p, M(1), 'b', 'stake b', NOW, id())); // 30
    p = settlementMovement(p, 'ganado', M(1.5), 'a', 'gana a', NOW, id()); // 31.5
    p = {
      ...p,
      picks: [
        { id: 'a', cycle: 1, stake: M(1), status: 'ganado', netProfit: M(0.5), bankrollBefore: M(32), stakeFraction: 1 / 32, bankrollAfter: M(32.5) } as PickRecord,
        { id: 'b', cycle: 1, stake: M(1), status: 'pendiente', netProfit: null, bankrollBefore: M(32), stakeFraction: 1 / 32, bankrollAfter: null } as PickRecord,
      ],
    };

    const r = rebuildBalances({ ...p, movements: p.movements.filter((m) => m.type !== 'deposito') });
    expect(r.movements.map((m) => m.balanceAfter)).toEqual([M(30), M(29), M(28), M(29.5)]);
    // a: 30 antes del stake; al ganar, 28 disponibles + 2 comprometidas + 0.5 netas.
    expect(r.picks[0]).toMatchObject({ bankrollBefore: M(30), stakeFraction: 1 / 30, bankrollAfter: M(30.5) });
    // b: 29 disponibles + 1 comprometida; sigue pendiente.
    expect(r.picks[1]).toMatchObject({ bankrollBefore: M(30), bankrollAfter: null });
    expect(bankrollOf(r)).toBe(M(30.5));
  });
});
