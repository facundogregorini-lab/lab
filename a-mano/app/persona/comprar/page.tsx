import Link from 'next/link';
import { BackIcon } from '@/components/Icons';
import { getDb } from '@/lib/db';
import { barrios, listMerchants } from '@/lib/domain';
import { distance } from '@/lib/format';
import { requirePersonaId } from '@/lib/me';

export const dynamic = 'force-dynamic';

export default async function DondeComprar({ searchParams }: { searchParams: Promise<{ barrio?: string }> }) {
  await requirePersonaId();
  const { barrio } = await searchParams;
  const db = getDb();
  const all = barrios(db);
  const selected = barrio && all.includes(barrio) ? barrio : null;
  const list = listMerchants(db, selected);
  return (
    <>
      <Link href="/persona" className="back"><BackIcon /> Inicio</Link>
      <div>
        <h1>Dónde comprar</h1>
        <p className="lead">Comercios adheridos cerca. Las distancias son orientativas: no usamos tu ubicación.</p>
      </div>
      <nav aria-label="Filtrar por barrio" className="chips">
        <Link className="chip" href="/persona/comprar" aria-current={!selected ? 'true' : undefined}>Todos</Link>
        {all.map((b) => (
          <Link key={b} className="chip" href={`/persona/comprar?barrio=${encodeURIComponent(b)}`} aria-current={selected === b ? 'true' : undefined}>{b}</Link>
        ))}
      </nav>
      <ul className="list" style={{ gap: 12 }} aria-label="Comercios">
        {list.map((m) => (
          <li key={m.id} style={{ border: 0, padding: 0 }}>
            <Link href={`/persona/comprar/${m.id}`} className="card merchant" style={{ width: '100%' }}>
              <span className="name">{m.name}</span>
              <span>{m.offers}{m.prepared_food ? ' · Comida preparada' : ''}</span>
              <span className="meta">
                <span>{m.barrio}</span><span aria-hidden="true">·</span><span>{distance(m.distance_m)}</span><span aria-hidden="true">·</span>
                <span className={m.open_now ? 'open' : 'closed'}>{m.open_now ? '● Abierto' : '○ Cerrado'}</span>
              </span>
              <span className="small muted">{m.hours}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
