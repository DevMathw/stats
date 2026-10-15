/**
 * Validación de lo que se carga (IndexedDB o una copia JSON importada). Un registro que no cumple
 * la forma esperada se descarta con un aviso: nunca se «arregla» inventando valores.
 */
import type { BetStatus, Movement, PickRecord, Profile, TicketRecord } from '../../types/betting';
import { parseSelectionKey, selectionKey } from './markets';
import { DEFAULT_RISK_SETTINGS, validateSettings } from './settings';
import { toCoinGrid } from './coins';

const ESTADOS: BetStatus[] = ['pendiente', 'ganado', 'perdido', 'anulado'];
const num = (x: unknown) => typeof x === 'number' && Number.isFinite(x);
const str = (x: unknown) => typeof x === 'string';

function seleccionValida(s: unknown): boolean {
  if (!s || typeof s !== 'object') return false;
  try {
    return parseSelectionKey(selectionKey(s as never)) !== null;
  } catch {
    return false;
  }
}

function movimientoValido(m: Partial<Movement>): boolean {
  return str(m.id) && num(m.cycle) && str(m.at) && str(m.type) && num(m.amount) && num(m.balanceAfter);
}

function pickValido(x: Partial<PickRecord>): boolean {
  return (
    str(x.id) && str(x.fixtureId) && num(x.cycle) && seleccionValida(x.selection) && num(x.odds) && x.odds! > 1 &&
    num(x.probability) && num(x.stake) && x.stake! > 0 && ESTADOS.includes(x.status as BetStatus) && !!x.risk
  );
}

function ticketValido(t: Partial<TicketRecord>): boolean {
  return (
    str(t.id) && num(t.number) && num(t.cycle) && Array.isArray(t.legs) && t.legs.length >= 2 &&
    t.legs.every((l) => str(l.fixtureId) && seleccionValida(l.selection) && num(l.odds) && ESTADOS.includes(l.status)) &&
    num(t.combinedOdds) && num(t.stake) && t.stake! > 0 && ESTADOS.includes(t.status as BetStatus) && !!t.risk
  );
}

export function sanitizeProfile(raw: unknown, issues: string[]): Profile | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Partial<Profile>;
  if (!str(p.id) || !str(p.name) || !num(p.cycle)) {
    issues.push('Se descartó un perfil sin identificador, nombre o ciclo.');
    return null;
  }
  const settings = { ...DEFAULT_RISK_SETTINGS, ...(p.settings ?? {}) };
  // Desde el 13/09/2026 el saldo inicial y el tope por pick son múltiplos de 0.01 monedas: los guardados
  // antes se llevan a esa unidad (1 000 000 SC = 33.3333 monedas → 999 900 SC = 33.33 monedas).
  if (Number.isInteger(settings.coinValue) && settings.coinValue >= 1) {
    if (Number.isFinite(settings.initialBankroll)) settings.initialBankroll = toCoinGrid(settings.initialBankroll, settings.coinValue);
    if (typeof settings.maxStakePerPick === 'number' && Number.isFinite(settings.maxStakePerPick)) {
      settings.maxStakePerPick = toCoinGrid(settings.maxStakePerPick, settings.coinValue);
    }
  }
  const problemas = validateSettings(settings);
  const filtrar = <T>(xs: unknown, ok: (x: T) => boolean, que: string): T[] => {
    const arr = Array.isArray(xs) ? (xs as T[]) : [];
    const buenos = arr.filter(ok);
    if (buenos.length < arr.length) issues.push(`${p.name}: ${arr.length - buenos.length} ${que} con datos no válidos descartados.`);
    return buenos;
  };
  if (problemas.length) issues.push(`${p.name}: configuración de riesgo no válida, se restauró la de fábrica (${problemas[0]}).`);
  return {
    id: p.id!,
    name: p.name!,
    createdAt: str(p.createdAt) ? p.createdAt! : new Date(0).toISOString(),
    settings: problemas.length ? DEFAULT_RISK_SETTINGS : settings,
    cycle: p.cycle!,
    movements: filtrar<Movement>(p.movements, movimientoValido, 'movimientos'),
    picks: filtrar<PickRecord>(p.picks, pickValido, 'picks'),
    tickets: filtrar<TicketRecord>(p.tickets, ticketValido, 'tickets'),
    ticketCounter: num(p.ticketCounter) ? p.ticketCounter! : 0,
    ticketDraft: Array.isArray(p.ticketDraft) ? p.ticketDraft.filter((l) => str(l?.fixtureId) && seleccionValida(l?.selection)) : [],
  };
}

export interface BackupFile {
  kind: 'analisis-futbol-picks';
  version: 1;
  exportedAt: string;
  activeProfileId: string;
  profiles: Record<string, Profile>;
}

export function parseBackup(text: string): { ok: true; value: { profiles: Record<string, Profile>; activeProfileId: string; issues: string[] } } | { ok: false; error: string } {
  let data: Partial<BackupFile>;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'El archivo no es JSON.' };
  }
  if (data.kind !== 'analisis-futbol-picks' || data.version !== 1 || !data.profiles) {
    return { ok: false, error: 'No es una copia de picks de esta aplicación.' };
  }
  const issues: string[] = [];
  const profiles: Record<string, Profile> = {};
  for (const raw of Object.values(data.profiles)) {
    const p = sanitizeProfile(raw, issues);
    if (p) profiles[p.id] = p;
  }
  const ids = Object.keys(profiles);
  if (!ids.length) return { ok: false, error: 'La copia no tiene ningún perfil válido.' };
  return { ok: true, value: { profiles, activeProfileId: ids.includes(data.activeProfileId ?? '') ? data.activeProfileId! : ids[0], issues } };
}
