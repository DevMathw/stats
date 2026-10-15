import { describe, expect, it } from 'vitest';
import { normalizeTeamName, resolveTeamName } from './teamResolver';

const PREMIER = [
  'Arsenal',
  'Manchester City',
  'Manchester United',
  'Brighton & Hove Albion',
  'Nottingham Forest',
];

describe('normalizeTeamName', () => {
  it('quita acentos, mayúsculas y puntuación', () => {
    expect(normalizeTeamName('Atlético Mineiro')).toBe('atletico mineiro');
    expect(normalizeTeamName('São Paulo')).toBe('sao paulo');
    expect(normalizeTeamName('Vitória')).toBe('vitoria');
    // El punto se quita: «A.F.C.» y «AFC» tienen que normalizar igual.
    expect(normalizeTeamName('  A.F.C.  Bournemouth ')).toBe('afc bournemouth');
    expect(normalizeTeamName("Nott'm Forest")).toBe('nott m forest');
  });

  it('trata & como "and"', () => {
    expect(normalizeTeamName('Brighton & Hove Albion')).toBe('brighton and hove albion');
  });

  it('trata las letras que NFD no descompone (ı, ø) y los puntos de las siglas', () => {
    expect(normalizeTeamName('Kasımpaşa')).toBe(normalizeTeamName('Kasimpasa'));
    expect(normalizeTeamName('F.C. København')).toBe('fc kobenhavn');
    expect(normalizeTeamName('F.C. København')).toBe(normalizeTeamName('FC Kobenhavn'));
    expect(normalizeTeamName('Bodø/Glimt')).toBe('bodo glimt');
  });
});

describe('resolveTeamName', () => {
  it('acepta el nombre exacto', () => {
    expect(resolveTeamName('Arsenal', PREMIER)).toEqual({ resolved: 'Arsenal', reason: 'exact' });
  });

  it('resuelve diferencias de acento y puntuación', () => {
    const known = ['Atlético Mineiro', 'São Paulo'];
    expect(resolveTeamName('Atletico Mineiro', known).resolved).toBe('Atlético Mineiro');
    expect(resolveTeamName('Sao Paulo', known).resolved).toBe('São Paulo');
  });

  it('resuelve sufijos genéricos del proveedor', () => {
    expect(resolveTeamName('Manchester City FC', PREMIER)).toEqual({
      resolved: 'Manchester City',
      reason: 'subset',
    });
    expect(resolveTeamName('Arsenal FC', PREMIER).resolved).toBe('Arsenal');
  });

  it('NO confunde equipos que comparten palabras', () => {
    // "Manchester" solo es ambiguo: City y United empiezan igual.
    expect(resolveTeamName('Manchester', PREMIER).resolved).toBeNull();
    expect(resolveTeamName('Manchester', PREMIER).reason).toBe('ambiguous');
  });

  it('NO adivina cuando la primera palabra no coincide', () => {
    // "Betis" vs "Real Betis" se deja al usuario: adivinar aquí es como acertar por suerte.
    expect(resolveTeamName('Betis', ['Real Betis']).resolved).toBeNull();
    expect(resolveTeamName('Milan', ['Inter Milan']).resolved).toBeNull();
  });

  it('un nombre desconocido se queda sin resolver', () => {
    const r = resolveTeamName('Athletico-PR', PREMIER);
    expect(r.resolved).toBeNull();
    expect(r.reason).toBe('unknown');
  });

  it('el alias manual manda sobre todo lo demás', () => {
    const aliases = { 'athletico pr': 'Athletico Paranaense' };
    expect(resolveTeamName('Athletico-PR', ['Athletico Paranaense'], aliases)).toEqual({
      resolved: 'Athletico Paranaense',
      reason: 'alias',
    });
  });

  it('en una competición nueva se acepta el nombre entrante', () => {
    expect(resolveTeamName('Leeds United', [])).toEqual({
      resolved: 'Leeds United',
      reason: 'new',
    });
  });
});
