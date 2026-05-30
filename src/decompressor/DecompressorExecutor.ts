/**
 * DecompressorExecutor.ts - V125 Decompressor Executor
 * Executes decompression operations with result tracking
 */

import { Decompressor, DecompressionResult } from './Decompressor';
import { DecompressorRegistry } from './DecompressorRegistry';

export type ExecutorConfig = {
  timeout?: number;
  maxConcurrent?: number;
  retryCount?: number;
  onComplete?: (result: ExecutionResult) => void;
};

export type ExecutionResult = {
  success: boolean;
  data: string;
  decompressorName: string;
  timeMs: number;
  error?: string;
};

export type ExecutorStats = {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageTimeMs: number;
  totalBytesProcessed: number;
};

export interface ExecutorSnapshot {
  metrics: ExecutorStats;
  timestamp: number;
  config: ExecutorConfig;
}

/**
 * DecompressorExecutor - Executes decompression with result tracking
 * Manages concurrent decompression operations and result collection
 */
export class DecompressorExecutor {
  config: ExecutorConfig;
  private registry: DecompressorRegistry;
  private results: ExecutionResult[] = [];
  private totalExecutions: number = 0;
  private successfulExecutions: number = 0;
  private failedExecutions: number = 0;
  private totalTimeMs: number = 0;
  private totalBytesProcessed: number = 0;

  constructor(registry: DecompressorRegistry, config: ExecutorConfig = {}) {
    this.registry = registry;
    this.config = {
      timeout: config.timeout ?? 30000,
      maxConcurrent: config.maxConcurrent ?? 10,
      retryCount: config.retryCount ?? 3,
      onComplete: config.onComplete,
    };
  }

  /**
   * Execute decompression for a specific decompressor
   */
  execute(decompressorName: string, data: string): ExecutionResult {
    const decompressor = this.registry.get(decompressorName);
    
    if (!decompressor) {
      const result: ExecutionResult = {
        success: false,
        data: '',
        decompressorName,
        timeMs: 0,
        error: `Decompressor '${decompressorName}' not found`,
      };
      this.recordResult(result);
      return result;
    }

    const startTime = Date.now();
    
    try {
      const decompressionResult = decompressor.decompress(data);
      
      const result: ExecutionResult = {
        success: decompressionResult.success,
        data: decompressionResult.data,
        decompressorName,
        timeMs: decompressionResult.timeMs,
        error: decompressionResult.success ? undefined : 'Decompression failed',
      };
      
      this.recordResult(result);
      this.registry.recordDecompression();
      return result;
    } catch (error) {
      const result: ExecutionResult = {
        success: false,
        data: '',
        decompressorName,
        timeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      
      this.recordResult(result);
      return result;
    }
  }

  /**
   * Run multiple decompressions
   */
  run(tasks: Array<{ decompressorName: string; data: string }>): ExecutionResult[] {
    return tasks.map(task => this.execute(task.decompressorName, task.data));
  }

  /**
   * Get all collected results
   */
  getResults(): ExecutionResult[] {
    return [...this.results];
  }

  /**
   * Get executor statistics
   */
  getStats(): ExecutorStats {
    return {
      totalExecutions: this.totalExecutions,
      successfulExecutions: this.successfulExecutions,
      failedExecutions: this.failedExecutions,
      averageTimeMs: this.totalExecutions > 0
        ? this.totalTimeMs / this.totalExecutions
        : 0,
      totalBytesProcessed: this.totalBytesProcessed,
    };
  }

  /**
   * Record a result and update statistics
   */
  private recordResult(result: ExecutionResult): void {
    this.results.push(result);
    this.totalExecutions++;
    
    if (result.success) {
      this.successfulExecutions++;
    } else {
      this.failedExecutions++;
    }
    
    this.totalTimeMs += result.timeMs;
    this.totalBytesProcessed += result.data.length;
    
    if (this.config.onComplete) {
      this.config.onComplete(result);
    }

    if (this.results.length > 1000) {
      this.results = this.results.slice(-500);
    }
  }

  /**
   * Get snapshot of current state
   */
  getSnapshot(): ExecutorSnapshot {
    return {
      metrics: this.getStats(),
      timestamp: Date.now(),
      config: { ...this.config },
    };
  }

  /**
   * Reset all statistics and results
   */
  reset(): void {
    this.results = [];
    this.totalExecutions = 0;
    this.successfulExecutions = 0;
    this.failedExecutions = 0;
    this.totalTimeMs = 0;
    this.totalBytesProcessed = 0;
  }

  /**
   * Generate human-readable report
   */
  getReport(): string {
    const stats = this.getStats();
    return [
      `Decompressor Executor Report`,
      `==============================`,
      `Total Executions: ${stats.totalExecutions}`,
      `Successful: ${stats.successfulExecutions}`,
      `Failed: ${stats.failedExecutions}`,
      `Average Time: ${stats.averageTimeMs.toFixed(2)}ms`,
      `Total Bytes Processed: ${stats.totalBytesProcessed}`,
      `Max Concurrent: ${this.config.maxConcurrent}`,
    ].join('\n');
  }

  /**
   * Export metrics as portable object
   */
  exportMetrics(): { version: string; stats: ExecutorStats; config: ExecutorConfig } {
    return {
      version: 'V125',
      stats: this.getStats(),
      config: { ...this.config },
    };
  }

  /**
   * Clear stored results
   */
  clearResults(): void {
    this.results = [];
  }
}

export default DecompressorExecutor;
