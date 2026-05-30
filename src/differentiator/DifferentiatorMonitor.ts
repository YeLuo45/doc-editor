/**
 * DifferentiatorMonitor.ts - V136 Differentiator Monitor
 * Monitors differentiation operations and tracks metrics
 */

export type DifferentiatorMonitorConfig = {
  maxHistorySize: number;
  enableMetrics: boolean;
  enableHistory: boolean;
  samplingRate: number;
};

export type TrackingEntry = {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  metrics?: Record<string, number>;
};

export type DifferentiatorMonitorStats = {
  totalTracked: number;
  activeTrackers: number;
  completedTrackers: number;
  totalMetricsRecorded: number;
};

export type DifferentiatorMonitorMetrics = {
  comparisonsTotal: number;
  differencesTotal: number;
  averageDuration: number;
  successRate: number;
};

export class DifferentiatorMonitor {
  config: DifferentiatorMonitorConfig;
  private tracking: Map<string, TrackingEntry> = new Map();
  private history: TrackingEntry[] = [];
  private metrics: Map<string, number> = new Map();
  private totalTracked: number = 0;
  private completedTrackers: number = 0;

  constructor(config: DifferentiatorMonitorConfig) {
    this.config = { ...config };
  }

  track(id: string, name: string): TrackingEntry {
    const entry: TrackingEntry = { id, name, startTime: Date.now() };
    this.tracking.set(id, entry);
    this.totalTracked++;
    return entry;
  }

  complete(id: string): void {
    const entry = this.tracking.get(id);
    if (entry) {
      entry.endTime = Date.now();
      this.completedTrackers++;
      this.tracking.delete(id);
      if (this.config.enableHistory) {
        this.history.push(entry);
        if (this.history.length > this.config.maxHistorySize) {
          this.history.shift();
        }
      }
    }
  }

  recordMetric(name: string, value: number): void {
    if (this.config.enableMetrics) {
      this.metrics.set(name, value);
    }
  }

  getMetrics(): DifferentiatorMonitorMetrics {
    const comparisonsTotal = this.metrics.get('comparisonsTotal') || 0;
    const differencesTotal = this.metrics.get('differencesTotal') || 0;
    const successRate = comparisonsTotal > 0 ? (comparisonsTotal - differencesTotal) / comparisonsTotal : 0;
    const durations = this.history.filter(e => e.endTime).map(e => e.endTime! - e.startTime);
    const averageDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    return { comparisonsTotal, differencesTotal, averageDuration, successRate };
  }

  getHistory(limit?: number): TrackingEntry[] {
    if (limit) return this.history.slice(-limit);
    return [...this.history];
  }

  getStatus(): { isActive: boolean; totalTracked: number; activeTrackers: number } {
    return {
      isActive: this.tracking.size > 0,
      totalTracked: this.totalTracked,
      activeTrackers: this.tracking.size,
    };
  }

  getStats(): DifferentiatorMonitorStats {
    return {
      totalTracked: this.totalTracked,
      activeTrackers: this.tracking.size,
      completedTrackers: this.completedTrackers,
      totalMetricsRecorded: this.metrics.size,
    };
  }

  getSnapshot(): { stats: DifferentiatorMonitorStats; timestamp: number } {
    return { stats: this.getStats(), timestamp: Date.now() };
  }

  reset(): void {
    this.tracking.clear();
    this.history = [];
    this.metrics.clear();
    this.totalTracked = 0;
    this.completedTrackers = 0;
  }

  getReport(): string {
    const s = this.getSnapshot();
    const m = this.getMetrics();
    return [
      `=== Differentiator Monitor Report ===`,
      `Total Tracked: ${s.stats.totalTracked}`,
      `Active: ${s.stats.activeTrackers}`,
      `Completed: ${s.stats.completedTrackers}`,
      `Success Rate: ${(m.successRate * 100).toFixed(1)}%`,
      `Time: ${new Date(s.timestamp).toISOString()}`,
    ].join('\n');
  }

  exportMetrics(): { version: string } & DifferentiatorMonitorStats {
    return { version: 'V136', ...this.getStats() };
  }
}