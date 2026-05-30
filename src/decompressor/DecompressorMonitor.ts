/**
 * DecompressorMonitor.ts - V125 Decompressor Monitor
 * Monitors decompression operations and collects metrics
 */

import { Decompressor } from './Decompressor';
import { DecompressorRegistry } from './DecompressorRegistry';
import { DecompressorExecutor, ExecutionResult } from './DecompressorExecutor';

export type MonitorConfig = {
  intervalMs?: number;
  maxHistorySize?: number;
  alertThreshold?: number;
};

export type MetricPoint = {
  timestamp: number;
  decompressCount: number;
  averageTimeMs: number;
  successRate: number;
};

export type MonitorStats = {
  totalTracked: number;
  averageSuccessRate: number;
  peakDecompressCount: number;
  lastUpdateAt: number;
};

export interface MonitorSnapshot {
  metrics: MonitorStats;
  timestamp: number;
  config: MonitorConfig;
}

/**
 * DecompressorMonitor - Monitors decompression metrics and history
 * Tracks performance metrics and maintains historical data
 */
export class DecompressorMonitor {
  config: MonitorConfig;
  private history: MetricPoint[] = [];
  private totalTracked: number = 0;
  private peakDecompressCount: number = 0;
  private lastUpdateAt: number = Date.now();

  constructor(config: MonitorConfig = {}) {
    this.config = {
      intervalMs: config.intervalMs ?? 1000,
      maxHistorySize: config.maxHistorySize ?? 100,
      alertThreshold: config.alertThreshold ?? 100,
    };
  }

  /**
   * Track decompression metrics
   */
  track(decompressor: Decompressor | DecompressorRegistry | DecompressorExecutor): void {
    const point: MetricPoint = {
      timestamp: Date.now(),
      decompressCount: this.extractDecompressCount(decompressor),
      averageTimeMs: this.extractAverageTime(decompressor),
      successRate: this.extractSuccessRate(decompressor),
    };

    this.history.push(point);
    this.totalTracked++;
    this.lastUpdateAt = Date.now();

    // Update peak
    if (point.decompressCount > this.peakDecompressCount) {
      this.peakDecompressCount = point.decompressCount;
    }

    // Limit history size
    if (this.history.length > (this.config.maxHistorySize ?? 100)) {
      this.history = this.history.slice(-(this.config.maxHistorySize ?? 100));
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): MonitorStats {
    const successRates = this.history.map(h => h.successRate);
    const avgSuccessRate = successRates.length > 0
      ? successRates.reduce((a, b) => a + b, 0) / successRates.length
      : 0;

    return {
      totalTracked: this.totalTracked,
      averageSuccessRate: avgSuccessRate,
      peakDecompressCount: this.peakDecompressCount,
      lastUpdateAt: this.lastUpdateAt,
    };
  }

  /**
   * Get historical metrics
   */
  getHistory(limit?: number): MetricPoint[] {
    if (limit) {
      return this.history.slice(-limit);
    }
    return [...this.history];
  }

  /**
   * Get current monitoring status
   */
  getStatus(): {
    isMonitoring: boolean;
    historySize: number;
    lastUpdate: string;
  } {
    return {
      isMonitoring: true,
      historySize: this.history.length,
      lastUpdate: new Date(this.lastUpdateAt).toISOString(),
    };
  }

  private extractDecompressCount(target: Decompressor | DecompressorRegistry | DecompressorExecutor): number {
    if (target instanceof Decompressor) {
      return target.getStats().decompressCount;
    } else if (target instanceof DecompressorRegistry) {
      return target.getStats().totalDecompressions;
    } else {
      return target.getStats().totalExecutions;
    }
  }

  private extractAverageTime(target: Decompressor | DecompressorRegistry | DecompressorExecutor): number {
    if (target instanceof Decompressor) {
      return target.getStats().averageTimeMs;
    } else if (target instanceof DecompressorRegistry) {
      return 0;
    } else {
      return target.getStats().averageTimeMs;
    }
  }

  private extractSuccessRate(target: Decompressor | DecompressorRegistry | DecompressorExecutor): number {
    if (target instanceof Decompressor) {
      const stats = target.getStats();
      const total = stats.successCount + stats.errorCount;
      return total > 0 ? (stats.successCount / total) * 100 : 0;
    } else if (target instanceof DecompressorExecutor) {
      const stats = target.getStats();
      const total = stats.successfulExecutions + stats.failedExecutions;
      return total > 0 ? (stats.successfulExecutions / total) * 100 : 0;
    }
    return 0;
  }

  /**
   * Get snapshot of current state
   */
  getSnapshot(): MonitorSnapshot {
    return {
      metrics: this.getMetrics(),
      timestamp: Date.now(),
      config: { ...this.config },
    };
  }

  /**
   * Reset all metrics and history
   */
  reset(): void {
    this.history = [];
    this.totalTracked = 0;
    this.peakDecompressCount = 0;
    this.lastUpdateAt = Date.now();
  }

  /**
   * Generate human-readable report
   */
  getReport(): string {
    const metrics = this.getMetrics();
    const status = this.getStatus();
    return [
      `Decompressor Monitor Report`,
      `=============================`,
      `Total Tracked: ${metrics.totalTracked}`,
      `Average Success Rate: ${metrics.averageSuccessRate.toFixed(2)}%`,
      `Peak Decompress Count: ${metrics.peakDecompressCount}`,
      `Last Update: ${status.lastUpdate}`,
      `History Size: ${status.historySize}`,
      `Alert Threshold: ${this.config.alertThreshold}`,
    ].join('\n');
  }

  /**
   * Export metrics as portable object
   */
  exportMetrics(): { version: string; metrics: MonitorStats; history: MetricPoint[] } {
    return {
      version: 'V125',
      metrics: this.getMetrics(),
      history: this.getHistory(),
    };
  }
}

export default DecompressorMonitor;
