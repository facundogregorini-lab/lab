import { getDb } from '@/lib/store';
import { wellbeing } from '@/lib/domain';
import { dateLabel } from '@/lib/format';
import { requireReferenteId } from '@/lib/me';

export const dynamic = 'force-dynamic';

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}\u00a0%` : '—');

export default async function Seguimiento() {
  await requireReferenteId();
  const w = wellbeing((await getDb()));
  return (
    <>
      <div>
        <h1>Seguimiento a 90 días</h1>
        <p className="lead">Respuestas voluntarias a los 90 días del alta. Es descriptivo: no mide a nadie en particular ni dice que el programa haya causado estos resultados.</p>
      </div>
      {w.cohorts.map((c) => (
        <section key={c.name} className="card" aria-labelledby={`c-${c.name}`} style={{ display: 'grid', gap: 16 }}>
          <div className="section-title" style={{ flexWrap: 'wrap' }}>
            <h2 id={`c-${c.name}`}>{c.name} <span className="badge tone-muted">ficticia</span></h2>
            <span className="muted small">Alta {dateLabel(c.accreditedOn)} · {c.total} personas acreditadas (incluye {c.physicalCard} con tarjeta física)</span>
          </div>
          <p className="small muted">Denominador: las {c.total} personas acreditadas de la cohorte, respondan o no.</p>
          <div className="legend" aria-hidden="true">
            <span><i style={{ background: 'var(--forest)' }} />Alcanzado</span>
            <span><i style={{ background: 'repeating-linear-gradient(45deg,#c9c3b2,#c9c3b2 4px,#e1dccd 4px,#e1dccd 8px)' }} />Aún no alcanzado</span>
            <span><i style={{ background: '#fff' }} />Sin seguimiento</span>
          </div>
          {c.indicators.map((i) => (
            <div key={i.key} style={{ display: 'grid', gap: 8 }}>
              <h3 style={{ fontSize: 17 }}>{i.label}</h3>
              <div className="bar" aria-hidden="true">
                <span className="b-reached" style={{ width: `${(i.reached / c.total) * 100}%` }} />
                <span className="b-not" style={{ width: `${(i.notYet / c.total) * 100}%` }} />
                <span className="b-none" style={{ width: `${(i.noFollowup / c.total) * 100}%` }} />
              </div>
              <div className="table-wrap">
                <table className="data">
                  <thead><tr><th>Alcanzado</th><th>Aún no alcanzado</th><th>Sin seguimiento</th><th>Total</th></tr></thead>
                  <tbody><tr>
                    <td><b>{i.reached}</b> de {c.total} ({pct(i.reached, c.total)})</td>
                    <td><b>{i.notYet}</b> de {c.total} ({pct(i.notYet, c.total)})</td>
                    <td><b>{i.noFollowup}</b> de {c.total} ({pct(i.noFollowup, c.total)})</td>
                    <td>{c.total}</td>
                  </tr></tbody>
                </table>
              </div>
            </div>
          ))}
        </section>
      ))}
      <section className="card" aria-labelledby="fuera">
        <h2 id="fuera">Todavía fuera de plazo</h2>
        <p className="small muted" style={{ marginTop: 4 }}>No se cuentan arriba hasta cumplir 90 días desde el alta.</p>
        <ul className="list">
          {w.pendingGroups.map((g) => (
            <li key={g.name}><span><b>{g.name}</b></span><span>{g.total} {g.total === 1 ? 'persona' : 'personas'} · desde el {dateLabel(g.dueOn)}</span></li>
          ))}
        </ul>
      </section>
    </>
  );
}
