import { describe, expect, it } from 'vitest';
import type { Fixture, Match } from '../../types';
import type { EventRef, PickRecord, Profile, Selection, TicketRecord } from '../../types/betting';
import { DEFAULT_RISK_SETTINGS } from './settings';
import { manualVoidCheck, settleProfile } from './settlement';
import { availableBalance, bankrollOf, createProfile, debitStake } from './wallet';

let n = 0;
const id = () => `id-${++n}`;
const NOW = '2026-09-21T10:00:00.000Z';

function evento(fixtureId: string, over: Partial<EventRef> = {}): EventRef {
  return {
    fixtureId,
    providerId: null,
    leagueId: 'Liga',
    season: '2026',
    date: '2026-09-20',
    kickoffTime: null,
    round: 5,
    homeTeamId: `Liga|A-${fixtureId}`,
    awayTeamId: `Liga|B-${fixtureId}`,
    homeTeamName: 'A',
    awayTeamName: 'B',
    ...over,
  };
}

function partido(ev: EventRef, over: Partial<Match> = {}): Match {
  return {
    id: ev.fixtureId,
    providerId: null,
    leagueId: ev.leagueId,
    date: ev.date,
    homeTeamId: ev.homeTeamId,
    awayTeamId: ev.awayTeamId,
    homeGoals: 2,
    awayGoals: 1,
    cornersHome: 6,
    cornersAway: 5,
    yellowCardsHome: 2,
    yellowCardsAway: 2,
    ...over,
  } as Match;
}

function conPick(p: Profile, ev: EventRef, selection: Selection, stake = 350, odds = 1.9): Profile {
  const pickId = id();
  const r = debitStake(p, stake, pickId, 'stake', NOW, id());
  if (!r.ok) throw new Error(r.error);
  const pick = { ...ev, id: pickId, cycle: p.cycle, selection, odds, stake, status: 'pendiente', resultNote: null } as PickRecord;
  return { ...r.value, picks: [...r.value.picks, pick] };
}

// 1 moneda = 100 SC y 10.000 SC de saldo: el importe mínimo es 1 SC, así las cifras de estas pruebas son enteras.
const perfil = () =>
  createProfile({ id: id(), movementId: id(), name: 'P', now: NOW, settings: { ...DEFAULT_RISK_SETTINGS, coinValue: 100, initialBankroll: 10_000 } });
const local: Selection = { market: 'resultado', outcome: 'home' };

describe('Liquidación automática con datos reales', () => {
  it('gana: el stake vuelve con la ganancia y el saldo sube', () => {
    const ev = evento('m1');
    const p = conPick(perfil(), ev, local);
    const r = settleProfile(p, [partido(ev)], [], NOW, id);
    const pick = r.profile.picks[0];
    expect(r.settled).toBe(1);
    expect(pick.status).toBe('ganado');
    expect(pick.netProfit).toBe(315);
    expect(pick.bankrollAfter).toBe(10_315);
    expect(availableBalance(r.profile)).toBe(10_315);
  });

  it('pierde: el saldo queda en 9.650', () => {
    const ev = evento('m1');
    const p = conPick(perfil(), ev, { market: 'resultado', outcome: 'away' });
    const r = settleProfile(p, [partido(ev)], [], NOW, id);
    expect(r.profile.picks[0].status).toBe('perdido');
    expect(bankrollOf(r.profile)).toBe(9_650);
  });

  it('no paga dos veces: liquidar de nuevo no cambia nada', () => {
    const ev = evento('m1');
    const primera = settleProfile(conPick(perfil(), ev, local), [partido(ev)], [], NOW, id);
    const segunda = settleProfile(primera.profile, [partido(ev)], [], NOW, id);
    expect(segunda.changed).toBe(false);
    expect(availableBalance(segunda.profile)).toBe(10_315);
  });

  it('9. pick sin resultado: sigue pendiente y el stake comprometido', () => {
    const ev = evento('m1');
    const p = conPick(perfil(), ev, local);
    const r = settleProfile(p, [partido(ev, { homeGoals: null, awayGoals: null })], [], NOW, id);
    expect(r.profile.picks[0].status).toBe('pendiente');
    expect(bankrollOf(r.profile)).toBe(10_000);
  });

  it('10. partido cancelado: anulado y reembolso', () => {
    const ev = evento('m1');
    const p = conPick(perfil(), ev, local);
    const r = settleProfile(p, [], [{ id: 'm1', status: 'Cancelado' } as Fixture], NOW, id);
    expect(r.profile.picks[0].status).toBe('anulado');
    expect(availableBalance(r.profile)).toBe(10_000);
  });

  it('12. la fuente no publicó corners: pendiente con el motivo, sin inventar', () => {
    const ev = evento('m1');
    const p = conPick(perfil(), ev, { market: 'corners', side: 'over', line: 9.5 });
    const r = settleProfile(p, [partido(ev, { cornersHome: null, cornersAway: null })], [], NOW, id);
    expect(r.profile.picks[0].status).toBe('pendiente');
    expect(r.profile.picks[0].resultNote).toContain('no publicó');
  });
});

describe('Liquidación de tickets', () => {
  function conTicket(p: Profile, legs: { ev: EventRef; selection: Selection; odds: number }[], stake = 100): Profile {
    const ticketId = id();
    const r = debitStake(p, stake, ticketId, 'stake', NOW, id());
    if (!r.ok) throw new Error(r.error);
    const ticket = {
      id: ticketId,
      number: 1,
      cycle: p.cycle,
      stake,
      status: 'pendiente',
      combinedOdds: legs.reduce((a, l) => a * l.odds, 1),
      legs: legs.map((l) => ({ ...l.ev, selection: l.selection, odds: l.odds, probability: 0.5, status: 'pendiente', matchId: null, resultNote: null })),
    } as TicketRecord;
    return { ...r.value, tickets: [...r.value.tickets, ticket] };
  }

  it('todas aciertan: retorno con la cuota combinada', () => {
    const a = evento('m1');
    const b = evento('m2');
    const p = conTicket(perfil(), [{ ev: a, selection: local, odds: 1.5 }, { ev: b, selection: { market: 'goles', side: 'over', line: 2.5 }, odds: 2 }]);
    const r = settleProfile(p, [partido(a), partido(b)], [], NOW, id);
    expect(r.profile.tickets[0].status).toBe('ganado');
    expect(r.profile.tickets[0].netProfit).toBe(200);
    expect(availableBalance(r.profile)).toBe(10_200);
  });

  it('una falla: perdido aunque la otra no se haya jugado', () => {
    const a = evento('m1');
    const b = evento('m2');
    const p = conTicket(perfil(), [{ ev: a, selection: { market: 'resultado', outcome: 'draw' }, odds: 3 }, { ev: b, selection: local, odds: 2 }]);
    const r = settleProfile(p, [partido(a)], [], NOW, id);
    expect(r.profile.tickets[0].status).toBe('perdido');
    expect(bankrollOf(r.profile)).toBe(9_900);
  });

  it('una selección cancelada sale de la cuota', () => {
    const a = evento('m1');
    const b = evento('m2');
    const p = conTicket(perfil(), [{ ev: a, selection: local, odds: 1.5 }, { ev: b, selection: local, odds: 2 }]);
    const r = settleProfile(p, [partido(a)], [{ id: 'm2', status: 'Cancelado' } as Fixture], NOW, id);
    expect(r.profile.tickets[0].status).toBe('ganado');
    expect(r.profile.tickets[0].settledOdds).toBe(1.5);
    expect(r.profile.tickets[0].netProfit).toBe(50);
  });
});

describe('Anulación manual', () => {
  const ev = evento('m1');
  it('antes del partido, sí', () => {
    expect(manualVoidCheck(ev, local, [], [], '2026-09-19').allowed).toBe(true);
  });
  it('con resultado disponible, no: se liquida solo', () => {
    expect(manualVoidCheck(ev, local, [partido(ev)], [], '2026-09-21').allowed).toBe(false);
  });
  it('recién jugado sin resultado cargado, no', () => {
    expect(manualVoidCheck(ev, local, [], [], '2026-09-22').allowed).toBe(false);
  });
  it('sin la cifra publicada o 14 días sin resultado, sí', () => {
    const sinCorners = partido(ev, { cornersHome: null });
    expect(manualVoidCheck(ev, { market: 'corners', side: 'over', line: 9.5 }, [sinCorners], [], '2026-09-21').allowed).toBe(true);
    expect(manualVoidCheck(ev, local, [], [], '2026-10-05').allowed).toBe(true);
  });
});
