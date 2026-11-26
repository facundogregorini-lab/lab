import Link from 'next/link';

export default function Home() {
  return (
    <main id="contenido" className="page">
      <div className="hero">A mano</div>
      <h1>Una billetera para resolver hoy y elegir el próximo paso.</h1>
      <p className="lead">
        Para personas en situación de calle en Buenos Aires, acreditadas por una organización de confianza. Una base semanal patrocinada,
        aportes de vecinos por QR y extras por pasos que la persona elige. Nada genera deuda.
      </p>
      <div className="grid grid-2">
        <div className="card-sage"><b>Base semanal</b><p className="small">Incondicional durante el período financiado.</p></div>
        <div className="card-sage"><b>Extras por pasos</b><p className="small">La persona elige; su referente confirma.</p></div>
      </div>
      <p className="discreet"><Link href="/demo">Probar la demo</Link> · datos ficticios y dinero simulado</p>
    </main>
  );
}
