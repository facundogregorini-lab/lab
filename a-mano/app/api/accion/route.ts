import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import * as d from '@/lib/domain';
import { fail, readJson } from '@/lib/http';
import { getActor } from '@/lib/session';

export const dynamic = 'force-dynamic';

type Handler = (db: ReturnType<typeof getDb>, actor: d.Actor, body: Record<string, unknown>) => unknown;

const ACTIONS: Record<string, Handler> = {
  comprar: (db, a, b) => d.purchase(db, a, { productId: b.productId, idempotencyKey: b.idempotencyKey }),
  elegirPaso: (db, a, b) => d.chooseStep(db, a, { templateId: b.templateId }),
  proponerPaso: (db, a, b) => d.proposeStep(db, a, { title: b.title, detail: b.detail }),
  yaFui: (db, a, b) => d.markAttended(db, a, { stepId: b.stepId }),
  reprogramar: (db, a, b) => d.reschedule(db, a, { stepId: b.stepId, scheduledAt: b.scheduledAt }),
  pausar: (db, a, b) => d.pauseStep(db, a, { stepId: b.stepId }),
  retomar: (db, a, b) => d.resumeStep(db, a, { stepId: b.stepId }),
  cambiarMeta: (db, a, b) => d.cancelStep(db, a, { stepId: b.stepId }),
  reenviar: (db, a, b) => d.resubmit(db, a, { stepId: b.stepId, note: b.note }),
  pedirAyuda: (db, a, b) => d.requestHelp(db, a, { stepId: b.stepId, note: b.note }),
  registrarResultado: (db, a, b) => d.markOutcome(db, a, { stepId: b.stepId }),
  confirmar: (db, a, b) => d.confirmStep(db, a, { stepId: b.stepId }),
  pedirInfo: (db, a, b) => d.requestInfo(db, a, { stepId: b.stepId, note: b.note }),
  acordar: (db, a, b) => d.agreeStep(db, a, { stepId: b.stepId, amount: b.amount, place: b.place, scheduledAt: b.scheduledAt, action: b.action }),
  resolverAyuda: (db, a, b) => d.resolveHelp(db, a, { helpId: b.helpId, resolution: b.resolution }),
  alta: (db, a, b) => d.accreditPerson(db, a, {
    chosenName: b.chosenName, consent: b.consent, organizationId: b.organizationId, weeks: b.weeks, hasPhone: b.hasPhone, hasDocument: b.hasDocument,
  }),
};

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const handler = ACTIONS[String(body.action)];
    if (!handler) return NextResponse.json({ error: 'accion_desconocida', message: 'Acción desconocida.' }, { status: 400 });
    const actor = await getActor();
    if (!actor) return NextResponse.json({ error: 'sin_rol', message: 'Elegí un rol en “Probar la demo”.' }, { status: 401 });
    return NextResponse.json({ ok: true, result: handler(getDb(), actor, body) });
  } catch (e) {
    return fail(e);
  }
}
