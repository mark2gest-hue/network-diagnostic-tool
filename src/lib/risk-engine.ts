import { Finding, FindingCategory, FindingSeverity, RiskAssessment, SecurityGrade } from '@/types/findings';

/**
 * Calcola il punteggio di rischio (0-100) e il grading (A+ -> F)
 * scomposto in modo trasparente in Exposure (50%), Posture (30%) e Operational (20%).
 */
export function calculateRiskAssessment(findings: Finding[], rawResults?: Record<string, unknown>): RiskAssessment {
  const deductions: RiskAssessment['deductions'] = [];

  // Calcolo Copertura Esecutiva separata dallo score
  let totalModules = 0;
  let completedModules = 0;
  let inconclusiveModules = 0;
  let errorModules = 0;

  if (rawResults && typeof rawResults === 'object') {
    const entries = Object.entries(rawResults);
    totalModules = entries.length;
    for (const [, item] of entries) {
      if (!item) continue;
      const rec = item as Record<string, unknown>;
      const status = String(rec.status || rec.executionStatus || '').toLowerCase();
      if (status === 'error' || status === 'fail') {
        errorModules++;
      } else if (status === 'inconclusive' || status === 'skipped') {
        inconclusiveModules++;
      } else {
        completedModules++;
      }
    }
  }

  const secObj = rawResults?.['security'] as Record<string, unknown> | undefined;
  const vulnObj = rawResults?.['vulnerabilities'] as Record<string, unknown> | undefined;
  const hasSecurityEvaluation = Boolean(
    (secObj && Object.values(secObj).some(v => v !== null && (v as { status?: string })?.status !== 'idle' && (v as { status?: string })?.status !== undefined)) ||
    (vulnObj && Object.values(vulnObj).some(v => v !== null && (v as { status?: string })?.status !== 'idle' && (v as { status?: string })?.status !== undefined)) ||
    rawResults?.['dmarc'] ||
    rawResults?.['spf'] ||
    rawResults?.['headers']
  );

  const coveragePercentage = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 100;
  const isCoverageSufficient = coveragePercentage >= 60 && hasSecurityEvaluation;
  const caveatNotes = !hasSecurityEvaluation
    ? 'Valutazione parziale: i moduli di sicurezza perimetrale (DMARC, SPF, Security Headers, Vulnerabilità) non sono stati ancora eseguiti. Avvia l’audit completo per calcolare la postura reale.'
    : !isCoverageSufficient 
    ? 'Attenzione: oltre il 40% dei moduli non è stato completato o risulta inconclusivo. La valutazione di postura potrebbe non essere pienamente rappresentativa.' 
    : undefined;

  const coverage = {
    totalModules: totalModules || 1,
    completedModules: completedModules || 1,
    inconclusiveModules,
    errorModules,
    coveragePercentage,
    isCoverageSufficient,
    caveatNotes,
  };

  const pillars = {
    availability: { category: 'availability' as FindingCategory, score: 100, criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0, infoCount: 0 },
    configuration: { category: 'configuration' as FindingCategory, score: 100, criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0, infoCount: 0 },
    security: { category: 'security' as FindingCategory, score: 100, criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0, infoCount: 0 },
    governance: { category: 'governance' as FindingCategory, score: 100, criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0, infoCount: 0 },
  };

  for (const finding of findings) {
    // Se il finding è Falso Positivo o Rischio Accettato, o categoria governance pura, non detrarre punti di sicurezza
    if (finding.status === 'false_positive' || finding.status === 'risk_accepted' || finding.category === 'governance') {
      continue;
    }

    const pillar = pillars[finding.category];
    if (!pillar) continue;

    let deductionPoints = 0;
    const confidence = finding.confidence ?? 1.0;

    switch (finding.severity) {
      case 'critical':
        pillar.criticalCount++;
        deductionPoints = Math.round(35 * confidence);
        break;
      case 'high':
        pillar.highCount++;
        deductionPoints = Math.round(20 * confidence);
        break;
      case 'medium':
        pillar.mediumCount++;
        deductionPoints = Math.round(10 * confidence);
        break;
      case 'low':
        pillar.lowCount++;
        deductionPoints = Math.round(4 * confidence);
        break;
      case 'info':
        pillar.infoCount++;
        deductionPoints = 0;
        break;
    }

    if (deductionPoints > 0) {
      pillar.score = Math.max(0, pillar.score - deductionPoints);
      deductions.push({
        findingId: finding.id,
        rule: finding.title,
        points: deductionPoints,
        reason: finding.description,
        severity: finding.severity,
      });
    }
  }

  // Scomposizione nei 3 punteggi specifici
  const exposureScore = Math.max(0, Math.min(100, pillars.security.score));      // 50% peso
  const postureScore = Math.max(0, Math.min(100, pillars.configuration.score)); // 30% peso
  const operationalScore = Math.max(0, Math.min(100, pillars.availability.score)); // 20% peso

  // Calcolo ponderato trasparente
  let overallScore = Math.round((exposureScore * 0.5) + (postureScore * 0.3) + (operationalScore * 0.2));
  overallScore = Math.max(0, Math.min(100, overallScore));

  // Assegnazione del grado
  let grade: SecurityGrade = 'F';
  if (overallScore >= 95) grade = 'A+';
  else if (overallScore >= 85) grade = 'A';
  else if (overallScore >= 70) grade = 'B';
  else if (overallScore >= 50) grade = 'C';
  else if (overallScore >= 35) grade = 'D';
  else grade = 'F';

  // Penalità: se ci sono vulnerabilità critiche aperte nella sicurezza, il grado massimo consentito è 'C'
  if (pillars.security.criticalCount > 0 && (grade === 'A+' || grade === 'A' || grade === 'B')) {
    grade = 'C';
  }

  if (!hasSecurityEvaluation) {
    overallScore = Math.min(overallScore, 60);
    grade = 'C';
  }

  const formulaExplanation = `Punteggio Finale (${overallScore}) = Exposure [${exposureScore}] × 50% + Posture [${postureScore}] × 30% + Operational [${operationalScore}] × 20%`;

  let summary = !hasSecurityEvaluation
    ? `Postura provvisoria (${overallScore}/100, Grado ${grade}): i moduli di sicurezza perimetrale (DMARC, SPF, Headers, Vulnerabilità) non sono stati eseguiti. Avvia l’audit completo per verificare l’effettiva protezione.`
    : `Postura generale valutata con punteggio ${overallScore}/100 (Grado ${grade}) su una copertura esecutiva del ${coveragePercentage}%.`;
  
  if (hasSecurityEvaluation) {
    if (pillars.security.criticalCount > 0) {
      summary += ` Rilevate ${pillars.security.criticalCount} vulnerabilità critiche che richiedono intervento prioritario.`;
    } else if (pillars.configuration.highCount > 0) {
      summary += ` Rilevate ${pillars.configuration.highCount} configurazioni a rischio elevato.`;
    } else {
      summary += ` La postura di rete e sicurezza perimetrale risulta coerente con i controlli eseguiti.`;
    }
  }

  return {
    overallScore,
    grade,
    summary,
    coverage,
    breakdown: {
      exposureScore,
      postureScore,
      operationalScore,
      formulaExplanation,
    },
    pillars,
    findings,
    deductions,
  };
}


function unwrap<T = Record<string, unknown>>(item: unknown): T | undefined {
  if (!item || typeof item !== 'object') return undefined;
  if ('result' in item && (item as { result?: unknown }).result !== undefined) {
    return (item as { result?: T }).result as T;
  }
  return item as T;
}

/**
 * Converte e normalizza i dati grezzi provenienti da tutti i moduli di scansione
 * in una lista standardizzata di Finding con evidenze e azioni di remediation.
 */
export function extractFindingsFromResults(rawResults: Record<string, unknown>): Finding[] {
  const findings: Finding[] = [];
  const now = Date.now();

  const secObj = (rawResults['security'] || {}) as Record<string, unknown>;
  const vulnObj = (rawResults['vulnerabilities'] || {}) as Record<string, unknown>;

  // 1. Audit Header di Sicurezza (supporta sia /api/security/headers che /api/tests/http)
  const headers = unwrap<{ audit?: Array<{ header: string; present: boolean; value?: string }>; hsts?: { present?: boolean }; csp?: { present?: boolean }; xFrameOptions?: { present?: boolean } }>(
    rawResults['headers'] || secObj?.['headers']
  );
  const httpObj = unwrap<{ headers?: Record<string, string>; status?: number }>(rawResults['http']);
  const httpHeaders = httpObj?.headers;

  const auditList = Array.isArray(headers?.audit) ? headers.audit : [];
  const auditHsts = auditList.find((h) => h.header === 'Strict-Transport-Security');
  const auditCsp = auditList.find((h) => h.header === 'Content-Security-Policy');
  const auditXfo = auditList.find((h) => h.header === 'X-Frame-Options');

  // Analisi HSTS
  const hasHsts = (auditHsts ? auditHsts.present : headers?.hsts?.present === true) || Boolean(httpHeaders?.['strict-transport-security']);
  const evaluatedHsts = Boolean(auditHsts !== undefined || headers?.hsts !== undefined || httpHeaders);

  if (evaluatedHsts && !hasHsts) {
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

  // Analisi CSP
  const hasCsp = (auditCsp ? auditCsp.present : headers?.csp?.present === true) || Boolean(httpHeaders?.['content-security-policy']);
  const evaluatedCsp = Boolean(auditCsp !== undefined || headers?.csp !== undefined || httpHeaders);

  if (evaluatedCsp && !hasCsp) {
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

  // Analisi Clickjacking (X-Frame-Options o frame-ancestors)
  const hasXfo = (auditXfo ? auditXfo.present : headers?.xFrameOptions?.present === true) || Boolean(httpHeaders?.['x-frame-options']);
  const evaluatedXfo = Boolean(auditXfo !== undefined || headers?.xFrameOptions !== undefined || httpHeaders);

  if (evaluatedXfo && !hasXfo && !httpHeaders?.['content-security-policy']?.includes('frame-ancestors')) {
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

  // Analisi Information Disclosure (Server Version & X-Powered-By)
  if (httpHeaders) {
    const serverHeader = httpHeaders['server'];
    if (serverHeader && (serverHeader.includes('/') || /\d/.test(serverHeader))) {
      findings.push({
        id: 'sec-info-server-version',
        category: 'configuration',
        severity: 'low',
        title: 'Esposizione Versione Web Server nell’Header Server',
        description: `Il web server espone l’header "Server: ${serverHeader}", rivelando versione esatta del software e del sistema operativo ai potenziali attaccanti.`,
        evidence: `Header ricevuto: Server: ${serverHeader}`,
        impact: 'Facilita la ricognizione mirata di exploit noti per la specifica versione di Nginx/Apache.',
        confidence: 0.99,
        remediation: {
          action: 'Disabilitare la visualizzazione della versione nel web server (es. "server_tokens off;" su Nginx).',
          codeSnippet: 'server_tokens off;',
          technicalReference: 'OWASP Information Exposure (CWE-200)',
        },
        timestamp: now,
      });
    }

    const poweredBy = httpHeaders['x-powered-by'];
    if (poweredBy) {
      findings.push({
        id: 'sec-info-powered-by',
        category: 'configuration',
        severity: 'low',
        title: 'Esposizione Stack Tecnologico nell’Header X-Powered-By',
        description: `Il server espone l’header "X-Powered-By: ${poweredBy}", indicando esplicitamente il framework o runtime utilizzato.`,
        evidence: `Header ricevuto: X-Powered-By: ${poweredBy}`,
        impact: 'Rende identificabili i framework di backend semplificando l’individuazione di vettori di attacco.',
        confidence: 0.99,
        remediation: {
          action: 'Rimuovere l’header X-Powered-By nella configurazione dell’applicazione o del reverse proxy.',
          codeSnippet: 'proxy_hide_header X-Powered-By;\n// In Next.js (next.config.js): { poweredByHeader: false }',
          technicalReference: 'CWE-200',
        },
        timestamp: now,
      });
    }
  }

  // Analisi Software EOL (da /api/security/headers)
  const rawHeadersObj = unwrap<{ informationDisclosure?: { eolDetected?: Array<{ technology?: string; eolDetail?: string; value?: string; risk?: string }> } }>(rawResults['headers'] || secObj?.['headers']);
  if (rawHeadersObj?.informationDisclosure?.eolDetected && rawHeadersObj.informationDisclosure.eolDetected.length > 0) {
    for (const eol of rawHeadersObj.informationDisclosure.eolDetected) {
      findings.push({
        id: `sec-eol-${(eol.technology || 'software').toLowerCase().replace(/[^a-zA-Z0-9]/g, '_')}`,
        category: 'security',
        severity: 'high',
        title: `Software End-of-Life Rilevato: ${eol.technology || 'Web Server'}`,
        description: `Il web server o runtime in esecuzione (${eol.value || eol.technology}) è ufficialmente deprecato e non riceve più aggiornamenti di sicurezza.`,
        evidence: `Dettaglio banner: ${eol.value || 'N/A'}. Diagnosi: ${eol.eolDetail || 'Versione End-of-Life'}`,
        impact: 'Vulnerabilità note con exploit pubblici disponibili senza possibilità di patch ufficiale da parte del vendor.',
        confidence: 0.99,
        remediation: {
          action: `Aggiornare ${eol.technology || 'il componente'} all'ultimo ramo stabile supportato a lungo termine (LTS).`,
          codeSnippet: '# Esempio Debian/Ubuntu:\napt update && apt --only-upgrade install nginx',
          technicalReference: 'CWE-1104: Use of Unmaintained Third Party Components',
        },
        timestamp: now,
      });
    }
  }

  // 2. File Sensibili & Backup (esclude categoricamente file pubblici come robots.txt)
  const rawFilesPayload = unwrap<Record<string, unknown> | Array<unknown>>(rawResults['files'] || vulnObj?.['files']);
  const filesList = Array.isArray(rawFilesPayload)
    ? rawFilesPayload
    : Array.isArray((rawFilesPayload as { exposedFiles?: unknown[] })?.exposedFiles)
    ? (rawFilesPayload as { exposedFiles: unknown[] }).exposedFiles
    : [];

  for (const item of filesList) {
    const file = item as { exposed?: boolean; status?: number | string; path?: string; url?: string; size?: string | number; risk?: string };
    const p = (file.path || '').toLowerCase();
    if (p.includes('robots.txt') || p.includes('security.txt')) continue;

    if (file.exposed || file.status === 200 || file.status === 'exposed') {
      const isCritical = file.risk === 'critical' || p.includes('.env') || p.includes('.git') || p.includes('id_rsa') || p.includes('.aws');
      const severity: FindingSeverity = isCritical ? 'critical' : 'high';
      findings.push({
        id: `vuln-file-${file.path?.replace(/[^a-zA-Z0-9]/g, '_') || 'exposed'}`,
        category: 'security',
        severity,
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

  // 2.1 Directory Listing (CWE-548)
  const rawDirPayload = unwrap<Record<string, unknown> | Array<unknown>>(rawResults['directory-listing'] || vulnObj?.['directory-listing']);
  const dirList = Array.isArray(rawDirPayload)
    ? rawDirPayload
    : Array.isArray((rawDirPayload as { exposedDirectories?: unknown[] })?.exposedDirectories)
    ? (rawDirPayload as { exposedDirectories: unknown[] }).exposedDirectories
    : [];

  for (const item of dirList) {
    const dir = item as { path?: string; url?: string; risk?: string; server?: string; evidenceSnippet?: string; curlCommand?: string };
    if (dir.path) {
      const isCritical = dir.risk === 'critical' || dir.path.includes('backup') || dir.path.includes('data');
      findings.push({
        id: `vuln-dir-${dir.path.replace(/[^a-zA-Z0-9]/g, '_')}`,
        category: 'security',
        severity: isCritical ? 'critical' : 'high',
        title: `Directory Listing Aperto: ${dir.path}`,
        description: `Indicizzazione automatica attiva (autoindex). I visitatori possono navigare e scaricare l'intero contenuto della cartella.`,
        evidence: `${dir.evidenceSnippet || 'Autoindex table/listing detected'} su ${dir.url || dir.path}. Web Server: ${dir.server || 'N/A'}. Verifica: ${dir.curlCommand || 'N/A'}`,
        impact: 'Fuga di dati aziendali, file media riservati e backup archiviati nelle directory.',
        confidence: 0.99,
        remediation: {
          action: 'Disabilitare l\'autoindex nel web server (es. "autoindex off;" su Nginx o "Options -Indexes" su Apache).',
          codeSnippet: '# Nginx:\nlocation / {\n    autoindex off;\n}\n\n# Apache (.htaccess):\nOptions -Indexes',
          technicalReference: 'CWE-548: Exposure of Information Through Directory Listing',
        },
        timestamp: now,
      });
    }
  }

  // 3. Port Scan (Servizi di Backend e Database esposti)
  const portsRaw = unwrap<Record<string, unknown> | Array<unknown>>(rawResults['portscan'] || rawResults['ports'] || secObj?.['ports']);
  if (portsRaw) {
    let openPorts: number[] = [];
    if (Array.isArray(portsRaw)) {
      openPorts = (portsRaw as Array<{ port?: number | string; status?: string; open?: boolean }>)
        .filter((p) => p.status === 'open' || p.open)
        .map((p) => Number(p.port));
    } else if (Array.isArray((portsRaw as { openRiskyPorts?: unknown[] }).openRiskyPorts)) {
      openPorts = ((portsRaw as { openRiskyPorts: Array<{ port?: number | string; open?: boolean }> }).openRiskyPorts)
        .filter((p) => p.open !== false)
        .map((p) => Number(p.port));
    } else if (typeof portsRaw === 'object' && 'openPorts' in portsRaw) {
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
  const cors = unwrap<{ misconfigured?: boolean; allowCredentials?: boolean; allowOrigin?: string }>(
    rawResults['cors'] || vulnObj?.['cors']
  );
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
  const cookiesRaw = unwrap<Record<string, unknown> | Array<unknown>>(rawResults['cookies'] || vulnObj?.['cookies']);
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
  const ssl = unwrap<{ valid?: boolean; daysRemaining?: number; validTo?: string }>(
    rawResults['ssl'] || secObj?.['tls']
  );
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

  // 7. Email Posture (DMARC, SPF, DKIM)
  const dmarc = unwrap<{ valid?: boolean; policy?: string; record?: string; multipleRecordsFound?: boolean; records?: string[]; status?: string }>(
    rawResults['dmarc'] || secObj?.['dmarc']
  );
  if (dmarc) {
    if (dmarc.multipleRecordsFound || (dmarc.records && dmarc.records.length > 1)) {
      findings.push({
        id: 'sec-dmarc-duplicate',
        category: 'configuration',
        severity: 'high',
        title: 'Record DMARC Multipli Rilevati (Invalida RFC 7489)',
        description: `Il dominio pubblica ${dmarc.records?.length || 'più di un'} record DMARC TXT nel DNS. Secondo la specifica RFC 7489 Sezione 6.6.3, i mail server trattano questa condizione come assenza totale di DMARC, annullando la protezione anti-spoofing.`,
        evidence: `Record DMARC rilevati: ${dmarc.records?.join(' | ') || dmarc.record}`,
        impact: 'Annullamento completo dell’efficacia della policy DMARC e vulnerabilità a email spoofing verso destinatari conformi RFC.',
        confidence: 0.99,
        remediation: {
          action: 'Rimuovere immediatamente il record DMARC TXT duplicato nel pannello DNS lasciando un’unica policy coerente (es. p=quarantine o p=reject).',
          codeSnippet: '_dmarc.dominio.com. IN TXT "v=DMARC1; p=quarantine; sp=quarantine; pct=100; rua=mailto:dmarc-reports@dominio.com;"',
          technicalReference: 'RFC 7489 Section 6.6.3',
        },
        timestamp: now,
      });
    } else if (dmarc.status === 'fail' || dmarc.valid === false || dmarc.policy === 'none' || dmarc.policy === 'unknown') {
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
  }

  const spf = unwrap<{ valid?: boolean; status?: string; record?: string; reason?: string; multipleRecordsFound?: boolean; records?: string[] }>(
    rawResults['spf'] || secObj?.['spf']
  );
  if (spf) {
    if (spf.multipleRecordsFound || (spf.records && spf.records.length > 1)) {
      findings.push({
        id: 'sec-spf-duplicate',
        category: 'configuration',
        severity: 'high',
        title: 'Record SPF Multipli Rilevati (PermError RFC 7208)',
        description: `Il dominio pubblica ${spf.records?.length || 'più di un'} record SPF TXT. Ai sensi della RFC 7208 Sezione 3.2, un dominio non deve mai pubblicare più di un record SPF, provocando un errore permanente (PermError) sui sistemi di ricezione.`,
        evidence: `Record SPF rilevati: ${spf.records?.join(' | ') || spf.record}`,
        impact: 'Mancata consegna o rifiuto delle email legittime da parte di server riceventi che applicano rigidi controlli SPF.',
        confidence: 0.99,
        remediation: {
          action: 'Unificare tutti i meccanismi SPF autorizzati in un unico record TXT ed eliminare i record duplicati.',
          codeSnippet: 'v=spf1 include:_spf.google.com ~all',
          technicalReference: 'RFC 7208 Section 3.2',
        },
        timestamp: now,
      });
    } else if (spf.valid === false || spf.status === 'fail') {
      findings.push({
        id: 'sec-spf-missing',
        category: 'configuration',
        severity: 'medium',
        title: 'Record SPF Mancante o Invalido',
        description: 'Il dominio non dispone di un record SPF valido per autorizzare gli host mittenti delle email aziendali.',
        evidence: `Stato SPF: ${spf.status || 'fail'}. Record: ${spf.record || 'Non presente'}.`,
        impact: 'Rischio di spoofing email e mancata consegna della posta verso server con controlli restrittivi (DMARC/SPF).',
        confidence: 0.98,
        remediation: {
          action: 'Configurare un record TXT SPF nella zona DNS autorizzando esclusivamente i server di posta legittimi.',
          codeSnippet: 'v=spf1 include:_spf.google.com ~all',
          technicalReference: 'RFC 7208',
        },
        timestamp: now,
      });
    }
  }

  const dkim = unwrap<{ valid?: boolean; status?: string; selector?: string }>(
    rawResults['dkim'] || secObj?.['dkim']
  );
  if (dkim && (dkim.valid === false || dkim.status === 'fail')) {
    findings.push({
      id: 'sec-dkim-missing',
      category: 'configuration',
      severity: 'low',
      title: 'Firma DKIM Non Rilevata o Invalida',
      description: 'Nessun selettore DKIM standard individuato per la convalida crittografica delle email inviate.',
      evidence: `Selettore verificato: ${dkim.selector || 'default/google'}. Validità: ${dkim.valid ? 'Valido' : 'Non trovato'}.`,
      impact: 'I provider di posta riceventi potrebbero penalizzare il punteggio antispam o respingere le email.',
      confidence: 0.85,
      remediation: {
        action: 'Generare la coppia di chiavi DKIM sul mail server/provider e pubblicare la chiave pubblica TXT nel DNS.',
        codeSnippet: 'default._domainkey.dominio.com. IN TXT "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQ..."',
        technicalReference: 'RFC 6376',
      },
      timestamp: now,
    });
  }

  // 7.1 Email Armor: Dangling MX, STARTTLS, DANE
  const armor = unwrap<{
    danglingMx?: { detected?: boolean; count?: number; danglingList?: Array<{ exchange: string; priority: number }> };
    starttls?: { tested?: boolean; mxHost?: string; supportsStarttls?: boolean; cert?: { isExpired?: boolean; daysRemaining?: number } };
    dane?: { enabled?: boolean };
  }>(rawResults['emailArmor'] || secObj?.['emailArmor']);

  if (armor) {
    if (armor.danglingMx?.detected && armor.danglingMx.danglingList && armor.danglingMx.danglingList.length > 0) {
      findings.push({
        id: 'sec-dangling-mx',
        category: 'security',
        severity: 'critical',
        title: 'Record MX Orfano Rilevato (Rischio Dirottamento Posta)',
        description: `Uno o più record MX puntano a host non registrati o non risolti (${armor.danglingMx.danglingList.map(m => m.exchange).join(', ')}). Un attaccante può registrare il dominio di destinazione e intercettare tutte le email in transito.`,
        evidence: `Host MX non risolti: ${armor.danglingMx.danglingList.map(m => m.exchange).join(', ')}`,
        impact: 'Intercettazione totale della corrispondenza email aziendale e reset password tramite email.',
        confidence: 0.99,
        remediation: {
          action: 'Rimuovere immediatamente i record MX orfani o aggiornarli con server di posta attivi.',
          codeSnippet: '# Verifica con dig:\ndig +short MX tuodominio.com',
          technicalReference: 'CWE-673 / RFC 5321',
        },
        timestamp: now,
      });
    }

    if (armor.starttls?.tested && !armor.starttls.supportsStarttls) {
      findings.push({
        id: 'sec-mx-no-starttls',
        category: 'configuration',
        severity: 'medium',
        title: `Mancato Supporto STARTTLS sul Server MX (${armor.starttls.mxHost || 'Primario'})`,
        description: `Il mail server primario accetta posta unicamente in chiaro senza cifratura di trasporto STARTTLS.`,
        evidence: `Connessione SMTP porta 25 verso ${armor.starttls.mxHost}: nessun comando STARTTLS annunciato in EHLO.`,
        impact: 'Comunicazioni email esposte a intercettazione passiva e man-in-the-middle in transito.',
        confidence: 0.95,
        remediation: {
          action: 'Abilitare STARTTLS e configurare un certificato TLS valido sul server SMTP.',
          codeSnippet: '# Postfix (main.cf):\nsmtpd_tls_security_level = may\nsmtpd_tls_cert_file = /etc/ssl/certs/mail.crt',
          technicalReference: 'RFC 3207 / MITRE D3-MHA',
        },
        timestamp: now,
      });
    }

    if (armor.starttls?.cert?.isExpired) {
      findings.push({
        id: 'sec-mx-cert-expired',
        category: 'security',
        severity: 'high',
        title: `Certificato TLS Scaduto sul Server MX (${armor.starttls.mxHost})`,
        description: `Il certificato crittografico configurato sul mail server per STARTTLS è scaduto (${armor.starttls.cert.daysRemaining} giorni fa).`,
        evidence: `Server MX: ${armor.starttls.mxHost}. Stato certificato: Scaduto.`,
        impact: 'I mail server mittenti con MTA-STS o DANE rigoroso rifiuteranno di consegnare email.',
        confidence: 0.99,
        remediation: {
          action: 'Rinnovare e installare tempestivamente il certificato SSL/TLS sul demone SMTP.',
          codeSnippet: 'certbot certonly --standalone -d mail.tuodominio.com',
          technicalReference: 'RFC 8461 (MTA-STS)',
        },
        timestamp: now,
      });
    }
  }

  // 8. Blacklist & Minacce IP (DNSBL / RBL)
  const bl = unwrap<{ isListed?: boolean; listedCount?: number; listedEngines?: string[] }>(
    rawResults['blacklist'] || secObj?.['blacklist']
  );
  if (bl && (bl.isListed || (bl.listedCount !== undefined && bl.listedCount > 0))) {
    findings.push({
      id: 'sec-dnsbl-listed',
      category: 'security',
      severity: 'high',
      title: 'IP o Mail Server Presente in Blacklist DNSBL/RBL',
      description: `L'host o il server MX risulta segnalato in ${bl.listedCount || 'una o più'} liste di reputazione antispam o minacce.`,
      evidence: `RBL engines: ${bl.listedEngines?.join(', ') || 'Elencato su DNSBL'}.`,
      impact: 'Rifiuto immediato delle email inviate da parte di Microsoft 365, Gmail e firewall aziendali.',
      confidence: 0.95,
      remediation: {
        action: 'Rimuovere la causa della compromissione/spam ed effettuare la richiesta di delisting presso gli operatori RBL indicati.',
        technicalReference: 'DNSBL Delisting Procedures',
      },
      timestamp: now,
    });
  }

  // 9. Sonde di Penetration Test Attivo
  const pentestRaw = (rawResults['pentest'] || rawResults['pentestResults']) as { tests?: Array<Record<string, unknown>> } | Array<Record<string, unknown>> | undefined;
  const pentestTests = Array.isArray(pentestRaw) ? pentestRaw : (pentestRaw?.tests || []);
  for (const pt of pentestTests) {
    const outcome = pt.securityOutcome as string | undefined;
    const isFinding = outcome === 'confirmed_finding' || outcome === 'potential_finding' || pt.status === 'fail';
    if (isFinding) {
      const linked = pt.linkedFinding as Record<string, unknown> | undefined;
      const rem = linked?.remediation as Record<string, unknown> | undefined;
      findings.push({
        id: (pt.id || pt.testId || `pentest-${pt.name}`) as string,
        category: (linked?.category || 'security') as FindingCategory,
        severity: (linked?.severity || pt.severity || 'medium') as FindingSeverity,
        title: (linked?.title || pt.name || pt.title || 'Anomalia Rilevata da Probe Attiva') as string,
        description: (linked?.hypothesizedImpact || pt.verdictRationale || pt.description || '') as string,
        evidence: (pt.verdictRationale || JSON.stringify(pt.observations || [])) as string,
        impact: (linked?.demonstratedImpact || linked?.hypothesizedImpact || 'Rischio di esposizione o violazione dei controlli di sicurezza.') as string,
        confidence: pt.confidence === 'high' ? 0.95 : pt.confidence === 'medium' ? 0.75 : 0.6,
        remediation: {
          action: (rem?.conceptualRecommendation || rem?.summary || 'Rivedere configurazione e chiudere la superficie esposta.') as string,
          codeSnippet: (rem?.concreteGuidance || pt.solutionCommand) as string | undefined,
          technicalReference: (pt.methodology as { standardReference?: string } | undefined)?.standardReference || 'OWASP Web Security Testing Guide',
        },
        timestamp: now,
      });
    }
  }

  // 10. Disponibilità e Latenza TTFB
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
