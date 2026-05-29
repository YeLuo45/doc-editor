/**
 * Executor - Task execution module for V39 Iteration 9
 * Manages task execution, aborting, and result retrieval
 */

export interface ExecutionContext {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'aborted' | 'failed';
  startTime: number;
  endTime?: number;
  result?: unknown;
  error?: string;
  abortSignal?: AbortSignal;
}

export interface ExecutorConfig {
  maxConcurrent: number;
  defaultTimeout: number;
  enableAbort: boolean;
}

export interface ExecutorState {
  runningTasks: Map<string, ExecutionContext>;
  completedTasks: ExecutionContext[];
  abortedTasks: number;
  failedTasks: number;
}

export interface ExecutorMetrics {
  totalExecuted: number;
  running: number;
  completed: number;
  aborted: number;
  failed: number;
  averageDuration: number;
  successRate: number;
  uptime: number;
}

export class Executor {
  private config: ExecutorConfig;
  private state: ExecutorState;
  private startTime: number;

  constructor(config: Partial<ExecutorConfig> = {}) {
    this.config = {
      maxConcurrent: config.maxConcurrent ?? 10,
      defaultTimeout: config.defaultTimeout ?? 30000,
      enableAbort: config.enableAbort ?? true,
    };
    this.state = {
      runningTasks: new Map(),
      completedTasks: [],
      abortedTasks: 0,
      failedTasks: 0,
    };
    this.startTime = Date.now();
  }

  /**
   * Execute a task with optional abort support
   */
  async execute(
    taskId: string,
    taskName: string,
    taskFn: (signal: AbortSignal) => Promise<unknown>,
    options: { timeout?: number; abortSignal?: AbortSignal } = {}
  ): Promise<unknown> {
    const timeout = options.timeout ?? this.config.defaultTimeout;
    const context: ExecutionContext = {
      id: taskId,
      name: taskName,
      status: 'pending',
      startTime: Date.now(),
      abortSignal: options.abortSignal,
    };

    this.state.runningTasks.set(taskId, context);

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.abort(taskId);
        reject(new Error(`Task ${taskId} timed out after ${timeout}ms`));
      }, timeout);

      context.status = 'running';

      const abortHandler = () => {
        clearTimeout(timeoutId);
        this.abort(taskId);
        reject(new Error(`Task ${taskId} aborted`));
      };

      if (options.abortSignal) {
        options.abortSignal.addEventListener('abort', abortHandler);
      }

      taskFn(options.abortSignal ? options.abortSignal : new AbortController().signal)
        .then((result) => {
          clearTimeout(timeoutId);
          if (options.abortSignal) {
            options.abortSignal.removeEventListener('abort', abortHandler);
          }

          context.status = 'completed';
          context.result = result;
          context.endTime = Date.now();
          this.state.completedTasks.push(context);
          this.state.runningTasks.delete(taskId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          if (options.abortSignal) {
            options.abortSignal.removeEventListener('abort', abortHandler);
          }

          if (context.status === 'aborted') {
            return;
          }

          context.status = 'failed';
          context.error = error instanceof Error ? error.message : String(error);
          context.endTime = Date.now();
          this.state.failedTasks++;
          this.state.completedTasks.push(context);
          this.state.runningTasks.delete(taskId);
          reject(error);
        });
    });
  }

  /**
   * Abort a running task
   */
  abort(taskId: string): boolean {
    const context = this.state.runningTasks.get(taskId);
    if (!context) {
      return false;
    }

    context.status = 'aborted';
    context.endTime = Date.now();
    this.state.abortedTasks++;
    this.state.runningTasks.delete(taskId);

    if (context.abortSignal) {
      // Signal abort would be handled by the task
    }

    return true;
  }

  /**
   * Get results from all completed tasks
   */
  getResults(): ExecutionContext[] {
    return [...this.state.completedTasks];
  }

  /**
   * Get results for a specific task
   */
  getTaskResult(taskId: string): ExecutionContext | undefined {
    return this.state.completedTasks.find((ctx) => ctx.id === taskId);
  }

  /**
   * Get snapshot of executor state
   */
  getSnapshot(): ExecutorState & { metrics: ExecutorMetrics } {
    return {
      ...this.state,
      metrics: this.exportMetrics(),
    };
  }

  /**
   * Reset executor to initial state
   */
  reset(): void {
    this.state = {
      runningTasks: new Map(),
      completedTasks: [],
      abortedTasks: 0,
      failedTasks: 0,
    };
    this.startTime = Date.now();
  }

  /**
   * Get formatted report
   */
  getReport(): string {
    const metrics = this.exportMetrics();
    const runningIds = Array.from(this.state.runningTasks.keys());
    return [
      '=== Executor Report ===',
      `Running Tasks: ${this.state.runningTasks.size}`,
      `Completed: ${this.state.completedTasks.length}`,
      `Aborted: ${this.state.abortedTasks}`,
      `Failed: ${this.state.failedTasks}`,
      `Success Rate: ${(metrics.successRate * 100).toFixed(2)}%`,
      `Avg Duration: ${metrics.averageDuration.toFixed(2)}ms`,
      `Running IDs: ${runningIds.length > 0 ? runningIds.join(', ') : 'None'}`,
    ].join('\n');
  }

  /**
   * Export executor metrics
   */
  exportMetrics(): ExecutorMetrics {
    const total = this.state.completedTasks.length + this.state.abortedTasks + this.state.failedTasks;
    const completed = this.state.completedTasks.length;

    const durations = this.state.completedTasks
      .filter((ctx) => ctx.endTime)
      .map((ctx) => (ctx.endTime as number) - ctx.startTime);

    return {
      totalExecuted: total,
      running: this.state.runningTasks.size,
      completed,
      aborted: this.state.abortedTasks,
      failed: this.state.failedTasks,
      averageDuration: durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0,
      successRate: total > 0 ? completed / total : 0,
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Check if a task is currently running
   */
  isRunning(taskId: string): boolean {
    const context = this.state.runningTasks.get(taskId);
    return context?.status === 'running';
  }

  /**
   * Get count of running tasks
   */
  getRunningCount(): number {
    return this.state.runningTasks.size;
  }

  /**
   * Abort all running tasks
   */
  abortAll(): number {
    let count = 0;
    for (const [taskId] of this.state.runningTasks) {
      if (this.abort(taskId)) {
        count++;
      }
    }
    return count;
  }
}

export default Executor;