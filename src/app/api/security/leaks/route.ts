import { NextResponse } from 'next/server';
import { validateSafeTarget } from '@/lib/validators';

export const dynamic = 'force-dynamic';

interface BreachRecord {
  name: string;
  title: string;
  domain: string;
  breachDate: string;
  pwnCount: number;
  description: string;
  dataClasses: string[];
  isVerified: boolean;
  logoPath?: string;
}

interface LeakedCredentialItem {
  email: string;
  passwordMasked: string;
  source: string;
}

// Cache in memoria dei breach globali HIBP per evitare chiamate ripetute
let cachedGlobalBreaches: BreachRecord[] | null = null;
let lastBreachFetch = 0;
const BREACH_CACHE_TTL = 1000 * 60 * 60; // 1 ora

async function getGlobalBreaches(): Promise<BreachRecord[]> {
  const now = Date.now();
  if (cachedGlobalBreaches && now - lastBreachFetch < BREACH_CACHE_TTL) {
    return cachedGlobalBreaches;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch('https://haveibeenpwned.com/api/v3/breaches', {
      headers: {
        'User-Agent': 'NetworkDiag-OpsPro-VulnerabilityEngine/2.0',
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      cachedGlobalBreaches = data.map((b: any) => ({
        name: b.Name,
        title: b.Title,
        domain: (b.Domain || '').toLowerCase(),
        breachDate: b.BreachDate,
        pwnCount: b.PwnCount,
        description: (b.Description || '').replace(/<[^>]*>?/gm, '').slice(0, 200),
        dataClasses: b.DataClasses || [],
        isVerified: Boolean(b.IsVerified),
        logoPath: b.LogoPath,
      }));
      lastBreachFetch = now;
      return cachedGlobalBreaches || [];
    }
  } catch {
    // Fallback in caso di timeout o rate-limit
  }

  return cachedGlobalBreaches || [];
}

function maskPassword(pwd: string): string {
  if (!pwd) return '••••••';
  if (pwd.length <= 4) return '••••••';
  return `${pwd[0]}••••••••${pwd[pwd.length - 1]}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawTarget = searchParams.get('target') || searchParams.get('domain');
  const target = (rawTarget || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();

  const validation = await validateSafeTarget(target);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const domain = validation.target.toLowerCase();

  try {
    // 1. Interroga i Breach Ufficiali HIBP filtrati per il dominio
    const allBreaches = await getGlobalBreaches();
    const matchingBreaches = allBreaches.filter(
      (b) => b.domain === domain || b.domain.endsWith(`.${domain}`) || (b.name.toLowerCase() === domain.split('.')[0])
    );

    // 2. Interroga le credenziali trapelate nel database COMB (Compilation of Many Breaches)
    let combCount = 0;
    const leakedCredentials: LeakedCredentialItem[] = [];

    try {
      const combController = new AbortController();
      const combTimeout = setTimeout(() => combController.abort(), 6000);

      const combRes = await fetch(`https://api.proxynova.com/comb?query=${encodeURIComponent(domain)}`, {
        signal: combController.signal,
        headers: {
          'User-Agent': 'NetworkDiag-OpsPro-Audit/2.0',
        },
      });
      clearTimeout(combTimeout);

      if (combRes.ok) {
        const combData = await combRes.json();
        combCount = combData.count || 0;
        const rawLines: string[] = Array.isArray(combData.lines) ? combData.lines : [];

        // Filtra e anonimizza per PII / GDPR compliance
        for (const line of rawLines.slice(0, 15)) {
          const parts = line.split(':');
          const email = parts[0]?.trim() || '';
          const rawPwd = parts.slice(1).join(':').trim();

          if (email.includes('@')) {
            const [local, host] = email.split('@');
            const maskedEmail = `${local.slice(0, 2)}***@${host}`;
            leakedCredentials.push({
              email: maskedEmail,
              passwordMasked: maskPassword(rawPwd),
              source: 'COMB 3.2B Breached Records Dump',
            });
          }
        }
      }
    } catch {
      // Proxynova offline o timeout: continuiamo con i breach HIBP
    }

    // 3. Valutazione gravità e punteggio di rischio
    const totalExposedCount = combCount + matchingBreaches.reduce((acc, b) => acc + (b.pwnCount || 0), 0);
    const hasBreaches = matchingBreaches.length > 0;
    const hasCombLeaks = combCount > 0;

    let status: 'pass' | 'warning' | 'fail' = 'pass';
    if (combCount > 50 || matchingBreaches.length >= 2) {
      status = 'fail';
    } else if (combCount > 0 || hasBreaches) {
      status = 'warning';
    }

    return NextResponse.json({
      status,
      domain,
      breachesCount: matchingBreaches.length,
      breaches: matchingBreaches,
      combCount,
      sampleLeaks: leakedCredentials,
      totalExposedCount,
      summary: hasCombLeaks || hasBreaches
        ? `Rilevate credenziali aziendali o breach storici associati a @${domain} (${combCount} credenziali indicizzate in archivi Deep Web).`
        : `Nessuna compromissione di credenziali o account aziendali rilevata negli archivi pubblici monitorati per @${domain}.`,
      recommendation: hasCombLeaks || hasBreaches
        ? 'Imporre cambio password immediato e attivazione obbligatoria 2FA/MFA per tutti gli account con dominio aziendale.'
        : 'Mantenere attive policy di rotazione password e autenticazione multifattore (MFA).',
      sourceInfo: 'HIBP Verified Breaches & DarkWeb COMB Archive (3.2B records)',
    });
  } catch (err: any) {
    return NextResponse.json({
      status: 'pass',
      error: 'Impossibile completare la scansione leak',
      detail: err?.message || 'Timeout servizio',
    }, { status: 500 });
  }
}
