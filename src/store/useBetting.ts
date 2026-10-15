import { create } from 'zustand';
import { persist, type PersistStorage } from 'zustand/middleware';
import type { Fixture, Match } from '../types';
import type { DraftLeg, PickRecord, Profile, RiskSettings, Selection, TicketRecord } from '../types/betting';
import { parseBackup, sanitizeProfile, type BackupFile } from '../domain/betting/backup';
import { evaluatePick, evaluateTicket, type DataContext, type ModelValidation } from '../domain/betting/evaluation';
import { selectionKey, selectionLabel } from '../domain/betting/markets';
import { manualVoidCheck, settleProfile } from '../domain/betting/settlement';
import { DEFAULT_RISK_SETTINGS, validateSettings } from '../domain/betting/settings';
import { ticketDuplicateKey } from '../domain/betting/tickets';
import {
  createProfile,
  debitStake,
  deposit as depositar,
  resetBankroll as reiniciar,
  settleAmounts,
  settlementMovement,
  validateStake,
  withoutTickets,
} from '../domain/betting/wallet';
import { formatAmount } from '../domain/betting/coins';
import { bettingSqliteStorage } from './sqliteStorage';

type Res<T = null> = { ok: true; value: T } | { ok: false; error: string };

const uuid = () => crypto.randomUUID();
const ahora = () => new Date().toISOString();

function perfilNuevo(name: string, settings: RiskSettings = DEFAULT_RISK_SETTINGS): Profile {
  return createProfile({ id: uuid(), movementId: uuid(), name, now: ahora(), settings });
}

const INICIAL = perfilNuevo('Mi perfil');

type Guardado = Pick<BettingState, 'profiles' | 'activeProfileId' | 'modelValidation'>;

/**
 * Nada se escribe hasta haber leído bien lo guardado. Si la lectura falla (una migración con error, un JSON dañado),
 * persist escribiría el perfil vacío de arranque encima de los datos: así se perdieron los picks del usuario el
 * 13/09/2026, con una versión a medias de una migración recargada en caliente. Se guarda en SQLite
 * (`bettingSqliteStorage`), que además copia la primera vez lo que había en IndexedDB.
 */
let lecturaCorrecta = false;
const sqlite = bettingSqliteStorage<Guardado>((mensaje) =>
  // Después de la lectura, que sustituye los avisos de carga.
  setTimeout(() => useBetting.setState((s) => ({ loadIssues: [...s.loadIssues, mensaje] }))),
);
const almacen: PersistStorage<Guardado> = {
  ...sqlite,
  setItem: (k, v) => (lecturaCorrecta ? sqlite.setItem(k, v) : undefined),
};

interface BettingState {
  profiles: Record<string, Profile>;
  activeProfileId: string;
  /** false hasta leer la base de datos local: la interfaz no deja operar antes. */
  hydrated: boolean;
  loadIssues: string[];
  /** Último backtest de todas las competiciones, por mercado. Alimenta el riesgo de modelo. */
  modelValidation: { at: string; leagues: number; markets: ModelValidation } | null;
  setModelValidation: (v: { at: string; leagues: number; markets: ModelValidation }) => void;

  createProfile: (name: string) => void;
  switchProfile: (id: string) => void;
  renameProfile: (name: string) => string | null;
  updateSettings: (patch: Partial<RiskSettings>) => string[];
  deposit: (amount: number) => string | null;
  resetBankroll: () => string | null;
  placePick: (input: { data: DataContext; selection: Selection; odds: number; stake: number }) => Res<string>;
  placeTicket: (input: { legs: { data: DataContext; selection: Selection; odds: number }[]; offeredOdds: number | null; stake: number }) => Res<string>;
  voidBet: (kind: 'pick' | 'ticket', id: string, matches: Match[], fixtures: Fixture[]) => string | null;
  settleFromData: (matches: Match[], fixtures: Fixture[]) => number;
  addDraftLeg: (leg: DraftLeg) => string | null;
  setDraftOdds: (index: number, odds: number | null) => void;
  removeDraftLeg: (index: number) => void;
  clearDraft: () => void;
  exportBackup: () => string;
  importBackup: (text: string) => string | null;
}

export const useBetting = create<BettingState>()(
  persist(
    (set, get) => {
      const activo = () => get().profiles[get().activeProfileId];
      const guardar = (p: Profile) => set({ profiles: { ...get().profiles, [p.id]: p } });

      return {
        profiles: { [INICIAL.id]: INICIAL },
        activeProfileId: INICIAL.id,
        hydrated: false,
        loadIssues: [],
        modelValidation: null,

        setModelValidation: (v) => set({ modelValidation: v }),

        createProfile: (name) => {
          const p = perfilNuevo(name);
          set({ profiles: { ...get().profiles, [p.id]: p }, activeProfileId: p.id });
        },

        switchProfile: (id) => {
          if (get().profiles[id]) set({ activeProfileId: id });
        },

        renameProfile: (name) => {
          if (!name.trim()) return 'El perfil necesita un nombre.';
          guardar({ ...activo(), name: name.trim() });
          return null;
        },

        updateSettings: (patch) => {
          const p = activo();
          const settings = { ...p.settings, ...patch };
          const errores = validateSettings(settings);
          if (errores.length) return errores;
          // El saldo inicial solo afecta al próximo reinicio: el ciclo en curso no se reescribe.
          guardar({ ...p, settings });
          return [];
        },

        deposit: (amount) => {
          const r = depositar(activo(), amount, ahora(), uuid());
          if (!r.ok) return r.error;
          guardar(r.value);
          return null;
        },

        resetBankroll: () => {
          const r = reiniciar(activo(), ahora(), uuid());
          if (!r.ok) return r.error;
          guardar(r.value);
          return null;
        },

        placePick: ({ data, selection, odds, stake }) => {
          const p = activo();
          // Se vuelve a evaluar aquí: la interfaz no puede registrar lo que las reglas no permiten.
          const ev = evaluatePick({ data, selection, odds, profile: p, validation: get().modelValidation?.markets });
          if (ev.stake.status !== 'recomendado' || !ev.risk || !ev.odds || ev.estimate.probability === null) {
            return { ok: false, error: ev.oddsError ?? ev.estimate.reason ?? ev.stake.reasons[0] ?? 'Pick sin valor estadístico suficiente.' };
          }
          const e = validateStake(stake, p.settings.coinValue);
          if (e) return { ok: false, error: e };
          if (stake > ev.stake.maxAllowedStake) {
            return { ok: false, error: `El máximo que permiten Kelly y los límites de riesgo es ${formatAmount(ev.stake.maxAllowedStake, p.settings)}.` };
          }
          const id = uuid();
          const now = ahora();
          const debito = debitStake(p, stake, id, `Stake · ${ev.label} · ${ev.event.homeTeamName} – ${ev.event.awayTeamName}`, now, uuid());
          if (!debito.ok) return debito;
          const pick: PickRecord = {
            ...ev.event,
            id,
            cycle: p.cycle,
            createdAt: now,
            selection,
            odds,
            probability: ev.estimate.probability,
            impliedProbability: ev.odds.impliedProbability,
            edge: ev.odds.edge!,
            fairOdds: ev.odds.fairOdds!,
            expectedValue: ev.odds.expectedValue!,
            kellyFull: ev.stake.kellyFull!,
            kellyMultiplier: ev.stake.multiplier,
            stakeFraction: stake / ev.bankroll,
            confidence: ev.estimate.confidence,
            dataQuality: ev.estimate.dataQuality,
            risk: ev.risk,
            explanation: ev.explanation,
            stake,
            bankrollBefore: ev.bankroll,
            status: 'pendiente',
            settledAt: null,
            matchId: null,
            resultNote: null,
            grossReturn: null,
            netProfit: null,
            bankrollAfter: null,
          };
          guardar({ ...debito.value, picks: [...debito.value.picks, pick] });
          return { ok: true, value: id };
        },

        placeTicket: ({ legs, offeredOdds, stake }) => {
          const p = activo();
          const ev = evaluateTicket({ legs, profile: p, offeredOdds });
          if (ev.errors.length) return { ok: false, error: ev.errors[0] };
          if (!ev.stake || ev.stake.status !== 'recomendado' || !ev.joint || !ev.risk || ev.combinedOdds === null) {
            return { ok: false, error: ev.stake?.reasons[0] ?? 'Ticket sin valor estadístico suficiente.' };
          }
          const clave = ticketDuplicateKey(legs.map((l) => ({ fixtureId: l.data.fixture.id, selection: l.selection })));
          const duplicado = p.tickets.some(
            (t) => t.status === 'pendiente' && ticketDuplicateKey(t.legs.map((l) => ({ fixtureId: l.fixtureId, selection: l.selection }))) === clave,
          );
          if (duplicado) return { ok: false, error: 'Ya tienes un ticket pendiente con exactamente estas selecciones.' };
          const e = validateStake(stake, p.settings.coinValue);
          if (e) return { ok: false, error: e };
          if (stake > ev.stake.maxAllowedStake) {
            return { ok: false, error: `El máximo que permiten Kelly y los límites de riesgo es ${formatAmount(ev.stake.maxAllowedStake, p.settings)}.` };
          }
          const id = uuid();
          const now = ahora();
          const number = p.ticketCounter + 1;
          const debito = debitStake(p, stake, id, `Stake · Ticket #${String(number).padStart(3, '0')}`, now, uuid());
          if (!debito.ok) return debito;
          const ticket: TicketRecord = {
            id,
            number,
            cycle: p.cycle,
            createdAt: now,
            legs: ev.legs.map((l) => ({
              ...l.event,
              selection: l.selection,
              odds: l.odds!,
              probability: l.estimate.probability!,
              status: 'pendiente',
              matchId: null,
              resultNote: null,
            })),
            combinedOdds: ev.combinedOdds,
            probability: ev.joint.probability,
            probabilityLow: ev.joint.low,
            probabilityHigh: ev.joint.high,
            method: ev.joint.method,
            kellyProbability: ev.kellyProbability!,
            kellyFull: ev.stake.kellyFull!,
            stake,
            bankrollBefore: ev.bankroll,
            risk: ev.risk,
            status: 'pendiente',
            settledAt: null,
            settledOdds: null,
            grossReturn: null,
            netProfit: null,
            bankrollAfter: null,
          };
          guardar({ ...debito.value, tickets: [...debito.value.tickets, ticket], ticketCounter: number, ticketDraft: [] });
          return { ok: true, value: id };
        },

        voidBet: (kind, id, matches, fixtures) => {
          const p = activo();
          const hoy = ahora().slice(0, 10);
          const bet = kind === 'pick' ? p.picks.find((x) => x.id === id) : p.tickets.find((x) => x.id === id);
          if (!bet || bet.status !== 'pendiente') return 'Solo se puede anular una apuesta pendiente.';
          const eventos = kind === 'pick' ? [bet as PickRecord] : (bet as TicketRecord).legs.filter((l) => l.status === 'pendiente');
          for (const ev of eventos) {
            const c = manualVoidCheck(ev, ev.selection, matches, fixtures, hoy);
            if (!c.allowed) return c.reason;
          }
          const now = ahora();
          const { grossReturn } = settleAmounts(bet.stake, 1, 'anulado', p.settings.coinValue);
          let q = settlementMovement(p, 'anulado', grossReturn, id, 'Anulado a mano: stake devuelto', now, uuid());
          const cierre = { status: 'anulado' as const, settledAt: now, grossReturn, netProfit: 0, bankrollAfter: null };
          q =
            kind === 'pick'
              ? { ...q, picks: q.picks.map((x) => (x.id === id ? { ...x, ...cierre, resultNote: 'Anulado a mano' } : x)) }
              : { ...q, tickets: q.tickets.map((x) => (x.id === id ? { ...x, ...cierre, settledOdds: 1 } : x)) };
          guardar(q);
          return null;
        },

        settleFromData: (matches, fixtures) => {
          let total = 0;
          let cambio = false;
          const profiles = { ...get().profiles };
          for (const [pid, prof] of Object.entries(profiles)) {
            const r = settleProfile(prof, matches, fixtures, ahora(), uuid);
            if (r.changed) {
              profiles[pid] = r.profile;
              cambio = true;
              total += r.settled;
            }
          }
          if (cambio) set({ profiles });
          return total;
        },

        addDraftLeg: (leg) => {
          const p = activo();
          if (p.ticketDraft.some((l) => l.fixtureId === leg.fixtureId && selectionKey(l.selection) === selectionKey(leg.selection))) {
            return 'Esa selección ya está en el ticket.';
          }
          if (p.ticketDraft.length >= 10) return 'Un ticket admite como mucho 10 selecciones.';
          guardar({ ...p, ticketDraft: [...p.ticketDraft, leg] });
          return null;
        },

        setDraftOdds: (index, odds) => {
          const p = activo();
          guardar({ ...p, ticketDraft: p.ticketDraft.map((l, i) => (i === index ? { ...l, odds } : l)) });
        },

        removeDraftLeg: (index) => {
          const p = activo();
          guardar({ ...p, ticketDraft: p.ticketDraft.filter((_, i) => i !== index) });
        },

        clearDraft: () => guardar({ ...activo(), ticketDraft: [] }),

        exportBackup: () => {
          const s = get();
          const file: BackupFile = {
            kind: 'analisis-futbol-picks',
            version: 1,
            exportedAt: ahora(),
            activeProfileId: s.activeProfileId,
            profiles: s.profiles,
          };
          return JSON.stringify(file, null, 1);
        },

        importBackup: (text) => {
          const r = parseBackup(text);
          if (!r.ok) return r.error;
          set({ profiles: r.value.profiles, activeProfileId: r.value.activeProfileId, loadIssues: r.value.issues });
          return null;
        },
      };
    },
    {
      name: 'analisis-futbol-picks',
      // v2 (13/09/2026): se vacían los tickets para empezar de nuevo con las monedas. Los picks se conservan.
      // v3 (13/09/2026): sin cambios de forma. El ajuste del perfil del usuario (saldo inicial de 33.33 monedas,
      // sin sus dos depósitos) se aplicó con una copia recuperada e importada. PICKS_METHODOLOGY.md §6.
      version: 3,
      migrate: (persisted, version) => {
        const s = persisted as { profiles?: Record<string, Profile> } | undefined;
        if (version < 2 && s?.profiles && typeof s.profiles === 'object') {
          for (const [pid, p] of Object.entries(s.profiles)) {
            if (p && typeof p === 'object' && Array.isArray(p.movements)) {
              s.profiles[pid] = withoutTickets({ ...p, tickets: Array.isArray(p.tickets) ? p.tickets : [] });
            }
          }
        }
        return s as never;
      },
      storage: almacen,
      partialize: (s) => ({ profiles: s.profiles, activeProfileId: s.activeProfileId, modelValidation: s.modelValidation }),
      merge: (persisted, current) => {
        const raw = persisted as Partial<BettingState> | undefined;
        if (!raw?.profiles) return current;
        const issues: string[] = [];
        const profiles: Record<string, Profile> = {};
        for (const x of Object.values(raw.profiles)) {
          const p = sanitizeProfile(x, issues);
          if (p) profiles[p.id] = p;
        }
        const ids = Object.keys(profiles);
        if (!ids.length) return { ...current, loadIssues: ['No se pudo leer ningún perfil guardado: se empezó uno nuevo.'] };
        const v = raw.modelValidation;
        return {
          ...current,
          profiles,
          activeProfileId: ids.includes(raw.activeProfileId ?? '') ? raw.activeProfileId! : ids[0],
          modelValidation: v && typeof v.at === 'string' && v.markets && typeof v.markets === 'object' ? v : null,
          loadIssues: issues,
        };
      },
      onRehydrateStorage: () => (_state, error) => {
        // Antes del setState, que ya guarda: con un error de lectura no se escribe nada.
        lecturaCorrecta = !error;
        useBetting.setState({
          hydrated: true,
          ...(error
            ? { loadIssues: [`No se pudieron leer los picks guardados (${String(error)}). Para no borrarlos, ningún cambio se guardará hasta que recargues.`] }
            : {}),
        });
      },
    },
  ),
);

/** Perfil activo. */
export function useActiveProfile(): Profile {
  return useBetting((s) => s.profiles[s.activeProfileId]);
}

export { selectionLabel };
