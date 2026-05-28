// ============================================================
// PipelineOrchestrator - Orchestrates Designer/Coder/Reviewer/Publisher agents
// ============================================================

import type { AgentId, AgentMessage } from '../agents/types.js';

export type PipelineAgentRole = 'designer' | 'coder' | 'reviewer' | 'publisher';
export type AgentStatus = 'idle' | 'working' | 'completed' | 'failed';

export interface PipelineAgent {
  id: AgentId;
  role: PipelineAgentRole;
  name: string;
  status: AgentStatus;
  currentTask?: string;
  result?: unknown;
  error?: string;
  createdAt: number;
  lastActive: number;
}

export interface TaskDefinition {
  id: string;
  type: 'design' | 'code' | 'review' | 'publish';
  input: unknown;
  requirements?: string;
  priority?: number;
  parallelGroup?: string;
}

export interface TaskResult {
  taskId: string;
  success: boolean;
  output: unknown;
  agentId: AgentId;
  duration: number;
  error?: string;
}

export interface OrchestratorConfig {
  maxConcurrentAgents: number;
  taskTimeout: number;
  enableParallelExecution: boolean;
  retryOnFailure: boolean;
  maxRetries: number;
}

interface MessageHandler {
  (message: AgentMessage): Promise<void>;
}

export class PipelineOrchestrator {
  private agents: Map<AgentId, PipelineAgent> = new Map();
  private tasks: Map<string, TaskDefinition> = new Map();
  private results: Map<string, TaskResult> = new Map();
  private config: OrchestratorConfig;
  private messageHandlers: Map<string, MessageHandler> = new Map();
  private eventListeners: Map<string, Array<(data: unknown) => void>> = new Map();

  constructor(config?: Partial<OrchestratorConfig>) {
    this.config = {
      maxConcurrentAgents: config?.maxConcurrentAgents ?? 4,
      taskTimeout: config?.taskTimeout ?? 300000,
      enableParallelExecution: config?.enableParallelExecution ?? true,
      retryOnFailure: config?.retryOnFailure ?? true,
      maxRetries: config?.maxRetries ?? 3,
    };
  }

  registerAgent(role: PipelineAgentRole, name?: string): PipelineAgent {
    const id = `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const agent: PipelineAgent = {
      id,
      role,
      name: name ?? `${role}-agent`,
      status: 'idle',
      createdAt: Date.now(),
      lastActive: Date.now(),
    };

    this.agents.set(id, agent);
    this.emit('agent_registered', { agent });

    return agent;
  }

  getAgent(id: AgentId): PipelineAgent | undefined {
    return this.agents.get(id);
  }

  getAgentsByRole(role: PipelineAgentRole): PipelineAgent[] {
    return Array.from(this.agents.values()).filter(a => a.role === role);
  }

  getAllAgents(): PipelineAgent[] {
    return Array.from(this.agents.values());
  }

  updateAgentStatus(id: AgentId, status: AgentStatus, task?: string): void {
    const agent = this.agents.get(id);
    if (agent) {
      agent.status = status;
      agent.lastActive = Date.now();
      if (task) agent.currentTask = task;
      this.emit('agent_status_changed', { agentId: id, status, task });
    }
  }

  submitTask(task: TaskDefinition): void {
    this.tasks.set(task.id, task);
    this.emit('task_submitted', { task });
  }

  getTask(id: string): TaskDefinition | undefined {
    return this.tasks.get(id);
  }

  getPendingTasks(): TaskDefinition[] {
    return Array.from(this.tasks.values()).filter(t => !this.results.has(t.id));
  }

  getTaskResult(id: string): TaskResult | undefined {
    return this.results.get(id);
  }

  async executeTasks(taskIds: string[]): Promise<TaskResult[]> {
    const tasks = taskIds.map(id => this.tasks.get(id));
    const results: TaskResult[] = [];

    for (let i = 0; i < taskIds.length; i++) {
      if (!tasks[i]) {
        const availableAgent = Array.from(this.agents.values()).find(a => a.status === 'idle');
        results.push({
          taskId: taskIds[i],
          success: false,
          output: undefined,
          error: availableAgent ? `No available agent for task type` : 'No available agent',
        });
      } else {
        const groups = this.groupTasksByParallelism([tasks[i]!]);
        for (const group of groups) {
          if (group.parallel && this.config.enableParallelExecution) {
            const groupResults = await Promise.all(
              group.tasks.map(t => this.executeSingleTask(t))
            );
            results.push(...groupResults);
          } else {
            for (const task of group.tasks) {
              results.push(await this.executeSingleTask(task));
            }
          }
        }
      }
    }

    return results;
  }

  private groupTasksByParallelism(tasks: TaskDefinition[]): { parallel: boolean; tasks: TaskDefinition[] }[] {
    const groups: Map<string, TaskDefinition[]> = new Map();
    const noGroup: TaskDefinition[] = [];

    for (const task of tasks) {
      if (task.parallelGroup) {
        const existing = groups.get(task.parallelGroup) || [];
        existing.push(task);
        groups.set(task.parallelGroup, existing);
      } else {
        noGroup.push(task);
      }
    }

    const result: { parallel: boolean; tasks: TaskDefinition[] }[] = [];

    for (const [, groupTasks] of groups) {
      result.push({ parallel: true, tasks: groupTasks });
    }

    if (noGroup.length > 0) {
      result.push({ parallel: false, tasks: noGroup });
    }

    return result;
  }

  private async executeSingleTask(task: TaskDefinition): Promise<TaskResult> {
    const startTime = Date.now();
    const agent = this.findAvailableAgent(task.type);

    if (!agent) {
      return {
        taskId: task.id,
        success: false,
        output: null,
        agentId: 'no-agent' as AgentId,
        duration: Date.now() - startTime,
        error: `No available agent for task type: ${task.type}`,
      };
    }

    this.updateAgentStatus(agent.id, 'working', task.id);

    let lastError: string | undefined;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const output = await this.executeWithTimeout(
          this.processTask(task),
          this.config.taskTimeout
        );

        this.results.set(task.id, {
          taskId: task.id,
          success: true,
          output,
          agentId: agent.id,
          duration: Date.now() - startTime,
        });

        this.updateAgentStatus(agent.id, 'completed');
        this.emit('task_completed', { taskId: task.id, agentId: agent.id });

        return this.results.get(task.id)!;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);

        if (attempt < this.config.maxRetries && this.config.retryOnFailure) {
          this.emit('task_retry', { taskId: task.id, attempt: attempt + 1 });
        }
      }
    }

    this.results.set(task.id, {
      taskId: task.id,
      success: false,
      output: null,
      agentId: agent.id,
      duration: Date.now() - startTime,
      error: lastError,
    });

    this.updateAgentStatus(agent.id, 'failed', task.id);
    this.emit('task_failed', { taskId: task.id, error: lastError });

    return this.results.get(task.id)!;
  }

  private findAvailableAgent(taskType: TaskDefinition['type']): PipelineAgent | undefined {
    const roleMap: Record<TaskDefinition['type'], PipelineAgentRole> = {
      design: 'designer',
      code: 'coder',
      review: 'reviewer',
      publish: 'publisher',
    };

    const targetRole = roleMap[taskType];

    for (const agent of this.agents.values()) {
      if (agent.role === targetRole && agent.status === 'idle') {
        return agent;
      }
    }

    if (this.agents.size < this.config.maxConcurrentAgents) {
      return this.registerAgent(targetRole);
    }

    return undefined;
  }

  private async processTask(task: TaskDefinition): Promise<unknown> {
    const delay = 100 + Math.random() * 200;
    await new Promise(resolve => setTimeout(resolve, delay));

    switch (task.type) {
      case 'design':
        return { designSpec: `Design specification for ${task.id}`, requirements: task.requirements };
      case 'code':
        return { code: `// Implementation for ${task.id}\n${JSON.stringify(task.input)}` };
      case 'review':
        return { review: `Review comments for ${task.id}`, approved: Math.random() > 0.2 };
      case 'publish':
        return { published: true, url: `https://example.com/${task.id}` };
      default:
        return { taskId: task.id, originalInput: task.input };
    }
  }

  private async executeWithTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Task timeout')), timeout)
      ),
    ]);
  }

  onMessage(channel: string, handler: MessageHandler): void {
    this.messageHandlers.set(channel, handler);
  }

  async sendMessage(message: AgentMessage): Promise<void> {
    const handler = this.messageHandlers.get(message.channel || 'default');
    if (handler) {
      await handler(message);
    }
    this.emit('message_sent', { message });
  }

  on(event: string, listener: (data: unknown) => void): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(listener);
    this.eventListeners.set(event, listeners);
  }

  off(event: string, listener: (data: unknown) => void): void {
    const listeners = this.eventListeners.get(event) || [];
    const filtered = listeners.filter(l => l !== listener);
    this.eventListeners.set(event, filtered);
  }

  private emit(event: string, data: unknown): void {
    const listeners = this.eventListeners.get(event) || [];
    for (const listener of listeners) {
      try {
        listener(data);
      } catch (e) {
        console.error(`Error in event listener for ${event}:`, e);
      }
    }
  }

  getStats(): {
    totalAgents: number;
    activeAgents: number;
    pendingTasks: number;
    completedTasks: number;
    failedTasks: number;
  } {
    const results = Array.from(this.results.values());
    return {
      totalAgents: this.agents.size,
      activeAgents: Array.from(this.agents.values()).filter((a: any) => a.status === 'working').length,
      pendingTasks: this.tasks.size - results.length,
      completedTasks: results.filter(r => r.success).length,
      failedTasks: results.filter(r => !r.success).length,
    };
  }

  reset(): void {
    this.agents.clear();
    this.tasks.clear();
    this.results.clear();
    this.emit('orchestrator_reset', {});
  }
}

export function createPipelineOrchestrator(config?: Partial<OrchestratorConfig>): PipelineOrchestrator {
  return new PipelineOrchestrator(config);
}