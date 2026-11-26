import type { Metadata } from 'next';
import DonateForm from '@/components/DonateForm';
import { getDb } from '@/lib/store';
import { publicProfile } from '@/lib/domain';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Aportar · A mano', robots: { index: false, follow: false } };

// Vista pública para quien aporta. Solo muestra el nombre elegido y cómo se usa el aporte.
export default async function Aportar({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const profile = publicProfile((await getDb()), token);
  return (
    <div className="app">
      <main id="contenido" className="screen" style={{ paddingBottom: 40 }}>
        <div className="brand">A mano</div>
        {!profile ? (
          <>
            <h1>Este enlace no está activo</h1>
            <p className="lead">Puede que la tarjeta se haya dado de baja. No se hizo ningún cobro.</p>
          </>
        ) : (
          <>
            <div>
              <h1>{`Aportá a ${profile.chosenName}`}</h1>
              <p className="lead">Tu aporte llega entero a su billetera A mano.</p>
            </div>
            <section className="card-sage" aria-labelledby="uso" style={{ display: 'grid', gap: 8 }}>
              <h2 id="uso" style={{ fontSize: 19 }}>Cómo se usa</h2>
              <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 4 }}>
                <li>Se gasta en comercios del barrio adheridos: comida, higiene, ropa.</li>
                <li>{profile.chosenName} decide en qué lo usa.</li>
                <li>Nunca genera deuda.</li>
              </ul>
            </section>
            <DonateForm token={token} name={profile.chosenName} />
          </>
        )}
        <p className="discreet">Demo con dinero simulado: no se cobra nada ni se piden datos de tarjeta.</p>
      </main>
    </div>
  );
}
