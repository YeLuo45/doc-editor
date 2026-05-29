/**
 * MetricsCollector.ts
 * V76 Metrics Collector - Core metrics collection module
 * Collects and tracks metrics with snapshot and reset capabilities
 */

export type MetricsCollectorConfig = {
  name: string;
  interval: number;
  maxMetrics: number;
  enablePersistence: boolean;
  tags: Record<string, string>;
};

export interface Metric {
  name: string;
  value: number;
  timestamp: number;
  tags: Record<string, string>;
}

export interface MetricsSnapshot {
  metrics: Metric[];
  collectedAt: number;
  version: string;
}

export class MetricsCollector {
  private _config: MetricsCollectorConfig;
  private _metrics: Metric[] = [];
  private _collectionCount = 0;

  constructor(config: Partial<MetricsCollectorConfig> = {}) {
    this._config = {
      name: config.name ?? 'default-collector',
      interval: config.interval ?? 60000,
      maxMetrics: config.maxMetrics ?? 1000,
      enablePersistence: config.enablePersistence ?? false,
      tags: config.tags ?? {},
    };
  }

  get config(): MetricsCollectorConfig {
    return { ...this._config };
  }

  collect(name: string, value: number, tags: Record<string, string> = {}): void {
    const metric: Metric = {
      name,
      value,
      timestamp: Date.now(),
      tags: { ...this._config.tags, ...tags },
    };

    this._metrics.push(metric);
    this._collectionCount++;

    if (this._metrics.length > this._config.maxMetrics) {
      this._metrics = this._metrics.slice(-this._config.maxMetrics);
    }
  }

  getMetrics(filter?: { name?: string; since?: number }): Metric[] {
    let result = [...this._metrics];

    if (filter?.name) {
      result = result.filter((m) => m.name === filter.name);
    }

    if (filter?.since) {
      result = result.filter((m) => m.timestamp >= filter.since!);
    }

    return result;
  }

  reset(): void {
    this._metrics = [];
    this._collectionCount = 0;
  }

  getSnapshot(): MetricsSnapshot {
    return {
      metrics: [...this._metrics],
      collectedAt: Date.now(),
      version: 'V76',
    };
  }

  getReport(): string {
    const total = this._metrics.length;
    const uniqueNames = [...new Set(this._metrics.map((m) => m.name))];
    const summary = uniqueNames
      .map((name) => {
        const items = this._metrics.filter((m) => m.name === name);
        const sum = items.reduce((acc, m) => acc + m.value, 0);
        const avg = items.length > 0 ? sum / items.length : 0;
        return `  ${name}: count=${items.length}, avg=${avg.toFixed(2)}`;
      })
      .join('\n');

    return [
      `=== MetricsCollector Report [${this._config.name}] ===`,
      `Total Metrics: ${total}`,
      `Collection Count: ${this._collectionCount}`,
      `Config: interval=${this._config.interval}ms, maxMetrics=${this._config.maxMetrics}`,
      `Unique Metric Names: ${uniqueNames.length}`,
      '--- Per-Metric Summary ---',
      summary || '  (no metrics)',
      `=== End Report ===`,
    ].join('\n');
  }

  exportMetrics(): { version: string; config: MetricsCollectorConfig; count: number } {
    return {
      version: 'V76',
      config: this._config,
      count: this._metrics.length,
    };
  }

  getCollectionCount(): number {
    return this._collectionCount;
  }
}