import { NextResponse } from 'next/server';
import tls from 'tls';
import { domainSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

const TLS_VERSIONS = [
  { version: 'TLSv1.3', status: 'pass' },
  { version: 'TLSv1.2', status: 'pass' },
  { version: 'TLSv1.1', status: 'fail' },
  { version: 'TLSv1', status: 'fail' }
];

async function checkTlsVersion(domain: string, version: string): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = tls.connect(443, domain, { 
      servername: domain, 
      minVersion: version as tls.SecureVersion, 
      maxVersion: version as tls.SecureVersion,
      rejectUnauthorized: false
    }, () => {
      socket.end();
      resolve(true);
    });

    socket.on('error', () => {
      resolve(false);
    });

    socket.setTimeout(5000, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawDomain = searchParams.get('domain');
  const domain = (rawDomain || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();

  const validation = domainSchema.safeParse(domain);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.message }, { status: 400 });
  }

  const validatedDomain = validation.data;
  try {
    const results = await Promise.all(
      TLS_VERSIONS.map(async (v) => {
        const supported = await checkTlsVersion(validatedDomain, v.version);
        return { ...v, supported };
      })
    );

    const insecureSupported = results.filter(r => r.supported && r.status === 'fail');

    return NextResponse.json({
      status: insecureSupported.length > 0 ? 'fail' : 'pass',
      results,
      message: insecureSupported.length > 0 
        ? `Protocolli insicuri rilevati: ${insecureSupported.map(r => r.version).join(', ')}` 
        : 'Solo protocolli TLS sicuri (1.2+) sono supportati',
      recommendation: insecureSupported.length > 0 
        ? 'Disabilita il supporto a TLS 1.0 e 1.1 sul tuo server per garantire una connessione sicura.' 
        : 'Ottimo! Il tuo server utilizza configurazioni TLS moderne.'
    });
  } catch {
    return NextResponse.json({ error: 'Errore durante il controllo TLS' }, { status: 500 });
  }
}
