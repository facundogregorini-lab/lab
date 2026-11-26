'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { act } from './api';

type Props = {
  action: string;
  payload?: Record<string, unknown>;
  children: React.ReactNode;
  className?: string;
  redirectTo?: string;
  confirm?: string;
};

/** Botón que llama a una acción del servidor una sola vez (se bloquea mientras espera) y refresca la pantalla. */
export default function ActionButton({ action, payload = {}, children, className = 'btn btn-primary', redirectTo }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <button
        type="button"
        className={className}
        disabled={busy}
        aria-busy={busy}
        onClick={async () => {
          if (busy) return;
          setBusy(true);
          setError(null);
          const r = await act(action, payload);
          if (!r.ok) { setError(r.message); setBusy(false); return; }
          if (redirectTo) router.push(redirectTo);
          router.refresh();
          setBusy(false);
        }}
      >
        {busy ? 'Un momento…' : children}
      </button>
      {error && <p role="alert" className="card-error">{error}</p>}
    </div>
  );
}
