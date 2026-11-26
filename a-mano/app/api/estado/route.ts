import { NextResponse } from 'next/server';
import { getDb } from '@/lib/store';

export const dynamic = 'force-dynamic';

// Huella de cambios para que las pantallas abiertas se actualicen solas (por ejemplo, cuando llega un aporte desde otro teléfono).
export async function GET() {
  const r = (await getDb()).prepare(
    `SELECT (SELECT COUNT(*) FROM movements) || '.' || (SELECT COALESCE(MAX(id), 0) FROM step_events) || '.' ||
            (SELECT COUNT(*) FROM help_requests WHERE status = 'abierta') || '.' || (SELECT value FROM demo_state WHERE key = 'week') || '.' ||
            (SELECT COUNT(*) FROM persons) AS v`,
  ).get() as { v: string };
  return NextResponse.json({ v: r.v }, { headers: { 'Cache-Control': 'no-store' } });
}
