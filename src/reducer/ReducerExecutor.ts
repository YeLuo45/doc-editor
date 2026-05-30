/**
 * ReducerExecutor.ts - V112 Reducer Executor
 * Executes reducers with orchestration and result handling
 */

import { Reducer, ReducerConfig, ReducerResult } from './Reducer';

export interface ExecutorConfig {
  concurrency?: number;
  timeout?: number;
  retryOnError?: boolean;
  stopOnError?: boolean;
}

export interface ExecutionResult<T = unknown> {
  id: string;
  success: boolean;
  result?: ReducerResult<T>;
  error?: string;
  executedAt: number;
  duration: number;
}

export interface ExecutionStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  totalDuration: number;
  averageDuration: number;
}

export class ReducerExecutor<TInput = unknown, TOutput = unknown> {
  private results: Map<string, ExecutionResult<TOutput>> = new Map();
  private config: ExecutorConfig;
  private stats: ExecutionStats;

  constructor(config: ExecutorConfig = {}) {
    this.config = {
      concurrency: 5,
      timeout: 30000,
      retryOnError: false,
      stopOnError: false,
      ...config
    };
    this.stats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      totalDuration: 0,
      averageDuration: 0
    };
  }

  get config(): ExecutorConfig {
    return { ...this.config };
  }

  execute(id: string, reducer: Reducer<TInput, TOutput>, input: TInput[]): ExecutionResult<TOutput> {
    const startTime = Date.now();
    
    try {
      const result = reducer.reduce((items) => {
        return items.reduce((acc: TOutput[], item: TInput) => {
          return [...acc, item as unknown as TOutput];
        }, [] as TOutput[]);
      });

      const executionResult: ExecutionResult<TOutput> = {
        id,
        success: true,
        result: {
          ...result,
          data: input.reduce((acc: TOutput[], item: TInput) => {
            return [...acc, item as unknown as TOutput];
          }, [] as TOutput[])
        },
        executedAt: Date.now(),
        duration: Date.now() - startTime
      };

      this.results.set(id, executionResult);
      this.updateStats(true, executionResult.duration);
      
      return executionResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const executionResult: ExecutionResult<TOutput> = {
        id,
        success: false,
        error: errorMessage,
        executedAt: Date.now(),
        duration: Date.now() - startTime
      };

      this.results.set(id, executionResult);
      this.updateStats(false, executionResult.duration);
      
      return executionResult;
    }
  }

  run(id: string, reducer: Reducer<TInput, TOutput>, input: TInput[]): Promise<ExecutionResult<TOutput>> {
    return new Promise((resolve) => {
      const result = this.execute(id, reducer, input);
      resolve(result);
    });
  }

  getResults(): Map<string, ExecutionResult<TOutput>> {
    return new Map(this.results);
  }

  getStats(): ExecutionStats {
    return { ...this.stats };
  }

  getSnapshot(): { metrics: ExecutionStats; config: ExecutorConfig } {
    return {
      metrics: this.getStats(),
      config: this.config
    };
  }

  reset(): void {
    this.results.clear();
    this.stats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      totalDuration: 0,
      averageDuration: 0
    };
  }

  private updateStats(success: boolean, duration: number): void {
    this.stats.totalExecutions++;
    if (success) {
      this.stats.successfulExecutions++;
    } else {
      this.stats.failedExecutions++;
    }
    this.stats.totalDuration += duration;
    this.stats.averageDuration = this.stats.totalDuration / this.stats.totalExecutions;
  }

  getReport(): string {
    return [
      `Reducer Executor Report`,
      `Total Executions: ${this.stats.totalExecutions}`,
      `Successful: ${this.stats.successfulExecutions}`,
      `Failed: ${this.stats.failedExecutions}`,
      `Total Duration: ${this.stats.totalDuration}ms`,
      `Average Duration: ${this.stats.averageDuration.toFixed(2)}ms`,
      `Concurrency: ${this.config.concurrency}`,
      `Timeout: ${this.config.timeout}ms`
    ].join('\n');
  }

  exportMetrics(): { version: string; stats: ExecutionStats; config: ExecutorConfig } {
    return {
      version: 'V112',
      stats: this.getStats(),
      config: this.config
    };
  }
}

export default ReducerExecutor;