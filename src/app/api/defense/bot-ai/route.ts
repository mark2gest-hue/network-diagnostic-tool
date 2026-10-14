import { NextRequest, NextResponse } from 'next/server';
import { safeHttpProbe } from '@/lib/safe-http-probe';
import { normalizeTarget } from '@/lib/target-normalizer';
import { ScopeEngine } from '@/lib/scope-engine';
import {
  parseRobotsTxtForCrawlers,
  generateHardeningSnippets,
  BotAiAuditResult,
} from '@/lib/bot-ai-defense-engine';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawTarget = typeof body.target === 'string' ? body.target.trim() : '';

    if (!rawTarget) {
      return NextResponse.json({ error: 'Target obbligatorio' }, { status: 400 });
    }

    const norm = await normalizeTarget(rawTarget);
    if (!norm || !norm.hostname) {
      return NextResponse.json({ error: 'Target non valido o impossibile da normalizzare' }, { status: 400 });
    }

    const scopeEngine = new ScopeEngine();
    const scopeCheck = scopeEngine.isTargetInScope(norm, 'external');
    if (!scopeCheck.inScope) {
      return NextResponse.json({ error: scopeCheck.reason }, { status: 403 });
    }

    const hostname = norm.hostname;
    const protocol = norm.scheme ? `${norm.scheme}:` : 'https:';
    const baseUrl = `${protocol}//${hostname}`;

    // Helper per estrarre stringhe da record headers
    const getHeader = (h: Record<string, string | string[] | undefined>, key: string): string => {
      const val = h[key.toLowerCase()];
      if (Array.isArray(val)) return val.join(', ');
      return typeof val === 'string' ? val : '';
    };

    // 1. Audit empirico HTTP headers su homepage
    const probeRes = await safeHttpProbe(baseUrl, { timeout: 6000 });
    const headers = probeRes.headers || {};

    const serverHeader = getHeader(headers, 'server').toLowerCase();
    const xRobotsTag = getHeader(headers, 'x-robots-tag') || null;
    const csp = getHeader(headers, 'content-security-policy') || null;

    // Rilevamento WAF & Provider
    let wafDetected = false;
    let wafProvider: string | null = null;
    let hasBotChallenge = false;

    if (serverHeader.includes('cloudflare') || headers['cf-ray'] || headers['cf-cache-status']) {
      wafDetected = true;
      wafProvider = 'Cloudflare';
      if (headers['cf-mitigated'] || probeRes.status === 403 || probeRes.status === 503) {
        hasBotChallenge = true;
      }
    } else if (serverHeader.includes('akamai') || headers['x-akamai-transformed']) {
      wafDetected = true;
      wafProvider = 'Akamai';
    } else if (headers['x-amz-cf-id'] || serverHeader.includes('cloudfront')) {
      wafDetected = true;
      wafProvider = 'AWS CloudFront / AWS WAF';
    } else if (headers['x-sucuri-id']) {
      wafDetected = true;
      wafProvider = 'Sucuri CloudProxy';
    } else if (headers['x-fastly-request-id'] || serverHeader.includes('fastly')) {
      wafDetected = true;
      wafProvider = 'Fastly Signal Sciences';
    }

    const rateLimitHeadersFound = Boolean(
      headers['x-ratelimit-limit'] ||
      headers['ratelimit-limit'] ||
      headers['retry-after']
    );

    const hasFrameAncestors = Boolean(
      csp && csp.toLowerCase().includes('frame-ancestors')
    );

    // 2. Audit empirico di robots.txt
    const robotsUrl = `${baseUrl}/robots.txt`;
    let robotsProbe: any = null;
    try {
      robotsProbe = await safeHttpProbe(robotsUrl, { timeout: 5000 });
    } catch {
      robotsProbe = null;
    }

    let robotsPresent = false;
    let crawlerChecks = parseRobotsTxtForCrawlers('');

    if (robotsProbe && robotsProbe.status === 200 && robotsProbe.body) {
      robotsPresent = true;
      crawlerChecks = parseRobotsTxtForCrawlers(robotsProbe.body);
    }

    const blockedCrawlersCount = crawlerChecks.filter(c => c.isBlockedByRobotsTxt).length;
    const hasAiCrawlerRestrictions = blockedCrawlersCount > 0;

    // 3. Calcolo Hardening Score (0-100) & Raccomandazioni
    let postureScore = 20; // Base baseline
    const recommendations: string[] = [];

    if (wafDetected) {
      postureScore += 30;
    } else {
      recommendations.push('Nessun WAF/Reverse Proxy anti-DDoS o anti-bot rilevato sul perimetro esterno.');
    }

    if (hasBotChallenge) {
      postureScore += 20;
    }

    if (hasAiCrawlerRestrictions) {
      postureScore += 20;
    } else {
      recommendations.push('robots.txt non contiene blocchi espliciti per i crawler di training AI (es. GPTBot, ClaudeBot, Bytespider).');
    }

    if (xRobotsTag && (xRobotsTag.toLowerCase().includes('noai') || xRobotsTag.toLowerCase().includes('noindex'))) {
      postureScore += 10;
    } else {
      recommendations.push('Header X-Robots-Tag con direttiva "noai" mancante sui contenuti.');
    }

    if (!rateLimitHeadersFound) {
      recommendations.push('Rate-limiting non segnalato a livello HTTP: rischio scraping massivo e attacchi brute-force botnet.');
    }

    postureScore = Math.min(100, Math.max(0, postureScore));

    let status: BotAiAuditResult['status'] = 'passed';
    if (postureScore < 50) {
      status = 'critical';
    } else if (postureScore < 75) {
      status = 'warning';
    }

    // 4. Generazione snippet di mitigazione
    const hardeningSnippets = generateHardeningSnippets(hostname);

    const result: BotAiAuditResult = {
      target: hostname,
      normalizedUrl: baseUrl,
      timestamp: new Date().toISOString(),
      status,
      wafDetected,
      wafProvider,
      hasBotChallenge,
      headersAudit: {
        xRobotsTag,
        contentSecurityPolicy: csp,
        rateLimitHeadersFound,
        hasFrameAncestors,
      },
      robotsTxt: {
        present: robotsPresent,
        url: robotsUrl,
        hasAiCrawlerRestrictions,
        crawlerChecks,
      },
      postureScore,
      recommendations,
      hardeningSnippets,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Errore durante audit Bot & AI Defense:', error);
    return NextResponse.json(
      { error: 'Errore interno durante audit di difesa bot/AI' },
      { status: 500 }
    );
  }
}
