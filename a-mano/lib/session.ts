import { cookies } from 'next/headers';
import type { Actor } from './domain';
import { getDb } from './store';

// Selector de rol SOLO para la demo: una cookie dice si mirás como persona o como referente.
export const ROLE_COOKIE = 'amano_demo_rol';

export async function parseRole(value: string | undefined | null): Promise<Actor | null> {
  if (!value) return null;
  const [role, who] = value.split(':');
  const db = await getDb();
  if (role === 'persona' && db.prepare('SELECT 1 FROM persons WHERE id = ? AND cohort IS NULL').get(who)) return { role: 'persona', personId: who };
  if (role === 'referente' && db.prepare('SELECT 1 FROM referentes WHERE id = ?').get(who)) return { role: 'referente', referenteId: who };
  return null;
}

export async function getActor(): Promise<Actor | null> {
  const store = await cookies();
  return parseRole(store.get(ROLE_COOKIE)?.value);
}
