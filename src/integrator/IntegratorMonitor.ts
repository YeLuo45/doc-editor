/**
 * V137 IntegratorMonitor Module
 * Monitor for tracking integrator performance and health
 */

import { Integrator, IntegratorStats, IntegrationResult } from './Integrator';
import { IntegratorRegistry } from './IntegratorRegistry';

export interface MonitorConfig {
  name: string;
  version: string;
  historySize: number;
  alertThreshold: number;
}

export interface MonitorMetric {
  integratorId: string;
  timestamp: number;
  success: boolean;
  duration: number;
}

export interface MonitorStatus {
  healthy: number;
  degraded: number;
  failed: number;
  total: number;
}

export interface MonitorStats {
  totalMetrics: number;
  averageSuccessRate: number;
  averageDuration: number;
  peakDuration: number;
}

export class IntegratorMonitor {
  private registry: IntegratorRegistry;
  private config: MonitorConfig;
  private history: MonitorMetric[] = [];
  private stats: MonitorStats;
  private lastSnapshot: { metrics: MonitorStats } | null = null;

  constructor(registry: IntegratorRegistry, config: Partial<MonitorConfig> = {}) {
    this.registry = registry;
    this.config = {
      name: config.name ?? 'DefaultMonitor',
      version: config.version ?? '1.0.0',
      historySize: config.historySize ?? 1000,
      alertThreshold: config.alertThreshold ?? 0.5,
    };

    this.stats = {
      totalMetrics: 0,
      averageSuccessRate: 0,
      averageDuration: 0,
      peakDuration: 0,
    };
  }

  /**
   * Track an integration result
   */
  track(integratorId: string, result: IntegrationResult): void {
    const metric: MonitorMetric = {
      integratorId,
      timestamp: result.timestamp,
      success: result.success,
      duration: result.duration,
    };

    this.history.push(metric);

    // Maintain history size limit
    if (this.history.length > this.config.historySize) {
      this.history.shift();
    }

    this.stats.totalMetrics++;
    this.updateStats(metric);
  }

  /**
   * Get metrics for a specific integrator
   */
  getMetrics(integratorId: string): MonitorMetric[] {
    return this.history.filter((m) => m.integratorId === integratorId);
  }

  /**
   * Get full metric history
   */
  getHistory(): MonitorMetric[] {
    return [...this.history];
  }

  /**
   * Get current monitor status
   */
  getStatus(): MonitorStatus {
    const integrators = this.registry.getAll();
    let healthy = 0;
    let degraded = 0;
    let failed = 0;

    for (const integrator of integrators) {
      const metrics = this.getMetrics(integrator.config.id);
      if (metrics.length === 0) {
        healthy++;
        continue;
      }

      const successRate = this.calculateSuccessRate(metrics);
      if (successRate >= 0.8) {
        healthy++;
      } else if (successRate >= 0.5) {
        degraded++;
      } else {
        failed++;
      }
    }

    return {
      healthy,
      degraded,
      failed,
      total: integrators.length,
    };
  }

  /**
   * Get monitor statistics
   */
  getStats(): MonitorStats {
    return { ...this.stats };
  }

  /**
   * Get a snapshot of current state
   */
  getSnapshot(): { metrics: MonitorStats } {
    this.lastSnapshot = { metrics: this.getStats() };
    return this.lastSnapshot;
  }

  /**
   * Reset all tracked data
   */
  reset(): void {
    this.history = [];
    this.stats = {
      totalMetrics: 0,
      averageSuccessRate: 0,
      averageDuration: 0,
      peakDuration: 0,
    };
    this.lastSnapshot = null;
  }

  /**
   * Generate a status report
   */
  getReport(): string {
    const status = this.getStatus();
    const successRate = (
      (status.healthy / (status.total || 1)) *
      100
    ).toFixed(2);

    return [
      `=== Integrator Monitor Report ===`,
      `Name: ${this.config.name}`,
      `Version: ${this.config.version}`,
      `History Size: ${this.history.length}/${this.config.historySize}`,
      `Total Metrics: ${this.stats.totalMetrics}`,
      `Healthy Integrators: ${status.healthy}`,
      `Degraded Integrators: ${status.degraded}`,
      `Failed Integrators: ${status.failed}`,
      `Overall Health: ${successRate}%`,
      `Average Duration: ${this.stats.averageDuration.toFixed(2)}ms`,
      `Peak Duration: ${this.stats.peakDuration.toFixed(2)}ms`,
    ].join('\n');
  }

  /**
   * Export metrics in standard format
   */
  exportMetrics(): { version: string; metrics: MonitorStats; config: MonitorConfig } {
    return {
      version: '1.0.0',
      metrics: this.getStats(),
      config: this.config,
    };
  }

  private calculateSuccessRate(metrics: MonitorMetric[]): number {
    if (metrics.length === 0) return 0;
    const successful = metrics.filter((m) => m.success).length;
    return successful / metrics.length;
  }

  private updateStats(metric: MonitorMetric): void {
    // Update average duration
    const totalDuration =
      this.stats.averageDuration * (this.stats.totalMetrics - 1) + metric.duration;
    this.stats.averageDuration = totalDuration / this.stats.totalMetrics;

    // Update peak duration
    if (metric.duration > this.stats.peakDuration) {
      this.stats.peakDuration = metric.duration;
    }

    // Update average success rate
    const recentMetrics = this.history.slice(-100);
    const totalSuccess = recentMetrics.filter((m) => m.success).length;
    this.stats.averageSuccessRate = totalSuccess / recentMetrics.length;
  }
}