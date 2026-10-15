/**
 * Wallet virtual: un libro de movimientos. El saldo disponible NUNCA se guarda aparte: es la suma de
 * los movimientos del ciclo, así no puede desincronizarse. PICKS_METHODOLOGY.md §6.
 *
 *   disponible   = Σ movimientos del ciclo actual
 *   comprometido = Σ stakes de picks y tickets pendientes del ciclo
 *   bankroll     = disponible + comprometido
 *
 * Un reinicio abre un ciclo nuevo con el saldo inicial; el historial anterior se conserva.
 */
import type { BetStatus, Movement, MovementType, Profile, RiskSettings } from '../../types/betting';
import { roundMoney } from './odds';
import { formatAmount, isOnCoinGrid, toCoinGrid } from './coins';

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export function availableBalance(p: Profile): number {
  return roundMoney(p.movements.filter((m) => m.cycle === p.cycle).reduce((a, m) => a + m.amount, 0));
}

export function committedStake(p: Profile): number {
  const picks = p.picks.filter((x) => x.cycle === p.cycle && x.status === 'pendiente');
  const tickets = p.tickets.filter((x) => x.cycle === p.cycle && x.status === 'pendiente');
  return roundMoney([...picks, ...tickets].reduce((a, x) => a + x.stake, 0));
}

export function bankrollOf(p: Profile): number {
  return roundMoney(availableBalance(p) + committedStake(p));
}

export function unitValue(s: RiskSettings): number {
  return roundMoney(s.initialBankroll * s.unitPct);
}

/** `null` si es un importe válido: finito, positivo y múltiplo de 0.01 monedas. */
export function validateAmount(x: unknown, coinValue: number): string | null {
  if (typeof x !== 'number' || !Number.isFinite(x)) return 'Introduce un importe numérico.';
  if (x <= 0) return 'El importe tiene que ser mayor que 0.';
  if (x > 1e9) return 'Importe fuera de rango.';
  if (!isOnCoinGrid(x, coinValue)) return 'Como mucho 2 decimales en monedas: 0.01 es el importe mínimo.';
  return null;
}

/**
 * Retorno bruto y ganancia neta de un stake liquidado. El retorno (stake × cuota) se redondea a la
 * centésima de moneda más cercana, igual que un importe en euros se redondea a céntimos.
 */
export function settleAmounts(stake: number, odds: number, status: Exclude<BetStatus, 'pendiente'>, coinValue: number) {
  if (status === 'ganado') {
    const grossReturn = toCoinGrid(stake * odds, coinValue);
    return { grossReturn, netProfit: roundMoney(grossReturn - stake) };
  }
  if (status === 'perdido') return { grossReturn: 0, netProfit: roundMoney(-stake) };
  return { grossReturn: roundMoney(stake), netProfit: 0 };
}

interface MovementInput {
  id: string;
  at: string;
  type: MovementType;
  amount: number;
  betId?: string | null;
  note: string;
}

export function addMovement(p: Profile, m: MovementInput): Profile {
  const amount = roundMoney(m.amount);
  const movement: Movement = {
    id: m.id,
    cycle: p.cycle,
    at: m.at,
    type: m.type,
    amount,
    balanceAfter: roundMoney(availableBalance(p) + amount),
    betId: m.betId ?? null,
    note: m.note,
  };
  return { ...p, movements: [...p.movements, movement] };
}

export function createProfile(input: { id: string; movementId: string; name: string; now: string; settings: RiskSettings }): Profile {
  const base: Profile = {
    id: input.id,
    name: input.name.trim() || 'Perfil',
    createdAt: input.now,
    settings: input.settings,
    cycle: 1,
    movements: [],
    picks: [],
    tickets: [],
    ticketCounter: 0,
    ticketDraft: [],
  };
  return addMovement(base, {
    id: input.movementId,
    at: input.now,
    type: 'inicial',
    amount: input.settings.initialBankroll,
    note: `Saldo inicial virtual`,
  });
}

export function deposit(p: Profile, amount: number, now: string, id: string): Result<Profile> {
  const error = validateAmount(amount, p.settings.coinValue);
  if (error) return { ok: false, error };
  return { ok: true, value: addMovement(p, { id, at: now, type: 'deposito', amount, note: 'Depósito virtual' }) };
}

export function pendingCount(p: Profile): number {
  return (
    p.picks.filter((x) => x.cycle === p.cycle && x.status === 'pendiente').length +
    p.tickets.filter((x) => x.cycle === p.cycle && x.status === 'pendiente').length
  );
}

/** Nuevo ciclo con el saldo inicial. No se permite con apuestas pendientes: quedarían sin ciclo. */
export function resetBankroll(p: Profile, now: string, id: string): Result<Profile> {
  const pendientes = pendingCount(p);
  if (pendientes > 0) {
    return {
      ok: false,
      error: `Hay ${pendientes} ${pendientes === 1 ? 'apuesta pendiente' : 'apuestas pendientes'}: anúlalas o espera a que se liquiden antes de reiniciar.`,
    };
  }
  const siguiente: Profile = { ...p, cycle: p.cycle + 1 };
  return {
    ok: true,
    value: addMovement(siguiente, {
      id,
      at: now,
      type: 'reinicio',
      amount: p.settings.initialBankroll,
      note: `Reinicio de bankroll: ciclo ${siguiente.cycle}`,
    }),
  };
}

/** Un stake: importe válido y de al menos 1 moneda. Los depósitos pueden ser menores. */
export function validateStake(x: unknown, coinValue: number): string | null {
  return validateAmount(x, coinValue) ?? ((x as number) < coinValue ? 'El stake mínimo es 1 moneda.' : null);
}

/** Descuenta un stake. Nunca deja el saldo en negativo. */
export function debitStake(p: Profile, stake: number, betId: string, note: string, now: string, id: string): Result<Profile> {
  const error = validateStake(stake, p.settings.coinValue);
  if (error) return { ok: false, error };
  const disponible = availableBalance(p);
  if (stake > disponible) {
    return { ok: false, error: `Stake superior al saldo disponible (${formatAmount(disponible, p.settings)}).` };
  }
  return { ok: true, value: addMovement(p, { id, at: now, type: 'stake', amount: -stake, betId, note }) };
}

/**
 * Recalcula, tras quitar o cambiar movimientos ya registrados, lo que depende de ellos: el saldo tras
 * cada movimiento y, en cada pick o ticket, el bankroll antes del stake (y su % sobre él) y el bankroll
 * tras liquidarse. Mismo criterio que al registrar y liquidar: bankroll = disponible + stakes
 * pendientes del ciclo en ese momento.
 */
export function rebuildBalances(p: Profile): Profile {
  const apuestas = [...p.picks, ...p.tickets];
  const stakes = new Map(apuestas.map((x) => [x.id, x.stake]));
  const netos = new Map(apuestas.map((x) => [x.id, x.netProfit ?? 0]));
  const antes = new Map<string, number>();
  const despues = new Map<string, number>();
  const saldo = new Map<number, number>();
  const abiertas = new Map<number, Map<string, number>>();

  const movements = p.movements.map((m) => {
    const disponible = saldo.get(m.cycle) ?? 0;
    const pendientes = abiertas.get(m.cycle) ?? new Map<string, number>();
    abiertas.set(m.cycle, pendientes);
    const bankroll = disponible + [...pendientes.values()].reduce((a, b) => a + b, 0);
    if (m.betId && stakes.has(m.betId)) {
      if (m.type === 'stake') {
        antes.set(m.betId, roundMoney(bankroll));
        pendientes.set(m.betId, stakes.get(m.betId)!);
      } else {
        despues.set(m.betId, roundMoney(bankroll + netos.get(m.betId)!));
        pendientes.delete(m.betId);
      }
    }
    const balanceAfter = roundMoney(disponible + m.amount);
    saldo.set(m.cycle, balanceAfter);
    return { ...m, balanceAfter };
  });

  const ajustar = <T extends { id: string; bankrollBefore: number; bankrollAfter: number | null }>(x: T): T => ({
    ...x,
    bankrollBefore: antes.get(x.id) ?? x.bankrollBefore,
    // Un anulado a mano no tiene bankroll tras liquidarse: sigue sin él.
    bankrollAfter: x.bankrollAfter == null ? x.bankrollAfter : (despues.get(x.id) ?? x.bankrollAfter),
  });
  return {
    ...p,
    movements,
    picks: p.picks.map((x) => {
      const y = ajustar(x);
      return { ...y, stakeFraction: y.bankrollBefore > 0 ? y.stake / y.bankrollBefore : y.stakeFraction };
    }),
    tickets: p.tickets.map(ajustar),
  };
}

/**
 * El perfil sin ningún ticket: registrados, borrador y sus movimientos (stake, retorno, pérdida,
 * reembolso). Saldos y bankroll de los picks quedan como si esos tickets no hubieran existido.
 */
export function withoutTickets(p: Profile): Profile {
  const ids = new Set(p.tickets.map((t) => t.id));
  return rebuildBalances({
    ...p,
    tickets: [],
    ticketDraft: [],
    ticketCounter: 0,
    movements: p.movements.filter((m) => !(m.betId && ids.has(m.betId))),
  });
}

/** Movimiento de liquidación: retorno (ganado), pérdida (0, deja rastro) o reembolso (anulado). */
export function settlementMovement(
  p: Profile,
  status: Exclude<BetStatus, 'pendiente'>,
  grossReturn: number,
  betId: string,
  note: string,
  now: string,
  id: string,
): Profile {
  const type: MovementType = status === 'ganado' ? 'retorno' : status === 'perdido' ? 'perdida' : 'reembolso';
  return addMovement(p, { id, at: now, type, amount: status === 'perdido' ? 0 : grossReturn, betId, note });
}
