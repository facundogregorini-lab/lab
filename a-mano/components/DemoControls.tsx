'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function DemoControls() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const run = async (op: string) => {
    if (busy) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/demo/control', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ op }) });
      const d = await r.json();
      if (!r.ok) setMsg(d.message);
      else if (op === 'avanzar') setMsg(`Ahora es la semana ${d.clock.week} de la demo. Falta procesar las cargas.`);
      else if (op === 'procesar') {
        const c = d.result.credited.length;
        setMsg(c ? `Se procesaron ${c} cargas de la semana ${d.result.week}.` : `Semana ${d.result.week}: no había cargas nuevas (ya estaban hechas o no hay fondos).`);
      } else if (op === 'reset') setMsg('Demo restablecida: Dani vuelve a $ 15.000.');
    } catch { setMsg('No se pudo conectar con el servidor.'); }
    setBusy(false); setConfirmReset(false);
    router.refresh();
  };
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div className="row">
        <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => run('avanzar')}>1 · Avanzar una semana</button>
        <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => run('procesar')}>2 · Procesar cargas de la semana</button>
      </div>
      {!confirmReset
        ? <button type="button" className="btn btn-quiet btn-sm" style={{ justifySelf: 'start' }} onClick={() => setConfirmReset(true)}>Restablecer la demo…</button>
        : (
          <div className="row">
            <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => run('reset')}>Sí, borrar y empezar de cero</button>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => setConfirmReset(false)}>Cancelar</button>
          </div>
        )}
      <p aria-live="polite" className="small" style={{ fontWeight: 600 }}>{msg}</p>
    </div>
  );
}
