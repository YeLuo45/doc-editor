/**
 * V133 EvaluatorExecutor Module
 * Executes evaluations across registered evaluators
 */

import { Evaluator, EvaluationResult } from "./Evaluator";
import { EvaluatorRegistry } from "./EvaluatorRegistry";

export type ExecutorConfig = {
  name: string;
  version: string;
  parallel: boolean;
  failFast: boolean;
  timeout: number;
};

export type ExecutorStats = {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  averageDuration: number;
  lastRunTime?: number;
};

export type ExecutionResult = {
  executorId: string;
  evaluatorId: string;
  results: EvaluationResult[];
  success: boolean;
  duration: number;
  timestamp: number;
};

export class EvaluatorExecutor {
  private _config: ExecutorConfig;
  private _registry: EvaluatorRegistry;
  private _stats: ExecutorStats = {
    totalRuns: 0,
    successfulRuns: 0,
    failedRuns: 0,
    averageDuration: 0,
  };
  private _results: ExecutionResult[] = [];
  private readonly MAX_RESULTS = 100;

  constructor(config: ExecutorConfig, registry: EvaluatorRegistry) {
    this._config = { ...config };
    this._registry = registry;
  }

  get config(): ExecutorConfig {
    return { ...this._config };
  }

  execute(value: unknown): ExecutionResult[] {
    const results: ExecutionResult[] = [];
    const evaluators = this._registry.getAll();

    const startTime = Date.now();

    for (const evaluator of evaluators) {
      const execResult = this.runEvaluator(evaluator, value);
      results.push(execResult);

      if (this._config.failFast && !execResult.success) {
        break;
      }
    }

    const duration = Date.now() - startTime;
    this.updateStats(results, duration);

    return results;
  }

  run(value: unknown): ExecutionResult[] {
    return this.execute(value);
  }

  getResults(): ExecutionResult[] {
    return [...this._results];
  }

  getStats(): ExecutorStats {
    return { ...this._stats };
  }

  getSnapshot(): { metrics: ExecutorStats } {
    return {
      metrics: this.getStats(),
    };
  }

  reset(): void {
    this._stats = {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      averageDuration: 0,
    };
    this._results = [];
  }

  getReport(): string {
    const passRate =
      this._stats.totalRuns > 0
        ? (
            (this._stats.successfulRuns / this._stats.totalRuns) *
            100
          ).toFixed(2)
        : "0.00";

    return [
      `=== Evaluator Executor Report ===`,
      `Name: ${this._config.name}`,
      `Version: ${this._config.version}`,
      `Parallel: ${this._config.parallel}`,
      `Fail Fast: ${this._config.failFast}`,
      `Total Runs: ${this._stats.totalRuns}`,
      `Successful: ${this._stats.successfulRuns}`,
      `Failed: ${this._stats.failedRuns}`,
      `Pass Rate: ${passRate}%`,
      `Average Duration: ${this._stats.averageDuration.toFixed(2)}ms`,
    ].join("\n");
  }

  exportMetrics(): { version: string } {
    return {
      version: "1.33.0",
    };
  }

  private runEvaluator(
    evaluator: Evaluator,
    value: unknown
  ): ExecutionResult {
    const startTime = Date.now();
    const evaluatorId = evaluator.config.id;

    let success = true;
    let results: EvaluationResult[] = [];

    try {
      results = [evaluator.evaluate(value)];
      success = results[0].passed;
    } catch {
      success = false;
    }

    const duration = Date.now() - startTime;

    const executionResult: ExecutionResult = {
      executorId: this._config.name,
      evaluatorId,
      results,
      success,
      duration,
      timestamp: Date.now(),
    };

    this.addToResults(executionResult);

    return executionResult;
  }

  private updateStats(results: ExecutionResult[], duration: number): void {
    this._stats.totalRuns++;
    this._stats.lastRunTime = Date.now();

    const allSuccess = results.every((r) => r.success);
    if (allSuccess) {
      this._stats.successfulRuns++;
    } else {
      this._stats.failedRuns++;
    }

    const prevAvg = this._stats.averageDuration;
    const n = this._stats.totalRuns;
    this._stats.averageDuration = prevAvg + (duration - prevAvg) / n;
  }

  private addToResults(result: ExecutionResult): void {
    this._results.push(result);
    if (this._results.length > this.MAX_RESULTS) {
      this._results.shift();
    }
  }
}