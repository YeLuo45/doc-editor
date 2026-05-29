export interface StreamMonitorConfig {
  historySize?: number;
  enableMetrics?: boolean;
  trackLatency?: boolean;
}

export interface StreamMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface StreamEvent {
  type: string;
  streamId: string;
  timestamp: number;
  data?: unknown;
}

export class StreamMonitor {
  private metrics: StreamMetric[] = [];
  private events: StreamEvent[] = [];
  private activeStreams: Map<string, { startedAt: number; lastActivity: number }> = new Map();
  private eventHistory: StreamEvent[] = [];
  public config: StreamMonitorConfig;

  constructor(config: StreamMonitorConfig = {}) {
    this.config = config;
  }

  track(streamId: string, metric: Omit<StreamMetric, 'timestamp'>): void {
    const fullMetric: StreamMetric = {
      ...metric,
      timestamp: Date.now(),
    };

    this.metrics.push(fullMetric);

    if (this.config.historySize && this.metrics.length > this.config.historySize) {
      this.metrics = this.metrics.slice(-this.config.historySize);
    }

    this.updateStreamActivity(streamId);
  }

  trackEvent(streamId: string, type: string, data?: unknown): void {
    const event: StreamEvent = {
      type,
      streamId,
      timestamp: Date.now(),
      data,
    };

    this.events.push(event);
    this.eventHistory.push(event);

    if (this.config.historySize && this.eventHistory.length > this.config.historySize * 2) {
      this.eventHistory = this.eventHistory.slice(-this.config.historySize);
    }

    this.updateStreamActivity(streamId);
  }

  private updateStreamActivity(streamId: string): void {
    const now = Date.now();
    if (this.activeStreams.has(streamId)) {
      this.activeStreams.get(streamId)!.lastActivity = now;
    } else {
      this.activeStreams.set(streamId, { startedAt: now, lastActivity: now });
    }
  }

  getMetrics(name?: string): StreamMetric[] {
    if (name) {
      return this.metrics.filter(m => m.name === name).map(m => ({ ...m }));
    }
    return this.metrics.map(m => ({ ...m }));
  }

  getActive(): string[] {
    const now = Date.now();
    const timeout = 30000;
    return Array.from(this.activeStreams.entries())
      .filter(([_, data]) => now - data.lastActivity < timeout)
      .map(([id]) => id);
  }

  getHistory(limit?: number): StreamEvent[] {
    if (limit) {
      return this.eventHistory.slice(-limit).map(e => ({ ...e }));
    }
    return this.eventHistory.map(e => ({ ...e }));
  }

  getStreamStatus(streamId: string): { active: boolean; duration: number; idle: number } | null {
    const stream = this.activeStreams.get(streamId);
    if (!stream) return null;

    const now = Date.now();
    return {
      active: now - stream.lastActivity < 30000,
      duration: now - stream.startedAt,
      idle: now - stream.lastActivity,
    };
  }

  clearMetrics(): void {
    this.metrics = [];
  }

  clearEvents(): void {
    this.events = [];
  }

  clearStream(streamId: string): void {
    this.activeStreams.delete(streamId);
  }

  getSnapshot(): { metrics: { totalMetrics: number; totalEvents: number; activeStreams: number } } {
    return {
      metrics: {
        totalMetrics: this.metrics.length,
        totalEvents: this.eventHistory.length,
        activeStreams: this.getActive().length,
      },
    };
  }

  reset(): void {
    this.metrics = [];
    this.events = [];
    this.activeStreams.clear();
    this.eventHistory = [];
  }

  getReport(): string {
    const active = this.getActive();
    return `StreamMonitor Report: metrics=${this.metrics.length}, events=${this.eventHistory.length}, activeStreams=${active.length}`;
  }

  exportMetrics(): { version: string } {
    return { version: '1.0.0' };
  }
}