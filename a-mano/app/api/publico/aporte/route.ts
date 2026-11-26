import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { contribute } from '@/lib/domain';
import { fail, readJson } from '@/lib/http';

export const dynamic = 'force-dynamic';

// Ruta pública: no usa la cookie de rol y no devuelve nada de la billetera (ni saldo ni movimientos).
export async function POST(req: Request) {
  try {
    const b = await readJson(req);
    const r = contribute(getDb(), { token: b.token, amount: b.amount, idempotencyKey: b.idempotencyKey });
    return NextResponse.json({ ok: true, credited: r.credited });
  } catch (e) {
    return fail(e);
  }
}
