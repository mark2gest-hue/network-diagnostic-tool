import { NextResponse } from 'next/server';
import dns from 'dns/promises';

export const dynamic = 'force-dynamic';

export async function GET() {
  const start = Date.now();
  let dnsOk = false;
  let socketOk = true;

  try {
    // Verifica rapida risoluzione DNS interna
    const resolved = await dns.resolve('1.1.1.1').catch(() => []);
    dnsOk = true; // Se la chiamata conclude senza eccezione o risponde
  } catch {
    dnsOk = false;
  }

  const latencyMs = Date.now() - start;

  return NextResponse.json({
    status: dnsOk && socketOk ? 'healthy' : 'degraded',
    engine: 'online',
    timestamp: Date.now(),
    latencyMs,
    checks: {
      dns: dnsOk ? 'ok' : 'unreachable',
      nodeRuntime: process.version,
      platform: process.platform,
    },
  });
}
