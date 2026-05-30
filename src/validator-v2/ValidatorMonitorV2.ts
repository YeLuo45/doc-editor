/**
 * ValidatorMonitorV2.ts - Validator Monitor V2 Implementation
 * Version: 1.20.0
 * 
 * Monitors validation activities, collects metrics,
 * maintains history, and provides status tracking.
 */

export type MetricPoint = {
  timestamp: number;
  value: number;
  label?: string;
};

export type MonitorConfig = {
  maxHistorySize: number;
  collectInterval: number;
  enableMetrics: boolean;
};

export type MonitorStatus = {
  isActive: boolean;
  uptime: number;
  totalTracks: number;
  errorCount: number;
};

const DEFAULT_MONITOR_CONFIG: MonitorConfig = {
  maxHistorySize: 1000,
  collectInterval: 60000,
  enableMetrics: true,
};

export class ValidatorMonitorV2 {
  private _isActive = false;
  private _startTime = 0;
  private _trackCount = 0;
  private _errorCount = 0;
  private _lastTrackTime = 0;
  private readonly _metrics: Map<string, MetricPoint[]> = new Map();
  private readonly _history: Array<{ timestamp: number; event: string; data?: unknown }> = [];

  constructor(public readonly config: MonitorConfig = DEFAULT_MONITOR_CONFIG) {
    this.config = { ...DEFAULT_MONITOR_CONFIG, ...config };
    this._isActive = true;
    this._startTime = Date.now();
  }

  /**
   * Tracks a validation event with optional data
   */
  track(event: string, data?: unknown): void {
    if (!this.config.enableMetrics) return;
    
    this._trackCount++;
    this._lastTrackTime = Date.now();
    
    const historyEntry = {
      timestamp: this._lastTrackTime,
      event,
      data,
    };
    
    this._history.push(historyEntry);
    
    if (this._history.length > this.config.maxHistorySize) {
      this._history.shift();
    }
    
    if (data && typeof data === 'object' && 'value' in (data as Record<string, unknown>)) {
      const value = (data as { value: number }).value;
      this.recordMetric(event, value);
    }
  }

  /**
   * Records a metric value for tracking
   */
  private recordMetric(name: string, value: number): void {
    let metricArray = this._metrics.get(name);
    
    if (!metricArray) {
      metricArray = [];
      this._metrics.set(name, metricArray);
    }
    
    metricArray.push({
      timestamp: Date.now(),
      value,
    });
    
    if (metricArray.length > this.config.maxHistorySize) {
      metricArray.shift();
    }
  }

  /**
   * Gets metrics for a specific name
   */
  getMetrics(metricName?: string): MetricPoint[] | Map<string, MetricPoint[]> {
    if (metricName) {
      return this._metrics.get(metricName) || [];
    }
    return new Map(this._metrics);
  }

  /**
   * Gets the complete history of tracked events
   */
  getHistory(limit?: number): Array<{ timestamp: number; event: string; data?: unknown }> {
    if (limit) {
      return this._history.slice(-limit);
    }
    return [...this._history];
  }

  /**
   * Gets the current monitor status
   */
  getStatus(): MonitorStatus {
    return {
      isActive: this._isActive,
      uptime: this._isActive ? Date.now() - this._startTime : 0,
      totalTracks: this._trackCount,
      errorCount: this._errorCount,
    };
  }

  /**
   * Gets statistics about monitoring
   */
  getStats(): {
    totalTracks: number;
    errorCount: number;
    historySize: number;
    metricsCount: number;
    lastTrackTime: number;
    uptime: number;
  } {
    return {
      totalTracks: this._trackCount,
      errorCount: this._errorCount,
      historySize: this._history.length,
      metricsCount: this._metrics.size,
      lastTrackTime: this._lastTrackTime,
      uptime: this._isActive ? Date.now() - this._startTime : 0,
    };
  }

  /**
   * Gets a snapshot of current metrics
   */
  getSnapshot(): { metrics: Record<string, unknown> } {
    const metricSnapshots: Record<string, unknown> = {};
    
    for (const [name, points] of this._metrics) {
      if (points.length === 0) continue;
      
      const values = points.map(p => p.value);
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      
      metricSnapshots[name] = {
        count: points.length,
        average: avg,
        min,
        max,
        latest: values[values.length - 1],
        unit: 'ms',
      };
    }
    
    return {
      metrics: {
        trackCount: this._trackCount,
        errorCount: this._errorCount,
        historyLength: this._history.length,
        activeMetrics: Object.keys(metricSnapshots).length,
        uptime: this._isActive ? Date.now() - this._startTime : 0,
        config: this.config,
        snapshots: metricSnapshots,
      },
    };
  }

  /**
   * Resets all monitoring data
   */
  reset(): void {
    this._trackCount = 0;
    this._errorCount = 0;
    this._lastTrackTime = 0;
    this._metrics.clear();
    this._history.length = 0;
  }

  /**
   * Generates a text report of monitor state
   */
  getReport(): string {
    const status = this.getStatus();
    const stats = this.getStats();
    
    let report = '=== Validator Monitor V2 Report ===\n';
    report += `Status: ${status.isActive ? 'ACTIVE' : 'INACTIVE'}\n`;
    report += `Uptime: ${(status.uptime / 1000).toFixed(2)}s\n`;
    report += `Total Tracks: ${stats.totalTracks}\n`;
    report += `Error Count: ${stats.errorCount}\n`;
    report += `History Size: ${stats.historySize}/${this.config.maxHistorySize}\n`;
    report += `Active Metrics: ${stats.metricsCount}\n`;
    report += '\nMetric Summary:\n';
    
    for (const [name, points] of this._metrics) {
      if (points.length === 0) continue;
      const values = points.map(p => p.value);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      report += `  - ${name}: avg=${avg.toFixed(2)}ms, count=${points.length}\n`;
    }
    
    return report;
  }

  /**
   * Exports metrics in standardized format
   */
  exportMetrics(): { version: string; metrics: Record<string, unknown> } {
    return {
      version: '1.20.0',
      metrics: this.getSnapshot().metrics,
    };
  }

  /**
   * Stops the monitor
   */
  stop(): void {
    this._isActive = false;
  }

  /**
   * Starts the monitor
   */
  start(): void {
    this._isActive = true;
    this._startTime = Date.now();
  }
}