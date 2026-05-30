/**
 * V115 Accumulator Monitor
 * Monitors and tracks accumulator metrics and history
 */

import { Accumulator, AccumulatorMetrics } from './Accumulator';
import { AccumulatorRegistry } from './AccumulatorRegistry';

export interface MonitorConfig {
  readonly interval: number;
  readonly retentionPeriod?: number;
  readonly enableAlerts?: boolean;
}

export interface MetricPoint {
  readonly timestamp: number;
  readonly value: number;
  readonly label?: string;
}

export interface MonitorMetrics {
  readonly trackedCount: number;
  readonly totalDataPoints: number;
  readonly averageValue: number;
  readonly minValue: number;
  readonly maxValue: number;
}

export interface MonitorSnapshot {
  readonly metrics: MonitorMetrics;
  readonly config: MonitorConfig;
  readonly trackedIds: string[];
}

export type MetricValue = number | string | boolean;

export interface TrackedMetric {
  id: string;
  value: MetricValue;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export class AccumulatorMonitor {
  private readonly _config: MonitorConfig;
  private readonly _trackedMetrics: Map<string, TrackedMetric[]>;
  private readonly _history: Map<string, MetricPoint[]>;
  private readonly _status: Map<string, 'active' | 'inactive' | 'error'>;
  private readonly _startTime: number;

  constructor(config: MonitorConfig) {
    this._config = Object.freeze({ ...config });
    this._trackedMetrics = new Map();
    this._history = new Map();
    this._status = new Map();
    this._startTime = Date.now();
  }

  get config(): MonitorConfig {
    return this._config;
  }

  getSnapshot(): MonitorSnapshot {
    return {
      metrics: this.getMetrics(),
      config: this._config,
      trackedIds: this.getTrackedIds(),
    };
  }

  reset(): void {
    this._trackedMetrics.clear();
    this._history.clear();
    for (const id of this._status.keys()) {
      this._status.set(id, 'inactive');
    }
  }

  getReport(): string {
    const metrics = this.getMetrics();
    const uptime = Date.now() - this._startTime;
    const trackedIds = this.getTrackedIds();
    
    return [
      `Accumulator Monitor Report`,
      `  Uptime: ${uptime}ms`,
      `  Tracked: ${metrics.trackedCount}`,
      `  Total Data Points: ${metrics.totalDataPoints}`,
      `  Average Value: ${metrics.averageValue.toFixed(2)}`,
      `  Min Value: ${metrics.minValue}`,
      `  Max Value: ${metrics.maxValue}`,
      `  Tracked IDs: [${trackedIds.join(', ')}]`,
    ].join('\n');
  }

  exportMetrics(): { version: string } & MonitorMetrics {
    return {
      version: 'v115',
      ...this.getMetrics(),
    };
  }

  track(id: string, value: MetricValue, metadata?: Record<string, unknown>): void {
    const tracked: TrackedMetric = {
      id,
      value,
      timestamp: Date.now(),
      metadata,
    };

    const existing = this._trackedMetrics.get(id) || [];
    existing.push(tracked);
    this._trackedMetrics.set(id, existing);

    const historyPoint: MetricPoint = {
      timestamp: tracked.timestamp,
      value: typeof value === 'number' ? value : 0,
    };

    const history = this._history.get(id) || [];
    history.push(historyPoint);
    this._history.set(id, history);

    this._status.set(id, 'active');
    this._pruneHistory(id);
  }

  getMetrics(id?: string): MonitorMetrics {
    if (id) {
      const points = this._history.get(id) || [];
      return this._calculateMetrics(points);
    }

    let totalPoints = 0;
    let allValues: number[] = [];

    for (const points of this._history.values()) {
      totalPoints += points.length;
      allValues = allValues.concat(points.map(p => p.value));
    }

    return this._calculateMetrics(allValues.map(v => ({ timestamp: 0, value: v })));
  }

  getMetricsForId(id: string): MonitorMetrics | undefined {
    const points = this._history.get(id);
    if (!points) return undefined;
    return this._calculateMetrics(points);
  }

  getHistory(id: string, limit?: number): MetricPoint[] {
    const history = this._history.get(id) || [];
    if (limit) {
      return history.slice(-limit);
    }
    return [...history];
  }

  getStatus(id: string): 'active' | 'inactive' | 'error' {
    return this._status.get(id) || 'inactive';
  }

  getAllStatuses(): Map<string, 'active' | 'inactive' | 'error'> {
    return new Map(this._status);
  }

  getTrackedIds(): string[] {
    return Array.from(this._trackedMetrics.keys());
  }

  getLatestValue(id: string): MetricValue | undefined {
    const tracked = this._trackedMetrics.get(id);
    if (!tracked || tracked.length === 0) return undefined;
    return tracked[tracked.length - 1].value;
  }

  setStatus(id: string, status: 'active' | 'inactive' | 'error'): void {
    this._status.set(id, status);
  }

  clearHistory(id?: string): void {
    if (id) {
      this._history.delete(id);
      this._trackedMetrics.delete(id);
    } else {
      this._history.clear();
      this._trackedMetrics.clear();
    }
  }

  private _calculateMetrics(points: MetricPoint[]): MonitorMetrics {
    if (points.length === 0) {
      return {
        trackedCount: this._trackedMetrics.size,
        totalDataPoints: 0,
        averageValue: 0,
        minValue: 0,
        maxValue: 0,
      };
    }

    const values = points.map(p => p.value).filter((v): v is number => typeof v === 'number');
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      trackedCount: this._trackedMetrics.size,
      totalDataPoints: points.length,
      averageValue: values.length > 0 ? sum / values.length : 0,
      minValue: values.length > 0 ? Math.min(...values) : 0,
      maxValue: values.length > 0 ? Math.max(...values) : 0,
    };
  }

  private _pruneHistory(id: string): void {
    if (!this._config.retentionPeriod) return;

    const cutoff = Date.now() - this._config.retentionPeriod;
    const history = this._history.get(id);
    if (!history) return;

    const pruned = history.filter(point => point.timestamp >= cutoff);
    this._history.set(id, pruned);
  }

  trackFromRegistry(registry: AccumulatorRegistry): void {
    for (const id of registry.getAll()) {
      const acc = registry.get(id);
      if (acc) {
        const stats = acc.getStats();
        this.track(id, stats.totalItems, { source: 'registry', name: acc.config.name });
      }
    }
  }

  getDataPointCount(): number {
    let count = 0;
    for (const history of this._history.values()) {
      count += history.length;
    }
    return count;
  }
}

export default AccumulatorMonitor;