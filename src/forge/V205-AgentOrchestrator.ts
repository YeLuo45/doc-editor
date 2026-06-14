/**
 * V205 AgentOrchestrator - Direction B Agent Forge (Iter 21/30)
 * chatdev: Orchestrate multiple agents in workflows
 */
export type OrchestratorStrategy = 'sequential' | 'parallel' | 'conditional' | 'retry';

export interface OrchestrationTask {
  id: string;
  agentId: string;
  input: any;
  dependsOn: string[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: any;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface OrchestrationState {
  tasks: Map<string, OrchestrationTask>;
  executionOrder: string[];
  strategy: OrchestratorStrategy;
  maxRetries: number;
  totalTasks: number;
  completed: number;
  failed: number;
}

export function createOrchestrationState(): OrchestrationState {
  return { tasks: new Map(), executionOrder: [], strategy: 'sequential', maxRetries: 3, totalTasks: 0, completed: 0, failed: 0 };
}

export function addTask(state: OrchestrationState, task: Omit<OrchestrationTask, 'status'>): OrchestrationState {
  return { ...state, tasks: new Map(state.tasks).set(task.id, { ...task, status: 'pending' }), totalTasks: state.totalTasks + 1 };
}

export function removeTask(state: OrchestrationState, id: string): OrchestrationState {
  const tasks = new Map(state.tasks);
  tasks.delete(id);
  return { ...state, tasks, totalTasks: Math.max(0, state.totalTasks - 1) };
}

export function setStrategy(state: OrchestrationState, strategy: OrchestratorStrategy): OrchestrationState {
  return { ...state, strategy };
}

export function topologicalSort(tasks: OrchestrationTask[]): OrchestrationTask[] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const t of tasks) {
    inDegree.set(t.id, t.dependsOn.length);
    for (const dep of t.dependsOn) {
      if (!adj.has(dep)) adj.set(dep, []);
      adj.get(dep)!.push(t.id);
    }
  }
  const queue = tasks.filter(t => t.dependsOn.length === 0).map(t => t.id);
  const result: OrchestrationTask[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const task = tasks.find(t => t.id === id);
    if (task) result.push(task);
    for (const next of adj.get(id) || []) {
      const deg = (inDegree.get(next) || 0) - 1;
      inDegree.set(next, deg);
      if (deg === 0) queue.push(next);
    }
  }
  return result;
}

export function planExecution(state: OrchestrationState): OrchestrationState {
  const sorted = topologicalSort(Array.from(state.tasks.values()));
  return { ...state, executionOrder: sorted.map(t => t.id) };
}

export function markTaskRunning(state: OrchestrationState, id: string): OrchestrationState {
  return { ...state, tasks: new Map(state.tasks).set(id, { ...state.tasks.get(id)!, status: 'running', startedAt: Date.now() }) };
}

export function markTaskCompleted(state: OrchestrationState, id: string, result: any): OrchestrationState {
  const t = state.tasks.get(id);
  if (!t) return state;
  return {
    ...state,
    tasks: new Map(state.tasks).set(id, { ...t, status: 'completed', result, completedAt: Date.now() }),
    completed: state.completed + 1,
  };
}

export function markTaskFailed(state: OrchestrationState, id: string, error: string): OrchestrationState {
  const t = state.tasks.get(id);
  if (!t) return state;
  return { ...state, tasks: new Map(state.tasks).set(id, { ...t, status: 'failed', error, completedAt: Date.now() }), failed: state.failed + 1 };
}

export function getReadyTasks(state: OrchestrationState): OrchestrationTask[] {
  return state.executionOrder
    .map(id => state.tasks.get(id))
    .filter((t): t is OrchestrationTask => t !== undefined && t.status === 'pending' && t.dependsOn.every(d => state.tasks.get(d)?.status === 'completed'))
    .map(t => t!);
}

export function getOrchestratorReport(state: OrchestrationState): { total: number; completed: number; failed: number; pending: number; ready: number } {
  return { total: state.totalTasks, completed: state.completed, failed: state.failed, pending: Array.from(state.tasks.values()).filter(t => t.status === 'pending').length, ready: getReadyTasks(state).length };
}
