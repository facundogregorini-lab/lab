import Link from 'next/link';
import { BackIcon } from '@/components/Icons';
import PrintButton from '@/components/PrintButton';
import QR from '@/components/QR';
import { getDb } from '@/lib/db';
import { cardOf, walletSummary } from '@/lib/domain';
import { requirePersonaId } from '@/lib/me';

export const dynamic = 'force-dynamic';

export default async function Ficha() {
  const personId = await requirePersonaId();
  const db = getDb();
  const card = cardOf(db, personId)!;
  const w = walletSummary(db, personId);
  return (
    <>
      <Link href="/persona/tarjeta" className="back no-print"><BackIcon /> Mi tarjeta</Link>
      <p className="muted no-print">Para quien usa la tarjeta física sin celular: el mismo QR, impreso.</p>
      <article className="printable" aria-label="Ficha imprimible">
        <b style={{ fontSize: 28, color: 'var(--forest)' }}>A mano</b>
        <div style={{ fontSize: 22, fontWeight: 800 }}>Podés ayudar a {w.person.chosen_name}</div>
        <div style={{ width: 220 }}><QR path={`/a/${card.public_token}`} label="QR de aportes" /></div>
        <p>Escaneá el código con la cámara del teléfono. El aporte llega a su billetera para comprar en comercios adheridos.</p>
        <p className="small" style={{ fontFamily: 'ui-monospace, monospace' }}>Tarjeta {card.card_code}</p>
        <p className="small muted">Demo con datos ficticios · {w.person.org}</p>
      </article>
      <PrintButton />
    </>
  );
}
