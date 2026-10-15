import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { teamDisplay } from '../../domain/models/teamDisplay';
import { Button, Field, inputClass } from '../ui';
import { toast } from '../Toast';

/**
 * Alta manual de un partido pendiente.
 *
 * La hoja PARTIDOS PENDIENTES del libro está vacía y el proveedor externo exige un id de
 * temporada por liga; sin este formulario no habría forma de ver una proyección.
 */
export function FixtureForm() {
  const leagues = useStore((s) => s.leagues);
  const teams = useStore((s) => s.derived.teams);
  const addFixture = useStore((s) => s.addFixture);

  const [leagueId, setLeagueId] = useState('');
  const [date, setDate] = useState('');
  const [round, setRound] = useState('');
  const [home, setHome] = useState('');
  const [away, setAway] = useState('');
  const [error, setError] = useState<string | null>(null);

  const leagueTeams = useMemo(() => teams.filter((t) => t.leagueId === leagueId), [teams, leagueId]);

  const submit = () => {
    if (!leagueId || !date || !round || !home || !away) {
      setError('Completa liga, fecha, jornada y los dos equipos.');
      return;
    }
    const n = Number(round);
    if (!Number.isInteger(n) || n < 1) {
      setError('La jornada debe ser un número entero (1, 2, 3…), no "J5".');
      return;
    }
    const err = addFixture({ leagueId, date, round: n, homeTeamName: home, awayTeamName: away });
    setError(err);
    if (!err) {
      toast(`${home} – ${away} añadido a pendientes.`);
      setHome('');
      setAway('');
    }
  };

  return (
    <details className="group border-b border-border bg-surface-2">
      <summary className="flex min-h-10 items-center gap-2 px-4 py-2 text-[13px] font-medium text-muted transition-colors hover:text-text [&::-webkit-details-marker]:hidden">
        <Plus size={14} className="transition-transform group-open:rotate-45" aria-hidden /> Añadir un partido pendiente a mano
      </summary>
      <div className="px-4 pb-3">
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Liga">
            <select
              className={inputClass}
              value={leagueId}
              onChange={(e) => {
                setLeagueId(e.target.value);
                setHome('');
                setAway('');
              }}
            >
              <option value="">Elegir…</option>
              {leagues.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Fecha">
            <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>

          <Field label="Jornada">
            <input type="number" min={1} step={1} placeholder="7" className={`${inputClass} w-20 text-right tabular-nums`} value={round} onChange={(e) => setRound(e.target.value)} />
          </Field>

          <Field label="Local">
            <select className={inputClass} value={home} disabled={!leagueId} onChange={(e) => setHome(e.target.value)}>
              <option value="">Elegir…</option>
              {leagueTeams.map((t) => (
                <option key={t.id} value={t.name}>
                  {teamDisplay(t.ref, t.name).name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Visitante">
            <select className={inputClass} value={away} disabled={!leagueId} onChange={(e) => setAway(e.target.value)}>
              <option value="">Elegir…</option>
              {leagueTeams.map((t) => (
                <option key={t.id} value={t.name}>
                  {teamDisplay(t.ref, t.name).name}
                </option>
              ))}
            </select>
          </Field>

          <Button onClick={submit}>
            <Plus size={14} aria-hidden /> Añadir
          </Button>
        </div>
        {error && <p className="mt-2 text-[12px] text-negative-text">{error}</p>}
      </div>
    </details>
  );
}
