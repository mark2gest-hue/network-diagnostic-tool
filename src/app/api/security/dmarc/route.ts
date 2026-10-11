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
    const query = `_dmarc.${validatedDomain}`;
    const txtRecords = await resolveAuthoritativeTxt(validatedDomain, query);
    const dmarcRecords = txtRecords
      .map(chunks => chunks.join(''))
      .filter(r => r.startsWith('v=DMARC1'));

    if (dmarcRecords.length === 0) {
      return NextResponse.json({
        status: 'fail',
        message: 'Record DMARC mancante',
        recommendation: 'Configura un record DMARC per definire come gestire le email che falliscono SPF/DKIM.'
      });
    }

    if (dmarcRecords.length > 1) {
      return NextResponse.json({
        status: 'fail',
        records: dmarcRecords,
        record: dmarcRecords[0],
        multipleRecordsFound: true,
        message: `Rilevati record DMARC multipli (${dmarcRecords.length} record presenti)`,
        recommendation: 'RFC 7489 Sezione 6.6.3: la presenza di più di un record DMARC TXT invalida la policy e i mail server valutano il messaggio come privo di DMARC. Rimuovere immediatamente il record duplicato dal DNS.'
      });
    }

    const dmarcRecord = dmarcRecords[0];

    const policyMatch = dmarcRecord.match(/p=([^;]+)/);
    const policy = policyMatch ? policyMatch[1] : 'unknown';

    let status = 'pass';
    let message = 'Record DMARC configurato correttamente';
    let recommendation = 'Ottimo lavoro! La policy DMARC è attiva.';

    if (policy === 'none') {
      status = 'warning';
      message = 'Policy DMARC impostata su "none"';
      recommendation = 'Considera di passare a "quarantine" o "reject" dopo un periodo di monitoraggio.';
    } else if (policy === 'unknown') {
      status = 'fail';
      message = 'Policy DMARC non valida o mancante';
      recommendation = 'Assicurati che il record DMARC includa un tag "p=" valido.';
    }

    return NextResponse.json({
      status,
      valid: status !== 'fail',
      record: dmarcRecord,
      policy,
      message,
      recommendation
    });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'ENODATA' || (error as { code?: string }).code === 'ENOTFOUND') {
      return NextResponse.json({
        status: 'fail',
        message: 'Record DMARC mancante',
        recommendation: 'Configura un record DMARC per proteggere il tuo dominio dall\'email spoofing.'
      });
    }
    return NextResponse.json({ error: 'Errore durante il controllo DMARC' }, { status: 500 });
  }
}
