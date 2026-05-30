/**
 * ComparatorExecutor.ts - V135 Comparator Executor
 * Executes comparator operations with batching support
 */

import type { Comparator } from './Comparator';

export type ComparatorExecutorConfig = {
  maxBatchSize: number;
  enableParallel: boolean;
  timeout: number;
  onError?: 'throw' | 'skip' | 'collect';
};

export type ExecutorResult = {
  id: string;
  success: boolean;
  result?: unknown;
  error?: string;
  duration: number;
  timestamp: number;
};

export type ComparatorExecutorStats = {
  totalExecuted: number;
  successfulExecutions: number;
  failedExecutions: number;
  totalDuration: number;
  averageDuration: number;
  pendingTasks: number;
};

export class ComparatorExecutor {
  config: ComparatorExecutorConfig;
  private results: Map<string, ExecutorResult> = new Map();
  private pendingTasks: number = 0;
  private totalExecuted: number = 0;
  private successfulExecutions: number = 0;
  private failedExecutions: number = 0;
  private totalDuration: number = 0;

  constructor(config: ComparatorExecutorConfig) {
    this.config = { ...config };
  }

  execute(comparator: Comparator, left: unknown, right: unknown, id?: string): ExecutorResult {
    const taskId = id || `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    this.totalExecuted++;
    this.pendingTasks++;
    try {
      const result = comparator.compare(left, right);
      const duration = Date.now() - startTime;
      this.totalDuration += duration;
      this.successfulExecutions++;
      this.pendingTasks--;
      const executorResult: ExecutorResult = { id: taskId, success: true, result, duration, timestamp: Date.now() };
      this.results.set(taskId, executorResult);
      return executorResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.totalDuration += duration;
      this.failedExecutions++;
      this.pendingTasks--;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const executorResult: ExecutorResult = { id: taskId, success: false, error: errorMessage, duration, timestamp: Date.now() };
      this.results.set(taskId, executorResult);
      if (this.config.onError === 'throw') throw error;
      return executorResult;
    }
  }

  async run(comparator: Comparator, pairs: Array<{ left: unknown; right: unknown; id?: string }>): Promise<ExecutorResult[]> {
    if (this.config.enableParallel) {
      const batches: typeof pairs[] = [];
      for (let i = 0; i < pairs.length; i += this.config.maxBatchSize) batches.push(pairs.slice(i, i + this.config.maxBatchSize));
      const allResults: ExecutorResult[] = [];
      for (const batch of batches) allResults.push(...await Promise.all(batch.map(p => Promise.resolve(this.execute(comparator, p.left, p.right, p.id)))));
      return allResults;
    }
    return pairs.map(p => this.execute(comparator, p.left, p.right, p.id));
  }

  getResults(): Map<string, ExecutorResult> { return new Map(this.results); }

  getStats(): ComparatorExecutorStats {
    return {
      totalExecuted: this.totalExecuted,
      successfulExecutions: this.successfulExecutions,
      failedExecutions: this.failedExecutions,
      totalDuration: this.totalDuration,
      averageDuration: this.totalExecuted > 0 ? this.totalDuration / this.totalExecuted : 0,
      pendingTasks: this.pendingTasks,
    };
  }

  getSnapshot(): { metrics: ComparatorExecutorStats; timestamp: number } {
    return { metrics: this.getStats(), timestamp: Date.now() };
  }

  reset(): void {
    this.results.clear();
    this.pendingTasks = 0;
    this.totalExecuted = 0;
    this.successfulExecutions = 0;
    this.failedExecutions = 0;
    this.totalDuration = 0;
  }

  getReport(): string {
    const s = this.getSnapshot();
    return [`=== Comparator Executor Report ===`, `Total: ${s.metrics.totalExecuted}`, `Success: ${s.metrics.successfulExecutions}`, `Failed: ${s.metrics.failedExecutions}`, `Pending: ${s.metrics.pendingTasks}`, `Avg: ${s.metrics.averageDuration.toFixed(2)}ms`, `Time: ${new Date(s.timestamp).toISOString()}`].join('\n');
  }

  exportMetrics(): { version: string } & ComparatorExecutorStats {
    return { version: 'V135', ...this.getStats() };
  }
}