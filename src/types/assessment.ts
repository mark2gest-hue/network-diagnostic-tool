/**
 * MODELLO UNIFICATO DEI RISULTATI DI ASSESSMENT & VERIFICA
 * Conforme ai requisiti di rigore metodologico, tracciabilità delle evidenze
 * e separazione tra stato di esecuzione ed esito di sicurezza.
 */

export type ExecutionPoint = 'external' | 'internal_lan';

export type ExecutionStatus = 
  | 'completed'
  | 'error'
  | 'skipped'
  | 'not_run';

export type SecurityOutcome =
  | 'no_issue_observed'
  | 'potential_finding'
  | 'confirmed_finding'
  | 'inconclusive'
  | 'not_applicable'
  | 'not_assessed';

export type AssessmentSeverity =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'informational';

export type AssessmentConfidence =
  | 'high'
  | 'medium'
  | 'low';

export type FindingLifecycleStatus =
  | 'potential'
  | 'confirmed'
  | 'dismissed'
  | 'resolved';

export type TechnicalReviewStatus =
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'needs_evidence';

export interface StructuredObservation {
  name: string;
  value: string | number | boolean | null;
  unit?: string;
  interpretation?: string;
}

export interface SanitizedEvidence {
  requestMethod?: string;
  requestUrl?: string;
  requestHeaders?: Record<string, string>;
  destinationIp?: string;
  destinationPort?: number;
  responseStatus?: number;
  responseHeaders?: Record<string, string>;
  responseExtractSnippet?: string; // Limitato e sanificato da credenziali/token/PII
  technicalErrorSanitized?: string;
  timestamp: number;
}

export interface VerificationMethodology {
  methodId: string;
  name: string;
  description: string;
  standardReference?: string; // Es. RFC 7230, OWASP Top 10, NIST SP 800-115
  isDestructive: false; // Vincolo rigido di non distruttività
  passiveOnly: boolean;
}

export interface AssessmentFinding {
  findingId: string;
  title: string;
  category: 'availability' | 'configuration' | 'security' | 'governance';
  asset: string;
  affectedEndpoint?: string;
  lifecycleStatus: FindingLifecycleStatus;
  
  // Gravità e confidenza motivate (mai fallback su critical)
  severity: AssessmentSeverity;
  severityRationale: string;
  confidence: AssessmentConfidence;
  confidenceRationale: string;

  // Distinzione tra impatto provato e impatto teorico
  demonstratedImpact?: string;
  hypothesizedImpact?: string;

  // Evidenze e provenienza
  evidences: SanitizedEvidence[];
  ruleId: string;
  ruleVersion: string;
  cweId?: string;
  owaspId?: string;
  mitreD3fendId?: string;

  // Remediation contestualizzata
  remediation: {
    summary: string;
    affectedComponent: string;
    responsibleParty: 'client_admin' | 'it_technician' | 'hosting_provider' | 'developer';
    prerequisites?: string[];
    conceptualRecommendation: string;
    concreteGuidance?: string;
    verificationCriteria: string;
  };

  // Revisione tecnica umana e retest
  review: {
    status: TechnicalReviewStatus;
    reviewedBy?: string;
    reviewedAt?: number;
    reviewNotes?: string;
  };
  retest?: {
    lastRetestedAt: number;
    result: 'resolved' | 'still_vulnerable' | 'inconclusive';
    notes?: string;
  };
}

export interface TestExecutionRecord {
  testId: string;
  ruleVersion: string;
  scanId: string;
  
  // Target effettivo e scope
  originalTarget: string;
  verifiedResource: string;
  resolvedIp?: string;
  executionPoint: ExecutionPoint;

  timestamp: number;
  durationMs: number;

  methodology: VerificationMethodology;
  conditionsAndLimits: {
    timeoutMs: number;
    requestBudget: number;
    actualRequestsSent: number;
    rateLimitReached?: boolean;
    concurrencyUsed: number;
  };

  executionStatus: ExecutionStatus;
  securityOutcome: SecurityOutcome;
  
  // Gravità e confidenza possono essere null se il test è non applicabile, non valutabile o in errore
  severity: AssessmentSeverity | null;
  confidence: AssessmentConfidence | null;

  verdictRationale: string;
  coverageDeclaration: {
    scopeCovered: string;
    limitations: string[];
    unassessedAspects: string[];
  };

  observations: StructuredObservation[];
  evidences: SanitizedEvidence[];

  // Eventuale finding collegato (solo se securityOutcome è potential_finding o confirmed_finding)
  linkedFinding?: AssessmentFinding;
}

export interface EngagementScope {
  committente: string;
  authorizationReference: string;
  authorizedPeriod: {
    start: number;
    end: number;
  };
  includedDomains: string[];
  includedIps: string[];
  includedSubnets: string[];
  includedUrls: string[];
  exclusions: string[];
  allowedCategories: Array<'availability' | 'configuration' | 'security' | 'governance'>;
  executionPoint: ExecutionPoint;
  limits: {
    maxDurationMinutes: number;
    maxRequestsPerScan: number;
    maxRequestsPerSecond: number;
    maxConcurrency: number;
  };
  operationalContacts: {
    clientContact: string;
    technicalContact: string;
    emergencyEmail: string;
  };
  stopConditions: {
    maxServerLatencyMs: number;
    consecutive5xxErrors: number;
    operatorRequestedStop: boolean;
  };
}
