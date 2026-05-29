/**
 * Queue.ts - Task queue module for V34 Iteration 4
 * Provides FIFO task queue with enqueue, dequeue, peek, size operations
 */

export interface QueueMetrics {
  enqueues: number;
  dequeues: number;
  peeks: number;
  overflows: number;
  underflows: number;
  clears: number;
  errors: number;
}

export interface QueueSnapshot {
  size: number;
  front: unknown | null;
  rear: unknown | null;
  metrics: QueueMetrics;
}

export interface QueueOptions {
  maxSize?: number;
}

export class Queue {
  private items: unknown[] = [];
  private maxSize: number;
  private metrics: QueueMetrics = {
    enqueues: 0,
    dequeues: 0,
    peeks: 0,
    overflows: 0,
    underflows: 0,
    clears: 0,
    errors: 0,
  };

  constructor(options: QueueOptions = {}) {
    this.maxSize = options.maxSize ?? Infinity;
  }

  /**
   * Add item to the back of queue
   */
  enqueue(item: unknown): boolean {
    try {
      if (this.items.length >= this.maxSize) {
        this.metrics.overflows++;
        return false;
      }
      this.items.push(item);
      this.metrics.enqueues++;
      return true;
    } catch (e) {
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Remove and return item from front of queue
   */
  dequeue(): unknown {
    try {
      if (this.items.length === 0) {
        this.metrics.underflows++;
        return undefined;
      }
      this.metrics.dequeues++;
      return this.items.shift();
    } catch (e) {
      this.metrics.errors++;
      return undefined;
    }
  }

  /**
   * View item at front without removing
   */
  peek(): unknown {
    try {
      if (this.items.length === 0) {
        this.metrics.underflows++;
        return undefined;
      }
      this.metrics.peeks++;
      return this.items[0];
    } catch (e) {
      this.metrics.errors++;
      return undefined;
    }
  }

  /**
   * Get current number of items in queue
   */
  size(): number {
    return this.items.length;
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.items.length === 0;
  }

  /**
   * Check if queue is at capacity
   */
  isFull(): boolean {
    return this.items.length >= this.maxSize;
  }

  /**
   * Clear all items from queue
   */
  clear(): void {
    this.items = [];
    this.metrics.clears++;
  }

  /**
   * Get current snapshot of queue state
   */
  getSnapshot(): QueueSnapshot {
    return {
      size: this.items.length,
      front: this.items[0] ?? null,
      rear: this.items[this.items.length - 1] ?? null,
      metrics: { ...this.metrics },
    };
  }

  /**
   * Reset queue to initial state
   */
  reset(): void {
    this.items = [];
    this.metrics = {
      enqueues: 0,
      dequeues: 0,
      peeks: 0,
      overflows: 0,
      underflows: 0,
      clears: 0,
      errors: 0,
    };
  }

  /**
   * Get human-readable report
   */
  getReport(): string {
    return [
      '=== Queue Report ===',
      `Size: ${this.items.length}/${this.maxSize}`,
      `Enqueues: ${this.metrics.enqueues}`,
      `Dequeues: ${this.metrics.dequeues}`,
      `Peeks: ${this.metrics.peeks}`,
      `Overflows: ${this.metrics.overflows}`,
      `Underflows: ${this.metrics.underflows}`,
      `Clears: ${this.metrics.clears}`,
      `Errors: ${this.metrics.errors}`,
      '===================',
    ].join('\n');
  }

  /**
   * Export metrics as plain object
   */
  exportMetrics(): QueueMetrics {
    return { ...this.metrics };
  }
}

export default Queue;