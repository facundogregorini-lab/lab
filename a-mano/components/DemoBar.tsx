import Link from 'next/link';

/** Banda visible solo en las vistas de demo (persona y referente). La ruta pública de aportes no la muestra. */
export default function DemoBar({ who }: { who: string }) {
  return (
    <div className="demobar no-print" role="region" aria-label="Entorno de demostración">
      <span><strong>Demo</strong>Viendo como {who} · dinero simulado</span>
      <Link href="/demo">Cambiar de rol</Link>
    </div>
  );
}
