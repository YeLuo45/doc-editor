/**
 * RouterMonitor.ts - V117 Router Monitor
 * Tracks and monitors router metrics with track/getMetrics/getHistory/getStatus
 */

export type MonitorConfig = {
  name: string;
  retentionPeriod: number;
  sampleInterval: number;
  enableAlerts: boolean;
};

export type MetricPoint = {
  timestamp: number;
  value: number;
  labels?: Record<string, string>;
};

export type MonitorMetrics = {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
};

export type MonitorStatus = 'healthy' | 'degraded' | 'down';

export class RouterMonitor {
  private _history: MetricPoint[] = [];
  private _requestCount: number = 0;
  private _successCount: number = 0;
  private _failureCount: number = 0;
  private _latencies: number[] = [];
  private _status: MonitorStatus = 'healthy';
  private _startTime: number = Date.now();

  public config: MonitorConfig;

  constructor(config: MonitorConfig) {
    this.config = { ...config };
  }

  /**
   * Track a metric event
   */
  track(name: string, value: number, labels?: Record<string, string>): void {
    const point: MetricPoint = {
      timestamp: Date.now(),
      value,
      labels,
    };
    this._history.push(point);
    this.enforceRetention();
  }

  /**
   * Record request completion
   */
  recordRequest(success: boolean, latency: number): void {
    this._requestCount++;
    if (success) {
      this._successCount++;
    } else {
      this._failureCount++;
    }
    this._latencies.push(latency);
    this.track(success ? 'request.success' : 'request.failure', latency);

    // Update status based on failure rate
    if (this._requestCount > 10) {
      const failureRate = this._failureCount / this._requestCount;
      if (failureRate > 0.5) {
        this._status = 'down';
      } else if (failureRate > 0.2) {
        this._status = 'degraded';
      } else {
        this._status = 'healthy';
      }
    }

    // Maintain latency array size
    if (this._latencies.length > 1000) {
      this._latencies = this._latencies.slice(-500);
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): MonitorMetrics {
    const sorted = [...this._latencies].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);
    const avgLatency = sorted.length > 0
      ? sorted.reduce((a, b) => a + b, 0) / sorted.length
      : 0;

    return {
      totalRequests: this._requestCount,
      successfulRequests: this._successCount,
      failedRequests: this._failureCount,
      avgLatency: Math.round(avgLatency * 100) / 100,
      p95Latency: sorted[p95Index] || 0,
      p99Latency: sorted[p99Index] || 0,
    };
  }

  /**
   * Get metric history
   */
  getHistory(limit?: number): MetricPoint[] {
    const history = [...this._history];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Get specific metric history by name
   */
  getMetricHistory(name: string, limit?: number): MetricPoint[] {
    const filtered = this._history.filter(m => {
      const metricName = m.labels?.metric || '';
      return metricName === name;
    });
    return limit ? filtered.slice(-limit) : filtered;
  }

  /**
   * Get current status
   */
  getStatus(): MonitorStatus {
    return this._status;
  }

  /**
   * Get status details with explanation
   */
  getStatusDetails(): { status: MonitorStatus; failureRate: number; requestCount: number } {
    const failureRate = this._requestCount > 0
      ? (this._failureCount / this._requestCount) * 100
      : 0;

    return {
      status: this._status,
      failureRate: Math.round(failureRate * 100) / 100,
      requestCount: this._requestCount,
    };
  }

  private enforceRetention(): void {
    const cutoff = Date.now() - this.config.retentionPeriod;
    this._history = this._history.filter(m => m.timestamp > cutoff);
    if (this._history.length > 10000) {
      this._history = this._history.slice(-5000);
    }
  }

  /**
   * Get current snapshot of monitor state
   */
  getSnapshot(): { metrics: MonitorMetrics; status: MonitorStatus; historyLength: number; uptime: number } {
    return {
      metrics: this.getMetrics(),
      status: this.getStatus(),
      historyLength: this._history.length,
      uptime: Date.now() - this._startTime,
    };
  }

  /**
   * Reset all monitor state
   */
  reset(): void {
    this._history = [];
    this._requestCount = 0;
    this._successCount = 0;
    this._failureCount = 0;
    this._latencies = [];
    this._status = 'healthy';
    this._startTime = Date.now();
  }

  /**
   * Generate a text report
   */
  getReport(): string {
    const metrics = this.getMetrics();
    const status = this.getStatusDetails();
    const lines = [
      `Router Monitor Report: ${this.config.name}`,
      `Status: ${status.status}`,
      `Total Requests: ${metrics.totalRequests}`,
      `Successful: ${metrics.successfulRequests}`,
      `Failed: ${metrics.failedRequests}`,
      `Failure Rate: ${status.failureRate}%`,
      `Avg Latency: ${metrics.avgLatency}ms`,
      `P95 Latency: ${metrics.p95Latency}ms`,
      `P99 Latency: ${metrics.p99Latency}ms`,
      `History Points: ${this._history.length}`,
      `Uptime: ${Date.now() - this._startTime}ms`,
    ];
    return lines.join('\n');
  }

  /**
   * Export metrics in standardized format
   */
  exportMetrics(): { version: string; timestamp: number; metrics: MonitorMetrics } {
    return {
      version: 'V117',
      timestamp: Date.now(),
      metrics: this.getMetrics(),
    };
  }
}