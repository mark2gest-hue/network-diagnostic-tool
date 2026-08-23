import { NextResponse } from 'next/server';
import { targetSchema } from '@/lib/validators';
import tls from 'tls';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawTarget = searchParams.get('target');
  const target = (rawTarget || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();

  const validation = targetSchema.safeParse(target);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.message }, { status: 400 });
  }

  const cleanTarget = validation.data;

  try {
    // Negoziamo ALPN per verificare h2 / http/1.1
    const alpnResult = await new Promise<{
      alpnProtocol: string | false | null;
      tlsVersion: string;
      cipher: string;
    }>((resolve, reject) => {
      const socket = tls.connect({
        host: cleanTarget,
        port: 443,
        servername: cleanTarget,
        ALPNProtocols: ['h2', 'http/1.1'],
        timeout: 5000
      }, () => {
        const alpn = socket.alpnProtocol;
        const proto = socket.getProtocol() || 'TLS';
        const cipherInfo = socket.getCipher()?.name || 'Unknown';
        socket.end();
        resolve({
          alpnProtocol: alpn,
          tlsVersion: proto,
          cipher: cipherInfo
        });
      });

      socket.on('error', (err) => reject(err));
      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('Timeout TLS Handshake'));
      });
    });

    const supportsH2 = alpnResult.alpnProtocol === 'h2';

    // Verifichiamo se ci sono header di Alt-Svc che indicano supporto HTTP/3 (h3)
    let supportsH3 = false;
    let altSvcHeader = '';
    try {
      const res = await fetch(`https://${cleanTarget}`, { method: 'HEAD' });
      altSvcHeader = res.headers.get('alt-svc') || '';
      supportsH3 = altSvcHeader.includes('h3');
    } catch {
      // Ignora errore fetch secondario
    }

    const protocolsList: string[] = ['HTTP/1.1'];
    if (supportsH2) protocolsList.push('HTTP/2 (Multiplexing)');
    if (supportsH3) protocolsList.push('HTTP/3 (QUIC / UDP)');

    return NextResponse.json({
      target: cleanTarget,
      status: supportsH2 || supportsH3 ? 'pass' : 'warning',
      supportsH2,
      supportsH3,
      negotiatedProtocol: alpnResult.alpnProtocol || 'http/1.1',
      tlsVersion: alpnResult.tlsVersion,
      cipher: alpnResult.cipher,
      altSvcHeader: altSvcHeader || 'Non presente',
      protocols: protocolsList,
      message: supportsH3 
        ? 'Supporto all\'avanguardia: Attivo sia HTTP/2 che HTTP/3 (QUIC over UDP).'
        : supportsH2
        ? 'Supporto moderno: HTTP/2 attivo per multiplexing e prestazioni ottimali.'
        : 'Server limitato a HTTP/1.1 legacy.',
      recommendation: supportsH2 || supportsH3
        ? 'Configurazione protocolli web eccellente.'
        : 'Abilita HTTP/2 o HTTP/3 nel web server/CDN per velocizzare i tempi di caricamento delle pagine.'
    });
  } catch {
    return NextResponse.json({ error: 'Verifica protocolli HTTP fallita' }, { status: 500 });
  }
}
