/**
 * V127 Assembler Executor
 * Executes assembler operations and manages execution lifecycle
 */

import { Assembler } from './Assembler.js';

export type ExecutorConfig = {
  maxConcurrent?: number;
  retryAttempts?: number;
  timeout?: number;
  onError?: (error: Error) => void;
};

export type ExecutionResult = {
  executionId: string;
  assemblerId: string;
  success: boolean;
  result?: unknown;
  error?: string;
  duration: number;
  timestamp: number;
};

export class AssemblerExecutor {
  private config: ExecutorConfig;
  private results: Map<string, ExecutionResult> = new Map();
  private executing: Set<string> = new Set();
  private stats = {
    totalExecutions: 0,
    successful: 0,
    failed: 0,
    totalDuration: 0,
  };

  constructor(config: ExecutorConfig = {}) {
    this.config = {
      maxConcurrent: config.maxConcurrent ?? 10,
      retryAttempts: config.retryAttempts ?? 3,
      timeout: config.timeout ?? 30000,
      onError: config.onError,
    };
  }

  /**
   * Execute an assembler with the given options
   */
  async execute(assembler: Assembler, options: Record<string, unknown> = {}): Promise<ExecutionResult> {
    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    if (this.executing.size >= (this.config.maxConcurrent ?? 10)) {
      const result: ExecutionResult = {
        executionId,
        assemblerId: assembler.getConfig().id,
        success: false,
        error: 'Max concurrent executions reached',
        duration: 0,
        timestamp: Date.now(),
      };
      this.results.set(executionId, result);
      return result;
    }

    this.executing.add(executionId);
    this.stats.totalExecutions++;

    try {
      const result = assembler.assemble(options);
      const duration = Date.now() - startTime;

      const executionResult: ExecutionResult = {
        executionId,
        assemblerId: assembler.getConfig().id,
        success: result.success,
        result: result.data,
        duration,
        timestamp: Date.now(),
      };

      if (result.success) {
        this.stats.successful++;
      } else {
        this.stats.failed++;
      }
      this.stats.totalDuration += duration;

      this.results.set(executionId, executionResult);
      return executionResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.stats.failed++;

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const result: ExecutionResult = {
        executionId,
        assemblerId: assembler.getConfig().id,
        success: false,
        error: errorMessage,
        duration,
        timestamp: Date.now(),
      };

      this.results.set(executionId, result);

      if (this.config.onError) {
        this.config.onError(error instanceof Error ? error : new Error(errorMessage));
      }

      return result;
    } finally {
      this.executing.delete(executionId);
    }
  }

  /**
   * Run multiple executions in sequence
   */
  async run(assemblers: Assembler[], options: Record<string, unknown> = {}): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];
    for (const assembler of assemblers) {
      const result = await this.execute(assembler, options);
      results.push(result);
    }
    return results;
  }

  /**
   * Get all execution results
   */
  getResults(): ExecutionResult[] {
    return Array.from(this.results.values());
  }

  /**
   * Get execution statistics
   */
  getStats(): { totalExecutions: number; successful: number; failed: number; avgDuration: number } {
    const avgDuration = this.stats.totalExecutions > 0 ? this.stats.totalDuration / this.stats.totalExecutions : 0;
    return {
      totalExecutions: this.stats.totalExecutions,
      successful: this.stats.successful,
      failed: this.stats.failed,
      avgDuration: Math.round(avgDuration),
    };
  }

  /**
   * Get current snapshot
   */
  getSnapshot(): { metrics: Record<string, unknown> } {
    return {
      metrics: {
        config: this.config,
        stats: this.stats,
        executing: this.executing.size,
        resultCount: this.results.size,
        timestamp: Date.now(),
      },
    };
  }

  /**
   * Reset executor state
   */
  reset(): void {
    this.results.clear();
    this.executing.clear();
    this.stats = { totalExecutions: 0, successful: 0, failed: 0, totalDuration: 0 };
  }

  /**
   * Generate a status report
   */
  getReport(): string {
    return JSON.stringify(
      {
        stats: this.stats,
        executing: this.executing.size,
        maxConcurrent: this.config.maxConcurrent,
        resultsCount: this.results.size,
      },
      null,
      2
    );
  }

  /**
   * Export metrics in standardized format
   */
  exportMetrics(): { version: string; data: Record<string, unknown> } {
    return {
      version: '1.0.0',
      data: {
        totalExecutions: this.stats.totalExecutions,
        successful: this.stats.successful,
        failed: this.stats.failed,
        avgDuration: this.stats.totalDuration / (this.stats.totalExecutions || 1),
      },
    };
  }

  /**
   * Get executor configuration
   */
  getConfig(): ExecutorConfig {
    return { ...this.config };
  }

  /**
   * Clear all stored results
   */
  clearResults(): void {
    this.results.clear();
  }
}