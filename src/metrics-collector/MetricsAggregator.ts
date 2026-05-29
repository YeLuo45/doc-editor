/**
 * MetricsAggregator.ts
 * V76 Metrics Aggregator - Aggregates metrics from multiple collectors
 * Provides aggregation, summary, and analysis capabilities
 */

import type { Metric } from './MetricsCollector.js';

export type MetricsAggregatorConfig = {
  name: string;
  aggregationWindow: number;
  percentileLevels: number[];
  enablePercentiles: boolean;
  tags: Record<string, string>;
};

export interface AggregatedMetric {
  name: string;
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  percentile?: Record<number, number>;
  tags: Record<string, string>;
}

export interface AggregationResult {
  aggregated: AggregatedMetric[];
  windowStart: number;
  windowEnd: number;
  totalInputMetrics: number;
}

export class MetricsAggregator {
  private _config: MetricsAggregatorConfig;
  private _aggregates: Map<string, Metric[]> = new Map();
  private _lastAggregation = 0;

  constructor(config: Partial<MetricsAggregatorConfig> = {}) {
    this._config = {
      name: config.name ?? 'default-aggregator',
      aggregationWindow: config.aggregationWindow ?? 60000,
      percentileLevels: config.percentileLevels ?? [50, 90, 95, 99],
      enablePercentiles: config.enablePercentiles ?? true,
      tags: config.tags ?? {},
    };
  }

  get config(): MetricsAggregatorConfig {
    return { ...this._config };
  }

  aggregate(metrics: Metric[]): AggregationResult {
    const now = Date.now();
    const windowStart = now - this._config.aggregationWindow;
    this._lastAggregation = now;

    const filtered = metrics.filter((m) => m.timestamp >= windowStart);
    const grouped = new Map<string, Metric[]>();

    for (const metric of filtered) {
      const existing = grouped.get(metric.name) ?? [];
      existing.push(metric);
      grouped.set(metric.name, existing);
    }

    const aggregated: AggregatedMetric[] = [];

    for (const [name, items] of grouped) {
      if (items.length === 0) continue;

      const sum = items.reduce((acc, m) => acc + m.value, 0);
      const avg = sum / items.length;
      const values = items.map((m) => m.value).sort((a, b) => a - b);
      const min = values[0];
      const max = values[values.length - 1];

      const percentile: Record<number, number> = {};
      if (this._config.enablePercentiles) {
        for (const p of this._config.percentileLevels) {
          const idx = Math.ceil((p / 100) * values.length) - 1;
          percentile[p] = values[Math.max(0, idx)];
        }
      }

      const aggMetric: AggregatedMetric = {
        name,
        count: items.length,
        sum,
        min,
        max,
        avg,
        percentile: Object.keys(percentile).length > 0 ? percentile : undefined,
        tags: { ...this._config.tags, ...items[0].tags },
      };

      aggregated.push(aggMetric);

      // Store in internal aggregates for getAggregates()
      const existing = this._aggregates.get(name) ?? [];
      existing.push(...items);
      this._aggregates.set(name, existing);
    }

    return {
      aggregated,
      windowStart,
      windowEnd: now,
      totalInputMetrics: filtered.length,
    };
  }

  getAggregates(name?: string): AggregatedMetric[] {
    const allAggregates: AggregatedMetric[] = [];
    for (const [, items] of this._aggregates) {
      for (const metric of items) {
        if (!name || metric.name === name) {
          const existing = allAggregates.find((a) => a.name === metric.name);
          if (!existing) {
            allAggregates.push(this._buildAggregate([metric]));
          }
        }
      }
    }
    return allAggregates;
  }

  getSummary(): string {
    const now = Date.now();
    const windowStart = now - this._config.aggregationWindow;
    const lines = [
      `=== MetricsAggregator Summary [${this._config.name}] ===`,
      `Aggregation Window: ${this._config.aggregationWindow}ms`,
      `Window Range: ${new Date(windowStart).toISOString()} - ${new Date(now).toISOString()}`,
      `Last Aggregation: ${new Date(this._lastAggregation).toISOString()}`,
      `Percentiles Enabled: ${this._config.enablePercentiles}`,
      `Percentile Levels: ${this._config.percentileLevels.join(', ')}`,
      '=== End Summary ===',
    ];
    return lines.join('\n');
  }

  reset(): void {
    this._aggregates.clear();
    this._lastAggregation = 0;
  }

  getSnapshot(): { aggregates: AggregatedMetric[]; lastAggregation: number; version: string } {
    return {
      aggregates: this.getAggregates(),
      lastAggregation: this._lastAggregation,
      version: 'V76',
    };
  }

  getReport(): string {
    const aggregates = this.getAggregates();
    const summaryLines = [
      `=== MetricsAggregator Report [${this._config.name}] ===`,
      `Aggregated Metrics: ${aggregates.length}`,
      `Time: ${new Date(this._lastAggregation).toISOString()}`,
      '--- Details ---',
    ];

    for (const agg of aggregates) {
      summaryLines.push(
        `  ${agg.name}: count=${agg.count}, avg=${agg.avg.toFixed(2)}, min=${agg.min}, max=${agg.max}`
      );
      if (agg.percentile) {
        const pLines = Object.entries(agg.percentile)
          .map(([p, v]) => `    p${p}=${v}`)
          .join(', ');
        summaryLines.push(`    percentiles: ${pLines}`);
      }
    }

    summaryLines.push('=== End Report ===');
    return summaryLines.join('\n');
  }

  exportMetrics(): { version: string; config: MetricsAggregatorConfig; aggregateCount: number } {
    return {
      version: 'V76',
      config: this._config,
      aggregateCount: this.getAggregates().length,
    };
  }

  private _buildAggregate(metrics: Metric[]): AggregatedMetric {
    const values = metrics.map((m) => m.value).sort((a, b) => a - b);
    const sum = values.reduce((acc, v) => acc + v, 0);
    return {
      name: metrics[0].name,
      count: values.length,
      sum,
      min: values[0],
      max: values[values.length - 1],
      avg: sum / values.length,
      tags: metrics[0].tags,
    };
  }
}