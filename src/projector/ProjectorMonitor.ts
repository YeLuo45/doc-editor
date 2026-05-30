/**
 * V138 ProjectorMonitor - Monitors projector execution and health
 * Tracks metrics, history, and status for all projector operations
 */

import { ProjectorExecutor, ExecutionResult } from './ProjectorExecutor';
import { ProjectorRegistry } from './ProjectorRegistry';

export type MonitorConfig = {
  historySize: number;
  healthCheckInterval: number;
  enableAlerting: boolean;
  alertThreshold: number;
};

export type HealthStatus = 'healthy' | 'degraded' | 'critical';

export type MonitoredMetric = {
  name: string;
  value: number;
  timestamp: number;
  tags: Record<string, string>;
};

export type MonitorStats = {
  trackedProjectors: number;
  totalTracks: number;
  alertsTriggered: number;
  healthChecks: number;
};

export class ProjectorMonitor {
  private _config: MonitorConfig;
  private _registry: ProjectorRegistry;
  private _executor: ProjectorExecutor;
  private _metrics: MonitoredMetric[];
  private _history: ExecutionResult[];
  private _stats: MonitorStats;

  constructor(
    registry: ProjectorRegistry,
    executor: ProjectorExecutor,
    config: Partial<MonitorConfig> = {}
  ) {
    this._registry = registry;
    this._executor = executor;
    this._metrics = [];
    this._history = [];
    this._config = {
      historySize: config.historySize ?? 1000,
      healthCheckInterval: config.healthCheckInterval ?? 60000,
      enableAlerting: config.enableAlerting ?? true,
      alertThreshold: config.alertThreshold ?? 0.8,
    };
    this._stats = {
      trackedProjectors: 0,
      totalTracks: 0,
      alertsTriggered: 0,
      healthChecks: 0,
    };
  }

  get config(): MonitorConfig {
    return { ...this._config };
  }

  getStats(): MonitorStats {
    return { ...this._stats };
  }

  track(projectorId: string, metric: Partial<MonitoredMetric>): void {
    const fullMetric: MonitoredMetric = {
      name: metric.name ?? 'unknown',
      value: metric.value ?? 0,
      timestamp: metric.timestamp ?? Date.now(),
      tags: {
        projectorId,
        ...(metric.tags ?? {}),
      },
    };

    this._metrics.push(fullMetric);
    this._stats.totalTracks++;

    if (this._metrics.length > this._config.historySize) {
      this._metrics = this._metrics.slice(-this._config.historySize);
    }

    if (this._config.enableAlerting && metric.value !== undefined) {
      this.checkAlert(projectorId, metric.value);
    }
  }

  getMetrics(projectorId?: string): MonitoredMetric[] {
    if (!projectorId) {
      return [...this._metrics];
    }
    return this._metrics.filter((m) => m.tags.projectorId === projectorId);
  }

  getHistory(projectorId?: string): ExecutionResult[] {
    if (!projectorId) {
      return [...this._history];
    }
    return this._history.filter((h) => h.projectorId === projectorId);
  }

  getStatus(projectorId: string): HealthStatus {
    const projector = this._registry.get(projectorId);
    if (!projector) {
      return 'critical';
    }

    const stats = projector.getStats();
    const successRate = stats.totalProjections > 0
      ? stats.successfulProjections / stats.totalProjections
      : 0;

    if (successRate >= this._config.alertThreshold) {
      return 'healthy';
    } else if (successRate >= this._config.alertThreshold - 0.2) {
      return 'degraded';
    }
    return 'critical';
  }

  private checkAlert(projectorId: string, value: number): void {
    if (value > this._config.alertThreshold) {
      this._stats.alertsTriggered++;
    }
  }

  recordExecution(result: ExecutionResult): void {
    this._history.push(result);
    if (this._history.length > this._config.historySize) {
      this._history = this._history.slice(-this._config.historySize);
    }

    this.track(result.projectorId, {
      name: 'execution',
      value: result.success ? 1 : 0,
      timestamp: result.timestamp,
    });
  }

  performHealthCheck(): Map<string, HealthStatus> {
    this._stats.healthChecks++;
    const statuses = new Map<string, HealthStatus>();

    for (const projector of this._registry.getAll()) {
      statuses.set(projector.config.id, this.getStatus(projector.config.id));
    }

    return statuses;
  }

  getSnapshot(): { metrics: MonitorStats; config: MonitorConfig; recentMetrics: MonitoredMetric[] } {
    return {
      metrics: this.getStats(),
      config: this.config,
      recentMetrics: this._metrics.slice(-10),
    };
  }

  reset(): void {
    this._metrics = [];
    this._history = [];
    this._stats = {
      trackedProjectors: 0,
      totalTracks: 0,
      alertsTriggered: 0,
      healthChecks: 0,
    };
  }

  getReport(): string {
    const projectors = this._registry.getAll();
    const statuses = this.performHealthCheck();
    const healthyCount = Array.from(statuses.values()).filter((s) => s === 'healthy').length;

    return [
      `ProjectorMonitor Report`,
      `Tracked Projectors: ${projectors.length}`,
      `Total Tracks: ${this._stats.totalTracks}`,
      `Alerts Triggered: ${this._stats.alertsTriggered}`,
      `Health Checks: ${this._stats.healthChecks}`,
      `Healthy: ${healthyCount}/${projectors.length}`,
      `History Size: ${this._config.historySize}`,
    ].join('\n');
  }

  exportMetrics(): { version: string; stats: MonitorStats; config: MonitorConfig } {
    return {
      version: 'V138',
      stats: this.getStats(),
      config: this.config,
    };
  }
}