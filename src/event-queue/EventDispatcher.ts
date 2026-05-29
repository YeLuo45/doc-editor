/**
 * EventDispatcher.ts - V89 Event Dispatcher Implementation
 * Handles event dispatching with subscriber management and routing
 */

export type EventHandler<T = unknown> = (payload: T) => void | Promise<void>;

export interface Subscriber<T = unknown> {
  id: string;
  handler: EventHandler<T>;
  eventType: string;
  priority: number;
  once: boolean;
  metadata?: Record<string, unknown>;
}

export interface DispatcherConfig {
  enableAsync: boolean;
  enableLogging: boolean;
  maxSubscribers: number;
  defaultTimeout: number;
  enableMetrics: boolean;
}

interface DispatchRecord {
  eventType: string;
  timestamp: number;
  subscriberId: string;
  success: boolean;
  duration: number;
}

export class EventDispatcher {
  private readonly subscribers = new Map<string, Subscriber[]>();
  private readonly config: DispatcherConfig;
  private dispatchHistory: DispatchRecord[] = [];
  private metrics = {
    dispatched: 0,
    received: 0,
    errors: 0,
    resetAt: 0,
  };

  constructor(config: Partial<DispatcherConfig> = {}) {
    this.config = {
      enableAsync: config.enableAsync ?? true,
      enableLogging: config.enableLogging ?? false,
      maxSubscribers: config.maxSubscribers ?? 100,
      defaultTimeout: config.defaultTimeout ?? 5000,
      enableMetrics: config.enableMetrics ?? true,
    };
  }

  dispatch<T = unknown>(eventType: string, payload: T): Promise<void> {
    this.metrics.dispatched++;
    const subscribers = this.subscribers.get(eventType) ?? [];

    if (subscribers.length === 0) {
      return Promise.resolve();
    }

    const sorted = [...subscribers].sort((a, b) => b.priority - a.priority);
    const tasks = sorted.map((sub) => this.invokeSubscriber(sub, payload));
    return Promise.all(tasks).then(() => undefined);
  }

  private async invokeSubscriber<T>(sub: Subscriber<T>, payload: T): Promise<void> {
    const start = Date.now();
    try {
      await sub.handler(payload);
      this.dispatchHistory.push({
        eventType: sub.eventType,
        timestamp: Date.now(),
        subscriberId: sub.id,
        success: true,
        duration: Date.now() - start,
      });
      this.metrics.received++;
    } catch {
      this.dispatchHistory.push({
        eventType: sub.eventType,
        timestamp: Date.now(),
        subscriberId: sub.id,
        success: false,
        duration: Date.now() - start,
      });
      this.metrics.errors++;
    }
  }

  subscribe<T = unknown>(
    eventType: string,
    handler: EventHandler<T>,
    options: { id?: string; priority?: number; once?: boolean; metadata?: Record<string, unknown> } = {}
  ): string {
    const subscribers = this.subscribers.get(eventType) ?? [];
    if (subscribers.length >= this.config.maxSubscribers) {
      throw new Error(`Max subscribers reached for event: ${eventType}`);
    }

    const id = options.id ?? `sub_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const subscriber: Subscriber<T> = {
      id,
      handler: handler as EventHandler<unknown>,
      eventType,
      priority: options.priority ?? 0,
      once: options.once ?? false,
      metadata: options.metadata,
    };

    subscribers.push(subscriber as Subscriber);
    this.subscribers.set(eventType, subscribers);
    return id;
  }

  unsubscribe(eventType: string, subscriberId: string): boolean {
    const subscribers = this.subscribers.get(eventType);
    if (!subscribers) return false;

    const before = subscribers.length;
    const filtered = subscribers.filter((s) => s.id !== subscriberId);
    this.subscribers.set(eventType, filtered);
    return filtered.length < before;
  }

  unsubscribeAll(eventType: string): number {
    const subscribers = this.subscribers.get(eventType) ?? [];
    const count = subscribers.length;
    this.subscribers.delete(eventType);
    return count;
  }

  getSubscribers(eventType?: string): Subscriber[] {
    if (eventType) {
      return this.subscribers.get(eventType) ?? [];
    }
    const all: Subscriber[] = [];
    this.subscribers.forEach((subs) => all.push(...subs));
    return all;
  }

  hasSubscribers(eventType: string): boolean {
    return (this.subscribers.get(eventType)?.length ?? 0) > 0;
  }

  getSnapshot(): { metrics: typeof this.metrics; subscriberCount: number; eventTypes: number } {
    let total = 0;
    this.subscribers.forEach((subs) => (total += subs.length));
    return {
      metrics: { ...this.metrics },
      subscriberCount: total,
      eventTypes: this.subscribers.size,
    };
  }

  reset(): void {
    this.subscribers.clear();
    this.dispatchHistory = [];
    this.metrics = {
      dispatched: 0,
      received: 0,
      errors: 0,
      resetAt: Date.now(),
    };
  }

  getReport(): string {
    const snap = this.getSnapshot();
    return [
      '=== EventDispatcher Report ===',
      `Event Types: ${snap.eventTypes}`,
      `Total Subscribers: ${snap.subscriberCount}`,
      `Dispatched: ${snap.metrics.dispatched}`,
      `Received: ${snap.metrics.received}`,
      `Errors: ${snap.metrics.errors}`,
      `Reset At: ${snap.metrics.resetAt}`,
    ].join('\n');
  }

  exportMetrics(): { version: string; metrics: typeof this.metrics; config: DispatcherConfig } {
    return {
      version: 'V89',
      metrics: { ...this.metrics },
      config: { ...this.config },
    };
  }
}