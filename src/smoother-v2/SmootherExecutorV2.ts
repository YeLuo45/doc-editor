/**
 * V144 SmootherExecutorV2 - Executes smoothing operations across multiple smoothers
 * Manages execution queues, parallel processing, and result aggregation
 */

import { SmootherV2 } from './SmootherV2';

export interface ExecutionTask {
  id: string;
  smootherName: string;
  data: number[];
  options?: { method?: string; factor?: number };
  priority?: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: ReturnType<SmootherV2['smooth']>;
  error?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface ExecutorStats {
  totalExecuted: number;
  totalSucceeded: number;
  totalFailed: number;
  averageExecutionTime: number;
  pendingTasks: number;
  runningTasks: number;
  completedTasks: number;
  lastExecutionTime: number;
}

export interface ExecutorSnapshot {
  metrics: ExecutorStats;
  timestamp: number;
}

export class SmootherExecutorV2 {
  config: { name: string; maxConcurrent?: number; defaultTimeout?: number };
  private tasks: Map<string, ExecutionTask>;
  private stats: ExecutorStats;
  private snapshot: ExecutorSnapshot | null;
  private taskQueue: string[];

  constructor(config?: { name?: string; maxConcurrent?: number; defaultTimeout?: number }) {
    this.config = {
      name: config?.name || 'smoother-executor-v2',
      maxConcurrent: config?.maxConcurrent || 10,
      defaultTimeout: config?.defaultTimeout || 5000,
    };
    this.tasks = new Map();
    this.stats = {
      totalExecuted: 0,
      totalSucceeded: 0,
      totalFailed: 0,
      averageExecutionTime: 0,
      pendingTasks: 0,
      runningTasks: 0,
      completedTasks: 0,
      lastExecutionTime: 0,
    };
    this.snapshot = null;
    this.taskQueue = [];
  }

  execute(smoother: SmootherV2, data: number[], options?: { method?: string; factor?: number }): ExecutionTask {
    const taskId = this.generateTaskId();
    const task: ExecutionTask = {
      id: taskId,
      smootherName: smoother.config.name,
      data,
      options,
      priority: 0,
      status: 'pending',
      createdAt: Date.now(),
    };

    this.tasks.set(taskId, task);
    this.stats.pendingTasks++;
    this.taskQueue.push(taskId);

    this.processNext();

    return task;
  }

  private generateTaskId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private processNext(): void {
    if (this.stats.runningTasks >= (this.config.maxConcurrent || 10)) {
      return;
    }

    const nextTaskId = this.taskQueue.shift();
    if (!nextTaskId) return;

    const task = this.tasks.get(nextTaskId);
    if (!task || task.status !== 'pending') return;

    this.run(task);
  }

  run(taskId: string, smoothers?: Map<string, SmootherV2>): ExecutionTask | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    if (task.status !== 'pending') {
      return task;
    }

    task.status = 'running';
    task.startedAt = Date.now();
    this.stats.pendingTasks--;
    this.stats.runningTasks++;

    try {
      let result: ReturnType<SmootherV2['smooth']>;

      if (smoothers) {
        const smoother = smoothers.get(task.smootherName);
        if (!smoother) {
          throw new Error(`Smoother not found: ${task.smootherName}`);
        }
        result = smoother.smooth(task.data, task.options);
      } else {
        result = { value: 0, confidence: 0, timestamp: Date.now(), method: 'noop' } as any;
      }

      task.status = 'completed';
      task.result = result;
      task.completedAt = Date.now();

      const executionTime = task.completedAt - task.startedAt!;
      this.updateAverageExecutionTime(executionTime);

      this.stats.totalExecuted++;
      this.stats.totalSucceeded++;
      this.stats.runningTasks--;
      this.stats.completedTasks++;
      this.stats.lastExecutionTime = executionTime;

      this.snapshot = {
        metrics: { ...this.stats },
        timestamp: Date.now(),
      };

      this.processNext();

      return task;
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : String(error);
      task.completedAt = Date.now();

      this.stats.totalExecuted++;
      this.stats.totalFailed++;
      this.stats.runningTasks--;

      this.processNext();

      return task;
    }
  }

  private updateAverageExecutionTime(newTime: number): void {
    const total = this.stats.totalSucceeded;
    if (total === 0) {
      this.stats.averageExecutionTime = newTime;
      return;
    }
    const currentAvg = this.stats.averageExecutionTime;
    this.stats.averageExecutionTime = (currentAvg * (total - 1) + newTime) / total;
  }

  getResults(taskId: string): ReturnType<SmootherV2['smooth']> | null {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'completed') return null;
    return task.result || null;
  }

  getTask(taskId: string): ExecutionTask | null {
    return this.tasks.get(taskId) || null;
  }

  getAllTasks(): ExecutionTask[] {
    return Array.from(this.tasks.values());
  }

  getStats(): ExecutorStats {
    return { ...this.stats };
  }

  getSnapshot(): { metrics: ExecutorStats } {
    return {
      metrics: this.snapshot?.metrics || { ...this.stats },
    };
  }

  reset(): void {
    this.tasks.clear();
    this.stats = {
      totalExecuted: 0,
      totalSucceeded: 0,
      totalFailed: 0,
      averageExecutionTime: 0,
      pendingTasks: 0,
      runningTasks: 0,
      completedTasks: 0,
      lastExecutionTime: 0,
    };
    this.snapshot = null;
    this.taskQueue = [];
  }

  getReport(): string {
    return [
      `SmootherExecutorV2 Report: ${this.config.name}`,
      `Max Concurrent: ${this.config.maxConcurrent}`,
      `Default Timeout: ${this.config.defaultTimeout}ms`,
      `Total Executed: ${this.stats.totalExecuted}`,
      `Succeeded: ${this.stats.totalSucceeded}`,
      `Failed: ${this.stats.totalFailed}`,
      `Pending: ${this.stats.pendingTasks}`,
      `Running: ${this.stats.runningTasks}`,
      `Completed: ${this.stats.completedTasks}`,
      `Average Execution Time: ${this.stats.averageExecutionTime.toFixed(2)}ms`,
      `Last Execution: ${this.stats.lastExecutionTime}ms`,
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return {
      version: '1.44.0',
    };
  }
}

export default SmootherExecutorV2;