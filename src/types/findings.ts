export type FindingCategory = 'availability' | 'configuration' | 'security';

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type FindingStatus = 'open' | 'confirmed' | 'risk_accepted' | 'false_positive';

export interface TechnicalEvidence {
  host: string;
  port?: number | string;
  protocol?: string;
  engine: string;
  rawEvidence: string;
  confidencePercentage: number;
  firstSeen: string;
  lastVerified: string;
  httpStatus?: number;
  resolvedIp?: string;
}

export interface StructuredRemediation {
  problem: string;
  risk: string;
  immediateActions: string[];
  verification: string;
  codeSnippet?: string;
}

export interface FindingRemediation {
  action: string;
  technicalReference?: string;
  codeSnippet?: string;
  structured?: StructuredRemediation;
}

export interface Finding {
  id: string;
  category: FindingCategory;
  severity: FindingSeverity;
  status?: FindingStatus;
  title: string;
  description: string;
  evidence: string;
  technicalEvidence?: TechnicalEvidence;
  impact?: string;
  confidence: number; // 0.0 to 1.0
  remediation?: FindingRemediation;
  timestamp?: number;
}

export interface PillarScore {
  category: FindingCategory;
  score: number; // 0 - 100 (100 = perfetto)
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
}

export type SecurityGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface ScoreBreakdown {
  exposureScore: number; // 0 - 100 (50% peso: porte aperte, leak, vulnerabilità)
  postureScore: number;  // 0 - 100 (30% peso: crittografia TLS, CAA, HSTS, Cookie)
  operationalScore: number; // 0 - 100 (20% peso: TTFB, latenza DNS, SLA)
  formulaExplanation: string;
}

export interface RiskAssessment {
  overallScore: number; // 0 - 100 (100 = postura eccellente)
  grade: SecurityGrade;
  summary: string;
  breakdown: ScoreBreakdown;
  pillars: Record<FindingCategory, PillarScore>;
  findings: Finding[];
  deductions: {
    rule: string;
    points: number;
    reason: string;
    severity: FindingSeverity;
    findingId?: string;
  }[];
}

export interface ScanSnapshot {
  target: string;
  timestamp: string;
  results: Record<string, unknown>;
  findings: Finding[];
  riskScore: number;
  grade: SecurityGrade;
}

export type DiffChangeType = 'added' | 'removed' | 'changed' | 'degraded' | 'improved' | 'unchanged';

export interface FindingDiff {
  id: string;
  category: FindingCategory;
  changeType: DiffChangeType;
  title: string;
  previousEvidence?: string;
  currentEvidence?: string;
  severity: FindingSeverity;
  description: string;
  technicalEvidence?: TechnicalEvidence;
}

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  category: FindingCategory;
  classification: 'new' | 'modified' | 'resolved' | 'recurring' | 'ignored';
  description: string;
  severity: FindingSeverity;
  evidence?: string;
}

export interface ScanDiffResult {
  target: string;
  previousTimestamp: string;
  currentTimestamp: string;
  previousScore: number;
  currentScore: number;
  scoreDelta: number;
  previousGrade: SecurityGrade;
  currentGrade: SecurityGrade;
  changes: FindingDiff[];
  timeline?: TimelineEvent[];
  summary: {
    newVulnerabilities: number;
    resolvedVulnerabilities: number;
    configDrifts: number;
    latencyDeltaMs?: number;
  };
}

