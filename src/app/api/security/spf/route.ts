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
    const txtRecords = await dns.resolveTxt(validatedDomain);
    const spfRecord = txtRecords.flat().find(r => r.startsWith('v=spf1'));

    if (!spfRecord) {
      return NextResponse.json({
        status: 'fail',
        message: 'Record SPF mancante',
        recommendation: 'Configura un record SPF per prevenire lo spoofing delle email.'
      });
    }

    const isPermissive = spfRecord.includes('+all');
    const isNeutral = spfRecord.includes('?all');

    return NextResponse.json({
      status: isPermissive ? 'fail' : (isNeutral ? 'warning' : 'pass'),
      record: spfRecord,
      message: isPermissive ? 'Record SPF troppo permissivo (+all)' : (isNeutral ? 'Configurazione SPF neutrale' : 'Record SPF configurato correttamente'),
      recommendation: isPermissive 
        ? 'Cambia "+all" con "-all" o "~all" per una maggiore sicurezza.' 
        : (isNeutral ? 'Considera l\'uso di "-all" o "~all" invece di "?all".' : 'Ottimo lavoro! Il record SPF è sicuro.')
    });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'ENODATA' || (error as { code?: string }).code === 'ENOTFOUND') {
      return NextResponse.json({
        status: 'fail',
        message: 'Record SPF mancante',
        recommendation: 'Configura un record SPF per il tuo dominio.'
      });
    }
    return NextResponse.json({ error: 'Errore durante il controllo SPF' }, { status: 500 });
  }
}
