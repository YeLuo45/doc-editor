/**
 * PriorityQueue.ts - V98 Priority Queue Implementation
 * A priority queue with enqueue/dequeue/peek/size/getPending operations
 */

export type QueueItem<T = unknown> = {
  id: string;
  priority: number;
  data: T;
  timestamp: number;
  metadata?: Record<string, unknown>;
};

export type PriorityQueueConfig = {
  maxSize?: number;
  defaultPriority?: number;
  comparator?: (a: QueueItem, b: QueueItem) => number;
  autoCleanup?: boolean;
  cleanupIntervalMs?: number;
};

const DEFAULT_CONFIG: Required<PriorityQueueConfig> = {
  maxSize: 1000,
  defaultPriority: 0,
  comparator: (a, b) => b.priority - a.priority || a.timestamp - b.timestamp,
  autoCleanup: false,
  cleanupIntervalMs: 60000,
};

export class PriorityQueue<T = unknown> {
  private items: QueueItem<T>[] = [];
  private _config: Required<PriorityQueueConfig>;
  private cleanupTimer?: ReturnType<typeof setInterval>;

  constructor(config: PriorityQueueConfig = {}) {
    this._config = { ...DEFAULT_CONFIG, ...config };
    if (this._config.autoCleanup) {
      this.startCleanupTimer();
    }
  }

  get config(): PriorityQueueConfig {
    return { ...this._config };
  }

  get size(): number {
    return this.items.length;
  }

  get isEmpty(): boolean {
    return this.items.length === 0;
  }

  get isFull(): boolean {
    return this.items.length >= this._config.maxSize;
  }

  enqueue(item: Omit<QueueItem<T>, 'id' | 'timestamp'> & { id: string; timestamp?: number }): boolean {
    if (this.isFull) {
      return false;
    }

    const queueItem: QueueItem<T> = {
      id: item.id,
      priority: item.priority ?? this._config.defaultPriority,
      data: item.data as T,
      timestamp: item.timestamp ?? Date.now(),
      metadata: item.metadata,
    };

    this.items.push(queueItem);
    this.bubbleUp(this.items.length - 1);
    return true;
  }

  dequeue(): QueueItem<T> | undefined {
    if (this.isEmpty) {
      return undefined;
    }

    const result = this.items[0];
    const last = this.items.pop();

    if (this.items.length > 0 && last) {
      this.items[0] = last;
      this.bubbleDown(0);
    }

    return result;
  }

  peek(): QueueItem<T> | undefined {
    return this.items[0];
  }

  peekById(id: string): QueueItem<T> | undefined {
    return this.items.find(item => item.id === id);
  }

  remove(id: string): QueueItem<T> | undefined {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) {
      return undefined;
    }

    const removed = this.items[index];
    const last = this.items.pop();

    if (index < this.items.length && last) {
      this.items[index] = last;
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.compare(index, parentIndex) < 0) {
        this.bubbleUp(index);
      } else {
        this.bubbleDown(index);
      }
    }

    return removed;
  }

  clear(): void {
    this.items = [];
  }

  getPending(): QueueItem<T>[] {
    return [...this.items];
  }

  updatePriority(id: string, newPriority: number): boolean {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) {
      return false;
    }

    const oldPriority = this.items[index].priority;
    this.items[index].priority = newPriority;

    if (newPriority > oldPriority) {
      this.bubbleUp(index);
    } else {
      this.bubbleDown(index);
    }

    return true;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.compare(index, parentIndex) < 0) {
        this.swap(index, parentIndex);
        index = parentIndex;
      } else {
        break;
      }
    }
  }

  private bubbleDown(index: number): void {
    const length = this.items.length;

    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let smallest = index;

      if (leftChild < length && this.compare(leftChild, smallest) < 0) {
        smallest = leftChild;
      }

      if (rightChild < length && this.compare(rightChild, smallest) < 0) {
        smallest = rightChild;
      }

      if (smallest !== index) {
        this.swap(index, smallest);
        index = smallest;
      } else {
        break;
      }
    }
  }

  private compare(a: number, b: number): number {
    return this._config.comparator(this.items[a], this.items[b]);
  }

  private swap(a: number, b: number): void {
    const temp = this.items[a];
    this.items[a] = this.items[b];
    this.items[b] = temp;
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.items = this.items.filter(item => {
        const age = Date.now() - item.timestamp;
        return age < this._config.cleanupIntervalMs;
      });
    }, this._config.cleanupIntervalMs);
  }

  getSnapshot(): { metrics: Record<string, unknown>; items: QueueItem<T>[] } {
    return {
      metrics: {
        size: this.size,
        maxSize: this._config.maxSize,
        isEmpty: this.isEmpty,
        isFull: this.isFull,
        defaultPriority: this._config.defaultPriority,
      },
      items: this.getPending(),
    };
  }

  reset(): void {
    this.items = [];
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    if (this._config.autoCleanup) {
      this.startCleanupTimer();
    }
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    return JSON.stringify({
      type: 'PriorityQueue',
      version: 'V98',
      timestamp: new Date().toISOString(),
      metrics: snapshot.metrics,
      itemCount: snapshot.items.length,
    }, null, 2);
  }

  exportMetrics(): { version: string; metrics: Record<string, unknown> } {
    const snapshot = this.getSnapshot();
    return {
      version: 'V98',
      metrics: snapshot.metrics,
    };
  }
}