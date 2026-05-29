/**
 * EventQueue.ts - V89 Event Queue Implementation
 * Provides FIFO queue operations for events with tracking and metrics
 */

export type EventPriority = 'low' | 'normal' | 'high' | 'critical';
export type EventStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface QueuedEvent<T = unknown> {
  id: string;
  type: string;
  payload: T;
  priority: EventPriority;
  status: EventStatus;
  timestamp: number;
  retries: number;
  metadata?: Record<string, unknown>;
}

export interface EventQueueConfig {
  maxSize: number;
  maxRetries: number;
  defaultPriority: EventPriority;
  enableMetrics: boolean;
  enablePersistence: boolean;
}

type EventCallback<T = unknown> = (event: QueuedEvent<T>) => void;

export class EventQueue<T = unknown> {
  private readonly queue: QueuedEvent<T>[] = [];
  private readonly config: EventQueueConfig;
  private metrics = {
    enqueued: 0,
    dequeued: 0,
    peeked: 0,
    failed: 0,
    resetAt: 0,
  };

  constructor(config: Partial<EventQueueConfig> = {}) {
    this.config = {
      maxSize: config.maxSize ?? 1000,
      maxRetries: config.maxRetries ?? 3,
      defaultPriority: config.defaultPriority ?? 'normal',
      enableMetrics: config.enableMetrics ?? true,
      enablePersistence: config.enablePersistence ?? false,
    };
  }

  enqueue(
    type: string,
    payload: T,
    options: { priority?: EventPriority; id?: string; metadata?: Record<string, unknown> } = {}
  ): QueuedEvent<T> {
    if (this.queue.length >= this.config.maxSize) {
      throw new Error(`Queue is full. Max size: ${this.config.maxSize}`);
    }

    const event: QueuedEvent<T> = {
      id: options.id ?? `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      type,
      payload,
      priority: options.priority ?? this.config.defaultPriority,
      status: 'pending',
      timestamp: Date.now(),
      retries: 0,
      metadata: options.metadata,
    };

    this.queue.push(event);
    this.sortByPriority();
    this.metrics.enqueued++;
    return event;
  }

  dequeue(): QueuedEvent<T> | undefined {
    const event = this.queue.shift();
    if (event) {
      event.status = 'processing';
      this.metrics.dequeued++;
    }
    return event;
  }

  peek(): QueuedEvent<T> | undefined {
    const event = this.queue[0];
    if (event) {
      this.metrics.peeked++;
    }
    return event;
  }

  size(): number {
    return this.queue.length;
  }

  getPending(): QueuedEvent<T>[] {
    return this.queue.filter((e) => e.status === 'pending');
  }

  getAll(): QueuedEvent<T>[] {
    return [...this.queue];
  }

  clear(): void {
    this.queue.length = 0;
  }

  private sortByPriority(): void {
    const priorityOrder: Record<EventPriority, number> = {
      critical: 0,
      high: 1,
      normal: 2,
      low: 3,
    };
    this.queue.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  getSnapshot(): { metrics: typeof this.metrics; size: number; config: EventQueueConfig } {
    return {
      metrics: { ...this.metrics },
      size: this.queue.length,
      config: { ...this.config },
    };
  }

  reset(): void {
    this.queue.length = 0;
    this.metrics = {
      enqueued: 0,
      dequeued: 0,
      peeked: 0,
      failed: 0,
      resetAt: Date.now(),
    };
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    return [
      '=== EventQueue Report ===',
      `Queue Size: ${snapshot.size}`,
      `Max Size: ${snapshot.config.maxSize}`,
      `Enqueued: ${snapshot.metrics.enqueued}`,
      `Dequeued: ${snapshot.metrics.dequeued}`,
      `Peeked: ${snapshot.metrics.peeked}`,
      `Failed: ${snapshot.metrics.failed}`,
      `Reset At: ${snapshot.metrics.resetAt}`,
    ].join('\n');
  }

  exportMetrics(): { version: string; metrics: typeof this.metrics; config: EventQueueConfig } {
    return {
      version: 'V89',
      metrics: { ...this.metrics },
      config: { ...this.config },
    };
  }
}