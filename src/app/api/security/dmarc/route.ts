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
    const query = `_dmarc.${validatedDomain}`;
    const txtRecords = await dns.resolveTxt(query);
    const dmarcRecord = txtRecords.flat().find(r => r.startsWith('v=DMARC1'));

    if (!dmarcRecord) {
      return NextResponse.json({
        status: 'fail',
        message: 'Record DMARC mancante',
        recommendation: 'Configura un record DMARC per definire come gestire le email che falliscono SPF/DKIM.'
      });
    }

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
