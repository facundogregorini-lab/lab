'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { act } from './api';

type Props = {
  action: string; payload: Record<string, unknown>; field: string; label: string; button: string; submit: string;
  placeholder?: string; className?: string;
};

/** Botón que despliega un campo de texto obligatorio y envía la acción (pedir información, resolver traslado). */
export default function NoteAction({ action, payload, field, label, button, submit, placeholder, className = 'btn btn-quiet btn-sm' }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!open) return <button type="button" className={className} onClick={() => setOpen(true)}>{button}</button>;
  return (
    <form
      style={{ display: 'grid', gap: 8, width: '100%' }}
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true); setError(null);
        const r = await act(action, { ...payload, [field]: text });
        setBusy(false);
        if (!r.ok) { setError(r.message); return; }
        setOpen(false); setText('');
        router.refresh();
      }}
    >
      <label className="field">{label}
        <textarea className="input" required minLength={3} maxLength={300} value={text} placeholder={placeholder} onChange={(e) => setText(e.target.value)} />
      </label>
      {error && <p className="card-error" role="alert">{error}</p>}
      <div className="row">
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>{submit}</button>
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => setOpen(false)}>Cancelar</button>
      </div>
    </form>
  );
}
