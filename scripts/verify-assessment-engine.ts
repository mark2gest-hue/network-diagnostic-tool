import { normalizeTarget } from '../src/lib/target-normalizer';
import { ScopeEngine } from '../src/lib/scope-engine';
import { calculateRiskAssessment } from '../src/lib/risk-engine';
import { EngagementScope } from '../src/types/assessment';
import { Finding } from '../src/types/findings';

async function runVerification() {
  console.log('--- INIZIO VERIFICA MOTORE DI ASSESSMENT & SCOPE ---');
  let passCount = 0;
  let failCount = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passCount++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failCount++;
    }
  }

  // 1. Test Normalizzazione Target
  console.log('\n1. Test Normalizzazione Target:');
  const target1 = await normalizeTarget('https://app.client.com:8443/dashboard?tab=security#top');
  assert(target1.hostname === 'app.client.com', 'Hostname estratto correttamente');
  assert(target1.port === 8443, 'Porta non standard (8443) preservata');
  assert(target1.pathname === '/dashboard', 'Pathname preservato');
  assert(target1.scheme === 'https', 'Schema HTTPS identificato');

  const targetIp = await normalizeTarget('93.184.216.34');
  assert(targetIp.isIp === true, 'Rilevamento IP numerico corretto');
  assert(targetIp.ipVersion === 4, 'Rilevamento IPv4 corretto');

  // 2. Test Scope Engine
  console.log('\n2. Test Scope Engine & Protezioni:');
  const scopeConfig: EngagementScope = {
    committente: 'Azienda Test Srl',
    authorizationReference: 'AUTH-2026-001',
    authorizedPeriod: {
      start: Date.now() - 100000,
      end: Date.now() + 100000,
    },
    includedDomains: ['client.com', 'sub.client.com'],
    includedIps: ['93.184.216.34'],
    includedSubnets: ['192.168.1.0/24'],
    includedUrls: ['https://client.com/app'],
    exclusions: ['internal.client.com', 'cloud-storage.client.com'],
    allowedCategories: ['availability', 'configuration', 'security', 'governance'],
    executionPoint: 'external',
    limits: {
      maxDurationMinutes: 30,
      maxRequestsPerScan: 100,
      maxRequestsPerSecond: 5,
      maxConcurrency: 2,
    },
    operationalContacts: {
      clientContact: 'admin@client.com',
      technicalContact: 'tech@client.com',
      emergencyEmail: 'soc@client.com',
    },
    stopConditions: {
      maxServerLatencyMs: 2000,
      consecutive5xxErrors: 3,
      operatorRequestedStop: false,
    },
  };

  const scopeEngine = new ScopeEngine(scopeConfig);

  const inScopeCheck = scopeEngine.isTargetInScope(target1, 'external');
  assert(!inScopeCheck.inScope, 'Host app.client.com non in lista inclusa rifiutato correttamente');

  const validTarget = await normalizeTarget('https://client.com');
  const validCheck = scopeEngine.isTargetInScope(validTarget, 'external');
  assert(validCheck.inScope, 'Host client.com autorizzato in scope');

  const excludedTarget = await normalizeTarget('https://internal.client.com');
  const excludedCheck = scopeEngine.isTargetInScope(excludedTarget, 'external');
  assert(!excludedCheck.inScope, 'Host escluso internal.client.com bloccato correttamente');

  // Test Redirect Scope Drift
  const redirectDrift = await scopeEngine.isRedirectInScope(validTarget, 'https://cdn.cloudflare.net/login', 'external');
  assert(!redirectDrift.inScope, 'Redirect esterno non autorizzato verso CDN di terzi bloccato');

  const redirectValid = await scopeEngine.isRedirectInScope(validTarget, 'https://client.com/login', 'external');
  assert(redirectValid.inScope, 'Redirect interno consentito');

  // 3. Test Risk Engine & Copertura Esecutiva
  console.log('\n3. Test Risk Engine (Separazione Copertura vs Rischio):');
  const sampleFindings: Finding[] = [
    {
      id: 'f-1',
      category: 'security',
      severity: 'high',
      title: 'CORS permissivo',
      description: 'CORS riflette qualsiasi origin',
      evidence: 'Access-Control-Allow-Origin: *',
      confidence: 0.9,
    },
    {
      id: 'f-gov',
      category: 'governance',
      severity: 'info',
      title: 'Robots.txt non limita crawler AI',
      description: 'Nessuna limitazione GPTBot',
      evidence: 'robots.txt assente',
      confidence: 1.0,
    }
  ];

  const rawModuleResults = {
    dns: { status: 'pass' },
    ssl: { status: 'pass' },
    ttfb: { status: 'pass' },
    portscan: { status: 'error', error: 'Connection refused' },
    http: { status: 'inconclusive' },
  };

  const assessment = calculateRiskAssessment(sampleFindings, rawModuleResults);
  assert(assessment.coverage!.totalModules === 5, 'Conteggio totale moduli corretto (5)');
  assert(assessment.coverage!.completedModules === 3, 'Conteggio moduli completati con successo corretto (3)');
  assert(assessment.coverage!.errorModules === 1, 'Conteggio errori tecnici corretto (1)');
  assert(assessment.coverage!.inconclusiveModules === 1, 'Conteggio moduli inconclusivi corretto (1)');
  assert(assessment.coverage!.coveragePercentage === 60, 'Percentuale di copertura corretta (60%)');
  assert(assessment.deductions.length === 1, 'Solo il finding di sicurezza High ha applicato deduzioni (Governance e errori tecnici neutralizzati)');

  // 4. Test Evidence Sanitizer
  console.log('\n4. Test Evidence Sanitizer (Anonimizzazione Segreti):');
  const { sanitizeString, sanitizeHeaders, extractSafeResponseSnippet } = await import('../src/lib/evidence-sanitizer');
  
  const rawLeakText = 'Error connecting to database with password=super_secret_db_pass_123 and token=sk-abcdef12345678901234567890';
  const sanitizedText = sanitizeString(rawLeakText);
  assert(!sanitizedText.includes('super_secret_db_pass_123'), 'Password sanificata con successo');
  assert(!sanitizedText.includes('sk-abcdef12345678901234567890'), 'Chiave API OpenAI mascherata con successo');
  assert(sanitizedText.includes('[REDACTED_PASSWORD]'), 'Placeholder redaction password inserito');

  const headersSample = {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-IDNxd',
    'Set-Cookie': 'session_id=abc123xyz789secret; Path=/',
    'Content-Type': 'application/json'
  };
  const sanitizedH = sanitizeHeaders(headersSample);
  assert(sanitizedH['Authorization'].includes('[REDACTED_AUTH_HEADER]'), 'Header Authorization oscurato');
  assert(!sanitizedH['Set-Cookie'].includes('abc123xyz789secret'), 'Cookie di sessione oscurato');

  const snippet = extractSafeResponseSnippet('A'.repeat(500), 50);
  assert(snippet.length <= 70 && snippet.includes('[TRUNCATED]'), 'Snippet risposta troncato e formattato entro i limiti');

  // 5. Test Estrazione Dinamica Findings Multi-Modulo
  console.log('\n5. Test Estrazione Dinamica Findings Multi-Modulo:');
  const { extractFindingsFromResults } = await import('../src/lib/risk-engine');
  
  const multiModuleRaw = {
    spf: { valid: false, status: 'fail', record: null },
    dkim: { valid: false, status: 'fail', selector: 'google' },
    dmarc: { valid: true, policy: 'none', record: 'v=DMARC1; p=none;' },
    blacklist: { isListed: true, listedCount: 2, listedEngines: ['Spamhaus ZEN', 'Barracuda'] },
    portscan: [{ port: 3306, status: 'open' }, { port: 80, status: 'open' }],
    pentest: {
      tests: [
        {
          id: 'cors-arbitrary-origin',
          name: 'CORS Reflexive Origin Probe',
          securityOutcome: 'confirmed_finding',
          severity: 'high',
          verdictRationale: 'Origin non autorizzato riflesso con credenziali abilitate.',
          linkedFinding: {
            title: 'CORS Arbitrario Riflesso',
            severity: 'high',
            category: 'security',
            demonstratedImpact: 'Data exfiltration cross-origin su sessioni autenticate.',
            remediation: {
              summary: 'Rimuovere la riflessione dinamica dell’header Origin.',
            }
          }
        }
      ]
    }
  };

  const extracted = extractFindingsFromResults(multiModuleRaw);
  assert(extracted.some(f => f.id === 'sec-spf-missing'), 'Finding SPF estratto correttamente');
  assert(extracted.some(f => f.id === 'sec-dkim-missing'), 'Finding DKIM estratto correttamente');
  assert(extracted.some(f => f.id === 'sec-dmarc-weak'), 'Finding DMARC policy debole estratto correttamente');
  assert(extracted.some(f => f.id === 'sec-dnsbl-listed'), 'Finding Blacklist DNSBL estratto correttamente');
  assert(extracted.some(f => f.id === 'sec-port-exposed-3306' && f.severity === 'critical'), 'Finding Porta DB esposta (3306) con severity critical estratto correttamente');
  assert(extracted.some(f => f.id === 'cors-arbitrary-origin'), 'Finding Penetration Test attivo estratto e collegato correttamente');

  // 6. Test Rilevamento Duplicati DMARC/SPF & Guardrail Moduli Non Eseguiti
  console.log('\n6. Test Rilevamento Duplicati RFC & Guardrail Moduli Non Eseguiti:');
  const duplicateEmailRaw = {
    dmarc: { 
      multipleRecordsFound: true, 
      records: ['v=DMARC1; p=quarantine;', 'v=DMARC1; p=none;'] 
    },
    spf: { 
      multipleRecordsFound: true, 
      records: ['v=spf1 include:_spf.google.com ~all', 'v=spf1 mx ~all'] 
    },
    http: {
      headers: {
        'server': 'nginx/1.24.0 (Ubuntu)',
        'x-powered-by': 'Next.js',
        'strict-transport-security': 'max-age=31536000; includeSubDomains; preload'
        // content-security-policy mancante intenzionalmente
      }
    }
  };

  const dupExtracted = extractFindingsFromResults(duplicateEmailRaw);
  assert(dupExtracted.some(f => f.id === 'sec-dmarc-duplicate' && f.severity === 'high'), 'Rilevato record DMARC duplicato (violazione RFC 7489)');
  assert(dupExtracted.some(f => f.id === 'sec-spf-duplicate' && f.severity === 'high'), 'Rilevato record SPF duplicato (PermError RFC 7208)');
  assert(dupExtracted.some(f => f.id === 'sec-csp-missing'), 'Rilevata assenza di CSP direttamente dall’header HTTP');
  assert(dupExtracted.some(f => f.id === 'sec-info-server-version'), 'Rilevata Information Disclosure su versione server esatta');
  assert(dupExtracted.some(f => f.id === 'sec-info-powered-by'), 'Rilevata Information Disclosure su X-Powered-By');

  // Test Guardrail: se i moduli di sicurezza non sono stati eseguiti, lo score non può essere 100/100
  const onlyNetworkRaw = {
    dns: { status: 'pass' },
    ping: { status: 'pass' },
    ttfb: { status: 'pass' },
    whois: { status: 'pass' },
  };
  const unassessedAssessment = calculateRiskAssessment([], onlyNetworkRaw);
  assert(unassessedAssessment.overallScore <= 60, 'Punteggio bloccato a <= 60 in assenza di test di sicurezza eseguiti');
  assert(unassessedAssessment.grade === 'C', 'Grado declassato a C in assenza di test di sicurezza');
  assert(unassessedAssessment.coverage?.isCoverageSufficient === false, 'Copertura dichiarata insufficiente se i moduli di sicurezza sono assenti');
  assert(Boolean(unassessedAssessment.coverage?.caveatNotes), 'Nota di avviso metodologico presente nel report');

  console.log('\n--- RIEPILOGO TEST ---');
  console.log(`Totale passati: ${passCount} | Totale falliti: ${failCount}`);
  if (failCount > 0) {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error('Errore durante i test di verifica:', err);
  process.exit(1);
});
