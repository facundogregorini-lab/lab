import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'A mano',
  description: 'Billetera de acompañamiento. Demo con datos ficticios y dinero simulado.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#fbf8f0' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <body>
        <a className="skip" href="#contenido">Saltar al contenido</a>
        {children}
      </body>
    </html>
  );
}
