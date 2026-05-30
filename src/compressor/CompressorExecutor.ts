/**
 * CompressorExecutor.ts - V124 Compressor Executor
 * Executes compression operations across multiple compressors
 */

import { Compressor, CompressionResult, DecompressionResult } from './Compressor';

export type CompressorExecutorConfig = {
  timeout: number;
  maxConcurrent: number;
  retryCount: number;
  enableParallel: boolean;
};

export type CompressorExecutorStats = {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  totalBytesProcessed: number;
  averageExecutionTime: number;
};

export type CompressorExecutorSnapshot = {
  metrics: CompressorExecutorStats;
  timestamp: number;
  activeOperations: number;
};

export interface ExecutionResult {
  compressorName: string;
  success: boolean;
  result?: CompressionResult | DecompressionResult;
  error?: string;
  executionTime: number;
}

export interface ExecutionBatch {
  id: string;
  results: ExecutionResult[];
  startTime: number;
  endTime?: number;
}

/**
 * CompressorExecutor - Executes compression operations
 * Handles parallel and sequential compression execution
 */
export class CompressorExecutor {
  config: CompressorExecutorConfig;
  private totalExecutions: number = 0;
  private successfulExecutions: number = 0;
  private failedExecutions: number = 0;
  private totalBytesProcessed: number = 0;
  private totalExecutionTime: number = 0;
  private activeOperations: number = 0;
  private results: ExecutionResult[] = [];
  private batches: Map<string, ExecutionBatch> = new Map();

  constructor(config: CompressorExecutorConfig) {
    this.config = { ...config };
  }

  /**
   * Execute compression on a compressor
   */
  execute(compressorName: string, compressor: Compressor, data: string): ExecutionResult {
    const startTime = Date.now();
    this.totalExecutions++;
    this.activeOperations++;

    try {
      const result = compressor.compress(data);
      this.successfulExecutions++;
      this.totalBytesProcessed += data.length;
      this.totalExecutionTime += Date.now() - startTime;

      const executionResult: ExecutionResult = {
        compressorName,
        success: true,
        result,
        executionTime: Date.now() - startTime,
      };

      this.results.push(executionResult);
      this.activeOperations--;
      return executionResult;
    } catch (error) {
      this.failedExecutions++;
      this.activeOperations--;

      const executionResult: ExecutionResult = {
        compressorName,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
      };

      this.results.push(executionResult);
      return executionResult;
    }
  }

  /**
   * Run a batch of compressions
   */
  run(compressors: Array<{ name: string; compressor: Compressor; data: string }>): ExecutionBatch {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    const results: ExecutionResult[] = [];

    if (this.config.enableParallel) {
      // Execute in parallel
      const promises = compressors.map(({ name, compressor, data }) => 
        Promise.resolve(this.execute(name, compressor, data))
      );
      // Synchronously collect results (in real implementation would use Promise.all)
      for (const { name, compressor, data } of compressors) {
        results.push(this.execute(name, compressor, data));
      }
    } else {
      // Execute sequentially
      for (const { name, compressor, data } of compressors) {
        results.push(this.execute(name, compressor, data));
      }
    }

    const batch: ExecutionBatch = {
      id: batchId,
      results,
      startTime,
      endTime: Date.now(),
    };

    this.batches.set(batchId, batch);
    return batch;
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
  getStats(): CompressorExecutorStats {
    return {
      totalExecutions: this.totalExecutions,
      successfulExecutions: this.successfulExecutions,
      failedExecutions: this.failedExecutions,
      totalBytesProcessed: this.totalBytesProcessed,
      averageExecutionTime: this.totalExecutions > 0
        ? this.totalExecutionTime / this.totalExecutions
        : 0,
    };
  }

  /**
   * Get snapshot of current state
   */
  getSnapshot(): CompressorExecutorSnapshot {
    return {
      metrics: this.getStats(),
      timestamp: Date.now(),
      activeOperations: this.activeOperations,
    };
  }

  /**
   * Reset all executor statistics
   */
  reset(): void {
    this.totalExecutions = 0;
    this.successfulExecutions = 0;
    this.failedExecutions = 0;
    this.totalBytesProcessed = 0;
    this.totalExecutionTime = 0;
    this.activeOperations = 0;
    this.results = [];
    this.batches.clear();
  }

  /**
   * Generate human-readable report
   */
  getReport(): string {
    const stats = this.getStats();
    return [
      `Compressor Executor Report`,
      `===========================`,
      `Total Executions: ${stats.totalExecutions}`,
      `Successful: ${stats.successfulExecutions}`,
      `Failed: ${stats.failedExecutions}`,
      `Total Bytes: ${stats.totalBytesProcessed}`,
      `Avg Execution Time: ${stats.averageExecutionTime.toFixed(2)}ms`,
      `Active Operations: ${this.activeOperations}`,
      `Results Count: ${this.results.length}`,
    ].join('\n');
  }

  /**
   * Export metrics as portable object
   */
  exportMetrics(): { version: string; stats: CompressorExecutorStats; activeOps: number } {
    return {
      version: 'V124',
      stats: this.getStats(),
      activeOps: this.activeOperations,
    };
  }
}

export default CompressorExecutor;