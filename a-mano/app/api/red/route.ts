import os from 'node:os';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Direcciones de la red local, para sugerir una URL que otro teléfono pueda abrir al escanear el QR.
export async function GET() {
  const ips = Object.values(os.networkInterfaces()).flat()
    .filter((i): i is os.NetworkInterfaceInfo => !!i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
  return NextResponse.json({ ips, port: process.env.PORT || '3000' });
}
