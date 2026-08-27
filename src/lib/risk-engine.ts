import { Finding, FindingCategory, RiskAssessment, SecurityGrade } from '@/types/findings';

/**
 * Calcola il punteggio di rischio (0-100) e il grading (A+ -> F)
 * in modo completamente deterministico, trasparente e spiegabile.
 */
export function calculateRiskAssessment(findings: Finding[]): RiskAssessment {
  let score = 100;
  const deductions: RiskAssessment['deductions'] = [];

  const pillars = {
    availability: { category: 'availability' as FindingCategory, score: 100, criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0, infoCount: 0 },
    configuration: { category: 'configuration' as FindingCategory, score: 100, criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0, infoCount: 0 },
    security: { category: 'security' as FindingCategory, score: 100, criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0, infoCount: 0 },
  };

  for (const finding of findings) {
    const pillar = pillars[finding.category];
    if (!pillar) continue;

    let deductionPoints = 0;
    const confidence = finding.confidence ?? 1.0;

    switch (finding.severity) {
      case 'critical':
        pillar.criticalCount++;
        deductionPoints = Math.round(25 * confidence);
        break;
      case 'high':
        pillar.highCount++;
        deductionPoints = Math.round(15 * confidence);
        break;
      case 'medium':
        pillar.mediumCount++;
        deductionPoints = Math.round(7 * confidence);
        break;
      case 'low':
        pillar.lowCount++;
        deductionPoints = Math.round(2 * confidence);
        break;
      case 'info':
        pillar.infoCount++;
        deductionPoints = 0;
        break;
    }

    if (deductionPoints > 0) {
      score -= deductionPoints;
      pillar.score = Math.max(0, pillar.score - deductionPoints);
      deductions.push({
        rule: finding.title,
        points: deductionPoints,
        reason: finding.description,
        severity: finding.severity,
      });
    }
  }

  score = Math.max(0, Math.min(100, score));

  // Assegnazione del grado
  let grade: SecurityGrade = 'F';
  if (score >= 95) grade = 'A+';
  else if (score >= 85) grade = 'A';
  else if (score >= 70) grade = 'B';
  else if (score >= 50) grade = 'C';
  else if (score >= 35) grade = 'D';
  else grade = 'F';

  // Se ci sono vulnerabilità critiche aperte, il voto massimo è 'C'
  if (pillars.security.criticalCount > 0 && (grade === 'A+' || grade === 'A' || grade === 'B')) {
    grade = 'C';
  }

  let summary = `Postura generale valutata con punteggio ${score}/100 (Grado ${grade}).`;
  if (pillars.security.criticalCount > 0) {
    summary += ` Rilevate ${pillars.security.criticalCount} vulnerabilità critiche che richiedono intervento immediato.`;
  } else if (pillars.configuration.highCount > 0) {
    summary += ` Rilevate ${pillars.configuration.highCount} configurazioni a rischio elevato.`;
  } else {
    summary += ` La postura di rete e sicurezza perimetrale risulta solida.`;
  }

  return {
    overallScore: score,
    grade,
    summary,
    pillars,
    findings,
    deductions,
  };
}

/**
 * Converte e normalizza i dati grezzi provenienti da tutti i moduli di scansione
 * in una lista standardizzata di Finding con evidenze e azioni di remediation.
 */
export function extractFindingsFromResults(rawResults: Record<string, unknown>): Finding[] {
  const findings: Finding[] = [];
  const now = Date.now();

  const secObj = rawResults['security'] as Record<string, unknown> | undefined;
  const vulnObj = rawResults['vulnerabilities'] as Record<string, unknown> | undefined;

  // 1. Audit Header di Sicurezza
  const headers = (rawResults['headers'] || secObj?.headers) as Record<string, unknown> | undefined;
  if (headers && typeof headers === 'object') {
    const hsts = headers.hsts as { present?: boolean } | undefined;
    if (!hsts || hsts.present === false) {
      findings.push({
        id: 'sec-hsts-missing',
        category: 'configuration',
        severity: 'high',
        title: 'HSTS (Strict-Transport-Security) Mancante',
        description: 'Il server non invia l’header HSTS, esponendo gli utenti a possibili attacchi di Man-In-The-Middle e SSL-Stripping.',
        evidence: 'Header Strict-Transport-Security non presente nella risposta HTTP.',
        impact: 'Possibile intercettazione o downgrade della connessione da HTTPS a HTTP.',
        confidence: 0.98,
        remediation: {
          action: 'Abilitare HSTS nel web server impostando un max-age di almeno 1 anno (31536000s) e includere i sottodomini.',
          codeSnippet: 'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
          technicalReference: 'RFC 6797',
        },
        timestamp: now,
      });
    }

    const csp = headers.csp as { present?: boolean } | undefined;
    if (!csp || csp.present === false) {
      findings.push({
        id: 'sec-csp-missing',
        category: 'configuration',
        severity: 'medium',
        title: 'Content-Security-Policy (CSP) Assente',
        description: 'La mancanza di una policy CSP lascia l’applicazione vulnerabile ad attacchi Cross-Site Scripting (XSS) e data injection.',
        evidence: 'Header Content-Security-Policy non rilevato.',
        impact: 'Aumento del rischio di esecuzione di script non autorizzati nel browser dei client.',
        confidence: 0.95,
        remediation: {
          action: 'Definire una policy CSP rigorosa che limiti le origini per script, stili e frame.',
          codeSnippet: "Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none';",
          technicalReference: 'OWASP CSP Cheat Sheet',
        },
        timestamp: now,
      });
    }

    const xfo = headers.xFrameOptions as { present?: boolean } | undefined;
    if (!xfo || xfo.present === false) {
      findings.push({
        id: 'sec-xfo-missing',
        category: 'configuration',
        severity: 'medium',
        title: 'Protezione Clickjacking (X-Frame-Options) Assente',
        description: 'La pagina può essere incorporata in un iframe esterno, consentendo attacchi di Clickjacking (UI Redressing).',
        evidence: 'Header X-Frame-Options non configurato.',
        impact: 'Gli attaccanti possono indurre gli utenti a compiere azioni involontarie tramite frame trasparenti.',
        confidence: 0.95,
        remediation: {
          action: 'Impostare X-Frame-Options su DENY o SAMEORIGIN.',
          codeSnippet: 'X-Frame-Options: SAMEORIGIN',
          technicalReference: 'OWASP Clickjacking Defense',
        },
        timestamp: now,
      });
    }
  }

  // 2. File Sensibili & Backup
  const files = (rawResults['files'] || vulnObj?.files) as Array<{ exposed?: boolean; status?: number; path?: string; url?: string; size?: string | number }> | undefined;
  if (files && Array.isArray(files)) {
    for (const file of files) {
      if (file.exposed || file.status === 200) {
        findings.push({
          id: `vuln-file-${file.path?.replace(/[^a-zA-Z0-9]/g, '_') || 'exposed'}`,
          category: 'security',
          severity: 'critical',
          title: `File Sensibile Esposto: ${file.path || 'Configurazione/Backup'}`,
          description: `È stato individuato un file di configurazione, ambiente o backup raggiungibile pubblicamente senza autenticazione.`,
          evidence: `HTTP 200 OK rilevato su ${file.url || file.path}. Dimensione: ${file.size || 'N/A'}.`,
          impact: 'Perdita totale di riservatezza su credenziali di database, chiavi API o codice sorgente.',
          confidence: 0.99,
          remediation: {
            action: 'Rimuovere immediatamente il file dal web root e bloccare l’accesso a estensioni sensibili (.env, .git, .sql) nel web server.',
            codeSnippet: 'location ~ /\\.(env|git|bak|sql) {\n    deny all;\n    return 404;\n}',
            technicalReference: 'OWASP Top 10 - A01:2021 Broken Access Control',
          },
          timestamp: now,
        });
      }
    }
  }

  // 3. Port Scan (Servizi di Backend e Database esposti)
  const portsRaw = (rawResults['portscan'] || rawResults['ports'] || secObj?.ports);
  if (portsRaw) {
    let openPorts: number[] = [];
    if (Array.isArray(portsRaw)) {
      openPorts = (portsRaw as Array<{ port?: number | string; status?: string; open?: boolean }>)
        .filter((p) => p.status === 'open' || p.open)
        .map((p) => Number(p.port));
    } else if (typeof portsRaw === 'object' && 'openPorts' in (portsRaw as Record<string, unknown>)) {
      openPorts = ((portsRaw as Record<string, unknown>).openPorts as number[]) || [];
    }

    const dbPorts: Record<number, string> = {
      3306: 'MySQL / MariaDB',
      5432: 'PostgreSQL',
      27017: 'MongoDB',
      6379: 'Redis Cache (In-Memory)',
      9200: 'Elasticsearch',
      21: 'FTP (Cleartext)',
      23: 'Telnet (Cleartext Insecure)',
    };

    for (const port of openPorts) {
      if (dbPorts[port]) {
        findings.push({
          id: `sec-port-exposed-${port}`,
          category: 'security',
          severity: 'critical',
          title: `Porta Critica Esposta su Rete Pubblica: ${port} (${dbPorts[port]})`,
          description: `Il servizio ${dbPorts[port]} risponde direttamente su interfaccia pubblica senza restrizione firewall.`,
          evidence: `Socket TCP aperto su porta ${port}.`,
          impact: 'Possibilità di attacchi brute-force, exploitation di vulnerabilità non patchate o data leak diretto.',
          confidence: 0.98,
          remediation: {
            action: `Configurare il firewall (UFW/iptables/Security Group) per chiudere la porta ${port} o abilitare l'ascolto solo su 127.0.0.1 / VPN interna.`,
            codeSnippet: `sudo ufw deny ${port}/tcp`,
            technicalReference: 'CIS Benchmark - Network Port Hardening',
          },
          timestamp: now,
        });
      }
    }
  }

  // 4. CORS Misconfiguration
  const cors = (rawResults['cors'] || vulnObj?.cors) as { misconfigured?: boolean; allowCredentials?: boolean; allowOrigin?: string } | undefined;
  if (cors && (cors.misconfigured || (cors.allowCredentials && cors.allowOrigin === '*'))) {
    findings.push({
      id: 'vuln-cors-credentials',
      category: 'security',
      severity: 'high',
      title: 'Misconfigurazione CORS con Credenziali',
      description: 'L’applicazione riflette qualsiasi header Origin consentendo l’accesso con credenziali e cookie autenticati.',
      evidence: `Access-Control-Allow-Origin: ${cors.allowOrigin || '*'} con Access-Control-Allow-Credentials: true`,
      impact: 'Un sito terzo malevolo può eseguire chiamate API a nome dell’utente autenticato e leggere dati riservati.',
      confidence: 0.95,
      remediation: {
        action: 'Impostare una whitelist esplicita di domini consentiti e non accettare domini arbitrari.',
        technicalReference: 'PortSwigger Web Security Academy: CORS',
      },
      timestamp: now,
    });
  }

  // 5. Cookie Security Audit
  const cookiesRaw = (rawResults['cookies'] || vulnObj?.cookies);
  if (cookiesRaw) {
    const list = (Array.isArray(cookiesRaw)
      ? cookiesRaw
      : ((cookiesRaw as Record<string, unknown>)?.items as unknown[])) as Array<{ name?: string; httpOnly?: boolean; secure?: boolean }> || [];
    for (const c of list) {
      if (!c.httpOnly || !c.secure) {
        findings.push({
          id: `vuln-cookie-${c.name || 'unnamed'}`,
          category: 'security',
          severity: 'medium',
          title: `Cookie Privo di Flag di Sicurezza: ${c.name || 'Session Cookie'}`,
          description: `Il cookie non possiede i flag HttpOnly o Secure necessari per proteggerlo da furti via XSS o intercettazioni in chiaro.`,
          evidence: `Flags mancanti: ${[!c.httpOnly && 'HttpOnly', !c.secure && 'Secure'].filter(Boolean).join(', ')}`,
          impact: 'Possibilità di furto di token di sessione in caso di vulnerabilità XSS o comunicazioni degradate.',
          confidence: 0.95,
          remediation: {
            action: 'Aggiungere i flag HttpOnly, Secure e SameSite=Lax/Strict nella direttiva Set-Cookie del server.',
            codeSnippet: `Set-Cookie: ${c.name || 'token'}=...; Secure; HttpOnly; SameSite=Lax`,
            technicalReference: 'OWASP Cookie Security Guide',
          },
          timestamp: now,
        });
      }
    }
  }

  // 6. Certificato SSL / TLS
  const ssl = (rawResults['ssl'] || secObj?.tls) as { valid?: boolean; daysRemaining?: number; validTo?: string } | undefined;
  if (ssl) {
    if (ssl.valid === false || (ssl.daysRemaining !== undefined && ssl.daysRemaining < 15)) {
      const isExpired = (ssl.daysRemaining ?? 0) <= 0;
      findings.push({
        id: 'sec-ssl-expiry',
        category: 'configuration',
        severity: isExpired ? 'critical' : 'high',
        title: isExpired ? 'Certificato SSL/TLS Scaduto' : `Certificato SSL/TLS in Scadenza (${ssl.daysRemaining} giorni)`,
        description: isExpired
          ? 'Il certificato crittografico è scaduto; i client ricevono un blocco di sicurezza dal browser.'
          : 'Il certificato scadrà a breve, rischiando interruzione del servizio se non rinnovato.',
        evidence: `Scadenza: ${ssl.validTo || 'N/A'}, Giorni residui: ${ssl.daysRemaining ?? 'Scaduto'}.`,
        impact: 'Blocco completo dell’accesso utente con schermata di allarme di sicurezza del browser.',
        confidence: 0.99,
        remediation: {
          action: 'Eseguire il rinnovo automatico tramite Certbot / ACME / Cloudflare.',
          codeSnippet: 'certbot renew --force-renewal',
        },
        timestamp: now,
      });
    }
  }

  // 7. Email Posture (DMARC & SPF)
  const dmarc = (rawResults['dmarc'] || secObj?.dmarc) as { valid?: boolean; policy?: string; record?: string } | undefined;
  if (dmarc && (!dmarc.valid || dmarc.policy === 'none')) {
    findings.push({
      id: 'sec-dmarc-weak',
      category: 'configuration',
      severity: 'medium',
      title: 'Policy DMARC Debole o Inesistente',
      description: 'Il dominio non implementa una policy di rigetto (p=reject o p=quarantine), facilitando attacchi di Email Spoofing e Phishing a nome del dominio.',
      evidence: `Record DMARC: ${dmarc.record || 'Non trovato'} (Policy: ${dmarc.policy || 'none'})`,
      impact: 'Rischio elevato di phishing e usurpazione dell’identità del dominio da parte di spammer.',
      confidence: 0.97,
      remediation: {
        action: 'Impostare il record TXT DMARC su `p=reject` o `p=quarantine`.',
        codeSnippet: 'v=DMARC1; p=reject; rua=mailto:dmarc-reports@tuodominio.com;',
        technicalReference: 'RFC 7489',
      },
      timestamp: now,
    });
  }

  // 8. Disponibilità e Latenza TTFB
  const ttfbObj = rawResults['ttfb'] as { ttfb?: number } | undefined;
  const pingObj = rawResults['ping'] as { avgLatency?: number } | undefined;
  const ttfbVal = ttfbObj?.ttfb;
  const pingVal = pingObj?.avgLatency;

  if ((ttfbVal !== undefined && ttfbVal > 1500) || (pingVal !== undefined && pingVal > 500)) {
    findings.push({
      id: 'avail-latency-high',
      category: 'availability',
      severity: 'low',
      title: 'Tempo di Risposta del Server Elevato (TTFB / Latenza)',
      description: 'Il tempo di risposta del server supera le soglie ottimali, impattando negativamente sulla user experience e sul throughput.',
      evidence: `TTFB: ${ttfbVal !== undefined ? `${ttfbVal}ms` : 'N/A'}, Latenza TCP: ${pingVal !== undefined ? `${pingVal}ms` : 'N/A'}.`,
      impact: 'Rallentamento generale dell’applicazione e potenziale abbandono da parte degli utenti.',
      confidence: 0.90,
      remediation: {
        action: 'Abilitare il caching edge tramite CDN (Cloudflare/CloudFront), abilitare gzip/brotli e ottimizzare le query database.',
      },
      timestamp: now,
    });
  }

  return findings;
}
