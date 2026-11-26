import Link from 'next/link';
import { redirect } from 'next/navigation';
import AutoRefresh from '@/components/AutoRefresh';
import DemoBar from '@/components/DemoBar';
import { getDb } from '@/lib/db';
import { referente } from '@/lib/domain';
import { getActor } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function ReferenteLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  if (actor?.role !== 'referente') redirect('/demo?falta=referente');
  const r = referente(getDb(), actor.referenteId)!;
  return (
    <>
      <DemoBar who={`${r.name} (referente)`} />
      <main id="contenido" className="panel">
        <header className="panel-head">
          <div>
            <div className="brand">A mano</div>
            <p className="muted">Panel de {r.name} · {r.org}</p>
          </div>
          <nav className="panel-nav" aria-label="Secciones del panel">
            <Link className="chip" href="/referente">Panel</Link>
            <Link className="chip" href="/referente/alta">Nueva alta</Link>
            <Link className="chip" href="/referente/seguimiento">Seguimiento 90 días</Link>
          </nav>
        </header>
        {children}
      </main>
      <AutoRefresh />
    </>
  );
}
