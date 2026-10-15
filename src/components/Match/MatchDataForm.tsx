import { useMemo, useState } from 'react';
import { PencilLine } from 'lucide-react';
import { Button, Callout, Field, IconButton, Modal, inputClass } from '../ui';
import { toast } from '../Toast';
import { useStore } from '../../store/useStore';
import { hasResult } from '../../domain/calculations/matchDerived';
import {
  MANUAL_FIELDS,
  MATCH_DATA,
  errorsForChanges,
  matchDataValues,
  missingMatchData,
  validateMatchData,
  type ManualField,
  type MatchDataValues,
} from '../../domain/models/matchDataRules';
import type { Match } from '../../types';

/** Del modelo al campo: la posesión se escribe en %; vacío es «sin dato». */
const aTexto = (k: ManualField, v: number | null) =>
  v === null ? '' : k === 'possessionHome' ? String(Math.round(v * 1000) / 10) : String(v);

/** Del campo al modelo, con coma o punto decimal. Lo que no es un número queda NaN y la validación lo dice. */
function aNumero(k: ManualField, s: string): number | null {
  const t = s.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return k === 'possessionHome' && Number.isFinite(n) ? n / 100 : n;
}

/**
 * Botón de la tabla de Partidos: los datos del partido escritos a mano, para lo que ninguna fuente publica.
 *
 * Antes se bloqueaba sin marcador, porque las reglas comparaban con los goles. El efecto era que un partido
 * disputado cuya fuente no publicó el resultado no se podía arreglar por ningún sitio, y sin resultado no
 * cuenta en ninguna cifra. Ahora el marcador es uno de los datos que se escriben, y las reglas usan el que
 * se esté escribiendo.
 */
export function MatchDataAction({ match }: { match: Match }) {
  const [open, setOpen] = useState(false);
  const label = 'Escribir datos del partido a mano';
  const faltan = missingMatchData(match);
  return (
    <>
      <IconButton
        icon={<PencilLine size={16} />}
        label={label}
        tooltip={
          hasResult(match)
            ? faltan.length
              ? `Faltan ${faltan.length} de ${MATCH_DATA.length} datos (${faltan.join(', ')}): escríbelos a mano`
              : `Están los ${MATCH_DATA.length} datos. Puedes corregirlos a mano`
            : 'Sin marcador: este partido no cuenta en ninguna cifra hasta que lo tenga'
        }
        tone={faltan.length ? 'accent' : undefined}
        onClick={() => setOpen(true)}
      />
      {open && <MatchDataForm match={match} onClose={() => setOpen(false)} />}
    </>
  );
}

function MatchDataForm({ match, onClose }: { match: Match; onClose: () => void }) {
  const setMatchData = useStore((s) => s.setMatchData);
  const setMatchDate = useStore((s) => s.setMatchDate);
  const [fecha, setFecha] = useState(match.date);
  const inicial = useMemo(() => {
    const v = matchDataValues(match);
    return Object.fromEntries(MANUAL_FIELDS.map((k) => [k, aTexto(k, v[k])])) as Record<ManualField, string>;
  }, [match]);
  const [texto, setTexto] = useState(inicial);

  const valores = Object.fromEntries(MANUAL_FIELDS.map((k) => [k, aNumero(k, texto[k])])) as MatchDataValues;
  const errores = validateMatchData(valores, { home: match.homeGoals, away: match.awayGoals });
  const cambios = MANUAL_FIELDS.filter((k) => texto[k].trim() !== inicial[k]);
  const bloquean = errorsForChanges(errores, cambios);
  const manual = new Set(match.manualFields ?? []);
  const faltan = missingMatchData(match);
  const posesionVisitante =
    valores.possessionHome !== null && Number.isFinite(valores.possessionHome) ? String(Math.round((1 - valores.possessionHome) * 1000) / 10) : '—';

  const cambiaFecha = fecha !== match.date;
  const total = cambios.length + (cambiaFecha ? 1 : 0);

  const guardar = () => {
    // Las cifras primero: no cambian el `id`, así que la fecha sigue sabiendo a qué partido va.
    if (cambios.length) {
      const error = setMatchData(match.id, Object.fromEntries(cambios.map((k) => [k, valores[k]])));
      if (error) {
        toast(error, 'error');
        return;
      }
    }
    if (cambiaFecha) {
      const error = setMatchDate(match.id, fecha);
      if (error) {
        toast(error, 'error');
        return;
      }
    }
    toast(`${match.homeTeamName} – ${match.awayTeamName}: ${total === 1 ? '1 dato guardado' : `${total} datos guardados`} como «Manual».`);
    onClose();
  };

  const campo = (k: ManualField, equipo: string, dato: string) => (
    <td className="px-1 py-1 align-top">
      <input
        type="text"
        inputMode="decimal"
        aria-label={`${dato} · ${equipo}`}
        aria-invalid={errores[k] ? true : undefined}
        placeholder="N/D"
        className={`${inputClass} w-full min-w-20 text-right tabular-nums`}
        value={texto[k]}
        onChange={(e) => setTexto((t) => ({ ...t, [k]: e.target.value }))}
      />
      {errores[k] ? (
        <p className={`mt-0.5 text-[11px] ${bloquean[k] ? 'text-negative-text' : 'text-warning-text'}`}>{bloquean[k] ? errores[k] : `Dato guardado dudoso: ${errores[k]}`}</p>
      ) : (
        manual.has(k) && <p className="mt-0.5 text-[11px] text-faint">Manual</p>
      )}
    </td>
  );

  const hayBloqueo = Object.keys(bloquean).length > 0;
  return (
    <Modal
      open
      onClose={onClose}
      title="Datos del partido"
      subtitle={`${match.homeTeamName} ${hasResult(match) ? `${match.homeGoals}-${match.awayGoals}` : 'vs'} ${match.awayTeamName} · ${match.date}`}
    >
      <div className="space-y-4 p-4">
        <Callout
          tone={faltan.length ? 'warning' : 'accent'}
          title={faltan.length ? `Faltan ${faltan.length} de ${MATCH_DATA.length}: ${faltan.join(', ')}` : `Están los ${MATCH_DATA.length} datos`}
        >
          Escribe solo lo que hayas comprobado en una fuente. Vacío es «sin dato», nunca 0. Lo que escribas queda marcado como «Manual» y ninguna
          actualización lo sustituye; si lo borras, la fuente puede volver a llenarlo.
        </Callout>
        {/* La fecha va aparte de la tabla: no es una cifra del partido, es cuándo se jugó. */}
        <Field
          label="Fecha en que se jugó"
          hint={
            cambiaFecha
              ? `Estaba guardado el ${match.date}. La fecha ordena las jornadas y la forma reciente.`
              : 'Cámbiala solo si la fuente dejó la fecha en la que el partido estaba previsto y se aplazó.'
          }
        >
          <input type="date" className={`${inputClass} w-44 tabular-nums`} value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </Field>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-[11px] text-muted">
                <th scope="col" className="py-1 pr-3 text-left font-medium">Dato</th>
                <th scope="col" className="px-1 py-1 text-right font-medium">Local · {match.homeTeamName}</th>
                <th scope="col" className="px-1 py-1 text-right font-medium">Visitante · {match.awayTeamName}</th>
              </tr>
            </thead>
            <tbody>
              {MATCH_DATA.map((d) => (
                <tr key={d.name} className="border-t border-border">
                  <th scope="row" className="py-1 pr-3 text-left align-top font-medium whitespace-nowrap">
                    <span className="inline-flex min-h-8 items-center">{d.label}</span>
                  </th>
                  {campo(d.home, match.homeTeamName, d.label)}
                  {d.away ? (
                    campo(d.away, match.awayTeamName, d.label)
                  ) : (
                    <td className="px-1 py-1 text-right align-top text-muted tabular-nums">
                      <span className="inline-flex min-h-8 items-center" title="La posesión del visitante es el resto hasta 100">
                        {posesionVisitante}
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="mr-auto text-[12px] text-muted">{total ? `${total} ${total === 1 ? 'dato cambiado' : 'datos cambiados'}` : 'Sin cambios'}</span>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={guardar}
            disabled={total === 0 || hayBloqueo}
            title={hayBloqueo ? 'Corrige los datos marcados en rojo' : total === 0 ? 'No has cambiado ningún dato' : undefined}
          >
            Guardar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
