/**
 * TARGETED VALIDATION ENGINE
 * Motore di validazione mirata a profondità controllata per verifiche non distruttive.
 * Implementa vincoli rigidi di request budget, concorrenza e condizioni di stop automatiche.
 */

import { NormalizedTarget } from './target-normalizer';
import { EngagementScope, SanitizedEvidence, SecurityOutcome, AssessmentSeverity, AssessmentConfidence } from '@/types/assessment';
import { sanitizeHeaders, extractSafeResponseSnippet } from './evidence-sanitizer';

export interface ValidationBudget {
  maxRequests: number;
  maxDurationMs: number;
  delayBetweenRequestsMs: number;
}

export interface ValidationStopConditions {
  maxLatencyMs: number;
  maxConsecutive5xx: number;
}

export interface TargetedValidationResult {
  validationId: string;
  testName: string;
  target: string;
  prerequisitesMet: boolean;
  securityOutcome: SecurityOutcome;
  severity: AssessmentSeverity | null;
  confidence: AssessmentConfidence | null;
  verdictRationale: string;
  demonstratedImpact?: string;
  hypothesizedImpact?: string;
  evidences: SanitizedEvidence[];
  metrics: {
    requestsSent: number;
    totalDurationMs: number;
    stoppedEarly: boolean;
    stopReason?: string;
  };
}

export class TargetedValidationEngine {
  private scope: EngagementScope | null;
  private defaultBudget: ValidationBudget = {
    maxRequests: 15,
    maxDurationMs: 15000,
    delayBetweenRequestsMs: 300,
  };
  private defaultStopConditions: ValidationStopConditions = {
    maxLatencyMs: 2500,
    maxConsecutive5xx: 2,
  };

  constructor(scope?: EngagementScope | null) {
    this.scope = scope || null;
  }

  /**
   * Helper fetch sicuro con misurazione della latenza e controllo condizioni di arresto
   */
  private async safeExecuteRequest(
    url: string,
    options: RequestInit,
    timeoutMs = 4000
  ): Promise<{ res: Response | null; latencyMs: number; error?: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const start = Date.now();

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': 'NetworkDiag-TargetedValidation/2.0 (+https://aiutiamoci.cloud/diagnostic)',
          ...(options.headers || {}),
        },
      });
      clearTimeout(timeout);
      const latencyMs = Date.now() - start;
      return { res, latencyMs };
    } catch (e: any) {
      clearTimeout(timeout);
      const latencyMs = Date.now() - start;
      return { res: null, latencyMs, error: e.message || 'Errore di connessione' };
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * VALIDAZIONE 1: Content Fingerprinting su Risorse Sensibili
   * Risolve il problema delle SPA (Single Page Application) che restituiscono 200 OK
   * su percorsi come /.env o /backup.sql servendo in realtà index.html.
   */
  public async validateSensitiveResourceExposure(
    target: NormalizedTarget,
    candidatePath: string
  ): Promise<TargetedValidationResult> {
    const startTime = Date.now();
    const evidences: SanitizedEvidence[] = [];
    const fullUrl = `${target.canonicalUrl.replace(/\/$/, '')}${candidatePath}`;

    // 1. Richiesta preliminare baseline (risorsa inesistente per confrontare la risposta catch-all della SPA)
    const baselineUrl = `${target.canonicalUrl.replace(/\/$/, '')}/__diagnostic_probe_not_found_${Date.now().toString(36)}`;
    const { res: baselineRes } = await this.safeExecuteRequest(baselineUrl, { method: 'GET' });
    const baselineBody = baselineRes ? await baselineRes.text().catch(() => '') : '';
    const baselineLength = baselineBody.length;
    const isSpaCatchAll = baselineRes && baselineRes.status === 200;

    await this.sleep(200);

    // 2. Richiesta sulla risorsa candidata
    const { res: probeRes, latencyMs, error } = await this.safeExecuteRequest(fullUrl, { method: 'GET' });

    if (!probeRes) {
      return {
        validationId: `val-sens-file-${candidatePath.replace(/[^a-zA-Z0-9]/g, '_')}`,
        testName: `Validazione Esposizione: ${candidatePath}`,
        target: fullUrl,
        prerequisitesMet: false,
        securityOutcome: 'inconclusive',
        severity: null,
        confidence: null,
        verdictRationale: `Impossibile completare la validazione per errore di rete: ${error || 'Host non responsivo'}.`,
        evidences: [],
        metrics: { requestsSent: 2, totalDurationMs: Date.now() - startTime, stoppedEarly: true, stopReason: error },
      };
    }

    const contentType = probeRes.headers.get('content-type') || '';
    const rawBody = await probeRes.text().catch(() => '');
    const headersObj: Record<string, string> = {};
    probeRes.headers.forEach((v, k) => { headersObj[k] = v; });

    evidences.push({
      requestMethod: 'GET',
      requestUrl: fullUrl,
      responseStatus: probeRes.status,
      responseHeaders: sanitizeHeaders(headersObj),
      responseExtractSnippet: extractSafeResponseSnippet(rawBody, 200),
      timestamp: Date.now(),
    });

    // Se non risponde 200 OK, non c'è esposizione
    if (probeRes.status !== 200) {
      return {
        validationId: `val-sens-file-${candidatePath.replace(/[^a-zA-Z0-9]/g, '_')}`,
        testName: `Validazione Esposizione: ${candidatePath}`,
        target: fullUrl,
        prerequisitesMet: true,
        securityOutcome: 'no_issue_observed',
        severity: null,
        confidence: 'high',
        verdictRationale: `L’endpoint ha risposto con codice HTTP ${probeRes.status} (accesso negato o risorsa inesistente).`,
        evidences,
        metrics: { requestsSent: 2, totalDurationMs: Date.now() - startTime, stoppedEarly: false },
      };
    }

    // Fingerprinting Anti-SPA: se la risposta ha identica lunghezza del catch-all 404
    const isSameAsBaseline = isSpaCatchAll && Math.abs(rawBody.length - baselineLength) < 15;
    const isHtmlResponse = contentType.toLowerCase().includes('text/html');

    // Criteri di firma specifici per estensione
    let isRealExposure = false;
    let signatureMatched = '';

    if (candidatePath.includes('.env')) {
      isRealExposure = !isHtmlResponse && rawBody.includes('=') && (rawBody.includes('DATABASE_') || rawBody.includes('SECRET_') || rawBody.includes('PORT=') || rawBody.includes('NODE_ENV='));
      signatureMatched = 'Variabili d\'ambiente KV in formato plaintext';
    } else if (candidatePath.includes('.git')) {
      isRealExposure = rawBody.includes('ref: refs/') || rawBody.includes('[core]') || rawBody.includes('[remote');
      signatureMatched = 'Header o puntatore repository Git';
    } else if (candidatePath.endsWith('.sql')) {
      isRealExposure = !isHtmlResponse && (rawBody.includes('CREATE TABLE') || rawBody.includes('INSERT INTO') || rawBody.includes('MySQL dump'));
      signatureMatched = 'Istruzioni DDL/DML di database SQL scaricabili';
    } else if (candidatePath.includes('id_rsa')) {
      isRealExposure = rawBody.includes('PRIVATE KEY');
      signatureMatched = 'Blocco chiave crittografica asimmetrica';
    } else {
      isRealExposure = !isSameAsBaseline && (!isHtmlResponse || candidatePath.endsWith('.txt'));
      signatureMatched = 'Risorsa scaricabile con contenuto dedicato';
    }

    if (isSameAsBaseline || (isHtmlResponse && !candidatePath.endsWith('.html') && !isRealExposure)) {
      return {
        validationId: `val-sens-file-${candidatePath.replace(/[^a-zA-Z0-9]/g, '_')}`,
        testName: `Validazione Esposizione: ${candidatePath}`,
        target: fullUrl,
        prerequisitesMet: true,
        securityOutcome: 'no_issue_observed',
        severity: null,
        confidence: 'high',
        verdictRationale: `HTTP 200 OK rilevato, ma identificato come falso positivo SPA (catch-all routing HTML con fingerprint analogo alla rotta 404). Nessuna esposizione reale del file.`,
        evidences,
        metrics: { requestsSent: 2, totalDurationMs: Date.now() - startTime, stoppedEarly: false },
      };
    }

    if (isRealExposure) {
      return {
        validationId: `val-sens-file-${candidatePath.replace(/[^a-zA-Z0-9]/g, '_')}`,
        testName: `Validazione Esposizione: ${candidatePath}`,
        target: fullUrl,
        prerequisitesMet: true,
        securityOutcome: 'confirmed_finding',
        severity: 'critical',
        confidence: 'high',
        verdictRationale: `Confermata esposizione non autorizzata di file sensibile. Firma verificata: ${signatureMatched}.`,
        demonstratedImpact: `Accesso immediato senza credenziali a file riservati (${candidatePath}). Rischio di data breach diretto.`,
        evidences,
        metrics: { requestsSent: 2, totalDurationMs: Date.now() - startTime, stoppedEarly: false },
      };
    }

    return {
      validationId: `val-sens-file-${candidatePath.replace(/[^a-zA-Z0-9]/g, '_')}`,
      testName: `Validazione Esposizione: ${candidatePath}`,
      target: fullUrl,
      prerequisitesMet: true,
      securityOutcome: 'potential_finding',
      severity: 'medium',
      confidence: 'medium',
      verdictRationale: `La risorsa risponde 200 OK con payload differente dalla 404 standard, ma privo di firma nota certa. Richiede revisione manuale.`,
      hypothesizedImpact: 'Potenziale esposizione di endpoint informativo non documentato.',
      evidences,
      metrics: { requestsSent: 2, totalDurationMs: Date.now() - startTime, stoppedEarly: false },
    };
  }

  /**
   * VALIDAZIONE 2: Throttling & Rate Limiting a Cadenza Misurata
   * Esegue una sequenza controllata di 10 richieste cadenzate misurando latenza e header di throttling.
   */
  public async validateRateLimitingBehavior(target: NormalizedTarget): Promise<TargetedValidationResult> {
    const startTime = Date.now();
    const evidences: SanitizedEvidence[] = [];
    const probeUrl = `${target.canonicalUrl.replace(/\/$/, '')}/?_rl_val=${Date.now()}`;
    const budget = 10;
    let hit429 = false;
    let hitRetryAfter: string | null = null;
    let consecutive5xx = 0;
    let stoppedEarly = false;
    let stopReason: string | undefined;

    for (let i = 0; i < budget; i++) {
      const { res, latencyMs, error } = await this.safeExecuteRequest(probeUrl, { method: 'GET' });

      if (!res) {
        stoppedEarly = true;
        stopReason = `Errore di rete al tentativo ${i + 1}: ${error}`;
        break;
      }

      // Condizione di arresto per latenza degradata (> 2500ms)
      if (latencyMs > this.defaultStopConditions.maxLatencyMs) {
        stoppedEarly = true;
        stopReason = `Latenza applicativa degradata (${latencyMs}ms). Arresto cautelativo per tutela delle prestazioni del target.`;
        break;
      }

      // Condizione di arresto per errori 5xx consecutivi
      if (res.status >= 500) {
        consecutive5xx++;
        if (consecutive5xx >= this.defaultStopConditions.maxConsecutive5xx) {
          stoppedEarly = true;
          stopReason = `Rilevati ${consecutive5xx} errori 5xx consecutivi. Arresto cautelativo del test.`;
          break;
        }
      } else {
        consecutive5xx = 0;
      }

      if (res.status === 429) {
        hit429 = true;
        hitRetryAfter = res.headers.get('retry-after');
        evidences.push({
          requestMethod: 'GET',
          requestUrl: probeUrl,
          responseStatus: 429,
          responseHeaders: { 'retry-after': hitRetryAfter || 'N/A' },
          timestamp: Date.now(),
        });
        break;
      }

      // Piccola pausa non distruttiva tra le richieste
      await this.sleep(150);
    }

    if (hit429) {
      return {
        validationId: 'val-rate-limiting',
        testName: 'Validazione Comportamento Rate Limiting L7',
        target: target.canonicalUrl,
        prerequisitesMet: true,
        securityOutcome: 'no_issue_observed',
        severity: null,
        confidence: 'high',
        verdictRationale: `Il server applicativo/WAF ha attivato correttamente la protezione da picchi restituendo HTTP 429 Too Many Requests${hitRetryAfter ? ` con Retry-After: ${hitRetryAfter}` : ''}.`,
        evidences,
        metrics: { requestsSent: evidences.length || 1, totalDurationMs: Date.now() - startTime, stoppedEarly: false },
      };
    }

    return {
      validationId: 'val-rate-limiting',
      testName: 'Validazione Comportamento Rate Limiting L7',
      target: target.canonicalUrl,
      prerequisitesMet: true,
      securityOutcome: 'inconclusive',
      severity: null,
      confidence: 'medium',
      verdictRationale: `Nessuna risposta HTTP 429 registrata nella sequenza controllata di ${budget} richieste (budget conservativo rispettato). Non è possibile dedurre l'assenza di rate limiting per soglie operative più alte senza test distruttivi (non autorizzati).`,
      evidences,
      metrics: { requestsSent: budget, totalDurationMs: Date.now() - startTime, stoppedEarly, stopReason },
    };
  }
}
