export type FindingCategory = 'availability' | 'configuration' | 'security';

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface FindingRemediation {
  action: string;
  technicalReference?: string;
  codeSnippet?: string;
}

export interface Finding {
  id: string;
  category: FindingCategory;
  severity: FindingSeverity;
  title: string;
  description: string;
  evidence: string;
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

export interface RiskAssessment {
  overallScore: number; // 0 - 100 (100 = postura eccellente)
  grade: SecurityGrade;
  summary: string;
  pillars: Record<FindingCategory, PillarScore>;
  findings: Finding[];
  deductions: {
    rule: string;
    points: number;
    reason: string;
    severity: FindingSeverity;
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
  summary: {
    newVulnerabilities: number;
    resolvedVulnerabilities: number;
    configDrifts: number;
    latencyDeltaMs?: number;
  };
}
