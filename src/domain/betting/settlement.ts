/**
 * Liquidación automática con los resultados reales que ya tiene la app (PARTIDOS). Nada se liquida
 * a mano con un resultado escrito por el usuario: o viene de los datos, o el pick sigue pendiente.
 */
import type { Fixture, Match } from '../../types';
import type { BetStatus, EventRef, PickRecord, Profile, Selection, TicketLeg } from '../../types/betting';
import { resolveEvent, selectionLabel, settleSelection } from './markets';
import { roundMoney } from './odds';
import { settleTicketLegs } from './tickets';
import { bankrollOf, settleAmounts, settlementMovement } from './wallet';

interface LegState {
  status: BetStatus;
  note: string | null;
  matchId: string | null;
}

/** Estado de UNA selección según los datos. `pendiente` con nota si no se puede liquidar aún. */
export function legState(ev: EventRef, sel: Selection, matches: Match[], fixtures: Fixture[]): LegState {
  const r = resolveEvent(ev, matches, fixtures);
  switch (r.kind) {
    case 'jugado': {
      const o = settleSelection(sel, r.match);
      return o.status === 'sin-datos'
        ? { status: 'pendiente', note: o.note, matchId: r.match.id }
        : { status: o.status, note: o.note, matchId: r.match.id };
    }
    case 'cancelado':
      return { status: 'anulado', note: 'Partido cancelado: stake devuelto', matchId: null };
    case 'aplazado':
      return { status: 'pendiente', note: 'Partido aplazado: sigue pendiente', matchId: null };
    case 'ambiguo':
      return { status: 'pendiente', note: `${r.count} partidos encajan con este pick: no se liquida sin poder distinguirlos`, matchId: null };
    default:
      return { status: 'pendiente', note: null, matchId: null };
  }
}

export function settleProfile(
  profile: Profile,
  matches: Match[],
  fixtures: Fixture[],
  now: string,
  newId: () => string,
): { profile: Profile; settled: number; changed: boolean } {
  let p = profile;
  let settled = 0;
  let changed = false;

  for (const pick of profile.picks) {
    if (pick.status !== 'pendiente') continue;
    const s = legState(pick, pick.selection, matches, fixtures);
    if (s.status === 'pendiente') {
      if (s.note !== pick.resultNote) {
        p = { ...p, picks: p.picks.map((x) => (x.id === pick.id ? { ...x, resultNote: s.note } : x)) };
        changed = true;
      }
      continue;
    }
    const antes = bankrollOf(p);
    const { grossReturn, netProfit } = settleAmounts(pick.stake, pick.odds, s.status, profile.settings.coinValue);
    const label = selectionLabel(pick.selection, pick.homeTeamName, pick.awayTeamName);
    p = settlementMovement(p, s.status, grossReturn, pick.id, `${label} · ${pick.homeTeamName} – ${pick.awayTeamName} · ${s.note}`, now, newId());
    const updated: PickRecord = {
      ...pick,
      status: s.status,
      settledAt: now,
      matchId: s.matchId,
      resultNote: s.note,
      grossReturn,
      netProfit,
      bankrollAfter: roundMoney(antes + netProfit),
    };
    p = { ...p, picks: p.picks.map((x) => (x.id === pick.id ? updated : x)) };
    settled++;
    changed = true;
  }

  for (const ticket of profile.tickets) {
    if (ticket.status !== 'pendiente') continue;
    let legsChanged = false;
    const legs: TicketLeg[] = ticket.legs.map((l) => {
      if (l.status !== 'pendiente') return l;
      const s = legState(l, l.selection, matches, fixtures);
      if (s.status === l.status && s.note === l.resultNote) return l;
      legsChanged = true;
      return { ...l, status: s.status, resultNote: s.note, matchId: s.matchId ?? l.matchId };
    });
    const r = settleTicketLegs(legs);
    if (r.status === 'pendiente') {
      if (legsChanged) {
        p = { ...p, tickets: p.tickets.map((x) => (x.id === ticket.id ? { ...x, legs } : x)) };
        changed = true;
      }
      continue;
    }
    const antes = bankrollOf(p);
    const status = r.status as Exclude<BetStatus, 'pendiente'>;
    const { grossReturn, netProfit } = settleAmounts(ticket.stake, status === 'ganado' ? r.settledOdds! : 1, status, profile.settings.coinValue);
    const numero = `Ticket #${String(ticket.number).padStart(3, '0')}`;
    p = settlementMovement(p, status, grossReturn, ticket.id, `${numero} · ${status}`, now, newId());
    p = {
      ...p,
      tickets: p.tickets.map((x) =>
        x.id === ticket.id
          ? { ...x, legs, status, settledAt: now, settledOdds: r.settledOdds, grossReturn, netProfit, bankrollAfter: roundMoney(antes + netProfit) }
          : x,
      ),
    };
    settled++;
    changed = true;
  }

  return { profile: p, settled, changed };
}

const DIA = 86_400_000;

/**
 * ¿Se puede anular a mano? Solo cuando los datos no pueden liquidarlo: antes del partido, aplazado,
 * ambiguo, sin la cifra publicada, o sin resultado 14 días después. Con resultado disponible se
 * liquida solo: anular ahí sería esquivar una pérdida.
 */
export function manualVoidCheck(ev: EventRef, sel: Selection, matches: Match[], fixtures: Fixture[], today: string): { allowed: boolean; reason: string } {
  if (ev.date > today) return { allowed: true, reason: 'El partido aún no se ha jugado.' };
  const r = resolveEvent(ev, matches, fixtures);
  if (r.kind === 'aplazado') return { allowed: true, reason: 'Partido aplazado.' };
  if (r.kind === 'ambiguo') return { allowed: true, reason: 'No se puede identificar el partido sin adivinar.' };
  if (r.kind === 'cancelado') return { allowed: true, reason: 'Partido cancelado.' };
  if (r.kind === 'jugado') {
    return settleSelection(sel, r.match).status === 'sin-datos'
      ? { allowed: true, reason: 'La fuente no publicó la cifra que decide el mercado.' }
      : { allowed: false, reason: 'El partido ya tiene resultado: se liquida automáticamente.' };
  }
  return Date.parse(today) - Date.parse(ev.date) >= 14 * DIA
    ? { allowed: true, reason: 'Sin resultado 14 días después de la fecha prevista.' }
    : { allowed: false, reason: 'Todavía puede llegar el resultado: pulsa «Actualizar partidos» en su competición.' };
}
