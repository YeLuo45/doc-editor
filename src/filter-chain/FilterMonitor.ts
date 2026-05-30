/**
 * FilterMonitor.ts - V110 Filter Monitor
 * Monitors filter performance with track/getMetrics/getHistory/getStatus
 */

export type FilterMonitorConfig = {
  historySize: number;
  enableAlerts: boolean;
  alertThreshold: number;
  enableMetricsAggregation: boolean;
};

export type FilterMonitorStatus = 'active' | 'paused' | 'disabled';

export type FilterMetric = {
  filterName: string;
  executionCount: number;
  totalDuration: number;
  averageDuration: number;
  successCount: number;
  failureCount: number;
  lastExecuted: number;
};

export type FilterMonitorStats = {
  totalTracked: number;
  activeFilters: number;
  totalExecutions: number;
  alertsTriggered: number;
  averageResponseTime: number;
};

export type FilterMonitorSnapshot = {
  metrics: {
    status: FilterMonitorStatus;
    totalTracked: number;
    activeFilters: number;
    totalExecutions: number;
    alertsTriggered: number;
    averageResponseTime: number;
  };
  timestamp: number;
};

export type FilterEvent = {
  type: 'execution' | 'error' | 'alert';
  filterName: string;
  timestamp: number;
  data: unknown;
};

export class FilterMonitor {
  config: FilterMonitorConfig;
  private status: FilterMonitorStatus = 'active';
  private metrics: Map<string, FilterMetric> = new Map();
  private history: FilterEvent[] = [];
  private totalTracked: number = 0;
  private totalExecutions: number = 0;
  private alertsTriggered: number = 0;
  private alertsTriggeredTotal: number = 0;

  constructor(config: FilterMonitorConfig) {
    this.config = { ...config };
  }

  track(filterName: string, duration: number, success: boolean, error?: string): void {
    if (this.status !== 'active') return;

    this.totalTracked++;
    this.totalExecutions++;

    let metric = this.metrics.get(filterName);
    if (!metric) {
      metric = {
        filterName,
        executionCount: 0,
        totalDuration: 0,
        averageDuration: 0,
        successCount: 0,
        failureCount: 0,
        lastExecuted: 0,
      };
      this.metrics.set(filterName, metric);
    }

    metric.executionCount++;
    metric.totalDuration += duration;
    metric.averageDuration = metric.totalDuration / metric.executionCount;
    metric.lastExecuted = Date.now();

    if (success) {
      metric.successCount++;
    } else {
      metric.failureCount++;
    }

    const eventType = error ? 'error' : success ? 'execution' : 'error';
    this.addHistoryEvent({
      type: eventType,
      filterName,
      timestamp: Date.now(),
      data: { duration, success, error },
    });

    if (this.config.enableAlerts && duration > this.config.alertThreshold) {
      this.triggerAlert(filterName, duration);
    }
  }

  private triggerAlert(filterName: string, duration: number): void {
    this.alertsTriggered++;
    this.alertsTriggeredTotal++;
    this.addHistoryEvent({
      type: 'alert',
      filterName,
      timestamp: Date.now(),
      data: { duration, message: `Alert: ${filterName} exceeded threshold (${duration}ms)` },
    });
  }

  private addHistoryEvent(event: FilterEvent): void {
    this.history.push(event);
    if (this.history.length > this.config.historySize) {
      this.history.shift();
    }
  }

  getMetrics(filterName?: string): FilterMetric | Map<string, FilterMetric> {
    if (filterName) {
      return this.metrics.get(filterName) || {
        filterName,
        executionCount: 0,
        totalDuration: 0,
        averageDuration: 0,
        successCount: 0,
        failureCount: 0,
        lastExecuted: 0,
      };
    }
    return new Map(this.metrics);
  }

  getHistory(limit?: number): FilterEvent[] {
    if (limit) {
      return this.history.slice(-limit);
    }
    return [...this.history];
  }

  getStatus(): FilterMonitorStatus {
    return this.status;
  }

  pause(): void {
    this.status = 'paused';
  }

  resume(): void {
    this.status = 'active';
  }

  disable(): void {
    this.status = 'disabled';
  }

  getStats(): FilterMonitorStats {
    const totalDuration = Array.from(this.metrics.values()).reduce((sum, m) => sum + m.totalDuration, 0);
    return {
      totalTracked: this.totalTracked,
      activeFilters: this.metrics.size,
      totalExecutions: this.totalExecutions,
      alertsTriggered: this.alertsTriggeredTotal,
      averageResponseTime: this.totalExecutions > 0 ? totalDuration / this.totalExecutions : 0,
    };
  }

  getSnapshot(): FilterMonitorSnapshot {
    return {
      metrics: {
        status: this.status,
        totalTracked: this.totalTracked,
        activeFilters: this.metrics.size,
        totalExecutions: this.totalExecutions,
        alertsTriggered: this.alertsTriggeredTotal,
        averageResponseTime: this.getStats().averageResponseTime,
      },
      timestamp: Date.now(),
    };
  }

  reset(): void {
    this.status = 'active';
    this.metrics.clear();
    this.history = [];
    this.totalTracked = 0;
    this.totalExecutions = 0;
    this.alertsTriggered = 0;
    this.alertsTriggeredTotal = 0;
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    const stats = this.getStats();
    const lines = [
      '=== Filter Monitor Report ===',
      `Status: ${snapshot.metrics.status}`,
      `Total Tracked: ${snapshot.metrics.totalTracked}`,
      `Active Filters: ${snapshot.metrics.activeFilters}`,
      `Total Executions: ${snapshot.metrics.totalExecutions}`,
      `Alerts Triggered: ${snapshot.metrics.alertsTriggered}`,
      `Average Response Time: ${stats.averageResponseTime.toFixed(2)}ms`,
      `History Size: ${this.history.length}`,
      `Timestamp: ${new Date(snapshot.timestamp).toISOString()}`,
    ];
    return lines.join('\n');
  }

  exportMetrics(): { version: string } & FilterMonitorSnapshot['metrics'] {
    return {
      version: 'V110',
      ...this.getSnapshot().metrics,
    };
  }
}