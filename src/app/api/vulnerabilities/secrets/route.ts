import { NextResponse } from 'next/server';
import { validateSafeTarget } from '@/lib/validators';

export const dynamic = 'force-dynamic';

interface SecretLeakPattern {
  name: string;
  category: 'api_key' | 'token' | 'webhook' | 'credential';
  severity: 'critical' | 'high' | 'medium';
  regex: RegExp;
  description: string;
}

const SECRET_PATTERNS: SecretLeakPattern[] = [
  {
    name: 'OpenAI Secret API Key',
    category: 'api_key',
    severity: 'critical',
    regex: /sk-[a-zA-Z0-9]{20,T3BlbkFJ[a-zA-Z0-9]{20,}/g,
    description: 'Chiave API OpenAI hardcodata nel client',
  },
  {
    name: 'Stripe Secret Key (sk_live)',
    category: 'api_key',
    severity: 'critical',
    regex: /sk_live_[0-9a-zA-Z]{24,}/g,
    description: 'Chiave segreta di produzione Stripe con accesso totale ai pagamenti',
  },
  {
    name: 'Stripe Publishable Key (pk_live)',
    category: 'api_key',
    severity: 'medium',
    regex: /pk_live_[0-9a-zA-Z]{24,}/g,
    description: 'Chiave pubblica Stripe di produzione (verificare restrizioni di dominio)',
  },
  {
    name: 'AWS Access Key ID',
    category: 'credential',
    severity: 'high',
    regex: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g,
    description: 'Identificativo credenziale cloud Amazon AWS',
  },
  {
    name: 'Google Maps / Cloud API Key',
    category: 'api_key',
    severity: 'medium',
    regex: /AIzaSy[0-9a-zA-Z-_]{33}/g,
    description: 'Chiave API Google Cloud / Maps (verificare restrizioni HTTP referrer)',
  },
  {
    name: 'Slack Incoming Webhook',
    category: 'webhook',
    severity: 'high',
    regex: /https:\/\/hooks\.slack\.com\/services\/T[0-9a-zA-Z_]{8,}\/B[0-9a-zA-Z_]{8,}\/[0-9a-zA-Z_]{24}/g,
    description: 'Webhook Slack esposto: rischio spam o spoofing notifiche aziendali',
  },
  {
    name: 'Discord Webhook URL',
    category: 'webhook',
    severity: 'medium',
    regex: /https:\/\/discord(?:app)?\.com\/api\/webhooks\/[0-9]{17,19}\/[a-zA-Z0-9_-]{60,68}/g,
    description: 'Webhook Discord esposto con permessi di pubblicazione messaggi',
  },
  {
    name: 'Generic Bearer JWT Token',
    category: 'token',
    severity: 'high',
    regex: /ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
    description: 'JSON Web Token (JWT) di sessione o autenticazione hardcodato',
  },
];

interface DetectedSecret {
  name: string;
  category: string;
  severity: 'critical' | 'high' | 'medium';
  sourceFile: string;
  matchedMasked: string;
  description: string;
}

function maskSecret(val: string): string {
  if (val.length <= 8) return '****';
  const head = val.slice(0, 4);
  const tail = val.slice(-4);
  return `${head}••••••••${tail}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawTarget = searchParams.get('target');
  const target = (rawTarget || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();

  const validation = await validateSafeTarget(target);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const validatedTarget = validation.target;
  const baseUrl = validatedTarget.startsWith('http') ? validatedTarget : `https://${validatedTarget}`;

  try {
    const detectedSecrets: DetectedSecret[] = [];
    const scannedUrls: string[] = [];

    // 1. Fetch passivo della home page HTML
    const htmlController = new AbortController();
    const htmlTimeout = setTimeout(() => htmlController.abort(), 5000);

    let htmlContent = '';
    try {
      const htmlRes = await fetch(baseUrl, {
        method: 'GET',
        signal: htmlController.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SecurityAudit-Secrets/1.0)',
        },
      });
      clearTimeout(htmlTimeout);
      if (htmlRes.ok) {
        htmlContent = await htmlRes.text();
        scannedUrls.push(baseUrl);
      }
    } catch {
      clearTimeout(htmlTimeout);
    }

    // 2. Estrazione bundle JS frontend (max primi 4 script per limite prudenziale)
    const scriptSrcMatches = Array.from(htmlContent.matchAll(/<script[^>]+src=["']([^"']+)["']/gi));
    const scriptUrls: string[] = [];

    for (const match of scriptSrcMatches) {
      const rawSrc = match[1];
      if (!rawSrc) continue;

      let absoluteUrl = '';
      if (rawSrc.startsWith('http://') || rawSrc.startsWith('https://')) {
        // Includi solo script dallo stesso host per evitare di scansionare CDN esterne (es. cdn.jsdelivr.net)
        if (rawSrc.includes(validatedTarget)) {
          absoluteUrl = rawSrc;
        }
      } else if (rawSrc.startsWith('//')) {
        absoluteUrl = `https:${rawSrc}`;
      } else if (rawSrc.startsWith('/')) {
        absoluteUrl = `${baseUrl.replace(/\/$/, '')}${rawSrc}`;
      }

      if (absoluteUrl && !scriptUrls.includes(absoluteUrl) && !absoluteUrl.includes('google-analytics') && !absoluteUrl.includes('googletagmanager')) {
        scriptUrls.push(absoluteUrl);
      }
      if (scriptUrls.length >= 4) break;
    }

    // 3. Regex scanning sull'HTML principale
    if (htmlContent) {
      for (const pattern of SECRET_PATTERNS) {
        pattern.regex.lastIndex = 0;
        const matches = htmlContent.match(pattern.regex);
        if (matches && matches.length > 0) {
          const unique = Array.from(new Set(matches)).slice(0, 2);
          for (const m of unique) {
            detectedSecrets.push({
              name: pattern.name,
              category: pattern.category,
              severity: pattern.severity,
              sourceFile: 'index.html',
              matchedMasked: maskSecret(m),
              description: pattern.description,
            });
          }
        }
      }
    }

    // 4. Regex scanning sui bundle JS correlati
    await Promise.allSettled(
      scriptUrls.map(async (scriptUrl) => {
        const jsController = new AbortController();
        const jsTimeout = setTimeout(() => jsController.abort(), 4000);

        try {
          const jsRes = await fetch(scriptUrl, {
            signal: jsController.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; SecurityAudit-Secrets/1.0)',
            },
          });
          clearTimeout(jsTimeout);

          if (jsRes.ok) {
            scannedUrls.push(scriptUrl);
            const jsContent = await jsRes.text();

            for (const pattern of SECRET_PATTERNS) {
              pattern.regex.lastIndex = 0;
              const matches = jsContent.match(pattern.regex);
              if (matches && matches.length > 0) {
                const unique = Array.from(new Set(matches)).slice(0, 2);
                for (const m of unique) {
                  const fileName = scriptUrl.split('/').pop()?.split('?')[0] || 'bundle.js';
                  detectedSecrets.push({
                    name: pattern.name,
                    category: pattern.category,
                    severity: pattern.severity,
                    sourceFile: fileName,
                    matchedMasked: maskSecret(m),
                    description: pattern.description,
                  });
                }
              }
            }
          }
        } catch {
          clearTimeout(jsTimeout);
        }
      })
    );

    const criticalCount = detectedSecrets.filter((s) => s.severity === 'critical').length;
    const highCount = detectedSecrets.filter((s) => s.severity === 'high').length;

    const status = criticalCount > 0 ? 'fail' : highCount > 0 ? 'warning' : detectedSecrets.length > 0 ? 'warning' : 'pass';

    return NextResponse.json({
      status,
      detectedSecrets,
      totalCheckedFiles: scannedUrls.length,
      criticalCount,
      highCount,
      mitreDefense: {
        attack: 'T1552.001 (Credentials in Files)',
        d3fend: 'D3-AHA (Application Hardening)',
      },
      message:
        detectedSecrets.length > 0
          ? `Rilevati ${detectedSecrets.length} token, chiavi o webhook esposti nel frontend.`
          : 'Nessuna chiave API segreta o token critico rilevato nei file frontend pubblici.',
      recommendation:
        detectedSecrets.length > 0
          ? 'Revoca immediatamente le chiavi trapelate e spostale in variabili d\'ambiente server-side protette.'
          : 'I bundle JavaScript e i file pubblici non espongono chiavi di autenticazione sensibili note.',
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Secrets scanner error:', error);
    return NextResponse.json({ error: 'Scansione token e segreti fallita' }, { status: 500 });
  }
}
