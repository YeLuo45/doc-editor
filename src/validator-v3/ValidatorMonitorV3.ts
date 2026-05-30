/**
 * ValidatorMonitorV3.ts - Validator Monitor V3 Implementation
 * Version: 128.0.0
 * 
 * Real-time monitoring and metrics collection for validators
 * with history tracking and status reporting.
 */

import { ValidatorV3 } from './ValidatorV3';

export type MonitorConfig = {
  name: string;
  historySize: number;
  enableAlerting: boolean;
  checkInterval: number;
};

export type MonitorMetric = {
  timestamp: number;
  validatorName: string;
  operation: string;
  duration: number;
  success: boolean;
  errorCount: number;
  warningCount: number;
};

export type MonitorStatus = {
  healthy: boolean;
  activeValidators: number;
  totalOperations: number;
  errorRate: number;
  lastUpdate: number;
};

const DEFAULT_MONITOR_CONFIG: MonitorConfig = {
  name: 'ValidatorMonitorV3',
  historySize: 1000,
  enableAlerting: false,
  checkInterval: 60000,
};

export class ValidatorMonitorV3 {
  private _metrics: MonitorMetric[] = [];
  private _operationCount = 0;
  private _errorCount = 0;
  private _warningCount = 0;
  private _lastUpdateTime = 0;
  private _activeValidators: Set<string> = new Set();

  constructor(public readonly config: MonitorConfig = DEFAULT_MONITOR_CONFIG) {
    this.config = { ...DEFAULT_MONITOR_CONFIG, ...config };
  }

  /**
   * Tracks a validation operation
   */
  track(validator: ValidatorV3, operation: string, duration: number, success: boolean): void {
    const metric: MonitorMetric = {
      timestamp: Date.now(),
      validatorName: validator.config.name,
      operation,
      duration,
      success,
      errorCount: success ? 0 : 1,
      warningCount: 0,
    };

    this._metrics.push(metric);
    this._operationCount++;
    this._lastUpdateTime = Date.now();
    this._activeValidators.add(validator.config.name);

    if (!success) this._errorCount++;
    if (this._metrics.length > this.config.historySize) {
      this._metrics.shift();
    }
  }

  /**
   * Gets metrics for a specific validator or all validators
   */
  getMetrics(validatorName?: string): MonitorMetric[] {
    if (validatorName) {
      return this._metrics.filter(m => m.validatorName === validatorName);
    }
    return [...this._metrics];
  }

  /**
   * Gets history of tracked operations
   */
  getHistory(limit?: number): MonitorMetric[] {
    if (limit) {
      return this._metrics.slice(-limit);
    }
    return [...this._metrics];
  }

  /**
   * Gets current monitor status
   */
  getStatus(): MonitorStatus {
    const errorRate = this._operationCount > 0 
      ? this._errorCount / this._operationCount 
      : 0;

    return {
      healthy: errorRate < 0.5,
      activeValidators: this._activeValidators.size,
      totalOperations: this._operationCount,
      errorRate,
      lastUpdate: this._lastUpdateTime,
    };
  }

  /**
   * Gets monitor statistics
   */
  getStats(): MonitorStats {
    const avgDuration = this._operationCount > 0
      ? this._metrics.reduce((sum, m) => sum + m.duration, 0) / this._operationCount
      : 0;

    return {
      name: this.config.name,
      operationCount: this._operationCount,
      errorCount: this._errorCount,
      warningCount: this._warningCount,
      activeValidators: this._activeValidators.size,
      averageDuration: avgDuration,
      lastUpdateTime: this._lastUpdateTime,
    };
  }

  /**
   * Gets a snapshot of current metrics
   */
  getSnapshot(): { metrics: MonitorStats } {
    return {
      metrics: this.getStats(),
    };
  }

  /**
   * Resets all statistics and clears history
   */
  reset(): void {
    this._metrics = [];
    this._operationCount = 0;
    this._errorCount = 0;
    this._warningCount = 0;
    this._lastUpdateTime = 0;
    this._activeValidators.clear();
  }

  /**
   * Generates a text report of monitor state
   */
  getReport(): string {
    const stats = this.getStats();
    const status = this.getStatus();
    return [
      `ValidatorMonitorV3 Report: ${stats.name}`,
      `Operations: ${stats.operationCount}`,
      `Active Validators: ${stats.activeValidators}`,
      `Errors: ${stats.errorCount}`,
      `Avg Duration: ${stats.averageDuration.toFixed(2)}ms`,
      `Health: ${status.healthy ? 'HEALTHY' : 'UNHEALTHY'}`,
      `Error Rate: ${(status.errorRate * 100).toFixed(1)}%`,
    ].join('\n');
  }

  /**
   * Exports metrics in standardized format
   */
  exportMetrics(): { version: string; stats: MonitorStats; status: MonitorStatus } {
    return {
      version: '128.0.0',
      stats: this.getStats(),
      status: this.getStatus(),
    };
  }
}

export type MonitorStats = {
  name: string;
  operationCount: number;
  errorCount: number;
  warningCount: number;
  activeValidators: number;
  averageDuration: number;
  lastUpdateTime: number;
};