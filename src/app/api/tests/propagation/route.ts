import { NextResponse } from 'next/server';
import dns from 'dns/promises';
import { domainSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

const RESOLVERS = [
  { name: 'Cloudflare', ip: '1.1.1.1', location: 'Globale / Anycast' },
  { name: 'Google Public DNS', ip: '8.8.8.8', location: 'Globale / Anycast' },
  { name: 'Quad9 (Sicuro)', ip: '9.9.9.9', location: 'Svizzera / Globale' },
  { name: 'OpenDNS (Cisco)', ip: '208.67.222.222', location: 'USA / Globale' },
  { name: 'AdGuard DNS', ip: '94.140.14.14', location: 'Europa / Globale' },
  { name: 'Level3 / Lumen', ip: '4.2.2.1', location: 'USA Tier 1' }
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get('domain');

  const validation = domainSchema.safeParse(domain);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.message }, { status: 400 });
  }

  const cleanDomain = validation.data;

  try {
    const checks = await Promise.allSettled(
      RESOLVERS.map(async (r) => {
        const customResolver = new dns.Resolver();
        customResolver.setServers([r.ip]);

        const start = performance.now();
        try {
          const ips = await customResolver.resolve4(cleanDomain);
          const responseTime = Math.round(performance.now() - start);
          return {
            name: r.name,
            resolverIp: r.ip,
            location: r.location,
            resolvedIps: ips,
            responseTime,
            status: 'propagated' as const
          };
        } catch {
          return {
            name: r.name,
            resolverIp: r.ip,
            location: r.location,
            resolvedIps: [],
            responseTime: Math.round(performance.now() - start),
            status: 'failed' as const
          };
        }
      })
    );

    const results = checks.map((c, idx) => 
      c.status === 'fulfilled' ? c.value : {
        name: RESOLVERS[idx].name,
        resolverIp: RESOLVERS[idx].ip,
        location: RESOLVERS[idx].location,
        resolvedIps: [],
        responseTime: 0,
        status: 'failed' as const
      }
    );

    const successful = results.filter(r => r.status === 'propagated');
    const allMatching = successful.length > 1 && successful.every(
      r => JSON.stringify(r.resolvedIps.sort()) === JSON.stringify(successful[0].resolvedIps.sort())
    );

    return NextResponse.json({
      domain: cleanDomain,
      status: successful.length === RESOLVERS.length ? (allMatching ? 'pass' : 'warning') : 'warning',
      isFullyPropagated: successful.length === RESOLVERS.length && allMatching,
      totalResolvers: RESOLVERS.length,
      successCount: successful.length,
      resolvers: results,
      message: allMatching && successful.length === RESOLVERS.length
        ? `Propagazione DNS globale al 100%. Tutti i 6 principali resolver mondiali restituiscono gli stessi IP.`
        : successful.length > 0
        ? `Propagazione parziale: ${successful.length}/${RESOLVERS.length} resolver rispondono.`
        : 'Nessun resolver è riuscito a risolvere il dominio.',
      recommendation: allMatching
        ? 'DNS sincronizzato in tutto il mondo.'
        : 'Se hai modificato i DNS di recente, attendi il completamento del TTL (fino a 24-48 ore).'
    });
  } catch {
    return NextResponse.json({ error: 'Verifica propagazione DNS fallita' }, { status: 500 });
  }
}
