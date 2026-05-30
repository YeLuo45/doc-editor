/**
 * QueueMonitor.ts - V98 Queue Monitor Implementation
 * Monitors queue operations with track/getMetrics/getHistory/getStatus
 */

import { QueueManager } from './QueueManager';

export type MetricPoint = {
  timestamp: number;
  value: number;
};

export type QueueMetrics = {
  enqueued: MetricPoint[];
  dequeued: MetricPoint[];
  peeked: MetricPoint[];
  errors: MetricPoint[];
  queueSizes: Map<string, MetricPoint[]>;
};

export type MonitorConfig = {
  historySize?: number;
  trackErrors?: boolean;
  trackLatency?: boolean;
  samplingIntervalMs?: number;
};

const DEFAULT_CONFIG: Required<MonitorConfig> = {
  historySize: 100,
  trackErrors: true,
  trackLatency: true,
  samplingIntervalMs: 5000,
};

export class QueueMonitor {
  private _config: Required<MonitorConfig>;
  private queueManager: QueueManager;
  private metrics: QueueMetrics;
  private status: 'active' | 'paused' | 'stopped' = 'active';
  private startTime: number = Date.now();

  constructor(queueManager: QueueManager, config: MonitorConfig = {}) {
    this.queueManager = queueManager;
    this._config = { ...DEFAULT_CONFIG, ...config };

    this.metrics = {
      enqueued: [],
      dequeued: [],
      peeked: [],
      errors: [],
      queueSizes: new Map(),
    };
  }

  get config(): MonitorConfig {
    return { ...this._config };
  }

  get monitorStatus(): 'active' | 'paused' | 'stopped' {
    return this.status;
  }

  track(operation: 'enqueue' | 'dequeue' | 'peek' | 'error', queueId?: string, value: number = 1): void {
    if (this.status !== 'active') {
      return;
    }

    const point: MetricPoint = {
      timestamp: Date.now(),
      value,
    };

    switch (operation) {
      case 'enqueue':
        this.metrics.enqueued.push(point);
        break;
      case 'dequeue':
        this.metrics.dequeued.push(point);
        break;
      case 'peek':
        this.metrics.peeked.push(point);
        break;
      case 'error':
        if (this._config.trackErrors) {
          this.metrics.errors.push(point);
        }
        break;
    }

    if (queueId) {
      this.trackQueueSize(queueId);
    }

    this.pruneOldMetrics();
  }

  trackQueueSize(queueId: string): void {
    const queue = this.queueManager.get(queueId);
    if (!queue) {
      return;
    }

    let queueSizeMetrics = this.metrics.queueSizes.get(queueId);
    if (!queueSizeMetrics) {
      queueSizeMetrics = [];
      this.metrics.queueSizes.set(queueId, queueSizeMetrics);
    }

    queueSizeMetrics.push({
      timestamp: Date.now(),
      value: queue.size,
    });

    if (queueSizeMetrics.length > this._config.historySize) {
      queueSizeMetrics.shift();
    }
  }

  getMetrics(): {
    enqueued: number;
    dequeued: number;
    peeked: number;
    errors: number;
    totalOperations: number;
  } {
    return {
      enqueued: this.metrics.enqueued.length,
      dequeued: this.metrics.dequeued.length,
      peeked: this.metrics.peeked.length,
      errors: this.metrics.errors.length,
      totalOperations:
        this.metrics.enqueued.length +
        this.metrics.dequeued.length +
        this.metrics.peeked.length,
    };
  }

  getHistory(operation?: 'enqueue' | 'dequeue' | 'peek' | 'error'): MetricPoint[] {
    if (operation) {
      return this.metrics[operation] ?? [];
    }

    return [
      ...this.metrics.enqueued,
      ...this.metrics.dequeued,
      ...this.metrics.peeked,
      ...this.metrics.errors,
    ].sort((a, b) => a.timestamp - b.timestamp);
  }

  getQueueHistory(queueId: string): MetricPoint[] {
    return this.metrics.queueSizes.get(queueId) ?? [];
  }

  getStatus(): {
    status: 'active' | 'paused' | 'stopped';
    uptimeMs: number;
    metrics: ReturnType<QueueMonitor['getMetrics']>;
    historySize: number;
    samplingIntervalMs: number;
  } {
    return {
      status: this.status,
      uptimeMs: Date.now() - this.startTime,
      metrics: this.getMetrics(),
      historySize: this.metrics.enqueued.length +
        this.metrics.dequeued.length +
        this.metrics.peeked.length +
        this.metrics.errors.length,
      samplingIntervalMs: this._config.samplingIntervalMs,
    };
  }

  pause(): void {
    this.status = 'paused';
  }

  resume(): void {
    this.status = 'active';
  }

  stop(): void {
    this.status = 'stopped';
  }

  private pruneOldMetrics(): void {
    const maxSize = this._config.historySize;

    for (const op of ['enqueued', 'dequeued', 'peeked', 'errors'] as const) {
      if (this.metrics[op].length > maxSize) {
        this.metrics[op] = this.metrics[op].slice(-maxSize);
      }
    }
  }

  getSnapshot(): { metrics: Record<string, unknown>; status: string } {
    const currentMetrics = this.getMetrics();
    const allQueueIds = this.queueManager.getQueues().map(q => q.id);

    const queueSizeSnapshots: Record<string, number[]> = {};
    for (const queueId of allQueueIds) {
      const history = this.getQueueHistory(queueId);
      queueSizeSnapshots[queueId] = history.map(p => p.value);
    }

    return {
      metrics: {
        ...currentMetrics,
        queueSizes: queueSizeSnapshots,
        uptimeMs: Date.now() - this.startTime,
      },
      status: this.status,
    };
  }

  reset(): void {
    this.metrics = {
      enqueued: [],
      dequeued: [],
      peeked: [],
      errors: [],
      queueSizes: new Map(),
    };
    this.status = 'active';
    this.startTime = Date.now();
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    const status = this.getStatus();

    return JSON.stringify({
      type: 'QueueMonitor',
      version: 'V98',
      timestamp: new Date().toISOString(),
      status: status.status,
      uptimeMs: status.uptimeMs,
      metrics: snapshot.metrics,
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