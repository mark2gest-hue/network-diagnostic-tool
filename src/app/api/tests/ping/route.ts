import { NextResponse } from 'next/server';
import net from 'net';
import { validateSafeTarget } from '@/lib/validators';
import { createPinnedLookup, type PinnedLookupFn } from '@/lib/security-guard';

function tcpPing(host: string, port: number = 80, timeout: number = 5000, lookup?: PinnedLookupFn): Promise<number> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const socket = new net.Socket();

    socket.connect({ port, host, lookup }, () => {
      const duration = Date.now() - start;
      socket.destroy();
      resolve(duration);
    });

    socket.on('error', (err) => {
      socket.destroy();
      reject(err);
    });

    socket.setTimeout(timeout, () => {
      socket.destroy();
      reject(new Error('Ping timeout'));
    });
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get('target');

  const validation = await validateSafeTarget(target);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const cleanTarget = validation.target;
  // Pinna il DNS agli IP validati (anti TOCTOU/DNS Rebinding)
  const lookup = createPinnedLookup(validation.resolvedIps);

  try {
    // Try port 443 first, then 80 as fallback
    let latency: number;
    try {
      latency = await tcpPing(cleanTarget, 443, 5000, lookup);
    } catch {
      latency = await tcpPing(cleanTarget, 80, 5000, lookup);
    }

    return NextResponse.json({
      target: cleanTarget,
      latency,
      unit: 'ms',
      method: 'TCP Connect'
    });
  } catch (error) {
    console.error('Ping error:', error);
    return NextResponse.json({ error: 'Ping failed (host unreachable via TCP 80/443)' }, { status: 500 });
  }
}
