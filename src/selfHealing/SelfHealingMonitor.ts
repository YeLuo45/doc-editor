/**
 * SelfHealingMonitor - Monitors document health and triggers repairs
 * Implements continuous monitoring → detection → correction cycle
 */

import type {
  HealthStatus,
  HealthMetric,
  DocumentIssue,
  MonitorConfig,
  MonitorEvent,
  HealthLevel,
  IssueSeverity,
} from './types';

type HealthChangeHandler = (status: HealthStatus, prev: HealthStatus) => void;
type IssueDetectedHandler = (issue: DocumentIssue) => void;
type RepairTriggeredHandler = (issue: DocumentIssue) => void;

const DEFAULT_CONFIG: MonitorConfig = {
  checkIntervalMs: 5000,
  healthScoreThresholds: { healthy: 70, degraded: 40 },
  maxIssuesTracked: 100,
  autoRepairEnabled: true,
};

export class SelfHealingMonitor {
  private config: MonitorConfig;
  private status: HealthStatus;
  private issues: DocumentIssue[] = [];
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private listeners: {
    healthChange: HealthChangeHandler[];
    issueDetected: IssueDetectedHandler[];
    repairTriggered: RepairTriggeredHandler[];
  } = {
    healthChange: [],
    issueDetected: [],
    repairTriggered: [],
  };
  private startTime: number = Date.now();
  private lastCheckTime: number = Date.now();

  constructor(config: Partial<MonitorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.status = this.createInitialStatus();
  }

  private createInitialStatus(): HealthStatus {
    return {
      overall: 'healthy',
      score: 100,
      metrics: [],
      activeIssues: 0,
      resolvedToday: 0,
      lastRepairAt: null,
      uptimeSeconds: 0,
    };
  }

  // ---- Lifecycle ----

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.startTime = Date.now();
    this.lastCheckTime = Date.now();
    this.intervalId = setInterval(() => this.healthCheck(), this.config.checkIntervalMs);
    this.emit('monitor_start', { timestamp: Date.now() });
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.emit('monitor_stop', { timestamp: Date.now() });
  }

  isActive(): boolean {
    return this.isRunning;
  }

  // ---- Event Listeners ----

  onHealthChange(handler: HealthChangeHandler): () => void {
    this.listeners.healthChange.push(handler);
    return () => {
      this.listeners.healthChange = this.listeners.healthChange.filter((h) => h !== handler);
    };
  }

  onIssueDetected(handler: IssueDetectedHandler): () => void {
    this.listeners.issueDetected.push(handler);
    return () => {
      this.listeners.issueDetected = this.listeners.issueDetected.filter((h) => h !== handler);
    };
  }

  onRepairTriggered(handler: RepairTriggeredHandler): () => void {
    this.listeners.repairTriggered.push(handler);
    return () => {
      this.listeners.repairTriggered = this.listeners.repairTriggered.filter((h) => h !== handler);
    };
  }

  // ---- Status ----

  getStatus(): Readonly<HealthStatus> {
    return { ...this.status };
  }

  getActiveIssues(): DocumentIssue[] {
    return [...this.issues];
  }

  getMetrics(): HealthMetric[] {
    return [...this.status.metrics];
  }

  // ---- Issue Management ----

  detectIssue(issue: Omit<DocumentIssue, 'id' | 'detectedAt'>): DocumentIssue {
    const fullIssue: DocumentIssue = {
      ...issue,
      id: `issue-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      detectedAt: Date.now(),
    };

    if (this.issues.length >= this.config.maxIssuesTracked) {
      this.issues = this.issues.slice(-this.config.maxIssuesTracked + 1);
    }

    this.issues.push(fullIssue);
    this.updateHealthScore();
    this.notifyHealthChange();
    this.listeners.issueDetected.forEach((h) => h(fullIssue));
    this.emit('issue_detected', fullIssue);

    if (this.config.autoRepairEnabled && issue.severity !== 'low') {
      this.listeners.repairTriggered.forEach((h) => h(fullIssue));
      this.emit('repair_triggered', fullIssue);
    }

    return fullIssue;
  }

  resolveIssue(issueId: string, success = true): void {
    this.issues = this.issues.filter((i) => i.id !== issueId);
    this.updateHealthScore();
    this.notifyHealthChange();
    if (success) {
      this.status = {
        ...this.status,
        resolvedToday: this.status.resolvedToday + 1,
        lastRepairAt: Date.now(),
      };
    }
  }

  getIssue(issueId: string): DocumentIssue | undefined {
    return this.issues.find((i) => i.id === issueId);
  }

  clearResolvedIssues(): void {
    this.issues = [];
    this.updateHealthScore();
  }

  // ---- Metrics ----

  recordMetric(name: string, value: number, threshold: number): void {
    const metric: HealthMetric = {
      name,
      value,
      threshold,
      timestamp: Date.now(),
    };

    const existing = this.status.metrics.findIndex((m) => m.name === name);
    if (existing >= 0) {
      this.status.metrics[existing] = metric;
    } else {
      this.status.metrics.push(metric);
    }

    this.updateHealthScore();
    this.notifyHealthChange();
  }

  // ---- Health Check ----

  private healthCheck(): void {
    this.lastCheckTime = Date.now();
    this.status = {
      ...this.status,
      uptimeSeconds: Math.floor((this.lastCheckTime - this.startTime) / 1000),
    };
    this.updateHealthScore();
    this.notifyHealthChange();
  }

  private updateHealthScore(): void {
    const metricsScore = this.calculateMetricsScore();
    const issuesScore = this.calculateIssuesScore();
    const score = Math.round((metricsScore * 0.6 + issuesScore * 0.4));

    let overall: HealthLevel = 'healthy';
    if (score < this.config.healthScoreThresholds.degraded) {
      overall = 'critical';
    } else if (score < this.config.healthScoreThresholds.healthy) {
      overall = 'degraded';
    }

    this.status = {
      ...this.status,
      score,
      overall,
      activeIssues: this.issues.length,
    };
  }

  private calculateMetricsScore(): number {
    if (this.status.metrics.length === 0) return 100;
    let totalHealth = 0;
    for (const metric of this.status.metrics) {
      const health = metric.value <= metric.threshold ? 100 :
        Math.max(0, 100 - ((metric.value - metric.threshold) / metric.threshold) * 100);
      totalHealth += health;
    }
    return totalHealth / this.status.metrics.length;
  }

  private calculateIssuesScore(): number {
    if (this.issues.length === 0) return 100;
    const severityWeights: Record<IssueSeverity, number> = {
      low: 5,
      medium: 15,
      high: 30,
      critical: 50,
    };
    let totalPenalty = 0;
    for (const issue of this.issues) {
      totalPenalty += severityWeights[issue.severity] ?? 10;
    }
    return Math.max(0, 100 - totalPenalty);
  }

  private notifyHealthChange(): void {
    const prev = this._prevStatus ?? this.createInitialStatus();
    this._prevStatus = { ...this.status };
    this.listeners.healthChange.forEach((h) => h(this.status, prev));
    this.emit('health_changed', { status: this.status });
  }

  private _prevStatus: HealthStatus | null = null;

  private emit(_type: MonitorEvent['type'], _data: unknown): void {
    // stub for extensibility
  }

  // ---- Snapshot for tests ----

  _snapshot(): {
    isRunning: boolean;
    issuesCount: number;
    config: MonitorConfig;
  } {
    return {
      isRunning: this.isRunning,
      issuesCount: this.issues.length,
      config: { ...this.config },
    };
  }
}

// ============================================================
// Utility functions
// ============================================================

export function calculateHealthLevel(score: number): HealthLevel {
  if (score >= 70) return 'healthy';
  if (score >= 40) return 'degraded';
  return 'critical';
}

export function severityFromScore(score: number): IssueSeverity {
  if (score >= 80) return 'low';
  if (score >= 60) return 'medium';
  if (score >= 30) return 'high';
  return 'critical';
}

export function createMonitor(config?: Partial<MonitorConfig>): SelfHealingMonitor {
  return new SelfHealingMonitor(config);
}