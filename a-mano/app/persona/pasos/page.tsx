import Link from 'next/link';
import StepChooser from '@/components/StepChooser';
import StepDetail from '@/components/StepDetail';
import { getDb } from '@/lib/store';
import { activeStep, stepsOf, templates, walletSummary } from '@/lib/domain';
import { money, STATUS } from '@/lib/format';
import { requirePersonaId } from '@/lib/me';

export const dynamic = 'force-dynamic';

export default async function MisPasos({ searchParams }: { searchParams: Promise<{ elegir?: string }> }) {
  const personId = await requirePersonaId();
  const { elegir } = await searchParams;
  const db = (await getDb());
  const w = walletSummary(db, personId);
  const steps = stepsOf(db, personId);
  const active = activeStep(db, personId);
  const latest = steps[0];
  const show = active ?? (!elegir && latest?.status === 'acreditado' ? latest : null);
  if (show) {
    return (
      <>
        <div className="brand" aria-hidden="true">A mano</div>
        <StepDetail db={db} step={show} referente={w.person.referente} />
      </>
    );
  }
  const past = steps.filter((s) => s.status === 'acreditado' || s.status === 'cancelado');
  return (
    <>
      <div className="brand" aria-hidden="true">A mano</div>
      <div>
        <h1>Elegí tu próximo paso</h1>
        <p className="lead">Vos elegís qué te sirve ahora.</p>
      </div>
      <StepChooser templates={templates(db)} />
      {past.length > 0 && (
        <section className="card">
          <h2 style={{ fontSize: 19 }}>Pasos anteriores</h2>
          <ul className="list">
            {past.map((s) => (
              <li key={s.id}>
                <Link href={`/persona/pasos/${s.id}`}>{s.short_title}</Link>
                <span className="small">{STATUS[s.status].label}{s.status === 'acreditado' && s.amount ? ` · + ${money(s.amount)}` : ''}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
