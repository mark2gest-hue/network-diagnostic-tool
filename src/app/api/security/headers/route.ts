import { NextResponse } from 'next/server';
import { validateSafeTarget } from '@/lib/validators';
import { createPinnedLookup } from '@/lib/security-guard';
import { safeHttpProbe, safeFetch } from '@/lib/safe-http-probe';

export const dynamic = 'force-dynamic';

const SECURITY_HEADERS = [
  { name: 'Strict-Transport-Security', impact: 'Previene il downgrade dell\'attacco a HTTP.' },
  { name: 'Content-Security-Policy', impact: 'Protegge da XSS e iniezioni di dati.' },
  { name: 'X-Frame-Options', impact: 'Protegge dal clickjacking.' },
  { name: 'X-Content-Type-Options', impact: 'Previene il MIME sniffing.' },
  { name: 'Referrer-Policy', impact: 'Controlla quali informazioni di referral vengono inviate.' },
  { name: 'Permissions-Policy', impact: 'Controlla quali funzionalità del browser sono disponibili.' }
];

const DISCLOSURE_HEADERS = [
  'server',
  'x-powered-by',
  'x-aspnet-version',
  'x-aspnetmvc-version',
  'via',
  'x-runtime',
  'x-generator'
];

interface EolRule {
  pattern: RegExp;
  technology: string;
  detail: string;
  risk: 'critical' | 'high' | 'medium';
}

const EOL_RULES: EolRule[] = [
  { pattern: /php\/(?:[1-6]\.|7\.|8\.0)/i, technology: 'PHP', detail: 'Versione PHP obsoleta ed End-of-Life (nessuna patch di sicurezza ufficiale)', risk: 'high' },
  { pattern: /apache\/(?:1\.|2\.[0-3]\.|2\.4\.[0-3]\d\b)/i, technology: 'Apache HTTP Server', detail: 'Versione Apache legacy vulnerabile a molteplici CVE note', risk: 'high' },
  { pattern: /nginx\/(?:0\.|1\.[0-9]\.|1\.1[0-7]\.)/i, technology: 'Nginx', detail: 'Ramo Nginx deprecato senza supporto di sicurezza', risk: 'medium' },
  { pattern: /asp\.net(?:\s+version)?:?\s*(?:1\.|2\.|3\.|4\.[0-7])/i, technology: 'ASP.NET', detail: 'Framework ASP.NET legacy non supportato', risk: 'high' },
  { pattern: /python\/(?:1\.|2\.|3\.[0-7]\b)/i, technology: 'Python', detail: 'Interprete Python End-of-Life', risk: 'high' }
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawTarget = searchParams.get('target');
  const target = (rawTarget || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();

  const validation = await validateSafeTarget(target);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const validatedTarget = validation.target;
  const url = validatedTarget.startsWith('http') ? validatedTarget : `https://${validatedTarget}`;
  const lookup = createPinnedLookup(validation.resolvedIps);

  try {
    let headerMap: Record<string, string> = {};

    // 1. Tentativo con fetch HEAD standard
    try {
      const response = await safeFetch(url, { method: 'HEAD', lookup });
      response.headers.forEach((val, key) => {
        headerMap[key.toLowerCase()] = val;
      });
    } catch {
      // 2. Fallback resiliente con safeHttpProbe (gestisce certificati self-signed o server che rifiutano HEAD)
      const probeRes = await safeHttpProbe(url, { method: 'GET', timeout: 5000, lookup });
      for (const [key, val] of Object.entries(probeRes.headers)) {
        if (typeof val === 'string') {
          headerMap[key.toLowerCase()] = val;
        } else if (Array.isArray(val) && val.length > 0) {
          headerMap[key.toLowerCase()] = val[0];
        }
      }
    }

    if (Object.keys(headerMap).length === 0) {
      return NextResponse.json({ error: 'Impossibile estrarre header dal target (nessuna risposta HTTP ricevuta)' }, { status: 502 });
    }

    // Verifica header difensivi
    const audit = SECURITY_HEADERS.map(header => {
      const value = headerMap[header.name.toLowerCase()];
      return {
        header: header.name,
        present: !!value,
        value: value || 'Mancante',
        status: value ? 'pass' : 'fail',
        impact: header.impact
      };
    });

    const missingCount = audit.filter(h => !h.present).length;

    // Verifica Information Disclosure & EOL Detection
    const disclosures: Array<{
      header: string;
      value: string;
      hasVersion: boolean;
      risk: 'critical' | 'high' | 'medium' | 'low';
      isEol: boolean;
      eolDetail?: string;
    }> = [];

    for (const h of DISCLOSURE_HEADERS) {
      const val = headerMap[h];
      if (val) {
        const hasVersion = /\d+\.\d+/.test(val);
        const matchedEol = EOL_RULES.find(rule => rule.pattern.test(val));

        disclosures.push({
          header: h,
          value: val,
          hasVersion,
          risk: matchedEol ? matchedEol.risk : (hasVersion ? 'medium' : 'low'),
          isEol: !!matchedEol,
          eolDetail: matchedEol ? matchedEol.detail : undefined
        });
      }
    }

    const hasEolCritical = disclosures.some(d => d.risk === 'critical' || (d.isEol && d.risk === 'high'));

    const finalStatus = hasEolCritical
      ? 'fail'
      : (missingCount > 2 ? 'fail' : (missingCount > 0 || disclosures.some(d => d.hasVersion) ? 'warning' : 'pass'));

    return NextResponse.json({
      status: finalStatus,
      message: missingCount === 0
        ? 'Tutti gli header di sicurezza sono presenti.'
        : `Mancano ${missingCount} header di sicurezza raccomandati.`,
      audit,
      informationDisclosure: {
        totalDisclosed: disclosures.length,
        disclosures,
        eolDetected: disclosures.filter(d => d.isEol),
        curlCommand: `curl -I -sS "${url}" | grep -Ei "^(Server|X-Powered-By|X-AspNet|Via):"`
      },
      recommendation: missingCount > 0
        ? 'Configura gli header mancanti e rimuovi i banner tecnologici (ServerTokens Prod / expose_php Off) sul tuo web server.'
        : 'Ottimo lavoro! Gli header di sicurezza sono configurati correttamente.'
    });
  } catch (error) {
    console.error('Security headers check failed:', error);
    return NextResponse.json({ error: 'Impossibile connettersi al server per controllare gli header' }, { status: 500 });
  }
}

