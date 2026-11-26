'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { act } from './api';

type Props = { stepId: string; status: string; scheduledAt: string | null; today: string; canAskHelp: boolean };

export default function StepActions({ stepId, status, scheduledAt, today, canAskHelp }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'none' | 'reprogramar' | 'reenviar' | 'ayuda' | 'cambiar'>('none');
  const [when, setWhen] = useState(scheduledAt ?? `${today}T10:00`);
  const [note, setNote] = useState('');

  const run = async (action: string, payload: Record<string, unknown> = {}, after?: string) => {
    if (busy) return;
    setBusy(action); setError(null);
    const r = await act(action, { stepId, ...payload });
    setBusy(null);
    if (!r.ok) { setError(r.message); return; }
    setMode('none'); setNote('');
    if (after) router.push(after);
    router.refresh();
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {error && <p className="card-error" role="alert">{error}</p>}

      {status === 'elegido' && (
        <button type="button" className="btn btn-primary" disabled={!!busy} onClick={() => run('yaFui')}>{busy === 'yaFui' ? 'Un momento…' : 'Ya fui'}</button>
      )}
      {status === 'pausado' && (
        <button type="button" className="btn btn-primary" disabled={!!busy} onClick={() => run('retomar')}>Retomar este paso</button>
      )}
      {status === 'revisar' && mode !== 'reenviar' && (
        <button type="button" className="btn btn-primary" onClick={() => setMode('reenviar')}>Revisar y reenviar</button>
      )}
      {mode === 'reenviar' && (
        <form className="card" style={{ display: 'grid', gap: 10 }} onSubmit={(e) => { e.preventDefault(); run('reenviar', { note }); }}>
          <label className="field">Contale a tu referente lo que faltaba
            <textarea className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
          </label>
          <button type="submit" className="btn btn-primary btn-sm" disabled={!!busy}>Reenviar</button>
        </form>
      )}

      {canAskHelp && mode !== 'ayuda' && (
        <button type="button" className="btn btn-outline" onClick={() => setMode('ayuda')}>Necesito ayuda para ir</button>
      )}
      {mode === 'ayuda' && (
        <form className="card" style={{ display: 'grid', gap: 10 }} onSubmit={(e) => { e.preventDefault(); run('pedirAyuda', { note }); }}>
          <label className="field">¿Qué necesitás para llegar? (opcional)
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Ej.: no tengo SUBE" />
          </label>
          <div className="row">
            <button type="submit" className="btn btn-primary btn-sm" disabled={!!busy}>Pedir ayuda a mi referente</button>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => setMode('none')}>Cancelar</button>
          </div>
        </form>
      )}

      {(status === 'elegido' || status === 'pausado') && (
        <div className="row">
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => setMode(mode === 'reprogramar' ? 'none' : 'reprogramar')}>Reprogramar</button>
          {status === 'elegido' && <button type="button" className="btn btn-quiet btn-sm" disabled={!!busy} onClick={() => run('pausar')}>Pausar</button>}
        </div>
      )}
      {mode === 'reprogramar' && (
        <form className="card" style={{ display: 'grid', gap: 10 }} onSubmit={(e) => { e.preventDefault(); run('reprogramar', { scheduledAt: when }); }}>
          <label className="field">Nueva fecha y hora
            <input className="input" type="datetime-local" min={`${today}T00:00`} value={when} onChange={(e) => setWhen(e.target.value)} required />
          </label>
          <p className="small muted">Reprogramar no cambia tu saldo ni tu base.</p>
          <button type="submit" className="btn btn-primary btn-sm" disabled={!!busy}>Guardar nueva fecha</button>
        </form>
      )}

      {['propuesto', 'elegido', 'pausado', 'revisar'].includes(status) && (
        mode === 'cambiar' ? (
          <div className="card" style={{ display: 'grid', gap: 10 }}>
            <p>¿Querés dejar este paso y elegir otra meta? Conservás tu base y todo lo que ya se acreditó.</p>
            <div className="row">
              <button type="button" className="btn btn-danger btn-sm" disabled={!!busy} onClick={() => run('cambiarMeta', {}, '/persona/pasos?elegir=1')}>Sí, cambiar de meta</button>
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => setMode('none')}>No, seguir</button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn btn-quiet btn-sm" style={{ justifySelf: 'start' }} onClick={() => setMode('cambiar')}>Cambiar de meta</button>
        )
      )}
    </div>
  );
}
