/**
 * ValidatorExecutorV3.ts - Validator Executor V3 Implementation
 * Version: 128.0.0
 * 
 * Executes validations across multiple validators with
 * result aggregation, parallel execution support, and detailed reporting.
 */

import { ValidatorV3, ValidationResult } from './ValidatorV3';
import { ValidatorRegistryV3 } from './ValidatorRegistryV3';

export type ExecutorConfig = {
  parallel: boolean;
  stopOnFirstError: boolean;
  timeout: number;
  retryCount: number;
  maxConcurrent: number;
};

export type ExecutionResult = {
  validatorName: string;
  result: ValidationResult;
  success: boolean;
  error?: string;
  duration: number;
};

export type AggregatedResult = {
  totalValidators: number;
  passed: number;
  failed: number;
  totalDuration: number;
  results: ExecutionResult[];
};

const DEFAULT_EXECUTOR_CONFIG: ExecutorConfig = {
  parallel: false,
  stopOnFirstError: false,
  timeout: 10000,
  retryCount: 0,
  maxConcurrent: 10,
};

export class ValidatorExecutorV3 {
  private _executionCount = 0;
  private _totalExecutions = 0;
  private _successCount = 0;
  private _failureCount = 0;
  private _lastExecutionDuration = 0;
  private _totalDuration = 0;
  private _lastResults: ExecutionResult[] = [];

  constructor(public readonly config: ExecutorConfig = DEFAULT_EXECUTOR_CONFIG) {
    this.config = { ...DEFAULT_EXECUTOR_CONFIG, ...config };
  }

  /**
   * Executes validation using a single validator
   */
  execute(validator: ValidatorV3, value: unknown): ExecutionResult {
    const startTime = Date.now();
    this._executionCount++;

    try {
      const result = validator.validate(value);
      const duration = Date.now() - startTime;

      this._lastExecutionDuration = duration;
      this._totalDuration += duration;

      const execution: ExecutionResult = {
        validatorName: validator.config.name,
        result,
        success: result.valid,
        duration,
      };

      if (result.valid) {
        this._successCount++;
      } else {
        this._failureCount++;
      }

      this._totalExecutions++;
      this._lastResults.push(execution);

      return execution;
    } catch (error) {
      const duration = Date.now() - startTime;
      this._lastExecutionDuration = duration;
      this._totalDuration += duration;
      this._failureCount++;
      this._totalExecutions++;

      const execution: ExecutionResult = {
        validatorName: validator.config.name,
        result: { valid: false, errors: [], warnings: [], duration, timestamp: Date.now() },
        success: false,
        error: String(error),
        duration,
      };

      this._lastResults.push(execution);
      return execution;
    }
  }

  /**
   * Runs validation across a registry of validators
   */
  run(registry: ValidatorRegistryV3, value: unknown): AggregatedResult {
    const validators = registry.getAll();
    const results: ExecutionResult[] = [];
    const startTime = Date.now();

    for (const validator of validators) {
      const result = this.execute(validator, value);
      results.push(result);

      if (this.config.stopOnFirstError && !result.success) {
        break;
      }
    }

    const totalDuration = Date.now() - startTime;
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    this._lastResults = results;

    return {
      totalValidators: validators.length,
      passed,
      failed,
      totalDuration,
      results,
    };
  }

  /**
   * Gets the last execution results
   */
  getResults(): ExecutionResult[] {
    return this._lastResults;
  }

  /**
   * Gets executor statistics
   */
  getStats(): ExecutorStats {
    return {
      executionCount: this._executionCount,
      totalExecutions: this._totalExecutions,
      successCount: this._successCount,
      failureCount: this._failureCount,
      lastExecutionDuration: this._lastExecutionDuration,
      totalDuration: this._totalDuration,
      averageDuration: this._totalExecutions > 0 
        ? this._totalDuration / this._totalExecutions 
        : 0,
      successRate: this._totalExecutions > 0 
        ? this._successCount / this._totalExecutions 
        : 0,
    };
  }

  /**
   * Gets a snapshot of current metrics
   */
  getSnapshot(): { metrics: ExecutorStats } {
    return {
      metrics: this.getStats(),
    };
  }

  /**
   * Resets all statistics and state
   */
  reset(): void {
    this._executionCount = 0;
    this._totalExecutions = 0;
    this._successCount = 0;
    this._failureCount = 0;
    this._lastExecutionDuration = 0;
    this._totalDuration = 0;
    this._lastResults = [];
  }

  /**
   * Generates a text report of executor state
   */
  getReport(): string {
    const stats = this.getStats();
    return [
      `ValidatorExecutorV3 Report`,
      `Executions: ${stats.totalExecutions}`,
      `Success: ${stats.successCount}`,
      `Failures: ${stats.failureCount}`,
      `Avg Duration: ${stats.averageDuration.toFixed(2)}ms`,
      `Success Rate: ${(stats.successRate * 100).toFixed(1)}%`,
    ].join('\n');
  }

  /**
   * Exports metrics in standardized format
   */
  exportMetrics(): { version: string; stats: ExecutorStats } {
    return {
      version: '128.0.0',
      stats: this.getStats(),
    };
  }
}

export type ExecutorStats = {
  executionCount: number;
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  lastExecutionDuration: number;
  totalDuration: number;
  averageDuration: number;
  successRate: number;
};