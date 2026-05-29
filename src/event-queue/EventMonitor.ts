/**
 * EventMonitor.ts - V89 Event Monitor Implementation
 * Tracks event metrics, active events, and historical data
 */

export type EventCategory = 'user' | 'system' | 'analytics' | 'error' | 'custom';

export interface MonitoredEvent<T = unknown> {
  id: string;
  type: string;
  category: EventCategory;
  payload: T;
  timestamp: number;
  duration?: number;
  status: 'started' | 'completed' | 'failed';
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface MonitorConfig {
  maxEvents: number;
  maxHistory: number;
  enableCategories: boolean;
  enableTiming: boolean;
  enableMetrics: boolean;
  flushInterval: number;
}

interface MetricSnapshot {
  total: number;
  byCategory: Record<EventCategory, number>;
  byStatus: Record<string, number>;
  avgDuration: number;
}

export class EventMonitor {
  private readonly events: MonitoredEvent[] = [];
  private readonly history: MonitoredEvent[] = [];
  private readonly config: MonitorConfig;
  private metrics = {
    tracked: 0,
    completed: 0,
    failed: 0,
    resetAt: 0,
  };

  constructor(config: Partial<MonitorConfig> = {}) {
    this.config = {
      maxEvents: config.maxEvents ?? 1000,
      maxHistory: config.maxHistory ?? 500,
      enableCategories: config.enableCategories ?? true,
      enableTiming: config.enableTiming ?? true,
      enableMetrics: config.enableMetrics ?? true,
      flushInterval: config.flushInterval ?? 60000,
    };
  }

  track<T = unknown>(
    type: string,
    payload: T,
    options: {
      id?: string;
      category?: EventCategory;
      source?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): string {
    const id = options.id ?? `mon_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const event: MonitoredEvent<T> = {
      id,
      type,
      category: options.category ?? 'custom',
      payload,
      timestamp: Date.now(),
      status: 'started',
      source: options.source,
      metadata: options.metadata,
    };

    this.events.push(event as MonitoredEvent);
    if (this.events.length > this.config.maxEvents) {
      this.events.shift();
    }
    this.metrics.tracked++;
    return id;
  }

  complete<T = unknown>(id: string, payload?: T): boolean {
    const event = this.events.find((e) => e.id === id);
    if (!event) return false;

    event.status = 'completed';
    if (this.config.enableTiming) {
      event.duration = Date.now() - event.timestamp;
    }
    this.moveToHistory(event);
    this.metrics.completed++;
    return true;
  }

  fail<T = unknown>(id: string, payload?: T): boolean {
    const event = this.events.find((e) => e.id === id);
    if (!event) return false;

    event.status = 'failed';
    if (this.config.enableTiming) {
      event.duration = Date.now() - event.timestamp;
    }
    this.moveToHistory(event);
    this.metrics.failed++;
    return true;
  }

  private moveToHistory(event: MonitoredEvent): void {
    this.history.push(event);
    if (this.history.length > this.config.maxHistory) {
      this.history.shift();
    }
    const idx = this.events.findIndex((e) => e.id === event.id);
    if (idx >= 0) this.events.splice(idx, 1);
  }

  getActive(): MonitoredEvent[] {
    return [...this.events];
  }

  getActiveByCategory(category: EventCategory): MonitoredEvent[] {
    return this.events.filter((e) => e.category === category);
  }

  getActiveByType(type: string): MonitoredEvent[] {
    return this.events.filter((e) => e.type === type);
  }

  getHistory(limit?: number): MonitoredEvent[] {
    const slice = this.history.slice(-limit ?? this.config.maxHistory);
    return [...slice].reverse();
  }

  getMetrics(): MetricSnapshot {
    const byCategory: Record<EventCategory, number> = {
      user: 0,
      system: 0,
      analytics: 0,
      error: 0,
      custom: 0,
    };
    const byStatus: Record<string, number> = { started: 0, completed: 0, failed: 0 };
    let totalDuration = 0;
    let countWithDuration = 0;

    this.history.forEach((e) => {
      byCategory[e.category]++;
      byStatus[e.status]++;
      if (e.duration !== undefined) {
        totalDuration += e.duration;
        countWithDuration++;
      }
    });

    return {
      total: this.history.length,
      byCategory,
      byStatus,
      avgDuration: countWithDuration > 0 ? totalDuration / countWithDuration : 0,
    };
  }

  getSnapshot(): { metrics: typeof this.metrics; activeCount: number; historyCount: number } {
    return {
      metrics: { ...this.metrics },
      activeCount: this.events.length,
      historyCount: this.history.length,
    };
  }

  reset(): void {
    this.events.length = 0;
    this.history.length = 0;
    this.metrics = {
      tracked: 0,
      completed: 0,
      failed: 0,
      resetAt: Date.now(),
    };
  }

  getReport(): string {
    const snap = this.getSnapshot();
    const m = this.getMetrics();
    return [
      '=== EventMonitor Report ===',
      `Active Events: ${snap.activeCount}`,
      `History Events: ${snap.historyCount}`,
      `Tracked Total: ${snap.metrics.tracked}`,
      `Completed: ${snap.metrics.completed}`,
      `Failed: ${snap.metrics.failed}`,
      `Avg Duration: ${m.avgDuration.toFixed(2)}ms`,
      `Reset At: ${snap.metrics.resetAt}`,
    ].join('\n');
  }

  exportMetrics(): { version: string; metrics: typeof this.metrics; snapshot: MetricSnapshot } {
    return {
      version: 'V89',
      metrics: { ...this.metrics },
      snapshot: this.getMetrics(),
    };
  }
}