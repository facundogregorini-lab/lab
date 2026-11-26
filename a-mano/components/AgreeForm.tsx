'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { act } from './api';

export default function AgreeForm({ stepId, today }: { stepId: string; today: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState('2000');
  const [action, setAction] = useState('');
  const [place, setPlace] = useState('');
  const [when, setWhen] = useState(`${today}T10:00`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      style={{ display: 'grid', gap: 8 }}
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true); setError(null);
        const r = await act('acordar', { stepId, amount: Number(amount), action, place, scheduledAt: when });
        setBusy(false);
        if (!r.ok) { setError(r.message); return; }
        router.refresh();
      }}
    >
      <label className="field">Acción verificable
        <input className="input" value={action} onChange={(e) => setAction(e.target.value)} placeholder="Ej.: Asistir a la primera clase" maxLength={120} />
      </label>
      <div className="row">
        <label className="field" style={{ flex: '1 1 120px' }}>Extra ($)
          <input className="input" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} />
        </label>
        <label className="field" style={{ flex: '2 1 200px' }}>Fecha
          <input className="input" type="datetime-local" min={`${today}T00:00`} value={when} onChange={(e) => setWhen(e.target.value)} />
        </label>
      </div>
      <label className="field">Lugar
        <input className="input" value={place} onChange={(e) => setPlace(e.target.value)} maxLength={120} placeholder="Ej.: Taller (ficticio) · Barracas" />
      </label>
      <p className="small muted">Hasta $ 5.000 por paso propio.</p>
      {error && <p className="card-error" role="alert">{error}</p>}
      <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>Acordar paso</button>
    </form>
  );
}
