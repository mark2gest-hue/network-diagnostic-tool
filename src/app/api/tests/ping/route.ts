import { NextResponse } from 'next/server';
import net from 'net';
import { targetSchema } from '@/lib/validators';

function tcpPing(host: string, port: number = 80, timeout: number = 5000): Promise<number> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const socket = new net.Socket();

    socket.connect(port, host, () => {
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

  const validation = targetSchema.safeParse(target);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.message }, { status: 400 });
  }

  try {
    // Try port 443 first, then 80 as fallback
    let latency: number;
    try {
      latency = await tcpPing(target!, 443);
    } catch {
      latency = await tcpPing(target!, 80);
    }

    return NextResponse.json({
      target,
      latency,
      unit: 'ms',
      method: 'TCP Connect'
    });
  } catch (error) {
    console.error('Ping error:', error);
    return NextResponse.json({ error: 'Ping failed (host unreachable via TCP 80/443)' }, { status: 500 });
  }
}
