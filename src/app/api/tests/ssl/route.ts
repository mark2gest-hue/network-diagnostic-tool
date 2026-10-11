import { NextResponse } from 'next/server';
import tls from 'tls';
import { domainSchema, formatZodError } from '@/lib/validators';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get('domain');

  const validation = domainSchema.safeParse(domain);
  if (!validation.success) {
    return NextResponse.json({ error: formatZodError(validation.error) }, { status: 400 });
  }

  try {
    let ocspStapled = false;
    let certError: string | null = null;
    let certErrorCode: string | null = null;

    const cert = await new Promise<tls.PeerCertificate | null>((resolve) => {
      const socket = tls.connect(443, domain!, { 
        servername: domain!, 
        rejectUnauthorized: false,
        requestOCSP: true,
      } as tls.ConnectionOptions & { requestOCSP?: boolean }, () => {
        const peerCert = socket.getPeerCertificate(true);
        socket.end();
        resolve(peerCert && Object.keys(peerCert).length > 0 ? peerCert : null);
      });

      socket.on('OCSPResponse', (response) => {
        if (response && Buffer.isBuffer(response) && response.length > 0) {
          ocspStapled = true;
        }
      });

      socket.on('error', (err: any) => {
        certError = err.message || 'Errore di connessione TLS';
        certErrorCode = err.code || 'TLS_CONNECT_ERROR';
        resolve(null);
      });

      socket.setTimeout(8000, () => {
        socket.destroy();
        certError = 'Timeout durante handshake TLS (porta 443 non risponde o filtrata)';
        certErrorCode = 'TLS_TIMEOUT';
        resolve(null);
      });
    });

    if (!cert) {
      const isUnreachable = certErrorCode === 'ECONNREFUSED' || certErrorCode === 'ETIMEDOUT' || certErrorCode === 'TLS_TIMEOUT';
      return NextResponse.json({
        status: isUnreachable ? 'info' : 'warning',
        executionStatus: 'error',
        securityOutcome: 'inconclusive',
        error: certError || 'Impossibile completare la negoziazione TLS',
        errorCode: certErrorCode,
        message: isUnreachable 
          ? `Porta 443 non raggiungibile o filtrata (${certError}). Servizio HTTPS presumibilmente non attivo su questo host.`
          : `Handshake crittografico non completato: ${certError}. Esito inconclusivo.`
      }, { status: 200 }); // Restituisce 200 per consentire la corretta interpretazione semantica nel client
    }

    const validFrom = new Date(cert.valid_from).getTime();
    const validTo = new Date(cert.valid_to).getTime();
    const now = Date.now();
    const isExpired = now > validTo;
    const isNotYetValid = now < validFrom;
    const isValid = !isExpired && !isNotYetValid;
    const daysRemaining = Math.floor((validTo - now) / (1000 * 60 * 60 * 24));

    const issuer = cert.issuer as { O?: string; CN?: string };
    const subject = cert.subject as { CN?: string };

    let ocspResponderUrl: string | undefined;
    const rawCertAny = cert as unknown as Record<string, unknown>;
    if (rawCertAny.infoAccess) {
      if (typeof rawCertAny.infoAccess === 'string') {
        const match = (rawCertAny.infoAccess as string).match(/OCSP - URI:([^\n\r]+)/i);
        if (match) ocspResponderUrl = match[1].trim();
      } else if (typeof rawCertAny.infoAccess === 'object' && rawCertAny.infoAccess !== null) {
        const access = rawCertAny.infoAccess as Record<string, unknown>;
        const ocspField = access['OCSP - URI'];
        if (Array.isArray(ocspField) && ocspField.length > 0) {
          ocspResponderUrl = String(ocspField[0]);
        } else if (typeof ocspField === 'string') {
          ocspResponderUrl = ocspField;
        }
      }
    }

    return NextResponse.json({
      status: isValid ? (daysRemaining < 15 ? 'warning' : 'pass') : 'fail',
      executionStatus: 'completed',
      securityOutcome: isValid ? 'no_issue_observed' : 'confirmed_finding',
      issuer: issuer.O || issuer.CN || 'Sconosciuto',
      subject: subject.CN || 'Sconosciuto',
      valid_from: cert.valid_from,
      valid_to: cert.valid_to,
      is_valid: isValid,
      is_expired: isExpired,
      days_remaining: daysRemaining,
      bits: (cert as unknown as { bits: number }).bits,
      fingerprint: cert.fingerprint,
      ocsp: {
        stapled: ocspStapled,
        responderUrl: ocspResponderUrl || null,
        status: ocspStapled ? 'pass' : 'info',
        message: ocspStapled
          ? 'OCSP Stapling attivo (risposta presente nell\'handshake; lo stato di revoca non è validato da questo test).'
          : ocspResponderUrl
          ? `OCSP Stapling non attivo; il client interroga il responder ${ocspResponderUrl}`
          : 'Nessun OCSP Stapling né responder AIA nel certificato (normale per CA che hanno dismesso OCSP, es. Let\'s Encrypt).',
        opensslCommand: `openssl s_client -connect ${domain}:443 -status -servername ${domain}`,
      },
      message: isExpired
        ? `Certificato SSL/TLS scaduto il ${new Date(validTo).toLocaleDateString()}!`
        : daysRemaining < 15
        ? `Certificato in scadenza tra ${daysRemaining} giorni.`
        : `Certificato SSL/TLS valido (${daysRemaining} giorni residui).`
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'info',
      executionStatus: 'error',
      securityOutcome: 'inconclusive',
      error: error.message || 'Errore imprevisto durante verifica SSL/TLS',
      message: 'Impossibile determinare la postura crittografica per errore del runtime.'
    }, { status: 200 });
  }
}
