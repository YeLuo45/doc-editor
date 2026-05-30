/**
 * V127 Assembler Monitor
 * Monitors assembler performance and health metrics
 */

import { Assembler } from './Assembler.js';

export type MonitorConfig = {
  interval?: number;
  historySize?: number;
  alertThreshold?: number;
  collectMetrics?: boolean;
};

export type MonitorMetric = {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
};

export type MonitorStatus = 'active' | 'paused' | 'error';

export class AssemblerMonitor {
  private config: MonitorConfig;
  private history: MonitorMetric[] = [];
  private status: MonitorStatus = 'active';
  private trackedAssemblers: Map<string, Assembler> = new Map();
  private stats = {
    trackedCount: 0,
    metricCount: 0,
    alertCount: 0,
  };

  constructor(config: MonitorConfig = {}) {
    this.config = {
      interval: config.interval ?? 5000,
      historySize: config.historySize ?? 1000,
      alertThreshold: config.alertThreshold ?? 0.8,
      collectMetrics: config.collectMetrics ?? true,
    };
  }

  /**
   * Track an assembler instance
   */
  track(assembler: Assembler): boolean {
    if (!assembler) return false;
    const id = assembler.getConfig().id;
    this.trackedAssemblers.set(id, assembler);
    this.stats.trackedCount++;
    this.recordMetric('assembler.tracked', 1, { assemblerId: id });
    return true;
  }

  /**
   * Get metrics for a specific assembler
   */
  getMetrics(assemblerId?: string): MonitorMetric[] {
    if (assemblerId) {
      return this.history.filter((m) => m.tags?.assemblerId === assemblerId);
    }
    return [...this.history];
  }

  /**
   * Get historical metrics
   */
  getHistory(limit?: number): MonitorMetric[] {
    if (limit) {
      return this.history.slice(-limit);
    }
    return [...this.history];
  }

  /**
   * Get current monitoring status
   */
  getStatus(): { status: MonitorStatus; trackedCount: number; metricCount: number } {
    return {
      status: this.status,
      trackedCount: this.trackedAssemblers.size,
      metricCount: this.history.length,
    };
  }

  /**
   * Record a metric
   */
  private recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    if (!this.config.collectMetrics) return;

    const metric: MonitorMetric = {
      name,
      value,
      timestamp: Date.now(),
      tags,
    };

    this.history.push(metric);
    this.stats.metricCount++;

    // Maintain history size limit
    if (this.history.length > (this.config.historySize ?? 1000)) {
      this.history.shift();
    }
  }

  /**
   * Get current snapshot
   */
  getSnapshot(): { metrics: Record<string, unknown> } {
    return {
      metrics: {
        config: this.config,
        status: this.status,
        trackedCount: this.trackedAssemblers.size,
        stats: this.stats,
        historyLength: this.history.length,
        timestamp: Date.now(),
      },
    };
  }

  /**
   * Reset monitor state
   */
  reset(): void {
    this.history = [];
    this.trackedAssemblers.clear();
    this.stats = { trackedCount: 0, metricCount: 0, alertCount: 0 };
    this.status = 'active';
  }

  /**
   * Generate a status report
   */
  getReport(): string {
    return JSON.stringify(
      {
        status: this.status,
        config: this.config,
        trackedAssemblers: Array.from(this.trackedAssemblers.keys()),
        stats: this.stats,
        historyLength: this.history.length,
      },
      null,
      2
    );
  }

  /**
   * Export metrics in standardized format
   */
  exportMetrics(): { version: string; data: Record<string, unknown> } {
    return {
      version: '1.0.0',
      data: {
        status: this.status,
        trackedCount: this.trackedAssemblers.size,
        metricCount: this.history.length,
        stats: this.stats,
        recentMetrics: this.history.slice(-10),
      },
    };
  }

  /**
   * Get monitor configuration
   */
  getConfig(): MonitorConfig {
    return { ...this.config };
  }

  /**
   * Pause monitoring
   */
  pause(): void {
    this.status = 'paused';
    this.recordMetric('monitor.status', 0, { status: 'paused' });
  }

  /**
   * Resume monitoring
   */
  resume(): void {
    this.status = 'active';
    this.recordMetric('monitor.status', 1, { status: 'active' });
  }
}