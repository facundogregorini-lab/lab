import { redirect } from 'next/navigation';
import AutoRefresh from '@/components/AutoRefresh';
import DemoBar from '@/components/DemoBar';
import TabBar from '@/components/TabBar';
import { getDb } from '@/lib/db';
import { getActor } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function PersonaLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  if (actor?.role !== 'persona') redirect('/demo?falta=persona');
  const p = getDb().prepare('SELECT chosen_name FROM persons WHERE id = ?').get(actor.personId) as { chosen_name: string };
  return (
    <>
      <DemoBar who={`${p.chosen_name} (persona)`} />
      <div className="app">
        <main id="contenido" className="screen">{children}</main>
      </div>
      <TabBar />
      <AutoRefresh />
    </>
  );
}
