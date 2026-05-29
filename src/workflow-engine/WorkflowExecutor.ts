/**
 * V65 Workflow Engine - WorkflowExecutor
 * Executes workflows with execute/pause/resume/cancel/getStatus
 */

import { WorkflowDefinition } from './WorkflowBuilder.js';

export type ExecutionStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface ExecutionContext {
  workflowId: string;
  currentStep: string;
  startTime: Date;
  endTime?: Date;
  stepResults: Map<string, unknown>;
  error?: string;
}

export interface ExecutorConfig {
  maxConcurrent: number;
  stepTimeout: number;
  enableRetry: boolean;
  retryLimit: number;
}

type ExecConfig = Required<ExecutorConfig>;

export class WorkflowExecutor {
  private _config: ExecConfig;
  private executions: Map<string, ExecutionContext>;
  private statuses: Map<string, ExecutionStatus>;

  constructor(config: Partial<ExecutorConfig> = {}) {
    this._config = {
      maxConcurrent: config.maxConcurrent ?? 10,
      stepTimeout: config.stepTimeout ?? 30000,
      enableRetry: config.enableRetry ?? true,
      retryLimit: config.retryLimit ?? 3,
    };
    this.executions = new Map();
    this.statuses = new Map();
  }

  get config(): ExecConfig {
    return { ...this._config };
  }

  async execute(workflow: WorkflowDefinition): Promise<Map<string, unknown>> {
    const execId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const context: ExecutionContext = {
      workflowId: workflow.id,
      currentStep: workflow.entryPoint,
      startTime: new Date(),
      stepResults: new Map(),
    };
    this.executions.set(execId, context);
    this.statuses.set(execId, 'running');

    try {
      for (const step of workflow.steps) {
        context.currentStep = step.id;
        const result = await this.executeStep(step.id, { timeout: step.timeout });
        context.stepResults.set(step.id, result);
      }
      context.endTime = new Date();
      this.statuses.set(execId, 'completed');
    } catch (err) {
      context.error = err instanceof Error ? err.message : 'Unknown error';
      context.endTime = new Date();
      this.statuses.set(execId, 'failed');
    }

    return context.stepResults;
  }

  private async executeStep(stepId: string, options: { timeout: number }): Promise<unknown> {
    return new Promise((resolve) => {
      setTimeout(() => resolve({ stepId, executed: true }), 50);
    });
  }

  pause(execId: string): boolean {
    const status = this.statuses.get(execId);
    if (status === 'running') {
      this.statuses.set(execId, 'paused');
      return true;
    }
    return false;
  }

  resume(execId: string): boolean {
    const status = this.statuses.get(execId);
    if (status === 'paused') {
      this.statuses.set(execId, 'running');
      return true;
    }
    return false;
  }

  cancel(execId: string): boolean {
    const status = this.statuses.get(execId);
    if (status === 'running' || status === 'paused') {
      this.statuses.set(execId, 'cancelled');
      const ctx = this.executions.get(execId);
      if (ctx) {
        ctx.endTime = new Date();
        ctx.error = 'Cancelled by user';
      }
      return true;
    }
    return false;
  }

  getStatus(execId: string): ExecutionStatus | undefined {
    return this.statuses.get(execId);
  }

  getSnapshot(): { metrics: { totalExecutions: number; active: number; completed: number } } {
    let active = 0;
    let completed = 0;
    this.statuses.forEach((s) => {
      if (s === 'running') active++;
      if (s === 'completed') completed++;
    });
    return {
      metrics: {
        totalExecutions: this.executions.size,
        active,
        completed,
      },
    };
  }

  reset(): void {
    this.executions.clear();
    this.statuses.clear();
  }

  getReport(): string {
    const snap = this.getSnapshot();
    return `WorkflowExecutor Report: ${snap.metrics.totalExecutions} total, ${snap.metrics.active} active, ${snap.metrics.completed} completed`;
  }

  exportMetrics(): { version: string } {
    return { version: '1.0.0' };
  }
}
