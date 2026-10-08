import { NextResponse } from 'next/server';
import dns from 'dns/promises';
import { validateSafeTarget } from '@/lib/validators';

export const dynamic = 'force-dynamic';

interface CrtShEntry {
  name_value?: string;
  common_name?: string;
}

interface DiscoveredSubdomain {
  subdomain: string;
  resolvedIps: string[];
  cname?: string;
  isTakeoverVulnerable: boolean;
  takeoverFingerprint?: string;
  status: 'active' | 'unresolved' | 'vulnerable';
}

const TAKEOVER_SERVICES: Array<{ domainPattern: RegExp; serviceName: string; signature: string }> = [
  { domainPattern: /\.s3[.-].*\.amazonaws\.com$/i, serviceName: 'AWS S3 Bucket', signature: 'NoSuchBucket' },
  { domainPattern: /\.github\.io$/i, serviceName: 'GitHub Pages', signature: "There isn't a GitHub Pages site here" },
  { domainPattern: /\.herokuapp\.com$/i, serviceName: 'Heroku App', signature: 'No such app' },
  { domainPattern: /\.azurewebsites\.net$/i, serviceName: 'Azure Web App', signature: '404 Web Site not found' },
  { domainPattern: /\.myshopify\.com$/i, serviceName: 'Shopify Store', signature: 'Sorry, this shop is currently unavailable' },
  { domainPattern: /\.zendesk\.com$/i, serviceName: 'Zendesk Portal', signature: 'Help Center Closed' },
  { domainPattern: /\.pantheonsite\.io$/i, serviceName: 'Pantheon Hosting', signature: '404 error unknown site' },
  { domainPattern: /\.ghost\.io$/i, serviceName: 'Ghost CMS', signature: 'The thing you were looking for is no longer here' },
];

async function fetchCrtShSubdomains(domain: string): Promise<string[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const res = await fetch(`https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mark2-Diagnostic-SubdomainHunter/1.0',
        'Accept': 'application/json',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return [];
    }

    const data = (await res.json()) as CrtShEntry[];
    const subdomainsSet = new Set<string>();

    for (const item of data) {
      const candidates = [item.name_value, item.common_name];
      for (const raw of candidates) {
        if (!raw) continue;
        const entries = raw.split('\n');
        for (const entry of entries) {
          const cleaned = entry.trim().toLowerCase().replace(/^\*\./, '');
          if (
            cleaned &&
            (cleaned === domain || cleaned.endsWith(`.${domain}`)) &&
            !cleaned.includes('*') &&
            !cleaned.includes('@')
          ) {
            subdomainsSet.add(cleaned);
          }
        }
      }
    }

    return Array.from(subdomainsSet);
  } catch {
    clearTimeout(timeout);
    return [];
  }
}

async function checkTakeoverSignature(targetUrl: string, expectedSignature: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(targetUrl, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SecurityAudit/1.0)',
      },
    });
    clearTimeout(timeout);
    const body = await res.text();
    return body.includes(expectedSignature);
  } catch {
    clearTimeout(timeout);
    return false;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawTarget = searchParams.get('target') || searchParams.get('domain');
  const target = (rawTarget || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();

  const validation = await validateSafeTarget(target);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const domain = validation.target;

  try {
    // 1. Raccolta passiva tramite Certificate Transparency (crt.sh)
    let discoveredNames = await fetchCrtShSubdomains(domain);

    // Fallback passivo di base se crt.sh non restituisce risultati o va in timeout
    const commonPrefixes = ['www', 'mail', 'webmail', 'api', 'dev', 'staging', 'portal', 'admin', 'vpn', 'remote', 'app', 'cdn'];
    if (discoveredNames.length === 0) {
      discoveredNames = [domain, ...commonPrefixes.map((p) => `${p}.${domain}`)];
    } else {
      if (!discoveredNames.includes(domain)) discoveredNames.unshift(domain);
      for (const prefix of ['www', 'mail', 'api']) {
        const standardHost = `${prefix}.${domain}`;
        if (!discoveredNames.includes(standardHost)) discoveredNames.push(standardHost);
      }
    }

    // Limite prudenziale di analisi passiva a max 25 host per non saturare la richiesta
    const candidateList = Array.from(new Set(discoveredNames)).slice(0, 25);

    // 2. Risoluzione DNS e analisi CNAME Takeover
    const results: DiscoveredSubdomain[] = await Promise.all(
      candidateList.map(async (host): Promise<DiscoveredSubdomain> => {
        let resolvedIps: string[] = [];
        let cname: string | undefined;
        let isTakeoverVulnerable = false;
        let takeoverFingerprint: string | undefined;

        try {
          const ips = await dns.resolve4(host);
          resolvedIps = ips || [];
        } catch {
          // Record A non presente o fallito
        }

        try {
          const cnames = await dns.resolveCname(host);
          if (cnames && cnames.length > 0) {
            cname = cnames[0];
          }
        } catch {
          // Nessun record CNAME
        }

        // Verifica Takeover se il CNAME punta a servizi cloud noti
        if (cname) {
          const matchedService = TAKEOVER_SERVICES.find((s) => s.domainPattern.test(cname!));
          if (matchedService) {
            // Se non risolve IP o è un bucket orfano, probe HTTP per la signature
            const isVulnerable = await checkTakeoverSignature(`http://${host}`, matchedService.signature);
            if (isVulnerable) {
              isTakeoverVulnerable = true;
              takeoverFingerprint = `${matchedService.serviceName} (${matchedService.signature})`;
            }
          }
        }

        let status: 'active' | 'unresolved' | 'vulnerable' = 'unresolved';
        if (isTakeoverVulnerable) {
          status = 'vulnerable';
        } else if (resolvedIps.length > 0 || cname) {
          status = 'active';
        }

        return {
          subdomain: host,
          resolvedIps,
          cname,
          isTakeoverVulnerable,
          takeoverFingerprint,
          status,
        };
      })
    );

    const activeList = results.filter((r) => r.status === 'active' || r.status === 'vulnerable');
    const vulnerableCount = results.filter((r) => r.isTakeoverVulnerable).length;

    return NextResponse.json({
      target: domain,
      totalDiscovered: results.length,
      activeCount: activeList.length,
      vulnerableCount,
      subdomains: results,
      mitreDefense: {
        id: 'D3-DNSA',
        technique: 'DNS Access Control & CNAME Orphan Pruning',
        nistCsf: 'ID.AM-02 / PR.DS-02',
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Subdomain hunter error:', error);
    return NextResponse.json({ error: 'Errore durante la scansione passiva dei sottodomini' }, { status: 500 });
  }
}
