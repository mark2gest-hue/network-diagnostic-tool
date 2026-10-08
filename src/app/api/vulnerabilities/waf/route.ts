import { NextResponse } from 'next/server';
import dns from 'dns/promises';
import { targetSchema, formatZodError } from '@/lib/validators';

export const dynamic = 'force-dynamic';

interface WafSignature {
  name: string;
  vendor: string;
  headerCheck: (headers: Headers) => boolean;
}

const WAF_SIGNATURES: WafSignature[] = [
  {
    name: 'Cloudflare',
    vendor: 'Cloudflare Inc.',
    headerCheck: (h) => Boolean(h.get('cf-ray') || h.get('server')?.toLowerCase().includes('cloudflare'))
  },
  {
    name: 'AWS CloudFront / WAF',
    vendor: 'Amazon Web Services',
    headerCheck: (h) => Boolean(h.get('x-amz-cf-id') || h.get('x-amz-cf-pop') || h.get('server')?.toLowerCase().includes('cloudfront'))
  },
  {
    name: 'Akamai Edge',
    vendor: 'Akamai Technologies',
    headerCheck: (h) => Boolean(h.get('x-akamai-transformed') || h.get('akamai-grn'))
  },
  {
    name: 'Fastly CDN',
    vendor: 'Fastly',
    headerCheck: (h) => Boolean(h.get('x-fastly-request-id') || h.get('fastly-restarts'))
  },
  {
    name: 'Vercel Edge Network',
    vendor: 'Vercel',
    headerCheck: (h) => Boolean(h.get('x-vercel-id') || h.get('server')?.toLowerCase().includes('vercel'))
  },
  {
    name: 'Sucuri CloudProxy',
    vendor: 'Sucuri',
    headerCheck: (h) => Boolean(h.get('x-sucuri-id') || h.get('server')?.toLowerCase().includes('sucuri'))
  },
  {
    name: 'Imperva Incapsula',
    vendor: 'Imperva',
    headerCheck: (h) => Boolean(h.get('x-iinfo') || h.get('x-cdn')?.toLowerCase().includes('incapsula'))
  }
];

function isCloudflareIp(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return false;
  const [a, b] = parts;
  if (a === 104 && b >= 16 && b <= 31) return true;
  if (a === 172 && b >= 64 && b <= 79) return true;
  if (a === 162 && (b === 158 || b === 159)) return true;
  if (a === 108 && b === 162) return true;
  if (a === 198 && b === 41) return true;
  if (a === 188 && b === 114) return true;
  if (a === 173 && b === 245) return true;
  if (a === 141 && b === 101) return true;
  if (a === 190 && b === 93) return true;
  if (a === 197 && b === 234) return true;
  if (a === 103 && (b === 21 || b === 22 || b === 31)) return true;
  if (a === 131 && b === 0) return true;
  return false;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawTarget = searchParams.get('target');
  const target = (rawTarget || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();

  const validation = targetSchema.safeParse(target);
  if (!validation.success) {
    return NextResponse.json({ error: formatZodError(validation.error) }, { status: 400 });
  }

  const validatedTarget = validation.data;
  const baseUrl = validatedTarget.startsWith('http') ? validatedTarget : `https://${validatedTarget}`;

  try {
    // 1. Rilevamento Firme WAF / CDN via HTTP Headers
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(baseUrl, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow'
    }).catch(() => null);
    clearTimeout(timeout);

    const detectedWafs = res ? WAF_SIGNATURES.filter(waf => waf.headerCheck(res.headers)) : [];
    const serverHeader = res ? res.headers.get('server') || 'Nascosto / Non dichiarato' : 'Non raggiungibile';
    let hasProtection = detectedWafs.length > 0;

    // 2. Controllo Range IP del Target Apex
    const apexIps: string[] = await dns.resolve4(validatedTarget).catch(() => []);
    const isApexOnCloudflare = apexIps.some(isCloudflareIp);
    if (isApexOnCloudflare && !detectedWafs.some(w => w.name === 'Cloudflare')) {
      detectedWafs.push({ name: 'Cloudflare Proxy (DNS)', vendor: 'Cloudflare Inc.', headerCheck: () => true });
      hasProtection = true;
    }

    // 3. Passive Origin IP Leak Reconnaissance (MITRE T1590.005)
    // Sonda sottodomini periferici e record MX per verificare se l'IP di origine trapela all'esterno del proxy WAF
    const candidateSubdomains = ['direct', 'origin', 'mail', 'cpanel', 'dev', 'smtp'];
    const mxRecords = await dns.resolveMx(validatedTarget).catch(() => []);
    const candidateHosts = [
      ...candidateSubdomains.map(sub => `${sub}.${validatedTarget}`),
      ...mxRecords.map(m => m.exchange).filter(Boolean)
    ];

    let leakedCandidate: { host: string; ip: string } | null = null;

    if (hasProtection) {
      for (const host of candidateHosts.slice(0, 6)) {
        try {
          const resolved = await dns.resolve4(host).catch(() => []);
          if (resolved.length > 0) {
            const ip = resolved[0];
            // Se l'IP non è nel range Cloudflare / CDN e differisce dagli IP del proxy apex
            const isCdn = isCloudflareIp(ip) || apexIps.includes(ip);
            if (!isCdn && !ip.startsWith('127.') && !ip.startsWith('10.') && !ip.startsWith('192.168.')) {
              leakedCandidate = { host, ip };
              break;
            }
          }
        } catch {
          // continue
        }
      }
    }

    const originLeakDetected = Boolean(leakedCandidate);

    let status: 'pass' | 'warning' | 'fail' = 'pass';
    if (!hasProtection) {
      status = 'warning';
    } else if (originLeakDetected) {
      status = 'warning'; // WAF presente ma potenziale bypass
    }

    let message = 'Protezione perimetrale WAF/CDN attiva e nessun leak dell\'IP di origine rilevato.';
    let recommendation = 'La superficie web è schermata da proxy inverso.';

    if (!hasProtection) {
      message = 'Nessuna firma di WAF o CDN nota rilevata. Il server risponde direttamente su IP pubblico.';
      recommendation = 'Si raccomanda di posizionare uno scudo WAF (es. Cloudflare o AWS CloudFront) per mitigare attacchi DDoS e scansioni bot.';
    } else if (originLeakDetected) {
      message = `WAF attivo (${detectedWafs.map(w => w.name).join(', ')}), ma rilevato potenziale Origin IP Leak su ${leakedCandidate!.host} (${leakedCandidate!.ip}).`;
      recommendation = `Chiudi l'accesso diretto alla porta 80/443 su ${leakedCandidate!.ip} consentendo il traffico esclusivamente dagli IP autorizzati del WAF/CDN.`;
    }

    return NextResponse.json({
      status,
      hasProtection,
      detectedShields: detectedWafs.map(w => ({ name: w.name, vendor: w.vendor })),
      serverHeader,
      originBypass: {
        leakDetected: originLeakDetected,
        leakedHost: leakedCandidate?.host || null,
        leakedIp: leakedCandidate?.ip || null,
        details: originLeakDetected
          ? `Bypass potenziale: ${leakedCandidate!.host} punta a ${leakedCandidate!.ip} (IP diretto non protetto dal WAF).`
          : 'Nessun bypass o leak dell\'IP di origine individuato sui record secondari.'
      },
      message,
      recommendation,
      mitre: {
        technique: 'T1590.005 (Gather Victim Network Info: IP Addresses)',
        defend: 'D3-WAF / D3-RP (Reverse Proxying)'
      }
    });
  } catch {
    return NextResponse.json({ error: 'Rilevamento WAF/CDN fallito' }, { status: 500 });
  }
}
