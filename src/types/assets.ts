export type AssetEnvironment = 'production' | 'staging' | 'development' | 'testing';

export type AssetCriticality = 'critical' | 'high' | 'medium' | 'low';

export interface Asset {
  id: string;
  name: string;
  target: string; // domain or IP
  environment: AssetEnvironment;
  criticality: AssetCriticality;
  owner?: string;
  tags?: string[];
  notes?: string;
  created_at: string;
  last_scan_score?: number;
  last_scan_grade?: string;
  last_scan_at?: string;
}

export type FindingStatusType = 'open' | 'in_analysis' | 'accepted_risk' | 'false_positive' | 'resolved';

export interface FindingStatusRecord {
  id: string;
  findingId: string;
  target: string;
  status: FindingStatusType;
  notes?: string;
  updatedBy?: string;
  updatedAt: string;
}

export type WebhookProvider = 'slack' | 'discord' | 'teams' | 'generic';

export interface WebhookConfig {
  id: string;
  name: string;
  provider: WebhookProvider;
  url: string;
  enabled: boolean;
  alertOnCritical: boolean;
  alertOnDrift: boolean;
  created_at: string;
}
