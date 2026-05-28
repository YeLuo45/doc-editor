/**
 * AgentTask.ts - Task interface for the V21 Agent System
 * Defines the structure of tasks processed by agents in the pipeline
 */

export type TaskType = 'design' | 'implement' | 'review' | 'refactor' | 'test' | 'deploy';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface TaskPayload {
  requirement?: string;
  specification?: string;
  sourceCode?: string;
  context?: Record<string, unknown>;
  options?: Record<string, unknown>;
}

export interface TaskDependency {
  taskId: string;
  type: 'requires' | 'enhances' | 'blocks';
}

export interface AgentTask {
  id: string;
  type: TaskType;
  payload: TaskPayload;
  status: TaskStatus;
  priority: TaskPriority;
  dependencies: TaskDependency[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface CreateTaskOptions {
  id?: string;
  type: TaskType;
  payload: TaskPayload;
  priority?: TaskPriority;
  dependencies?: TaskDependency[];
  metadata?: Record<string, unknown>;
}

export function createTask(options: CreateTaskOptions): AgentTask {
  const now = new Date();
  return {
    id: options.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: options.type,
    payload: options.payload,
    status: 'pending',
    priority: options.priority || 'medium',
    dependencies: options.dependencies || [],
    createdAt: now,
    updatedAt: now,
    metadata: options.metadata,
  };
}

export function updateTaskStatus(task: AgentTask, status: TaskStatus): AgentTask {
  return {
    ...task,
    status,
    updatedAt: new Date(),
  };
}

export function validateTask(task: unknown): task is AgentTask {
  if (!task || typeof task !== 'object') return false;
  const t = task as Record<string, unknown>;
  const VALID_TYPES = ['design', 'implement', 'review', 'refactor', 'test', 'deploy'];
  return (
    typeof t.id === 'string' &&
    typeof t.type === 'string' &&
    VALID_TYPES.includes(t.type) &&
    typeof t.payload === 'object' &&
    typeof t.status === 'string'
  );
}