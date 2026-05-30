/**
 * V122 EncoderExecutor Module
 * Executes encodings across multiple encoders
 */

import { Encoder, EncodingResult, EncodingStats } from './Encoder';
import { EncoderRegistry } from './EncoderRegistry';

export type ExecutorConfig = {
  parallel: boolean;
  stopOnError: boolean;
  timeout: number;
  maxConcurrency: number;
};

export type ExecutionResult = {
  encoderId: string;
  encodingId: string;
  result: EncodingResult;
};

export type ExecutorStats = {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  totalDuration: number;
};

export class EncoderExecutor {
  private config: ExecutorConfig;
  private registry: EncoderRegistry;
  private results: ExecutionResult[] = [];
  private stats: ExecutorStats = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    totalDuration: 0,
  };

  constructor(config: ExecutorConfig, registry: EncoderRegistry) {
    this.config = { ...config };
    this.registry = registry;
  }

  get config(): ExecutorConfig {
    return { ...this.config };
  }

  execute(encoderId: string, encodingId: string, data: unknown): EncodingResult {
    const startTime = Date.now();
    const result = this.registry.execute(encoderId, encodingId, data);
    const duration = Date.now() - startTime;

    this.stats.totalExecutions++;
    if (result.success) {
      this.stats.successfulExecutions++;
    } else {
      this.stats.failedExecutions++;
    }
    this.stats.totalDuration += duration;

    this.results.push({
      encoderId,
      encodingId,
      result,
    });

    return result;
  }

  run(encoderIds: string[], encodingId: string, data: unknown): ExecutionResult[] {
    const results: ExecutionResult[] = [];

    if (this.config.parallel) {
      for (const id of encoderIds) {
        const result = this.execute(id, encodingId, data);
        results.push({
          encoderId: id,
          encodingId,
          result,
        });
        if (!result.success && this.config.stopOnError) {
          break;
        }
      }
    } else {
      for (const id of encoderIds) {
        const result = this.execute(id, encodingId, data);
        results.push({
          encoderId: id,
          encodingId,
          result,
        });
        if (!result.success && this.config.stopOnError) {
          break;
        }
      }
    }

    return results;
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
    return `EncoderExecutor Report:
  Parallel: ${snapshot.config.parallel}
  Stop On Error: ${snapshot.config.stopOnError}
  Total Executions: ${snapshot.stats.totalExecutions}
  Successful: ${snapshot.stats.successfulExecutions}
  Failed: ${snapshot.stats.failedExecutions}
  Total Duration: ${snapshot.stats.totalDuration}ms`;
  }

  exportMetrics(): { version: string; stats: ExecutorStats; config: ExecutorConfig } {
    return {
      version: '1.2.2',
      stats: this.getStats(),
      config: this.config,
    };
  }
}