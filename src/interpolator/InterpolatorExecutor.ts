/**
 * V140 Interpolator Executor
 * Executes interpolation operations with tracking and result management
 */

import { Interpolator } from './Interpolator';

export interface ExecutorConfig {
  timeout: number;
  enableParallel: boolean;
  maxConcurrency: number;
  retryOnFailure: boolean;
}

export interface ExecutionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  duration: number;
  interpolatorName: string;
}

export interface ExecutorMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  totalDuration: number;
  averageDuration: number;
}

export class InterpolatorExecutor {
  public config: ExecutorConfig;
  private metrics: ExecutorMetrics;
  private results: ExecutionResult<unknown>[];
  private interpolators: Map<string, Interpolator>;

  constructor(config: Partial<ExecutorConfig> = {}) {
    this.config = {
      timeout: 5000,
      enableParallel: false,
      maxConcurrency: 10,
      retryOnFailure: false,
      ...config,
    };
    this.metrics = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      totalDuration: 0,
      averageDuration: 0,
    };
    this.results = [];
    this.interpolators = new Map();
  }

  /**
   * Register an interpolator for execution
   */
  registerInterpolator(name: string, interpolator: Interpolator): void {
    this.interpolators.set(name, interpolator);
  }

  /**
   * Execute interpolation operation
   */
  execute<T>(name: string, start: T, end: T, progress: number): ExecutionResult<T> {
    const startTime = Date.now();
    this.metrics.totalExecutions++;

    try {
      const interpolator = this.interpolators.get(name);
      if (!interpolator) {
        throw new Error(`Interpolator '${name}' not found`);
      }

      const data = interpolator.interpolate(start, end, progress);
      const duration = Date.now() - startTime;
      
      const result: ExecutionResult<T> = {
        success: true,
        data,
        duration,
        interpolatorName: name,
      };

      this.results.push(result as ExecutionResult<unknown>);
      this.recordSuccess(duration);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const result: ExecutionResult<T> = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration,
        interpolatorName: name,
      };

      this.results.push(result as ExecutionResult<unknown>);
      this.recordFailure(duration);
      return result;
    }
  }

  /**
   * Run multiple interpolations in sequence
   */
  run<T>(name: string, steps: Array<{ start: T; end: T; progress: number }>): ExecutionResult<T>[] {
    return steps.map(step => this.execute(name, step.start, step.end, step.progress));
  }

  /**
   * Get all execution results
   */
  getResults(): ExecutionResult<unknown>[] {
    return [...this.results];
  }

  /**
   * Get execution results for a specific interpolator
   */
  getResultsFor(name: string): ExecutionResult<unknown>[] {
    return this.results.filter(r => r.interpolatorName === name);
  }

  /**
   * Get current execution statistics
   */
  getStats(): ExecutorMetrics {
    return { ...this.metrics };
  }

  /**
   * Get a snapshot of current state
   */
  getSnapshot(): { metrics: ExecutorMetrics; resultCount: number; interpolatorCount: number } {
    return {
      metrics: this.getStats(),
      resultCount: this.results.length,
      interpolatorCount: this.interpolators.size,
    };
  }

  /**
   * Reset all metrics and results
   */
  reset(): void {
    this.metrics = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      totalDuration: 0,
      averageDuration: 0,
    };
    this.results = [];
  }

  /**
   * Generate a text report of current state
   */
  getReport(): string {
    const successRate = this.metrics.totalExecutions > 0
      ? ((this.metrics.successfulExecutions / this.metrics.totalExecutions) * 100).toFixed(2)
      : '0.00';
    return `InterpolatorExecutor Report:
  Total Executions: ${this.metrics.totalExecutions}
  Successful: ${this.metrics.successfulExecutions}
  Failed: ${this.metrics.failedExecutions}
  Success Rate: ${successRate}%
  Total Duration: ${this.metrics.totalDuration.toFixed(3)}ms
  Average Duration: ${this.metrics.averageDuration.toFixed(3)}ms
  Stored Results: ${this.results.length}
  Registered Interpolators: ${this.interpolators.size}`;
  }

  /**
   * Export metrics in standardized format
   */
  exportMetrics(): { version: string; metrics: ExecutorMetrics } {
    return {
      version: '1.4.0',
      metrics: this.getStats(),
    };
  }

  /**
   * Clear execution results
   */
  clearResults(): void {
    this.results = [];
  }

  private recordSuccess(duration: number): void {
    this.metrics.successfulExecutions++;
    this.updateAverageDuration(duration);
  }

  private recordFailure(duration: number): void {
    this.metrics.failedExecutions++;
    this.updateAverageDuration(duration);
  }

  private updateAverageDuration(newDuration: number): void {
    this.metrics.totalDuration += newDuration;
    this.metrics.averageDuration = this.metrics.totalDuration / this.metrics.totalExecutions;
  }
}

export default InterpolatorExecutor;