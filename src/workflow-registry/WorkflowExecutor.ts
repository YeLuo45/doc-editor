/**
 * V95 Workflow Registry - WorkflowExecutor.ts
 * Workflow executor with execute/run/stop/getStatus/getStats
 */

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'stopped';

export type ExecutionContext = {
  workflowId: string;
  status: ExecutionStatus;
  startTime?: number;
  endTime?: number;
  result?: unknown;
  error?: string;
};

export type WorkflowExecutorConfig = {
  maxConcurrent?: number;
  defaultTimeout?: number;
  retryOnFailure?: boolean;
  maxRetries?: number;
};

interface ExecutorMetrics {
  totalExecuted: number;
  running: number;
  completed: number;
  failed: number;
  stopped: number;
  averageExecutionTime: number;
}

export class WorkflowExecutor {
  private executions: Map<string, ExecutionContext> = new Map();
  private executionTimes: number[] = [];
  
  readonly config: WorkflowExecutorConfig;

  constructor(config: WorkflowExecutorConfig = {}) {
    this.config = {
      maxConcurrent: config.maxConcurrent ?? 10,
      defaultTimeout: config.defaultTimeout ?? 30000,
      retryOnFailure: config.retryOnFailure ?? false,
      maxRetries: config.maxRetries ?? 3,
    };
  }

  execute(workflowId: string, input?: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const context: ExecutionContext = {
        workflowId,
        status: 'running',
        startTime: Date.now(),
      };

      this.executions.set(workflowId, context);

      setTimeout(() => {
        const exec = this.executions.get(workflowId);
        if (exec?.status === 'running') {
          exec.status = 'completed';
          exec.endTime = Date.now();
          exec.result = { workflowId, input, output: 'completed' };
          this.executionTimes.push(exec.endTime - (exec.startTime ?? 0));
          resolve(exec.result);
        }
      }, 100);
    });
  }

  run(workflowId: string, input?: unknown): Promise<unknown> {
    return this.execute(workflowId, input);
  }

  stop(workflowId: string): boolean {
    const context = this.executions.get(workflowId);
    if (context && context.status === 'running') {
      context.status = 'stopped';
      context.endTime = Date.now();
      return true;
    }
    return false;
  }

  getStatus(workflowId: string): ExecutionStatus | undefined {
    return this.executions.get(workflowId)?.status;
  }

  getStats(): ExecutorMetrics {
    const contexts = Array.from(this.executions.values());
    const totalTime = this.executionTimes.reduce((a, b) => a + b, 0);

    return {
      totalExecuted: contexts.length,
      running: contexts.filter(c => c.status === 'running').length,
      completed: contexts.filter(c => c.status === 'completed').length,
      failed: contexts.filter(c => c.status === 'failed').length,
      stopped: contexts.filter(c => c.status === 'stopped').length,
      averageExecutionTime: this.executionTimes.length > 0 
        ? totalTime / this.executionTimes.length 
        : 0,
    };
  }

  getSnapshot(): { metrics: ExecutorMetrics } {
    return { metrics: this.getStats() };
  }

  reset(): void {
    this.executions.clear();
    this.executionTimes = [];
  }

  getReport(): string {
    const stats = this.getStats();
    return [
      '=== Workflow Executor Report ===',
      `Total Executed: ${stats.totalExecuted}`,
      `Running: ${stats.running}`,
      `Completed: ${stats.completed}`,
      `Failed: ${stats.failed}`,
      `Stopped: ${stats.stopped}`,
      `Avg Execution Time: ${stats.averageExecutionTime.toFixed(2)}ms`,
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return { version: '1.0.0' };
  }
}