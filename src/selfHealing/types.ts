// ============================================================
// Self-Healing Engine Types
// ============================================================

export type HealthLevel = 'healthy' | 'degraded' | 'critical';
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IssueStatus = 'detected' | 'diagnosed' | 'fixing' | 'verified' | 'resolved' | 'failed';
export type RepairPhase = 'detect' | 'diagnose' | 'fix' | 'verify' | 'commit';

export interface HealthMetric {
  name: string;
  value: number;
  threshold: number;
  timestamp: number;
}

export interface DocumentIssue {
  id: string;
  type: string;
  severity: IssueSeverity;
  description: string;
  detectedAt: number;
  sourceLocation?: string;
  stackTrace?: string;
  metadata?: Record<string, unknown>;
}

export interface IssuePattern {
  id: string;
  pattern: string;
  frequency: number;
  lastOccurrence: number;
  fixRuleId?: string;
  description: string;
}

export interface FixRule {
  id: string;
  issuePattern: string;
  fixAction: FixAction;
  confidence: number;
  createdAt: number;
  lastUsed?: number;
  successCount: number;
  failureCount: number;
}

export interface FixAction {
  type: 'patch' | 'replace' | 'revert' | 'rebuild' | 'restart';
  target?: string;
  payload?: unknown;
  rollback?: FixAction;
}

export interface RepairResult {
  issueId: string;
  success: boolean;
  phasesCompleted: RepairPhase[];
  fixApplied?: FixAction;
  verificationPassed?: boolean;
  error?: string;
  duration: number;
  timestamp: number;
}

export interface HealthStatus {
  overall: HealthLevel;
  score: number; // 0-100
  metrics: HealthMetric[];
  activeIssues: number;
  resolvedToday: number;
  lastRepairAt: number | null;
  uptimeSeconds: number;
}

export interface RepairPipelineState {
  currentPhase: RepairPhase;
  isRunning: boolean;
  currentIssueId: string | null;
  progress: number; // 0-100
  startedAt: number | null;
  completedAt: number | null;
}

// ============================================================
// SelfHealingMonitor Types
// ============================================================

export interface MonitorConfig {
  checkIntervalMs: number;
  healthScoreThresholds: {
    healthy: number;
    degraded: number;
  };
  maxIssuesTracked: number;
  autoRepairEnabled: boolean;
}

export interface MonitorEvent {
  type: 'issue_detected' | 'health_changed' | 'repair_triggered' | 'monitor_start' | 'monitor_stop';
  timestamp: number;
  data: unknown;
}

// ============================================================
// RootCauseAnalyzer Types
// ============================================================

export interface AnalysisResult {
  rootCauses: string[];
  confidence: number;
  suggestedFix?: FixAction;
  relatedPatterns: string[];
}

export interface PatternMatch {
  pattern: IssuePattern;
  matchScore: number;
  matchedFields: string[];
}

// ============================================================
// AutoFixExecutor Types
// ============================================================

export interface FixGoal {
  issueId: string;
  issueType: string;
  target: string;
  priority: IssueSeverity;
  constraints?: Record<string, unknown>;
}

export interface ExecutionPlan {
  goal: FixGoal;
  steps: FixStep[];
  estimatedDuration: number;
  rollbackPlan?: FixStep[];
}

export interface FixStep {
  id: string;
  action: FixAction;
  preConditions?: () => boolean | Promise<boolean>;
  postConditions?: () => boolean | Promise<boolean>;
  onFailure?: 'abort' | 'rollback' | 'continue';
}

export interface ExecutionResult {
  success: boolean;
  stepsExecuted: number;
  totalSteps: number;
  results: StepResult[];
  error?: string;
}

export interface StepResult {
  stepId: string;
  success: boolean;
  output?: unknown;
  error?: string;
  duration: number;
}

// ============================================================
// HealthStatusPanel Types
// ============================================================

export interface PanelMetrics {
  healthScore: number;
  issuesActive: number;
  issuesResolved: number;
  repairHistory: RepairResult[];
  systemUptime: number;
}