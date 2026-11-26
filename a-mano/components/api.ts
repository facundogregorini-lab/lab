'use client';

export type ApiResult<T = unknown> = { ok: true; result: T } | { ok: false; message: string; error?: string };

export async function act<T = unknown>(action: string, payload: Record<string, unknown> = {}): Promise<ApiResult<T>> {
  try {
    const r = await fetch('/api/accion', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...payload }),
    });
    const data = await r.json();
    if (!r.ok) return { ok: false, message: data.message || 'No se pudo completar.', error: data.error };
    return { ok: true, result: data.result as T };
  } catch {
    return { ok: false, message: 'Sin conexión. Probá de nuevo: no se va a cobrar dos veces.' };
  }
}

export function newKey() {
  return (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, '');
}
