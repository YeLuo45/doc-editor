/**
 * Dead Letter Queue - V103
 * Handles failed messages that exceed retry limits
 */

export interface DeadLetterItem<T = unknown> {
  id: string;
  payload: T;
  error: string;
  timestamp: number;
  retryCount: number;
  originalQueue: string;
  metadata?: Record<string, unknown>;
}

export interface DLQConfig {
  maxSize: number;
  retentionPeriod: number;
  enableCompression: boolean;
  namespace: string;
}

type DLQConfigAlias = DLQConfig;

export class DeadLetterQueue<T = unknown> {
  private queue: DeadLetterItem<T>[] = [];
  public readonly config: DLQConfigAlias;

  constructor(config: Partial<DLQConfig> = {}) {
    this.config = {
      maxSize: config.maxSize ?? 10000,
      retentionPeriod: config.retentionPeriod ?? 86400000,
      enableCompression: config.enableCompression ?? false,
      namespace: config.namespace ?? 'default'
    };
  }

  enqueue(item: Omit<DeadLetterItem<T>, 'id' | 'timestamp'>): boolean {
    const deadLetterItem: DeadLetterItem<T> = {
      ...item,
      id: this.generateId(),
      timestamp: Date.now()
    };

    if (this.queue.length >= this.config.maxSize) {
      this.queue.shift();
    }

    this.queue.push(deadLetterItem);
    return true;
  }

  requeue(itemId: string): boolean {
    const index = this.queue.findIndex(item => item.id === itemId);
    if (index === -1) return false;

    const item = this.queue.splice(index, 1)[0];
    item.retryCount++;
    item.timestamp = Date.now();
    this.queue.unshift(item);
    return true;
  }

  get(itemId: string): DeadLetterItem<T> | undefined {
    return this.queue.find(item => item.id === itemId);
  }

  getPending(): DeadLetterItem<T>[] {
    const now = Date.now();
    const expiry = now - this.config.retentionPeriod;
    return this.queue.filter(item => item.timestamp > expiry);
  }

  getStats(): {
    total: number;
    pending: number;
    oldestTimestamp: number | null;
    newestTimestamp: number | null;
  } {
    const pending = this.getPending();
    const timestamps = this.queue.map(item => item.timestamp);

    return {
      total: this.queue.length,
      pending: pending.length,
      oldestTimestamp: timestamps.length > 0 ? Math.min(...timestamps) : null,
      newestTimestamp: timestamps.length > 0 ? Math.max(...timestamps) : null
    };
  }

  getSnapshot(): { metrics: Record<string, unknown>; queueLength: number } {
    return {
      metrics: {
        ...this.getStats(),
        config: this.config,
        version: '1.0.3'
      },
      queueLength: this.queue.length
    };
  }

  reset(): void {
    this.queue = [];
  }

  getReport(): string {
    const stats = this.getStats();
    return [
      `Dead Letter Queue Report [${this.config.namespace}]`,
      `==========================================`,
      `Total Items: ${stats.total}`,
      `Pending Items: ${stats.pending}`,
      `Oldest: ${stats.oldestTimestamp ? new Date(stats.oldestTimestamp).toISOString() : 'N/A'}`,
      `Newest: ${stats.newestTimestamp ? new Date(stats.newestTimestamp).toISOString() : 'N/A'}`,
      `Max Size: ${this.config.maxSize}`,
      `Retention: ${this.config.retentionPeriod}ms`
    ].join('\n');
  }

  exportMetrics(): { version: string; stats: ReturnType<typeof this.getStats> } {
    return {
      version: '1.0.3',
      stats: this.getStats()
    };
  }

  private generateId(): string {
    return `dlq_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}