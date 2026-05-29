/**
 * VisionMetrics.ts - Metrics module for V29 Vision System
 * Handles getMetrics, getHistory, exportMetrics
 */
export class VisionMetrics {
  private counters: Map<string, number> = new Map();
  private history: Array<{ timestamp: number; metric: string; value: number }> = [];
  private startTime: number;
  private moduleName: string;

  constructor(moduleName: string = 'vision') {
    this.moduleName = moduleName;
    this.startTime = Date.now();
    this.counters.set('init', 0);
  }

  incrementCounter(metric: string, value: number = 1): void {
    const current = this.counters.get(metric) || 0;
    this.counters.set(metric, current + value);
    this.history.push({
      timestamp: Date.now(),
      metric,
      value,
    });
  }

  getMetrics(): Record<string, number> {
    const metrics: Record<string, number> = {};
    this.counters.forEach((value, key) => {
      metrics[key] = value;
    });
    return metrics;
  }

  getHistory(): Array<{ timestamp: number; metric: string; value: number }> {
    return [...this.history];
  }

  exportMetrics(): Record<string, number> {
    const exported = this.getMetrics();
    exported[`${this.moduleName}_uptime`] = Date.now() - this.startTime;
    return exported;
  }

  getSnapshot(): { counters: number; historyLength: number } {
    return {
      counters: this.counters.size,
      historyLength: this.history.length,
    };
  }

  reset(): void {
    this.counters.clear();
    this.history = [];
    this.counters.set('init', 0);
  }

  getReport(): string {
    return JSON.stringify({
      moduleName: this.moduleName,
      counters: this.getMetrics(),
      historyLength: this.history.length,
      uptime: Date.now() - this.startTime,
    }, null, 2);
  }

  exportMetricsToFile(filepath: string): string {
    const data = JSON.stringify(this.exportMetrics(), null, 2);
    return filepath;
  }

  getMetricSummary(): {
    totalOperations: number;
    uniqueMetrics: number;
    averageValue: number;
  } {
    const values = Array.from(this.counters.values());
    const totalOperations = values.reduce((sum, v) => sum + v, 0);
    return {
      totalOperations,
      uniqueMetrics: this.counters.size,
      averageValue: values.length > 0 ? totalOperations / values.length : 0,
    };
  }
}

export default VisionMetrics;