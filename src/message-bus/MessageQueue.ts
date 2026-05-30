/**
 * V97 MessageQueue - Message queue with FIFO processing for doc-editor
 * Handles message queuing with enqueue/dequeue operations
 */

export type MessageQueueConfig = {
  maxSize?: number;
  enablePriority?: boolean;
  defaultPriority?: number;
  enableLogging?: boolean;
  processingTimeout?: number;
};

export type QueuedMessage = {
  id: string;
  payload: unknown;
  priority: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
};

type MessageQueueConfigType = MessageQueueConfig;

export class MessageQueue {
  private config: MessageQueueConfigType;
  private queue: QueuedMessage[] = [];
  private stats = {
    totalEnqueued: 0,
    totalDequeued: 0,
    totalPeeked: 0,
    maxQueueSize: 0,
  };

  constructor(config: MessageQueueConfig = {}) {
    this.config = {
      maxSize: config.maxSize ?? 1000,
      enablePriority: config.enablePriority ?? false,
      defaultPriority: config.defaultPriority ?? 0,
      enableLogging: config.enableLogging ?? true,
      processingTimeout: config.processingTimeout ?? 30000,
    };
  }

  enqueue(payload: unknown, priority?: number, metadata?: Record<string, unknown>): string {
    if (this.queue.length >= (this.config.maxSize ?? 1000)) {
      throw new Error('Queue is full');
    }
    const id = this.generateMessageId();
    const message: QueuedMessage = {
      id,
      payload,
      priority: priority ?? this.config.defaultPriority ?? 0,
      timestamp: Date.now(),
      metadata,
    };
    this.queue.push(message);
    this.stats.totalEnqueued++;

    if (this.queue.length > this.stats.maxQueueSize) {
      this.stats.maxQueueSize = this.queue.length;
    }

    if (this.config.enablePriority) {
      this.queue.sort((a, b) => b.priority - a.priority);
    }
    return id;
  }

  dequeue(): QueuedMessage | null {
    if (this.queue.length === 0) {
      return null;
    }
    this.stats.totalDequeued++;
    return this.queue.shift() ?? null;
  }

  peek(): QueuedMessage | null {
    if (this.queue.length === 0) {
      return null;
    }
    this.stats.totalPeeked++;
    const highestPriority = this.queue.reduce((best, current) => {
      if (this.config.enablePriority && current.priority > best.priority) {
        return current;
      }
      return best;
    }, this.queue[0]);
    return highestPriority;
  }

  size(): number {
    return this.queue.length;
  }

  getPending(): QueuedMessage[] {
    return [...this.queue];
  }

  clear(): void {
    this.queue = [];
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  isFull(): boolean {
    return this.queue.length >= (this.config.maxSize ?? 1000);
  }

  getStats(): {
    totalEnqueued: number;
    totalDequeued: number;
    totalPeeked: number;
    maxQueueSize: number;
    currentSize: number;
  } {
    return {
      totalEnqueued: this.stats.totalEnqueued,
      totalDequeued: this.stats.totalDequeued,
      totalPeeked: this.stats.totalPeeked,
      maxQueueSize: this.stats.maxQueueSize,
      currentSize: this.queue.length,
    };
  }

  getSnapshot(): { metrics: Record<string, unknown> } {
    return {
      metrics: {
        queue: [...this.queue],
        stats: this.getStats(),
        config: this.config,
      },
    };
  }

  reset(): void {
    this.queue = [];
    this.stats = {
      totalEnqueued: 0,
      totalDequeued: 0,
      totalPeeked: 0,
      maxQueueSize: 0,
    };
  }

  getReport(): string {
    const stats = this.getStats();
    const lines = [
      '=== Message Queue Report ===',
      `Total Enqueued: ${stats.totalEnqueued}`,
      `Total Dequeued: ${stats.totalDequeued}`,
      `Total Peeked: ${stats.totalPeeked}`,
      `Current Size: ${stats.currentSize}`,
      `Max Queue Size: ${stats.maxQueueSize}`,
      `Queue Full: ${this.isFull()}`,
      `Enable Priority: ${this.config.enablePriority}`,
      `Config: ${JSON.stringify(this.config)}`,
      '=============================',
    ];
    return lines.join('\n');
  }

  exportMetrics(): { version: string } {
    return {
      version: 'v97',
      enqueued: this.stats.totalEnqueued,
      dequeued: this.stats.totalDequeued,
      peeked: this.stats.totalPeeked,
      maxSize: this.stats.maxQueueSize,
      currentSize: this.queue.length,
      isFull: this.isFull(),
    };
  }

  private generateMessageId(): string {
    return `queue_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}