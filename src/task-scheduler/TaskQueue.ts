/**
 * TaskQueue.ts - V73 Task Queue Module
 * Priority-based task queue with persistent ordering
 */

export type QueuePriority = 'high' | 'normal' | 'low';

export interface QueuedTask {
  id: string;
  name: string;
  priority: QueuePriority;
  enqueuedAt: number;
  payload: unknown;
  retries: number;
  maxRetries: number;
}

export interface QueueConfig {
  maxSize: number;
  defaultPriority: QueuePriority;
  enablePersistence: boolean;
  processingInterval: number;
}

interface QueueMetrics {
  enqueued: number;
  dequeued: number;
  processed: number;
  failed: number;
  peeked: number;
}

export class TaskQueue {
  public config: QueueConfig;
  
  private queue: QueuedTask[] = [];
  private metrics: QueueMetrics = {
    enqueued: 0,
    dequeued: 0,
    processed: 0,
    failed: 0,
    peeked: 0,
  };

  constructor(config: Partial<QueueConfig> = {}) {
    this.config = {
      maxSize: config.maxSize ?? 1000,
      defaultPriority: config.defaultPriority ?? 'normal',
      enablePersistence: config.enablePersistence ?? false,
      processingInterval: config.processingInterval ?? 100,
    };
  }

  /**
   * Add a task to the queue
   */
  enqueue(
    id: string,
    name: string,
    payload: unknown = {},
    options: { priority?: QueuePriority; maxRetries?: number } = {}
  ): boolean {
    if (this.queue.length >= this.config.maxSize) {
      return false;
    }

    const task: QueuedTask = {
      id,
      name,
      priority: options.priority ?? this.config.defaultPriority,
      enqueuedAt: Date.now(),
      payload,
      retries: 0,
      maxRetries: options.maxRetries ?? 3,
    };

    this.insertByPriority(task);
    this.metrics.enqueued++;
    
    return true;
  }

  /**
   * Remove and return the highest priority task
   */
  dequeue(): QueuedTask | undefined {
    const task = this.queue.shift();
    if (task) {
      this.metrics.dequeued++;
    }
    return task;
  }

  /**
   * View the next task without removing it
   */
  peek(): QueuedTask | undefined {
    const task = this.queue[0];
    if (task) {
      this.metrics.peeked++;
    }
    return task;
  }

  /**
   * Get current queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Get all pending tasks
   */
  getPending(): QueuedTask[] {
    return [...this.queue];
  }

  /**
   * Get snapshot of queue state
   */
  getSnapshot(): { metrics: QueueMetrics } {
    return {
      metrics: { ...this.metrics },
    };
  }

  /**
   * Reset queue state
   */
  reset(): void {
    this.queue = [];
    this.metrics = {
      enqueued: 0,
      dequeued: 0,
      processed: 0,
      failed: 0,
      peeked: 0,
    };
  }

  /**
   * Generate human-readable report
   */
  getReport(): string {
    const lines = [
      '=== TaskQueue Report ===',
      `Queue Size: ${this.size()}/${this.config.maxSize}`,
      `Enqueued: ${this.metrics.enqueued}`,
      `Dequeued: ${this.metrics.dequeued}`,
      `Processed: ${this.metrics.processed}`,
      `Failed: ${this.metrics.failed}`,
      `Peeked: ${this.metrics.peeked}`,
      '========================',
    ];
    return lines.join('\n');
  }

  /**
   * Export metrics in standardized format
   */
  exportMetrics(): { version: string; metrics: QueueMetrics } {
    return {
      version: 'V73-task-queue',
      metrics: { ...this.metrics },
    };
  }

  /**
   * Increment processed count
   */
  markProcessed(): void {
    this.metrics.processed++;
  }

  /**
   * Increment failed count
   */
  markFailed(): void {
    this.metrics.failed++;
  }

  /**
   * Get tasks by priority level
   */
  getByPriority(priority: QueuePriority): QueuedTask[] {
    return this.queue.filter(t => t.priority === priority);
  }

  /**
   * Remove a specific task by ID
   */
  remove(id: string): boolean {
    const index = this.queue.findIndex(t => t.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Re-prioritize a task
   */
  reprioritize(id: string, newPriority: QueuePriority): boolean {
    const task = this.queue.find(t => t.id === id);
    if (task) {
      this.remove(id);
      task.priority = newPriority;
      this.insertByPriority(task);
      return true;
    }
    return false;
  }

  /**
   * Clear all tasks from queue
   */
  clear(): void {
    this.queue = [];
  }

  private insertByPriority(task: QueuedTask): void {
    const priorityOrder: Record<QueuePriority, number> = {
      high: 0,
      normal: 1,
      low: 2,
    };

    const insertIndex = this.queue.findIndex(
      t => priorityOrder[t.priority] > priorityOrder[task.priority]
    );

    if (insertIndex === -1) {
      this.queue.push(task);
    } else {
      this.queue.splice(insertIndex, 0, task);
    }
  }
}