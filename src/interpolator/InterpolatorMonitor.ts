/**
 * V140 Interpolator Monitor
 * Monitors interpolation operations and tracks metrics over time
 */

import { InterpolatorExecutor, ExecutionResult } from './InterpolatorExecutor';

export interface MonitorConfig {
  historySize: number;
  enableRealTime: boolean;
  sampleRate: number;
}

export interface MonitorMetric {
  timestamp: number;
  name: string;
  value: number;
  tags: Record<string, string>;
}

export interface MonitorStatus {
  isTracking: boolean;
  metricCount: number;
  lastUpdate: number;
  uptime: number;
}

export class InterpolatorMonitor {
  public config: MonitorConfig;
  private metrics: MonitorMetric[];
  private executor: InterpolatorExecutor;
  private status: MonitorStatus;
  private startTime: number;

  constructor(executor: InterpolatorExecutor, config: Partial<MonitorConfig> = {}) {
    this.config = {
      historySize: 1000,
      enableRealTime: true,
      sampleRate: 1.0,
      ...config,
    };
    this.metrics = [];
    this.executor = executor;
    this.startTime = Date.now();
    this.status = {
      isTracking: false,
      metricCount: 0,
      lastUpdate: 0,
      uptime: 0,
    };
  }

  /**
   * Start tracking interpolation operations
   */
  startTracking(): void {
    this.status.isTracking = true;
    this.status.lastUpdate = Date.now();
  }

  /**
   * Stop tracking interpolation operations
   */
  stopTracking(): void {
    this.status.isTracking = false;
  }

  /**
   * Track a metric
   */
  track(name: string, value: number, tags: Record<string, string> = {}): void {
    if (!this.status.isTracking) {
      this.startTracking();
    }

    const metric: MonitorMetric = {
      timestamp: Date.now(),
      name,
      value,
      tags,
    };

    this.metrics.push(metric);
    this.status.metricCount = this.metrics.length;
    this.status.lastUpdate = metric.timestamp;
    this.status.uptime = Date.now() - this.startTime;

    // Trim history if needed
    if (this.metrics.length > this.config.historySize) {
      this.metrics = this.metrics.slice(-this.config.historySize);
    }
  }

  /**
   * Get metrics filtered by name
   */
  getMetrics(name?: string): MonitorMetric[] {
    if (name) {
      return this.metrics.filter(m => m.name === name);
    }
    return [...this.metrics];
  }

  /**
   * Get metrics within a time range
   */
  getMetricsInRange(startTime: number, endTime: number): MonitorMetric[] {
    return this.metrics.filter(m => m.timestamp >= startTime && m.timestamp <= endTime);
  }

  /**
   * Get complete history of metrics
   */
  getHistory(): MonitorMetric[] {
    return [...this.metrics];
  }

  /**
   * Get current monitoring status
   */
  getStatus(): MonitorStatus {
    return {
      ...this.status,
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Get a snapshot of current state
   */
  getSnapshot(): { status: MonitorStatus; recentMetrics: MonitorMetric[] } {
    return {
      status: this.getStatus(),
      recentMetrics: this.metrics.slice(-10),
    };
  }

  /**
   * Reset all metrics and status
   */
  reset(): void {
    this.metrics = [];
    this.status = {
      isTracking: false,
      metricCount: 0,
      lastUpdate: 0,
      uptime: 0,
    };
    this.startTime = Date.now();
  }

  /**
   * Generate a text report of current state
   */
  getReport(): string {
    return `InterpolatorMonitor Report:
  Tracking: ${this.status.isTracking ? 'Active' : 'Inactive'}
  Total Metrics: ${this.status.metricCount}
  History Size: ${this.config.historySize}
  Sample Rate: ${this.config.sampleRate}
  Last Update: ${new Date(this.status.lastUpdate).toISOString()}
  Uptime: ${this.status.uptime}ms
  Recent Entries: ${this.metrics.slice(-5).map(m => `${m.name}:${m.value}`).join(', ')}`;
  }

  /**
   * Export metrics in standardized format
   */
  exportMetrics(): { version: string; status: MonitorStatus; metrics: MonitorMetric[] } {
    return {
      version: '1.4.0',
      status: this.getStatus(),
      metrics: [...this.metrics],
    };
  }

  /**
   * Record execution result as metric
   */
  recordExecution(result: ExecutionResult<unknown>): void {
    const tags: Record<string, string> = {
      interpolator: result.interpolatorName,
      success: String(result.success),
    };
    this.track('execution.duration', result.duration, tags);
    
    if (result.success) {
      this.track('execution.success', 1, tags);
    } else {
      this.track('execution.failure', 1, tags);
    }
  }

  /**
   * Get aggregated statistics for a metric name
   */
  getMetricStats(name: string): { count: number; sum: number; avg: number; min: number; max: number } {
    const filtered = this.getMetrics(name);
    if (filtered.length === 0) {
      return { count: 0, sum: 0, avg: 0, min: 0, max: 0 };
    }

    const values = filtered.map(m => m.value);
    return {
      count: values.length,
      sum: values.reduce((a, b) => a + b, 0),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }
}

export default InterpolatorMonitor;