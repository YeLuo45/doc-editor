/**
 * V134 Analyzer Monitor - Monitors analyzer performance and health
 * Tracks metrics, maintains history, and provides status reporting
 */

export type MonitorConfig = {
  maxHistorySize: number;
  metricsInterval: number;
  healthCheckEnabled: boolean;
};

export interface MetricEntry {
  timestamp: number;
  analyzerName: string;
  metricType: string;
  value: number;
}

export interface HealthStatus {
  healthy: boolean;
  lastCheck: number;
  issues: string[];
}

export interface MonitorSnapshot {
  timestamp: number;
  config: MonitorConfig;
  stats: {
    totalTracked: number;
    activeAnalyzers: number;
    metricsCount: number;
  };
}

export class AnalyzerMonitor {
  public config: MonitorConfig;
  private metricsHistory: MetricEntry[] = [];
  private activeAnalyzers: Set<string> = new Set();
  private stats = {
    totalTracked: 0,
    activeAnalyzers: 0,
    metricsCount: 0,
  };
  private healthStatus: HealthStatus = {
    healthy: true,
    lastCheck: Date.now(),
    issues: [],
  };

  constructor(config: MonitorConfig) {
    this.config = { ...config };
  }

  track(analyzerName: string, metricType: string, value: number): void {
    this.metricsHistory.push({
      timestamp: Date.now(),
      analyzerName,
      metricType,
      value,
    });

    this.activeAnalyzers.add(analyzerName);
    this.stats.totalTracked++;
    this.stats.metricsCount = this.metricsHistory.length;
    this.stats.activeAnalyzers = this.activeAnalyzers.size;

    if (this.metricsHistory.length > this.config.maxHistorySize) {
      this.metricsHistory.shift();
    }
  }

  getMetrics(analyzerName?: string): MetricEntry[] {
    if (analyzerName) {
      return this.metricsHistory.filter((m) => m.analyzerName === analyzerName);
    }
    return [...this.metricsHistory];
  }

  getHistory(): MetricEntry[] {
    return [...this.metricsHistory];
  }

  getStatus(): HealthStatus {
    if (this.config.healthCheckEnabled) {
      this.healthStatus.lastCheck = Date.now();
      this.healthStatus.issues = [];

      if (this.metricsHistory.length === 0) {
        this.healthStatus.issues.push('No metrics recorded');
      }

      const staleThreshold = Date.now() - 60000;
      const hasRecentMetrics = this.metricsHistory.some((m) => m.timestamp > staleThreshold);
      if (!hasRecentMetrics && this.metricsHistory.length > 0) {
        this.healthStatus.issues.push('No recent metrics activity');
      }

      this.healthStatus.healthy = this.healthStatus.issues.length === 0;
    }

    return { ...this.healthStatus };
  }

  getSnapshot(): MonitorSnapshot {
    return {
      timestamp: Date.now(),
      config: { ...this.config },
      stats: {
        totalTracked: this.stats.totalTracked,
        activeAnalyzers: this.activeAnalyzers.size,
        metricsCount: this.metricsHistory.length,
      },
    };
  }

  reset(): void {
    this.metricsHistory = [];
    this.activeAnalyzers.clear();
    this.stats.totalTracked = 0;
    this.stats.activeAnalyzers = 0;
    this.stats.metricsCount = 0;
    this.healthStatus = {
      healthy: true,
      lastCheck: Date.now(),
      issues: [],
    };
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    const status = this.getStatus();
    return JSON.stringify({
      version: 'V134',
      timestamp: snapshot.timestamp,
      config: snapshot.config,
      stats: snapshot.stats,
      health: status,
      recentMetrics: this.metricsHistory.slice(-20),
    }, null, 2);
  }

  exportMetrics(): { version: string; stats: object } {
    return {
      version: 'V134',
      stats: {
        ...this.stats,
        activeAnalyzers: Array.from(this.activeAnalyzers),
        historySize: this.metricsHistory.length,
      },
    };
  }
}