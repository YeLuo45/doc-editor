/**
 * SinkMonitor.ts - Monitor for tracking sink performance
 * Version 1.0.7
 */

export type MonitorConfig = {
  enabled: boolean;
  historySize: number;
  collectIntervalMs: number;
  alertThreshold: number;
  onAlert?: (alert: MonitorAlert) => void;
};

export interface MonitorAlert {
  type: 'high_latency' | 'high_failure' | 'queue_overflow' | 'sink_offline';
  sinkName: string;
  message: string;
  timestamp: number;
  value: number;
}

export interface MonitorMetrics {
  totalTracked: number;
  totalAlerts: number;
  activeMonitors: number;
  lastTrackTime: number | null;
}

export interface TrackingEntry {
  timestamp: number;
  sinkName: string;
  metric: string;
  value: number;
  duration?: number;
  success: boolean;
}

export class SinkMonitor {
  private _config: MonitorConfig;
  private history: TrackingEntry[] = [];
  private totalTracked = 0;
  private totalAlerts = 0;
  private lastTrackTime: number | null = null;
  private alertCount: Map<string, number> = new Map();

  constructor(config: Partial<MonitorConfig> = {}) {
    this._config = {
      enabled: true,
      historySize: 1000,
      collectIntervalMs: 1000,
      alertThreshold: 0.1,
      onAlert: undefined,
      ...config,
    };
  }

  get config(): MonitorConfig {
    return { ...this._config };
  }

  set config(value: Partial<MonitorConfig>) {
    this._config = { ...this._config, ...value };
  }

  track(sinkName: string, metric: string, value: number, success = true, duration?: number): void {
    if (!this._config.enabled) {
      return;
    }

    const entry: TrackingEntry = {
      timestamp: Date.now(),
      sinkName,
      metric,
      value,
      duration,
      success,
    };

    this.history.push(entry);
    this.totalTracked++;
    this.lastTrackTime = Date.now();

    if (this.history.length > this._config.historySize) {
      this.history.shift();
    }

    this.checkThresholds(sinkName, metric, value, success);
  }

  private checkThresholds(sinkName: string, metric: string, value: number, success: boolean): void {
    if (!success && metric === 'failure_rate') {
      const count = this.alertCount.get(sinkName) || 0;
      this.alertCount.set(sinkName, count + 1);

      if (count >= this._config.alertThreshold * 100) {
        this.triggerAlert({
          type: 'high_failure',
          sinkName,
          message: `High failure rate detected for sink: ${sinkName}`,
          timestamp: Date.now(),
          value,
        });
      }
    }

    if (metric === 'latency' && value > this._config.alertThreshold * 1000) {
      this.triggerAlert({
        type: 'high_latency',
        sinkName,
        message: `High latency detected for sink: ${sinkName}`,
        timestamp: Date.now(),
        value,
      });
    }
  }

  private triggerAlert(alert: MonitorAlert): void {
    this.totalAlerts++;
    this._config.onAlert?.(alert);
  }

  getMetrics(sinkName?: string): Map<string, number> {
    const metrics = new Map<string, number>();

    const entries = sinkName
      ? this.history.filter(e => e.sinkName === sinkName)
      : this.history;

    for (const entry of entries) {
      const key = `${entry.sinkName}:${entry.metric}`;
      const existing = metrics.get(key) || 0;

      if (entry.metric === 'latency' || entry.metric === 'duration') {
        metrics.set(key, existing + entry.value);
      } else if (entry.metric === 'count') {
        metrics.set(key, existing + 1);
      } else {
        metrics.set(key, entry.value);
      }
    }

    return metrics;
  }

  getHistory(sinkName?: string, limit = 100): TrackingEntry[] {
    const entries = sinkName
      ? this.history.filter(e => e.sinkName === sinkName)
      : this.history;

    return entries.slice(-limit);
  }

  getStatus(): {
    enabled: boolean;
    historySize: number;
    alertThreshold: number;
  } {
    return {
      enabled: this._config.enabled,
      historySize: this.history.length,
      alertThreshold: this._config.alertThreshold,
    };
  }

  getStats(): MonitorMetrics {
    return {
      totalTracked: this.totalTracked,
      totalAlerts: this.totalAlerts,
      activeMonitors: this.alertCount.size,
      lastTrackTime: this.lastTrackTime,
    };
  }

  getSnapshot(): { metrics: MonitorMetrics; config: MonitorConfig } {
    return {
      metrics: this.getStats(),
      config: this.config,
    };
  }

  reset(): void {
    this.history = [];
    this.totalTracked = 0;
    this.totalAlerts = 0;
    this.lastTrackTime = null;
    this.alertCount.clear();
  }

  getReport(): string {
    const stats = this.getStats();
    const status = this.getStatus();
    return [
      'Sink Monitor Report',
      '===================',
      `Enabled: ${status.enabled}`,
      `History Size: ${status.historySize}`,
      `Alert Threshold: ${status.alertThreshold}`,
      '',
      `Total Tracked: ${stats.totalTracked}`,
      `Total Alerts: ${stats.totalAlerts}`,
      `Active Monitors: ${stats.activeMonitors}`,
      `Last Track: ${stats.lastTrackTime ? new Date(stats.lastTrackTime).toISOString() : 'N/A'}`,
    ].join('\n');
  }

  exportMetrics(): { version: string; metrics: MonitorMetrics; config: MonitorConfig } {
    return {
      version: '1.0.7',
      metrics: this.getStats(),
      config: this.config,
    };
  }
}