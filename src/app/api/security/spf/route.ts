import { NextResponse } from 'next/server';
import { domainSchema, formatZodError } from '@/lib/validators';
import { resolveAuthoritativeTxt } from '@/lib/dns-authoritative';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawDomain = searchParams.get('domain');
  const domain = (rawDomain || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();

  const validation = domainSchema.safeParse(domain);
  if (!validation.success) {
    return NextResponse.json({ error: formatZodError(validation.error) }, { status: 400 });
  }

  try {
    const validatedDomain = validation.data;
    const txtRecords = await resolveAuthoritativeTxt(validatedDomain, validatedDomain);
    const spfRecords = txtRecords
      .map(chunks => chunks.join(''))
      .filter(r => r.startsWith('v=spf1'));

    if (spfRecords.length === 0) {
      return NextResponse.json({
        status: 'fail',
        message: 'Record SPF mancante',
        recommendation: 'Configura un record SPF per prevenire lo spoofing delle email.'
      });
    }

    if (spfRecords.length > 1) {
      return NextResponse.json({
        status: 'fail',
        records: spfRecords,
        record: spfRecords[0],
        multipleRecordsFound: true,
        message: `Rilevati record SPF multipli (${spfRecords.length} record in DNS)`,
        recommendation: 'RFC 7208 Sezione 3.2: un dominio non deve mai pubblicare più di un record SPF (condizione PermError). I mail server riceventi scartano o bocciano la validazione SPF. Rimuovere i record duplicati.'
      });
    }

    const spfRecord = spfRecords[0];

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
