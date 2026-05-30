/**
 * AggregationMonitor - V104 for doc-editor
 * Monitoring and tracking for aggregation operations
 */

export type AggregationMonitorConfig = {
  windowSize?: number;
  enableHistory?: boolean;
  trackLatency?: boolean;
};

export interface MonitorMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface MonitorStatus {
  active: boolean;
  metricsCollected: number;
  lastCheck: number;
}

export class AggregationMonitor {
  config: AggregationMonitorConfig;
  private metrics: MonitorMetric[];
  private history: MonitorMetric[][];
  private status: MonitorStatus;
  private latencyBuffer: number[];

  constructor(config: AggregationMonitorConfig) {
    this.config = config;
    this.metrics = [];
    this.history = [];
    this.status = {
      active: true,
      metricsCollected: 0,
      lastCheck: Date.now(),
    };
    this.latencyBuffer = [];
  }

  track(metric: Omit<MonitorMetric, 'timestamp'>): void {
    const fullMetric: MonitorMetric = {
      ...metric,
      timestamp: Date.now(),
    };
    this.metrics.push(fullMetric);
    this.status.metricsCollected++;
    this.status.lastCheck = Date.now();

    if (this.config.enableHistory) {
      this.pruneHistory();
    }
  }

  trackLatency(duration: number): void {
    if (this.config.trackLatency) {
      this.latencyBuffer.push(duration);
      if (this.latencyBuffer.length > (this.config.windowSize ?? 100)) {
        this.latencyBuffer.shift();
      }
    }
  }

  getMetrics(): MonitorMetric[] {
    return [...this.metrics];
  }

  getHistory(): MonitorMetric[][] {
    return [...this.history];
  }

  getStatus(): MonitorStatus {
    return { ...this.status };
  }

  getSnapshot(): { metrics: MonitorMetric[] } {
    return {
      metrics: this.getMetrics(),
    };
  }

  reset(): void {
    this.metrics = [];
    this.history = [];
    this.status = {
      active: true,
      metricsCollected: 0,
      lastCheck: Date.now(),
    };
    this.latencyBuffer = [];
  }

  getReport(): string {
    return JSON.stringify({
      config: this.config,
      status: this.status,
      metricsCount: this.metrics.length,
      latencyAvg: this.getAverageLatency(),
    }, null, 2);
  }

  exportMetrics(): { version: string } {
    return {
      version: '1.0.4',
      metrics: this.metrics,
      status: this.status,
    };
  }

  getAverageLatency(): number {
    if (this.latencyBuffer.length === 0) return 0;
    return this.latencyBuffer.reduce((a, b) => a + b, 0) / this.latencyBuffer.length;
  }

  getMetricByName(name: string): MonitorMetric | undefined {
    return this.metrics.find(m => m.name === name);
  }

  getRecentMetrics(count: number): MonitorMetric[] {
    return this.metrics.slice(-count);
  }

  private pruneHistory(): void {
    const maxHistorySize = this.config.windowSize ?? 10;
    if (this.history.length >= maxHistorySize) {
      this.history.shift();
    }
  }

  saveSnapshot(): void {
    this.history.push([...this.metrics]);
  }

  clearMetrics(): void {
    this.metrics = [];
  }
}