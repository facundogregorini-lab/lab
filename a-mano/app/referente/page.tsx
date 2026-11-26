import ActionButton from '@/components/ActionButton';
import AgreeForm from '@/components/AgreeForm';
import NoteAction from '@/components/NoteAction';
import { getDb } from '@/lib/db';
import { getClock, referenteDashboard } from '@/lib/domain';
import { dateLabel, money, STATUS } from '@/lib/format';
import { requireReferenteId } from '@/lib/me';

export const dynamic = 'force-dynamic';

function Badge({ status }: { status: string }) {
  return <span className={`badge tone-${STATUS[status].tone}`}>{STATUS[status].label}</span>;
}

export default async function Panel() {
  const refId = await requireReferenteId();
  const db = getDb();
  const d = referenteDashboard(db, refId);
  const { today, week } = getClock(db);
  const openHelp = d.help.filter((h) => h.status === 'abierta');
  const names = new Map<string, string>();
  for (const p of d.people) names.set(`persona:${p.id}`, p.chosen_name);
  names.set(`referente:${refId}`, 'Vos');
  const actorName = (a: string) => names.get(a) ?? (a.startsWith('referente:') ? 'Referente' : a);

  return (
    <>
      <div className="kpis" role="list" aria-label="Resumen">
        <div className="kpi" role="listitem"><b>{d.pending.length}</b>Para confirmar</div>
        <div className="kpi" role="listitem"><b>{openHelp.length}</b>Traslados pedidos</div>
        <div className="kpi" role="listitem"><b>{d.upcoming.length}</b>Próximos pasos</div>
        <div className="kpi" role="listitem"><b>{d.people.length}</b>Personas acompañadas</div>
        <div className="kpi" role="listitem"><b>Semana {week}</b>Hoy en la demo: {dateLabel(today)}</div>
      </div>

      <div className="grid grid-3">
        <section className="card" aria-labelledby="conf">
          <h2 id="conf">Solicitudes de confirmación</h2>
          {d.pending.length === 0 && <p className="muted" style={{ marginTop: 8 }}>No hay nada para confirmar.</p>}
          {d.pending.map((s) => (
            <article key={s.id} className="item" data-testid="solicitud">
              <div><b>{s.chosen_name}</b> · {s.short_title} <Badge status={s.status} /></div>
              <p className="small">{s.action_title}. {s.place}. {dateLabel(s.scheduled_at)}.</p>
              <ActionButton action="confirmar" payload={{ stepId: s.id }}>Confirmar y acreditar + {money(s.amount ?? 0)}</ActionButton>
              <NoteAction action="pedirInfo" payload={{ stepId: s.id }} field="note" label="¿Qué hay que revisar?" button="Falta información" submit="Enviar a la persona" placeholder="Ej.: Contame en qué ventanilla te atendieron." />
            </article>
          ))}
          {d.review.map((s) => (
            <article key={s.id} className="item">
              <div><b>{s.chosen_name}</b> · {s.short_title} <Badge status={s.status} /></div>
              <p className="small muted">Le pediste: {s.review_note}. Espera que lo reenvíe.</p>
            </article>
          ))}
        </section>

        <section className="card" aria-labelledby="trans">
          <h2 id="trans">Necesidades de transporte</h2>
          {d.help.length === 0 && <p className="muted" style={{ marginTop: 8 }}>Nadie pidió ayuda para ir.</p>}
          {d.help.map((h) => (
            <article key={h.id} className="item">
              <div><b>{h.chosen_name}</b> · {h.short_title} <span className={`badge ${h.status === 'abierta' ? 'tone-wait' : 'tone-done'}`}>{h.status === 'abierta' ? 'Pedido abierto' : 'Resuelto'}</span></div>
              <p className="small">Turno: {dateLabel(h.scheduled_at)} · {h.place}{h.note ? ` · “${h.note}”` : ''}</p>
              {h.status === 'abierta'
                ? <NoteAction action="resolverAyuda" payload={{ helpId: h.id }} field="resolution" label="¿Cómo se resuelve el traslado?" button="Registrar resolución" submit="Guardar" className="btn btn-outline btn-sm" placeholder="Ej.: Pasamos a buscarte por el parador a las 9:15." />
                : <p className="small muted">{h.resolution}</p>}
            </article>
          ))}
        </section>

        <section className="card" aria-labelledby="prox">
          <h2 id="prox">Próximos pasos</h2>
          {d.upcoming.length === 0 && d.proposed.length === 0 && <p className="muted" style={{ marginTop: 8 }}>Sin pasos en agenda.</p>}
          {d.proposed.map((s) => (
            <article key={s.id} className="item">
              <div><b>{s.chosen_name}</b> propone: {s.short_title} <Badge status={s.status} /></div>
              {s.what_to_do && <p className="small muted">{s.what_to_do}</p>}
              <AgreeForm stepId={s.id} today={today} />
            </article>
          ))}
          {d.upcoming.map((s) => (
            <article key={s.id} className="item">
              <div><b>{s.chosen_name}</b> · {s.short_title} <Badge status={s.status} /></div>
              <p className="small">{dateLabel(s.scheduled_at)} · {s.place} · + {money(s.amount ?? 0)}</p>
            </article>
          ))}
        </section>
      </div>

      <div className="grid grid-2">
        <section className="card" aria-labelledby="pers">
          <h2 id="pers">Personas que acompañás</h2>
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Nombre elegido</th><th>Tarjeta</th><th>Acceso</th><th>Saldo</th><th>Paso</th></tr></thead>
              <tbody>
                {d.people.map((p) => (
                  <tr key={p.id}>
                    <td><b>{p.chosen_name}</b><br /><span className="small muted">Alta {dateLabel(p.accredited_on)}</span></td>
                    <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>{p.card_code}</td>
                    <td className="small">{p.has_phone ? 'Celular' : 'Tarjeta física'}{p.has_document ? '' : ' · sin DNI a mano'}</td>
                    <td className="money" data-testid={`saldo-${p.id}`}>{money(p.balance)}</td>
                    <td className="small">{p.active ? <>{p.active.short_title}<br /><Badge status={p.active.status} /></> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="card" aria-labelledby="seg">
          <h2 id="seg">Seguimiento</h2>
          <p className="small muted">Últimos cambios en los pasos.</p>
          {d.events.length === 0 && <p className="muted" style={{ marginTop: 8 }}>Sin novedades.</p>}
          <ul className="list">
            {d.events.map((e) => (
              <li key={e.id}><span><b>{e.chosen_name}</b> · {e.short_title}: {STATUS[e.to_status]?.label}{e.note ? ` · ${e.note}` : ''}<span className="when" style={{ display: 'block' }}>{actorName(e.actor)} · {dateLabel(e.at.slice(0, 16))}</span></span></li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
