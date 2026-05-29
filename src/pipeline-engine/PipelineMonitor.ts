/**
 * PipelineMonitor.ts - V92 Pipeline Monitor
 * Tracks pipeline execution metrics, history, and status
 */

export type MonitorConfig = {
  historySize: number;
  samplingInterval: number;
  enableAlerts: boolean;
};

export type MonitoringEntry = {
  pipelineId: string;
  timestamp: number;
  duration: number;
  status: 'success' | 'failure' | 'timeout';
  metrics: Record<string, number>;
};

export type MonitorStatus = 'active' | 'inactive' | 'suspended';

export type MonitorSnapshot = {
  metrics: {
    trackedPipelines: number;
    totalEntries: number;
    averageDuration: number;
    currentStatus: MonitorStatus;
  };
  timestamp: number;
};

export class PipelineMonitor {
  config: MonitorConfig;
  private status: MonitorStatus = 'active';
  private trackedPipelines: Set<string> = new Set();
  private history: MonitoringEntry[] = [];
  private totalDuration: number = 0;
  private successCount: number = 0;
  private failureCount: number = 0;

  constructor(config: MonitorConfig) {
    this.config = { ...config };
  }

  track(pipelineId: string): void {
    this.trackedPipelines.add(pipelineId);
  }

  untrack(pipelineId: string): void {
    this.trackedPipelines.delete(pipelineId);
  }

  recordExecution(entry: MonitoringEntry): void {
    this.history.push(entry);
    if (this.config.historySize > 0 && this.history.length > this.config.historySize) {
      this.history.shift();
    }
    this.totalDuration += entry.duration;
    if (entry.status === 'success') this.successCount++;
    else this.failureCount++;
  }

  getMetrics(): {
    trackedPipelines: number;
    totalEntries: number;
    averageDuration: number;
    successRate: number;
  } {
    const total = this.successCount + this.failureCount;
    return {
      trackedPipelines: this.trackedPipelines.size,
      totalEntries: this.history.length,
      averageDuration: this.history.length > 0 ? this.totalDuration / this.history.length : 0,
      successRate: total > 0 ? this.successCount / total : 0,
    };
  }

  getHistory(pipelineId?: string, limit: number = 100): MonitoringEntry[] {
    let filtered = this.history;
    if (pipelineId) {
      filtered = filtered.filter((e) => e.pipelineId === pipelineId);
    }
    return filtered.slice(-limit);
  }

  getStatus(): MonitorStatus {
    return this.status;
  }

  setStatus(status: MonitorStatus): void {
    this.status = status;
  }

  getSnapshot(): MonitorSnapshot {
    const total = this.successCount + this.failureCount;
    return {
      metrics: {
        trackedPipelines: this.trackedPipelines.size,
        totalEntries: this.history.length,
        averageDuration: this.history.length > 0 ? this.totalDuration / this.history.length : 0,
        currentStatus: this.status,
      },
      timestamp: Date.now(),
    };
  }

  reset(): void {
    this.status = 'active';
    this.trackedPipelines.clear();
    this.history = [];
    this.totalDuration = 0;
    this.successCount = 0;
    this.failureCount = 0;
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    const metrics = this.getMetrics();
    const lines = [
      '=== Pipeline Monitor Report ===',
      `Status: ${snapshot.metrics.currentStatus}`,
      `Tracked Pipelines: ${snapshot.metrics.trackedPipelines}`,
      `Total Entries: ${snapshot.metrics.totalEntries}`,
      `Average Duration: ${metrics.averageDuration.toFixed(2)}ms`,
      `Success Rate: ${(metrics.successRate * 100).toFixed(2)}%`,
      `Timestamp: ${new Date(snapshot.timestamp).toISOString()}`,
    ];
    return lines.join('\n');
  }

  exportMetrics(): { version: string } & MonitorSnapshot['metrics'] {
    return {
      version: 'V92',
      ...this.getSnapshot().metrics,
    };
  }
}