/**
 * V111 Adapter Executor
 * Executes adapters with lifecycle management and result aggregation
 */

import { Adapter, AdapterConfig } from './Adapter';

export type ExecutorConfig = {
  name: string;
  version: string;
  parallelExecution: boolean;
  maxConcurrency: number;
  continueOnError: boolean;
  timeout: number;
};

export type ExecutionResult<T = unknown> = {
  adapterId: string;
  success: boolean;
  data?: T;
  error?: string;
  duration: number;
  timestamp: number;
};

export type ExecutorStats = {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  totalDuration: number;
  averageDuration: number;
};

export class AdapterExecutor {
  private _config: ExecutorConfig;
  private _results: ExecutionResult[];
  private _stats: ExecutorStats;

  constructor(config: Partial<ExecutorConfig> = {}) {
    this._config = {
      name: config.name ?? 'AdapterExecutor',
      version: config.version ?? '1.0.0',
      parallelExecution: config.parallelExecution ?? false,
      maxConcurrency: config.maxConcurrency ?? 5,
      continueOnError: config.continueOnError ?? true,
      timeout: config.timeout ?? 30000,
    };
    this._results = [];
    this._stats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      totalDuration: 0,
      averageDuration: 0,
    };
  }

  get config(): ExecutorConfig {
    return { ...this._config };
  }

  async execute<TInput, TOutput>(
    adapter: Adapter,
    input: TInput
  ): Promise<ExecutionResult<TOutput>> {
    const startTime = Date.now();
    try {
      const adaptResult = await adapter.adapt<TInput, TOutput>(input);
      const duration = Date.now() - startTime;

      if (adaptResult.success) {
        this._stats.successfulExecutions++;
      } else {
        this._stats.failedExecutions++;
      }

      this._stats.totalExecutions++;
      this.updateAverageDuration(duration);

      const result: ExecutionResult<TOutput> = {
        adapterId: adapter.config.id,
        success: adaptResult.success,
        data: adaptResult.data,
        error: adaptResult.error,
        duration,
        timestamp: startTime,
      };

      this._results.push(result as ExecutionResult);
      return result;
    } catch (error) {
      this._stats.failedExecutions++;
      this._stats.totalExecutions++;
      const duration = Date.now() - startTime;
      this.updateAverageDuration(duration);

      const result: ExecutionResult<TOutput> = {
        adapterId: adapter.config.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration,
        timestamp: startTime,
      };

      this._results.push(result as ExecutionResult);
      return result;
    }
  }

  async run<TInput, TOutput>(
    adapters: Adapter[],
    input: TInput
  ): Promise<ExecutionResult<TOutput>[]> {
    if (this._config.parallelExecution) {
      return this.runParallel(adapters, input);
    }
    return this.runSequential(adapters, input);
  }

  private async runSequential<TInput, TOutput>(
    adapters: Adapter[],
    input: TInput
  ): Promise<ExecutionResult<TOutput>[]> {
    const results: ExecutionResult<TOutput>[] = [];
    for (const adapter of adapters) {
      const result = await this.execute<TInput, TOutput>(adapter, input);
      results.push(result);
      if (!result.success && !this._config.continueOnError) {
        break;
      }
    }
    return results;
  }

  private async runParallel<TInput, TOutput>(
    adapters: Adapter[],
    input: TInput
  ): Promise<ExecutionResult<TOutput>[]> {
    const chunks: Adapter[][] = [];
    for (let i = 0; i < adapters.length; i += this._config.maxConcurrency) {
      chunks.push(adapters.slice(i, i + this._config.maxConcurrency));
    }

    const results: ExecutionResult<TOutput>[] = [];
    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(adapter => this.execute<TInput, TOutput>(adapter, input))
      );
      results.push(...chunkResults);
    }
    return results;
  }

  getResults(adapterId?: string): ExecutionResult[] {
    if (adapterId) {
      return this._results.filter(r => r.adapterId === adapterId);
    }
    return [...this._results];
  }

  clearResults(): void {
    this._results = [];
  }

  getStats(): ExecutorStats {
    return { ...this._stats };
  }

  private updateAverageDuration(duration: number): void {
    const total = this._stats.totalDuration + duration;
    const count = this._stats.totalExecutions;
    this._stats.totalDuration = total;
    this._stats.averageDuration = count > 0 ? total / count : 0;
  }

  getSnapshot(): { metrics: ExecutorStats } {
    return { metrics: this.getStats() };
  }

  reset(): void {
    this._results = [];
    this._stats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      totalDuration: 0,
      averageDuration: 0,
    };
  }

  getReport(): string {
    return [
      `Executor Report: ${this._config.name} v${this._config.version}`,
      `Execution Mode: ${this._config.parallelExecution ? 'Parallel' : 'Sequential'}`,
      `Concurrency: ${this._config.maxConcurrency}`,
      `Total: ${this._stats.totalExecutions} | Success: ${this._stats.successfulExecutions} | Failed: ${this._stats.failedExecutions}`,
      `Total Duration: ${this._stats.totalDuration}ms`,
      `Average Duration: ${this._stats.averageDuration.toFixed(2)}ms`,
    ].join('\n');
  }

  exportMetrics(): { version: string; stats: ExecutorStats; config: ExecutorConfig } {
    return {
      version: '1.0.0',
      stats: this.getStats(),
      config: this.config,
    };
  }
}