/**
 * V115 Accumulator Executor
 * Executes operations across accumulators
 */

import { Accumulator, AccumulatorConfig, AccumulatorMetrics } from './Accumulator';
import { AccumulatorRegistry } from './AccumulatorRegistry';

export interface ExecutorConfig {
  readonly id: string;
  readonly parallel?: boolean;
  readonly timeout?: number;
  readonly retryAttempts?: number;
}

export interface ExecutionResult<T = unknown> {
  readonly id: string;
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly duration: number;
  readonly timestamp: number;
}

export interface ExecutorMetrics {
  readonly totalExecutions: number;
  readonly successfulExecutions: number;
  readonly failedExecutions: number;
  readonly averageDuration: number;
  readonly lastExecution: number;
}

export interface ExecutorSnapshot {
  readonly metrics: ExecutorMetrics;
  readonly config: ExecutorConfig;
  readonly results: ExecutionResult[];
}

type ExecutorCallback<T> = (accumulator: Accumulator, ...args: unknown[]) => T;

export class AccumulatorExecutor {
  private readonly _config: ExecutorConfig;
  private readonly _registry: AccumulatorRegistry;
  private readonly _results: ExecutionResult[];
  private _totalExecutions: number = 0;
  private _successfulExecutions: number = 0;
  private _failedExecutions: number = 0;
  private _totalDuration: number = 0;
  private _lastExecution: number = 0;
  private readonly _startTime: number;

  constructor(config: ExecutorConfig, registry: AccumulatorRegistry) {
    this._config = Object.freeze({ ...config });
    this._registry = registry;
    this._results = [];
    this._startTime = Date.now();
  }

  get config(): ExecutorConfig {
    return this._config;
  }

  getSnapshot(): ExecutorSnapshot {
    return {
      metrics: this.getStats(),
      config: this._config,
      results: [...this._results],
    };
  }

  reset(): void {
    this._results.length = 0;
    this._totalExecutions = 0;
    this._successfulExecutions = 0;
    this._failedExecutions = 0;
    this._totalDuration = 0;
    this._lastExecution = 0;
  }

  getReport(): string {
    const stats = this.getStats();
    const uptime = Date.now() - this._startTime;
    return [
      `Accumulator Executor Report: ${this._config.id}`,
      `  Uptime: ${uptime}ms`,
      `  Total Executions: ${stats.totalExecutions}`,
      `  Successful: ${stats.successfulExecutions}`,
      `  Failed: ${stats.failedExecutions}`,
      `  Average Duration: ${stats.averageDuration.toFixed(2)}ms`,
      `  Last Execution: ${stats.lastExecution ? new Date(stats.lastExecution).toISOString() : 'N/A'}`,
    ].join('\n');
  }

  exportMetrics(): { version: string } & ExecutorMetrics {
    return {
      version: 'v115',
      ...this.getStats(),
    };
  }

  execute<T>(
    accumulatorId: string,
    callback: ExecutorCallback<T>,
    ...args: unknown[]
  ): ExecutionResult<T> {
    const startTime = Date.now();
    this._totalExecutions++;

    try {
      const accumulator = this._registry.get(accumulatorId);
      if (!accumulator) {
        throw new Error(`Accumulator '${accumulatorId}' not found`);
      }

      const data = callback(accumulator, ...args);
      const duration = Date.now() - startTime;
      this._totalDuration += duration;
      this._successfulExecutions++;
      this._lastExecution = Date.now();

      const result: ExecutionResult<T> = {
        id: accumulatorId,
        success: true,
        data,
        duration,
        timestamp: this._lastExecution,
      };

      this._results.push(result);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this._totalDuration += duration;
      this._failedExecutions++;
      this._lastExecution = Date.now();

      const result: ExecutionResult = {
        id: accumulatorId,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration,
        timestamp: this._lastExecution,
      };

      this._results.push(result);
      return result as ExecutionResult<T>;
    }
  }

  run<T>(
    accumulatorId: string,
    operation: 'accumulate' | 'add' | 'remove' | 'getResult',
    ...args: unknown[]
  ): ExecutionResult<T> {
    return this.execute<T>(accumulatorId, (acc) => {
      switch (operation) {
        case 'accumulate':
          return acc.accumulate(args[0] as string, args[1] as T, args[2] as Record<string, unknown>);
        case 'add':
          return acc.add(args[0] as string, args[1] as T, args[2] as Record<string, unknown>);
        case 'remove':
          return acc.remove(args[0] as string);
        case 'getResult':
          return acc.getResult(args[0] as string);
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
    });
  }

  getResults(): ExecutionResult[] {
    return [...this._results];
  }

  getStats(): ExecutorMetrics {
    return {
      totalExecutions: this._totalExecutions,
      successfulExecutions: this._successfulExecutions,
      failedExecutions: this._failedExecutions,
      averageDuration: this._totalExecutions > 0 ? this._totalDuration / this._totalExecutions : 0,
      lastExecution: this._lastExecution,
    };
  }

  getSuccessfulResults(): ExecutionResult[] {
    return this._results.filter(r => r.success);
  }

  getFailedResults(): ExecutionResult[] {
    return this._results.filter(r => !r.success);
  }

  clearResults(): void {
    this._results.length = 0;
  }

  getResultsSince(timestamp: number): ExecutionResult[] {
    return this._results.filter(r => r.timestamp >= timestamp);
  }

  getAverageDuration(): number {
    return this.getStats().averageDuration;
  }

  getSuccessRate(): number {
    if (this._totalExecutions === 0) return 0;
    return (this._successfulExecutions / this._totalExecutions) * 100;
  }
}

export default AccumulatorExecutor;