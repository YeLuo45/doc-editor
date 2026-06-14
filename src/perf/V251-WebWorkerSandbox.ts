/**
 * V251 WebWorkerSandbox - Direction D Perf Compression (Iter 7/30)
 * thunderbolt: Heavy compute in Web Worker (diff/analysis/compaction)
 */
export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface WorkerTask {
  id: string;
  type: 'diff' | 'analyze' | 'compact' | 'tokenize';
  payload: any;
  status: TaskStatus;
  result?: any;
  error?: string;
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;
}

export interface WorkerSandboxState {
  tasks: Map<string, WorkerTask>;
  nextId: number;
  totalTasks: number;
  totalCompleted: number;
  totalFailed: number;
  totalDurationMs: number;
}

export function createWorkerSandboxState(): WorkerSandboxState {
  return { tasks: new Map(), nextId: 1, totalTasks: 0, totalCompleted: 0, totalFailed: 0, totalDurationMs: 0 };
}

export function submitTask(state: WorkerSandboxState, type: WorkerTask['type'], payload: any): { state: WorkerSandboxState; taskId: string } {
  const id = `wt-${state.nextId}`;
  const task: WorkerTask = { id, type, payload, status: 'queued' };
  return { state: { ...state, tasks: new Map(state.tasks).set(id, task), nextId: state.nextId + 1, totalTasks: state.totalTasks + 1 }, taskId: id };
}

export function startTask(state: WorkerSandboxState, taskId: string): WorkerSandboxState {
  const task = state.tasks.get(taskId);
  if (!task) return state;
  return { ...state, tasks: new Map(state.tasks).set(taskId, { ...task, status: 'running', startedAt: Date.now() }) };
}

export function completeTask(state: WorkerSandboxState, taskId: string, result: any): WorkerSandboxState {
  const task = state.tasks.get(taskId);
  if (!task) return state;
  const now = Date.now();
  const durationMs = task.startedAt ? now - task.startedAt : 0;
  return {
    ...state,
    tasks: new Map(state.tasks).set(taskId, { ...task, status: 'completed', result, completedAt: now, durationMs }),
    totalCompleted: state.totalCompleted + 1,
    totalDurationMs: state.totalDurationMs + durationMs,
  };
}

export function failTask(state: WorkerSandboxState, taskId: string, error: string): WorkerSandboxState {
  const task = state.tasks.get(taskId);
  if (!task) return state;
  return { ...state, tasks: new Map(state.tasks).set(taskId, { ...task, status: 'failed', error, completedAt: Date.now() }), totalFailed: state.totalFailed + 1 };
}

export function getTask(state: WorkerSandboxState, taskId: string): WorkerTask | undefined {
  return state.tasks.get(taskId);
}

export function getTasksByStatus(state: WorkerSandboxState, status: TaskStatus): WorkerTask[] {
  return Array.from(state.tasks.values()).filter(t => t.status === status);
}

export function getAvgTaskDuration(state: WorkerSandboxState): number {
  const completed = Array.from(state.tasks.values()).filter(t => t.durationMs !== undefined);
  if (completed.length === 0) return 0;
  return completed.reduce((a, b) => a + (b.durationMs || 0), 0) / completed.length;
}

export function clearWorkerTasks(state: WorkerSandboxState): WorkerSandboxState {
  return createWorkerSandboxState();
}

export function getWorkerSandboxReport(state: WorkerSandboxState): { total: number; completed: number; failed: number; avgDuration: number; byStatus: Record<string, number> } {
  const byStatus: Record<string, number> = {};
  for (const t of state.tasks.values()) byStatus[t.status] = (byStatus[t.status] || 0) + 1;
  return { total: state.totalTasks, completed: state.totalCompleted, failed: state.totalFailed, avgDuration: getAvgTaskDuration(state), byStatus };
}
