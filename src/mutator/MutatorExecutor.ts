/**
 * V121 MutatorExecutor Module
 * Executes mutations across multiple mutators
 */

import { Mutator, MutationResult, MutationStats } from './Mutator';
import { MutatorRegistry } from './MutatorRegistry';

export type ExecutorConfig = {
  parallel: boolean;
  stopOnError: boolean;
  timeout: number;
  maxConcurrency: number;
};

export type ExecutionResult = {
  mutatorId: string;
  mutationId: string;
  result: MutationResult;
};

export type ExecutorStats = {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  totalDuration: number;
};

export class MutatorExecutor {
  private config: ExecutorConfig;
  private registry: MutatorRegistry;
  private results: ExecutionResult[] = [];
  private stats: ExecutorStats = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    totalDuration: 0,
  };

  constructor(config: ExecutorConfig, registry: MutatorRegistry) {
    this.config = { ...config };
    this.registry = registry;
  }

  get config(): ExecutorConfig {
    return { ...this.config };
  }

  execute(mutatorId: string, mutationId: string, data: unknown): MutationResult {
    const startTime = Date.now();
    const result = this.registry.execute(mutatorId, mutationId, data);
    const duration = Date.now() - startTime;

    this.stats.totalExecutions++;
    if (result.success) {
      this.stats.successfulExecutions++;
    } else {
      this.stats.failedExecutions++;
    }
    this.stats.totalDuration += duration;

    this.results.push({
      mutatorId,
      mutationId,
      result,
    });

    return result;
  }

  run(mutatorIds: string[], mutationId: string, data: unknown): ExecutionResult[] {
    const results: ExecutionResult[] = [];

    if (this.config.parallel) {
      const promises = mutatorIds.map((id) => {
        return this.executeAsync(id, mutationId, data);
      });
      // For simplicity, execute sequentially in non-parallel mode
      // but parallel would use Promise.all
      for (const id of mutatorIds) {
        const result = this.execute(id, mutationId, data);
        results.push({
          mutatorId: id,
          mutationId,
          result,
        });
        if (!result.success && this.config.stopOnError) {
          break;
        }
      }
    } else {
      for (const id of mutatorIds) {
        const result = this.execute(id, mutationId, data);
        results.push({
          mutatorId: id,
          mutationId,
          result,
        });
        if (!result.success && this.config.stopOnError) {
          break;
        }
      }
    }

    return results;
  }

  private executeAsync(mutatorId: string, mutationId: string, data: unknown): Promise<ExecutionResult> {
    return new Promise((resolve) => {
      const result = this.execute(mutatorId, mutationId, data);
      resolve({
        mutatorId,
        mutationId,
        result,
      });
    });
  }

  getResults(): ExecutionResult[] {
    return [...this.results];
  }

  getStats(): ExecutorStats {
    return { ...this.stats };
  }

  clearResults(): void {
    this.results = [];
  }

  getSnapshot(): { stats: ExecutorStats; config: ExecutorConfig; resultCount: number } {
    return {
      stats: this.getStats(),
      config: this.config,
      resultCount: this.results.length,
    };
  }

  reset(): void {
    this.stats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      totalDuration: 0,
    };
    this.results = [];
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    return `MutatorExecutor Report:
  Parallel: ${snapshot.config.parallel}
  Stop On Error: ${snapshot.config.stopOnError}
  Total Executions: ${snapshot.stats.totalExecutions}
  Successful: ${snapshot.stats.successfulExecutions}
  Failed: ${snapshot.stats.failedExecutions}
  Total Duration: ${snapshot.stats.totalDuration}ms`;
  }

  exportMetrics(): { version: string; stats: ExecutorStats; config: ExecutorConfig } {
    return {
      version: '1.2.1',
      stats: this.getStats(),
      config: this.config,
    };
  }
}