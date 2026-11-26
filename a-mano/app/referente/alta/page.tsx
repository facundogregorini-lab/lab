import AltaForm from '@/components/AltaForm';
import { getDb } from '@/lib/store';
import { organizations, referente } from '@/lib/domain';
import { requireReferenteId } from '@/lib/me';

export const dynamic = 'force-dynamic';

export default async function Alta() {
  const refId = await requireReferenteId();
  const db = (await getDb());
  return (
    <>
      <div>
        <h1>Nueva alta en recorrida</h1>
        <p className="lead">Acreditá a una persona ficticia. Sirve aunque no tenga celular ni documento.</p>
      </div>
      <AltaForm orgs={organizations(db)} defaultOrg={referente(db, refId)!.organization_id} />
    </>
  );
}
