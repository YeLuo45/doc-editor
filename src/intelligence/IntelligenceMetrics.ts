/**
 * IntelligenceMetrics - Metrics collection and export for doc-editor V28
 * Provides getMetrics, getHistory, and exportMetrics capabilities
 */

export interface MetricEntry {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface MetricsSnapshot {
  totalMetrics: number;
  metricsByName: Record<string, number>;
  recentEntries: MetricEntry[];
  averageValue: number;
  lastUpdate: number;
}

export interface MetricsHistory {
  entries: MetricEntry[];
  timeRange: { start: number; end: number };
  statistics: {
    count: number;
    min: number;
    max: number;
    mean: number;
    stdDev: number;
  };
}

export interface Snapshot {
  totalEntries: number;
  uniqueMetricNames: number;
  averageEntriesPerMetric: number;
  lastExport: number;
  historyRetention: number;
}

export class IntelligenceMetrics {
  private entries: MetricEntry[] = [];
  private lastExportTime: number = 0;
  private historyRetentionMs: number = 24 * 60 * 60 * 1000;

  constructor(options?: { retentionMs?: number }) {
    this.historyRetentionMs = options?.retentionMs ?? this.historyRetentionMs;
    this.lastExportTime = Date.now();
  }

  /**
   * Get current metrics for specified names
   */
  getMetrics(options?: {
    names?: string[];
    since?: number;
    tags?: Record<string, string>;
  }): Record<string, MetricEntry[]> {
    let filtered = [...this.entries];

    if (options?.names && options.names.length > 0) {
      filtered = filtered.filter(e => options.names!.includes(e.name));
    }

    if (options?.since) {
      filtered = filtered.filter(e => e.timestamp >= options.since!);
    }

    if (options?.tags) {
      filtered = filtered.filter(e => {
        for (const [key, value] of Object.entries(options.tags!)) {
          if (e.tags?.[key] !== value) return false;
        }
        return true;
      });
    }

    const result: Record<string, MetricEntry[]> = {};
    for (const entry of filtered) {
      if (!result[entry.name]) {
        result[entry.name] = [];
      }
      result[entry.name].push(entry);
    }

    return result;
  }

  /**
   * Get metrics history within time range
   */
  getHistory(options?: {
    name?: string;
    start?: number;
    end?: number;
    limit?: number;
  }): MetricsHistory {
    let filtered = [...this.entries];

    if (options?.name) {
      filtered = filtered.filter(e => e.name === options.name);
    }

    if (options?.start) {
      filtered = filtered.filter(e => e.timestamp >= options.start!);
    }

    if (options?.end) {
      filtered = filtered.filter(e => e.timestamp <= options.end!);
    }

    filtered.sort((a, b) => b.timestamp - a.timestamp);

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    const values = filtered.map(e => e.value);
    const stats = this.calculateStatistics(values);

    return {
      entries: filtered,
      timeRange: {
        start: options?.start ?? filtered[filtered.length - 1]?.timestamp ?? Date.now(),
        end: options?.end ?? Date.now(),
      },
      statistics: stats,
    };
  }

  /**
   * Export all metrics for external analysis
   */
  exportMetrics(options?: {
    format?: 'json' | 'csv';
    names?: string[];
    includeMetadata?: boolean;
  }): string {
    this.lastExportTime = Date.now();
    let data = [...this.entries];

    if (options?.names && options.names.length > 0) {
      data = data.filter(e => options.names!.includes(e.name));
    }

    if (options?.format === 'csv') {
      return this.exportAsCSV(data, options.includeMetadata);
    }

    return JSON.stringify({
      exportedAt: Date.now(),
      count: data.length,
      metrics: data,
      metadata: options?.includeMetadata ? this.generateMetadata() : undefined,
    }, null, 2);
  }

  /**
   * Record a new metric entry
   */
  record(name: string, value: number, options?: {
    unit?: string;
    tags?: Record<string, string>;
  }): MetricEntry {
    const entry: MetricEntry = {
      id: `metric-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      value,
      unit: options?.unit ?? 'count',
      timestamp: Date.now(),
      tags: options?.tags,
    };

    this.entries.push(entry);
    this.cleanupOldEntries();
    return entry;
  }

  /**
   * Get current state snapshot
   */
  getSnapshot(): Snapshot {
    const byName = this.countByName();
    return {
      totalEntries: this.entries.length,
      uniqueMetricNames: Object.keys(byName).length,
      averageEntriesPerMetric: this.entries.length / Math.max(1, Object.keys(byName).length),
      lastExport: this.lastExportTime,
      historyRetention: this.historyRetentionMs,
    };
  }

  /**
   * Reset metrics state
   */
  reset(): void {
    this.entries = [];
    this.lastExportTime = Date.now();
  }

  /**
   * Generate comprehensive report
   */
  getReport(): {
    metrics: string;
    version: string;
    snapshot: Snapshot;
    summary: MetricsSnapshot;
    statistics: Record<string, unknown>;
  } {
    const byName = this.countByName();
    const recentEntries = this.entries.slice(-50);

    return {
      metrics: 'IntelligenceMetrics',
      version: 'V28',
      snapshot: this.getSnapshot(),
      summary: {
        totalMetrics: this.entries.length,
        metricsByName: byName,
        recentEntries: recentEntries.slice(-10),
        averageValue: this.calculateAverageValue(),
        lastUpdate: this.entries[this.entries.length - 1]?.timestamp ?? Date.now(),
      },
      statistics: {
        byName,
        byUnit: this.countByUnit(),
        totalTags: this.countTotalTags(),
      },
    };
  }

  /**
   * Export metrics summary
   */
  exportMetricsSummary(): Record<string, unknown> {
    return {
      metrics: 'IntelligenceMetrics',
      version: 'V28',
      timestamp: Date.now(),
      snapshot: this.getSnapshot(),
      summary: {
        totalEntries: this.entries.length,
        byName: this.countByName(),
        averageValue: this.calculateAverageValue(),
      },
    };
  }

  // Private helper methods
  private cleanupOldEntries(): void {
    const cutoff = Date.now() - this.historyRetentionMs;
    this.entries = this.entries.filter(e => e.timestamp >= cutoff);
  }

  private calculateStatistics(values: number[]): MetricsHistory['statistics'] {
    if (values.length === 0) {
      return { count: 0, min: 0, max: 0, mean: 0, stdDev: 0 };
    }

    const count = values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const mean = values.reduce((a, b) => a + b, 0) / count;
    const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / count;
    const stdDev = Math.sqrt(variance);

    return { count, min, max, mean, stdDev };
  }

  private countByName(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const entry of this.entries) {
      counts[entry.name] = (counts[entry.name] ?? 0) + 1;
    }
    return counts;
  }

  private countByUnit(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const entry of this.entries) {
      counts[entry.unit] = (counts[entry.unit] ?? 0) + 1;
    }
    return counts;
  }

  private countTotalTags(): number {
    let total = 0;
    for (const entry of this.entries) {
      if (entry.tags) {
        total += Object.keys(entry.tags).length;
      }
    }
    return total;
  }

  private calculateAverageValue(): number {
    if (this.entries.length === 0) return 0;
    return this.entries.reduce((sum, e) => sum + e.value, 0) / this.entries.length;
  }

  private generateMetadata(): Record<string, unknown> {
    return {
      retentionMs: this.historyRetentionMs,
      oldestEntry: this.entries[0]?.timestamp ?? null,
      newestEntry: this.entries[this.entries.length - 1]?.timestamp ?? null,
      uniqueNames: Object.keys(this.countByName()).length,
    };
  }

  private exportAsCSV(entries: MetricEntry[], includeMetadata?: boolean): string {
    const headers = ['id', 'name', 'value', 'unit', 'timestamp'];
    if (includeMetadata) {
      headers.push('tags');
    }

    const rows = entries.map(e => {
      const row = [e.id, e.name, e.value.toString(), e.unit, e.timestamp.toString()];
      if (includeMetadata && e.tags) {
        row.push(JSON.stringify(e.tags));
      }
      return row.join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}