import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BackIcon } from '@/components/Icons';
import StepDetail from '@/components/StepDetail';
import { getDb } from '@/lib/db';
import { getStep, walletSummary } from '@/lib/domain';
import { requirePersonaId } from '@/lib/me';

export const dynamic = 'force-dynamic';

export default async function Paso({ params }: { params: Promise<{ id: string }> }) {
  const personId = await requirePersonaId();
  const { id } = await params;
  const db = getDb();
  const step = getStep(db, id);
  if (!step || step.person_id !== personId) notFound();
  return (
    <>
      <Link href="/persona/pasos" className="back"><BackIcon /> Mis pasos</Link>
      <StepDetail db={db} step={step} referente={walletSummary(db, personId).person.referente} />
    </>
  );
}
