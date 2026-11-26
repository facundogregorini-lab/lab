import { redirect } from 'next/navigation';
import { getActor } from './session';

export async function requirePersonaId() {
  const a = await getActor();
  if (a?.role !== 'persona') redirect('/demo?falta=persona');
  return a.personId;
}

export async function requireReferenteId() {
  const a = await getActor();
  if (a?.role !== 'referente') redirect('/demo?falta=referente');
  return a.referenteId;
}
