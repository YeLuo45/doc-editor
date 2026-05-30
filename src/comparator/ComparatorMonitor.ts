/**
 * ComparatorMonitor.ts - V135 Comparator Monitor
 * Tracks and monitors comparator operations
 */

export type ComparatorMonitorConfig = {
  maxHistorySize: number;
  enableMetrics: boolean;
  enableHistory: boolean;
  samplingRate: number;
};

export type MetricPoint = { timestamp: number; value: number; labels?: Record<string, string> };
export type ComparatorMetrics = { comparisonsTotal: number; comparisonsPerSecond: number; averageDuration: number; successRate: number; errorRate: number };

export type ComparatorMonitorStats = { totalTracked: number; activeTrackers: number; totalMetricsEmitted: number; historySize: number };
export type TrackerEntry = { id: string; name: string; startTime: number; endTime?: number; metadata?: Record<string, unknown> };

export class ComparatorMonitor {
  config: ComparatorMonitorConfig;
  private history: TrackerEntry[] = [];
  private metricsBuffer: MetricPoint[] = [];
  private totalTracked: number = 0;
  private activeTrackers: number = 0;
  private totalMetricsEmitted: number = 0;
  private comparisonCount: number = 0;
  private totalDuration: number = 0;
  private successCount: number = 0;
  private errorCount: number = 0;

  constructor(config: ComparatorMonitorConfig) {
    this.config = { ...config };
  }

  track(id: string, name: string, metadata?: Record<string, unknown>): TrackerEntry {
    this.totalTracked++;
    this.activeTrackers++;
    const entry: TrackerEntry = { id, name, startTime: Date.now(), metadata };
    if (this.config.enableHistory) { this.history.push(entry); this.trimHistory(); }
    return entry;
  }

  complete(id: string): void {
    const entry = this.history.find(e => e.id === id);
    if (entry) { entry.endTime = Date.now(); this.activeTrackers--; }
  }

  recordMetric(name: string, value: number, labels?: Record<string, string>): void {
    if (!this.config.enableMetrics) return;
    this.metricsBuffer.push({ timestamp: Date.now(), value, labels });
    this.totalMetricsEmitted++;
    if (name === 'comparison') { this.comparisonCount++; this.totalDuration += value; }
    else if (name === 'success') this.successCount++;
    else if (name === 'error') this.errorCount++;
  }

  getMetrics(): ComparatorMetrics {
    const now = Date.now();
    const recentMetrics = this.metricsBuffer.filter(m => now - m.timestamp < 60000);
    return {
      comparisonsTotal: this.comparisonCount,
      comparisonsPerSecond: recentMetrics.length / 60,
      averageDuration: this.comparisonCount > 0 ? this.totalDuration / this.comparisonCount : 0,
      successRate: this.comparisonCount > 0 ? this.successCount / this.comparisonCount : 0,
      errorRate: this.comparisonCount > 0 ? this.errorCount / this.comparisonCount : 0,
    };
  }

  getHistory(limit?: number): TrackerEntry[] { return limit ? this.history.slice(-limit) : [...this.history]; }

  getStatus(): Record<string, unknown> {
    return { isActive: this.activeTrackers > 0, totalTracked: this.totalTracked, activeTrackers: this.activeTrackers, historySize: this.history.length };
  }

  private trimHistory(): void { if (this.history.length > this.config.maxHistorySize) this.history = this.history.slice(-this.config.maxHistorySize); }

  getStats(): ComparatorMonitorStats {
    return { totalTracked: this.totalTracked, activeTrackers: this.activeTrackers, totalMetricsEmitted: this.totalMetricsEmitted, historySize: this.history.length };
  }

  getSnapshot(): { metrics: ComparatorMonitorStats; timestamp: number } {
    return { metrics: this.getStats(), timestamp: Date.now() };
  }

  reset(): void {
    this.history = [];
    this.metricsBuffer = [];
    this.totalTracked = 0;
    this.activeTrackers = 0;
    this.totalMetricsEmitted = 0;
    this.comparisonCount = 0;
    this.totalDuration = 0;
    this.successCount = 0;
    this.errorCount = 0;
  }

  getReport(): string {
    const s = this.getSnapshot();
    const m = this.getMetrics();
    return [`=== Comparator Monitor Report ===`, `Tracked: ${s.metrics.totalTracked}`, `Active: ${s.metrics.activeTrackers}`, `Metrics: ${s.metrics.totalMetricsEmitted}`, `Comparisons: ${m.comparisonsTotal}`, `Rate: ${m.comparisonsPerSecond.toFixed(2)}/s`, `Avg: ${m.averageDuration.toFixed(2)}ms`, `Success: ${(m.successRate * 100).toFixed(1)}%`, `Error: ${(m.errorRate * 100).toFixed(1)}%`, `Time: ${new Date(s.timestamp).toISOString()}`].join('\n');
  }

  exportMetrics(): { version: string } & ComparatorMonitorStats & ComparatorMetrics {
    return { version: 'V135', ...this.getStats(), ...this.getMetrics() };
  }
}