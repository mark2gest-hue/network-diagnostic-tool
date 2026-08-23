import { NextResponse } from 'next/server';
import dns from 'dns/promises';
import { domainSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get('domain');

  const validation = domainSchema.safeParse(domain);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.message }, { status: 400 });
  }

  const cleanDomain = validation.data;

  try {
    const [aResult, aaaaResult] = await Promise.allSettled([
      dns.resolve4(cleanDomain),
      dns.resolve6(cleanDomain)
    ]);

    const ipv4List = aResult.status === 'fulfilled' ? aResult.value : [];
    const ipv6List = aaaaResult.status === 'fulfilled' ? aaaaResult.value : [];

    const hasIpv4 = ipv4List.length > 0;
    const hasIpv6 = ipv6List.length > 0;
    const isDualStack = hasIpv4 && hasIpv6;

    let mode = 'Solo IPv4 (Legacy)';
    if (isDualStack) mode = 'Dual-Stack (IPv4 + IPv6 Moderno)';
    else if (hasIpv6) mode = 'Solo IPv6 (Next-Gen)';

    return NextResponse.json({
      target: cleanDomain,
      status: isDualStack ? 'pass' : hasIpv6 ? 'pass' : 'warning',
      mode,
      hasIpv4,
      hasIpv6,
      isDualStack,
      ipv4Addresses: ipv4List,
      ipv6Addresses: ipv6List,
      message: isDualStack
        ? `Il dominio supporta nativamente sia IPv4 che IPv6 (Dual-Stack conforme a RFC 8305 Happy Eyeballs).`
        : hasIpv6
        ? `Il dominio supporta connettività IPv6.`
        : `Il dominio supporta solo record IPv4. Nessun indirizzo IPv6 (AAAA) trovato nel DNS.`,
      recommendation: isDualStack
        ? 'Configurazione di rete Dual-Stack eccellente.'
        : 'Aggiungi record DNS AAAA con indirizzo IPv6 per garantire connettività a utenti su reti IPv6 pure (mobile 5G / FTTH).'
    });
  } catch {
    return NextResponse.json({ error: 'Verifica connettività IPv6 fallita' }, { status: 500 });
  }
}
