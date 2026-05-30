/**
 * RetryQueue.ts
 * V94 Retry Queue - Retry Queue Implementation
 * Manages queued retry operations with policy and monitoring
 */

import { RetryPolicy, RetryPolicyConfig } from './RetryPolicy';
import { RetryMonitor } from './RetryMonitor';
import { BackoffStrategy, BackoffType } from './BackoffStrategy';

export interface QueuedOperation {
  id: string;
  operation: string;
  payload: unknown;
  attempts: number;
  enqueuedAt: number;
  lastAttemptAt?: number;
  nextRetryAt?: number;
  status: 'pending' | 'retrying' | 'completed' | 'failed';
}

export interface QueueConfig {
  maxSize?: number;
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffType?: BackoffType;
  backoffMultiplier?: number;
  backoffJitter?: number;
}

export interface QueueStats {
  pending: number;
  retrying: number;
  completed: number;
  failed: number;
  totalAttempts: number;
}

export interface QueueSnapshot {
  stats: QueueStats;
  maxSize: number;
  currentSize: number;
}

export class RetryQueue {
  public readonly config: QueueConfig;
  private queue: Map<string, QueuedOperation>;
  private policy: RetryPolicy;
  private monitor: RetryMonitor;
  private idCounter: number;

  constructor(config: QueueConfig = {}) {
    this.config = {
      maxSize: config.maxSize || 100,
      maxAttempts: config.maxAttempts || 5,
      initialDelay: config.initialDelay || 1000,
      maxDelay: config.maxDelay || 60000,
      backoffType: config.backoffType || 'exponential',
      backoffMultiplier: config.backoffMultiplier || 2,
      backoffJitter: config.backoffJitter || 0.1
    };

    const policyConfig: RetryPolicyConfig = {
      maxAttempts: this.config.maxAttempts!,
      initialDelay: this.config.initialDelay!,
      maxDelay: this.config.maxDelay!,
      backoffType: this.config.backoffType,
      backoffMultiplier: this.config.backoffMultiplier,
      backoffJitter: this.config.backoffJitter
    };

    this.policy = new RetryPolicy(policyConfig);
    this.monitor = new RetryMonitor({ maxHistorySize: 500 });
    this.queue = new Map();
    this.idCounter = 0;
  }

  /**
   * Add an operation to the retry queue
   */
  public enqueue(operation: string, payload?: unknown): string {
    if (this.queue.size >= (this.config.maxSize || 100)) {
      throw new Error('Queue is full');
    }

    const id = `retry-${++this.idCounter}-${Date.now()}`;
    const entry: QueuedOperation = {
      id,
      operation,
      payload,
      attempts: 0,
      enqueuedAt: Date.now(),
      status: 'pending'
    };

    this.queue.set(id, entry);
    return id;
  }

  /**
   * Retry a failed operation
   */
  public retry(id: string): boolean {
    const op = this.queue.get(id);
    if (!op) return false;

    if (op.status === 'completed' || op.status === 'failed') {
      return false;
    }

    const retryState = this.policy.nextAttempt();
    if (!retryState.shouldRetry) {
      op.status = 'failed';
      return false;
    }

    op.attempts++;
    op.lastAttemptAt = Date.now();
    op.nextRetryAt = Date.now() + retryState.delay;
    op.status = 'retrying';

    return true;
  }

  /**
   * Remove an operation from the queue
   */
  public remove(id: string): boolean {
    return this.queue.delete(id);
  }

  /**
   * Get all pending operations
   */
  public getPending(): QueuedOperation[] {
    return Array.from(this.queue.values()).filter(
      op => op.status === 'pending' || op.status === 'retrying'
    );
  }

  /**
   * Get queue statistics
   */
  public getStats(): QueueStats {
    const ops = Array.from(this.queue.values());
    let totalAttempts = 0;

    ops.forEach(op => { totalAttempts += op.attempts; });

    return {
      pending: ops.filter(op => op.status === 'pending').length,
      retrying: ops.filter(op => op.status === 'retrying').length,
      completed: ops.filter(op => op.status === 'completed').length,
      failed: ops.filter(op => op.status === 'failed').length,
      totalAttempts
    };
  }

  /**
   * Mark an operation as completed
   */
  public complete(id: string, duration: number): boolean {
    const op = this.queue.get(id);
    if (!op) return false;

    op.status = 'completed';
    this.monitor.track(op.operation, true, duration, op.attempts);
    return true;
  }

  /**
   * Mark an operation as failed
   */
  public fail(id: string, error?: string): boolean {
    const op = this.queue.get(id);
    if (!op) return false;

    op.status = 'failed';
    this.monitor.track(op.operation, false, 0, op.attempts, error);
    return true;
  }

  /**
   * Reset queue to initial state
   */
  public reset(): void {
    this.queue.clear();
    this.policy.reset();
    this.monitor.reset();
    this.idCounter = 0;
  }

  /**
   * Get current snapshot of queue state
   */
  public getSnapshot(): { metrics: QueueSnapshot } {
    return {
      metrics: {
        stats: this.getStats(),
        maxSize: this.config.maxSize || 100,
        currentSize: this.queue.size
      }
    };
  }

  /**
   * Generate human-readable report
   */
  public getReport(): string {
    const stats = this.getStats();
    return `RetryQueue: size=${this.queue.size}/${this.config.maxSize}, ` +
      `pending=${stats.pending}, retrying=${stats.retrying}, ` +
      `completed=${stats.completed}, failed=${stats.failed}`;
  }

  /**
   * Export metrics for external monitoring
   */
  public exportMetrics(): { version: string } {
    return {
      version: 'V94-1.0',
      ...this.getStats(),
      queueSize: this.queue.size,
      maxSize: this.config.maxSize
    };
  }
}

export default RetryQueue;