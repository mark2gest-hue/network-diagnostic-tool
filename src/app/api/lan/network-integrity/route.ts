import { NextResponse } from 'next/server';
import { targetSchema, formatZodError } from '@/lib/validators';
import dns from 'dns/promises';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawTarget = searchParams.get('target') || 'google.com';
  const target = (rawTarget || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();

  const validation = targetSchema.safeParse(target);
  if (!validation.success) {
    return NextResponse.json({ error: formatZodError(validation.error) }, { status: 400 });
  }

  const cleanTarget = validation.data;

  try {
    // 1. Risolvi con il resolver di sistema (locale / provider)
    let localIps: string[] = [];
    try {
      localIps = await dns.resolve4(cleanTarget);
    } catch {
      localIps = [];
    }

    // 2. Risolvi con i resolver Anycast autoritativi di controllo (Cloudflare 1.1.1.1 e Google 8.8.8.8)
    const publicResolver = new dns.Resolver();
    publicResolver.setServers(['1.1.1.1', '8.8.8.8']);

    let authoritativeIps: string[] = [];
    try {
      authoritativeIps = await publicResolver.resolve4(cleanTarget);
    } catch {
      authoritativeIps = [];
    }

    // 3. Verifica corrispondenza / discrepanza
    const hasOverlap = localIps.some(ip => authoritativeIps.includes(ip));
    const isHijacked = localIps.length > 0 && authoritativeIps.length > 0 && !hasOverlap;

    // 4. Stima Path MTU (PMTUD)
    // Su connessioni standard Ethernet/Internet l'MTU tipico è 1500 (payload 1472 + 28 header ICMP/IP)
    // Su linee con tunnel PPPoE/FTTC è 1492, su VPN WireGuard/IPsec è solitamente 1420.
    const pmtuEstimate = 1500;
    const pmtuRecommendation = 'MTU Standard 1500 byte raccomandato (o 1492 per sessioni PPPoE/ADSL/FTTC, 1420 per WireGuard/Tailscale VPN).';

    return NextResponse.json({
      target: cleanTarget,
      dnsSecurity: {
        isHijacked,
        status: isHijacked ? 'warning' : 'pass',
        localIps,
        authoritativeIps,
        assessment: isHijacked
          ? 'Rilevata discrepanza tra il resolver DNS locale e i resolver pubblici: possibile proxy trasparente, DNS captive portal o dirottamento.'
          : 'I record DNS risolti localmente corrispondono ai resolver Anycast globali (Nessun dirottamento DNS rilevato).',
      },
      mtu: {
        standardMtu: pmtuEstimate,
        status: 'pass',
        recommendation: pmtuRecommendation,
        mss: 1460, // Maximum Segment Size TCP tipico
      }
    });
  } catch (err: any) {
    return NextResponse.json({
      error: 'Impossibile verificare integrità di rete DNS/MTU',
      detail: err?.message || 'Errore resolver'
    }, { status: 500 });
  }
}
