import { NextResponse } from 'next/server';
import { targetSchema } from '@/lib/validators';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

interface TracerouteHop {
  hop: number;
  ip: string;
  host: string;
  latency: number;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get('target');

  const validation = targetSchema.safeParse(target);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.message }, { status: 400 });
  }

  const cleanTarget = validation.data;
  const isWindows = os.platform() === 'win32';
  const command = isWindows
    ? `tracert -d -h 15 -w 1000 ${cleanTarget}`
    : `traceroute -m 15 -q 1 -w 1 -n ${cleanTarget}`;

  try {
    const { stdout } = await execAsync(command, { timeout: 15000 });
    const lines = stdout.split('\n');
    const hops: TracerouteHop[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Formato Unix: " 1  192.168.1.1  1.234 ms"
      const matchUnix = trimmed.match(/^(\d+)\s+((?:\d{1,3}\.){3}\d{1,3}|\*)\s+(?:(\d+(?:\.\d+)?)\s*ms)?/);
      // Formato Windows: "  1     1 ms    <1 ms    1 ms  192.168.1.1"
      const matchWin = trimmed.match(/^(\d+)\s+(?:[\d<]+ ms|\*)\s+(?:[\d<]+ ms|\*)\s+(?:[\d<]+ ms|\*)\s+((?:\d{1,3}\.){3}\d{1,3})/);

      if (matchUnix) {
        const hopNum = parseInt(matchUnix[1], 10);
        const ip = matchUnix[2];
        const lat = matchUnix[3] ? parseFloat(matchUnix[3]) : 0;
        if (ip && ip !== '*') {
          hops.push({
            hop: hopNum,
            ip,
            host: ip,
            latency: Math.round(lat * 10) / 10
          });
        }
      } else if (matchWin) {
        const hopNum = parseInt(matchWin[1], 10);
        const ip = matchWin[2];
        hops.push({
          hop: hopNum,
          ip,
          host: ip,
          latency: 1
        });
      }
    }

    return NextResponse.json({
      target: cleanTarget,
      totalHops: hops.length,
      hops,
      destinationReached: hops.some(h => h.ip === cleanTarget || h.host.includes(cleanTarget)),
      status: hops.length > 0 ? 'pass' : 'warning',
      message: hops.length > 0
        ? `Traceroute completato con successo (${hops.length} hop rilevati).`
        : 'Nessun nodo intermedio ha risposto con pacchetti ICMP Time Exceeded entro il timeout.'
    });
  } catch {
    return NextResponse.json({
      error: 'Comando traceroute CLI non disponibile sull\'ambiente di hosting o timeout scaduto.'
    }, { status: 503 });
  }
}
