/**
 * V67 Analytics Engine - AnalyticsAggregator
 * Aggregates and processes analytics data
 */

export type AggregationConfig = {
  timeWindow: number;
  groupingEnabled: boolean;
  retentionDays: number;
  precision: number;
};

export type AggregatedData = {
  key: string;
  value: number;
  timestamp: number;
  metadata: Record<string, unknown>;
};

export type AggregateSummary = {
  totalValue: number;
  count: number;
  average: number;
  min: number;
  max: number;
};

export class AnalyticsAggregator {
  config: AggregationConfig;
  private data: Map<string, AggregatedData[]> = new Map();
  private summaries: Map<string, AggregateSummary> = new Map();

  constructor(config: AggregationConfig) {
    this.config = config;
  }

  aggregate(key: string, value: number, metadata: Record<string, unknown> = {}): void {
    const timestamp = Date.now();
    const entry: AggregatedData = {
      key,
      value,
      timestamp,
      metadata,
    };

    if (!this.data.has(key)) {
      this.data.set(key, []);
    }
    this.data.get(key)!.push(entry);
    this.recalculateSummary(key);
  }

  getAggregates(key: string): AggregatedData[] {
    return this.data.get(key) || [];
  }

  getSummary(key: string): AggregateSummary | null {
    return this.summaries.get(key) || null;
  }

  private recalculateSummary(key: string): void {
    const entries = this.data.get(key) || [];
    if (entries.length === 0) {
      this.summaries.delete(key);
      return;
    }

    const values = entries.map(e => e.value);
    const totalValue = values.reduce((sum, v) => sum + v, 0);
    const count = values.length;
    const average = totalValue / count;
    const min = Math.min(...values);
    const max = Math.max(...values);

    this.summaries.set(key, {
      totalValue: Math.round(totalValue * this.config.precision) / this.config.precision,
      count,
      average: Math.round(average * this.config.precision) / this.config.precision,
      min,
      max,
    });
  }

  getSnapshots(): Map<string, AggregatedData[]> {
    const snapshots = new Map<string, AggregatedData[]>();
    this.data.forEach((value, key) => {
      snapshots.set(key, [...value]);
    });
    return snapshots;
  }

  exportData(): { key: string; data: AggregatedData[]; summary: AggregateSummary | null }[] {
    const result: { key: string; data: AggregatedData[]; summary: AggregateSummary | null }[] = [];
    
    this.data.forEach((data, key) => {
      result.push({
        key,
        data: [...data],
        summary: this.summaries.get(key) || null,
      });
    });

    return result;
  }

  getSnapshot(): { dataPoints: number; keys: number } {
    let totalDataPoints = 0;
    this.data.forEach(entries => {
      totalDataPoints += entries.length;
    });

    return {
      dataPoints: totalDataPoints,
      keys: this.data.size,
    };
  }

  reset(): void {
    this.data.clear();
    this.summaries.clear();
  }

  getReport(): string {
    return JSON.stringify({
      config: this.config,
      keys: Array.from(this.data.keys()),
      summaries: Object.fromEntries(this.summaries),
      dataPoints: this.getSnapshot(),
    }, null, 2);
  }

  exportMetrics(): { version: string } {
    return {
      version: 'v67.0.0',
    };
  }
}