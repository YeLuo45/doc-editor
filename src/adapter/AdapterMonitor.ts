/**
 * V111 Adapter Monitor
 * Monitors adapter performance, tracks metrics, and maintains history
 */

import { Adapter, AdapterConfig } from './Adapter';

export type MonitorConfig = {
  name: string;
  version: string;
  maxHistorySize: number;
  enableRealTime: boolean;
  samplingRate: number;
};

export type MetricPoint = {
  timestamp: number;
  adapterId: string;
  metric: string;
  value: number;
};

export type MonitorStatus = 'active' | 'paused' | 'stopped';

export type MonitorStats = {
  trackedAdapters: number;
  totalMetrics: number;
  metricPoints: number;
  status: MonitorStatus;
};

export class AdapterMonitor {
  private _config: MonitorConfig;
  private _metrics: Map<string, MetricPoint[]>;
  private _adapterStatuses: Map<string, MonitorStatus>;
  private _stats: MonitorStats;

  constructor(config: Partial<MonitorConfig> = {}) {
    this._config = {
      name: config.name ?? 'AdapterMonitor',
      version: config.version ?? '1.0.0',
      maxHistorySize: config.maxHistorySize ?? 1000,
      enableRealTime: config.enableRealTime ?? true,
      samplingRate: config.samplingRate ?? 1.0,
    };
    this._metrics = new Map();
    this._adapterStatuses = new Map();
    this._stats = {
      trackedAdapters: 0,
      totalMetrics: 0,
      metricPoints: 0,
      status: 'active',
    };
  }

  get config(): MonitorConfig {
    return { ...this._config };
  }

  track(adapter: Adapter, metric: string, value: number): void {
    if (this._stats.status !== 'active') return;

    const point: MetricPoint = {
      timestamp: Date.now(),
      adapterId: adapter.config.id,
      metric,
      value,
    };

    const existing = this._metrics.get(adapter.config.id) || [];
    existing.push(point);

    if (existing.length > this._config.maxHistorySize) {
      existing.shift();
    }

    this._metrics.set(adapter.config.id, existing);
    this._stats.metricPoints++;
    this._stats.totalMetrics++;
  }

  trackAdapter(adapter: Adapter): void {
    if (!this._adapterStatuses.has(adapter.config.id)) {
      this._adapterStatuses.set(adapter.config.id, 'active');
      this._stats.trackedAdapters++;
    }
  }

  getMetrics(adapterId?: string): MetricPoint[] {
    if (adapterId) {
      return this._metrics.get(adapterId) || [];
    }
    const all: MetricPoint[] = [];
    for (const points of this._metrics.values()) {
      all.push(...points);
    }
    return all.sort((a, b) => a.timestamp - b.timestamp);
  }

  getMetricsSummary(adapterId: string): Record<string, number> {
    const points = this._metrics.get(adapterId) || [];
    const summary: Record<string, number[]> = {};

    for (const point of points) {
      if (!summary[point.metric]) {
        summary[point.metric] = [];
      }
      summary[point.metric].push(point.value);
    }

    const result: Record<string, number> = {};
    for (const [metric, values] of Object.entries(summary)) {
      result[`${metric}_count`] = values.length;
      result[`${metric}_sum`] = values.reduce((a, b) => a + b, 0);
      result[`${metric}_avg`] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    }

    return result;
  }

  getHistory(adapterId?: string, limit: number = 100): MetricPoint[] {
    const metrics = this.getMetrics(adapterId);
    return metrics.slice(-limit);
  }

  getStatus(adapterId?: string): MonitorStatus {
    if (adapterId) {
      return this._adapterStatuses.get(adapterId) || 'stopped';
    }
    return this._stats.status;
  }

  setStatus(adapterId: string, status: MonitorStatus): void {
    this._adapterStatuses.set(adapterId, status);
  }

  pause(): void {
    this._stats.status = 'paused';
  }

  resume(): void {
    this._stats.status = 'active';
  }

  stop(): void {
    this._stats.status = 'stopped';
  }

  getStats(): MonitorStats {
    return { ...this._stats };
  }

  clearMetrics(adapterId?: string): void {
    if (adapterId) {
      this._metrics.delete(adapterId);
    } else {
      this._metrics.clear();
    }
    this._stats.metricPoints = 0;
  }

  getSnapshot(): { metrics: MonitorStats } {
    return { metrics: this.getStats() };
  }

  reset(): void {
    this._metrics.clear();
    this._adapterStatuses.clear();
    this._stats = {
      trackedAdapters: 0,
      totalMetrics: 0,
      metricPoints: 0,
      status: 'active',
    };
  }

  getReport(): string {
    return [
      `Monitor Report: ${this._config.name} v${this._config.version}`,
      `Status: ${this._stats.status}`,
      `Tracked Adapters: ${this._stats.trackedAdapters}`,
      `Total Metrics: ${this._stats.totalMetrics}`,
      `Metric Points: ${this._stats.metricPoints}`,
      `History Size: ${this._config.maxHistorySize}`,
      `Real-time: ${this._config.enableRealTime ? 'Enabled' : 'Disabled'}`,
    ].join('\n');
  }

  exportMetrics(): { version: string; stats: MonitorStats; config: MonitorConfig } {
    return {
      version: '1.0.0',
      stats: this.getStats(),
      config: this.config,
    };
  }
}