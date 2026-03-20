import { NextResponse } from 'next/server';
import dns from 'dns/promises';
import { domainSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawDomain = searchParams.get('domain');
  const domain = (rawDomain || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();

  const validation = domainSchema.safeParse(domain);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.message }, { status: 400 });
  }

  try {
    const validatedDomain = validation.data;
    // We check for DS records on the parent domain or DNSKEY on the domain itself
    // Simple check: resolve DNSKEY
    const hasDnskey = (await dns.resolve(validatedDomain, 'DNSKEY').catch(() => [])) as unknown[];
    
    if (hasDnskey.length === 0) {
      return NextResponse.json({
        status: 'warning',
        message: 'DNSSEC non abilitato',
        recommendation: 'Abilita DNSSEC per proteggere le query DNS da attacchi di tipo man-in-the-middle.'
      });
    }

    return NextResponse.json({
      status: 'pass',
      message: 'DNSSEC abilitato',
      recommendation: 'DNSSEC è attivo e protegge l\'integrità delle tue zone DNS.'
    });
  } catch {
    return NextResponse.json({
      status: 'warning',
      message: 'DNSSEC non rilevato',
      recommendation: 'Abilita DNSSEC per una maggiore sicurezza delle risoluzioni DNS.'
    });
  }
}
