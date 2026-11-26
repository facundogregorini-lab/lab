import crypto from 'node:crypto';

export function id(prefix: string) {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

/** Token opaco para el enlace público: no deriva de ningún dato de la persona. */
export function opaqueToken() {
  return crypto.randomBytes(16).toString('base64url');
}

export function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return isoDate(d);
}

export function diffDays(a: string, b: string) {
  return Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / 86400000);
}

export function cardCode() {
  const n = () => String(crypto.randomInt(0, 10000)).padStart(4, '0');
  return `AM-${n()}-${n()}`;
}
