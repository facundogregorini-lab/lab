import { NextResponse } from 'next/server';
import { getDb, resetDemo } from '@/lib/db';
import { advanceWeek, processLoads } from '@/lib/domain';
import { fail, readJson } from '@/lib/http';

export const dynamic = 'force-dynamic';

// Controles exclusivos del entorno de demostración (reloj simulado y cargas del fondo ficticio).
export async function POST(req: Request) {
  try {
    const { op } = await readJson(req);
    const db = getDb();
    if (op === 'avanzar') return NextResponse.json({ ok: true, clock: advanceWeek(db) });
    if (op === 'procesar') return NextResponse.json({ ok: true, result: processLoads(db) });
    if (op === 'avanzarYProcesar') { advanceWeek(db); return NextResponse.json({ ok: true, result: processLoads(db) }); }
    if (op === 'reset') { resetDemo(db); return NextResponse.json({ ok: true }); }
    return NextResponse.json({ error: 'op_desconocida', message: 'Operación desconocida.' }, { status: 400 });
  } catch (e) {
    return fail(e);
  }
}
