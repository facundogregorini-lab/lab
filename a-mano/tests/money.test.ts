import { beforeEach, describe, expect, it } from 'vitest';
import { openDb, resetDemo, type DB } from '@/lib/db';
import * as d from '@/lib/domain';
import { DANI, JULIAN, MARTA } from '@/lib/seed';

const dani: d.Actor = { role: 'persona', personId: DANI };
const marta: d.Actor = { role: 'referente', referenteId: MARTA };
const julian: d.Actor = { role: 'referente', referenteId: JULIAN };
const k = (s: string) => `test-key-${s}-0001`;

let db: DB;
const token = () => d.cardOf(db, DANI)!.public_token;
const saldo = () => d.balance(db, DANI);
const dniStep = () => d.chooseStep(db, dani, { templateId: 't_dni' });

beforeEach(() => {
  db = openDb(':memory:');
});

describe('Prueba de aceptación del brief (en orden)', () => {
  it('recorre la tabla completa con los saldos esperados', () => {
    expect(saldo()).toBe(15000); // demo limpia con una carga base
    d.purchase(db, dani, { productId: 'pr_ana_plato', idempotencyKey: k('plato') });
    expect(saldo()).toBe(10500);
    d.contribute(db, { token: token(), amount: 2000, idempotencyKey: k('aporte') });
    expect(saldo()).toBe(12500);
    const step = dniStep();
    d.markAttended(db, dani, { stepId: step.id });
    expect(saldo()).toBe(12500);
    d.confirmStep(db, marta, { stepId: step.id });
    expect(saldo()).toBe(15500);
    const again = d.confirmStep(db, marta, { stepId: step.id });
    expect(again.alreadyCredited).toBe(true);
    expect(saldo()).toBe(15500);
    d.advanceWeek(db);
    d.processLoads(db);
    expect(saldo()).toBe(30500);
    const retry = d.processLoads(db);
    expect(retry.credited).toHaveLength(0);
    expect(saldo()).toBe(30500);
    // El saldo siempre sale del libro de movimientos.
    const sum = d.movements(db, DANI).reduce((a, m) => a + m.amount, 0);
    expect(sum).toBe(30500);
  });
});

describe('Compras', () => {
  it('rechaza saldo insuficiente sin tocar el saldo', () => {
    expect(() => d.purchase(db, dani, { productId: 'pr_rop_campera', idempotencyKey: k('campera') }))
      .toThrowError(/Saldo insuficiente/);
    expect(saldo()).toBe(15000);
  });
  it('una operación duplicada (doble clic o reintento) debita una sola vez', () => {
    const a = d.purchase(db, dani, { productId: 'pr_ana_plato', idempotencyKey: k('dup') });
    const b = d.purchase(db, dani, { productId: 'pr_ana_plato', idempotencyKey: k('dup') });
    expect(b.replay).toBe(true);
    expect(b.movementId).toBe(a.movementId);
    expect(saldo()).toBe(10500);
  });
  it('compras sucesivas nunca dejan saldo negativo', () => {
    for (let i = 0; i < 10; i++) {
      try { d.purchase(db, dani, { productId: 'pr_ana_plato', idempotencyKey: k(`loop${i}`) }); } catch { /* saldo insuficiente */ }
    }
    expect(saldo()).toBe(15000 - 3 * 4500);
    expect(saldo()).toBeGreaterThanOrEqual(0);
  });
  it('no permite comprar en un comercio cerrado ni que el cliente fije el precio', () => {
    expect(() => d.purchase(db, dani, { productId: 'pr_burb_lav', idempotencyKey: k('cerrado') })).toThrowError(/cerrado/);
    d.purchase(db, dani, { productId: 'pr_ana_plato', idempotencyKey: k('precio'), ...({ amount: 1 } as object) });
    expect(saldo()).toBe(10500);
  });
  it('un referente o el público no pueden comprar con la billetera de Dani', () => {
    expect(() => d.purchase(db, marta, { productId: 'pr_ana_plato', idempotencyKey: k('ref') })).toThrowError(/titular/);
    expect(() => d.purchase(db, { role: 'publico' }, { productId: 'pr_ana_plato', idempotencyKey: k('pub') })).toThrowError(/titular/);
  });
});

describe('Aportes', () => {
  it('valida montos: enteros positivos y con tope', () => {
    for (const amount of [0, -100, 1.5, '2000', NaN, 1e9]) {
      expect(() => d.contribute(db, { token: token(), amount, idempotencyKey: k(`m${String(amount)}`) })).toThrow();
    }
    expect(saldo()).toBe(15000);
  });
  it('acredita el 100 % y es idempotente', () => {
    d.contribute(db, { token: token(), amount: 1234, idempotencyKey: k('ap') });
    d.contribute(db, { token: token(), amount: 1234, idempotencyKey: k('ap') });
    expect(saldo()).toBe(16234);
  });
  it('rechaza tokens inexistentes', () => {
    expect(() => d.contribute(db, { token: 'no-existe', amount: 1000, idempotencyKey: k('tok') })).toThrowError(/enlace/);
  });
  it('el perfil público expone solo el nombre elegido', () => {
    expect(d.publicProfile(db, token())).toEqual({ chosenName: 'Dani' });
  });
});

describe('Hitos', () => {
  it('solo el referente asignado confirma; la persona y otro referente no', () => {
    const s = dniStep();
    d.markAttended(db, dani, { stepId: s.id });
    expect(() => d.confirmStep(db, dani, { stepId: s.id })).toThrowError(/referente asignado/);
    expect(() => d.confirmStep(db, julian, { stepId: s.id })).toThrowError(/referente asignado/);
    expect(saldo()).toBe(15000);
    expect(d.getStep(db, s.id)!.status).toBe('pendiente');
  });
  it('no se puede confirmar algo que no está pendiente', () => {
    const s = dniStep();
    expect(() => d.confirmStep(db, marta, { stepId: s.id })).toThrowError(/pendiente/);
  });
  it('reprogramar, pausar y cambiar de meta conservan la base y lo acreditado', () => {
    const s = dniStep();
    d.markAttended(db, dani, { stepId: s.id });
    d.confirmStep(db, marta, { stepId: s.id });
    expect(saldo()).toBe(18000);
    const s2 = d.chooseStep(db, dani, { templateId: 't_salud' });
    const today = d.getClock(db).today;
    d.reschedule(db, dani, { stepId: s2.id, scheduledAt: `${today}T15:00` });
    d.pauseStep(db, dani, { stepId: s2.id });
    d.resumeStep(db, dani, { stepId: s2.id });
    d.cancelStep(db, dani, { stepId: s2.id });
    expect(saldo()).toBe(18000);
    expect(d.stepEvents(db, s2.id).map((e) => e.to_status)).toEqual(['elegido', 'elegido', 'pausado', 'elegido', 'cancelado']);
  });
  it('falta información → reenviar → confirmar, con un solo extra por instancia', () => {
    const s = d.chooseStep(db, dani, { templateId: 't_aloj' });
    d.markAttended(db, dani, { stepId: s.id });
    d.requestInfo(db, marta, { stepId: s.id, note: 'Falta el horario de la entrevista' });
    expect(d.getStep(db, s.id)!.status).toBe('revisar');
    d.resubmit(db, dani, { stepId: s.id, note: 'Fue a las 11' });
    d.confirmStep(db, marta, { stepId: s.id });
    d.confirmStep(db, marta, { stepId: s.id });
    expect(saldo()).toBe(19000);
    expect(d.movements(db, DANI).filter((m) => m.kind === 'extra')).toHaveLength(1);
  });
  it('un paso propio se acuerda con el referente antes de tener extra', () => {
    const s = d.proposeStep(db, dani, { title: 'Ir a un taller de oficios', detail: '' });
    expect(s.amount).toBeNull();
    expect(() => d.markAttended(db, dani, { stepId: s.id })).toThrow();
    const today = d.getClock(db).today;
    d.agreeStep(db, marta, { stepId: s.id, amount: 2500, place: 'Taller (ficticio)', scheduledAt: `${today}T18:00`, action: '' });
    d.markAttended(db, dani, { stepId: s.id });
    d.confirmStep(db, marta, { stepId: s.id });
    expect(saldo()).toBe(17500);
  });
  it('pedido de transporte visible y resoluble por el referente', () => {
    const s = dniStep();
    d.requestHelp(db, dani, { stepId: s.id, note: '' });
    d.requestHelp(db, dani, { stepId: s.id, note: '' });
    const dash = d.referenteDashboard(db, MARTA);
    expect(dash.help.filter((h) => h.status === 'abierta')).toHaveLength(1);
    expect(() => d.resolveHelp(db, julian, { helpId: dash.help[0].id, resolution: 'SUBE' })).toThrow();
    d.resolveHelp(db, marta, { helpId: dash.help[0].id, resolution: 'Te esperamos en Plaza Constitución con la SUBE cargada' });
    expect(d.helpForStep(db, s.id)!.status).toBe('resuelta');
  });
});

describe('Cargas semanales', () => {
  it('nunca promete una quinta semana sin fondos', () => {
    for (let w = 2; w <= 6; w++) { d.advanceWeek(db); d.processLoads(db); d.processLoads(db); }
    expect(saldo()).toBe(60000);
    expect(d.walletSummary(db, DANI).period!.nextLoadDate).toBeNull();
  });
  it('el alta de otra persona no altera a Dani', () => {
    const r = d.accreditPerson(db, marta, { chosenName: 'Ale', consent: true, organizationId: 'o_red', weeks: 2, hasPhone: false, hasDocument: false });
    expect(d.balance(db, r.personId)).toBe(15000);
    expect(saldo()).toBe(15000);
    expect(() => d.accreditPerson(db, marta, { chosenName: 'Sin', consent: false, organizationId: 'o_red', weeks: 2, hasPhone: false, hasDocument: false })).toThrow();
    expect(() => d.accreditPerson(db, dani, { chosenName: 'X', consent: true, organizationId: 'o_red', weeks: 2, hasPhone: true, hasDocument: true })).toThrow();
  });
});

describe('Seguimiento a 90 días', () => {
  it('usa a toda la cohorte como denominador y separa los casos fuera de plazo', () => {
    const w = d.wellbeing(db);
    expect(w.cohorts).toHaveLength(1);
    const c = w.cohorts[0];
    expect(c.total).toBe(20);
    for (const ind of c.indicators) expect(ind.reached + ind.notYet + ind.noFollowup).toBe(20);
    expect(c.physicalCard).toBeGreaterThan(0);
    expect(w.pendingGroups.map((g) => g.name)).toContain('Altas de esta demo');
  });
});

describe('Reset de demo', () => {
  it('vuelve al escenario inicial', () => {
    d.purchase(db, dani, { productId: 'pr_ana_plato', idempotencyKey: k('reset') });
    resetDemo(db);
    expect(d.balance(db, DANI)).toBe(15000);
    expect(d.stepsOf(db, DANI)).toHaveLength(0);
  });
});
