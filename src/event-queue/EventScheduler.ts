/**
 * EventScheduler.ts - V89 Event Scheduler Implementation
 * Schedules events for future execution with cancellation support
 */

export interface ScheduledEvent<T = unknown> {
  id: string;
  type: string;
  payload: T;
  scheduledAt: number;
  executeAt: number;
  recurring: boolean;
  interval?: number;
  cancelled: boolean;
  metadata?: Record<string, unknown>;
}

export interface SchedulerConfig {
  maxScheduled: number;
  maxHistory: number;
  enableRecurring: boolean;
  enableMetrics: boolean;
  timezone: string;
}

type SchedulerCallback<T = unknown> = (event: ScheduledEvent<T>) => void | Promise<void>;

export class EventScheduler {
  private readonly scheduled = new Map<string, ScheduledEvent>();
  private readonly config: SchedulerConfig;
  private history: ScheduledEvent[] = [];
  private metrics = {
    scheduled: 0,
    cancelled: 0,
    executed: 0,
    missed: 0,
    resetAt: 0,
  };

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = {
      maxScheduled: config.maxScheduled ?? 500,
      maxHistory: config.maxHistory ?? 100,
      enableRecurring: config.enableRecurring ?? true,
      enableMetrics: config.enableMetrics ?? true,
      timezone: config.timezone ?? 'UTC',
    };
  }

  schedule<T = unknown>(
    type: string,
    payload: T,
    delayMs: number,
    options: {
      id?: string;
      interval?: number;
      at?: number;
      metadata?: Record<string, unknown>;
    } = {}
  ): string {
    if (this.scheduled.size >= this.config.maxScheduled) {
      throw new Error(`Max scheduled events reached: ${this.config.maxScheduled}`);
    }

    const id = options.id ?? `sched_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = Date.now();
    const scheduledEvent: ScheduledEvent<T> = {
      id,
      type,
      payload,
      scheduledAt: now,
      executeAt: options.at ?? now + delayMs,
      recurring: !!options.interval && this.config.enableRecurring,
      interval: options.interval,
      cancelled: false,
      metadata: options.metadata,
    };

    this.scheduled.set(id, scheduledEvent as ScheduledEvent);
    this.metrics.scheduled++;
    return id;
  }

  cancel(scheduleId: string): boolean {
    const event = this.scheduled.get(scheduleId);
    if (!event) return false;

    event.cancelled = true;
    this.scheduled.delete(scheduleId);
    this.metrics.cancelled++;
    return true;
  }

  cancelAll(): number {
    const count = this.scheduled.size;
    this.scheduled.clear();
    return count;
  }

  getScheduled(): ScheduledEvent[] {
    return Array.from(this.scheduled.values()).filter((e) => !e.cancelled);
  }

  getScheduledByType(type: string): ScheduledEvent[] {
    return this.getScheduled().filter((e) => e.type === type);
  }

  getHistory(limit?: number): ScheduledEvent[] {
    const history = this.history.slice(-limit ?? this.config.maxHistory);
    return [...history].reverse();
  }

  getById(id: string): ScheduledEvent | undefined {
    return this.scheduled.get(id);
  }

  getNext(): ScheduledEvent | undefined {
    const pending = this.getScheduled();
    if (pending.length === 0) return undefined;
    return pending.reduce(( earliest, e ) =>
      e.executeAt < earliest.executeAt ? e : earliest
    );
  }

  execute<T = unknown>(id: string, callback: SchedulerCallback<T>): boolean {
    const event = this.scheduled.get(id) as ScheduledEvent<T> | undefined;
    if (!event || event.cancelled) return false;

    try {
      callback(event);
      this.history.push(event);
      if (this.history.length > this.config.maxHistory) {
        this.history = this.history.slice(-this.config.maxHistory);
      }
      this.metrics.executed++;

      if (event.recurring && event.interval) {
        event.executeAt = Date.now() + event.interval;
      } else {
        this.scheduled.delete(id);
      }
      return true;
    } catch {
      this.metrics.missed++;
      return false;
    }
  }

  getSnapshot(): { metrics: typeof this.metrics; scheduledCount: number; config: SchedulerConfig } {
    return {
      metrics: { ...this.metrics },
      scheduledCount: this.scheduled.size,
      config: { ...this.config },
    };
  }

  reset(): void {
    this.scheduled.clear();
    this.history = [];
    this.metrics = {
      scheduled: 0,
      cancelled: 0,
      executed: 0,
      missed: 0,
      resetAt: Date.now(),
    };
  }

  getReport(): string {
    const snap = this.getSnapshot();
    return [
      '=== EventScheduler Report ===',
      `Scheduled: ${snap.scheduledCount}`,
      `Max Scheduled: ${snap.config.maxScheduled}`,
      `History Size: ${this.history.length}`,
      `Scheduled Total: ${snap.metrics.scheduled}`,
      `Cancelled: ${snap.metrics.cancelled}`,
      `Executed: ${snap.metrics.executed}`,
      `Missed: ${snap.metrics.missed}`,
      `Reset At: ${snap.metrics.resetAt}`,
    ].join('\n');
  }

  exportMetrics(): { version: string; metrics: typeof this.metrics; config: SchedulerConfig } {
    return {
      version: 'V89',
      metrics: { ...this.metrics },
      config: { ...this.config },
    };
  }
}