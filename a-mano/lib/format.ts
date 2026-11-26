const nf = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

export function money(n: number) {
  return `$ ${nf.format(Math.abs(n))}`;
}

export function signed(n: number) {
  return `${n < 0 ? '−' : '+'} ${money(n)}`;
}

const DAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

export function dateLabel(date: string | null | undefined) {
  if (!date) return 'A definir';
  const [d, t] = date.split('T');
  const dt = new Date(`${d}T12:00:00Z`);
  const [, m, day] = d.split('-');
  return `${DAYS[dt.getUTCDay()]} ${Number(day)}/${Number(m)}${t ? ` · ${t.slice(0, 5)}` : ''}`;
}

export function shortDate(date: string | null | undefined) {
  if (!date) return '';
  const [, m, day] = date.slice(0, 10).split('-');
  return `${Number(day)}/${Number(m)}`;
}

export function distance(m: number) {
  return m < 1000 ? `a ${m} m` : `a ${(m / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} km`;
}

export const STATUS: Record<string, { label: string; tone: 'neutral' | 'progress' | 'wait' | 'warn' | 'done' | 'muted' }> = {
  disponible: { label: 'Disponible', tone: 'neutral' },
  propuesto: { label: 'Propuesto · a acordar', tone: 'wait' },
  elegido: { label: 'Elegido', tone: 'progress' },
  pendiente: { label: 'Pendiente de confirmación', tone: 'wait' },
  revisar: { label: 'Para revisar', tone: 'warn' },
  pausado: { label: 'En pausa', tone: 'muted' },
  acreditado: { label: 'Extra acreditado', tone: 'done' },
  cancelado: { label: 'Cambiado por otra meta', tone: 'muted' },
};
