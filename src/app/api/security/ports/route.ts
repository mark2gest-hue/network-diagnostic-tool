import { NextResponse } from 'next/server';
import net from 'net';
import { targetSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

const RISKY_PORTS = [
  { port: 3306, name: 'MySQL', risk: 'critical', recommendation: 'Database exposed! Chiudi l\'accesso pubblico e usa una VPN o un tunnel SSH.' },
  { port: 5432, name: 'PostgreSQL', risk: 'critical', recommendation: 'Database exposed! Chiudi l\'accesso pubblico.' },
  { port: 22, name: 'SSH', risk: 'warning', recommendation: 'SSH aperto. Assicurati di usare chiavi SSH e non password, o limita l\'accesso IP.' },
  { port: 21, name: 'FTP', risk: 'critical', recommendation: 'FTP è un protocollo insicuro. Usa SFTP o FTPS.' },
  { port: 23, name: 'Telnet', risk: 'critical', recommendation: 'Telnet invia dati in chiaro. Disabilitalo immediatamente.' },
  { port: 3389, name: 'RDP', risk: 'critical', recommendation: 'RDP esposto è un bersaglio comune per ransomware.' }
];

async function checkPort(host: string, port: number, timeout: number = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);
    socket.connect(port, host, () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => { socket.destroy(); resolve(false); });
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawTarget = searchParams.get('target');
  const target = (rawTarget || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();

  const validation = targetSchema.safeParse(target);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.message }, { status: 400 });
  }

  try {
    const validatedTarget = validation.data;
    const results = await Promise.all(
      RISKY_PORTS.map(async (p) => ({
        ...p,
        open: await checkPort(validatedTarget, p.port)
      }))
    );

    const openRiskyPorts = results.filter(r => r.open);

    return NextResponse.json({
      status: openRiskyPorts.some(p => p.risk === 'critical') ? 'fail' : (openRiskyPorts.length > 0 ? 'warning' : 'pass'),
      openRiskyPorts,
      message: openRiskyPorts.length > 0 
        ? `Trovate ${openRiskyPorts.length} porte a rischio aperte` 
        : 'Nessuna porta critica comune rilevata come aperta',
      recommendation: openRiskyPorts.length > 0 
        ? 'Rivedi la configurazione del firewall e chiudi le porte non necessarie.' 
        : 'Ottimo! Le porte critiche non sono esposte direttamente.'
    });
  } catch {
    return NextResponse.json({ error: 'Controllo porte a rischio fallito' }, { status: 500 });
  }
}
