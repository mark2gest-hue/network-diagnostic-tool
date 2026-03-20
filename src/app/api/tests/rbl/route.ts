import { NextResponse } from 'next/server';
import dns from 'dns/promises';
import { ipSchema } from '@/lib/validators';

const RBL_ZONES = [
  'zen.spamhaus.org',
  'b.barracudacentral.org',
  'bl.spamcop.net',
  'dnsbl.sorbs.net',
  'db.wpbl.info'
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ip = searchParams.get('ip');

  const validation = ipSchema.safeParse(ip);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error.message }, { status: 400 });
  }

  try {
    // Reverse the IP for DNSBL query: 1.2.3.4 -> 4.3.2.1
    const reversedIp = ip!.split('.').reverse().join('.');

    const results = await Promise.all(
      RBL_ZONES.map(async (zone) => {
        try {
          const query = `${reversedIp}.${zone}`;
          const records = await dns.resolve4(query);
          return {
            zone,
            listed: records.length > 0,
            details: records[0]
          };
        } catch (e: unknown) {
          const error = e as { code?: string; message?: string };
          // If DNS returns ENOTFOUND, it's NOT listed (good)
          if (error.code === 'ENOTFOUND') {
            return { zone, listed: false };
          }
          return { zone, listed: false, error: error.message };
        }
      })
    );

    const listedIn = results.filter(r => r.listed).map(r => r.zone);

    return NextResponse.json({
      ip,
      listedIn,
      totalChecked: RBL_ZONES.length,
      isClean: listedIn.length === 0,
      details: results
    });
  } catch (error) {
    console.error('RBL error:', error);
    return NextResponse.json({ error: 'RBL check failed' }, { status: 500 });
  }
}
