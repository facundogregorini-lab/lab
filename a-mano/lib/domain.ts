import type { DB } from './db';
import { addDays, cardCode, diffDays, id, opaqueToken } from './util';
import { WEEKLY } from './seed';

// Reglas de negocio. Todo lo que toca plata pasa por acá y se valida en el servidor.

export class DomainError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export type Actor =
  | { role: 'persona'; personId: string }
  | { role: 'referente'; referenteId: string }
  | { role: 'publico' };

const ACTIVE = ['propuesto', 'elegido', 'pendiente', 'revisar', 'pausado'] as const;
export const MAX_CONTRIBUTION = 100000;

// ---------- Reloj de demo ----------

export function getClock(db: DB) {
  const rows = db.prepare('SELECT key, value FROM demo_state').all() as { key: string; value: string }[];
  const s = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const week = Number(s.week || 1);
  const startDate = s.start_date;
  return { startDate, week, today: addDays(startDate, (week - 1) * 7) };
}

function nowStamp(db: DB) {
  const time = new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date());
  return `${getClock(db).today}T${time}`;
}

// ---------- Validaciones comunes ----------

function checkKey(key: unknown): string {
  if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(key)) {
    throw new DomainError(400, 'clave_invalida', 'Falta una clave de operación válida.');
  }
  return key;
}

function checkAmount(amount: unknown, max: number): number {
  if (typeof amount !== 'number' || !Number.isSafeInteger(amount) || amount <= 0) {
    throw new DomainError(400, 'monto_invalido', 'El monto tiene que ser un número entero mayor a cero.');
  }
  if (amount > max) throw new DomainError(400, 'monto_excedido', `El monto máximo es $${max.toLocaleString('es-AR')}.`);
  return amount;
}

function requirePersona(actor: Actor, personId?: string): string {
  if (actor.role !== 'persona') throw new DomainError(403, 'rol_incorrecto', 'Esta acción la hace la persona titular.');
  if (personId && actor.personId !== personId) throw new DomainError(403, 'no_es_tuyo', 'Este paso no es tuyo.');
  return actor.personId;
}

function requireAssignedReferente(db: DB, actor: Actor, personId: string): string {
  if (actor.role !== 'referente') {
    throw new DomainError(403, 'rol_incorrecto', 'Solo el referente asignado puede confirmar y acreditar.');
  }
  const p = db.prepare('SELECT referente_id FROM persons WHERE id = ?').get(personId) as { referente_id: string } | undefined;
  if (!p) throw new DomainError(404, 'persona_inexistente', 'No encontramos a esa persona.');
  if (p.referente_id !== actor.referenteId) {
    throw new DomainError(403, 'referente_no_asignado', 'Solo el referente asignado a esta persona puede hacerlo.');
  }
  return actor.referenteId;
}

function actorLabel(actor: Actor) {
  return actor.role === 'persona' ? `persona:${actor.personId}` : actor.role === 'referente' ? `referente:${actor.referenteId}` : 'publico';
}

// ---------- Saldo y movimientos ----------

export function balance(db: DB, personId: string): number {
  const r = db.prepare('SELECT COALESCE(SUM(amount), 0) AS b FROM movements WHERE person_id = ?').get(personId) as { b: number };
  return r.b;
}

export type Movement = {
  id: string; kind: 'base' | 'compra' | 'aporte' | 'extra'; concept: string; amount: number; created_at: string;
};

export function movements(db: DB, personId: string): Movement[] {
  return db.prepare(
    'SELECT id, kind, concept, amount, created_at FROM movements WHERE person_id = ? ORDER BY created_at DESC, rowid DESC',
  ).all(personId) as Movement[];
}

export function walletSummary(db: DB, personId: string) {
  const person = db.prepare(
    `SELECT p.id, p.chosen_name, p.uses_physical_card, o.name AS org, r.name AS referente
     FROM persons p JOIN organizations o ON o.id = p.organization_id JOIN referentes r ON r.id = p.referente_id WHERE p.id = ?`,
  ).get(personId) as { id: string; chosen_name: string; uses_physical_card: number; org: string; referente: string } | undefined;
  if (!person) throw new DomainError(404, 'persona_inexistente', 'No encontramos a esa persona.');
  const byKind = Object.fromEntries(
    (db.prepare('SELECT kind, SUM(amount) AS total FROM movements WHERE person_id = ? GROUP BY kind').all(personId) as { kind: string; total: number }[])
      .map((r) => [r.kind, r.total]),
  ) as Record<string, number>;
  const period = db.prepare(
    `SELECT fp.*, f.amount AS fund_amount, f.name AS fund_name,
            (SELECT COUNT(*) FROM weekly_loads wl WHERE wl.period_id = fp.id) AS loads_done
     FROM funding_periods fp JOIN funds f ON f.id = fp.fund_id WHERE fp.person_id = ? ORDER BY fp.start_date DESC LIMIT 1`,
  ).get(personId) as {
    id: string; weekly_amount: number; weeks_total: number; start_date: string; fund_amount: number; fund_name: string; loads_done: number;
  } | undefined;
  const clock = getClock(db);
  return {
    person,
    balance: balance(db, personId),
    income: { base: byKind.base || 0, aportes: byKind.aporte || 0, extras: byKind.extra || 0 },
    spent: -(byKind.compra || 0),
    period: period && {
      weekly: period.weekly_amount,
      weeksTotal: period.weeks_total,
      loadsDone: period.loads_done,
      startDate: period.start_date,
      coveredUntil: addDays(period.start_date, period.weeks_total * 7 - 1),
      nextLoadDate: period.loads_done < period.weeks_total ? addDays(period.start_date, period.loads_done * 7) : null,
      fundName: period.fund_name,
      fundTotal: period.fund_amount,
      fundUsed: period.loads_done * period.weekly_amount,
    },
    today: clock.today,
    week: clock.week,
  };
}

// ---------- Comercios y compras ----------

export type Merchant = {
  id: string; name: string; barrio: string; distance_m: number; open_now: number; hours: string; offers: string; prepared_food: number;
};

export function listMerchants(db: DB, barrio?: string | null): Merchant[] {
  const sql = 'SELECT id, name, barrio, distance_m, open_now, hours, offers, prepared_food FROM merchants WHERE enabled = 1'
    + (barrio ? ' AND barrio = ?' : '') + ' ORDER BY distance_m';
  return (barrio ? db.prepare(sql).all(barrio) : db.prepare(sql).all()) as Merchant[];
}

export function barrios(db: DB): string[] {
  return (db.prepare('SELECT DISTINCT barrio FROM merchants WHERE enabled = 1 ORDER BY barrio').all() as { barrio: string }[]).map((r) => r.barrio);
}

export function getMerchant(db: DB, merchantId: string) {
  const m = db.prepare('SELECT id, name, barrio, distance_m, open_now, hours, offers, prepared_food FROM merchants WHERE id = ? AND enabled = 1')
    .get(merchantId) as Merchant | undefined;
  if (!m) return null;
  const products = db.prepare('SELECT id, name, price FROM products WHERE merchant_id = ? AND available = 1 ORDER BY price DESC')
    .all(merchantId) as { id: string; name: string; price: number }[];
  return { ...m, products };
}

export function purchase(db: DB, actor: Actor, input: { productId: unknown; idempotencyKey: unknown }) {
  const personId = requirePersona(actor);
  const key = `compra:${checkKey(input.idempotencyKey)}`;
  return db.transaction(() => {
    const existing = db.prepare('SELECT * FROM movements WHERE idempotency_key = ?').get(key) as (Movement & { person_id: string }) | undefined;
    if (existing) {
      if (existing.person_id !== personId) throw new DomainError(409, 'clave_reutilizada', 'Esa clave de operación ya se usó.');
      return { movementId: existing.id, replay: true, balance: balance(db, personId) };
    }
    const p = db.prepare(
      `SELECT pr.id, pr.name, pr.price, pr.available, m.id AS merchant_id, m.name AS merchant, m.enabled, m.open_now
       FROM products pr JOIN merchants m ON m.id = pr.merchant_id WHERE pr.id = ?`,
    ).get(typeof input.productId === 'string' ? input.productId : '') as {
      id: string; name: string; price: number; available: number; merchant_id: string; merchant: string; enabled: number; open_now: number;
    } | undefined;
    if (!p || !p.available) throw new DomainError(404, 'producto_inexistente', 'Ese producto no está disponible.');
    if (!p.enabled) throw new DomainError(403, 'comercio_no_habilitado', 'Ese comercio no está habilitado.');
    if (!p.open_now) throw new DomainError(409, 'comercio_cerrado', `${p.merchant} está cerrado ahora.`);
    const current = balance(db, personId);
    if (current < p.price) {
      throw new DomainError(409, 'saldo_insuficiente', `Saldo insuficiente: tenés $${current.toLocaleString('es-AR')} y la compra es de $${p.price.toLocaleString('es-AR')}.`);
    }
    const mid = id('m');
    db.prepare(
      `INSERT INTO movements (id, person_id, kind, concept, amount, merchant_id, product_id, idempotency_key, created_at)
       VALUES (?, ?, 'compra', ?, ?, ?, ?, ?, ?)`,
    ).run(mid, personId, `${p.merchant} · ${p.name}`, -p.price, p.merchant_id, p.id, key, nowStamp(db));
    return { movementId: mid, replay: false, balance: balance(db, personId) };
  }).immediate();
}

export function receipt(db: DB, actor: Actor, movementId: string) {
  const personId = requirePersona(actor);
  const m = db.prepare(
    `SELECT mv.id, mv.concept, mv.amount, mv.created_at, mv.kind, m.name AS merchant, m.barrio, pr.name AS product
     FROM movements mv LEFT JOIN merchants m ON m.id = mv.merchant_id LEFT JOIN products pr ON pr.id = mv.product_id
     WHERE mv.id = ? AND mv.person_id = ?`,
  ).get(movementId, personId) as { id: string; concept: string; amount: number; created_at: string; kind: string; merchant: string | null; barrio: string | null; product: string | null } | undefined;
  return m ?? null;
}

// ---------- Aportes públicos ----------

/** Lo único que ve el enlace público: el nombre elegido. Nada de saldo, identidad, hitos ni movimientos. */
export function publicProfile(db: DB, token: string) {
  const r = db.prepare(
    `SELECT p.chosen_name FROM cards c JOIN persons p ON p.id = c.person_id WHERE c.public_token = ? AND c.status = 'activa'`,
  ).get(token) as { chosen_name: string } | undefined;
  return r ? { chosenName: r.chosen_name } : null;
}

export function contribute(db: DB, input: { token: unknown; amount: unknown; idempotencyKey: unknown }) {
  const amount = checkAmount(input.amount, MAX_CONTRIBUTION);
  const key = `aporte:${checkKey(input.idempotencyKey)}`;
  return db.transaction(() => {
    const card = db.prepare("SELECT person_id FROM cards WHERE public_token = ? AND status = 'activa'")
      .get(typeof input.token === 'string' ? input.token : '') as { person_id: string } | undefined;
    if (!card) throw new DomainError(404, 'enlace_invalido', 'Este enlace de aportes no existe o ya no está activo.');
    const existing = db.prepare('SELECT person_id, amount FROM movements WHERE idempotency_key = ?').get(key) as { person_id: string; amount: number } | undefined;
    if (existing) {
      if (existing.person_id !== card.person_id || existing.amount !== amount) throw new DomainError(409, 'clave_reutilizada', 'Esa clave de operación ya se usó.');
      return { credited: amount, replay: true };
    }
    db.prepare(
      `INSERT INTO movements (id, person_id, kind, concept, amount, idempotency_key, created_at) VALUES (?, ?, 'aporte', 'Aporte recibido', ?, ?, ?)`,
    ).run(id('m'), card.person_id, amount, key, nowStamp(db));
    return { credited: amount, replay: false }; // La demo acredita el 100 %.
  }).immediate();
}

// ---------- Tarjeta ----------

export function cardOf(db: DB, personId: string) {
  return db.prepare('SELECT card_code, public_token, status FROM cards WHERE person_id = ?').get(personId) as
    { card_code: string; public_token: string; status: string } | undefined;
}

// ---------- Motor de hitos ----------

export type Step = {
  id: string; person_id: string; goal_id: string; template_id: string | null; short_title: string; action_title: string;
  outcome_title: string; what_to_do: string; amount: number | null; place: string; scheduled_at: string | null; icon: string;
  status: 'propuesto' | 'elegido' | 'pendiente' | 'revisar' | 'pausado' | 'acreditado' | 'cancelado';
  review_note: string | null; extra_movement_id: string | null; outcome_reached_at: string | null; created_at: string; updated_at: string;
  goal_title: string;
};

export function templates(db: DB) {
  return db.prepare('SELECT * FROM step_templates ORDER BY rowid').all() as {
    id: string; short_title: string; goal_title: string; action_title: string; outcome_title: string; what_to_do: string;
    amount: number; place: string; days_ahead: number; time: string; icon: string;
  }[];
}

export function getStep(db: DB, stepId: string): Step | null {
  return (db.prepare('SELECT s.*, g.title AS goal_title FROM step_instances s JOIN goals g ON g.id = s.goal_id WHERE s.id = ?').get(stepId) as Step) ?? null;
}

export function stepsOf(db: DB, personId: string): Step[] {
  return db.prepare(
    'SELECT s.*, g.title AS goal_title FROM step_instances s JOIN goals g ON g.id = s.goal_id WHERE s.person_id = ? ORDER BY s.created_at DESC, s.rowid DESC',
  ).all(personId) as Step[];
}

export function activeStep(db: DB, personId: string): Step | null {
  return stepsOf(db, personId).find((s) => (ACTIVE as readonly string[]).includes(s.status)) ?? null;
}

export function stepEvents(db: DB, stepId: string) {
  return db.prepare('SELECT from_status, to_status, actor, note, at FROM step_events WHERE step_id = ? ORDER BY id').all(stepId) as
    { from_status: string | null; to_status: string; actor: string; note: string | null; at: string }[];
}

function logEvent(db: DB, stepId: string, from: string | null, to: string, actor: Actor, note?: string | null) {
  db.prepare('INSERT INTO step_events (step_id, from_status, to_status, actor, note, at) VALUES (?,?,?,?,?,?)')
    .run(stepId, from, to, actorLabel(actor), note ?? null, nowStamp(db));
}

function setStatus(db: DB, step: Step, to: Step['status'], actor: Actor, note?: string | null, extra: Record<string, unknown> = {}) {
  const sets = ['status = ?', 'updated_at = ?', ...Object.keys(extra).map((k) => `${k} = ?`)];
  db.prepare(`UPDATE step_instances SET ${sets.join(', ')} WHERE id = ?`).run(to, nowStamp(db), ...Object.values(extra), step.id);
  logEvent(db, step.id, step.status, to, actor, note);
}

function loadOwnStep(db: DB, actor: Actor, stepId: unknown): Step {
  const personId = requirePersona(actor);
  const step = getStep(db, typeof stepId === 'string' ? stepId : '');
  if (!step) throw new DomainError(404, 'paso_inexistente', 'No encontramos ese paso.');
  requirePersona(actor, step.person_id);
  void personId;
  return step;
}

function expect(step: Step, allowed: Step['status'][], message: string) {
  if (!allowed.includes(step.status)) throw new DomainError(409, 'transicion_invalida', message);
}

function checkDate(db: DB, date: unknown): string {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}:00Z`))) {
    throw new DomainError(400, 'fecha_invalida', 'Elegí una fecha y hora válidas.');
  }
  if (date.slice(0, 10) < getClock(db).today) throw new DomainError(400, 'fecha_pasada', 'La nueva fecha tiene que ser hoy o más adelante.');
  return date;
}

export function chooseStep(db: DB, actor: Actor, input: { templateId: unknown }) {
  const personId = requirePersona(actor);
  return db.transaction(() => {
    if (activeStep(db, personId)) throw new DomainError(409, 'ya_hay_un_paso', 'Ya tenés un paso en curso. Podés cambiarlo desde su ficha.');
    const t = templates(db).find((x) => x.id === input.templateId);
    if (!t) throw new DomainError(404, 'paso_inexistente', 'Ese paso no existe.');
    const now = nowStamp(db);
    const goalId = id('g');
    db.prepare('INSERT INTO goals VALUES (?,?,?,?)').run(goalId, personId, t.goal_title, now);
    const sid = id('s');
    const when = `${addDays(getClock(db).today, t.days_ahead)}T${t.time.padStart(5, '0')}`;
    db.prepare(
      `INSERT INTO step_instances (id, person_id, goal_id, template_id, short_title, action_title, outcome_title, what_to_do, amount, place,
         scheduled_at, icon, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'elegido',?,?)`,
    ).run(sid, personId, goalId, t.id, t.short_title, t.action_title, t.outcome_title, t.what_to_do, t.amount, t.place, when, t.icon, now, now);
    logEvent(db, sid, null, 'elegido', actor, null);
    return getStep(db, sid)!;
  }).immediate();
}

export function proposeStep(db: DB, actor: Actor, input: { title: unknown; detail: unknown }) {
  const personId = requirePersona(actor);
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const detail = typeof input.detail === 'string' ? input.detail.trim().slice(0, 300) : '';
  if (title.length < 3 || title.length > 80) throw new DomainError(400, 'titulo_invalido', 'Contá tu paso en pocas palabras (entre 3 y 80 letras).');
  return db.transaction(() => {
    if (activeStep(db, personId)) throw new DomainError(409, 'ya_hay_un_paso', 'Ya tenés un paso en curso.');
    const now = nowStamp(db);
    const goalId = id('g');
    db.prepare('INSERT INTO goals VALUES (?,?,?,?)').run(goalId, personId, title, now);
    const sid = id('s');
    db.prepare(
      `INSERT INTO step_instances (id, person_id, goal_id, template_id, short_title, action_title, outcome_title, what_to_do, amount, place,
         scheduled_at, icon, status, created_at, updated_at) VALUES (?,?,?,NULL,?,?,?,?,NULL,?,NULL,'star','propuesto',?,?)`,
    ).run(sid, personId, goalId, title, title, 'Lo acordamos con tu referente', detail || 'Paso propuesto por vos.', 'A acordar con tu referente', now, now);
    logEvent(db, sid, null, 'propuesto', actor, detail || null);
    return getStep(db, sid)!;
  }).immediate();
}

export function agreeStep(db: DB, actor: Actor, input: { stepId: unknown; amount: unknown; place: unknown; scheduledAt: unknown; action: unknown }) {
  return db.transaction(() => {
    const step = getStep(db, typeof input.stepId === 'string' ? input.stepId : '');
    if (!step) throw new DomainError(404, 'paso_inexistente', 'No encontramos ese paso.');
    requireAssignedReferente(db, actor, step.person_id);
    expect(step, ['propuesto'], 'Este paso ya fue acordado.');
    const amount = checkAmount(input.amount, 5000);
    const place = typeof input.place === 'string' && input.place.trim() ? input.place.trim().slice(0, 120) : step.place;
    const action = typeof input.action === 'string' && input.action.trim() ? input.action.trim().slice(0, 120) : step.action_title;
    const when = checkDate(db, input.scheduledAt);
    setStatus(db, step, 'elegido', actor, `Acordado: +$${amount.toLocaleString('es-AR')}`, { amount, place, scheduled_at: when, action_title: action });
    return getStep(db, step.id)!;
  }).immediate();
}

export function markAttended(db: DB, actor: Actor, input: { stepId: unknown }) {
  return db.transaction(() => {
    const step = loadOwnStep(db, actor, input.stepId);
    if (step.status === 'pendiente') return step; // reintento: ya estaba marcado
    expect(step, ['elegido'], step.status === 'pausado' ? 'Primero retomá el paso.' : 'Este paso no se puede marcar ahora.');
    setStatus(db, step, 'pendiente', actor, 'Ya fui');
    return getStep(db, step.id)!;
  }).immediate();
}

export function reschedule(db: DB, actor: Actor, input: { stepId: unknown; scheduledAt: unknown }) {
  return db.transaction(() => {
    const step = loadOwnStep(db, actor, input.stepId);
    expect(step, ['elegido', 'pausado'], 'Este paso no se puede reprogramar ahora.');
    const when = checkDate(db, input.scheduledAt);
    setStatus(db, step, 'elegido', actor, `Reprogramado para ${when.replace('T', ' ')}`, { scheduled_at: when });
    return getStep(db, step.id)!;
  }).immediate();
}

export function pauseStep(db: DB, actor: Actor, input: { stepId: unknown }) {
  return db.transaction(() => {
    const step = loadOwnStep(db, actor, input.stepId);
    expect(step, ['elegido'], 'Este paso no se puede pausar ahora.');
    setStatus(db, step, 'pausado', actor, null);
    return getStep(db, step.id)!;
  }).immediate();
}

export function resumeStep(db: DB, actor: Actor, input: { stepId: unknown }) {
  return db.transaction(() => {
    const step = loadOwnStep(db, actor, input.stepId);
    expect(step, ['pausado'], 'Este paso no está pausado.');
    setStatus(db, step, 'elegido', actor, null);
    return getStep(db, step.id)!;
  }).immediate();
}

export function cancelStep(db: DB, actor: Actor, input: { stepId: unknown }) {
  return db.transaction(() => {
    const step = loadOwnStep(db, actor, input.stepId);
    expect(step, ['propuesto', 'elegido', 'pausado', 'revisar'], 'Este paso no se puede cambiar ahora.');
    setStatus(db, step, 'cancelado', actor, 'Cambió de meta');
    db.prepare("UPDATE help_requests SET status = 'resuelta', resolution = 'Paso cambiado', resolved_at = ? WHERE step_id = ? AND status = 'abierta'")
      .run(nowStamp(db), step.id);
    return getStep(db, step.id)!;
  }).immediate();
}

export function resubmit(db: DB, actor: Actor, input: { stepId: unknown; note: unknown }) {
  return db.transaction(() => {
    const step = loadOwnStep(db, actor, input.stepId);
    expect(step, ['revisar'], 'Este paso no está esperando cambios.');
    const note = typeof input.note === 'string' ? input.note.trim().slice(0, 300) : '';
    setStatus(db, step, 'pendiente', actor, note || 'Reenviado', { review_note: null });
    return getStep(db, step.id)!;
  }).immediate();
}

/** Confirmar y acreditar es una sola transacción: cambia el estado y asienta el extra, o no hace nada. */
export function confirmStep(db: DB, actor: Actor, input: { stepId: unknown }) {
  return db.transaction(() => {
    const step = getStep(db, typeof input.stepId === 'string' ? input.stepId : '');
    if (!step) throw new DomainError(404, 'paso_inexistente', 'No encontramos ese paso.');
    requireAssignedReferente(db, actor, step.person_id);
    if (step.status === 'acreditado') return { step, alreadyCredited: true, balance: balance(db, step.person_id) };
    expect(step, ['pendiente'], 'Este paso todavía no está pendiente de confirmación.');
    if (!step.amount) throw new DomainError(409, 'sin_monto', 'Este paso no tiene un extra acordado.');
    const mid = id('m');
    db.prepare(
      `INSERT INTO movements (id, person_id, kind, concept, amount, step_id, idempotency_key, created_at) VALUES (?, ?, 'extra', ?, ?, ?, ?, ?)`,
    ).run(mid, step.person_id, `Extra · ${step.short_title}`, step.amount, step.id, `extra:${step.id}`, nowStamp(db));
    setStatus(db, step, 'acreditado', actor, `Extra acreditado: +$${step.amount.toLocaleString('es-AR')}`, { extra_movement_id: mid, review_note: null });
    return { step: getStep(db, step.id)!, alreadyCredited: false, balance: balance(db, step.person_id) };
  }).immediate();
}

export function requestInfo(db: DB, actor: Actor, input: { stepId: unknown; note: unknown }) {
  return db.transaction(() => {
    const step = getStep(db, typeof input.stepId === 'string' ? input.stepId : '');
    if (!step) throw new DomainError(404, 'paso_inexistente', 'No encontramos ese paso.');
    requireAssignedReferente(db, actor, step.person_id);
    expect(step, ['pendiente'], 'Solo se puede pedir información de un paso pendiente.');
    const note = typeof input.note === 'string' ? input.note.trim().slice(0, 300) : '';
    if (note.length < 3) throw new DomainError(400, 'falta_nota', 'Contá qué hay que revisar.');
    setStatus(db, step, 'revisar', actor, note, { review_note: note });
    return getStep(db, step.id)!;
  }).immediate();
}

export function markOutcome(db: DB, actor: Actor, input: { stepId: unknown }) {
  return db.transaction(() => {
    const step = getStep(db, typeof input.stepId === 'string' ? input.stepId : '');
    if (!step) throw new DomainError(404, 'paso_inexistente', 'No encontramos ese paso.');
    if (actor.role === 'persona') requirePersona(actor, step.person_id);
    else requireAssignedReferente(db, actor, step.person_id);
    expect(step, ['acreditado'], 'El resultado se registra después de completar la acción.');
    if (!step.outcome_reached_at) {
      db.prepare('UPDATE step_instances SET outcome_reached_at = ? WHERE id = ?').run(nowStamp(db), step.id);
      logEvent(db, step.id, 'acreditado', 'acreditado', actor, `Resultado: ${step.outcome_title}`);
    }
    return getStep(db, step.id)!;
  }).immediate();
}

// ---------- Solicitudes de ayuda ----------

export function requestHelp(db: DB, actor: Actor, input: { stepId: unknown; note: unknown }) {
  return db.transaction(() => {
    const step = loadOwnStep(db, actor, input.stepId);
    expect(step, ['elegido', 'pausado', 'revisar'], 'Este paso no admite pedidos de ayuda ahora.');
    const open = db.prepare("SELECT id FROM help_requests WHERE step_id = ? AND status = 'abierta'").get(step.id) as { id: string } | undefined;
    if (open) return open.id;
    const hid = id('h');
    const note = typeof input.note === 'string' ? input.note.trim().slice(0, 200) : '';
    db.prepare("INSERT INTO help_requests (id, person_id, step_id, kind, note, status, created_at) VALUES (?,?,?,'transporte',?,'abierta',?)")
      .run(hid, step.person_id, step.id, note || null, nowStamp(db));
    logEvent(db, step.id, step.status, step.status, actor, 'Pidió ayuda para ir');
    return hid;
  }).immediate();
}

export function resolveHelp(db: DB, actor: Actor, input: { helpId: unknown; resolution: unknown }) {
  return db.transaction(() => {
    const h = db.prepare('SELECT * FROM help_requests WHERE id = ?').get(typeof input.helpId === 'string' ? input.helpId : '') as
      { id: string; person_id: string; step_id: string; status: string } | undefined;
    if (!h) throw new DomainError(404, 'solicitud_inexistente', 'No encontramos esa solicitud.');
    requireAssignedReferente(db, actor, h.person_id);
    if (h.status === 'resuelta') return h.id;
    const resolution = typeof input.resolution === 'string' ? input.resolution.trim().slice(0, 200) : '';
    if (resolution.length < 3) throw new DomainError(400, 'falta_resolucion', 'Contá cómo se resolvió el traslado.');
    db.prepare("UPDATE help_requests SET status = 'resuelta', resolution = ?, resolved_at = ? WHERE id = ?").run(resolution, nowStamp(db), h.id);
    const step = getStep(db, h.step_id)!;
    logEvent(db, step.id, step.status, step.status, actor, `Traslado resuelto: ${resolution}`);
    return h.id;
  }).immediate();
}

export function helpForStep(db: DB, stepId: string) {
  return db.prepare('SELECT id, note, status, resolution, created_at, resolved_at FROM help_requests WHERE step_id = ? ORDER BY created_at DESC LIMIT 1')
    .get(stepId) as { id: string; note: string | null; status: string; resolution: string | null; created_at: string; resolved_at: string | null } | undefined;
}

// ---------- Patrocinio: cargas semanales ----------

export function advanceWeek(db: DB) {
  return db.transaction(() => {
    const { week } = getClock(db);
    db.prepare("UPDATE demo_state SET value = ? WHERE key = 'week'").run(String(week + 1));
    return getClock(db);
  }).immediate();
}

/**
 * Procesa la carga base de la semana de demo actual para cada período con fondos.
 * Una carga por persona y semana (UNIQUE period_id, week_index + clave de idempotencia). Nunca promete semanas sin fondos.
 */
export function processLoads(db: DB) {
  return db.transaction(() => {
    const { week } = getClock(db);
    const periods = db.prepare(
      'SELECT fp.*, f.amount AS fund_amount FROM funding_periods fp JOIN funds f ON f.id = fp.fund_id',
    ).all() as { id: string; person_id: string; weekly_amount: number; weeks_total: number; start_week: number; start_date: string; fund_amount: number }[];
    const credited: { personId: string; week: number; amount: number }[] = [];
    const skipped: { personId: string; reason: string }[] = [];
    for (const p of periods) {
      const index = week - p.start_week + 1;
      if (index < 1) continue;
      if (index > p.weeks_total) { skipped.push({ personId: p.person_id, reason: 'sin_fondos' }); continue; }
      const used = (db.prepare('SELECT COUNT(*) AS n FROM weekly_loads WHERE period_id = ?').get(p.id) as { n: number }).n * p.weekly_amount;
      if (used + p.weekly_amount > p.fund_amount) { skipped.push({ personId: p.person_id, reason: 'sin_fondos' }); continue; }
      const key = `load:${p.id}:${index}`;
      if (db.prepare('SELECT 1 FROM movements WHERE idempotency_key = ?').get(key)) { skipped.push({ personId: p.person_id, reason: 'ya_cargada' }); continue; }
      const mid = id('m');
      db.prepare(`INSERT INTO movements (id, person_id, kind, concept, amount, idempotency_key, created_at) VALUES (?, ?, 'base', ?, ?, ?, ?)`)
        .run(mid, p.person_id, `Base semanal · semana ${index} de ${p.weeks_total}`, p.weekly_amount, key, nowStamp(db));
      db.prepare('INSERT INTO weekly_loads VALUES (?,?,?,?,?)').run(id('wl'), p.id, p.person_id, index, mid);
      credited.push({ personId: p.person_id, week: index, amount: p.weekly_amount });
    }
    return { week, credited, skipped };
  }).immediate();
}

// ---------- Referente: alta y panel ----------

export function organizations(db: DB) {
  return db.prepare('SELECT id, name, kind FROM organizations ORDER BY name').all() as { id: string; name: string; kind: string }[];
}

export function referente(db: DB, referenteId: string) {
  return db.prepare('SELECT r.id, r.name, o.name AS org, r.organization_id FROM referentes r JOIN organizations o ON o.id = r.organization_id WHERE r.id = ?')
    .get(referenteId) as { id: string; name: string; org: string; organization_id: string } | undefined;
}

export function accreditPerson(db: DB, actor: Actor, input: {
  chosenName: unknown; consent: unknown; organizationId: unknown; weeks: unknown; hasPhone: unknown; hasDocument: unknown;
}) {
  if (actor.role !== 'referente') throw new DomainError(403, 'rol_incorrecto', 'El alta la hace un referente.');
  const name = typeof input.chosenName === 'string' ? input.chosenName.trim() : '';
  if (name.length < 2 || name.length > 40) throw new DomainError(400, 'nombre_invalido', 'Escribí el nombre que la persona eligió (2 a 40 letras).');
  if (input.consent !== true) throw new DomainError(400, 'sin_consentimiento', 'Sin consentimiento no se puede hacer el alta.');
  const weeks = Number(input.weeks);
  if (!Number.isInteger(weeks) || weeks < 1 || weeks > 4) throw new DomainError(400, 'periodo_invalido', 'El período cubierto va de 1 a 4 semanas.');
  return db.transaction(() => {
    const org = db.prepare('SELECT id FROM organizations WHERE id = ?').get(input.organizationId) as { id: string } | undefined;
    if (!org) throw new DomainError(400, 'organizacion_invalida', 'Elegí la organización que acredita.');
    const { today, week } = getClock(db);
    const now = nowStamp(db);
    const pid = id('p');
    const hasPhone = input.hasPhone === true ? 1 : 0;
    db.prepare(
      `INSERT INTO persons (id, chosen_name, organization_id, referente_id, consent_at, accredited_on, has_phone, has_document,
         uses_physical_card, cohort, created_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,NULL,?,?)`,
    ).run(pid, name, org.id, actor.referenteId, now, today, hasPhone, input.hasDocument === true ? 1 : 0, hasPhone ? 0 : 1, actor.referenteId, now);
    let code = cardCode();
    while (db.prepare('SELECT 1 FROM cards WHERE card_code = ?').get(code)) code = cardCode();
    const token = opaqueToken();
    db.prepare("INSERT INTO cards VALUES (?,?,?,?,'activa')").run(id('c'), pid, code, token);
    const fid = id('f');
    db.prepare('INSERT INTO funds VALUES (?,?,?)').run(fid, 'Fondo de patrocinio demo (ficticio)', WEEKLY * weeks);
    const fpid = id('fp');
    db.prepare('INSERT INTO funding_periods VALUES (?,?,?,?,?,?,?)').run(fpid, pid, fid, WEEKLY, weeks, week, today);
    const mid = id('m');
    db.prepare(`INSERT INTO movements (id, person_id, kind, concept, amount, idempotency_key, created_at) VALUES (?, ?, 'base', ?, ?, ?, ?)`)
      .run(mid, pid, `Base semanal · semana 1 de ${weeks}`, WEEKLY, `load:${fpid}:1`, now);
    db.prepare('INSERT INTO weekly_loads VALUES (?,?,?,?,?)').run(id('wl'), fpid, pid, 1, mid);
    return { personId: pid, cardCode: code, publicToken: token, chosenName: name, physicalCard: !hasPhone };
  }).immediate();
}

export function referenteDashboard(db: DB, referenteId: string) {
  const people = db.prepare(
    `SELECT p.id, p.chosen_name, p.has_phone, p.has_document, p.uses_physical_card, p.accredited_on, o.name AS org, c.card_code
     FROM persons p JOIN organizations o ON o.id = p.organization_id LEFT JOIN cards c ON c.person_id = p.id
     WHERE p.referente_id = ? AND p.cohort IS NULL ORDER BY p.created_at`,
  ).all(referenteId) as { id: string; chosen_name: string; has_phone: number; has_document: number; uses_physical_card: number; accredited_on: string; org: string; card_code: string }[];
  const ids = people.map((p) => p.id);
  const inList = ids.length ? ids.map(() => '?').join(',') : "''";
  const steps = db.prepare(
    `SELECT s.*, g.title AS goal_title, p.chosen_name FROM step_instances s JOIN goals g ON g.id = s.goal_id JOIN persons p ON p.id = s.person_id
     WHERE s.person_id IN (${inList}) ORDER BY s.scheduled_at`,
  ).all(...ids) as (Step & { chosen_name: string })[];
  const help = db.prepare(
    `SELECT h.*, p.chosen_name, s.short_title, s.scheduled_at, s.place FROM help_requests h JOIN persons p ON p.id = h.person_id
     JOIN step_instances s ON s.id = h.step_id WHERE h.person_id IN (${inList}) ORDER BY h.status, s.scheduled_at`,
  ).all(...ids) as { id: string; chosen_name: string; short_title: string; scheduled_at: string | null; place: string; note: string | null; status: string; resolution: string | null }[];
  const events = db.prepare(
    `SELECT e.*, s.short_title, p.chosen_name FROM step_events e JOIN step_instances s ON s.id = e.step_id JOIN persons p ON p.id = s.person_id
     WHERE s.person_id IN (${inList}) ORDER BY e.id DESC LIMIT 20`,
  ).all(...ids) as { id: number; from_status: string | null; to_status: string; actor: string; note: string | null; at: string; short_title: string; chosen_name: string }[];
  return {
    people: people.map((p) => ({ ...p, balance: balance(db, p.id), active: steps.find((s) => s.person_id === p.id && (ACTIVE as readonly string[]).includes(s.status)) ?? null })),
    pending: steps.filter((s) => s.status === 'pendiente'),
    proposed: steps.filter((s) => s.status === 'propuesto'),
    review: steps.filter((s) => s.status === 'revisar'),
    upcoming: steps.filter((s) => s.status === 'elegido' || s.status === 'pausado'),
    help,
    events,
  };
}

// ---------- Señal de bienestar (descriptiva) ----------

type Indicator = 'basic_need' | 'goal_progress' | 'safe_housing_30';
export const INDICATORS: { key: Indicator; label: string }[] = [
  { key: 'basic_need', label: 'Pudo cubrir una necesidad básica esa semana' },
  { key: 'goal_progress', label: 'Avanzó en una meta que eligió' },
  { key: 'safe_housing_30', label: 'Informó 30 días seguidos o más en un alojamiento que considera seguro' },
];

export function wellbeing(db: DB) {
  const { today } = getClock(db);
  const rows = db.prepare(
    `SELECT p.id, p.cohort, p.accredited_on, p.uses_physical_card, f.basic_need, f.goal_progress, f.safe_housing_30
     FROM persons p LEFT JOIN followups f ON f.person_id = p.id`,
  ).all() as { id: string; cohort: string | null; accredited_on: string; uses_physical_card: number; basic_need: string | null; goal_progress: string | null; safe_housing_30: string | null }[];
  const inTerm = rows.filter((r) => r.cohort && diffDays(today, r.accredited_on) >= 90);
  const outOfTerm = rows.filter((r) => !inTerm.includes(r));
  const cohorts = [...new Set(inTerm.map((r) => r.cohort!))].map((name) => {
    const members = inTerm.filter((r) => r.cohort === name);
    return {
      name,
      accreditedOn: members[0].accredited_on,
      total: members.length,
      physicalCard: members.filter((m) => m.uses_physical_card).length,
      indicators: INDICATORS.map((ind) => ({
        ...ind,
        reached: members.filter((m) => m[ind.key] === 'si').length,
        notYet: members.filter((m) => m[ind.key] === 'no').length,
        noFollowup: members.filter((m) => m[ind.key] === null).length,
      })),
    };
  });
  const pendingGroups = [...new Set(outOfTerm.map((r) => r.cohort ?? 'Altas de esta demo'))].map((name) => {
    const members = outOfTerm.filter((r) => (r.cohort ?? 'Altas de esta demo') === name);
    const first = members.map((m) => m.accredited_on).sort()[0];
    return { name, total: members.length, dueOn: addDays(first, 90) };
  });
  return { today, cohorts, pendingGroups };
}
