/**
 * V126 ChunkerMonitor - Monitor for tracking chunker metrics and health
 * Provides real-time monitoring, history tracking, and status reporting
 */

import { Chunker } from './Chunker';

export interface MonitorConfig {
  name: string;
  historySize: number;
  interval: number;
}

export interface MetricEntry {
  timestamp: number;
  chunkerName: string;
  itemCount: number;
  chunkCount: number;
  totalItems: number;
  totalChunks: number;
}

export interface MonitorStats {
  totalTracked: number;
  currentMetrics: number;
  historyLength: number;
}

export class ChunkerMonitor {
  public config: MonitorConfig;
  private history: MetricEntry[] = [];
  private trackedChunkers: Map<string, Chunker> = new Map();
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(config: MonitorConfig) {
    this.config = { ...config };
    this.startMonitoring();
  }

  /**
   * Track a chunker
   */
  track(chunker: Chunker): void {
    this.trackedChunkers.set(chunker.config.name, chunker);
    this.recordMetric(chunker);
  }

  /**
   * Untrack a chunker
   */
  untrack(name: string): boolean {
    return this.trackedChunkers.delete(name);
  }

  /**
   * Get current metrics for tracked chunkers
   */
  getMetrics(): Map<string, MetricEntry> {
    const metrics = new Map<string, MetricEntry>();
    for (const [name, chunker] of this.trackedChunkers) {
      const stats = chunker.getStats();
      metrics.set(name, {
        timestamp: Date.now(),
        chunkerName: name,
        itemCount: stats.currentChunkSize,
        chunkCount: stats.totalChunks,
        totalItems: stats.totalItems,
        totalChunks: stats.totalChunks,
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

    for (const [name, chunker] of this.trackedChunkers) {
      const stats = chunker.getStats();
      if (stats.totalItems > 0 && stats.currentChunkSize < chunker.config.maxChunkSize) {
        healthy.push(name);
      } else if (stats.totalItems === 0) {
        unhealthy.push(name);
      } else {
        healthy.push(name);
      }
    }

    return {
      healthy,
      unhealthy,
      total: this.trackedChunkers.size,
    };
  }

  /**
   * Get snapshot of monitor state
   */
  getSnapshot(): { metrics: MonitorStats; trackedCount: number; historyCount: number } {
    return {
      metrics: this.getStats(),
      trackedCount: this.trackedChunkers.size,
      historyCount: this.history.length,
    };
  }

  /**
   * Get statistics
   */
  getStats(): MonitorStats {
    return {
      totalTracked: this.trackedChunkers.size,
      currentMetrics: this.trackedChunkers.size,
      historyLength: this.history.length,
    };
  }

  /**
   * Reset monitor state
   */
  reset(): void {
    this.history = [];
    this.trackedChunkers.clear();
    this.stopMonitoring();
  }

  /**
   * Generate text report
   */
  getReport(): string {
    const status = this.getStatus();
    const snap = this.getSnapshot();
    return [
      `ChunkerMonitor Report: ${this.config.name}`,
      `  Tracked chunkers: ${snap.trackedCount}`,
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
      version: '1.26.0',
      name: this.config.name,
      stats: this.getStats(),
      history: this.getHistory(),
    };
  }

  private startMonitoring(): void {
    if (this.config.interval > 0) {
      this.intervalId = setInterval(() => {
        for (const chunker of this.trackedChunkers.values()) {
          this.recordMetric(chunker);
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

  private recordMetric(chunker: Chunker): void {
    const stats = chunker.getStats();
    const entry: MetricEntry = {
      timestamp: Date.now(),
      chunkerName: chunker.config.name,
      itemCount: stats.currentChunkSize,
      chunkCount: stats.totalChunks,
      totalItems: stats.totalItems,
      totalChunks: stats.totalChunks,
    };

    this.history.push(entry);

    if (this.history.length > this.config.historySize) {
      this.history = this.history.slice(-this.config.historySize);
    }
  }
}