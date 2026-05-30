/**
 * CompressorMonitor.ts - V124 Compressor Monitor
 * Real-time monitoring and metrics collection for compressors
 */

export type CompressorMonitorConfig = {
  interval: number;
  historySize: number;
  enableAlerts: boolean;
  alertThreshold?: number;
};

export type CompressorMonitorStats = {
  totalTracked: number;
  totalMetrics: number;
  alertsTriggered: number;
  averageValue: number;
  peakValue: number;
};

export type CompressorMonitorSnapshot = {
  metrics: CompressorMonitorStats;
  timestamp: number;
  currentStatus: string;
  historyLength: number;
};

export interface MetricEntry {
  timestamp: number;
  name: string;
  value: number;
  tags?: Record<string, string>;
}

export interface MonitorStatus {
  healthy: boolean;
  lastUpdate: number;
  metricsCount: number;
  alertsActive: number;
}

/**
 * CompressorMonitor - Real-time monitoring for compression operations
 * Collects metrics, maintains history, and provides status reporting
 */
export class CompressorMonitor {
  config: CompressorMonitorConfig;
  private totalTracked: number = 0;
  private totalMetrics: number = 0;
  private alertsTriggered: number = 0;
  private values: number[] = [];
  private history: MetricEntry[] = [];
  private lastUpdate: number = Date.now();
  private alertsActive: number = 0;

  constructor(config: CompressorMonitorConfig) {
    this.config = { ...config };
  }

  /**
   * Track a metric value
   */
  track(name: string, value: number, tags?: Record<string, string>): void {
    this.totalTracked++;
    this.totalMetrics++;
    this.lastUpdate = Date.now();

    this.values.push(value);
    
    const entry: MetricEntry = {
      timestamp: Date.now(),
      name,
      value,
      tags,
    };

    this.history.push(entry);

    // Maintain history size limit
    if (this.history.length > this.config.historySize) {
      this.history.shift();
    }

    // Check alert threshold
    if (this.config.enableAlerts && this.config.alertThreshold !== undefined) {
      if (value > this.config.alertThreshold) {
        this.alertsTriggered++;
        this.alertsActive++;
      }
    }
  }

  /**
   * Get current metrics summary
   */
  getMetrics(): { name: string; value: number; timestamp: number }[] {
    return this.history.map(entry => ({
      name: entry.name,
      value: entry.value,
      timestamp: entry.timestamp,
    }));
  }

  /**
   * Get metric history
   */
  getHistory(): MetricEntry[] {
    return [...this.history];
  }

  /**
   * Get current monitor status
   */
  getStatus(): MonitorStatus {
    return {
      healthy: this.alertsActive === 0,
      lastUpdate: this.lastUpdate,
      metricsCount: this.totalMetrics,
      alertsActive: this.alertsActive,
    };
  }

  /**
   * Get aggregated statistics
   */
  getStats(): CompressorMonitorStats {
    const averageValue = this.values.length > 0
      ? this.values.reduce((a, b) => a + b, 0) / this.values.length
      : 0;
    
    const peakValue = this.values.length > 0
      ? Math.max(...this.values)
      : 0;

    return {
      totalTracked: this.totalTracked,
      totalMetrics: this.totalMetrics,
      alertsTriggered: this.alertsTriggered,
      averageValue,
      peakValue,
    };
  }

  /**
   * Get snapshot of current state
   */
  getSnapshot(): CompressorMonitorSnapshot {
    return {
      metrics: this.getStats(),
      timestamp: Date.now(),
      currentStatus: this.alertsActive === 0 ? 'healthy' : 'alert',
      historyLength: this.history.length,
    };
  }

  /**
   * Reset all monitor statistics
   */
  reset(): void {
    this.totalTracked = 0;
    this.totalMetrics = 0;
    this.alertsTriggered = 0;
    this.values = [];
    this.history = [];
    this.lastUpdate = Date.now();
    this.alertsActive = 0;
  }

  /**
   * Generate human-readable report
   */
  getReport(): string {
    const stats = this.getStats();
    const status = this.getStatus();
    return [
      `Compressor Monitor Report`,
      `==========================`,
      `Status: ${status.healthy ? 'HEALTHY' : 'ALERT'}`,
      `Total Tracked: ${stats.totalTracked}`,
      `Total Metrics: ${stats.totalMetrics}`,
      `Alerts Triggered: ${stats.alertsTriggered}`,
      `Average Value: ${stats.averageValue.toFixed(2)}`,
      `Peak Value: ${stats.peakValue.toFixed(2)}`,
      `History Size: ${this.history.length}`,
      `Last Update: ${new Date(this.lastUpdate).toISOString()}`,
    ].join('\n');
  }

  /**
   * Export metrics as portable object
   */
  exportMetrics(): { version: string; stats: CompressorMonitorStats; status: MonitorStatus } {
    return {
      version: 'V124',
      stats: this.getStats(),
      status: this.getStatus(),
    };
  }

  /**
   * Clear alerts
   */
  clearAlerts(): void {
    this.alertsActive = 0;
  }

  /**
   * Get metrics by name
   */
  getMetricsByName(name: string): MetricEntry[] {
    return this.history.filter(entry => entry.name === name);
  }
}

export default CompressorMonitor;