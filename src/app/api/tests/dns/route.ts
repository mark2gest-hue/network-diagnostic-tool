import { NextResponse } from 'next/server';
import dns from 'dns/promises';
import { domainSchema } from '@/lib/validators';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get('domain');

  const validation = domainSchema.safeParse(domain);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.message }, { status: 400 });
  }

  try {
    const [a, aaaa, mx, txt, cname] = await Promise.allSettled([
      dns.resolve4(domain!),
      dns.resolve6(domain!),
      dns.resolveMx(domain!),
      dns.resolveTxt(domain!),
      dns.resolveCname(domain!)
    ]);

    return NextResponse.json({
      a: a.status === 'fulfilled' ? a.value : [],
      aaaa: aaaa.status === 'fulfilled' ? aaaa.value : [],
      mx: mx.status === 'fulfilled' ? mx.value : [],
      txt: txt.status === 'fulfilled' ? txt.value : [],
      cname: cname.status === 'fulfilled' ? cname.value : []
    });
  } catch (error) {
    console.error('DNS Lookup error:', error);
    return NextResponse.json({ error: 'DNS Lookup failed' }, { status: 500 });
  }
}
