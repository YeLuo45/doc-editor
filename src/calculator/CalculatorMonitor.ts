/**
 * V132 Calculator Monitor
 * Monitors calculator operations and tracks metrics
 */

export type MonitorConfig = {
  enableRealTimeTracking: boolean;
  historySize: number;
  alertThreshold: number;
  samplingRate: number;
};

export type MetricEvent = {
  id: string;
  type: string;
  calculatorId: string;
  operation: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
};

export type MonitorStatus = {
  isMonitoring: boolean;
  eventsTracked: number;
  alertsTriggered: number;
  lastEventTime: number | null;
};

export type MonitorMetrics = {
  totalEvents: number;
  successEvents: number;
  errorEvents: number;
  averageValue: number;
  peakValue: number;
};

export class CalculatorMonitor {
  private _config: MonitorConfig;
  private events: MetricEvent[];
  private status: MonitorStatus;
  private metrics: MonitorMetrics;

  constructor(config: MonitorConfig) {
    this._config = { ...config };
    this.events = [];
    this.status = {
      isMonitoring: true,
      eventsTracked: 0,
      alertsTriggered: 0,
      lastEventTime: null,
    };
    this.metrics = {
      totalEvents: 0,
      successEvents: 0,
      errorEvents: 0,
      averageValue: 0,
      peakValue: 0,
    };
  }

  get config(): MonitorConfig {
    return { ...this._config };
  }

  track(
    calculatorId: string,
    operation: string,
    value: number,
    type: string = 'calculation',
    metadata?: Record<string, unknown>
  ): void {
    const event: MetricEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      calculatorId,
      operation,
      value,
      timestamp: Date.now(),
      metadata,
    };

    this.events.push(event);

    if (this.events.length > this._config.historySize) {
      this.events.shift();
    }

    this.status.eventsTracked++;
    this.status.lastEventTime = event.timestamp;
    this.metrics.totalEvents++;

    if (type === 'success' || type === 'calculation') {
      this.metrics.successEvents++;
      this.metrics.averageValue =
        (this.metrics.averageValue * (this.metrics.successEvents - 1) + value) /
        this.metrics.successEvents;
    } else if (type === 'error') {
      this.metrics.errorEvents++;
    }

    if (value > this._config.alertThreshold) {
      this.status.alertsTriggered++;
    }

    if (value > this.metrics.peakValue) {
      this.metrics.peakValue = value;
    }
  }

  getMetrics(): MonitorMetrics {
    return { ...this.metrics };
  }

  getHistory(): MetricEvent[] {
    return [...this.events];
  }

  getStatus(): MonitorStatus {
    return { ...this.status };
  }

  getSnapshot(): { metrics: MonitorMetrics } {
    return { metrics: this.getMetrics() };
  }

  reset(): void {
    this.events = [];
    this.status = {
      isMonitoring: true,
      eventsTracked: 0,
      alertsTriggered: 0,
      lastEventTime: null,
    };
    this.metrics = {
      totalEvents: 0,
      successEvents: 0,
      errorEvents: 0,
      averageValue: 0,
      peakValue: 0,
    };
  }

  getReport(): string {
    return [
      '=== Calculator Monitor Report ===',
      `Monitoring Active: ${this.status.isMonitoring}`,
      `Total Events: ${this.metrics.totalEvents}`,
      `Success Events: ${this.metrics.successEvents}`,
      `Error Events: ${this.metrics.errorEvents}`,
      `Alerts Triggered: ${this.status.alertsTriggered}`,
      `Peak Value: ${this.metrics.peakValue}`,
      `Average Value: ${this.metrics.averageValue.toFixed(2)}`,
      `History Size: ${this.events.length}`,
      '=================================',
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return {
      version: '1.0.0',
    };
  }
}