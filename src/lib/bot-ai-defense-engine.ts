export interface AICrawlerCheck {
  crawlerName: string;
  category: 'LLM Scraper' | 'Search/Index AI' | 'Commercial Data Harvester';
  userAgentToken: string;
  isBlockedByRobotsTxt: boolean;
  mitreAtlasTag: string; // e.g. AML.T0053
}

export interface BotAiAuditResult {
  target: string;
  normalizedUrl: string;
  timestamp: string;
  status: 'passed' | 'warning' | 'critical' | 'error';
  
  // Rilevamenti WAF & Bot Protection
  wafDetected: boolean;
  wafProvider: string | null;
  hasBotChallenge: boolean;
  
  // Headers difensivi
  headersAudit: {
    xRobotsTag: string | null;
    contentSecurityPolicy: string | null;
    rateLimitHeadersFound: boolean;
    hasFrameAncestors: boolean;
  };

  // Analisi Robots.txt
  robotsTxt: {
    present: boolean;
    url: string;
    hasAiCrawlerRestrictions: boolean;
    crawlerChecks: AICrawlerCheck[];
  };

  // Hardening Score (0-100)
  postureScore: number;
  recommendations: string[];

  // Config generata per mitigazione immediata
  hardeningSnippets: {
    cloudflareWafRule: string;
    nginxRateLimitSnippet: string;
    defensiveRobotsTxt: string;
  };
}

export const KNOWN_AI_CRAWLERS: Array<{ name: string; token: string; category: AICrawlerCheck['category']; mitre: string }> = [
  { name: 'GPTBot (OpenAI Web Scraper)', token: 'gptbot', category: 'LLM Scraper', mitre: 'AML.T0053 (Data Exfiltration)' },
  { name: 'ChatGPT-User (Browsing Mode)', token: 'chatgpt-user', category: 'LLM Scraper', mitre: 'AML.T0053 (Data Exfiltration)' },
  { name: 'ClaudeBot (Anthropic)', token: 'claudebot', category: 'LLM Scraper', mitre: 'AML.T0053 (Data Exfiltration)' },
  { name: 'Claude-Web (Anthropic Browsing)', token: 'claude-web', category: 'LLM Scraper', mitre: 'AML.T0053 (Data Exfiltration)' },
  { name: 'PerplexityBot', token: 'perplexitybot', category: 'Search/Index AI', mitre: 'AML.T0053 (Data Exfiltration)' },
  { name: 'Bytespider (ByteDance/TikTok LLM)', token: 'bytespider', category: 'Commercial Data Harvester', mitre: 'AML.T0053 (Data Exfiltration)' },
  { name: 'CCBot (Common Crawl LLM Datasets)', token: 'ccbot', category: 'Commercial Data Harvester', mitre: 'AML.T0053 (Data Exfiltration)' },
  { name: 'Diffbot', token: 'diffbot', category: 'Commercial Data Harvester', mitre: 'AML.T0053 (Data Exfiltration)' },
  { name: 'FacebookBot / Meta-ExternalAgent', token: 'facebookbot', category: 'LLM Scraper', mitre: 'AML.T0053 (Data Exfiltration)' },
  { name: 'Google-Extended (Gemini Training opt-out)', token: 'google-extended', category: 'LLM Scraper', mitre: 'AML.T0053 (Data Exfiltration)' },
  { name: 'Applebot-Extended', token: 'applebot-extended', category: 'LLM Scraper', mitre: 'AML.T0053 (Data Exfiltration)' },
  { name: 'Amazonbot', token: 'amazonbot', category: 'Commercial Data Harvester', mitre: 'AML.T0053 (Data Exfiltration)' },
];

/**
 * Parsing euristico deterministico di robots.txt per estrarre se un crawler specifico è Disallow su /
 */
export function parseRobotsTxtForCrawlers(robotsContent: string): AICrawlerCheck[] {
  const lines = robotsContent.split('\n').map(l => l.trim().toLowerCase());
  
  return KNOWN_AI_CRAWLERS.map(crawler => {
    let currentAgent = '';
    let isBlocked = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('#')) continue;

      if (line.startsWith('user-agent:')) {
        currentAgent = line.replace('user-agent:', '').trim();
      } else if (line.startsWith('disallow:')) {
        const path = line.replace('disallow:', '').trim();
        // Se si applica all'agente o al wildcard * e blocca la root /
        if ((currentAgent === crawler.token || currentAgent === '*') && (path === '/' || path === '/*')) {
          // Se la regola è specifica per il crawler, ha precedenza
          if (currentAgent === crawler.token) {
            isBlocked = true;
            break;
          }
          // Se wildcard, segniamo true a meno di override successivi
          isBlocked = true;
        }
      }
    }

    return {
      crawlerName: crawler.name,
      category: crawler.category,
      userAgentToken: crawler.token,
      isBlockedByRobotsTxt: isBlocked,
      mitreAtlasTag: crawler.mitre,
    };
  });
}

/**
 * Genera configurazioni di mitigazione empiriche basate sul dominio
 */
export function generateHardeningSnippets(hostname: string): BotAiAuditResult['hardeningSnippets'] {
  // 1. Cloudflare WAF Expression Rule
  const cloudflareWafRule = `(http.user_agent contains "GPTBot") or ` +
    `(http.user_agent contains "ClaudeBot") or ` +
    `(http.user_agent contains "PerplexityBot") or ` +
    `(http.user_agent contains "Bytespider") or ` +
    `(http.user_agent contains "CCBot") or ` +
    `(http.user_agent contains "Diffbot") or ` +
    `(http.user_agent contains "FacebookBot") or ` +
    `(cf.threat_score gt 20 and not cf.bot_management.verified_bot)`;

  // 2. Nginx Rate Limit + Bot Trap
  const nginxRateLimitSnippet = `# --- /etc/nginx/conf.d/bot_defense_${hostname.replace(/[^a-zA-Z0-9]/g, '_')}.conf ---
# 1. Definizione zona di rate limiting anti-bot e anti-scraping
limit_req_zone $binary_remote_addr zone=ai_bot_limit:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=api_shield:10m rate=30r/m;

# 2. Mappatura User-Agent noti AI Harvesters
map $http_user_agent $bad_ai_bot {
    default 0;
    ~*(GPTBot|ChatGPT-User|ClaudeBot|PerplexityBot|Bytespider|CCBot|Diffbot|FacebookBot) 1;
}

server {
    server_name ${hostname};

    # Blocco istantaneo crawler AI non autorizzati (MITRE AML.T0053)
    if ($bad_ai_bot) {
        return 403 "Forbidden: Automated AI scraping and harvesting disallowed.";
    }

    # Protezione rate-limit su rotte sensibili
    location /api/ {
        limit_req zone=api_shield burst=10 nodelay;
        # Inoltro a backend...
    }

    # Headers difensivi globali
    add_header X-Robots-Tag "noai, noimageai, nosnippet" always;
    add_header Content-Security-Policy "frame-ancestors 'self';" always;
}`;

  // 3. Robots.txt restrittivo standard OWASP & MITRE ATLAS
  const defensiveRobotsTxt = `# Standard Anti-AI Scraping Robots.txt for ${hostname}
# Riferimento: MITRE ATLAS AML.T0053 (Data Exfiltration via Scraping)

User-agent: GPTBot
Disallow: /

User-agent: ChatGPT-User
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: Claude-Web
Disallow: /

User-agent: PerplexityBot
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: Diffbot
Disallow: /

User-agent: FacebookBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: Applebot-Extended
Disallow: /

User-agent: Amazonbot
Disallow: /

# Consenti solo motori di ricerca standard verificati
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: *
Disallow: /admin/
Disallow: /api/
Disallow: /private/
`;

  return {
    cloudflareWafRule,
    nginxRateLimitSnippet,
    defensiveRobotsTxt,
  };
}
