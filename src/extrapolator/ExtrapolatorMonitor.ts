/**
 * V141 ExtrapolatorMonitor - Monitoring and metrics for extrapolators
 * Tracks performance, health, and historical data
 */

export type MonitorConfig = {
  name: string;
  metricsWindow: number;
  enableAlerts: boolean;
  alertThreshold: number;
  samplingRate: number;
};

export interface MetricPoint {
  timestamp: number;
  value: number;
  labels?: Record<string, string>;
}

export interface MonitorStats {
  totalTracks: number;
  activeMetrics: number;
  alertsTriggered: number;
  averageValue: number;
  lastTrackTime: number;
}

export class ExtrapolatorMonitor {
  private config: MonitorConfig;
  private metrics: Map<string, MetricPoint[]>;
  private stats: MonitorStats;
  private lastSnapshot: { metrics: MonitorStats } | null;
  private history: Array<{ timestamp: number; event: string; data: unknown }>;

  constructor(config: MonitorConfig) {
    this.config = {
      name: config.name || 'default-monitor',
      metricsWindow: config.metricsWindow || 3600000,
      enableAlerts: config.enableAlerts ?? true,
      alertThreshold: config.alertThreshold || 0.9,
      samplingRate: config.samplingRate || 1.0,
    };
    this.metrics = new Map();
    this.stats = {
      totalTracks: 0,
      activeMetrics: 0,
      alertsTriggered: 0,
      averageValue: 0,
      lastTrackTime: 0,
    };
    this.lastSnapshot = null;
    this.history = [];
  }

  get config(): MonitorConfig {
    return { ...this.config };
  }

  track(metricName: string, value: number, labels?: Record<string, string>): void {
    const startTime = Date.now();

    if (!metricName || typeof value !== 'number') {
      throw new Error('Invalid metric name or value');
    }

    if (!this.metrics.has(metricName)) {
      this.metrics.set(metricName, []);
      this.stats.activeMetrics = this.metrics.size;
    }

    const point: MetricPoint = {
      timestamp: Date.now(),
      value,
      labels,
    };

    const metricData = this.metrics.get(metricName)!;
    metricData.push(point);

    const windowStart = Date.now() - this.config.metricsWindow;
    const filteredData = metricData.filter(p => p.timestamp >= windowStart);
    this.metrics.set(metricName, filteredData);

    this.stats.totalTracks++;
    this.stats.lastTrackTime = Date.now() - startTime;
    this.updateAverageValue(value);

    if (this.config.enableAlerts && this.shouldTriggerAlert(value)) {
      this.triggerAlert(metricName, value);
    }

    this.addHistoryEvent('track', { metricName, value, labels });
    this.lastSnapshot = { metrics: { ...this.stats } };
  }

  getMetrics(metricName: string): MetricPoint[] {
    return this.metrics.get(metricName) || [];
  }

  getHistory(limit?: number): Array<{ timestamp: number; event: string; data: unknown }> {
    if (limit && limit > 0) {
      return this.history.slice(-limit);
    }
    return [...this.history];
  }

  getStatus(): { healthy: boolean; message: string } {
    const hasMetrics = this.metrics.size > 0;
    const recentTracks = this.stats.totalTracks > 0;

    return {
      healthy: hasMetrics && recentTracks,
      message: hasMetrics && recentTracks ? 'Monitor operational' : 'No recent metrics',
    };
  }

  getStats(): MonitorStats {
    return { ...this.stats };
  }

  getSnapshot(): { metrics: MonitorStats } {
    return {
      metrics: { ...this.stats },
    };
  }

  reset(): void {
    this.metrics.clear();
    this.stats = {
      totalTracks: 0,
      activeMetrics: 0,
      alertsTriggered: 0,
      averageValue: 0,
      lastTrackTime: 0,
    };
    this.history = [];
    this.lastSnapshot = null;
  }

  getReport(): string {
    return [
      `ExtrapolatorMonitor Report: ${this.config.name}`,
      `Metrics Window: ${this.config.metricsWindow}ms`,
      `Alerts: ${this.config.enableAlerts ? 'enabled' : 'disabled'}`,
      `Alert Threshold: ${this.config.alertThreshold}`,
      `Sampling Rate: ${this.config.samplingRate}`,
      `Total Tracks: ${this.stats.totalTracks}`,
      `Active Metrics: ${this.stats.activeMetrics}`,
      `Alerts Triggered: ${this.stats.alertsTriggered}`,
      `Average Value: ${this.stats.averageValue.toFixed(4)}`,
      `Last Track Time: ${this.stats.lastTrackTime}ms`,
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return {
      version: '1.0.0',
    };
  }

  private updateAverageValue(newValue: number): void {
    if (this.stats.totalTracks <= 1) {
      this.stats.averageValue = newValue;
      return;
    }
    const currentAvg = this.stats.averageValue;
    this.stats.averageValue = (currentAvg * (this.stats.totalTracks - 1) + newValue) / this.stats.totalTracks;
  }

  private shouldTriggerAlert(value: number): boolean {
    return value > this.config.alertThreshold;
  }

  private triggerAlert(metricName: string, value: number): void {
    this.stats.alertsTriggered++;
    this.addHistoryEvent('alert', { metricName, value, threshold: this.config.alertThreshold });
  }

  private addHistoryEvent(event: string, data: unknown): void {
    this.history.push({
      timestamp: Date.now(),
      event,
      data,
    });

    if (this.history.length > 1000) {
      this.history = this.history.slice(-500);
    }
  }

  clearMetrics(metricName?: string): void {
    if (metricName) {
      this.metrics.delete(metricName);
      this.stats.activeMetrics = this.metrics.size;
    } else {
      this.metrics.clear();
      this.stats.activeMetrics = 0;
    }
  }

  getMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }
}

export default ExtrapolatorMonitor;