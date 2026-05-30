/**
 * V143 RegressorExecutor - Execution engine for regression analysis tasks
 * Manages parallel execution, result aggregation, and statistics computation
 */

import { Regressor, RegressionResult } from './Regressor';
import { RegressorRegistry } from './RegressorRegistry';

export type ExecutorConfig = {
  maxConcurrency: number;
  timeout: number;
  enableParallel: boolean;
  retryOnFailure: boolean;
  maxRetries: number;
};

export type ExecutionTask = {
  id: string;
  regressorId: string;
  inputData: number[];
  priority: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
};

export type ExecutionResult = {
  taskId: string;
  regressorId: string;
  results: RegressionResult[];
  executionTime: number;
  success: boolean;
  error?: string;
};

export class RegressorExecutor {
  private registry: RegressorRegistry;
  private tasks: Map<string, ExecutionTask> = new Map();
  private results: Map<string, ExecutionResult> = new Map();
  private runningCount: number = 0;

  readonly config: ExecutorConfig;

  constructor(registry: RegressorRegistry, config?: Partial<ExecutorConfig>) {
    this.registry = registry;
    this.config = {
      maxConcurrency: config?.maxConcurrency ?? 5,
      timeout: config?.timeout ?? 30000,
      enableParallel: config?.enableParallel ?? true,
      retryOnFailure: config?.retryOnFailure ?? false,
      maxRetries: config?.maxRetries ?? 3,
    };
  }

  execute(regressorId: string, inputData: number[]): ExecutionResult {
    const regressor = this.registry.get(regressorId);
    if (!regressor) {
      return this.createErrorResult('unknown', regressorId, 'Regressor not found');
    }

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      const results = regressor.regress(inputData);
      const executionTime = Date.now() - startTime;

      const result: ExecutionResult = {
        taskId,
        regressorId,
        results,
        executionTime,
        success: true,
      };

      this.results.set(taskId, result);
      return result;
    } catch (error) {
      return this.createErrorResult(taskId, regressorId, (error as Error).message);
    }
  }

  run(tasks: Array<{ regressorId: string; inputData: number[] }>): ExecutionResult[] {
    if (this.config.enableParallel) {
      return this.runParallel(tasks);
    }
    return this.runSequential(tasks);
  }

  private runSequential(tasks: Array<{ regressorId: string; inputData: number[] }>): ExecutionResult[] {
    return tasks.map(task => this.execute(task.regressorId, task.inputData));
  }

  private runParallel(tasks: Array<{ regressorId: string; inputData: number[] }>): ExecutionResult[] {
    const results: ExecutionResult[] = [];
    let pending: Array<{ regressorId: string; inputData: number[] }> = [...tasks];

    while (pending.length > 0) {
      const batch = pending.splice(0, this.config.maxConcurrency);
      const batchResults = batch.map(task => this.execute(task.regressorId, task.inputData));
      results.push(...batchResults);
    }

    return results;
  }

  getResults(taskId?: string): ExecutionResult | ExecutionResult[] | null {
    if (taskId) {
      return this.results.get(taskId) || null;
    }
    return Array.from(this.results.values());
  }

  getStats(): {
    totalTasks: number;
    successfulTasks: number;
    failedTasks: number;
    averageExecutionTime: number;
    successRate: number;
  } {
    const allResults = Array.from(this.results.values());
    const successfulTasks = allResults.filter(r => r.success).length;
    const failedTasks = allResults.filter(r => !r.success).length;
    const totalExecutionTime = allResults.reduce((acc, r) => acc + r.executionTime, 0);

    return {
      totalTasks: allResults.length,
      successfulTasks,
      failedTasks,
      averageExecutionTime: allResults.length > 0 ? totalExecutionTime / allResults.length : 0,
      successRate: allResults.length > 0 ? successfulTasks / allResults.length : 0,
    };
  }

  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (task && task.status === 'pending') {
      task.status = 'failed';
      task.error = 'Cancelled by user';
      return true;
    }
    return false;
  }

  clearResults(): void {
    this.results.clear();
  }

  getSnapshot(): { 
    totalTasks: number; 
    runningCount: number; 
    config: ExecutorConfig;
    stats: ReturnType<RegressorExecutor['getStats']>;
  } {
    return {
      totalTasks: this.results.size,
      runningCount: this.runningCount,
      config: this.config,
      stats: this.getStats(),
    };
  }

  reset(): void {
    this.tasks.clear();
    this.results.clear();
    this.runningCount = 0;
  }

  getReport(): string {
    const stats = this.getStats();
    const resultsList = Array.from(this.results.values())
      .slice(-10)
      .map(r => `  - Task ${r.taskId}: ${r.success ? 'SUCCESS' : 'FAILED'} (${r.executionTime}ms)${r.error ? ` - ${r.error}` : ''}`)
      .join('\n');

    return `=== RegressorExecutor Report ===
Config:
  Max Concurrency: ${this.config.maxConcurrency}
  Timeout: ${this.config.timeout}ms
  Enable Parallel: ${this.config.enableParallel}
  Retry On Failure: ${this.config.retryOnFailure}
  Max Retries: ${this.config.maxRetries}

Statistics:
  Total Tasks: ${stats.totalTasks}
  Successful: ${stats.successfulTasks}
  Failed: ${stats.failedTasks}
  Average Execution Time: ${stats.averageExecutionTime.toFixed(2)}ms
  Success Rate: ${(stats.successRate * 100).toFixed(2)}%

Recent Results:
${resultsList || '  No results yet'}
`;
  }

  exportMetrics(): { version: string; config: ExecutorConfig; stats: ReturnType<RegressorExecutor['getStats']> } {
    return {
      version: '1.4.3',
      config: this.config,
      stats: this.getStats(),
    };
  }

  private createErrorResult(taskId: string, regressorId: string, error: string): ExecutionResult {
    return {
      taskId,
      regressorId,
      results: [],
      executionTime: 0,
      success: false,
      error,
    };
  }
}