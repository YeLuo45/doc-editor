/**
 * QueueManager.ts - V98 Queue Manager Implementation
 * Manages multiple priority queues with create/get/getStats/getQueues
 */

import { PriorityQueue, QueueItem, PriorityQueueConfig } from './PriorityQueue';

export type QueueStats = {
  id: string;
  name: string;
  size: number;
  maxSize: number;
  isEmpty: boolean;
  isFull: boolean;
  createdAt: number;
};

export type QueueManagerConfig = {
  maxQueues?: number;
  defaultQueueConfig?: PriorityQueueConfig;
  enableStats?: boolean;
  trackHistory?: boolean;
};

const DEFAULT_CONFIG: Required<QueueManagerConfig> = {
  maxQueues: 50,
  defaultQueueConfig: { maxSize: 1000, defaultPriority: 0 },
  enableStats: true,
  trackHistory: true,
};

export class QueueManager {
  private queues: Map<string, PriorityQueue> = new Map();
  private queueNames: Map<string, string> = new Map();
  private queueStats: Map<string, QueueStats> = new Map();
  private _config: Required<QueueManagerConfig>;

  constructor(config: QueueManagerConfig = {}) {
    this._config = { ...DEFAULT_CONFIG, ...config };
  }

  get config(): QueueManagerConfig {
    return { ...this._config };
  }

  create(id: string, name: string, config?: PriorityQueueConfig): boolean {
    if (this.queues.has(id)) {
      return false;
    }

    if (this.queues.size >= this._config.maxQueues) {
      return false;
    }

    const queueConfig = { ...this._config.defaultQueueConfig, ...config };
    const queue = new PriorityQueue(queueConfig);

    this.queues.set(id, queue);
    this.queueNames.set(id, name);
    this.queueStats.set(id, {
      id,
      name,
      size: 0,
      maxSize: queueConfig.maxSize ?? 1000,
      isEmpty: true,
      isFull: false,
      createdAt: Date.now(),
    });

    return true;
  }

  get(id: string): PriorityQueue | undefined {
    return this.queues.get(id);
  }

  delete(id: string): boolean {
    const existed = this.queues.has(id);
    this.queues.delete(id);
    this.queueNames.delete(id);
    this.queueStats.delete(id);
    return existed;
  }

  exists(id: string): boolean {
    return this.queues.has(id);
  }

  getStats(id: string): QueueStats | undefined {
    if (!this._config.enableStats) {
      return undefined;
    }

    const stats = this.queueStats.get(id);
    if (!stats) {
      return undefined;
    }

    const queue = this.queues.get(id);
    if (!queue) {
      return undefined;
    }

    const snapshot = queue.getSnapshot();
    return {
      ...stats,
      size: snapshot.metrics.size as number,
      maxSize: snapshot.metrics.maxSize as number,
      isEmpty: snapshot.metrics.isEmpty as boolean,
      isFull: snapshot.metrics.isFull as boolean,
    };
  }

  getQueues(): Array<{ id: string; name: string }> {
    return Array.from(this.queueNames.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }

  getAllStats(): Map<string, QueueStats> {
    const result = new Map<string, QueueStats>();
    for (const id of this.queues.keys()) {
      const stats = this.getStats(id);
      if (stats) {
        result.set(id, stats);
      }
    }
    return result;
  }

  enqueue(queueId: string, item: Omit<QueueItem, 'id' | 'timestamp'> & { id: string; timestamp?: number }): boolean {
    const queue = this.queues.get(queueId);
    if (!queue) {
      return false;
    }
    return queue.enqueue(item);
  }

  dequeue(queueId: string): QueueItem | undefined {
    const queue = this.queues.get(queueId);
    if (!queue) {
      return undefined;
    }
    return queue.dequeue();
  }

  peek(queueId: string): QueueItem | undefined {
    const queue = this.queues.get(queueId);
    if (!queue) {
      return undefined;
    }
    return queue.peek();
  }

  getPending(queueId: string): QueueItem[] {
    const queue = this.queues.get(queueId);
    if (!queue) {
      return [];
    }
    return queue.getPending();
  }

  getSnapshot(): { metrics: Record<string, unknown>; queues: string[] } {
    const queueIds = Array.from(this.queues.keys());
    const totalSize = queueIds.reduce((sum, id) => {
      const queue = this.queues.get(id);
      return sum + (queue?.size ?? 0);
    }, 0);

    return {
      metrics: {
        totalQueues: this.queues.size,
        maxQueues: this._config.maxQueues,
        totalItems: totalSize,
        enableStats: this._config.enableStats,
        trackHistory: this._config.trackHistory,
      },
      queues: queueIds,
    };
  }

  reset(): void {
    for (const queue of this.queues.values()) {
      queue.reset();
    }
    this.queueStats.clear();
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    const allStats = this.getAllStats();

    return JSON.stringify({
      type: 'QueueManager',
      version: 'V98',
      timestamp: new Date().toISOString(),
      metrics: snapshot.metrics,
      queueDetails: Array.from(allStats.values()),
    }, null, 2);
  }

  exportMetrics(): { version: string; metrics: Record<string, unknown> } {
    return {
      version: 'V98',
      metrics: {
        ...this.getSnapshot().metrics,
        queues: this.getAllStats(),
      },
    };
  }
}