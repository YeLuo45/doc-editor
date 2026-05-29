/**
 * TelemetryAggregator - V64 Telemetry System
 * Aggregates and summarizes metric data for analysis
 */

export interface AggregatorConfig {
  aggregationWindow: number;
  retentionPeriod: number;
  precision: number;
  enabled: boolean;
  serviceName: string;
}

export interface AggregatedMetric {
  name: string;
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  timestamp: number;
}

export interface RollupResult {
  period: number;
  metrics: AggregatedMetric[];
  totalCount: number;
}

export class TelemetryAggregator {
  private aggregated: Map<string, AggregatedMetric[]> = new Map();
  private config: AggregatorConfig;
  private totalProcessed: number = 0;

  constructor(config: AggregatorConfig) {
    this.config = { ...config };
    this.aggregated = new Map();
    this.totalProcessed = 0;
  }

  /**
   * Aggregate a metric into the aggregation store
   */
  aggregate(name: string, value: number, timestamp?: number): void {
    if (!this.config.enabled) return;

    const ts = timestamp || Date.now();
    const key = `${name}_${Math.floor(ts / this.config.aggregationWindow)}`;

    if (!this.aggregated.has(name)) {
      this.aggregated.set(name, []);
    }

    const metrics = this.aggregated.get(name)!;
    const existing = metrics.find(m => m.name === name);

    if (existing) {
      existing.count++;
      existing.sum += value;
      existing.min = Math.min(existing.min, value);
      existing.max = Math.max(existing.max, value);
      existing.avg = this.round(existing.sum / existing.count);
    } else {
      metrics.push({
        name,
        count: 1,
        sum: value,
        min: value,
        max: value,
        avg: this.round(value),
        timestamp: ts
      });
    }

    this.totalProcessed++;
  }

  /**
   * Create a rollup summary for a time period
   */
  rollup(windowMs?: number): RollupResult {
    const window = windowMs || this.config.aggregationWindow;
    const now = Date.now();
    const cutoff = now - window;

    const allMetrics: AggregatedMetric[] = [];

    this.aggregated.forEach((metrics) => {
      metrics.forEach(m => {
        if (m.timestamp >= cutoff) {
          allMetrics.push(m);
        }
      });
    });

    return {
      period: window,
      metrics: allMetrics,
      totalCount: allMetrics.reduce((sum, m) => sum + m.count, 0)
    };
  }

  /**
   * Get all aggregated metrics
   */
  getAggregates(): Map<string, AggregatedMetric[]> {
    return new Map(this.aggregated);
  }

  /**
   * Get a summary of all aggregated data
   */
  getSummary(): {
    metricCount: number;
    totalProcessed: number;
    window: number;
    precision: number;
    aggregates: Record<string, AggregatedMetric[]>;
  } {
    const result: Record<string, AggregatedMetric[]> = {};
    this.aggregated.forEach((value, key) => {
      result[key] = [...value];
    });

    return {
      metricCount: this.aggregated.size,
      totalProcessed: this.totalProcessed,
      window: this.config.aggregationWindow,
      precision: this.config.precision,
      aggregates: result
    };
  }

  /**
   * Get a snapshot of current aggregator state
   */
  getSnapshot(): { metricCount: number; totalProcessed: number; aggregates: unknown } {
    return {
      metricCount: this.aggregated.size,
      totalProcessed: this.totalProcessed,
      aggregates: Object.fromEntries(this.aggregated)
    };
  }

  /**
   * Reset the aggregator state
   */
  reset(): void {
    this.aggregated.clear();
    this.totalProcessed = 0;
  }

  /**
   * Generate a text report of aggregator state
   */
  getReport(): string {
    const lines = [
      `TelemetryAggregator Report`,
      `============================`,
      `Service: ${this.config.serviceName}`,
      `Enabled: ${this.config.enabled}`,
      `Aggregation Window: ${this.config.aggregationWindow}ms`,
      `Retention Period: ${this.config.retentionPeriod}ms`,
      `Precision: ${this.config.precision}`,
      `Total Processed: ${this.totalProcessed}`,
      `Unique Metrics: ${this.aggregated.size}`,
      `Aggregates:`
    ];

    this.aggregated.forEach((metrics, name) => {
      lines.push(`  ${name}: ${metrics.length} entries`);
      metrics.forEach(m => {
        lines.push(`    avg=${m.avg}, min=${m.min}, max=${m.max}, count=${m.count}`);
      });
    });

    return lines.join('\n');
  }

  /**
   * Export metrics in a standardized format
   */
  exportMetrics(): { version: string; exportedAt: string; totalProcessed: number; aggregates: unknown } {
    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      totalProcessed: this.totalProcessed,
      aggregates: Object.fromEntries(this.aggregated)
    };
  }

  private round(value: number): number {
    const factor = Math.pow(10, this.config.precision);
    return Math.round(value * factor) / factor;
  }
}