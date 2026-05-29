/**
 * V65 Workflow Engine - WorkflowBuilder
 * Builds workflows with create/addStep/compile/getWorkflow
 */

export type StepType = 'task' | 'condition' | 'parallel' | 'loop';
export type StepStatus = 'pending' | 'active' | 'completed' | 'failed';

export interface WorkflowStep {
  id: string;
  name: string;
  type: StepType;
  status: StepStatus;
  config: Record<string, unknown>;
  dependsOn: string[];
  retryCount: number;
  timeout: number;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  version: string;
  steps: WorkflowStep[];
  entryPoint: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowBuilderConfig {
  maxSteps: number;
  defaultTimeout: number;
  enableValidation: boolean;
  autoCompile: boolean;
}

type BuilderConfig = Required<WorkflowBuilderConfig>;

export class WorkflowBuilder {
  private _config: BuilderConfig;
  private workflows: Map<string, WorkflowDefinition>;
  private currentWorkflow: WorkflowDefinition | null;

  constructor(config: Partial<WorkflowBuilderConfig> = {}) {
    this._config = {
      maxSteps: config.maxSteps ?? 100,
      defaultTimeout: config.defaultTimeout ?? 30000,
      enableValidation: config.enableValidation ?? true,
      autoCompile: config.autoCompile ?? false,
    };
    this.workflows = new Map();
    this.currentWorkflow = null;
  }

  get config(): BuilderConfig {
    return { ...this._config };
  }

  create(name: string, id?: string): WorkflowBuilder {
    const workflowId = id ?? `wf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    const workflow: WorkflowDefinition = {
      id: workflowId,
      name,
      version: '1.0.0',
      steps: [],
      entryPoint: '',
      createdAt: now,
      updatedAt: now,
    };
    this.workflows.set(workflowId, workflow);
    this.currentWorkflow = workflow;
    return this;
  }

  addStep(
    name: string,
    type: StepType,
    config: Record<string, unknown> = {},
    dependsOn: string[] = []
  ): WorkflowBuilder {
    if (!this.currentWorkflow) {
      throw new Error('No active workflow. Call create() first.');
    }
    if (this.currentWorkflow.steps.length >= this._config.maxSteps) {
      throw new Error(`Maximum steps (${this._config.maxSteps}) reached`);
    }

    const stepId = `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const step: WorkflowStep = {
      id: stepId,
      name,
      type,
      status: 'pending',
      config,
      dependsOn,
      retryCount: 0,
      timeout: this._config.defaultTimeout,
    };

    if (!this.currentWorkflow.entryPoint) {
      this.currentWorkflow.entryPoint = stepId;
    }
    this.currentWorkflow.steps.push(step);
    this.currentWorkflow.updatedAt = new Date();
    return this;
  }

  compile(): WorkflowDefinition {
    if (!this.currentWorkflow) {
      throw new Error('No active workflow to compile');
    }
    if (this._config.enableValidation) {
      this.validateWorkflow(this.currentWorkflow);
    }
    const compiled = { ...this.currentWorkflow, version: '1.0.0-compiled' };
    this.currentWorkflow = null;
    return compiled;
  }

  getWorkflow(id: string): WorkflowDefinition | undefined {
    return this.workflows.get(id);
  }

  private validateWorkflow(workflow: WorkflowDefinition): void {
    if (workflow.steps.length === 0) {
      throw new Error('Workflow must have at least one step');
    }
    if (!workflow.entryPoint) {
      throw new Error('Workflow must have an entry point');
    }
    const stepIds = new Set(workflow.steps.map((s) => s.id));
    for (const step of workflow.steps) {
      for (const dep of step.dependsOn) {
        if (!stepIds.has(dep)) {
          throw new Error(`Step ${step.id} depends on unknown step ${dep}`);
        }
      }
    }
  }

  getSnapshot(): { metrics: { totalWorkflows: number; totalSteps: number } } {
    let totalSteps = 0;
    this.workflows.forEach((w) => (totalSteps += w.steps.length));
    return {
      metrics: {
        totalWorkflows: this.workflows.size,
        totalSteps,
      },
    };
  }

  reset(): void {
    this.workflows.clear();
    this.currentWorkflow = null;
  }

  getReport(): string {
    const snap = this.getSnapshot();
    return `WorkflowBuilder Report: ${snap.metrics.totalWorkflows} workflows, ${snap.metrics.totalSteps} total steps`;
  }

  exportMetrics(): { version: string } {
    return { version: '1.0.0' };
  }
}
