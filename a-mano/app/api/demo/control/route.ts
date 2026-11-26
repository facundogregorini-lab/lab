import { NextResponse } from 'next/server';
import { resetDemo } from '@/lib/db';
import { advanceWeek, processLoads } from '@/lib/domain';
import { fail, readJson } from '@/lib/http';
import { mutate } from '@/lib/store';

export const dynamic = 'force-dynamic';

// Controles exclusivos del entorno de demostración (reloj simulado y cargas del fondo ficticio).
export async function POST(req: Request) {
  try {
    const { op } = await readJson(req);
    if (op === 'avanzar') return NextResponse.json({ ok: true, clock: await mutate((db) => advanceWeek(db)) });
    if (op === 'procesar') return NextResponse.json({ ok: true, result: await mutate((db) => processLoads(db)) });
    if (op === 'reset') { await mutate((db) => resetDemo(db)); return NextResponse.json({ ok: true }); }
    return NextResponse.json({ error: 'op_desconocida', message: 'Operación desconocida.' }, { status: 400 });
  } catch (e) {
    return fail(e);
  }
}
