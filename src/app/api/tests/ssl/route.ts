import { NextResponse } from 'next/server';
import tls from 'tls';
import { domainSchema } from '@/lib/validators';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get('domain');

  const validation = domainSchema.safeParse(domain);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.message }, { status: 400 });
  }

  try {
    const cert = await new Promise<tls.PeerCertificate | null>((resolve, reject) => {
      const socket = tls.connect(443, domain!, { servername: domain!, rejectUnauthorized: false }, () => {
        const peerCert = socket.getPeerCertificate(true);
        socket.end();
        resolve(peerCert && Object.keys(peerCert).length > 0 ? peerCert : null);
      });

      socket.on('error', (err) => {
        reject(err);
      });

      socket.setTimeout(10000, () => {
        socket.destroy();
        reject(new Error('SSL/TLS handshake timeout'));
      });
    });

    if (!cert) {
      return NextResponse.json({ error: 'Could not retrieve certificate' }, { status: 500 });
    }

    const validFrom = new Date(cert.valid_from).getTime();
    const validTo = new Date(cert.valid_to).getTime();
    const now = Date.now();
    const isValid = now >= validFrom && now <= validTo;

    const issuer = cert.issuer as { O?: string; CN?: string };
    const subject = cert.subject as { CN?: string };

    return NextResponse.json({
      issuer: issuer.O || issuer.CN,
      subject: subject.CN,
      valid_from: cert.valid_from,
      valid_to: cert.valid_to,
      is_valid: isValid,
      days_remaining: Math.floor((validTo - now) / (1000 * 60 * 60 * 24)),
      bits: (cert as unknown as { bits: number }).bits,
      fingerprint: cert.fingerprint
    });
  } catch (error) {
    console.error('SSL error:', error);
    return NextResponse.json({ error: 'SSL/TLS check failed' }, { status: 500 });
  }
}
