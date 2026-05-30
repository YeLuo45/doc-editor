/**
 * ValidatorExecutorV2.ts - Validator Executor V2 Implementation
 * Version: 1.20.0
 * 
 * Executes validations across multiple validators with
 * result aggregation, parallel execution support, and detailed reporting.
 */

import { ValidatorV2, ValidationResult } from './ValidatorV2';
import { ValidatorRegistryV2 } from './ValidatorRegistryV2';

export type ExecutorConfig = {
  parallel: boolean;
  stopOnFirstError: boolean;
  timeout: number;
  retryCount: number;
};

export type ExecutionResult = {
  validatorName: string;
  result: ValidationResult;
  success: boolean;
  error?: string;
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
};

export class ValidatorExecutorV2 {
  private _executionCount = 0;
  private _totalExecutions = 0;
  private _successCount = 0;
  private _failureCount = 0;
  private _lastExecutionDuration = 0;
  private _totalDuration = 0;
  private readonly _lastResults: ExecutionResult[] = [];

  constructor(public readonly config: ExecutorConfig = DEFAULT_EXECUTOR_CONFIG) {
    this.config = { ...DEFAULT_EXECUTOR_CONFIG, ...config };
  }

  /**
   * Executes validation using a single validator
   */
  execute(validator: ValidatorV2, value: unknown): ExecutionResult {
    const startTime = Date.now();
    this._executionCount++;
    
    try {
      const result = validator.validate(value);
      const duration = Date.now() - startTime;
      
      this._lastExecutionDuration = duration;
      this._totalDuration += duration;
      
      const execution: ExecutionResult = {
        validatorName: 'anonymous',
        result,
        success: result.valid,
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
        validatorName: 'anonymous',
        result: { valid: false, errors: [], warnings: [], duration },
        success: false,
        error: String(error),
      };
      
      this._lastResults.push(execution);
      return execution;
    }
  }

  /**
   * Runs validation across all validators in the registry
   */
  async run(
    registry: ValidatorRegistryV2,
    value: unknown,
    validatorNames?: string[]
  ): Promise<AggregatedResult> {
    const startTime = Date.now();
    const results: ExecutionResult[] = [];
    
    let validatorsToRun: Array<{ name: string; validator: ValidatorV2 }> = [];
    
    if (validatorNames) {
      validatorsToRun = validatorNames
        .map(name => {
          const validator = registry.get(name);
          return validator ? { name, validator } : null;
        })
        .filter((v): v is { name: string; validator: ValidatorV2 } => v !== null);
    } else {
      validatorsToRun = Array.from(registry.getAll().entries()).map(
        ([name, entry]) => ({ name, validator: entry.validator })
      );
    }
    
    if (this.config.parallel) {
      const promises = validatorsToRun.map(async ({ name, validator }) => {
        return this.execute(validator, value);
      });
      const parallelResults = await Promise.all(promises);
      results.push(...parallelResults);
    } else {
      for (const { name, validator } of validatorsToRun) {
        const result = this.execute(validator, value);
        result.validatorName = name;
        results.push(result);
        
        if (this.config.stopOnFirstError && !result.success) {
          break;
        }
      }
    }
    
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    return {
      totalValidators: validatorsToRun.length,
      passed,
      failed,
      totalDuration: Date.now() - startTime,
      results,
    };
  }

  /**
   * Gets all results from the last execution
   */
  getResults(): ExecutionResult[] {
    return [...this._lastResults];
  }

  /**
   * Gets execution statistics
   */
  getStats(): {
    totalExecutions: number;
    successCount: number;
    failureCount: number;
    averageDuration: number;
    lastDuration: number;
    pendingCount: number;
  } {
    return {
      totalExecutions: this._totalExecutions,
      successCount: this._successCount,
      failureCount: this._failureCount,
      averageDuration: this._totalExecutions > 0 
        ? this._totalDuration / this._totalExecutions 
        : 0,
      lastDuration: this._lastExecutionDuration,
      pendingCount: this._executionCount,
    };
  }

  /**
   * Gets a snapshot of current metrics
   */
  getSnapshot(): { metrics: Record<string, unknown> } {
    return {
      metrics: {
        executionCount: this._executionCount,
        totalExecutions: this._totalExecutions,
        successCount: this._successCount,
        failureCount: this._failureCount,
        totalDuration: this._totalDuration,
        lastResultsCount: this._lastResults.length,
        config: this.config,
      },
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
    this._lastResults.length = 0;
  }

  /**
   * Generates a text report of executor state
   */
  getReport(): string {
    const stats = this.getStats();
    
    let report = '=== Validator Executor V2 Report ===\n';
    report += `Total Executions: ${stats.totalExecutions}\n`;
    report += `Successful: ${stats.successCount}\n`;
    report += `Failed: ${stats.failureCount}\n`;
    report += `Success Rate: ${stats.totalExecutions > 0 
      ? ((stats.successCount / stats.totalExecutions) * 100).toFixed(1) 
      : 0}%\n`;
    report += `Average Duration: ${stats.averageDuration.toFixed(2)}ms\n`;
    report += `Last Duration: ${stats.lastDuration}ms\n`;
    report += `Parallel: ${this.config.parallel}\n`;
    report += `Stop On First Error: ${this.config.stopOnFirstError}\n`;
    report += '\nLast Results:\n';
    
    for (const result of this._lastResults.slice(-10)) {
      const status = result.success ? 'PASS' : 'FAIL';
      report += `  [${status}] ${result.validatorName}`;
      if (result.error) report += `: ${result.error}`;
      report += '\n';
    }
    
    return report;
  }

  /**
   * Exports metrics in standardized format
   */
  exportMetrics(): { version: string; metrics: Record<string, unknown> } {
    return {
      version: '1.20.0',
      metrics: this.getSnapshot().metrics,
    };
  }
}