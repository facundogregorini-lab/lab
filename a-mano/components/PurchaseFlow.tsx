'use client';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { money } from '@/lib/format';
import { act, newKey } from './api';

type Product = { id: string; name: string; price: number };

/** Elegir → revisar el total → confirmar. La clave de operación se crea al revisar y se reusa si hay reintento. */
export default function PurchaseFlow({ merchant, products, balance }: { merchant: { id: string; name: string; open: boolean }; products: Product[]; balance: number }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Product | null>(null);
  const [key, setKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enough = useMemo(() => (selected ? balance >= selected.price : true), [selected, balance]);

  if (selected && key) {
    return (
      <section className="card" aria-labelledby="rev" style={{ display: 'grid', gap: 14 }}>
        <h2 id="rev">Revisá tu compra</h2>
        <ul className="list">
          <li><span>{selected.name}</span><span className="money">{money(selected.price)}</span></li>
        </ul>
        <div className="total"><span>Total</span><span data-testid="total">{money(selected.price)}</span></div>
        <p className="small muted">Tu saldo ahora: {money(balance)}. Después de la compra: {money(balance - selected.price)}.</p>
        {!enough && <p className="card-error" role="alert">No te alcanza el saldo para esta compra.</p>}
        {error && <p className="card-error" role="alert">{error}</p>}
        <button
          type="button" className="btn btn-primary" disabled={busy || !enough} aria-busy={busy}
          onClick={async () => {
            if (busy) return;
            setBusy(true); setError(null);
            const r = await act<{ movementId: string }>('comprar', { productId: selected.id, idempotencyKey: key });
            if (!r.ok) { setError(r.message); setBusy(false); return; }
            router.push(`/persona/comprobante/${r.result.movementId}`);
          }}
        >
          {busy ? 'Confirmando…' : `Confirmar y pagar ${money(selected.price)}`}
        </button>
        <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => { setSelected(null); setKey(null); setError(null); }}>Cambiar</button>
      </section>
    );
  }

  return (
    <section aria-labelledby="menu" style={{ display: 'grid', gap: 12 }}>
      <h2 id="menu">¿Qué querés comprar?</h2>
      {!merchant.open && <p className="card-warn">Este comercio está cerrado ahora. Podés ver lo que ofrece, pero no comprar.</p>}
      {products.map((p) => (
        <button
          key={p.id} type="button" className="choice" disabled={!merchant.open}
          onClick={() => { setSelected(p); setKey(newKey()); }}
          style={{ textAlign: 'left', width: '100%', opacity: merchant.open ? 1 : 0.6 }}
        >
          <span className="t">{p.name}</span>
          <span className="amt">{money(p.price)}</span>
        </button>
      ))}
      <p className="small muted">Saldo disponible: {money(balance)}</p>
    </section>
  );
}
