export type MonitorConfig = {
  sampleRate?: number;
  maxHistory?: number;
  enableAlerting?: boolean;
};

export type HookEvent = {
  id: string;
  type: string;
  hookId?: string;
  timestamp: number;
  duration?: number;
  success?: boolean;
  metadata?: Record<string, any>;
};

export type HookMetrics = {
  totalTracked: number;
  totalSuccess: number;
  totalFailure: number;
  averageDuration: number;
  lastEventAt: number;
};

export type HookMonitorConfig = {
  defaultSampleRate?: number;
  maxHistorySize?: number;
  enablePersistence?: boolean;
};

const defaultHookMonitorConfig: HookMonitorConfig = {
  defaultSampleRate: 1.0,
  maxHistorySize: 1000,
  enablePersistence: false,
};

export class HookMonitor {
  public config: HookMonitorConfig;
  private events: HookEvent[] = [];
  private metrics: HookMetrics = {
    totalTracked: 0,
    totalSuccess: 0,
    totalFailure: 0,
    averageDuration: 0,
    lastEventAt: 0,
  };
  private status: 'idle' | 'tracking' | 'paused' = 'idle';

  constructor(config: HookMonitorConfig = {}) {
    this.config = { ...defaultHookMonitorConfig, ...config };
    this.status = 'idle';
  }

  track(event: Omit<HookEvent, 'id' | 'timestamp'>): string {
    const id = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullEvent: HookEvent = {
      ...event,
      id,
      timestamp: Date.now(),
    };
    const maxSize = this.config.maxHistorySize ?? 1000;
    if (this.events.length >= maxSize) {
      this.events.shift();
    }
    this.events.push(fullEvent);
    this.metrics.totalTracked++;
    this.metrics.lastEventAt = Date.now();
    if (event.success) this.metrics.totalSuccess++;
    else if (event.success === false) this.metrics.totalFailure++;
    if (event.duration) {
      const prev = this.metrics.averageDuration;
      const count = this.metrics.totalTracked;
      this.metrics.averageDuration = prev + (event.duration - prev) / count;
    }
    this.status = 'tracking';
    return id;
  }

  getMetrics(): HookMetrics {
    return { ...this.metrics };
  }

  getHistory(limit?: number): HookEvent[] {
    if (!limit) return [...this.events];
    return this.events.slice(-limit);
  }

  getStatus(): { status: string; metrics: HookMetrics; eventCount: number } {
    return {
      status: this.status,
      metrics: { ...this.metrics },
      eventCount: this.events.length,
    };
  }

  clear(): void {
    this.events = [];
    this.status = 'idle';
  }

  getSnapshot(): { metrics: HookMetrics; eventCount: number; status: string } {
    return {
      metrics: { ...this.metrics },
      eventCount: this.events.length,
      status: this.status,
    };
  }

  reset(): void {
    this.events = [];
    this.metrics = { totalTracked: 0, totalSuccess: 0, totalFailure: 0, averageDuration: 0, lastEventAt: 0 };
    this.status = 'idle';
  }

  getReport(): string {
    const snap = this.getSnapshot();
    return [
      'HookMonitor Report',
      `  Status: ${snap.status}`,
      `  Events tracked: ${snap.metrics.totalTracked}`,
      `  Success: ${snap.metrics.totalSuccess}`,
      `  Failure: ${snap.metrics.totalFailure}`,
      `  Average duration: ${snap.metrics.averageDuration.toFixed(2)}ms`,
      `  Last event: ${snap.metrics.lastEventAt ? new Date(snap.metrics.lastEventAt).toISOString() : 'N/A'}`,
    ].join('\n');
  }

  exportMetrics(): { version: string } & HookMetrics {
    return {
      version: 'V84-HookMonitor-1.0',
      ...this.metrics,
    };
  }
}