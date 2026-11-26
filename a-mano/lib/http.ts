import { NextResponse } from 'next/server';
import { DomainError } from './domain';

export function fail(e: unknown) {
  if (e instanceof DomainError) return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
  console.error(e);
  return NextResponse.json({ error: 'error_interno', message: 'Algo salió mal. Probá de nuevo.' }, { status: 500 });
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === 'object' ? body : {};
  } catch {
    return {};
  }
}
