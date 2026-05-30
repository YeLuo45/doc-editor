/**
 * SplitterExecutor.ts - V114 Splitter Executor
 * Executes splitting operations with queue management
 */

import { Splitter, SplitResult, SplitterConfig } from './Splitter';

export interface ExecutorConfig {
  maxConcurrent: number;
  timeout: number;
  retryAttempts: number;
  enableQueue: boolean;
}

export interface ExecutorStats {
  totalExecuted: number;
  totalSucceeded: number;
  totalFailed: number;
  averageExecutionTime: number;
  queuedOperations: number;
}

export interface ExecutionResult {
  success: boolean;
  result?: SplitResult[];
  error?: string;
  executionTimeMs: number;
}

export class SplitterExecutor {
  public config: ExecutorConfig;
  private results: Map<string, SplitResult[]> = new Map();
  private stats: ExecutorStats;
  private queue: Array<{
    id: string;
    content: string;
    options?: { id?: string };
    resolve: (value: ExecutionResult) => void;
  }> = [];

  constructor(config: Partial<ExecutorConfig> = {}) {
    this.config = {
      maxConcurrent: config.maxConcurrent ?? 5,
      timeout: config.timeout ?? 30000,
      retryAttempts: config.retryAttempts ?? 3,
      enableQueue: config.enableQueue ?? true,
    };
    this.stats = {
      totalExecuted: 0,
      totalSucceeded: 0,
      totalFailed: 0,
      averageExecutionTime: 0,
      queuedOperations: 0,
    };
  }

  async execute(id: string, splitter: Splitter, content: string, options?: { id?: string }): Promise<ExecutionResult> {
    const startTime = Date.now();
    this.stats.totalExecuted++;

    try {
      const result = splitter.split(content, options);
      this.results.set(id, result);

      const executionTimeMs = Date.now() - startTime;
      this.updateAverageExecutionTime(executionTimeMs);
      this.stats.totalSucceeded++;

      return {
        success: true,
        result,
        executionTimeMs,
      };
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      this.stats.totalFailed++;

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTimeMs,
      };
    }
  }

  run(id: string, splitter: Splitter, content: string, options?: { id?: string }): ExecutionResult {
    const startTime = Date.now();
    this.stats.totalExecuted++;

    try {
      const result = splitter.split(content, options);
      this.results.set(id, result);

      const executionTimeMs = Date.now() - startTime;
      this.updateAverageExecutionTime(executionTimeMs);
      this.stats.totalSucceeded++;

      return {
        success: true,
        result,
        executionTimeMs,
      };
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      this.stats.totalFailed++;

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTimeMs,
      };
    }
  }

  getResults(id: string): SplitResult[] | undefined {
    return this.results.get(id);
  }

  getAllResults(): Map<string, SplitResult[]> {
    return new Map(this.results);
  }

  getStats(): ExecutorStats {
    return { ...this.stats };
  }

  private updateAverageExecutionTime(newTime: number): void {
    const total = this.stats.totalSucceeded + this.stats.totalFailed;
    if (total === 0) {
      this.stats.averageExecutionTime = newTime;
    } else {
      const currentTotal = this.stats.averageExecutionTime * (total - 1);
      this.stats.averageExecutionTime = (currentTotal + newTime) / total;
    }
  }

  getSnapshot(): { metrics: ExecutorStats; results: Map<string, SplitResult[]> } {
    return {
      metrics: { ...this.stats },
      results: new Map(this.results),
    };
  }

  reset(): void {
    this.results.clear();
    this.queue = [];
    this.stats = {
      totalExecuted: 0,
      totalSucceeded: 0,
      totalFailed: 0,
      averageExecutionTime: 0,
      queuedOperations: 0,
    };
  }

  getReport(): string {
    const snap = this.getSnapshot();
    return [
      '=== SplitterExecutor Report ===',
      `Total Executed: ${snap.metrics.totalExecuted}`,
      `Succeeded: ${snap.metrics.totalSucceeded}`,
      `Failed: ${snap.metrics.totalFailed}`,
      `Avg Execution Time: ${snap.metrics.averageExecutionTime.toFixed(2)}ms`,
      `Queued Operations: ${snap.metrics.queuedOperations}`,
      `Result IDs: [${Array.from(snap.results.keys()).join(', ')}]`,
      '==============================',
    ].join('\n');
  }

  exportMetrics(): { version: string; stats: ExecutorStats } {
    return {
      version: '1.14.0',
      stats: this.getStats(),
    };
  }
}