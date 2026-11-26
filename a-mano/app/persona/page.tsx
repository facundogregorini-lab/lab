import Link from 'next/link';
import { ArrowIcon, PeopleIcon, PinIcon, StepIcon } from '@/components/Icons';
import { getDb } from '@/lib/store';
import { activeStep, movements, stepsOf, walletSummary } from '@/lib/domain';
import { dateLabel, money, shortDate, signed, STATUS } from '@/lib/format';
import { requirePersonaId } from '@/lib/me';

export const dynamic = 'force-dynamic';

function greeting() {
  const h = Number(new Intl.DateTimeFormat('es-AR', { hour: 'numeric', hour12: false, timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date()));
  return h < 13 ? 'Buen día' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
}

export default async function Inicio() {
  const personId = await requirePersonaId();
  const db = (await getDb());
  const w = walletSummary(db, personId);
  const moves = movements(db, personId);
  const step = activeStep(db, personId) ?? stepsOf(db, personId).find((s) => s.status === 'acreditado') ?? null;
  return (
    <>
      <div className="brand" aria-hidden="true">A mano</div>
      <h1>{greeting()}, {w.person.chosen_name}</h1>

      <section className="balance" aria-labelledby="disp">
        <div className="label" id="disp">Disponible hoy</div>
        <div className="amount" data-testid="saldo">{money(w.balance)}</div>
        <dl aria-label="Ingresos del período">
          <div><dt>Base semanal</dt><dd>{money(w.income.base)}</dd></div>
          {w.income.aportes > 0 && <div><dt>Aportes</dt><dd>{money(w.income.aportes)}</dd></div>}
          <div><dt>Extras</dt><dd>{money(w.income.extras)}</dd></div>
          {w.spent > 0 && <div><dt>Usado en compras</dt><dd>− {money(w.spent)}</dd></div>}
        </dl>
        {w.period && (
          <p className="small">
            Base de {money(w.period.weekly)} por semana.{' '}
            {w.period.nextLoadDate ? `Próxima carga: ${dateLabel(w.period.nextLoadDate)}. ` : 'Ya recibiste todas las cargas de este período. '}
            Financiado hasta el {shortDate(w.period.coveredUntil)}.
          </p>
        )}
      </section>

      <Link href="/persona/comprar" className="btn btn-primary"><PinIcon size={28} /> Dónde comprar</Link>
      <Link href="/persona/aportes" className="btn btn-outline"><PeopleIcon size={28} /> Recibir aportes</Link>

      <section aria-labelledby="paso" style={{ display: 'grid', gap: 10 }}>
        <h2 id="paso">Mi próximo paso</h2>
        <Link href="/persona/pasos" className="card-sage nextstep">
          <span className="icon"><StepIcon icon={step?.icon ?? 'star'} size={52} /></span>
          <span style={{ display: 'grid', gap: 4 }}>
            <span className="title">{step ? step.short_title : 'Elegí un paso'}</span>
            {step && <span className={`badge tone-${STATUS[step.status].tone}`} style={{ justifySelf: 'start' }}>{STATUS[step.status].label}</span>}
            <span className="link">{step ? 'Ver mi paso' : 'Ver opciones'} <ArrowIcon size={18} /></span>
          </span>
        </Link>
      </section>

      <section aria-labelledby="movs" className="card">
        <div className="section-title"><h2 id="movs">Movimientos</h2><span className="muted small">{moves.length}</span></div>
        <ul className="list" data-testid="movimientos">
          {moves.map((m) => (
            <li key={m.id}>
              <span>
                <span>{m.concept}</span>
                <span className="when" style={{ display: 'block' }}>{dateLabel(m.created_at.slice(0, 16))}</span>
              </span>
              <span className={`money ${m.amount > 0 ? 'pos' : ''}`}>{signed(m.amount)}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
