/**
 * V138 ProjectorExecutor - Executes projections across registered projectors
 * Handles batch and sequential execution with error handling
 */

import { Projector } from './Projector';
import { ProjectorRegistry } from './ProjectorRegistry';

export type ExecutorConfig = {
  parallel: boolean;
  maxConcurrency: number;
  stopOnError: boolean;
  retryOnError: boolean;
  maxRetries: number;
};

export type ExecutionResult = {
  projectorId: string;
  success: boolean;
  data: unknown;
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

export class ProjectorExecutor {
  private _config: ExecutorConfig;
  private _registry: ProjectorRegistry;
  private _results: ExecutionResult[];
  private _stats: ExecutorStats;

  constructor(registry: ProjectorRegistry, config: Partial<ExecutorConfig> = {}) {
    this._registry = registry;
    this._config = {
      parallel: config.parallel ?? true,
      maxConcurrency: config.maxConcurrency ?? 5,
      stopOnError: config.stopOnError ?? false,
      retryOnError: config.retryOnError ?? false,
      maxRetries: config.maxRetries ?? 3,
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

  getStats(): ExecutorStats {
    return { ...this._stats };
  }

  getResults(): ExecutionResult[] {
    return [...this._results];
  }

  async execute(projectorId: string, input: unknown): Promise<ExecutionResult> {
    const projector = this._registry.get(projectorId);
    const startTime = Date.now();

    if (!projector) {
      const result: ExecutionResult = {
        projectorId,
        success: false,
        data: null,
        error: `Projector ${projectorId} not found`,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
      };
      this.recordResult(result);
      return result;
    }

    let attempts = 0;
    let lastError: string | undefined;

    while (attempts < this._config.maxRetries) {
      attempts++;
      const projection = projector.project(input);

      if (projection.success) {
        const result: ExecutionResult = {
          projectorId,
          success: true,
          data: projection.data,
          duration: Date.now() - startTime,
          timestamp: Date.now(),
        };
        this.recordResult(result);
        return result;
      }

      lastError = projection.error;

      if (!this._config.retryOnError || attempts >= this._config.maxRetries) {
        break;
      }
    }

    const result: ExecutionResult = {
      projectorId,
      success: false,
      data: null,
      error: lastError ?? 'Execution failed',
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };
    this.recordResult(result);
    return result;
  }

  async run(projectorIds: string[], input: unknown): Promise<ExecutionResult[]> {
    if (this._config.parallel) {
      return this.runParallel(projectorIds, input);
    }
    return this.runSequential(projectorIds, input);
  }

  private async runParallel(projectorIds: string[], input: unknown): Promise<ExecutionResult[]> {
    const batches: string[][] = [];
    for (let i = 0; i < projectorIds.length; i += this._config.maxConcurrency) {
      batches.push(projectorIds.slice(i, i + this._config.maxConcurrency));
    }

    const results: ExecutionResult[] = [];
    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map((id) => this.execute(id, input))
      );
      results.push(...batchResults);

      if (this._config.stopOnError && batchResults.some((r) => !r.success)) {
        break;
      }
    }
    return results;
  }

  private async runSequential(projectorIds: string[], input: unknown): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];

    for (const id of projectorIds) {
      const result = await this.execute(id, input);
      results.push(result);

      if (this._config.stopOnError && !result.success) {
        break;
      }
    }
    return results;
  }

  private recordResult(result: ExecutionResult): void {
    this._results.push(result);
    this._stats.totalExecutions++;
    this._stats.totalDuration += result.duration;

    if (result.success) {
      this._stats.successfulExecutions++;
    } else {
      this._stats.failedExecutions++;
    }

    this._stats.averageDuration = this._stats.totalDuration / this._stats.totalExecutions;
  }

  getSnapshot(): { metrics: ExecutorStats; config: ExecutorConfig; recentResults: ExecutionResult[] } {
    return {
      metrics: this.getStats(),
      config: this.config,
      recentResults: this._results.slice(-10),
    };
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
    const successRate = this._stats.totalExecutions > 0
      ? ((this._stats.successfulExecutions / this._stats.totalExecutions) * 100).toFixed(2)
      : '0.00';

    return [
      `ProjectorExecutor Report`,
      `Parallel: ${this._config.parallel}`,
      `Max Concurrency: ${this._config.maxConcurrency}`,
      `Stop On Error: ${this._config.stopOnError}`,
      `Total Executions: ${this._stats.totalExecutions}`,
      `Successful: ${this._stats.successfulExecutions}`,
      `Failed: ${this._stats.failedExecutions}`,
      `Success Rate: ${successRate}%`,
      `Average Duration: ${this._stats.averageDuration.toFixed(2)}ms`,
    ].join('\n');
  }

  exportMetrics(): { version: string; stats: ExecutorStats; config: ExecutorConfig } {
    return {
      version: 'V138',
      stats: this.getStats(),
      config: this.config,
    };
  }
}