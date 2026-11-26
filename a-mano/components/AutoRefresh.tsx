'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

/** Mantiene la pantalla al día con el servidor: si alguien aporta desde otro teléfono, el saldo cambia solo. */
export default function AutoRefresh({ every = 3000 }: { every?: number }) {
  const router = useRouter();
  const last = useRef<string | null>(null);
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch('/api/estado', { cache: 'no-store' });
        const { v } = await r.json();
        if (last.current !== null && v !== last.current) router.refresh();
        last.current = v;
      } catch { /* sin red: reintenta en el próximo ciclo */ }
    };
    tick();
    const t = setInterval(() => { if (alive && document.visibilityState === 'visible') tick(); }, every);
    return () => { alive = false; clearInterval(t); };
  }, [router, every]);
  return null;
}
