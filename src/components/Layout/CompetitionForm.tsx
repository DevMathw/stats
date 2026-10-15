import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Button, Field, inputClass } from '../ui';
import { toast } from '../Toast';

/**
 * Alta de una competición que no está en la hoja LIGAS (Championship, competiciones UEFA…).
 *
 * Los ids de torneo y temporada NO se adivinan: los escribe el usuario tras mirarlos en el
 * proveedor. Una competición sin ellos se omite al sincronizar y se informa como omitida.
 */
export function CompetitionForm() {
  const addLeague = useStore((s) => s.addLeague);
  const setCompetitionId = useStore((s) => s.setCompetitionId);
  const setSeasonId = useStore((s) => s.setSeasonId);

  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [season, setSeason] = useState('2026/27');
  const [confederation, setConfederation] = useState('UEFA');
  const [tournamentId, setTid] = useState('');
  const [seasonId, setSid] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const err = addLeague({
      id: name.trim(),
      name: name.trim(),
      country: country.trim(),
      confederation: confederation.trim(),
      season: season.trim(),
      calendarFormat: '',
      teamCount: null,
      regularSeasonRounds: null,
      approximateStartDate: null,
      source: 'Añadida a mano',
      reliabilityNotes: null,
    });
    setError(err);
    if (err) return;
    if (tournamentId.trim()) setCompetitionId(name.trim(), tournamentId.trim());
    if (seasonId.trim()) setSeasonId(name.trim(), seasonId.trim());
    toast(`${name.trim()} añadida a Competiciones.`);
    setName('');
    setTid('');
    setSid('');
  };

  return (
    <div className="mb-4 rounded-card border border-border bg-surface-2 p-3">
      <p className="mb-2 text-[12px] font-semibold">Añadir competición</p>
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Nombre">
          <input className={`${inputClass} w-52`} placeholder="Championship" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="País / ámbito">
          <input className={`${inputClass} w-36`} placeholder="Inglaterra" value={country} onChange={(e) => setCountry(e.target.value)} />
        </Field>
        <Field label="Confederación">
          <input className={`${inputClass} w-28`} value={confederation} onChange={(e) => setConfederation(e.target.value)} />
        </Field>
        <Field label="Temporada">
          <input className={`${inputClass} w-24`} value={season} onChange={(e) => setSeason(e.target.value)} />
        </Field>
        <Field label="Código">
          <input className={`${inputClass} w-24 text-right`} placeholder="ELC" value={tournamentId} onChange={(e) => setTid(e.target.value)} />
        </Field>
        <Field label="Id temporada">
          <input className={`${inputClass} w-28 text-right tabular-nums`} placeholder="—" value={seasonId} onChange={(e) => setSid(e.target.value)} />
        </Field>
        <Button onClick={submit} disabled={!name.trim()}>
          <Plus size={14} aria-hidden /> Añadir
        </Button>
      </div>
      {error && <p className="mt-2 text-[12px] text-negative-text">{error}</p>}
    </div>
  );
}
