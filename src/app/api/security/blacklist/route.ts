import { NextResponse } from 'next/server';
import dns from 'dns/promises';
import { domainSchema, formatZodError } from '@/lib/validators';

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
    return NextResponse.json({ error: formatZodError(validation.error) }, { status: 400 });
  }

  try {
    const validatedDomain = validation.data;
    let mxRecords: Array<{ exchange: string; priority: number }> = [];
    try {
      mxRecords = await dns.resolveMx(validatedDomain);
    } catch {
      mxRecords = [];
    }

    if (mxRecords.length === 0) {
      return NextResponse.json({ 
        status: 'pass',
        executionStatus: 'completed',
        securityOutcome: 'not_applicable',
        message: 'Nessun record MX configurato. Il dominio non gestisce posta elettronica (controllo RBL non applicabile).',
        listedIn: []
      });
    }

    // Ordina per priorità MX
    mxRecords.sort((a, b) => a.priority - b.priority);
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
        executionStatus: 'completed',
        securityOutcome: 'inconclusive',
        listedIn: [],
        message: `Nessun indirizzo IPv4 risolto per l'hostname MX (${mxHost}). Impossibile eseguire query reverse DNSBL.`,
        recommendation: 'Assicurati che l\'host MX disponga di un record A valido.'
      });
    }

    const mxIp = ips[0];
    const reversedIp = mxIp.split('.').reverse().join('.');

    // Rileva provider email condivisi noti (Google Workspace, Microsoft 365, Proton, OVH)
    const isSharedProvider = /google|outlook|protection\.outlook|microsoft|pphosted|mimecast|ovh/i.test(mxHost);

    const blacklistResults = await Promise.all(
      RBL_ZONES.map(async (zone) => {
        try {
          const query = `${reversedIp}.${zone}`;
          const answers = await dns.resolve4(query);
          // 127.255.255.x = codici di errore DNSBL (es. Spamhaus: query via resolver pubblico/aperto), NON un listing
          if (answers.length > 0 && answers.every((a) => a.startsWith('127.255.255.'))) {
            return { zone, listed: false, status: 'query_error', error: `RESOLVER_BLOCKED (${answers.join(',')})` };
          }
          return { zone, listed: true, status: 'listed' };
        } catch (e: any) {
          if (e.code === 'ENOTFOUND' || e.code === 'ENODATA') {
            return { zone, listed: false, status: 'clean' };
          }
          return { zone, listed: false, status: 'query_error', error: e.code || 'TIMEOUT' };
        }
      })
    );

    const listedIn = blacklistResults.filter(r => r.listed).map(r => r.zone);
    const hasErrors = blacklistResults.filter(r => r.status === 'query_error').length > 0;

    return NextResponse.json({
      mxHost,
      mxIp,
      isSharedProvider,
      executionStatus: 'completed',
      securityOutcome: listedIn.length > 0 
        ? 'confirmed_finding' 
        : hasErrors ? 'inconclusive' : 'no_issue_observed',
      status: listedIn.length > 0 ? 'fail' : 'pass',
      listedIn,
      details: blacklistResults,
      message: listedIn.length > 0 
        ? `L'indirizzo IP del server di posta (${mxIp} - ${mxHost}) è segnalato in ${listedIn.length} blacklist (${listedIn.join(', ')}).${isSharedProvider ? ' Nota: l\'infrastruttura appartiene a un provider condiviso.' : ''}` 
        : hasErrors
        ? `Il server MX (${mxHost} - ${mxIp}) non risulta presente nelle ${blacklistResults.filter(r => r.status === 'clean').length} blacklist verificate; ${blacklistResults.filter(r => r.status === 'query_error').map(r => r.zone).join(', ')} non verificabili (resolver bloccato o errore DNS: servirebbe un resolver ricorsivo proprio).`
        : `Il server MX (${mxHost} - ${mxIp}) non risulta presente nelle ${RBL_ZONES.length} blacklist consultate.`,
      recommendation: listedIn.length > 0 
        ? 'Controllare i log di invio del mail server e richiedere la procedura di delisting ai gestori delle blacklist segnalate.' 
        : hasErrors
        ? 'Alcune blacklist (es. Spamhaus) non sono verificabili da questo resolver: controllare manualmente su check.spamhaus.org o usare un resolver ricorsivo proprio.'
        : 'Postura reputazionale IP del server di posta ottimale.'
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'pass',
      executionStatus: 'error',
      securityOutcome: 'inconclusive',
      error: error.message || 'Errore durante la consultazione delle blacklist',
      message: 'Impossibile completare la verifica RBL per indisponibilità temporanea dei resolver.'
    }, { status: 200 });
  }
}
