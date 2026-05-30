/**
 * V145 ConvolverExecutor - Executes convolution operations across multiple convolvers
 * Manages execution lifecycle, result aggregation, and performance tracking
 */

import Convolver from './Convolver';
import ConvolverRegistry from './ConvolverRegistry';

export interface ExecutionConfig {
  parallel: boolean;
  stopOnError: boolean;
  timeout: number;
  maxConcurrency: number;
}

export interface ExecutionResult {
  id: string;
  convolverId: string;
  success: boolean;
  result?: unknown;
  error?: string;
  duration: number;
}

export interface ExecutorMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  totalDuration: number;
  avgDuration: number;
}

export class ConvolverExecutor {
  public config: ExecutionConfig;
  
  private registry: ConvolverRegistry;
  private results: Map<string, ExecutionResult[]> = new Map();
  private metrics: ExecutorMetrics = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    totalDuration: 0,
    avgDuration: 0
  };

  constructor(registry: ConvolverRegistry, config: ExecutionConfig) {
    this.registry = registry;
    this.config = { ...config };
  }

  /**
   * Execute a convolver by ID with input data
   */
  execute(convolverId: string, input: unknown): ExecutionResult {
    const convolver = this.registry.get(convolverId);
    
    if (!convolver) {
      return {
        id: this.generateId(),
        convolverId,
        success: false,
        error: `Convolver '${convolverId}' not found`,
        duration: 0
      };
    }

    const startTime = Date.now();
    const result = convolver.convolve(input);
    const duration = Date.now() - startTime;

    const execResult: ExecutionResult = {
      id: this.generateId(),
      convolverId,
      success: result.success,
      result: result.result,
      error: result.error,
      duration
    };

    this.recordResult(execResult);
    return execResult;
  }

  /**
   * Run multiple executions in sequence or parallel
   */
  run(convolverIds: string[], input: unknown): ExecutionResult[] {
    const results: ExecutionResult[] = [];

    if (this.config.parallel) {
      const promises = convolverIds.map(id => Promise.resolve(this.execute(id, input)));
      results.push(...promises.map(p => p as unknown as ExecutionResult));
    } else {
      for (const id of convolverIds) {
        const result = this.execute(id, input);
        results.push(result);

        if (!result.success && this.config.stopOnError) {
          break;
        }
      }
    }

    return results;
  }

  /**
   * Get results for a specific convolver
   */
  getResults(convolverId: string): ExecutionResult[] {
    return this.results.get(convolverId) || [];
  }

  /**
   * Get all results
   */
  getAllResults(): ExecutionResult[] {
    const all: ExecutionResult[] = [];
    this.results.forEach(results => all.push(...results));
    return all;
  }

  /**
   * Get executor statistics
   */
  getStats(): ExecutorMetrics {
    return { ...this.metrics };
  }

  /**
   * Get a snapshot of current state
   */
  getSnapshot(): { metrics: ExecutorMetrics } {
    return {
      metrics: this.getStats()
    };
  }

  /**
   * Reset all metrics and results
   */
  reset(): void {
    this.results.clear();
    this.metrics = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      totalDuration: 0,
      avgDuration: 0
    };
  }

  /**
   * Clear results for a specific convolver
   */
  clearResults(convolverId: string): void {
    this.results.delete(convolverId);
  }

  /**
   * Clear all results
   */
  clearAllResults(): void {
    this.results.clear();
  }

  /**
   * Generate a human-readable report
   */
  getReport(): string {
    return [
      'Convolver Executor Report',
      `Total Executions: ${this.metrics.totalExecutions}`,
      `Successful: ${this.metrics.successfulExecutions}`,
      `Failed: ${this.metrics.failedExecutions}`,
      `Total Duration: ${this.metrics.totalDuration}ms`,
      `Average Duration: ${this.metrics.avgDuration.toFixed(2)}ms`
    ].join('\n');
  }

  /**
   * Export metrics in standardized format
   */
  exportMetrics(): { version: string } {
    return {
      version: '1.0.0',
      executor: {
        config: this.config,
        metrics: this.getStats(),
        resultCount: this.getAllResults().length
      }
    };
  }

  private recordResult(result: ExecutionResult): void {
    if (!this.results.has(result.convolverId)) {
      this.results.set(result.convolverId, []);
    }
    this.results.get(result.convolverId)!.push(result);

    this.metrics.totalExecutions++;
    if (result.success) {
      this.metrics.successfulExecutions++;
    } else {
      this.metrics.failedExecutions++;
    }
    this.metrics.totalDuration += result.duration;
    this.metrics.avgDuration = this.metrics.totalDuration / this.metrics.totalExecutions;
  }

  private generateId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default ConvolverExecutor;