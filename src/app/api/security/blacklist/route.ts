import { NextResponse } from 'next/server';
import dns from 'dns/promises';
import { domainSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

const RBL_ZONES = [
  'zen.spamhaus.org',
  'b.barracudacentral.org',
  'bl.spamcop.net',
  'dnsbl.sorbs.net',
  'db.wpbl.info'
];

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
    const mxRecords = await dns.resolveMx(validatedDomain);
    if (mxRecords.length === 0) {
      return NextResponse.json({ status: 'pass', message: 'Nessun record MX trovato. Dominio non abilitato alle email.' });
    }

    const mxHost = mxRecords[0].exchange;
    let ips: string[] = [];
    try {
      ips = await dns.resolve4(mxHost);
    } catch {
      ips = [];
    }

    if (!ips || ips.length === 0) {
      return NextResponse.json({
        mxHost,
        status: 'pass',
        listedIn: [],
        message: `Nessun indirizzo IPv4 risolto per il server MX (${mxHost}). Controllo RBL saltato.`,
        recommendation: 'Assicurati che il server di posta disponga di record A per la compatibilità con i filtri anti-spam mondiali.'
      });
    }

    const mxIp = ips[0];
    const reversedIp = mxIp.split('.').reverse().join('.');

    const blacklistResults = await Promise.all(
      RBL_ZONES.map(async (zone) => {
        try {
          const query = `${reversedIp}.${zone}`;
          await dns.resolve4(query);
          return { zone, listed: true };
        } catch {
          return { zone, listed: false };
        }
      })
    );

    const listedIn = blacklistResults.filter(r => r.listed).map(r => r.zone);

    return NextResponse.json({
      mxHost,
      mxIp,
      status: listedIn.length > 0 ? 'fail' : 'pass',
      listedIn,
      message: listedIn.length > 0 
        ? `L'IP del server MX (${mxIp}) è in blacklist su ${listedIn.length} liste!` 
        : 'Il server MX non risulta in blacklist.',
      recommendation: listedIn.length > 0 
        ? 'Controlla l\'IP del tuo server di posta e richiedi il delisting dai database indicati.' 
        : 'Tutto ok! Il tuo server di posta è considerato sicuro.'
    });
  } catch {
    return NextResponse.json({ error: 'Controllo blacklist email fallito' }, { status: 500 });
  }
}
