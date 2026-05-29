/**
 * Orchestrator - Core orchestration module for V39 Iteration 9
 * Coordinates task execution across scheduler, executor, and reporter
 */

export interface OrchestratorConfig {
  maxConcurrency: number;
  retryAttempts: number;
  timeout: number;
}

export interface OrchestratorState {
  status: 'idle' | 'running' | 'paused' | 'error';
  activeTasks: Map<string, TaskContext>;
  completedTasks: number;
  failedTasks: number;
  lastError: string | null;
}

export interface TaskContext {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
  result?: unknown;
  error?: string;
}

export interface OrchestratorMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageDuration: number;
  successRate: number;
  uptime: number;
}

export class Orchestrator {
  private config: OrchestratorConfig;
  private state: OrchestratorState;
  private startTime: number;
  private history: TaskContext[];

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.config = {
      maxConcurrency: config.maxConcurrency ?? 5,
      retryAttempts: config.retryAttempts ?? 3,
      timeout: config.timeout ?? 30000,
    };
    this.state = {
      status: 'idle',
      activeTasks: new Map(),
      completedTasks: 0,
      failedTasks: 0,
      lastError: null,
    };
    this.startTime = Date.now();
    this.history = [];
  }

  /**
   * Orchestrate a task through the entire lifecycle
   */
  async orchestrate(taskId: string, taskName: string, taskFn: () => Promise<unknown>): Promise<unknown> {
    this.updateStatus('running');
    const context: TaskContext = {
      id: taskId,
      name: taskName,
      status: 'pending',
      startTime: Date.now(),
    };

    this.state.activeTasks.set(taskId, context);

    try {
      context.status = 'running';
      const result = await this.executeWithRetry(taskFn, this.config.retryAttempts);
      context.status = 'completed';
      context.result = result;
      context.endTime = Date.now();
      this.state.completedTasks++;
      this.history.push(context);
      this.state.activeTasks.delete(taskId);
      return result;
    } catch (error) {
      context.status = 'failed';
      context.error = error instanceof Error ? error.message : String(error);
      context.endTime = Date.now();
      this.state.failedTasks++;
      this.history.push(context);
      this.state.activeTasks.delete(taskId);
      this.state.lastError = context.error;
      throw error;
    }
  }

  /**
   * Coordinate multiple tasks in parallel or sequence
   */
  async coordinate(tasks: Array<{ id: string; name: string; fn: () => Promise<unknown> }>): Promise<unknown[]> {
    const results: unknown[] = [];
    const executing: Promise<unknown>[] = [];

    for (const task of tasks) {
      if (executing.length >= this.config.maxConcurrency) {
        await Promise.race(executing);
      }

      const promise = this.orchestrate(task.id, task.name, task.fn)
        .then((result) => {
          results.push(result);
          return result;
        })
        .catch((error) => {
          results.push({ error: error.message });
          return { error: error.message };
        });

      executing.push(promise);
    }

    await Promise.all(executing);
    return results;
  }

  /**
   * Get current orchestrator status
   */
  getStatus(): OrchestratorState {
    return { ...this.state };
  }

  /**
   * Get snapshot of current state
   */
  getSnapshot(): OrchestratorState & { metrics: OrchestratorMetrics } {
    return {
      ...this.getStatus(),
      metrics: this.exportMetrics(),
    };
  }

  /**
   * Reset orchestrator to initial state
   */
  reset(): void {
    this.state = {
      status: 'idle',
      activeTasks: new Map(),
      completedTasks: 0,
      failedTasks: 0,
      lastError: null,
    };
    this.history = [];
    this.startTime = Date.now();
  }

  /**
   * Get formatted report
   */
  getReport(): string {
    const metrics = this.exportMetrics();
    return [
      '=== Orchestrator Report ===',
      `Status: ${this.state.status}`,
      `Active Tasks: ${this.state.activeTasks.size}`,
      `Completed: ${this.state.completedTasks}`,
      `Failed: ${this.state.failedTasks}`,
      `Success Rate: ${(metrics.successRate * 100).toFixed(2)}%`,
      `Avg Duration: ${metrics.averageDuration.toFixed(2)}ms`,
      `Uptime: ${((Date.now() - this.startTime) / 1000).toFixed(2)}s`,
      `Last Error: ${this.state.lastError ?? 'None'}`,
    ].join('\n');
  }

  /**
   * Export metrics object
   */
  exportMetrics(): OrchestratorMetrics {
    const totalTasks = this.state.completedTasks + this.state.failedTasks;
    const durations = this.history
      .filter((h) => h.endTime)
      .map((h) => (h.endTime as number) - h.startTime);

    return {
      totalTasks,
      completedTasks: this.state.completedTasks,
      failedTasks: this.state.failedTasks,
      averageDuration: durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0,
      successRate: totalTasks > 0 ? this.state.completedTasks / totalTasks : 0,
      uptime: Date.now() - this.startTime,
    };
  }

  private async executeWithRetry(fn: () => Promise<unknown>, attempts: number): Promise<unknown> {
    let lastError: Error | null = null;

    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    throw lastError;
  }

  private updateStatus(status: OrchestratorState['status']): void {
    this.state.status = status;
  }
}

export default Orchestrator;