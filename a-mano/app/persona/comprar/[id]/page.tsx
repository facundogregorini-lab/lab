import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BackIcon } from '@/components/Icons';
import PurchaseFlow from '@/components/PurchaseFlow';
import { getDb } from '@/lib/db';
import { balance, getMerchant } from '@/lib/domain';
import { distance } from '@/lib/format';
import { requirePersonaId } from '@/lib/me';

export const dynamic = 'force-dynamic';

export default async function Comercio({ params }: { params: Promise<{ id: string }> }) {
  const personId = await requirePersonaId();
  const { id } = await params;
  const db = getDb();
  const m = getMerchant(db, id);
  if (!m) notFound();
  return (
    <>
      <Link href="/persona/comprar" className="back"><BackIcon /> Dónde comprar</Link>
      <div>
        <h1>{m.name}</h1>
        <p className="lead">{m.barrio} · {distance(m.distance_m)} · <span className={m.open_now ? 'open' : 'closed'}>{m.open_now ? 'Abierto' : 'Cerrado'}</span></p>
        <p className="small muted">{m.hours}</p>
      </div>
      <PurchaseFlow merchant={{ id: m.id, name: m.name, open: !!m.open_now }} products={m.products} balance={balance(db, personId)} />
    </>
  );
}
