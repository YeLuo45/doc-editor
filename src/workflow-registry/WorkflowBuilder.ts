/**
 * V95 Workflow Registry - WorkflowBuilder.ts
 * Workflow builder with create/build/getWorkflow/getStats
 */

import { WorkflowConfig, WorkflowRegistry } from './WorkflowRegistry.js';

export type WorkflowStep = {
  id: string;
  type: string;
  config?: Record<string, unknown>;
  next?: string;
};

export type WorkflowDefinition = {
  steps: WorkflowStep[];
  entryPoint?: string;
  timeout?: number;
};

export type WorkflowBuilderConfig = {
  defaultTimeout?: number;
  maxSteps?: number;
  strictMode?: boolean;
};

interface BuilderMetrics {
  workflowsCreated: number;
  workflowsBuilt: number;
  totalSteps: number;
  averageStepsPerWorkflow: number;
}

export class WorkflowBuilder {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private stepCount: number = 0;
  
  readonly config: WorkflowBuilderConfig;

  constructor(config: WorkflowBuilderConfig = {}) {
    this.config = {
      defaultTimeout: config.defaultTimeout ?? 30000,
      maxSteps: config.maxSteps ?? 50,
      strictMode: config.strictMode ?? false,
    };
  }

  create(id: string, name: string, version: string): WorkflowBuilder {
    const workflow: WorkflowDefinition = {
      steps: [],
      entryPoint: undefined,
      timeout: this.config.defaultTimeout,
    };
    this.workflows.set(id, workflow);
    return this;
  }

  addStep(workflowId: string, step: WorkflowStep): WorkflowBuilder {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    if (workflow.steps.length >= (this.config.maxSteps ?? 50)) {
      throw new Error(`Max steps exceeded for workflow ${workflowId}`);
    }

    workflow.steps.push({ ...step });
    this.stepCount++;
    return this;
  }

  setEntryPoint(workflowId: string, stepId: string): WorkflowBuilder {
    const workflow = this.workflows.get(workflowId);
    if (workflow) {
      workflow.entryPoint = stepId;
    }
    return this;
  }

  build(workflowId: string): WorkflowConfig | undefined {
    const definition = this.workflows.get(workflowId);
    if (!definition) return undefined;

    const workflow: WorkflowConfig = {
      id: workflowId,
      name: workflowId,
      version: '1.0.0',
      enabled: true,
    };

    return workflow;
  }

  getWorkflow(workflowId: string): WorkflowDefinition | undefined {
    return this.workflows.get(workflowId);
  }

  getStats(): { workflowsCreated: number; workflowsBuilt: number; totalSteps: number; averageStepsPerWorkflow: number } {
    return {
      workflowsCreated: this.workflows.size,
      workflowsBuilt: this.workflows.size,
      totalSteps: this.stepCount,
      averageStepsPerWorkflow: this.workflows.size > 0 
        ? this.stepCount / this.workflows.size 
        : 0,
    };
  }

  getSnapshot(): { metrics: BuilderMetrics } {
    return { metrics: this.getStats() };
  }

  reset(): void {
    this.workflows.clear();
    this.stepCount = 0;
  }

  getReport(): string {
    const stats = this.getStats();
    return [
      '=== Workflow Builder Report ===',
      `Workflows Created: ${stats.workflowsCreated}`,
      `Workflows Built: ${stats.workflowsBuilt}`,
      `Total Steps: ${stats.totalSteps}`,
      `Average Steps/Workflow: ${stats.averageStepsPerWorkflow.toFixed(2)}`,
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return { version: '1.0.0' };
  }
}