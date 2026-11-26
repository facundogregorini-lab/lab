'use client';
import { useState } from 'react';
import { useOrigin } from './QR';

export default function ShareLink({ path }: { path: string }) {
  const origin = useOrigin();
  const [copied, setCopied] = useState(false);
  const url = origin ? `${origin}${path}` : path;
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <label className="field">Enlace para aportar
        <input className="input" readOnly value={url} onFocus={(e) => e.currentTarget.select()} data-testid="enlace-publico" />
      </label>
      <div className="row">
        <button
          type="button" className="btn btn-outline btn-sm"
          onClick={async () => {
            try { await navigator.clipboard.writeText(url); } catch {
              const i = document.querySelector<HTMLInputElement>('[data-testid="enlace-publico"]'); i?.select(); document.execCommand?.('copy');
            }
            setCopied(true); setTimeout(() => setCopied(false), 2500);
          }}
        >
          {copied ? '✓ Enlace copiado' : 'Copiar enlace'}
        </button>
        <a className="btn btn-outline btn-sm" href={path} target="_blank" rel="noopener">Abrir vista pública</a>
      </div>
      <p className="sr-only" aria-live="polite">{copied ? 'Enlace copiado' : ''}</p>
    </div>
  );
}
