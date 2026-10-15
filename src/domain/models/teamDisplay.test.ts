import { describe, expect, it } from 'vitest';
import type { OfficialTeam } from '../../data/officialTeams';
import { crestSrc, displayOf, officialTeam, teamDisplay } from './teamDisplay';

describe('teamDisplay', () => {
  it('usa el nombre y el escudo oficiales cuando el club los tiene', () => {
    const d = teamDisplay('espn-86', 'Real Madrid CF');
    expect(d.official).toBe(true);
    expect(d.name).toBe(officialTeam('espn-86')?.name);
    expect(d.crestUrl).toMatch(/^https:\/\/img\.uefa\.com\//);
    expect(d.source).toBe('UEFA');
  });

  it('sin entrada oficial se queda con el nombre de los datos y sin escudo', () => {
    expect(teamDisplay('espn-999999999', 'Equipo X')).toEqual({
      name: 'Equipo X',
      crestUrl: null,
      official: false,
      source: null,
    });
    expect(teamDisplay(null, 'Equipo X').name).toBe('Equipo X');
  });

  it('con un escudo de fuente secundaria muestra el escudo, pero no presenta su nombre como oficial', () => {
    const secundaria: OfficialTeam = {
      espnId: '1',
      name: 'Nombre de FotMob',
      shortName: 'FotMob',
      crestUrl: 'https://images.fotmob.com/image_resources/logo/teamlogo/1.png',
      country: 'DEN',
      source: 'FotMob',
      secondary: true,
      sourceTeamId: '1',
      sourceUrl: 'https://www.fotmob.com/api/data/leagues?id=46',
    };
    expect(displayOf(secundaria, 'Brøndby IF')).toEqual({
      name: 'Brøndby IF',
      crestUrl: secundaria.crestUrl,
      official: false,
      source: 'FotMob',
    });
  });

  it('un club de una liga que ESPN no tiene (Ekstraklasa) encuentra su escudo por su clave en la competición', () => {
    const polaco = officialTeam(null, 'Ekstraklasa|Legia Warszawa');
    expect(polaco?.crestUrl).toMatch(/^https:\/\/images\.fotmob\.com\//);
    expect(teamDisplay(null, 'Legia', 'Ekstraklasa|Equipo que no existe').crestUrl).toBeNull();
  });

  /*
   * Clubes que ya NO juegan la competición: descendieron, no están en la plantilla actual de ESPN y por
   * eso no tienen ni tendrán referencia global (en Configuración > Equipos no hay a quién enlazarlos).
   * Desde el 12/10/2026 el escudo se busca por su nombre dentro de su propia competición, con los
   * clubes que la fuente publicó en las últimas temporadas.
   */
  it('un club descendido tiene escudo aunque no tenga referencia global', () => {
    for (const [liga, nombre] of [
      ['LaLiga', 'Almería'],
      ['LaLiga', 'Cádiz'],
      ['Premier League', 'Southampton'],
      ['Serie A', 'Salernitana'],
      ['Bundesliga', 'VfL Bochum'],
    ] as const) {
      const d = teamDisplay(null, nombre, `${liga}|${nombre}`);
      expect(d.crestUrl, `${liga} / ${nombre}`).toMatch(/^https:\/\/images\.fotmob\.com\//);
      // Es fuente secundaria: da escudo, nunca el nombre oficial.
      expect(d.official).toBe(false);
      expect(d.name).toBe(nombre);
    }
  });

  it('empareja aunque la fuente escriba el club de otra forma', () => {
    // El libro histórico dice «Girona FC» y FotMob «Girona».
    expect(teamDisplay(null, 'Girona FC', 'LaLiga|Girona FC').crestUrl).toMatch(/^https:\/\/images\.fotmob\.com\//);
  });

  it('no le da el escudo de otro club de su liga', () => {
    // «Brujas» a secas no puede decidir entre Club Brujas y Cercle Brujas: sin escudo antes que uno falso.
    expect(teamDisplay(null, 'Brujas', 'Belgian Pro League|Brujas').crestUrl).toBeNull();
    // Y un club que nunca jugó esa competición no saca escudo de ninguna parte.
    expect(teamDisplay(null, 'Real Madrid', 'Eliteserien|Real Madrid').crestUrl).toBeNull();
  });

  it('el escudo siempre se pide a la caché local, nunca directo al CDN', () => {
    expect(crestSrc('https://img.uefa.com/a b.png')).toBe('/api/crest?u=https%3A%2F%2Fimg.uefa.com%2Fa%20b.png');
  });
});
