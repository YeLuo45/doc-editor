/**
 * V116 BatcherMonitor - Monitor for tracking batcher metrics and health
 * Provides real-time monitoring, history tracking, and status reporting
 */

import { Batcher } from './Batcher';

export interface MonitorConfig {
  name: string;
  historySize: number;
  interval: number;
}

export interface MetricEntry {
  timestamp: number;
  batcherName: string;
  size: number;
  totalAdded: number;
  totalFlushed: number;
}

export interface MonitorStats {
  totalTracked: number;
  currentMetrics: number;
  historyLength: number;
}

export class BatcherMonitor {
  public config: MonitorConfig;
  private history: MetricEntry[] = [];
  private trackedBatchers: Map<string, Batcher> = new Map();
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(config: MonitorConfig) {
    this.config = { ...config };
    this.startMonitoring();
  }

  /**
   * Track a batcher
   */
  track(batcher: Batcher): void {
    this.trackedBatchers.set(batcher.config.name, batcher);
    this.recordMetric(batcher);
  }

  /**
   * Get current metrics for tracked batchers
   */
  getMetrics(): Map<string, MetricEntry> {
    const metrics = new Map<string, MetricEntry>();
    for (const [name, batcher] of this.trackedBatchers) {
      const stats = batcher.getStats();
      metrics.set(name, {
        timestamp: Date.now(),
        batcherName: name,
        size: stats.currentSize,
        totalAdded: stats.totalAdded,
        totalFlushed: stats.totalFlushed,
      });
    }
    return metrics;
  }

  /**
   * Get metric history
   */
  getHistory(limit?: number): MetricEntry[] {
    if (limit) {
      return this.history.slice(-limit);
    }
    return [...this.history];
  }

  /**
   * Get current status
   */
  getStatus(): { healthy: string[]; unhealthy: string[]; total: number } {
    const healthy: string[] = [];
    const unhealthy: string[] = [];

    for (const [name, batcher] of this.trackedBatchers) {
      const stats = batcher.getStats();
      if (stats.currentSize < batcher.config.maxSize && stats.totalAdded > 0) {
        healthy.push(name);
      } else if (stats.totalAdded === 0) {
        unhealthy.push(name);
      } else {
        healthy.push(name);
      }
    }

    return {
      healthy,
      unhealthy,
      total: this.trackedBatchers.size,
    };
  }

  /**
   * Get snapshot of monitor state
   */
  getSnapshot(): { metrics: MonitorStats; trackedCount: number; historyCount: number } {
    return {
      metrics: this.getStats(),
      trackedCount: this.trackedBatchers.size,
      historyCount: this.history.length,
    };
  }

  /**
   * Get statistics
   */
  getStats(): MonitorStats {
    return {
      totalTracked: this.trackedBatchers.size,
      currentMetrics: this.trackedBatchers.size,
      historyLength: this.history.length,
    };
  }

  /**
   * Reset monitor state
   */
  reset(): void {
    this.history = [];
    this.trackedBatchers.clear();
    this.stopMonitoring();
  }

  /**
   * Generate text report
   */
  getReport(): string {
    const status = this.getStatus();
    const snap = this.getSnapshot();
    return [
      `BatcherMonitor Report: ${this.config.name}`,
      `  Tracked batchers: ${snap.trackedCount}`,
      `  History entries: ${snap.historyCount}`,
      `  Healthy: ${status.healthy.length}`,
      `  Unhealthy: ${status.unhealthy.length}`,
      `  History size limit: ${this.config.historySize}`,
      `  Monitor interval: ${this.config.interval}ms`,
    ].join('\n');
  }

  /**
   * Export metrics
   */
  exportMetrics(): { version: string; name: string; stats: MonitorStats; history: MetricEntry[] } {
    return {
      version: '1.16.0',
      name: this.config.name,
      stats: this.getStats(),
      history: this.getHistory(),
    };
  }

  private startMonitoring(): void {
    if (this.config.interval > 0) {
      this.intervalId = setInterval(() => {
        for (const batcher of this.trackedBatchers.values()) {
          this.recordMetric(batcher);
        }
      }, this.config.interval);
    }
  }

  private stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private recordMetric(batcher: Batcher): void {
    const stats = batcher.getStats();
    const entry: MetricEntry = {
      timestamp: Date.now(),
      batcherName: batcher.config.name,
      size: stats.currentSize,
      totalAdded: stats.totalAdded,
      totalFlushed: stats.totalFlushed,
    };

    this.history.push(entry);

    if (this.history.length > this.config.historySize) {
      this.history = this.history.slice(-this.config.historySize);
    }
  }
}