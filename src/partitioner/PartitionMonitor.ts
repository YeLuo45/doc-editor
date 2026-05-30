/**
 * V109 PartitionMonitor Module
 * Monitors partition health and performance metrics
 */

export interface MonitorConfig {
  interval: number;
  retentionPeriod: number;
  enabled: boolean;
  alertThreshold?: number;
}

export interface PartitionMetric {
  partitionId: string;
  timestamp: Date;
  size: number;
  itemCount: number;
  loadFactor: number;
}

export interface MonitorStatus {
  isHealthy: boolean;
  lastCheck: Date | null;
  totalMetrics: number;
  alertCount: number;
}

export type MonitorStats = {
  trackedPartitions: number;
  totalMetricsCollected: number;
  averageLoadFactor: number;
  checksPerformed: number;
};

export class PartitionMonitor {
  private _metrics: Map<string, PartitionMetric[]> = new Map();
  private _config: MonitorConfig;
  private _checksPerformed: number = 0;
  private _lastCheck: Date | null = null;

  constructor(config: MonitorConfig) {
    this._config = {
      ...config,
      alertThreshold: config.alertThreshold ?? 0.8,
    };
  }

  get config(): MonitorConfig {
    return { ...this._config };
  }

  get metrics(): Map<string, PartitionMetric[]> {
    return new Map(this._metrics);
  }

  /**
   * Track metrics for a partition
   */
  track(partitionId: string, size: number, itemCount: number): void {
    const loadFactor = size > 0 ? itemCount / size : 0;

    const metric: PartitionMetric = {
      partitionId,
      timestamp: new Date(),
      size,
      itemCount,
      loadFactor,
    };

    const existing = this._metrics.get(partitionId) || [];
    existing.push(metric);

    // Apply retention policy
    const cutoff = Date.now() - this._config.retentionPeriod;
    const filtered = existing.filter((m) => m.timestamp.getTime() > cutoff);
    this._metrics.set(partitionId, filtered);

    this._lastCheck = new Date();
    this._checksPerformed++;
  }

  /**
   * Get metrics for a specific partition
   */
  getMetrics(partitionId?: string): PartitionMetric[] {
    if (partitionId) {
      return this._metrics.get(partitionId) || [];
    }
    const all: PartitionMetric[] = [];
    this._metrics.forEach((metrics) => {
      all.push(...metrics);
    });
    return all;
  }

  /**
   * Get metrics history
   */
  getHistory(partitionId: string, limit?: number): PartitionMetric[] {
    const metrics = this._metrics.get(partitionId) || [];
    return metrics.slice(-(limit ?? metrics.length));
  }

  /**
   * Get current monitor status
   */
  getStatus(): MonitorStatus {
    let totalMetrics = 0;
    let alertCount = 0;

    this._metrics.forEach((metrics) => {
      totalMetrics += metrics.length;
      const latest = metrics[metrics.length - 1];
      if (latest && latest.loadFactor > (this._config.alertThreshold ?? 0.8)) {
        alertCount++;
      }
    });

    return {
      isHealthy: alertCount === 0,
      lastCheck: this._lastCheck,
      totalMetrics,
      alertCount,
    };
  }

  /**
   * Get overall monitoring statistics
   */
  getStats(): MonitorStats {
    let totalMetricsCollected = 0;
    let totalLoadFactor = 0;
    let partitionCount = 0;

    this._metrics.forEach((metrics) => {
      totalMetricsCollected += metrics.length;
      partitionCount++;
      if (metrics.length > 0) {
        const latest = metrics[metrics.length - 1];
        totalLoadFactor += latest.loadFactor;
      }
    });

    return {
      trackedPartitions: partitionCount,
      totalMetricsCollected,
      averageLoadFactor: partitionCount > 0 ? totalLoadFactor / partitionCount : 0,
      checksPerformed: this._checksPerformed,
    };
  }

  /**
   * Get current snapshot
   */
  getSnapshot(): { metrics: MonitorStats; config: MonitorConfig } {
    return {
      metrics: this.getStats(),
      config: this.config,
    };
  }

  /**
   * Reset all tracked metrics
   */
  reset(): void {
    this._metrics.clear();
    this._checksPerformed = 0;
    this._lastCheck = null;
  }

  /**
   * Generate a text report
   */
  getReport(): string {
    const status = this.getStatus();
    const stats = this.getStats();
    const lines = [
      `Partition Monitor Report`,
      `Interval: ${this._config.interval}ms`,
      `Retention Period: ${this._config.retentionPeriod}ms`,
      `Alert Threshold: ${this._config.alertThreshold ?? 0.8}`,
      `---`,
      `Health Status: ${status.isHealthy ? 'Healthy' : 'Unhealthy'}`,
      `Last Check: ${status.lastCheck?.toISOString() || 'Never'}`,
      `Alert Count: ${status.alertCount}`,
      `---`,
      `Tracked Partitions: ${stats.trackedPartitions}`,
      `Total Metrics Collected: ${stats.totalMetricsCollected}`,
      `Average Load Factor: ${stats.averageLoadFactor.toFixed(4)}`,
      `Checks Performed: ${stats.checksPerformed}`,
      `---`,
      `Partition Details:`,
    ];

    this._metrics.forEach((metrics, partitionId) => {
      const latest = metrics[metrics.length - 1];
      if (latest) {
        lines.push(
          `  [${partitionId}] Load: ${latest.loadFactor.toFixed(4)}, Items: ${latest.itemCount}`
        );
      }
    });

    return lines.join('\n');
  }

  /**
   * Export metrics in standardized format
   */
  exportMetrics(): {
    version: string;
    timestamp: string;
    stats: MonitorStats;
    config: MonitorConfig;
    status: MonitorStatus;
  } {
    return {
      version: '1.0.9',
      timestamp: new Date().toISOString(),
      stats: this.getStats(),
      config: this.config,
      status: this.getStatus(),
    };
  }
}