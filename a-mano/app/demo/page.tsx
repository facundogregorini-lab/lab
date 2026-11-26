import Link from 'next/link';
import DemoControls from '@/components/DemoControls';
import { getDb } from '@/lib/db';
import { balance, getClock } from '@/lib/domain';
import { DANI } from '@/lib/seed';
import { dateLabel, money } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function Demo({ searchParams }: { searchParams: Promise<{ falta?: string }> }) {
  const { falta } = await searchParams;
  const db = getDb();
  const { week, today } = getClock(db);
  return (
    <main id="contenido" className="page">
      <div className="demobar" style={{ borderRadius: 10 }}><span><strong>Demo</strong>Selector de rol solo para la demostración · datos ficticios · dinero simulado</span></div>
      <div>
        <Link href="/" className="brand">A mano</Link>
        <h1 style={{ marginTop: 8 }}>Probar la demo</h1>
        <p className="lead">Elegí desde qué lugar mirar. Las tres experiencias comparten los mismos datos del servidor.</p>
      </div>
      {falta && <p className="card-warn">Para entrar a esa vista, primero elegí el rol de {falta}.</p>}

      <section className="grid grid-2">
        <a className="card" href="/api/demo/entrar?como=persona:p_dani" style={{ textDecoration: 'none', color: 'inherit', display: 'grid', gap: 6 }}>
          <b style={{ fontSize: 20 }}>Persona: Dani →</b>
          <span className="muted">Billetera, Dónde comprar, Mis pasos y Mi tarjeta. Saldo hoy: <b className="money">{money(balance(db, DANI))}</b>.</span>
        </a>
        <a className="card" href="/api/demo/entrar?como=referente:r_marta" style={{ textDecoration: 'none', color: 'inherit', display: 'grid', gap: 6 }}>
          <b style={{ fontSize: 20 }}>Referente: Marta →</b>
          <span className="muted">Referente asignada a Dani. Confirma pasos, resuelve traslados y hace altas.</span>
        </a>
        <a className="card" href="/api/demo/entrar?como=referente:r_julian" style={{ textDecoration: 'none', color: 'inherit', display: 'grid', gap: 6 }}>
          <b style={{ fontSize: 20 }}>Otro referente: Julián →</b>
          <span className="muted">No está asignado a Dani: sirve para ver que no puede confirmar sus pasos.</span>
        </a>
        <div className="card" style={{ display: 'grid', gap: 6 }}>
          <b style={{ fontSize: 20 }}>Donante</b>
          <span className="muted">No tiene rol: entra escaneando el QR de Dani o con el enlace de “Recibir aportes”. Esa vista pública no muestra este selector.</span>
        </div>
      </section>

      <section className="card" aria-labelledby="reloj" style={{ display: 'grid', gap: 12 }}>
        <h2 id="reloj">Controles de la demo</h2>
        <p className="muted">Semana {week} de la demo · hoy simulado: {dateLabel(today)}. El fondo ficticio cubre 4 semanas de $ 15.000 para Dani.</p>
        <DemoControls />
      </section>

      <section className="card" aria-labelledby="guion" style={{ display: 'grid', gap: 10 }}>
        <h2 id="guion">Guion de 3 minutos</h2>
        <ol className="script">
          <li><b>Billetera (0:00).</b> Entrá como Dani: $ 15.000 de base, próxima carga y hasta cuándo hay financiación.</li>
          <li><b>Compra (0:30).</b> Dónde comprar → Comedor de Ana → Plato caliente del día → Confirmar. Comprobante y saldo $ 10.500.</li>
          <li><b>Aporte (1:00).</b> Recibir aportes → escaneá el QR con otro teléfono (o copiá el enlace en otra ventana) → $ 2.000 → Confirmar aporte de prueba. La billetera muestra $ 12.500 sola.</li>
          <li><b>Paso (1:40).</b> Mis pasos → Tramitar mi DNI → Elegir este paso → Ya fui. Sigue en $ 12.500: falta la confirmación.</li>
          <li><b>Referente (2:10).</b> Cambiar de rol → Marta → Confirmar y acreditar + $ 3.000.</li>
          <li><b>Cierre (2:40).</b> Volvé a Dani → “Recibiste $ 3.000” → Ver mi saldo: $ 15.500.</li>
        </ol>
      </section>
      <p className="discreet">Nada de esto mueve dinero real ni valida identidad: pagos, emisión de tarjetas y verificación están simulados.</p>
    </main>
  );
}
