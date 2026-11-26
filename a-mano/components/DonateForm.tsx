'use client';
import { useState } from 'react';
import { money } from '@/lib/format';
import { newKey } from './api';

const PRESETS = [1000, 2000, 5000];

export default function DonateForm({ token, name }: { token: string; name: string }) {
  const [amount, setAmount] = useState<number | null>(2000);
  const [other, setOther] = useState('');
  const [key, setKey] = useState(() => newKey());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const value = other ? Number(other) : amount;
  const valid = typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 100000;

  if (done) {
    return (
      <section className="card-sage" role="status" style={{ display: 'grid', gap: 12 }}>
        <h2>¡Gracias! Acreditamos {money(done)} a {name}.</h2>
        <p>Ya lo puede usar en los comercios adheridos.</p>
        <button type="button" className="btn btn-outline" onClick={() => { setDone(null); setKey(newKey()); setOther(''); setAmount(2000); }}>Hacer otro aporte de prueba</button>
      </section>
    );
  }

  return (
    <form
      className="card" style={{ display: 'grid', gap: 14 }}
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy || !valid) return;
        setBusy(true); setError(null);
        try {
          const r = await fetch('/api/publico/aporte', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, amount: value, idempotencyKey: key }) });
          const d = await r.json();
          if (!r.ok) setError(d.message || 'No se pudo hacer el aporte.');
          else setDone(d.credited);
        } catch { setError('Sin conexión. Probá de nuevo: no se va a acreditar dos veces.'); }
        setBusy(false);
      }}
    >
      <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 10 }}>
        <legend style={{ fontWeight: 700, marginBottom: 8 }}>Elegí un monto</legend>
        <div className="chips">
          {PRESETS.map((p) => (
            <button key={p} type="button" className="chip" aria-pressed={!other && amount === p} onClick={() => { setAmount(p); setOther(''); }}>{money(p)}</button>
          ))}
        </div>
        <label className="field">Otro monto
          <input className="input" inputMode="numeric" pattern="[0-9]*" placeholder="Ej.: 3000" value={other}
            onChange={(e) => setOther(e.target.value.replace(/\D/g, '').slice(0, 6))} aria-describedby="tope" />
        </label>
        <span id="tope" className="small muted">Números enteros, hasta $ 100.000.</span>
      </fieldset>
      <div className="total"><span>Se acredita</span><span data-testid="a-acreditar">{valid ? money(value!) : '—'}</span></div>
      <p className="small muted">La demo acredita el 100 % del aporte.</p>
      {error && <p className="card-error" role="alert">{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={busy || !valid} aria-busy={busy}>{busy ? 'Confirmando…' : 'Confirmar aporte de prueba'}</button>
    </form>
  );
}
