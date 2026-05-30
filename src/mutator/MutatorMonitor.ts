/**
 * V121 MutatorMonitor Module
 * Monitors mutation execution and collects metrics
 */

import { ExecutorStats, ExecutionResult } from './MutatorExecutor';
import { MutatorStats } from './Mutator';

export type MonitorConfig = {
  interval: number;
  historySize: number;
  enableAlerts: boolean;
};

export type MonitorMetrics = {
  timestamp: number;
  totalTracked: number;
  successRate: number;
  averageDuration: number;
};

export type MonitorStatus = 'idle' | 'monitoring' | 'paused' | 'error';

export class MutatorMonitor {
  private config: MonitorConfig;
  private status: MonitorStatus = 'idle';
  private metricsHistory: MonitorMetrics[] = [];
  private currentTracked = 0;
  private totalSuccessful = 0;
  private totalFailed = 0;

  constructor(config: MonitorConfig) {
    this.config = { ...config };
  }

  get config(): MonitorConfig {
    return { ...this.config };
  }

  track(result: ExecutionResult): void {
    this.currentTracked++;
    if (result.result.success) {
      this.totalSuccessful++;
    } else {
      this.totalFailed++;
    }

    if (this.metricsHistory.length >= this.config.historySize) {
      this.metricsHistory.shift();
    }

    const metrics = this.getCurrentMetrics();
    this.metricsHistory.push(metrics);

    if (this.status === 'idle') {
      this.status = 'monitoring';
    }
  }

  getMetrics(): MonitorMetrics {
    return this.getCurrentMetrics();
  }

  private getCurrentMetrics(): MonitorMetrics {
    const total = this.totalSuccessful + this.totalFailed;
    return {
      timestamp: Date.now(),
      totalTracked: this.currentTracked,
      successRate: total > 0 ? this.totalSuccessful / total : 0,
      averageDuration: 0,
    };
  }

  getHistory(): MonitorMetrics[] {
    return [...this.metricsHistory];
  }

  getStatus(): MonitorStatus {
    return this.status;
  }

  pause(): void {
    this.status = 'paused';
  }

  resume(): void {
    this.status = 'monitoring';
  }

  reset(): void {
    this.status = 'idle';
    this.metricsHistory = [];
    this.currentTracked = 0;
    this.totalSuccessful = 0;
    this.totalFailed = 0;
  }

  getSnapshot(): { metrics: MonitorMetrics[]; status: MonitorStatus; config: MonitorConfig } {
    return {
      metrics: this.getHistory(),
      status: this.getStatus(),
      config: this.config,
    };
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    const latest = snapshot.metrics[snapshot.metrics.length - 1];
    return `MutatorMonitor Report:
  Status: ${snapshot.status}
  Total Tracked: ${latest?.totalTracked || 0}
  Success Rate: ${((latest?.successRate || 0) * 100).toFixed(2)}%
  History Size: ${snapshot.metrics.length}/${snapshot.config.historySize}`;
  }

  exportMetrics(): { version: string; metrics: MonitorMetrics[]; status: MonitorStatus } {
    return {
      version: '1.2.1',
      metrics: this.getHistory(),
      status: this.getStatus(),
    };
  }

  updateFromExecutorStats(stats: ExecutorStats): void {
    this.currentTracked = stats.totalExecutions;
    this.totalSuccessful = stats.successfulExecutions;
    this.totalFailed = stats.failedExecutions;
  }

  updateFromMutatorStats(stats: MutatorStats): void {
    this.currentTracked += stats.totalMutations;
    this.totalSuccessful += stats.successfulMutations;
    this.totalFailed += stats.failedMutations;
  }
}