'use client';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

/** QR generado en el navegador con el origen actual de la app (si abrís por IP de red, el QR apunta a esa IP). */
export function useOrigin() {
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  return origin;
}

export default function QR({ path, label }: { path: string; label: string }) {
  const origin = useOrigin();
  const [svg, setSvg] = useState('');
  const url = origin ? `${origin}${path}` : '';
  useEffect(() => {
    if (!url) return;
    QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#17492a', light: '#ffffff' } })
      .then(setSvg).catch(() => setSvg(''));
  }, [url]);
  return (
    <div className="qr" role="img" aria-label={label} data-qr-url={url}>
      {svg ? <div style={{ width: '100%', display: 'grid', placeItems: 'center' }} dangerouslySetInnerHTML={{ __html: svg }} /> : <div style={{ height: 240 }} />}
    </div>
  );
}

export function LocalhostHint() {
  const origin = useOrigin();
  const [ips, setIps] = useState<string[]>([]);
  const [port, setPort] = useState('3000');
  const isLocal = /localhost|127\.0\.0\.1|\[::1\]/.test(origin);
  useEffect(() => {
    if (!isLocal) return;
    fetch('/api/red').then((r) => r.json()).then((d) => { setIps(d.ips || []); setPort(d.port || '3000'); }).catch(() => {});
  }, [isLocal]);
  if (!isLocal) return null;
  return (
    <div className="card-warn small" role="note">
      <b>Este QR apunta a {origin}</b>, que otro teléfono no puede abrir.
      {ips.length > 0 ? (
        <> Abrí la demo desde <b>{ips.map((ip) => `http://${ip}:${port}`).join(' o ')}</b> en esta pantalla y el QR va a usar esa dirección.</>
      ) : (
        <> Abrí la demo con la IP de tu computadora en la red local (por ejemplo, http://192.168.0.10:3000).</>
      )}
    </div>
  );
}
