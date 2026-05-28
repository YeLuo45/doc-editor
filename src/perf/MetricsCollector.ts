/**
 * MetricsCollector.ts - Metrics collection and aggregation for doc-editor V22
 * Computes p50/p95/p99 latency, throughput, and error rates
 */

export interface MetricRecord {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface PercentileResult {
  p50: number;
  p95: number;
  p99: number;
}

export interface MetricsReport {
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
  percentiles: PercentileResult;
  throughput: number;
  errorRate: number;
}

export class MetricsCollector {
  private metrics: Map<string, MetricRecord[]> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private totalRequests: Map<string, number> = new Map();
  private startTime: number = Date.now();

  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push({
      name,
      value,
      timestamp: Date.now(),
      tags,
    });

    // Track request counts for throughput
    const current = this.totalRequests.get(name) || 0;
    this.totalRequests.set(name, current + 1);
  }

  recordError(name: string): void {
    const count = this.errorCounts.get(name) || 0;
    this.errorCounts.set(name, count + 1);
  }

  getPercentile(name: string, percentile: number): number {
    const records = this.metrics.get(name);
    if (!records || records.length === 0) return 0;

    const sorted = records.map(r => r.value).sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  getPercentiles(name: string): PercentileResult {
    return {
      p50: this.getPercentile(name, 50),
      p95: this.getPercentile(name, 95),
      p99: this.getPercentile(name, 99),
    };
  }

  getReport(name: string): MetricsReport {
    const records = this.metrics.get(name) || [];
    if (records.length === 0) {
      return {
        count: 0,
        sum: 0,
        avg: 0,
        min: 0,
        max: 0,
        percentiles: { p50: 0, p95: 0, p99: 0 },
        throughput: 0,
        errorRate: 0,
      };
    }

    const values = records.map(r => r.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const elapsed = (Date.now() - this.startTime) / 1000;
    const totalReqs = this.totalRequests.get(name) || 0;
    const errors = this.errorCounts.get(name) || 0;

    return {
      count: records.length,
      sum,
      avg: sum / records.length,
      min: Math.min(...values),
      max: Math.max(...values),
      percentiles: this.getPercentiles(name),
      throughput: elapsed > 0 ? totalReqs / elapsed : 0,
      errorRate: totalReqs > 0 ? errors / totalReqs : 0,
    };
  }

  getSnapshot(): {
    metricNames: string[];
    totalRecords: number;
    elapsed: number;
  } {
    return {
      metricNames: Array.from(this.metrics.keys()),
      totalRecords: Array.from(this.metrics.values()).reduce((sum, arr) => sum + arr.length, 0),
      elapsed: (Date.now() - this.startTime) / 1000,
    };
  }

  reset(): void {
    this.metrics.clear();
    this.errorCounts.clear();
    this.totalRequests.clear();
    this.startTime = Date.now();
  }

  exportMetrics(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const name of this.metrics.keys()) {
      result[name] = this.getReport(name);
    }
    return {
      timestamp: Date.now(),
      startTime: this.startTime,
      elapsed: (Date.now() - this.startTime) / 1000,
      metrics: result,
    };
  }

  getAllMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }

  getMetricRecords(name: string): MetricRecord[] {
    return this.metrics.get(name) || [];
  }

  clearMetric(name: string): void {
    this.metrics.delete(name);
    this.errorCounts.delete(name);
    this.totalRequests.delete(name);
  }
}

export const defaultMetricsCollector = new MetricsCollector();