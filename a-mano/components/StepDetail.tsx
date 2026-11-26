import Link from 'next/link';
import ActionButton from './ActionButton';
import { CheckIcon, StepIcon, WalletIcon } from './Icons';
import StepActions from './StepActions';
import type { DB } from '@/lib/db';
import { getClock, helpForStep, stepEvents, type Step } from '@/lib/domain';
import { dateLabel, money, STATUS } from '@/lib/format';

function who(db: DB, actor: string) {
  const [role, id] = actor.split(':');
  const table = role === 'persona' ? 'persons' : role === 'referente' ? 'referentes' : null;
  if (!table) return 'Sistema';
  const r = db.prepare(`SELECT ${table === 'persons' ? 'chosen_name' : 'name'} AS n FROM ${table} WHERE id = ?`).get(id) as { n: string } | undefined;
  return r ? (role === 'persona' ? 'Vos' : r.n) : actor;
}

export default function StepDetail({ db, step, referente }: { db: DB; step: Step; referente: string }) {
  const { today } = getClock(db);
  const help = helpForStep(db, step.id);
  const events = stepEvents(db, step.id);
  const s = step.status;
  const attended = ['pendiente', 'revisar', 'acreditado'].includes(s);
  const items = [
    { label: 'Elegiste este paso', done: s !== 'propuesto', hint: s === 'propuesto' ? 'Esperando que lo acuerden' : undefined },
    { label: 'Fuiste', done: attended, hint: s === 'elegido' ? 'Cuando vayas, tocá “Ya fui”' : s === 'pausado' ? 'En pausa' : undefined },
    { label: 'Tu referente lo confirmó', done: s === 'acreditado', hint: s === 'pendiente' ? `${referente} lo está revisando` : s === 'revisar' ? 'Hay algo para revisar' : undefined },
    { label: 'Extra acreditado', done: s === 'acreditado' },
  ];
  const current = items.findIndex((i) => !i.done);

  return (
    <>
      <h1>Mi próximo paso</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span className="card-sage" style={{ padding: 12, color: 'var(--forest)', display: 'grid' }}><StepIcon icon={step.icon} size={48} /></span>
        <div style={{ display: 'grid', gap: 6 }}>
          <h2 style={{ fontSize: 26 }}>{step.short_title}</h2>
          <span className={`badge tone-${STATUS[s].tone}`} style={{ justifySelf: 'start' }} data-testid="estado-paso">{STATUS[s].label}</span>
        </div>
      </div>

      <ol className="timeline" aria-label="Avance del paso">
        {items.map((it, i) => (
          <li key={it.label} className={it.done ? 'done' : i === current ? 'current' : ''}>
            <span className="dot" aria-hidden="true">{it.done ? <CheckIcon size={18} /> : i + 1}</span>
            <span className="txt">{it.label}<span className="sr-only">{it.done ? ' (hecho)' : ' (pendiente)'}</span>{!it.done && it.hint && <small>{it.hint}</small>}</span>
          </li>
        ))}
      </ol>

      {s === 'acreditado' && step.amount && (
        <>
          <div className="card-sage success" role="status">
            <span className="icon"><WalletIcon size={48} /></span>
            <span><span className="big" data-testid="recibiste">{`Recibiste ${money(step.amount)}`}</span><br />Ya está en tu saldo disponible.</span>
          </div>
          <Link href="/persona" className="btn btn-primary">Ver mi saldo</Link>
          <section className="card" style={{ display: 'grid', gap: 10 }}>
            <h3>Lo que viene después: {step.outcome_title.toLowerCase()}</h3>
            <p className="muted small">El extra ya es tuyo aunque el resultado tarde. Cuando pase, registralo si querés.</p>
            {step.outcome_reached_at
              ? <p className="badge tone-done" style={{ justifySelf: 'start' }}>✓ Registrado el {dateLabel(step.outcome_reached_at.slice(0, 10))}</p>
              : <ActionButton action="registrarResultado" payload={{ stepId: step.id }} className="btn btn-outline btn-sm">{step.outcome_title}</ActionButton>}
          </section>
          <Link href="/persona/pasos?elegir=1" className="btn btn-quiet">Elegir otro paso</Link>
        </>
      )}

      {s === 'revisar' && step.review_note && (
        <div className="card-warn" role="note"><b>{referente} te pide revisar:</b> {step.review_note}</div>
      )}
      {s === 'pendiente' && <div className="card-sage">Marcaste que fuiste. {referente} lo confirma y el extra entra a tu saldo.</div>}
      {s === 'propuesto' && <div className="card-warn">Le mandaste este paso a {referente}. Cuando lo acuerden, vas a ver acá el monto, el lugar y la fecha.</div>}
      {s === 'pausado' && <div className="card-warn">Pausaste este paso. Tu base y lo ya acreditado siguen igual.</div>}

      <section className="card" aria-labelledby="ficha" style={{ display: 'grid', gap: 12 }}>
        <h3 id="ficha">Ficha del paso</h3>
        <dl className="facts">
          <div><dt>Tu meta</dt><dd>{step.goal_title}</dd></div>
          <div><dt>Qué hacer</dt><dd>{step.action_title}<span className="muted small" style={{ display: 'block', fontWeight: 400 }}>{step.what_to_do}</span></dd></div>
          <div><dt>Extra</dt><dd className="money pos">{step.amount ? `+ ${money(step.amount)}` : 'A acordar'}</dd></div>
          <div><dt>Lugar</dt><dd>{step.place}</dd></div>
          <div><dt>Fecha</dt><dd data-testid="fecha-paso">{dateLabel(step.scheduled_at)}</dd></div>
          <div><dt>Confirma</dt><dd>{referente}, tu referente</dd></div>
        </dl>
        {help && (
          <div className={help.status === 'resuelta' ? 'card-sage' : 'card-warn'} role="note">
            {help.status === 'resuelta'
              ? <><b>Traslado resuelto:</b> {help.resolution}</>
              : <><b>Pediste ayuda para ir.</b> {referente} ya lo ve en su panel.</>}
          </div>
        )}
      </section>

      {s !== 'acreditado' && s !== 'cancelado' && (
        <StepActions stepId={step.id} status={s} scheduledAt={step.scheduled_at} today={today}
          canAskHelp={['elegido', 'pausado', 'revisar'].includes(s) && !help} />
      )}
      {s !== 'acreditado' && <p style={{ textAlign: 'center' }} className="muted">Tu base semanal está asegurada.</p>}

      <details className="card">
        <summary style={{ cursor: 'pointer', fontWeight: 700, minHeight: 32 }}>Historial de cambios</summary>
        <ul className="list">
          {events.map((e, i) => (
            <li key={i}><span>{STATUS[e.to_status]?.label ?? e.to_status}{e.note ? ` · ${e.note}` : ''}<span className="when" style={{ display: 'block' }}>{who(db, e.actor)} · {dateLabel(e.at.slice(0, 16))}</span></span></li>
          ))}
        </ul>
      </details>
    </>
  );
}
