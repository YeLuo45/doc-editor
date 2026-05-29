/**
 * V62 Notification Engine - NotificationQueue
 * Queue management with enqueue/dequeue/peek/size/getPending
 */

export type QueuePriority = 'low' | 'normal' | 'high' | 'critical';

export interface QueuedNotification {
  id: string;
  notification: {
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    body: string;
    timestamp: number;
    source?: string;
    metadata?: Record<string, unknown>;
  };
  priority: QueuePriority;
  enqueuedAt: number;
  scheduledFor?: number;
  retryCount: number;
  maxRetries: number;
}

export interface QueueConfig {
  maxSize: number;
  maxRetries: number;
  retryDelay: number;
  enableScheduling: boolean;
  processingMode: 'fifo' | 'priority';
  overflowPolicy: 'reject' | 'drop-oldest';
}

export class NotificationQueue {
  private _queue: QueuedNotification[] = [];
  private _config: QueueConfig;
  private _metrics = {
    totalEnqueued: 0,
    totalDequeued: 0,
    totalPeeked: 0,
    totalDropped: 0,
    totalRetried: 0,
  };

  constructor(config: QueueConfig) {
    this._config = { ...config };
  }

  get config(): QueueConfig {
    return { ...this._config };
  }

  get size(): number {
    return this._queue.length;
  }

  private generateId(): string {
    return `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  enqueue(notification: QueuedNotification['notification'], priority?: QueuePriority): QueuedNotification {
    const queued: QueuedNotification = {
      id: this.generateId(),
      notification: { ...notification, timestamp: notification.timestamp || Date.now() },
      priority: priority || 'normal',
      enqueuedAt: Date.now(),
      retryCount: 0,
      maxRetries: this._config.maxRetries,
    };

    if (this._queue.length >= this._config.maxSize) {
      if (this._config.overflowPolicy === 'reject') {
        throw new Error('Queue is full');
      } else {
        this._queue = this._queue.slice(1);
        this._metrics.totalDropped++;
      }
    }

    this._queue.push(queued);
    this._metrics.totalEnqueued++;

    if (this._config.processingMode === 'priority') {
      this._queue.sort((a, b) => this._priorityValue(b.priority) - this._priorityValue(a.priority));
    }

    return queued;
  }

  dequeue(): QueuedNotification | undefined {
    const item = this._queue.shift();
    if (item) {
      this._metrics.totalDequeued++;
    }
    return item;
  }

  peek(): QueuedNotification | undefined {
    const item = this._queue[0];
    if (item) {
      this._metrics.totalPeeked++;
    }
    return item ? { ...item } : undefined;
  }

  getPending(filter?: { priority?: QueuePriority }): QueuedNotification[] {
    let pending = [...this._queue];
    
    if (filter?.priority) {
      pending = pending.filter(n => n.priority === filter.priority);
    }
    
    return pending;
  }

  private _priorityValue(priority: QueuePriority): number {
    const values: Record<QueuePriority, number> = {
      low: 1,
      normal: 2,
      high: 3,
      critical: 4,
    };
    return values[priority] || 0;
  }

  remove(id: string): boolean {
    const index = this._queue.findIndex(n => n.id === id);
    if (index !== -1) {
      this._queue.splice(index, 1);
      return true;
    }
    return false;
  }

  clear(): void {
    this._queue = [];
  }

  getSnapshot(): { metrics: typeof NotificationQueue.prototype._metrics; config: QueueConfig; size: number; capacity: number } {
    return {
      metrics: { ...this._metrics },
      config: this.config,
      size: this._queue.length,
      capacity: this._config.maxSize,
    };
  }

  reset(): void {
    this._queue = [];
    this._metrics = {
      totalEnqueued: 0,
      totalDequeued: 0,
      totalPeeked: 0,
      totalDropped: 0,
      totalRetried: 0,
    };
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    return [
      '=== NotificationQueue Report ===',
      `Total Enqueued: ${snapshot.metrics.totalEnqueued}`,
      `Total Dequeued: ${snapshot.metrics.totalDequeued}`,
      `Total Peeked: ${snapshot.metrics.totalPeeked}`,
      `Total Dropped: ${snapshot.metrics.totalDropped}`,
      `Total Retried: ${snapshot.metrics.totalRetried}`,
      `Current Size: ${snapshot.size}`,
      `Max Capacity: ${snapshot.capacity}`,
      `Processing Mode: ${snapshot.config.processingMode}`,
      `Overflow Policy: ${snapshot.config.overflowPolicy}`,
    ].join('\n');
  }

  exportMetrics(): { version: string; metrics: typeof NotificationQueue.prototype._metrics } {
    return {
      version: 'V62',
      metrics: { ...this._metrics },
    };
  }
}

export default NotificationQueue;