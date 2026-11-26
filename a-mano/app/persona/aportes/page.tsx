import Link from 'next/link';
import { BackIcon } from '@/components/Icons';
import QR, { LocalhostHint } from '@/components/QR';
import ShareLink from '@/components/ShareLink';
import { getDb } from '@/lib/store';
import { cardOf, movements } from '@/lib/domain';
import { dateLabel, money } from '@/lib/format';
import { requirePersonaId } from '@/lib/me';

export const dynamic = 'force-dynamic';

export default async function RecibirAportes() {
  const personId = await requirePersonaId();
  const db = (await getDb());
  const card = cardOf(db, personId)!;
  const path = `/a/${card.public_token}`;
  const aportes = movements(db, personId).filter((m) => m.kind === 'aporte');
  return (
    <>
      <Link href="/persona" className="back"><BackIcon /> Inicio</Link>
      <div>
        <h1>Recibir aportes</h1>
        <p className="lead">Quien quiera ayudarte escanea este código. Solo ve tu nombre elegido: nunca tu saldo ni tus movimientos.</p>
      </div>
      <QR path={path} label="Código QR para aportar" />
      <LocalhostHint />
      <ShareLink path={path} />
      <section className="card" aria-labelledby="rec">
        <h2 id="rec">Aportes recibidos</h2>
        {aportes.length === 0 ? <p className="muted" style={{ marginTop: 8 }}>Todavía no llegó ningún aporte.</p> : (
          <ul className="list">
            {aportes.map((m) => (
              <li key={m.id}><span>{m.concept}<span className="when" style={{ display: 'block' }}>{dateLabel(m.created_at.slice(0, 16))}</span></span><span className="money pos">+ {money(m.amount)}</span></li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
