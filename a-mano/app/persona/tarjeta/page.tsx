import Link from 'next/link';
import QR, { LocalhostHint } from '@/components/QR';
import { getDb } from '@/lib/db';
import { cardOf, walletSummary } from '@/lib/domain';
import { requirePersonaId } from '@/lib/me';

export const dynamic = 'force-dynamic';

export default async function MiTarjeta() {
  const personId = await requirePersonaId();
  const db = getDb();
  const card = cardOf(db, personId)!;
  const w = walletSummary(db, personId);
  return (
    <>
      <div className="brand" aria-hidden="true">A mano</div>
      <h1>Mi tarjeta</h1>
      <div className="idcard" aria-label="Tarjeta A mano">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <b style={{ fontSize: 22 }}>A mano</b>
          <span className="small" style={{ opacity: 0.9 }}>{card.status === 'activa' ? 'Activa' : card.status}</span>
        </div>
        <div>
          <div className="small" style={{ opacity: 0.85 }}>Identificador (ficticio)</div>
          <div className="code" data-testid="card-code">{card.card_code}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
          <b style={{ fontSize: 20 }}>{w.person.chosen_name}</b>
          <span className="small" style={{ opacity: 0.9 }}>{w.person.org}</span>
        </div>
      </div>
      <section className="card" aria-labelledby="qrt" style={{ display: 'grid', gap: 12 }}>
        <h2 id="qrt">Mi QR de aportes</h2>
        <p className="muted">Es el mismo de “Recibir aportes”. Sirve para que te ayuden sin pedirte datos.</p>
        <QR path={`/a/${card.public_token}`} label="Código QR público para aportar" />
        <LocalhostHint />
      </section>
      <Link className="btn btn-outline" href="/persona/tarjeta/imprimir">Ficha imprimible para tarjeta física</Link>
      <p className="small muted">Tu referente es {w.person.referente} ({w.person.org}). Si perdés la tarjeta, avisale y la da de baja.</p>
    </>
  );
}
