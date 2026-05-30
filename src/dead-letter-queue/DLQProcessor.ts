/**
 * DLQ Processor - V103
 * Processes items from the dead letter queue
 */

import { DeadLetterQueue, DeadLetterItem } from './DeadLetterQueue';
import { DLQPolicy } from './DLQPolicy';
import { DLQMonitor } from './DLQMonitor';

export interface DLQProcessorConfig {
  batchSize: number;
  processingIntervalMs: number;
  enableAutoProcess: boolean;
  namespace: string;
}

type DLQProcessorConfigAlias = DLQProcessorConfig;

export class DLQProcessor<T = unknown> {
  private queue: DeadLetterQueue<T>;
  private policy: DLQPolicy;
  private monitor: DLQMonitor;
  public readonly config: DLQProcessorConfigAlias;
  private isProcessing: boolean = false;
  private processedIds: Set<string> = new Set();

  constructor(
    queue: DeadLetterQueue<T>,
    policy: DLQPolicy,
    monitor: DLQMonitor,
    config: Partial<DLQProcessorConfig> = {}
  ) {
    this.queue = queue;
    this.policy = policy;
    this.monitor = monitor;
    this.config = {
      batchSize: config.batchSize ?? 10,
      processingIntervalMs: config.processingIntervalMs ?? 5000,
      enableAutoProcess: config.enableAutoProcess ?? false,
      namespace: config.namespace ?? 'default'
    };
  }

  async process(handler: (item: DeadLetterItem<T>) => Promise<boolean>): Promise<number> {
    if (this.isProcessing) {
      return 0;
    }

    this.isProcessing = true;
    let processedCount = 0;

    try {
      const items = this.getNext();
      for (const item of items) {
        try {
          const success = await handler(item);
          if (success) {
            this.processedIds.add(item.id);
            processedCount++;
            this.monitor.track('processed');
          } else {
            this.monitor.track('failed');
          }
        } catch (error) {
          this.monitor.track('error');
        }
      }
    } finally {
      this.isProcessing = false;
    }

    return processedCount;
  }

  getNext(count?: number): DeadLetterItem<T>[] {
    const pending = this.queue.getPending();
    const batchSize = count ?? this.config.batchSize;
    return pending.slice(0, batchSize);
  }

  getProcessed(): string[] {
    return Array.from(this.processedIds);
  }

  getStats(): {
    isProcessing: boolean;
    processedCount: number;
    pendingCount: number;
    batchSize: number;
  } {
    return {
      isProcessing: this.isProcessing,
      processedCount: this.processedIds.size,
      pendingCount: this.queue.getPending().length,
      batchSize: this.config.batchSize
    };
  }

  getSnapshot(): { metrics: Record<string, unknown> } {
    return {
      metrics: {
        ...this.getStats(),
        queueSnapshot: this.queue.getSnapshot(),
        policySnapshot: this.policy.getSnapshot(),
        monitorSnapshot: this.monitor.getSnapshot()
      }
    };
  }

  reset(): void {
    this.isProcessing = false;
    this.processedIds.clear();
    this.monitor.reset();
  }

  getReport(): string {
    const stats = this.getStats();
    return [
      `DLQ Processor Report [${this.config.namespace}]`,
      `===============================================`,
      `Processing: ${stats.isProcessing ? 'YES' : 'NO'}`,
      `Processed Count: ${stats.processedCount}`,
      `Pending Count: ${stats.pendingCount}`,
      `Batch Size: ${stats.batchSize}`,
      `Auto Process: ${this.config.enableAutoProcess ? 'ENABLED' : 'DISABLED'}`,
      `Interval: ${this.config.processingIntervalMs}ms`
    ].join('\n');
  }

  exportMetrics(): { version: string; stats: ReturnType<typeof this.getStats> } {
    return {
      version: '1.0.3',
      stats: this.getStats()
    };
  }
}