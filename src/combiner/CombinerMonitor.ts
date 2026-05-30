/**
 * V113 CombinerMonitor Module
 * Monitoring and metrics tracking for combiner operations
 */

import { CombinerExecutor, ExecutionResult } from './CombinerExecutor';
import { CombinerRegistry } from './CombinerRegistry';

export type MonitorConfig = {
  id: string;
  version: string;
  interval?: number;
  maxHistory?: number;
  alerting?: boolean;
};

export type MetricPoint = {
  timestamp: number;
  value: number;
  label: string;
};

export type MonitorMetrics = {
  totalTracks: number;
  avgExecutionTime: number;
  successRate: number;
  failureRate: number;
  totalItems: number;
};

export type MonitorStatus = 'idle' | 'active' | 'paused' | 'error';

export class CombinerMonitor {
  readonly config: MonitorConfig;
  private registry: CombinerRegistry;
  private executor: CombinerExecutor;
  private history: MetricPoint[] = [];
  private status: MonitorStatus = 'idle';
  private trackCount = 0;

  constructor(config: MonitorConfig, registry: CombinerRegistry, executor: CombinerExecutor) {
    this.config = { ...config };
    this.registry = registry;
    this.executor = executor;
  }

  /**
   * Track execution results
   */
  track(result: ExecutionResult): void {
    this.trackCount++;
    this.status = 'active';
    const point: MetricPoint = {
      timestamp: Date.now(),
      value: result.success ? 1 : 0,
      label: `execution_${result.combinerId}`,
    };
    this.history.push(point);
    if (this.config.maxHistory && this.history.length > this.config.maxHistory) {
      this.history = this.history.slice(-this.config.maxHistory);
    }
    if (this.history.length === 0) {
      this.status = 'idle';
    }
  }

  /**
   * Track multiple results at once
   */
  trackBatch(results: ExecutionResult[]): void {
    for (const result of results) {
      this.track(result);
    }
  }

  /**
   * Get accumulated metrics
   */
  getMetrics(): MonitorMetrics {
    const stats = this.executor.getStats();
    const total = stats.totalExecutions;
    const successRate = total > 0 ? stats.successfulExecutions / total : 0;
    const failureRate = total > 0 ? stats.failedExecutions / total : 0;
    const avgExecutionTime = total > 0 ? stats.executionTime / total : 0;
    return {
      totalTracks: this.trackCount,
      avgExecutionTime,
      successRate,
      failureRate,
      totalItems: stats.totalItems,
    };
  }

  /**
   * Get full tracking history
   */
  getHistory(): MetricPoint[] {
    return [...this.history];
  }

  /**
   * Get current monitor status
   */
  getStatus(): MonitorStatus {
    return this.status;
  }

  /**
   * Set monitor status
   */
  setStatus(status: MonitorStatus): void {
    this.status = status;
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.history = [];
    this.trackCount = 0;
    this.status = 'idle';
  }

  /**
   * Get a snapshot of monitor state
   */
  getSnapshot(): { metrics: MonitorMetrics; config: MonitorConfig; historyLength: number; status: MonitorStatus } {
    return {
      metrics: this.getMetrics(),
      config: this.config,
      historyLength: this.history.length,
      status: this.status,
    };
  }

  /**
   * Reset monitor state
   */
  reset(): void {
    this.history = [];
    this.trackCount = 0;
    this.status = 'idle';
  }

  /**
   * Generate monitor report
   */
  getReport(): string {
    const metrics = this.getMetrics();
    const lines = [
      `=== CombinerMonitor Report ===`,
      `ID: ${this.config.id}`,
      `Version: ${this.config.version}`,
      `Status: ${this.status}`,
      `Total Tracks: ${metrics.totalTracks}`,
      `Success Rate: ${(metrics.successRate * 100).toFixed(2)}%`,
      `Failure Rate: ${(metrics.failureRate * 100).toFixed(2)}%`,
      `Avg Execution Time: ${metrics.avgExecutionTime.toFixed(2)}ms`,
      `Total Items: ${metrics.totalItems}`,
      `History Length: ${this.history.length}`,
      `==============================`,
    ];
    return lines.join('\n');
  }

  /**
   * Export metrics in standard format
   */
  exportMetrics(): { version: string; metrics: MonitorMetrics; status: MonitorStatus; historyCount: number } {
    return {
      version: this.config.version,
      metrics: this.getMetrics(),
      status: this.status,
      historyCount: this.history.length,
    };
  }
}