export type MonitorConfig = {
  historySize: number;
  enableTracking: boolean;
  metricsInterval: number;
  alertThreshold: number;
};

export type TrackedEvent = {
  id: string;
  name: string;
  timestamp: number;
  duration: number;
  status: 'started' | 'completed' | 'failed' | 'cancelled';
  metadata?: Record<string, unknown>;
};

export type MonitorMetrics = {
  totalTracked: number;
  activeEvents: number;
  completedEvents: number;
  failedEvents: number;
  averageDuration: number;
  totalDuration: number;
  peakConcurrent: number;
};

const DEFAULT_CONFIG: MonitorConfig = {
  historySize: 1000,
  enableTracking: true,
  metricsInterval: 60000,
  alertThreshold: 100,
};

export class TimeoutMonitor {
  private events: Map<string, TrackedEvent> = new Map();
  private history: TrackedEvent[] = [];
  private config: MonitorConfig;
  private metrics: MonitorMetrics;
  private currentConcurrent: number = 0;

  constructor(config: Partial<MonitorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.metrics = {
      totalTracked: 0,
      activeEvents: 0,
      completedEvents: 0,
      failedEvents: 0,
      averageDuration: 0,
      totalDuration: 0,
      peakConcurrent: 0,
    };
  }

  track(id: string, name: string, metadata?: Record<string, unknown>): void {
    if (!this.config.enableTracking) return;

    const event: TrackedEvent = {
      id,
      name,
      timestamp: Date.now(),
      duration: 0,
      status: 'started',
      metadata,
    };

    this.events.set(id, event);
    this.metrics.totalTracked++;
    this.metrics.activeEvents++;
    this.currentConcurrent++;

    if (this.currentConcurrent > this.metrics.peakConcurrent) {
      this.metrics.peakConcurrent = this.currentConcurrent;
    }
  }

  complete(id: string): void {
    const event = this.events.get(id);
    if (!event) return;

    const now = Date.now();
    event.duration = now - event.timestamp;
    event.status = 'completed';

    this.metrics.activeEvents--;
    this.metrics.completedEvents++;
    this.metrics.totalDuration += event.duration;
    this.metrics.averageDuration = this.metrics.totalDuration / this.metrics.completedEvents;
    this.currentConcurrent--;

    this.addToHistory(event);
    this.events.delete(id);
  }

  fail(id: string): void {
    const event = this.events.get(id);
    if (!event) return;

    const now = Date.now();
    event.duration = now - event.timestamp;
    event.status = 'failed';

    this.metrics.activeEvents--;
    this.metrics.failedEvents++;
    this.metrics.totalDuration += event.duration;
    this.currentConcurrent--;

    this.addToHistory(event);
    this.events.delete(id);
  }

  cancel(id: string): void {
    const event = this.events.get(id);
    if (!event) return;

    const now = Date.now();
    event.duration = now - event.timestamp;
    event.status = 'cancelled';

    this.metrics.activeEvents--;
    this.currentConcurrent--;

    this.addToHistory(event);
    this.events.delete(id);
  }

  private addToHistory(event: TrackedEvent): void {
    this.history.push(event);
    if (this.history.length > this.config.historySize) {
      this.history.shift();
    }
  }

  getMetrics(): MonitorMetrics {
    return { ...this.metrics };
  }

  getHistory(): TrackedEvent[] {
    return [...this.history];
  }

  getStatus(): {
    isHealthy: boolean;
    activeEvents: number;
    alertThreshold: number;
    message: string;
  } {
    const isHealthy = this.metrics.activeEvents < this.config.alertThreshold;
    return {
      isHealthy,
      activeEvents: this.metrics.activeEvents,
      alertThreshold: this.config.alertThreshold,
      message: isHealthy ? 'OK' : 'ALERT: Active events exceed threshold',
    };
  }

  getSnapshot(): { metrics: MonitorMetrics } {
    return {
      metrics: { ...this.metrics },
    };
  }

  reset(): void {
    this.events.clear();
    this.history = [];
    this.currentConcurrent = 0;
    this.metrics = {
      totalTracked: 0,
      activeEvents: 0,
      completedEvents: 0,
      failedEvents: 0,
      averageDuration: 0,
      totalDuration: 0,
      peakConcurrent: 0,
    };
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    const status = this.getStatus();
    return `TimeoutMonitor Report:
  Total Tracked: ${snapshot.metrics.totalTracked}
  Active: ${snapshot.metrics.activeEvents}
  Completed: ${snapshot.metrics.completedEvents}
  Failed: ${snapshot.metrics.failedEvents}
  Peak Concurrent: ${snapshot.metrics.peakConcurrent}
  Status: ${status.message}`;
  }

  exportMetrics(): { version: string } {
    return {
      version: '1.0.0',
    };
  }
}