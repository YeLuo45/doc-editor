/**
 * V145 ConvolverMonitor - Monitoring and observability for Convolver operations
 * Tracks performance metrics, execution history, and system status
 */

export interface MonitorConfig {
  historySize: number;
  enableRealTime: boolean;
  samplingRate: number;
}

export interface MetricPoint {
  timestamp: number;
  value: number;
  label?: string;
}

export interface MonitorMetrics {
  trackedItems: number;
  totalEvents: number;
  avgValue: number;
  minValue: number;
  maxValue: number;
}

export type SystemStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export class ConvolverMonitor {
  public config: MonitorConfig;
  
  private metrics: Map<string, MetricPoint[]> = new Map();
  private events: Array<{ timestamp: number; type: string; data: unknown }> = [];
  private status: SystemStatus = 'unknown';

  constructor(config: MonitorConfig) {
    this.config = { ...config };
  }

  /**
   * Track a metric with timestamp and value
   */
  track(metricName: string, value: number, label?: string): void {
    if (!this.metrics.has(metricName)) {
      this.metrics.set(metricName, []);
    }

    const points = this.metrics.get(metricName)!;
    points.push({
      timestamp: Date.now(),
      value,
      label
    });

    // Trim history if needed
    if (points.length > this.config.historySize) {
      points.shift();
    }

    this.events.push({
      timestamp: Date.now(),
      type: 'metric',
      data: { metricName, value, label }
    });
  }

  /**
   * Get metrics for a specific metric name
   */
  getMetrics(metricName: string): MetricPoint[] {
    return this.metrics.get(metricName) || [];
  }

  /**
   * Get all tracked metric names
   */
  getMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }

  /**
   * Get history for a specific metric
   */
  getHistory(metricName: string, limit?: number): MetricPoint[] {
    const points = this.metrics.get(metricName) || [];
    return limit ? points.slice(-limit) : points;
  }

  /**
   * Get aggregated metrics for a metric
   */
  getAggregatedMetrics(metricName: string): MonitorMetrics {
    const points = this.metrics.get(metricName) || [];
    
    if (points.length === 0) {
      return { trackedItems: 0, totalEvents: 0, avgValue: 0, minValue: 0, maxValue: 0 };
    }

    const values = points.map(p => p.value);
    return {
      trackedItems: points.length,
      totalEvents: this.events.length,
      avgValue: values.reduce((a, b) => a + b, 0) / values.length,
      minValue: Math.min(...values),
      maxValue: Math.max(...values)
    };
  }

  /**
   * Get current system status
   */
  getStatus(): SystemStatus {
    return this.status;
  }

  /**
   * Set system status
   */
  setStatus(status: SystemStatus): void {
    this.status = status;
    this.events.push({
      timestamp: Date.now(),
      type: 'status_change',
      data: { status }
    });
  }

  /**
   * Get all events
   */
  getEvents(): Array<{ timestamp: number; type: string; data: unknown }> {
    return [...this.events];
  }

  /**
   * Get a snapshot of current state
   */
  getSnapshot(): { metrics: Map<string, MetricPoint[]> } {
    return {
      metrics: new Map(this.metrics)
    };
  }

  /**
   * Reset all tracked data
   */
  reset(): void {
    this.metrics.clear();
    this.events = [];
    this.status = 'unknown';
  }

  /**
   * Clear metrics for a specific metric
   */
  clearMetric(metricName: string): void {
    this.metrics.delete(metricName);
  }

  /**
   * Generate a human-readable report
   */
  getReport(): string {
    const lines = [
      'Convolver Monitor Report',
      `Status: ${this.status}`,
      `Tracked Metrics: ${this.metrics.size}`,
      `Total Events: ${this.events.length}`,
      ''
    ];

    this.metrics.forEach((points, name) => {
      if (points.length > 0) {
        const values = points.map(p => p.value);
        lines.push(`Metric: ${name}`);
        lines.push(`  Points: ${points.length}`);
        lines.push(`  Min: ${Math.min(...values).toFixed(2)}`);
        lines.push(`  Max: ${Math.max(...values).toFixed(2)}`);
        lines.push(`  Avg: ${(values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)}`);
      }
    });

    return lines.join('\n');
  }

  /**
   * Export metrics in standardized format
   */
  exportMetrics(): { version: string } {
    const exportedMetrics: Record<string, MetricPoint[]> = {};
    this.metrics.forEach((points, name) => {
      exportedMetrics[name] = points;
    });

    return {
      version: '1.0.0',
      monitor: {
        status: this.status,
        config: this.config,
        metrics: exportedMetrics,
        eventCount: this.events.length
      }
    };
  }
}

export default ConvolverMonitor;