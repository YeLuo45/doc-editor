/**
 * V25 Offline-first Sync Engine - Offline Queue Module
 * Manages queued operations when offline
 */

export interface QueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  entityType: string;
  entityId: string;
  payload: unknown;
  timestamp: number;
  priority: number;
  retryCount: number;
  maxRetries: number;
  metadata?: Record<string, unknown>;
}

export interface QueueConfig {
  maxSize: number;
  maxRetries: number;
  retryDelay: number;
  batchSize: number;
}

export interface FlushResult {
  processedCount: number;
  successCount: number;
  failedCount: number;
  remainingCount: number;
}

export class OfflineQueue {
  private queue: Map<string, QueueItem> = new Map();
  private config: QueueConfig;
  private metrics: QueueMetrics;

  constructor(config?: Partial<QueueConfig>) {
    this.config = {
      maxSize: config?.maxSize ?? 1000,
      maxRetries: config?.maxRetries ?? 3,
      retryDelay: config?.retryDelay ?? 1000,
      batchSize: config?.batchSize ?? 50,
    };
    this.metrics = {
      enqueuedTotal: 0,
      dequeuedTotal: 0,
      flushedTotal: 0,
      failedTotal: 0,
      retryTotal: 0,
    };
  }

  /**
   * Add an item to the offline queue
   */
  enqueue(item: Omit<QueueItem, 'id' | 'timestamp' | 'retryCount'>): string | null {
    if (this.queue.size >= this.config.maxSize) {
      return null; // Queue is full
    }

    const id = `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const queueItem: QueueItem = {
      ...item,
      id,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: item.maxRetries ?? this.config.maxRetries,
    };

    this.queue.set(id, queueItem);
    this.metrics.enqueuedTotal++;
    
    return id;
  }

  /**
   * Remove and return an item from the queue
   */
  dequeue(id: string): QueueItem | undefined {
    const item = this.queue.get(id);
    if (item) {
      this.queue.delete(id);
      this.metrics.dequeuedTotal++;
    }
    return item;
  }

  /**
   * Flush the queue - process all items
   */
  async flush(processor: (item: QueueItem) => Promise<boolean>): Promise<FlushResult> {
    const items = this.getQueued();
    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;

    for (const item of items) {
      if (processedCount >= this.config.batchSize) {
        break; // Respect batch size limit
      }

      try {
        const success = await processor(item);
        processedCount++;

        if (success) {
          successCount++;
          this.queue.delete(item.id);
        } else {
          failedCount++;
          this.handleRetry(item);
        }
      } catch (error) {
        failedCount++;
        this.handleRetry(item);
      }
    }

    this.metrics.flushedTotal++;
    this.metrics.failedTotal += failedCount;

    return {
      processedCount,
      successCount,
      failedCount,
      remainingCount: this.queue.size,
    };
  }

  /**
   * Get all queued items sorted by priority and timestamp
   */
  getQueued(): QueueItem[] {
    return Array.from(this.queue.values())
      .sort((a, b) => {
        // Higher priority first, then earlier timestamp
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        return a.timestamp - b.timestamp;
      });
  }

  /**
   * Get items by entity type
   */
  getByEntityType(entityType: string): QueueItem[] {
    return this.getQueued().filter(item => item.entityType === entityType);
  }

  /**
   * Get items by entity ID
   */
  getByEntityId(entityId: string): QueueItem[] {
    return this.getQueued().filter(item => item.entityId === entityId);
  }

  /**
   * Get the count of queued items
   */
  get size(): number {
    return this.queue.size;
  }

  /**
   * Clear all items from the queue
   */
  clear(): number {
    const count = this.queue.size;
    this.queue.clear();
    return count;
  }

  /**
   * Remove a specific item from the queue
   */
  remove(id: string): boolean {
    return this.queue.delete(id);
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.size === 0;
  }

  /**
   * Check if queue is at capacity
   */
  isFull(): boolean {
    return this.queue.size >= this.config.maxSize;
  }

  /**
   * Get current snapshot for debugging
   */
  getSnapshot(): object {
    return {
      size: this.queue.size,
      maxSize: this.config.maxSize,
      utilizationPercent: (this.queue.size / this.config.maxSize) * 100,
      metrics: { ...this.metrics },
    };
  }

  /**
   * Reset the queue to initial state
   */
  reset(): void {
    this.queue.clear();
    this.metrics = {
      enqueuedTotal: 0,
      dequeuedTotal: 0,
      flushedTotal: 0,
      failedTotal: 0,
      retryTotal: 0,
    };
  }

  /**
   * Get a report of queue state
   */
  getReport(): object {
    return {
      size: this.queue.size,
      maxSize: this.config.maxSize,
      utilizationPercent: Math.round((this.queue.size / this.config.maxSize) * 100),
      config: { ...this.config },
      metrics: this.metrics,
    };
  }

  /**
   * Export metrics for external monitoring
   */
  exportMetrics(): object {
    return {
      ...this.metrics,
      currentQueueSize: this.queue.size,
      maxQueueSize: this.config.maxSize,
      flushSuccessRate: this.metrics.flushedTotal > 0
        ? (this.metrics.flushedTotal - this.metrics.failedTotal) / this.metrics.flushedTotal
        : 0,
      retryRate: this.metrics.flushedTotal > 0
        ? this.metrics.retryTotal / this.metrics.flushedTotal
        : 0,
    };
  }

  private handleRetry(item: QueueItem): void {
    if (item.retryCount < item.maxRetries) {
      item.retryCount++;
      this.metrics.retryTotal++;
    } else {
      // Max retries reached, remove from queue
      this.queue.delete(item.id);
    }
  }
}

interface QueueMetrics {
  enqueuedTotal: number;
  dequeuedTotal: number;
  flushedTotal: number;
  failedTotal: number;
  retryTotal: number;
}

export default OfflineQueue;