/**
 * V113 CombinerExecutor Module
 * Executes combination operations across combiners
 */

import { Combiner, CombineItem, CombineResult } from './Combiner';
import { CombinerRegistry } from './CombinerRegistry';

export type ExecutorConfig = {
  id: string;
  version: string;
  parallel?: boolean;
  timeout?: number;
  retryCount?: number;
};

export type ExecutorStats = {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  totalItems: number;
  executionTime: number;
};

export type ExecutionResult = {
  success: boolean;
  combinerId: string;
  result?: CombineResult;
  error?: string;
  executionTime: number;
};

export class CombinerExecutor {
  readonly config: ExecutorConfig;
  private registry: CombinerRegistry;
  private stats: ExecutorStats = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    totalItems: 0,
    executionTime: 0,
  };
  private results: ExecutionResult[] = [];

  constructor(config: ExecutorConfig, registry: CombinerRegistry) {
    this.config = { ...config };
    this.registry = registry;
  }

  /**
   * Execute combine operation on a specific combiner
   */
  execute(combinerId: string, items: CombineItem[]): ExecutionResult {
    const startTime = Date.now();
    try {
      const combiner = this.registry.get(combinerId);
      if (!combiner) {
        throw new Error(`Combiner not found: ${combinerId}`);
      }
      const result = combiner.combine(items);
      this.stats.totalItems += result.count;
      const executionTime = Date.now() - startTime;
      const execResult: ExecutionResult = {
        success: true,
        combinerId,
        result,
        executionTime,
      };
      this.results.push(execResult);
      this.stats.successfulExecutions++;
      this.stats.executionTime += executionTime;
      return execResult;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const execResult: ExecutionResult = {
        success: false,
        combinerId,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
      };
      this.results.push(execResult);
      this.stats.failedExecutions++;
      this.stats.executionTime += executionTime;
      return execResult;
    } finally {
      this.stats.totalExecutions++;
    }
  }

  /**
   * Run execution with retry logic
   */
  run(combinerId: string, items: CombineItem[]): ExecutionResult {
    const maxRetries = this.config.retryCount || 3;
    let lastResult: ExecutionResult | null = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      lastResult = this.execute(combinerId, items);
      if (lastResult.success) {
        return lastResult;
      }
    }
    return lastResult || {
      success: false,
      combinerId,
      error: 'All retry attempts failed',
      executionTime: 0,
    };
  }

  /**
   * Execute on all combiners in registry
   */
  executeAll(items: CombineItem[]): ExecutionResult[] {
    const results: ExecutionResult[] = [];
    const combiners = this.registry.getAll();
    for (const combiner of combiners) {
      results.push(this.execute(combiner.config.id, items));
    }
    return results;
  }

  /**
   * Get all execution results
   */
  getResults(): ExecutionResult[] {
    return [...this.results];
  }

  /**
   * Get execution statistics
   */
  getStats(): ExecutorStats {
    return { ...this.stats };
  }

  /**
   * Get a snapshot of executor state
   */
  getSnapshot(): { metrics: ExecutorStats; config: ExecutorConfig; resultCount: number } {
    return {
      metrics: this.getStats(),
      config: this.config,
      resultCount: this.results.length,
    };
  }

  /**
   * Reset executor state
   */
  reset(): void {
    this.stats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      totalItems: 0,
      executionTime: 0,
    };
    this.results = [];
  }

  /**
   * Generate executor report
   */
  getReport(): string {
    const lines = [
      `=== CombinerExecutor Report ===`,
      `ID: ${this.config.id}`,
      `Version: ${this.config.version}`,
      `Total Executions: ${this.stats.totalExecutions}`,
      `Successful: ${this.stats.successfulExecutions}`,
      `Failed: ${this.stats.failedExecutions}`,
      `Total Items: ${this.stats.totalItems}`,
      `Execution Time: ${this.stats.executionTime}ms`,
      `================================`,
    ];
    return lines.join('\n');
  }

  /**
   * Export executor metrics
   */
  exportMetrics(): { version: string; stats: ExecutorStats; resultsCount: number } {
    return {
      version: this.config.version,
      stats: this.getStats(),
      resultsCount: this.results.length,
    };
  }
}