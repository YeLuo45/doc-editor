/**
 * RetryMonitor.ts
 * V94 Retry Queue - Retry Monitor Implementation
 * Tracks retry metrics, history, and status monitoring
 */

export interface MetricEntry {
  timestamp: number;
  operation: string;
  success: boolean;
  duration: number;
  attempts: number;
  error?: string;
}

export interface MonitorConfig {
  maxHistorySize?: number;
  sampleRate?: number;
}

export interface MonitorSnapshot {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageDuration: number;
  successRate: number;
}

export interface MonitorStatus {
  isHealthy: boolean;
  totalTracked: number;
  recentSuccessRate: number;
  averageLatency: number;
}

export class RetryMonitor {
  public readonly config: MonitorConfig;
  private metrics: MetricEntry[];
  private trackCount: number;
  private successCount: number;
  private failureCount: number;
  private totalDuration: number;

  constructor(config: MonitorConfig = {}) {
    this.config = {
      maxHistorySize: config.maxHistorySize || 1000,
      sampleRate: config.sampleRate || 1.0
    };
    this.metrics = [];
    this.trackCount = 0;
    this.successCount = 0;
    this.failureCount = 0;
    this.totalDuration = 0;
  }

  /**
   * Track a retry operation result
   */
  public track(operation: string, success: boolean, duration: number, attempts: number, error?: string): void {
    if (Math.random() > (this.config.sampleRate || 1.0)) {
      return;
    }

    const entry: MetricEntry = {
      timestamp: Date.now(),
      operation,
      success,
      duration,
      attempts,
      error
    };

    this.metrics.push(entry);

    if (this.metrics.length > (this.config.maxHistorySize || 1000)) {
      this.metrics.shift();
    }

    this.trackCount++;
    this.totalDuration += duration;

    if (success) {
      this.successCount++;
    } else {
      this.failureCount++;
    }
  }

  /**
   * Get current metrics summary
   */
  public getMetrics(): MonitorSnapshot {
    const successRate = this.trackCount > 0 ? this.successCount / this.trackCount : 0;
    const averageDuration = this.trackCount > 0 ? this.totalDuration / this.trackCount : 0;

    return {
      totalOperations: this.trackCount,
      successfulOperations: this.successCount,
      failedOperations: this.failureCount,
      averageDuration,
      successRate
    };
  }

  /**
   * Get operation history
   */
  public getHistory(limit?: number): MetricEntry[] {
    const sorted = [...this.metrics].sort((a, b) => b.timestamp - a.timestamp);
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Get current monitor status
   */
  public getStatus(): MonitorStatus {
    const recentMetrics = this.metrics.slice(-100);
    const recentSuccess = recentMetrics.filter(m => m.success).length;
    const recentSuccessRate = recentMetrics.length > 0 ? recentSuccess / recentMetrics.length : 0;
    const recentAvgDuration = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length
      : 0;

    return {
      isHealthy: this.trackCount === 0 || (this.failureCount / this.trackCount) < 0.5,
      totalTracked: this.trackCount,
      recentSuccessRate,
      averageLatency: recentAvgDuration
    };
  }

  /**
   * Reset all metrics
   */
  public reset(): void {
    this.metrics = [];
    this.trackCount = 0;
    this.successCount = 0;
    this.failureCount = 0;
    this.totalDuration = 0;
  }

  /**
   * Get current snapshot of monitor state
   */
  public getSnapshot(): { metrics: MonitorSnapshot } {
    return {
      metrics: this.getMetrics()
    };
  }

  /**
   * Generate human-readable report
   */
  public getReport(): string {
    const m = this.getMetrics();
    return `RetryMonitor: total=${m.totalOperations}, success=${m.successfulOperations}, ` +
      `failed=${m.failedOperations}, avgDuration=${m.averageDuration.toFixed(2)}ms, ` +
      `successRate=${(m.successRate * 100).toFixed(1)}%`;
  }

  /**
   * Export metrics for external monitoring
   */
  public exportMetrics(): { version: string } {
    return {
      version: 'V94-1.0',
      ...this.getMetrics(),
      historySize: this.metrics.length
    };
  }
}

export default RetryMonitor;