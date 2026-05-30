/**
 * ReducerMonitor.ts - V112 Reducer Monitor
 * Monitors reducer performance and health metrics
 */

export interface MonitorConfig {
  interval?: number;
  retentionPeriod?: number;
  alertThreshold?: number;
  trackLatency?: boolean;
}

export interface MetricPoint {
  timestamp: number;
  value: number;
  label?: string;
}

export interface MonitorMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  p99Latency: number;
  uptime: number;
}

export interface MonitorStatus {
  healthy: boolean;
  lastCheck: number;
  issues: string[];
}

export class ReducerMonitor {
  private history: MetricPoint[] = [];
  private config: MonitorConfig;
  private metrics: MonitorMetrics;
  private status: MonitorStatus;
  private startTime: number;

  constructor(config: MonitorConfig = {}) {
    this.config = {
      interval: 1000,
      retentionPeriod: 3600000,
      alertThreshold: 100,
      trackLatency: true,
      ...config
    };
    this.startTime = Date.now();
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      p99Latency: 0,
      uptime: 0
    };
    this.status = {
      healthy: true,
      lastCheck: Date.now(),
      issues: []
    };
  }

  get config(): MonitorConfig {
    return { ...this.config };
  }

  track(operation: string, latency: number, success: boolean): void {
    this.history.push({
      timestamp: Date.now(),
      value: latency,
      label: operation
    });

    this.metrics.totalRequests++;
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    const latencies = this.history.map(m => m.value).slice(-100);
    if (latencies.length > 0) {
      const sorted = [...latencies].sort((a, b) => a - b);
      const p99Index = Math.floor(sorted.length * 0.99);
      this.metrics.p99Latency = sorted[p99Index] || sorted[sorted.length - 1];
    }

    this.metrics.averageLatency = 
      (this.metrics.averageLatency * (this.metrics.totalRequests - 1) + latency) 
      / this.metrics.totalRequests;

    this.metrics.uptime = Date.now() - this.startTime;
    this.status.lastCheck = Date.now();

    if (this.config.alertThreshold && latency > this.config.alertThreshold) {
      this.status.issues.push(`High latency detected: ${latency}ms`);
      this.status.healthy = false;
    }

    this.cleanupHistory();
  }

  getMetrics(): MonitorMetrics {
    return { ...this.metrics };
  }

  getHistory(limit?: number): MetricPoint[] {
    const sorted = [...this.history].sort((a, b) => b.timestamp - a.timestamp);
    return limit ? sorted.slice(0, limit) : sorted;
  }

  getStatus(): MonitorStatus {
    return { ...this.status };
  }

  getSnapshot(): { metrics: MonitorMetrics; config: MonitorConfig } {
    return {
      metrics: this.getMetrics(),
      config: this.config
    };
  }

  reset(): void {
    this.history = [];
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      p99Latency: 0,
      uptime: 0
    };
    this.status = {
      healthy: true,
      lastCheck: Date.now(),
      issues: []
    };
  }

  getReport(): string {
    return [
      `Reducer Monitor Report`,
      `Status: ${this.status.healthy ? 'Healthy' : 'Unhealthy'}`,
      `Total Requests: ${this.metrics.totalRequests}`,
      `Successful: ${this.metrics.successfulRequests}`,
      `Failed: ${this.metrics.failedRequests}`,
      `Average Latency: ${this.metrics.averageLatency.toFixed(2)}ms`,
      `P99 Latency: ${this.metrics.p99Latency.toFixed(2)}ms`,
      `Uptime: ${(this.metrics.uptime / 1000).toFixed(0)}s`,
      `Issues: ${this.status.issues.length > 0 ? this.status.issues.join(', ') : 'None'}`
    ].join('\n');
  }

  exportMetrics(): { version: string; metrics: MonitorMetrics; config: MonitorConfig } {
    return {
      version: 'V112',
      metrics: this.getMetrics(),
      config: this.config
    };
  }

  private cleanupHistory(): void {
    const cutoff = Date.now() - (this.config.retentionPeriod || 3600000);
    this.history = this.history.filter(m => m.timestamp > cutoff);
  }
}

export default ReducerMonitor;