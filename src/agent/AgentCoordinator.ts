/**
 * AgentCoordinator.ts - Orchestrates the Agent Pipeline
 * Coordinates Designer -> Coder -> Reviewer workflow
 */

import { AgentTask, TaskType, createTask } from './AgentTask';
import { AgentResult, mergeResults } from './AgentResult';
import { AgentRegistry, BaseAgent } from './AgentRegistry';
import { AgentDesigner } from './AgentDesigner';
import { AgentCoder } from './AgentCoder';
import { AgentReviewer } from './AgentReviewer';

export interface PipelineConfig {
  includeDesigner: boolean;
  includeCoder: boolean;
  includeReviewer: boolean;
  stopOnError: boolean;
}

export interface TaskHistoryEntry {
  task: AgentTask;
  result: AgentResult;
  timestamp: Date;
}

export class AgentCoordinator {
  readonly id: string = 'coordinator-001';
  readonly name: string = 'PipelineCoordinator';

  private registry: AgentRegistry;
  private history: TaskHistoryEntry[] = [];
  private config: PipelineConfig;

  constructor(registry?: AgentRegistry) {
    this.registry = registry || new AgentRegistry();
    this.config = {
      includeDesigner: true,
      includeCoder: true,
      includeReviewer: true,
      stopOnError: true,
    };
    this.registerDefaultAgents();
  }

  private registerDefaultAgents(): void {
    const designer = new AgentDesigner();
    const coder = new AgentCoder();
    const reviewer = new AgentReviewer();

    this.registry.register(designer);
    this.registry.register(coder);
    this.registry.register(reviewer);
  }

  getRegistry(): AgentRegistry {
    return this.registry;
  }

  setConfig(config: Partial<PipelineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getHistory(): TaskHistoryEntry[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }

  async runPipeline(initialTask: AgentTask): Promise<AgentResult[]> {
    const results: AgentResult[] = [];
    let currentTask = initialTask;

    if (this.config.includeDesigner && currentTask.type === 'design') {
      const designerResult = await this.executeStep(currentTask, 'design');
      results.push(designerResult);

      if (this.config.stopOnError && designerResult.status === 'failure') {
        return results;
      }

      const designOutput = designerResult.output as Record<string, unknown>;
      const implTask = createTask({
        type: 'implement',
        payload: {
          specification: designOutput.specification as string || JSON.stringify(designOutput),
          context: { designOutput },
        },
      });
      currentTask = implTask;
    }

    if (this.config.includeCoder && currentTask.type === 'implement') {
      const coderResult = await this.executeStep(currentTask, 'implement');
      results.push(coderResult);

      if (this.config.stopOnError && coderResult.status === 'failure') {
        return results;
      }

      const codeOutput = coderResult.output as Record<string, unknown>;
      const reviewTask = createTask({
        type: 'review',
        payload: {
          sourceCode: codeOutput.code as string,
          context: { codeOutput },
        },
      });
      currentTask = reviewTask;
    }

    if (this.config.includeReviewer && currentTask.type === 'review') {
      const reviewerResult = await this.executeStep(currentTask, 'review');
      results.push(reviewerResult);
    }

    return results;
  }

  private async executeStep(task: AgentTask, expectedType: TaskType): Promise<AgentResult> {
    const taskType: TaskType = task.type;

    const agents = this.registry.getAgentsByType(taskType);
    if (agents.length === 0) {
      throw new Error(`No agent found for task type: ${taskType}`);
    }

    const agent = agents[0];
    const result = await agent.process(task);

    this.history.push({
      task,
      result,
      timestamp: new Date(),
    });

    return result;
  }

  async runParallel(tasks: AgentTask[]): Promise<AgentResult[]> {
    const promises = tasks.map((task) => this.executeTask(task));
    const results = await Promise.all(promises);
    return results;
  }

  private async executeTask(task: AgentTask): Promise<AgentResult> {
    const agent = this.registry.findAgentForTask(task);
    if (!agent) {
      return {
        taskId: task.id,
        status: 'failure',
        output: null,
        error: `No agent found for task type: ${task.type}`,
        metrics: { durationMs: 0 },
        artifacts: [],
        agentId: 'unknown',
        agentName: 'Unknown',
        completedAt: new Date(),
      };
    }
    return agent.process(task);
  }

  async runCustomPipeline(
    tasks: AgentTask[],
    options?: { stopOnError?: boolean }
  ): Promise<AgentResult[]> {
    const results: AgentResult[] = [];

    for (const task of tasks) {
      const result = await this.executeTask(task);
      results.push(result);

      if (options?.stopOnError && result.status === 'failure') {
        break;
      }
    }

    return results;
  }

  getStats(): {
    totalTasks: number;
    successfulTasks: number;
    failedTasks: number;
    averageDurationMs: number;
  } {
    const totalTasks = this.history.length;
    const successfulTasks = this.history.filter((h) => h.result.status === 'success').length;
    const failedTasks = this.history.filter((h) => h.result.status === 'failure').length;
    const totalDuration = this.history.reduce((sum, h) => sum + h.result.metrics.durationMs, 0);

    return {
      totalTasks,
      successfulTasks,
      failedTasks,
      averageDurationMs: totalTasks > 0 ? totalDuration / totalTasks : 0,
    };
  }
}