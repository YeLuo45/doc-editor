/**
 * V144 SmootherMonitorV2 - Monitoring and metrics collection for smoothers
 * Tracks performance, collects metrics, and provides status information
 */

import { SmootherV2 } from './SmootherV2';

export interface MonitorMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface MonitorStatus {
  healthy: boolean;
  lastCheck: number;
  issues: string[];
}

export interface MonitorHistoryEntry {
  timestamp: number;
  metrics: MonitorMetric[];
  status: MonitorStatus;
}

export interface MonitorStats {
  totalTracked: number;
  totalMetricsCollected: number;
  lastTrackTime: number;
  averageLatency: number;
  healthyCount: number;
  unhealthyCount: number;
}

export interface MonitorSnapshot {
  metrics: MonitorStats;
  timestamp: number;
}

export class SmootherMonitorV2 {
  config: { name: string; historySize?: number; healthCheckInterval?: number };
  private metrics: Map<string, MonitorMetric[]>;
  private history: MonitorHistoryEntry[];
  private stats: MonitorStats;
  private snapshot: MonitorSnapshot | null;
  private trackedSmoothers: Map<string, SmootherV2>;

  constructor(config?: { name?: string; historySize?: number; healthCheckInterval?: number }) {
    this.config = {
      name: config?.name || 'smoother-monitor-v2',
      historySize: config?.historySize || 1000,
      healthCheckInterval: config?.healthCheckInterval || 60000,
    };
    this.metrics = new Map();
    this.history = [];
    this.stats = {
      totalTracked: 0,
      totalMetricsCollected: 0,
      lastTrackTime: 0,
      averageLatency: 0,
      healthyCount: 0,
      unhealthyCount: 0,
    };
    this.snapshot = null;
    this.trackedSmoothers = new Map();
  }

  track(smoother: SmootherV2, customTags?: Record<string, string>): boolean {
    const name = smoother.config.name;

    if (this.trackedSmoothers.has(name)) {
      return false;
    }

    this.trackedSmoothers.set(name, smoother);
    this.metrics.set(name, []);
    this.stats.totalTracked++;

    const initialMetric: MonitorMetric = {
      name: `${name}.initial`,
      value: 1,
      timestamp: Date.now(),
      tags: customTags,
    };

    this.addMetric(name, initialMetric);
    this.checkHealth(name);

    this.snapshot = {
      metrics: { ...this.stats },
      timestamp: Date.now(),
    };

    return true;
  }

  private addMetric(smootherName: string, metric: MonitorMetric): void {
    let smootherMetrics = this.metrics.get(smootherName);
    if (!smootherMetrics) {
      smootherMetrics = [];
      this.metrics.set(smootherName, smootherMetrics);
    }

    smootherMetrics.push(metric);
    this.stats.totalMetricsCollected++;
    this.stats.lastTrackTime = Date.now();

    if (smootherMetrics.length > (this.config.historySize || 1000)) {
      smootherMetrics.shift();
    }
  }

  getMetrics(smootherName?: string): MonitorMetric[] {
    if (smootherName) {
      return this.metrics.get(smootherName) || [];
    }

    const allMetrics: MonitorMetric[] = [];
    for (const m of this.metrics.values()) {
      allMetrics.push(...m);
    }
    return allMetrics;
  }

  getHistory(smootherName?: string): MonitorHistoryEntry[] {
    if (smootherName) {
      return this.history.filter(h => h.metrics.some(m => m.name.startsWith(smootherName)));
    }
    return [...this.history];
  }

  getStatus(smootherName?: string): MonitorStatus {
    if (smootherName) {
      const issues: string[] = [];
      const smoother = this.trackedSmoothers.get(smootherName);

      if (!smoother) {
        issues.push('Smoother not tracked');
      }

      const stats = smoother?.getStats();
      if (stats && stats.failedOps > stats.successfulOps * 0.5) {
        issues.push('High failure rate');
      }

      return {
        healthy: issues.length === 0,
        lastCheck: Date.now(),
        issues,
      };
    }

    const allIssues: string[] = [];
    let healthy = 0;
    let unhealthy = 0;

    for (const [name] of this.trackedSmoothers) {
      const status = this.getStatus(name);
      if (status.healthy) {
        healthy++;
      } else {
        unhealthy++;
        allIssues.push(...status.issues.map(i => `${name}: ${i}`));
      }
    }

    this.stats.healthyCount = healthy;
    this.stats.unhealthyCount = unhealthy;

    return {
      healthy: unhealthy === 0,
      lastCheck: Date.now(),
      issues: allIssues,
    };
  }

  private checkHealth(smootherName: string): void {
    const smoother = this.trackedSmoothers.get(smootherName);
    if (!smoother) return;

    const stats = smoother.getStats();
    const status = this.getStatus(smootherName);

    this.history.push({
      timestamp: Date.now(),
      metrics: this.metrics.get(smootherName) || [],
      status,
    });

    if (this.history.length > (this.config.historySize || 1000)) {
      this.history.shift();
    }
  }

  recordMetric(smootherName: string, metricName: string, value: number, tags?: Record<string, string>): void {
    const metric: MonitorMetric = {
      name: `${smootherName}.${metricName}`,
      value,
      timestamp: Date.now(),
      tags,
    };

    this.addMetric(smootherName, metric);
  }

  getStats(): MonitorStats {
    return { ...this.stats };
  }

  getSnapshot(): { metrics: MonitorStats } {
    return {
      metrics: this.snapshot?.metrics || { ...this.stats },
    };
  }

  reset(): void {
    this.metrics.clear();
    this.history = [];
    this.trackedSmoothers.clear();
    this.stats = {
      totalTracked: 0,
      totalMetricsCollected: 0,
      lastTrackTime: 0,
      averageLatency: 0,
      healthyCount: 0,
      unhealthyCount: 0,
    };
    this.snapshot = null;
  }

  getReport(): string {
    const trackedNames = Array.from(this.trackedSmoothers.keys()).join(', ') || 'none';
    const status = this.getStatus();

    return [
      `SmootherMonitorV2 Report: ${this.config.name}`,
      `History Size: ${this.config.historySize}`,
      `Health Check Interval: ${this.config.healthCheckInterval}ms`,
      `Total Tracked: ${this.stats.totalTracked}`,
      `Total Metrics Collected: ${this.stats.totalMetricsCollected}`,
      `Last Track Time: ${new Date(this.stats.lastTrackTime).toISOString()}`,
      `Healthy Count: ${this.stats.healthyCount}`,
      `Unhealthy Count: ${this.stats.unhealthyCount}`,
      `Overall Health: ${status.healthy ? 'HEALTHY' : 'UNHEALTHY'}`,
      `Tracked Smoothers: ${trackedNames}`,
      status.issues.length > 0 ? `Issues: ${status.issues.join('; ')}` : 'No issues',
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return {
      version: '1.44.0',
    };
  }
}

export default SmootherMonitorV2;