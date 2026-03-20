import { NextResponse } from 'next/server';
import dns from 'dns/promises';
import { domainSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';

const COMMON_SUBDOMAINS = ['www', 'mail', 'ftp', 'dev', 'staging', 'api', 'blog', 'test', 'shop', 'cdn'];

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
      COMMON_SUBDOMAINS.map(async (sub) => {
        const fullSub = `${sub}.${validatedDomain}`;
        try {
          const cname = await dns.resolveCname(fullSub);
          // Simple heuristic: CNAME to cloud services
          const cloudProviders = ['cloudfront.net', 'azurewebsites.net', 'herokuapp.com', 's3.amazonaws.com', 'github.io'];
          const isVulnerable = cloudProviders.some(provider => cname[0].toLowerCase().includes(provider));
          
          return {
            subdomain: fullSub,
            cname: cname[0],
            vulnerable: isVulnerable
          };
        } catch {
          return null;
        }
      })
    );

    const foundSubdomains = results.filter(r => r !== null);
    const vulnerableOnes = foundSubdomains.filter(v => v!.vulnerable);

    return NextResponse.json({
      status: vulnerableOnes.length > 0 ? 'fail' : 'pass',
      vulnerabilities: vulnerableOnes,
      message: vulnerableOnes.length > 0 
        ? `Trovati ${vulnerableOnes.length} sottodomini potenzialmente vulnerabili a takeover` 
        : 'Nessuna vulnerabilità di subdomain takeover rilevata nei sottodomini comuni',
      recommendation: vulnerableOnes.length > 0 
        ? 'Controlla che i record CNAME puntino a risorse attive e autorizzate.' 
        : 'Continua a monitorare i tuoi record CNAME per assicurarti che puntino a servizi attivi.'
    });
  } catch {
    return NextResponse.json({ error: 'Controllo sottodomini fallito' }, { status: 500 });
  }
}
