import { NextResponse } from 'next/server';
import { ROLE_COOKIE, parseRole } from '@/lib/session';

export const dynamic = 'force-dynamic';

// /api/demo/entrar?como=persona:p_dani  → deja la cookie del rol de demo y lleva a su vista.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const como = url.searchParams.get('como');
  const actor = parseRole(como);
  const dest = actor?.role === 'persona' ? '/persona' : actor?.role === 'referente' ? '/referente' : '/demo';
  const res = new NextResponse(null, { status: 303, headers: { Location: url.searchParams.get('ir') || dest } });
  if (actor && como) res.cookies.set(ROLE_COOKIE, como, { path: '/', sameSite: 'lax', httpOnly: true, maxAge: 60 * 60 * 24 * 7 });
  else res.cookies.delete(ROLE_COOKIE);
  return res;
}
