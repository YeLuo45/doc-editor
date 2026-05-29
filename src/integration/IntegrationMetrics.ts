/**
 * IntegrationMetrics.ts - Metrics Collection and Export
 * V30 Integration Hub for doc-editor
 */

export interface MetricEntry {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface MetricSummary {
  total: number;
  average: number;
  min: number;
  max: number;
  count: number;
}

export class IntegrationMetrics {
  private metrics: Map<string, MetricEntry[]> = new Map();
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private history: MetricEntry[] = [];
  private snapshots: Record<string, unknown>[] = [];

  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    const entry: MetricEntry = {
      name,
      value,
      timestamp: Date.now(),
      tags,
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(entry);
    this.history.push(entry);
  }

  incrementCounter(name: string, delta = 1): void {
    this.counters.set(name, (this.counters.get(name) ?? 0) + delta);
  }

  setGauge(name: string, value: number): void {
    this.gauges.set(name, value);
  }

  getMetrics(name: string): MetricEntry[] {
    return this.metrics.get(name) ?? [];
  }

  getHistory(limit?: number): MetricEntry[] {
    if (limit) {
      return this.history.slice(-limit);
    }
    return [...this.history];
  }

  getSummary(name: string): MetricSummary | null {
    const entries = this.metrics.get(name);
    if (!entries || entries.length === 0) return null;

    const values = entries.map((e) => e.value);
    return {
      total: values.reduce((a, b) => a + b, 0),
      average: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
    };
  }

  getCounter(name: string): number {
    return this.counters.get(name) ?? 0;
  }

  getGauge(name: string): number | undefined {
    return this.gauges.get(name);
  }

  exportMetrics(): Record<string, unknown> {
    return {
      metrics: Object.fromEntries(this.metrics),
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      totalEntries: this.history.length,
      metricNames: Array.from(this.metrics.keys()),
    };
  }

  clear(): void {
    this.metrics.clear();
    this.history = [];
  }

  getSnapshot(): Record<string, unknown> {
    const snapshot = {
      metricCount: this.metrics.size,
      counterCount: this.counters.size,
      gaugeCount: this.gauges.size,
      historySize: this.history.length,
      timestamp: Date.now(),
    };
    this.snapshots.push(snapshot);
    return snapshot;
  }

  reset(): void {
    this.metrics.clear();
    this.counters.clear();
    this.gauges.clear();
    this.history = [];
    this.snapshots = [];
  }

  getReport(): Record<string, unknown> {
    const summaries: Record<string, MetricSummary | null> = {};
    for (const name of this.metrics.keys()) {
      summaries[name] = this.getSummary(name);
    }
    return {
      metricCount: this.metrics.size,
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      summaries,
    };
  }
}

export default IntegrationMetrics;