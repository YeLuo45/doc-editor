/**
 * DLQ Monitor - V103
 * Monitors and tracks dead letter queue metrics
 */

export interface MetricEntry {
  timestamp: number;
  count: number;
  eventType: string;
}

export interface DLQMonitorConfig {
  historySize: number;
  alertThreshold: number;
  namespace: string;
}

type DLQMonitorConfigAlias = DLQMonitorConfig;

export class DLQMonitor {
  private history: MetricEntry[] = [];
  private counters: Record<string, number> = {};
  public readonly config: DLQMonitorConfigAlias;

  constructor(config: Partial<DLQMonitorConfig> = {}) {
    this.config = {
      historySize: config.historySize ?? 1000,
      alertThreshold: config.alertThreshold ?? 100,
      namespace: config.namespace ?? 'default'
    };
  }

  track(eventType: string, count: number = 1): void {
    const entry: MetricEntry = {
      timestamp: Date.now(),
      count,
      eventType
    };

    this.history.push(entry);
    this.counters[eventType] = (this.counters[eventType] || 0) + count;

    if (this.history.length > this.config.historySize) {
      this.history.shift();
    }
  }

  getMetrics(): {
    totalTracked: number;
    counters: Record<string, number>;
    averagePerMinute: number;
  } {
    const now = Date.now();
    const windowStart = now - 60000;
    const recentEntries = this.history.filter(e => e.timestamp >= windowStart);
    const recentTotal = recentEntries.reduce((sum, e) => sum + e.count, 0);

    return {
      totalTracked: this.history.length,
      counters: { ...this.counters },
      averagePerMinute: recentTotal
    };
  }

  getHistory(limit?: number): MetricEntry[] {
    if (limit) {
      return this.history.slice(-limit);
    }
    return [...this.history];
  }

  getStatus(): {
    healthy: boolean;
    alertTriggered: boolean;
    totalEvents: number;
    threshold: number;
  } {
    const totalEvents = Object.values(this.counters).reduce((a, b) => a + b, 0);
    const alertTriggered = totalEvents >= this.config.alertThreshold;

    return {
      healthy: !alertTriggered,
      alertTriggered,
      totalEvents,
      threshold: this.config.alertThreshold
    };
  }

  getSnapshot(): { metrics: Record<string, unknown> } {
    return {
      metrics: {
        ...this.getMetrics(),
        status: this.getStatus(),
        config: this.config
      }
    };
  }

  reset(): void {
    this.history = [];
    this.counters = {};
  }

  getReport(): string {
    const metrics = this.getMetrics();
    const status = this.getStatus();

    return [
      `DLQ Monitor Report [${this.config.namespace}]`,
      `=============================================`,
      `Status: ${status.healthy ? 'HEALTHY' : 'UNHEALTHY'}`,
      `Alert Threshold: ${status.threshold}`,
      `Alert Triggered: ${status.alertTriggered}`,
      `Total Events: ${status.totalEvents}`,
      `History Size: ${metrics.totalTracked}`,
      `Average/min: ${metrics.averagePerMinute}`,
      `Counters: ${JSON.stringify(metrics.counters)}`
    ].join('\n');
  }

  exportMetrics(): { version: string; metrics: ReturnType<typeof this.getMetrics>; status: ReturnType<typeof this.getStatus> } {
    return {
      version: '1.0.3',
      metrics: this.getMetrics(),
      status: this.getStatus()
    };
  }
}