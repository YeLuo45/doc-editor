/**
 * V129 Packer Monitor
 * Monitors packer performance and health metrics
 */

import { Packer } from './Packer.js';

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

export class PackerMonitor {
  private config: MonitorConfig;
  private history: MonitorMetric[] = [];
  private status: MonitorStatus = 'active';
  private trackedPackers: Map<string, Packer> = new Map();
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
   * Track a packer instance
   */
  track(packer: Packer): boolean {
    if (!packer) return false;
    const id = packer.getConfig().id;
    this.trackedPackers.set(id, packer);
    this.stats.trackedCount++;
    this.recordMetric('packer.tracked', 1, { packerId: id });
    return true;
  }

  /**
   * Get metrics for a specific packer
   */
  getMetrics(packerId?: string): MonitorMetric[] {
    if (packerId) {
      return this.history.filter((m) => m.tags?.packerId === packerId);
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
      trackedCount: this.trackedPackers.size,
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
        trackedCount: this.trackedPackers.size,
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
    this.trackedPackers.clear();
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
        trackedPackers: Array.from(this.trackedPackers.keys()),
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
        trackedCount: this.trackedPackers.size,
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