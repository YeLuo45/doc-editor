/**
 * ThrottleMonitor.ts - Throttle monitoring for doc-editor
 * Version 1.0.6
 */

export type ThrottleMonitorConfig = {
  intervalMs: number;
  retentionMs: number;
  onAlert?: (alert: MonitorAlert) => void;
};

export interface MonitorAlert {
  type: 'high_throttle_rate' | 'threshold_exceeded' | 'request_spike';
  key: string;
  value: number;
  timestamp: number;
  message: string;
}

export interface MonitorMetrics {
  totalTracked: number;
  throttleRate: number;
  peakTracked: number;
  averageValue: number;
  alertCount: number;
}

export interface HistoryEntry {
  key: string;
  value: number;
  timestamp: number;
  action: 'tracked' | 'throttled' | 'passed';
}

export class ThrottleMonitor {
  private _config: ThrottleMonitorConfig;
  private tracked: Map<string, number> = new Map();
  private history: HistoryEntry[] = [];
  private totalTracked = 0;
  private throttledTracked = 0;
  private passedTracked = 0;
  private alertCount = 0;
  private peakValue = 0;
  private alertThresholds = {
    throttleRate: 0.5,
    requestSpike: 100,
  };

  constructor(config: Partial<ThrottleMonitorConfig> = {}) {
    this._config = {
      intervalMs: 1000,
      retentionMs: 60000,
      onAlert: undefined,
      ...config,
    };
  }

  get config(): ThrottleMonitorConfig {
    return { ...this._config };
  }

  set config(value: Partial<ThrottleMonitorConfig>) {
    this._config = { ...this._config, ...value };
  }

  track(key: string, value: number, action: 'tracked' | 'throttled' | 'passed' = 'tracked'): void {
    this.totalTracked++;
    if (action === 'throttled') this.throttledTracked++;
    if (action === 'passed') this.passedTracked++;

    const current = this.tracked.get(key) || 0;
    const newValue = current + value;
    this.tracked.set(key, newValue);

    if (newValue > this.peakValue) {
      this.peakValue = newValue;
    }

    const entry: HistoryEntry = { key, value, timestamp: Date.now(), action };
    this.history.push(entry);

    const now = Date.now();
    const cutoff = now - this._config.retentionMs;
    this.history = this.history.filter(h => h.timestamp > cutoff);

    if (action === 'throttled') {
      const recentThrottles = this.history.filter(h => h.action === 'throttled' && h.timestamp > now - 5000).length;
      const recentTotal = this.history.filter(h => h.timestamp > now - 5000).length;
      if (recentTotal > 0 && recentThrottles / recentTotal > this.alertThresholds.throttleRate) {
        this.alertCount++;
        this._config.onAlert?.({
          type: 'high_throttle_rate',
          key,
          value: recentThrottles / recentTotal,
          timestamp: now,
          message: `Throttle rate for ${key} exceeded ${this.alertThresholds.throttleRate * 100}%`,
        });
      }
    }

    if (newValue > this.alertThresholds.requestSpike) {
      this.alertCount++;
      this._config.onAlert?.({
        type: 'request_spike',
        key,
        value: newValue,
        timestamp: now,
        message: `Request spike detected for ${key}: ${newValue} requests`,
      });
    }
  }

  getMetrics(): MonitorMetrics {
    const throttleRate = this.totalTracked > 0 ? this.throttledTracked / this.totalTracked : 0;
    const averageValue = this.tracked.size > 0
      ? Array.from(this.tracked.values()).reduce((a, b) => a + b, 0) / this.tracked.size
      : 0;

    return {
      totalTracked: this.totalTracked,
      throttleRate,
      peakTracked: this.peakValue,
      averageValue,
      alertCount: this.alertCount,
    };
  }

  getHistory(key?: string, limit = 100): HistoryEntry[] {
    let entries = this.history;
    if (key) {
      entries = entries.filter(h => h.key === key);
    }
    return entries.slice(-limit);
  }

  getStatus(): { trackedKeys: number; historySize: number; lastUpdate: number | null; config: ThrottleMonitorConfig } {
    const lastEntry = this.history[this.history.length - 1];
    return {
      trackedKeys: this.tracked.size,
      historySize: this.history.length,
      lastUpdate: lastEntry?.timestamp || null,
      config: this._config,
    };
  }

  getSnapshot(): { metrics: MonitorMetrics; config: ThrottleMonitorConfig } {
    return {
      metrics: this.getMetrics(),
      config: this.config,
    };
  }

  reset(): void {
    this.tracked.clear();
    this.history = [];
    this.totalTracked = 0;
    this.throttledTracked = 0;
    this.passedTracked = 0;
    this.alertCount = 0;
    this.peakValue = 0;
  }

  getReport(): string {
    const metrics = this.getMetrics();
    const status = this.getStatus();
    return [
      'Throttle Monitor Report',
      '=======================',
      `Interval: ${this._config.intervalMs}ms`,
      `Retention: ${this._config.retentionMs}ms`,
      '',
      `Total Tracked: ${metrics.totalTracked}`,
      `Tracked Keys: ${status.trackedKeys}`,
      `History Size: ${status.historySize}`,
      '',
      `Throttle Rate: ${(metrics.throttleRate * 100).toFixed(2)}%`,
      `Peak Tracked: ${metrics.peakTracked}`,
      `Average Value: ${metrics.averageValue.toFixed(2)}`,
      `Alerts: ${metrics.alertCount}`,
      `Last Update: ${status.lastUpdate ? new Date(status.lastUpdate).toISOString() : 'N/A'}`,
    ].join('\n');
  }

  exportMetrics(): { version: string; metrics: MonitorMetrics; config: ThrottleMonitorConfig } {
    return {
      version: '1.0.6',
      metrics: this.getMetrics(),
      config: this.config,
    };
  }
}