/**
 * V139 Transformer Executor
 * Executes transformations using registered transformers
 */

import { Transformer, TransformResult } from './Transformer';
import { TransformerRegistry } from './TransformerRegistry';

export type ExecutorConfig = {
  timeout: number;
  parallel: boolean;
  maxRetries: number;
};

export type ExecutionResult = {
  transformerId: string;
  result: TransformResult;
  duration: number;
};

export class TransformerExecutor {
  private _registry: TransformerRegistry;
  private _results: ExecutionResult[] = [];
  private _config: ExecutorConfig;
  private _stats: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    totalDuration: number;
  };

  constructor(registry: TransformerRegistry, config: Partial<ExecutorConfig> = {}) {
    this._registry = registry;
    this._config = {
      timeout: config.timeout || 30000,
      parallel: config.parallel !== false,
      maxRetries: config.maxRetries || 0,
    };
    this._stats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      totalDuration: 0,
    };
  }

  get config(): ExecutorConfig {
    return { ...this._config };
  }

  getStats(): Readonly<typeof this._stats> {
    return { ...this._stats };
  }

  execute(transformerId: string, input: unknown): TransformResult | null {
    const transformer = this._registry.get(transformerId);
    if (!transformer) {
      return null;
    }

    const start = Date.now();
    this._stats.totalExecutions++;
    const result = transformer.transform(input);
    const duration = Date.now() - start;

    this._stats.totalDuration += duration;
    if (result.success) {
      this._stats.successfulExecutions++;
    } else {
      this._stats.failedExecutions++;
    }

    this._results.push({ transformerId, result, duration });
    return result;
  }

  run(transformerIds: string[], input: unknown): Map<string, TransformResult> {
    const results = new Map<string, TransformResult>();

    for (const id of transformerIds) {
      const result = this.execute(id, input);
      if (result) {
        results.set(id, result);
      }
    }

    return results;
  }

  getResults(): ExecutionResult[] {
    return [...this._results];
  }

  getSnapshot(): { metrics: Record<string, unknown> } {
    return {
      metrics: {
        totalExecutions: this._stats.totalExecutions,
        successfulExecutions: this._stats.successfulExecutions,
        failedExecutions: this._stats.failedExecutions,
        totalDuration: this._stats.totalDuration,
        averageDuration: this._stats.totalExecutions > 0
          ? this._stats.totalDuration / this._stats.totalExecutions
          : 0,
        timeout: this._config.timeout,
        parallel: this._config.parallel,
        maxRetries: this._config.maxRetries,
        resultCount: this._results.length,
      },
    };
  }

  reset(): void {
    this._results = [];
    this._stats.totalExecutions = 0;
    this._stats.successfulExecutions = 0;
    this._stats.failedExecutions = 0;
    this._stats.totalDuration = 0;
  }

  getReport(): string {
    const snap = this.getSnapshot();
    return JSON.stringify(snap, null, 2);
  }

  exportMetrics(): { version: string } & ReturnType<typeof this.getSnapshot>['metrics'] {
    return {
      version: '1.0.0',
      ...this.getSnapshot().metrics,
    };
  }
}