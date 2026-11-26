'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { money } from '@/lib/format';
import { act } from './api';

type T = { id: string; short_title: string; amount: number; action_title: string };

export default function StepChooser({ templates }: { templates: T[] }) {
  const router = useRouter();
  const [choice, setChoice] = useState(templates[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [proposing, setProposing] = useState(false);

  const run = async (action: string, payload: Record<string, unknown>) => {
    if (busy) return;
    setBusy(true); setError(null);
    const r = await act(action, payload);
    if (!r.ok) { setError(r.message); setBusy(false); return; }
    router.push('/persona/pasos');
    router.refresh();
  };

  return (
    <>
      <form onSubmit={(e) => { e.preventDefault(); run('elegirPaso', { templateId: choice }); }} style={{ display: 'grid', gap: 18 }}>
        <fieldset className="choices">
          <legend className="sr-only">Pasos disponibles</legend>
          {templates.map((t) => (
            <label key={t.id} className="choice">
              <input type="radio" name="paso" value={t.id} checked={choice === t.id} onChange={() => setChoice(t.id)} />
              <span className="t">{t.short_title}<span className="small muted" style={{ display: 'block', fontWeight: 500 }}>{t.action_title}</span></span>
              <span className="amt">+ {money(t.amount)}</span>
            </label>
          ))}
        </fieldset>
        <p style={{ textAlign: 'center' }}>Tu base semanal está asegurada.</p>
        {error && <p className="card-error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy || !choice}>{busy ? 'Un momento…' : 'Elegir este paso'}</button>
      </form>

      <section className="card" style={{ display: 'grid', gap: 12 }}>
        {!proposing ? (
          <>
            <h2 style={{ fontSize: 19 }}>¿Tenés otro paso en mente?</h2>
            <p className="muted">Proponelo y lo acordás con tu referente: qué hacer, dónde y cuánto suma.</p>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setProposing(true)}>Proponer un paso propio</button>
          </>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); run('proponerPaso', { title, detail }); }} style={{ display: 'grid', gap: 12 }}>
            <h2 style={{ fontSize: 19 }}>Proponer un paso propio</h2>
            <label className="field">¿Qué querés hacer?
              <input className="input" value={title} maxLength={80} required minLength={3} onChange={(e) => setTitle(e.target.value)} placeholder="Ej.: Ir a un taller de oficios" />
            </label>
            <label className="field">Algo más que quieras contar (opcional)
              <textarea className="input" value={detail} maxLength={300} onChange={(e) => setDetail(e.target.value)} />
            </label>
            <div className="row">
              <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>Enviar a mi referente</button>
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => setProposing(false)}>Cancelar</button>
            </div>
          </form>
        )}
      </section>
    </>
  );
}
