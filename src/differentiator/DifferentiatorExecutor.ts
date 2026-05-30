/**
 * DifferentiatorExecutor.ts - V136 Differentiator Executor
 * Executes differentiation operations on differentiator instances
 */

import { Differentiator, DifferentiatorResult } from './Differentiator';

export type DifferentiatorExecutorConfig = {
  maxBatchSize: number;
  enableParallel: boolean;
  timeout: number;
};

export type DifferentiatorExecutorStats = {
  totalExecuted: number;
  successfulExecutions: number;
  failedExecutions: number;
  totalTime: number;
  averageTime: number;
};

export type ExecutionResult = {
  success: boolean;
  result?: DifferentiatorResult;
  error?: string;
  executionTime: number;
};

export class DifferentiatorExecutor {
  config: DifferentiatorExecutorConfig;
  private results: Map<string, ExecutionResult> = new Map();
  private totalExecuted: number = 0;
  private successfulExecutions: number = 0;
  private failedExecutions: number = 0;
  private totalTime: number = 0;

  constructor(config: DifferentiatorExecutorConfig) {
    this.config = { ...config };
  }

  execute(differentiator: Differentiator, left: unknown, right: unknown, operationId?: string): ExecutionResult {
    const startTime = Date.now();
    const id = operationId || `op_${this.totalExecuted}`;
    this.totalExecuted++;
    try {
      const result = differentiator.differentiate(left, right);
      const executionTime = Date.now() - startTime;
      this.totalTime += executionTime;
      this.successfulExecutions++;
      const executionResult: ExecutionResult = { success: true, result, executionTime };
      this.results.set(id, executionResult);
      return executionResult;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.totalTime += executionTime;
      this.failedExecutions++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const executionResult: ExecutionResult = { success: false, error: errorMessage, executionTime };
      this.results.set(id, executionResult);
      return executionResult;
    }
  }

  async run(differentiator: Differentiator, pairs: Array<{ left: unknown; right: unknown }>): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];
    for (const pair of pairs) {
      results.push(this.execute(differentiator, pair.left, pair.right));
    }
    return results;
  }

  getResults(): Map<string, ExecutionResult> {
    return new Map(this.results);
  }

  getStats(): DifferentiatorExecutorStats {
    return {
      totalExecuted: this.totalExecuted,
      successfulExecutions: this.successfulExecutions,
      failedExecutions: this.failedExecutions,
      totalTime: this.totalTime,
      averageTime: this.totalExecuted > 0 ? this.totalTime / this.totalExecuted : 0,
    };
  }

  getSnapshot(): { stats: DifferentiatorExecutorStats; timestamp: number } {
    return { stats: this.getStats(), timestamp: Date.now() };
  }

  reset(): void {
    this.results.clear();
    this.totalExecuted = 0;
    this.successfulExecutions = 0;
    this.failedExecutions = 0;
    this.totalTime = 0;
  }

  getReport(): string {
    const s = this.getSnapshot();
    return [
      `=== Differentiator Executor Report ===`,
      `Total Executed: ${s.stats.totalExecuted}`,
      `Success: ${s.stats.successfulExecutions}`,
      `Failed: ${s.stats.failedExecutions}`,
      `Avg: ${s.stats.averageTime.toFixed(2)}ms`,
      `Time: ${new Date(s.timestamp).toISOString()}`,
    ].join('\n');
  }

  exportMetrics(): { version: string } & DifferentiatorExecutorStats {
    return { version: 'V136', ...this.getStats() };
  }
}