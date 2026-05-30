/**
 * V108 TracerMonitor Module
 * Monitors and tracks tracing metrics and history
 */

export type TracerMonitorConfig = {
  historySize: number;
  metricsInterval: number;
  enableAutoFlush: boolean;
  alertThreshold: number;
};

export type Metric = {
  name: string;
  value: number;
  timestamp: number;
  tags: Record<string, string>;
};

export type MonitoringStatus = 'healthy' | 'warning' | 'critical';

export class TracerMonitor {
  config: TracerMonitorConfig;
  private metrics: Metric[];
  private history: Metric[][];
  private trackCount: number;
  private status: MonitoringStatus;

  constructor(config: TracerMonitorConfig) {
    this.config = config;
    this.metrics = [];
    this.history = [];
    this.trackCount = 0;
    this.status = 'healthy';
  }

  track(name: string, value: number, tags: Record<string, string> = {}): void {
    const metric: Metric = {
      name,
      value,
      timestamp: Date.now(),
      tags: { ...tags },
    };

    this.metrics.push(metric);
    this.trackCount++;

    if (value > this.config.alertThreshold) {
      this.status = 'critical';
    } else if (value > this.config.alertThreshold * 0.7) {
      this.status = 'warning';
    }

    if (this.metrics.length > this.config.historySize * 10) {
      this.flushHistory();
    }
  }

  getMetrics(): Metric[] {
    return [...this.metrics];
  }

  getMetricByName(name: string): Metric[] {
    return this.metrics.filter(m => m.name === name);
  }

  getHistory(): Metric[][] {
    return [...this.history];
  }

  getStatus(): MonitoringStatus {
    return this.status;
  }

  setStatus(status: MonitoringStatus): void {
    this.status = status;
  }

  getTrackCount(): number {
    return this.trackCount;
  }

  flushHistory(): void {
    if (this.metrics.length > 0) {
      this.history.push([...this.metrics]);
      this.metrics = [];

      if (this.history.length > this.config.historySize) {
        this.history.shift();
      }
    }
  }

  clearMetrics(): void {
    this.metrics = [];
  }

  getSnapshot(): {
    metrics: Metric[];
    historyLength: number;
    trackCount: number;
    status: MonitoringStatus;
  } {
    return {
      metrics: [...this.metrics],
      historyLength: this.history.length,
      trackCount: this.trackCount,
      status: this.status,
    };
  }

  reset(): void {
    this.metrics = [];
    this.history = [];
    this.trackCount = 0;
    this.status = 'healthy';
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    const avgValue = snapshot.metrics.length > 0
      ? snapshot.metrics.reduce((sum, m) => sum + m.value, 0) / snapshot.metrics.length
      : 0;

    return `TracerMonitor Report:
  Status: ${snapshot.status}
  Track Count: ${snapshot.trackCount}
  Current Metrics: ${snapshot.metrics.length}
  History Length: ${snapshot.historyLength}
  Avg Value: ${avgValue.toFixed(2)}
  Alert Threshold: ${this.config.alertThreshold}`;
  }

  exportMetrics(): { version: string; trackCount: number; status: MonitoringStatus; config: TracerMonitorConfig } {
    return {
      version: '1.0.0',
      trackCount: this.trackCount,
      status: this.status,
      config: { ...this.config },
    };
  }

  getAggregatedMetrics(): Record<string, { count: number; sum: number; avg: number }> {
    const aggregated: Record<string, { count: number; sum: number; avg: number }> = {};

    for (const metric of this.metrics) {
      if (!aggregated[metric.name]) {
        aggregated[metric.name] = { count: 0, sum: 0, avg: 0 };
      }
      aggregated[metric.name].count++;
      aggregated[metric.name].sum += metric.value;
    }

    for (const name of Object.keys(aggregated)) {
      aggregated[name].avg = aggregated[name].sum / aggregated[name].count;
    }

    return aggregated;
  }
}