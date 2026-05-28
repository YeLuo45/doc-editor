/**
 * V25 Offline-first Sync Engine - Metrics Module
 * Track and export sync metrics and history
 */

export interface MetricPoint {
  timestamp: number;
  value: number;
  labels?: Record<string, string>;
}

export interface SyncMetricsData {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  totalConflicts: number;
  averageSyncDuration: number;
  lastSyncStart: number | null;
  lastSyncEnd: number | null;
}

export interface MetricsConfig {
  maxHistoryPoints: number;
  retentionPeriod: number; // milliseconds
}

export class SyncMetrics {
  private metrics: SyncMetricsData;
  private history: Map<string, MetricPoint[]> = new Map();
  private config: MetricsConfig;

  constructor(config?: Partial<MetricsConfig>) {
    this.metrics = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      totalConflicts: 0,
      averageSyncDuration: 0,
      lastSyncStart: null,
      lastSyncEnd: null,
    };
    this.config = {
      maxHistoryPoints: config?.maxHistoryPoints ?? 1000,
      retentionPeriod: config?.retentionPeriod ?? 86400000, // 24 hours
    };
  }

  /**
   * Record a sync operation
   */
  recordSync(success: boolean, duration: number, conflicts: number = 0): void {
    this.metrics.totalSyncs++;
    if (success) {
      this.metrics.successfulSyncs++;
    } else {
      this.metrics.failedSyncs++;
    }
    this.metrics.totalConflicts += conflicts;
    this.metrics.lastSyncStart = Date.now() - duration;
    this.metrics.lastSyncEnd = Date.now();

    // Update running average
    const totalDuration = this.metrics.averageSyncDuration * (this.metrics.totalSyncs - 1);
    this.metrics.averageSyncDuration = (totalDuration + duration) / this.metrics.totalSyncs;

    // Add to history
    this.addToHistory('syncDuration', duration);
    this.addToHistory('syncSuccess', success ? 1 : 0);
    this.addToHistory('syncConflicts', conflicts);
  }

  /**
   * Get current metrics
   */
  getMetrics(): SyncMetricsData {
    return { ...this.metrics };
  }

  /**
   * Get history for a specific metric
   */
  getHistory(metricName: string): MetricPoint[] {
    const history = this.history.get(metricName);
    if (!history) return [];

    // Filter by retention period
    const cutoff = Date.now() - this.config.retentionPeriod;
    return history.filter(point => point.timestamp >= cutoff);
  }

  /**
   * Get all metric histories
   */
  getAllHistory(): Record<string, MetricPoint[]> {
    const result: Record<string, MetricPoint[]> = {};
    for (const [name, points] of this.history) {
      result[name] = this.getHistory(name);
    }
    return result;
  }

  /**
   * Get a specific metric value at a point in time
   */
  getMetricAtTime(metricName: string, timestamp: number): number | null {
    const history = this.history.get(metricName);
    if (!history) return null;

    // Find closest point before timestamp
    let closest: MetricPoint | null = null;
    for (const point of history) {
      if (point.timestamp > timestamp) continue;
      if (!closest || point.timestamp > closest.timestamp) {
        closest = point;
      }
    }
    return closest?.value ?? null;
  }

  /**
   * Calculate success rate
   */
  getSuccessRate(): number {
    if (this.metrics.totalSyncs === 0) return 0;
    return this.metrics.successfulSyncs / this.metrics.totalSyncs;
  }

  /**
   * Calculate average conflicts per sync
   */
  getAverageConflicts(): number {
    if (this.metrics.totalSyncs === 0) return 0;
    return this.metrics.totalConflicts / this.metrics.totalSyncs;
  }

  /**
   * Get current snapshot for debugging
   */
  getSnapshot(): object {
    return {
      metrics: { ...this.metrics },
      historyLength: Array.from(this.history.values()).reduce((sum, h) => sum + h.length, 0),
      config: { ...this.config },
    };
  }

  /**
   * Reset metrics to initial state
   */
  reset(): void {
    this.metrics = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      totalConflicts: 0,
      averageSyncDuration: 0,
      lastSyncStart: null,
      lastSyncEnd: null,
    };
    this.history.clear();
  }

  /**
   * Get a report of metrics state
   */
  getReport(): object {
    return {
      metrics: { ...this.metrics },
      successRate: this.getSuccessRate(),
      averageConflicts: this.getAverageConflicts(),
      historyMetrics: Array.from(this.history.keys()),
    };
  }

  /**
   * Export metrics for external monitoring
   */
  exportMetrics(): object {
    return {
      ...this.metrics,
      successRate: this.getSuccessRate(),
      averageConflicts: this.getAverageConflicts(),
      historyPoints: Array.from(this.history.values()).reduce((sum, h) => sum + h.length, 0),
      calculatedAt: Date.now(),
    };
  }

  private addToHistory(metricName: string, value: number, labels?: Record<string, string>): void {
    if (!this.history.has(metricName)) {
      this.history.set(metricName, []);
    }

    const points = this.history.get(metricName)!;
    points.push({ timestamp: Date.now(), value, labels });

    // Trim if exceeds max
    if (points.length > this.config.maxHistoryPoints) {
      points.splice(0, points.length - this.config.maxHistoryPoints);
    }
  }
}

export default SyncMetrics;