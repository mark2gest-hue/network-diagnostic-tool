import { NextResponse } from 'next/server';
import dns from 'dns/promises';
import { domainSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

const COMMON_SELECTORS = ['default', 'google', 'mail', 'smtp', 'dkim', 'sig1', 'k1'];

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
    const results = await Promise.all(
      COMMON_SELECTORS.map(async (selector) => {
        try {
          const query = `${selector}._domainkey.${validatedDomain}`;
          const records = await dns.resolveTxt(query);
          const dkimRecord = records.flat().find(r => r.startsWith('v=DKIM1'));
          if (dkimRecord) {
            return { selector, found: true, record: dkimRecord };
          }
        } catch {
          // Selector not found
        }
        return null;
      })
    );

    const activeSelectors = results.filter(r => r !== null);

    if (activeSelectors.length === 0) {
      return NextResponse.json({
        status: 'warning',
        message: 'Nessun selettore DKIM comune trovato',
        recommendation: 'Verifica se DKIM è configurato con un selettore non standard o abilitalo per migliorare l\'autenticazione email.'
      });
    }

    return NextResponse.json({
      status: 'pass',
      selectors: activeSelectors,
      message: `Trovati ${activeSelectors.length} selettori DKIM`,
      recommendation: 'DKIM è configurato. Assicurati che le chiavi siano ruotate regolarmente.'
    });
  } catch {
    return NextResponse.json({ error: 'Errore durante il controllo DKIM' }, { status: 500 });
  }
}
