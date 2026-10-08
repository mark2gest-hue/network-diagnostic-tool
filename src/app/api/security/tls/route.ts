import { NextResponse } from 'next/server';
import tls from 'tls';
import dns from 'dns/promises';
import { domainSchema, formatZodError } from '@/lib/validators';

export const dynamic = 'force-dynamic';

const TLS_VERSIONS = [
  { version: 'TLSv1.3', status: 'pass' },
  { version: 'TLSv1.2', status: 'pass' },
  { version: 'TLSv1.1', status: 'fail' },
  { version: 'TLSv1', status: 'fail' }
];

async function checkTlsVersion(domain: string, version: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
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

      socket.setTimeout(3500, () => {
        socket.destroy();
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

async function checkWeakCipher(domain: string, ciphers: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const socket = tls.connect(443, domain, {
        servername: domain,
        ciphers,
        rejectUnauthorized: false
      }, () => {
        socket.end();
        resolve(true); // Handshake riuscito -> cifrario accettato (debolezza presente)
      });

      socket.on('error', () => {
        resolve(false); // Rifiutato -> sicuro
      });

      socket.setTimeout(3000, () => {
        socket.destroy();
        resolve(false);
      });
    } catch {
      // In caso di OpenSSL no cipher match o rifiuto locale del client
      resolve(false);
    }
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawDomain = searchParams.get('domain');
  const domain = (rawDomain || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();

  const validation = domainSchema.safeParse(domain);
  if (!validation.success) {
    return NextResponse.json({ error: formatZodError(validation.error) }, { status: 400 });
  }

  const validatedDomain = validation.data;
  try {
    // 1. Ispezione Versioni Protocollo TLS
    const results = await Promise.all(
      TLS_VERSIONS.map(async (v) => {
        const supported = await checkTlsVersion(validatedDomain, v.version);
        return { ...v, supported };
      })
    );

    // 2. Ispezione Cifrari Deboli / Deprecati (3DES Sweet32 e RC4)
    const [supports3Des, supportsRc4] = await Promise.all([
      checkWeakCipher(validatedDomain, 'DES-CBC3-SHA'),
      checkWeakCipher(validatedDomain, 'RC4-SHA:RC4-MD5')
    ]);

    const weakCiphers = [
      { name: '3DES (Sweet32 / CVE-2016-2183)', supported: supports3Des, status: supports3Des ? 'fail' : 'pass' },
      { name: 'RC4 (Bar Mitzvah / RFC 7465)', supported: supportsRc4, status: supportsRc4 ? 'fail' : 'pass' }
    ];

    // 3. Verifica DNS CAA (Certification Authority Authorization)
    const caaRecords = await dns.resolveCaa(validatedDomain).catch(() => []);
    const hasCaa = caaRecords.length > 0;

    // 4. Calcolo Punteggio Crittografico (0-100)
    let score = 100;
    const insecureVersions = results.filter(r => r.supported && r.status === 'fail');
    const tls13Supported = results.find(r => r.version === 'TLSv1.3')?.supported;

    if (insecureVersions.some(r => r.version === 'TLSv1')) score -= 25;
    if (insecureVersions.some(r => r.version === 'TLSv1.1')) score -= 15;
    if (supports3Des) score -= 20;
    if (supportsRc4) score -= 25;
    if (!tls13Supported) score -= 10;
    score = Math.max(0, Math.min(100, score));

    const hasVulnerabilities = insecureVersions.length > 0 || supports3Des || supportsRc4;
    let status: 'pass' | 'warning' | 'fail' = 'pass';
    if (insecureVersions.length > 0 || supportsRc4) {
      status = 'fail';
    } else if (supports3Des || !tls13Supported) {
      status = 'warning';
    }

    let message = 'Suite TLS solida: solo protocolli moderni (TLS 1.2 / 1.3) e nessun cifrario obsoleto.';
    let recommendation = 'La configurazione crittografica rispetta le best practice di sicurezza.';

    if (hasVulnerabilities) {
      const issues: string[] = [];
      if (insecureVersions.length > 0) issues.push(`protocolli deprecati (${insecureVersions.map(r => r.version).join(', ')})`);
      if (supports3Des) issues.push('cifrario 3DES vulnerabile a Sweet32');
      if (supportsRc4) issues.push('cifrario debole RC4');

      message = `Rilevate vulnerabilità crittografiche: ${issues.join('; ')}.`;
      recommendation = 'Disabilita TLS 1.0/1.1 e rimuovi cifrari legacy dalla configurazione OpenSSL / Nginx / Apache.';
    }

    return NextResponse.json({
      status,
      score,
      results,
      weakCiphers,
      hasCaa,
      caaCount: caaRecords.length,
      message,
      recommendation,
      mitre: {
        defend: 'D3-EPSC (Encrypted Protocol Suite Configuration)'
      }
    });
  } catch {
    return NextResponse.json({ error: 'Errore durante il controllo approfondito TLS' }, { status: 500 });
  }
}
