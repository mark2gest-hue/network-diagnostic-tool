import { NextResponse } from 'next/server';
import { targetSchema } from '@/lib/validators';

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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawTarget = searchParams.get('target');
  const target = (rawTarget || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();

  const validation = targetSchema.safeParse(target);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.message }, { status: 400 });
  }

  const validatedTarget = validation.data;
  const baseUrl = validatedTarget.startsWith('http') ? validatedTarget : `https://${validatedTarget}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(baseUrl, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow'
    });
    clearTimeout(timeout);

    const detectedWafs = WAF_SIGNATURES.filter(waf => waf.headerCheck(res.headers));
    const serverHeader = res.headers.get('server') || 'Nascosto / Non dichiarato';

    const hasProtection = detectedWafs.length > 0;

    return NextResponse.json({
      status: hasProtection ? 'pass' : 'warning',
      hasProtection,
      detectedShields: detectedWafs.map(w => ({ name: w.name, vendor: w.vendor })),
      serverHeader,
      message: hasProtection
        ? `Rilevata protezione attiva: ${detectedWafs.map(w => w.name).join(', ')}.`
        : 'Nessuna firma di WAF o CDN nota rilevata negli header HTTP. Il server potrebbe essere esposto a traffico diretto.',
      recommendation: hasProtection
        ? 'Protezione perimetrale e mitigazione DDoS attiva.'
        : 'È consigliato posizionare un WAF o una CDN (es. Cloudflare o AWS CloudFront) a monte per proteggere l\'infrastruttura da attacchi volumetrici e bot.'
    });
  } catch {
    return NextResponse.json({ error: 'Rilevamento WAF/CDN fallito' }, { status: 500 });
  }
}
