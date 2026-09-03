import { NextResponse } from 'next/server';
import net from 'net';
import { validateSafeTarget } from '@/lib/validators';

const COMMON_PORTS = [80, 443, 22, 21, 25, 3306, 5432, 8080];

async function checkPort(host: string, port: number, timeout: number = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    
    socket.setTimeout(timeout);

    socket.connect(port, host, () => {
      socket.destroy();
      resolve(true);
    });

    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
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

  try {
    const results = await Promise.all(
      COMMON_PORTS.map(async (port) => ({
        port,
        open: await checkPort(cleanTarget, port)
      }))
    );

    return NextResponse.json({
      target: cleanTarget,
      ports: results
    });
  } catch (error) {
    console.error('Port scan error:', error);
    return NextResponse.json({ error: 'Port scan failed' }, { status: 500 });
  }
}
