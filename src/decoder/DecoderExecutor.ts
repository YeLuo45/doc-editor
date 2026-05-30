/**
 * V123 Decoder Executor - Executes decoding operations
 */

import { Decoder } from './Decoder';
import { DecoderRegistry } from './DecoderRegistry';

export type ExecutorConfig = {
  parallel?: boolean;
  stopOnError?: boolean;
  defaultTimeout?: number;
};

export interface ExecutionResult {
  decoderName: string;
  success: boolean;
  result?: unknown;
  error?: string;
  duration: number;
}

export interface ExecutorStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  totalDuration: number;
  averageDuration: number;
}

export interface ExecutorSnapshot {
  config: ExecutorConfig;
  stats: ExecutorStats;
  active: boolean;
}

export class DecoderExecutor {
  private _registry: DecoderRegistry;
  private _config: ExecutorConfig;
  private _stats: ExecutorStats;
  private _results: ExecutionResult[];
  private _active: boolean;

  constructor(registry: DecoderRegistry, config: ExecutorConfig = {}) {
    this._registry = registry;
    this._config = { parallel: false, stopOnError: true, defaultTimeout: 10000, ...config };
    this._stats = { totalExecutions: 0, successfulExecutions: 0, failedExecutions: 0, totalDuration: 0, averageDuration: 0 };
    this._results = [];
    this._active = true;
  }

  get config(): ExecutorConfig { return { ...this._config }; }
  get stats(): ExecutorStats { return { ...this._stats }; }
  get active(): boolean { return this._active; }
  set active(value: boolean) { this._active = value; }

  execute(decoderName: string, data: unknown): ExecutionResult {
    if (!this._active) {
      return { decoderName, success: false, error: 'Executor is inactive', duration: 0 };
    }
    const decoder = this._registry.get(decoderName);
    if (!decoder) {
      return { decoderName, success: false, error: `Decoder '${decoderName}' not found`, duration: 0 };
    }
    const startTime = Date.now();
    const decodeResult = decoder.decode(data);
    const duration = Date.now() - startTime;
    const result: ExecutionResult = { decoderName, success: decodeResult.success, result: decodeResult.result, error: decodeResult.error, duration };
    this._results.push(result);
    this._updateStats(result);
    if (!result.success && this._config.stopOnError) { this._active = false; }
    return result;
  }

  run(decoderNames: string[], data: unknown): ExecutionResult[] {
    if (this._config.parallel) {
      return decoderNames.map(name => this.execute(name, data));
    }
    const results: ExecutionResult[] = [];
    for (const name of decoderNames) {
      const result = this.execute(name, data);
      results.push(result);
      if (!result.success && this._config.stopOnError) { break; }
    }
    return results;
  }

  private _updateStats(result: ExecutionResult): void {
    this._stats.totalExecutions++;
    if (result.success) { this._stats.successfulExecutions++; }
    else { this._stats.failedExecutions++; }
    this._stats.totalDuration += result.duration;
    this._stats.averageDuration = this._stats.totalDuration / this._stats.totalExecutions;
  }

  getResults(): ExecutionResult[] { return [...this._results]; }
  getResultsByDecoder(decoderName: string): ExecutionResult[] { return this._results.filter(r => r.decoderName === decoderName); }
  getStats(): ExecutorStats { return { ...this._stats }; }

  getSnapshot(): { metrics: ExecutorSnapshot } {
    return { metrics: { config: this.config, stats: this.stats, active: this._active } };
  }

  reset(): void {
    this._stats = { totalExecutions: 0, successfulExecutions: 0, failedExecutions: 0, totalDuration: 0, averageDuration: 0 };
    this._results = [];
    this._active = true;
  }

  getReport(): string {
    const { totalExecutions, successfulExecutions, failedExecutions, averageDuration } = this._stats;
    const successRate = totalExecutions > 0 ? ((successfulExecutions / totalExecutions) * 100).toFixed(2) : '0.00';
    return [
      '=== Decoder Executor Report ===',
      `Status: ${this._active ? 'ACTIVE' : 'INACTIVE'}`,
      `Executions: total=${totalExecutions} success=${successfulExecutions} failed=${failedExecutions}`,
      `Rate: ${successRate}% | Avg: ${averageDuration.toFixed(2)}ms`,
      `Parallel: ${this._config.parallel} | StopOnError: ${this._config.stopOnError}`,
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return { version: '1.2.3', executor: { stats: { ...this._stats }, recentResults: this._results.slice(-10) } };
  }

  updateConfig(config: Partial<ExecutorConfig>): void { this._config = { ...this._config, ...config }; }
  clearResults(): void { this._results = []; }
}