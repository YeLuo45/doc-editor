/**
 * V116 Batcher - Core batch processing unit
 * Handles batch creation, item addition, flushing, and statistics
 */

export interface BatcherConfig {
  name: string;
  maxSize: number;
  flushInterval: number;
  onFlush?: (items: unknown[]) => void;
}

export interface BatcherStats {
  totalAdded: number;
  totalFlushed: number;
  currentSize: number;
  lastFlushTime: number | null;
}

export class Batcher<T = unknown> {
  public config: BatcherConfig;
  private items: T[] = [];
  private stats: BatcherStats = {
    totalAdded: 0,
    totalFlushed: 0,
    currentSize: 0,
    lastFlushTime: null,
  };
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: BatcherConfig) {
    this.config = { ...config };
    this.startFlushTimer();
  }

  /**
   * Add single item to batch
   */
  add(item: T): void {
    this.items.push(item);
    this.stats.totalAdded++;
    this.stats.currentSize = this.items.length;

    if (this.items.length >= this.config.maxSize) {
      this.flush();
    }
  }

  /**
   * Batch add multiple items
   */
  batch(items: T[]): void {
    for (const item of items) {
      this.add(item);
    }
  }

  /**
   * Flush current batch - process and clear items
   */
  flush(): T[] {
    if (this.items.length === 0) {
      return [];
    }

    const flushedItems = [...this.items];
    this.items = [];
    this.stats.currentSize = 0;
    this.stats.totalFlushed++;
    this.stats.lastFlushTime = Date.now();

    if (this.config.onFlush) {
      this.config.onFlush(flushedItems);
    }

    this.resetFlushTimer();
    return flushedItems;
  }

  /**
   * Get current batch items
   */
  getBatch(): T[] {
    return [...this.items];
  }

  /**
   * Get current statistics
   */
  getStats(): BatcherStats {
    return { ...this.stats };
  }

  /**
   * Get snapshot of current state
   */
  getSnapshot(): { metrics: BatcherStats; config: BatcherConfig; itemCount: number } {
    return {
      metrics: this.getStats(),
      config: { ...this.config },
      itemCount: this.items.length,
    };
  }

  /**
   * Reset batcher to initial state
   */
  reset(): void {
    this.items = [];
    this.stats = {
      totalAdded: 0,
      totalFlushed: 0,
      currentSize: 0,
      lastFlushTime: null,
    };
    this.resetFlushTimer();
    this.startFlushTimer();
  }

  /**
   * Generate text report
   */
  getReport(): string {
    const snap = this.getSnapshot();
    return [
      `Batcher Report: ${this.config.name}`,
      `  Items in batch: ${snap.itemCount}`,
      `  Total added: ${snap.metrics.totalAdded}`,
      `  Total flushed: ${snap.metrics.totalFlushed}`,
      `  Last flush: ${snap.metrics.lastFlushTime ? new Date(snap.metrics.lastFlushTime).toISOString() : 'Never'}`,
      `  Max size: ${this.config.maxSize}`,
      `  Flush interval: ${this.config.flushInterval}ms`,
    ].join('\n');
  }

  /**
   * Export metrics object
   */
  exportMetrics(): { version: string; name: string; stats: BatcherStats } {
    return {
      version: '1.16.0',
      name: this.config.name,
      stats: this.getStats(),
    };
  }

  private startFlushTimer(): void {
    if (this.config.flushInterval > 0) {
      this.flushTimer = setTimeout(() => {
        this.flush();
        this.startFlushTimer();
      }, this.config.flushInterval);
    }
  }

  private resetFlushTimer(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }
}