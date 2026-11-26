'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CardIcon, HomeIcon, StepsIcon } from './Icons';

const TABS = [
  { href: '/persona', label: 'Inicio', Icon: HomeIcon, match: (p: string) => p === '/persona' || p.startsWith('/persona/comprar') || p.startsWith('/persona/comprobante') || p.startsWith('/persona/aportes') },
  { href: '/persona/pasos', label: 'Mis pasos', Icon: StepsIcon, match: (p: string) => p.startsWith('/persona/pasos') },
  { href: '/persona/tarjeta', label: 'Mi tarjeta', Icon: CardIcon, match: (p: string) => p.startsWith('/persona/tarjeta') },
];

export default function TabBar() {
  const path = usePathname();
  return (
    <nav className="tabbar no-print" aria-label="Secciones">
      <ul>
        {TABS.map(({ href, label, Icon, match }) => (
          <li key={href}>
            <Link href={href} aria-current={match(path) ? 'page' : undefined}>
              <Icon size={28} />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
