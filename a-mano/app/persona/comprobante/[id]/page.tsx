import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckIcon } from '@/components/Icons';
import { getDb } from '@/lib/store';
import { balance, receipt } from '@/lib/domain';
import { dateLabel, money } from '@/lib/format';
import { requirePersonaId } from '@/lib/me';

export const dynamic = 'force-dynamic';

export default async function Comprobante({ params }: { params: Promise<{ id: string }> }) {
  const personId = await requirePersonaId();
  const { id } = await params;
  const db = (await getDb());
  const r = receipt(db, { role: 'persona', personId }, id);
  if (!r || r.kind !== 'compra') notFound();
  return (
    <>
      <div className="card-sage success" role="status">
        <span className="icon"><CheckIcon size={44} /></span>
        <span><span className="big">Compra hecha</span><br />Mostrá este comprobante en el comercio.</span>
      </div>
      <section className="card" aria-labelledby="comp" style={{ display: 'grid', gap: 12 }}>
        <h2 id="comp">Comprobante</h2>
        <dl className="facts">
          <div><dt>Comercio</dt><dd>{r.merchant} · {r.barrio}</dd></div>
          <div><dt>Compra</dt><dd>{r.product}</dd></div>
          <div><dt>Importe</dt><dd className="money">{money(r.amount)}</dd></div>
          <div><dt>Fecha</dt><dd>{dateLabel(r.created_at.slice(0, 16))}</dd></div>
          <div><dt>N.º</dt><dd style={{ fontFamily: 'ui-monospace, monospace' }}>{r.id.toUpperCase()}</dd></div>
        </dl>
        <p className="small muted">Pago simulado de la demo. Se debitó una sola vez.</p>
      </section>
      <p className="card" style={{ fontSize: 18 }}>Te quedan <b className="money" data-testid="saldo-restante">{money(balance(db, personId))}</b></p>
      <Link href="/persona" className="btn btn-primary">Ver mi saldo</Link>
    </>
  );
}
