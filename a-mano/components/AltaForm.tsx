'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { act } from './api';
import QR from './QR';

type Org = { id: string; name: string };
type Result = { personId: string; cardCode: string; publicToken: string; chosenName: string; physicalCard: boolean };

export default function AltaForm({ orgs, defaultOrg }: { orgs: Org[]; defaultOrg: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [consent, setConsent] = useState(false);
  const [org, setOrg] = useState(defaultOrg);
  const [weeks, setWeeks] = useState('4');
  const [hasPhone, setHasPhone] = useState(false);
  const [hasDocument, setHasDocument] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Result | null>(null);

  if (done) {
    return (
      <section className="card" style={{ display: 'grid', gap: 14, maxWidth: 520 }} role="status">
        <h2>Listo: {done.chosenName} quedó acreditado</h2>
        <p>Tarjeta asignada <b style={{ fontFamily: 'ui-monospace, monospace' }}>{done.cardCode}</b>. Ya tiene su primera base semanal cargada.</p>
        <div style={{ maxWidth: 240 }}><QR path={`/a/${done.publicToken}`} label={`QR de aportes de ${done.chosenName}`} /></div>
        {done.physicalCard && <p className="small muted">Usa tarjeta física: imprimí este QR para su ficha.</p>}
        <div className="row">
          <a className="btn btn-outline btn-sm" href={`/api/demo/entrar?como=persona:${done.personId}`}>Ver su billetera (demo)</a>
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => { setDone(null); setName(''); setConsent(false); }}>Preparar otra alta</button>
          <Link className="btn btn-quiet btn-sm" href="/referente">Volver al panel</Link>
        </div>
        <p className="small muted">Dani y sus datos no cambiaron.</p>
      </section>
    );
  }

  return (
    <form
      className="card" style={{ display: 'grid', gap: 14, maxWidth: 620 }}
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true); setError(null);
        const r = await act<Result>('alta', { chosenName: name, consent, organizationId: org, weeks: Number(weeks), hasPhone, hasDocument });
        setBusy(false);
        if (!r.ok) { setError(r.message); return; }
        setDone(r.result);
        router.refresh();
      }}
    >
      <label className="field">Nombre elegido
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={40} placeholder="Cómo quiere que la llamen" autoComplete="off" />
        <span className="small muted" style={{ fontWeight: 400 }}>No hace falta nombre legal ni documento.</span>
      </label>
      <label className="field">Organización que acredita
        <select className="input" value={org} onChange={(e) => setOrg(e.target.value)}>
          {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </label>
      <label className="field">Período cubierto
        <select className="input" value={weeks} onChange={(e) => setWeeks(e.target.value)}>
          {[1, 2, 3, 4].map((w) => <option key={w} value={w}>{w} {w === 1 ? 'semana' : 'semanas'} de $ 15.000</option>)}
        </select>
      </label>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 600 }}>Situación (opcional)</legend>
        <label className="check"><input type="checkbox" checked={hasPhone} onChange={(e) => setHasPhone(e.target.checked)} /> Tiene celular propio</label>
        <label className="check"><input type="checkbox" checked={hasDocument} onChange={(e) => setHasDocument(e.target.checked)} /> Tiene su DNI a mano</label>
        <p className="small muted">Sin celular, se le asigna tarjeta física con el QR impreso.</p>
      </fieldset>
      <label className="check" style={{ background: 'var(--sage)', borderRadius: 12, padding: 12 }}>
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
        <span>La persona dio su consentimiento para sumarse al programa y para que su referente acompañe sus pasos.</span>
      </label>
      <p className="small muted">Es una acreditación social del programa, hecha por la organización. No es una validación bancaria de identidad.</p>
      {error && <p className="card-error" role="alert">{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={busy || !consent}>{busy ? 'Guardando…' : 'Acreditar y asignar tarjeta'}</button>
    </form>
  );
}
