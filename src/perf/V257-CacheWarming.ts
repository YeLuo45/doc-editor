/**
 * V257 CacheWarming - Direction D Perf Compression (Iter 13/30)
 * nanobot: Pre-warm caches on idle for instant access
 */
export type CacheType = 'http' | 'image' | 'data' | 'compute';

export interface WarmupTask {
  id: string;
  type: CacheType;
  key: string;
  loader: () => Promise<any>;
  status: 'pending' | 'loading' | 'ready' | 'failed';
  loadedAt?: number;
  error?: string;
}

export interface WarmupState {
  tasks: Map<string, WarmupTask>;
  nextId: number;
  totalTasks: number;
  totalReady: number;
  totalFailed: number;
  isIdle: boolean;
}

export function createWarmupState(): WarmupState {
  return { tasks: new Map(), nextId: 1, totalTasks: 0, totalReady: 0, totalFailed: 0, isIdle: true };
}

export function setIdle(state: WarmupState, idle: boolean): WarmupState {
  return { ...state, isIdle: idle };
}

export function registerWarmupTask(state: WarmupState, type: CacheType, key: string, loader: () => Promise<any>): { state: WarmupState; taskId: string } {
  const id = `warmup-${state.nextId}`;
  const task: WarmupTask = { id, type, key, loader, status: 'pending' };
  return { state: { ...state, tasks: new Map(state.tasks).set(id, task), nextId: state.nextId + 1, totalTasks: state.totalTasks + 1 }, taskId: id };
}

export function markWarmupReady(state: WarmupState, taskId: string): WarmupState {
  const task = state.tasks.get(taskId);
  if (!task) return state;
  return { ...state, tasks: new Map(state.tasks).set(taskId, { ...task, status: 'ready', loadedAt: Date.now() }), totalReady: state.totalReady + 1 };
}

export function markWarmupFailed(state: WarmupState, taskId: string, error: string): WarmupState {
  const task = state.tasks.get(taskId);
  if (!task) return state;
  return { ...state, tasks: new Map(state.tasks).set(taskId, { ...task, status: 'failed', error }), totalFailed: state.totalFailed + 1 };
}

export function getWarmupTask(state: WarmupState, taskId: string): WarmupTask | undefined {
  return state.tasks.get(taskId);
}

export function getWarmupByKey(state: WarmupState, key: string): WarmupTask[] {
  return Array.from(state.tasks.values()).filter(t => t.key === key);
}

export function getReadyWarmupTasks(state: WarmupState): WarmupTask[] {
  return Array.from(state.tasks.values()).filter(t => t.status === 'ready');
}

export function getPendingWarmupTasks(state: WarmupState): WarmupTask[] {
  return Array.from(state.tasks.values()).filter(t => t.status === 'pending' || t.status === 'loading');
}

export function clearWarmupTasks(state: WarmupState): WarmupState {
  return { ...state, tasks: new Map() };
}

export function getWarmupReport(state: WarmupState): { total: number; ready: number; failed: number; pending: number; isIdle: boolean } {
  return {
    total: state.totalTasks,
    ready: state.totalReady,
    failed: state.totalFailed,
    pending: getPendingWarmupTasks(state).length,
    isIdle: state.isIdle,
  };
}
