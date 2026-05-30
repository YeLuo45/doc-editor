/**
 * V141 ExtrapolatorExecutor - Executes extrapolation tasks
 * Manages execution lifecycle and result aggregation
 */

import { Extrapolator, ExtrapolationResult } from './Extrapolator';

export type ExecutorConfig = {
  name: string;
  maxConcurrent: number;
  timeout: number;
  retryAttempts: number;
  enableParallel: boolean;
};

export interface ExecutionTask {
  id: string;
  extrapolator: Extrapolator;
  data: number[];
  steps: number;
  options?: { method?: string; confidence?: number };
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: ExtrapolationResult;
  error?: string;
  startTime?: number;
  endTime?: number;
}

export interface ExecutorStats {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  activeTasks: number;
  averageExecutionTime: number;
  lastExecutionTime: number;
}

export class ExtrapolatorExecutor {
  private config: ExecutorConfig;
  private tasks: Map<string, ExecutionTask>;
  private stats: ExecutorStats;
  private lastSnapshot: { metrics: ExecutorStats } | null;

  constructor(config: ExecutorConfig) {
    this.config = {
      name: config.name || 'default-executor',
      maxConcurrent: config.maxConcurrent || 5,
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      enableParallel: config.enableParallel ?? true,
    };
    this.tasks = new Map();
    this.stats = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      activeTasks: 0,
      averageExecutionTime: 0,
      lastExecutionTime: 0,
    };
    this.lastSnapshot = null;
  }

  get config(): ExecutorConfig {
    return { ...this.config };
  }

  execute(
    extrapolator: Extrapolator,
    data: number[],
    steps: number,
    options?: { method?: string; confidence?: number }
  ): ExtrapolationResult {
    const taskId = this.generateTaskId();
    const startTime = Date.now();

    const task: ExecutionTask = {
      id: taskId,
      extrapolator,
      data,
      steps,
      options,
      status: 'pending',
      startTime,
    };

    this.tasks.set(taskId, task);
    this.stats.totalTasks++;

    try {
      task.status = 'running';
      this.stats.activeTasks++;

      const result = extrapolator.extrapolate(data, steps, options);

      task.result = result;
      task.status = 'completed';
      task.endTime = Date.now();

      this.stats.completedTasks++;
      this.stats.activeTasks--;
      this.updateAverageExecutionTime(task.endTime - startTime);
      this.stats.lastExecutionTime = Date.now() - startTime;
      this.lastSnapshot = { metrics: { ...this.stats } };

      return result;
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Unknown error';
      task.endTime = Date.now();

      this.stats.failedTasks++;
      this.stats.activeTasks--;
      this.updateAverageExecutionTime(task.endTime - startTime);
      this.stats.lastExecutionTime = Date.now() - startTime;
      this.lastSnapshot = { metrics: { ...this.stats } };

      throw error;
    }
  }

  async run(
    extrapolator: Extrapolator,
    data: number[],
    steps: number,
    options?: { method?: string; confidence?: number }
  ): Promise<ExtrapolationResult> {
    return this.execute(extrapolator, data, steps, options);
  }

  getResults(taskId: string): ExtrapolationResult | undefined {
    const task = this.tasks.get(taskId);
    return task?.result;
  }

  getStats(): ExecutorStats {
    return { ...this.stats };
  }

  getSnapshot(): { metrics: ExecutorStats } {
    return {
      metrics: { ...this.stats },
    };
  }

  reset(): void {
    this.tasks.clear();
    this.stats = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      activeTasks: 0,
      averageExecutionTime: 0,
      lastExecutionTime: 0,
    };
    this.lastSnapshot = null;
  }

  getReport(): string {
    return [
      `ExtrapolatorExecutor Report: ${this.config.name}`,
      `Max Concurrent: ${this.config.maxConcurrent}`,
      `Timeout: ${this.config.timeout}ms`,
      `Retry Attempts: ${this.config.retryAttempts}`,
      `Parallel: ${this.config.enableParallel ? 'enabled' : 'disabled'}`,
      `Total Tasks: ${this.stats.totalTasks}`,
      `Completed: ${this.stats.completedTasks}`,
      `Failed: ${this.stats.failedTasks}`,
      `Active: ${this.stats.activeTasks}`,
      `Average Execution Time: ${this.stats.averageExecutionTime.toFixed(2)}ms`,
      `Last Execution Time: ${this.stats.lastExecutionTime}ms`,
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return {
      version: '1.0.0',
    };
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateAverageExecutionTime(newTime: number): void {
    const total = this.stats.completedTasks + this.stats.failedTasks;
    if (total === 0) {
      this.stats.averageExecutionTime = newTime;
      return;
    }
    const currentAvg = this.stats.averageExecutionTime;
    this.stats.averageExecutionTime = (currentAvg * (total - 1) + newTime) / total;
  }

  getTask(taskId: string): ExecutionTask | undefined {
    return this.tasks.get(taskId);
  }

  getAllTasks(): ExecutionTask[] {
    return Array.from(this.tasks.values());
  }

  clearCompletedTasks(): void {
    for (const [id, task] of this.tasks) {
      if (task.status === 'completed' || task.status === 'failed') {
        this.tasks.delete(id);
      }
    }
  }
}

export default ExtrapolatorExecutor;