/**
 * V248 DebouncedScheduler - Direction D Perf Compression (Iter 4/30)
 * thunderbolt: Debounce/throttle AI calls and render operations
 */
export type ScheduleMode = 'debounce' | 'throttle' | 'leading' | 'trailing';

export interface ScheduledTask {
  id: string;
  fn: (...args: any[]) => any;
  mode: ScheduleMode;
  delay: number;        // ms
  lastRunAt: number;
  pending: boolean;
  callCount: number;
}

export interface SchedulerState {
  tasks: Map<string, ScheduledTask>;
  pendingTimers: Map<string, any>;
  totalExecutions: number;
  totalThrottled: number;
}

export function createSchedulerState(): SchedulerState {
  return { tasks: new Map(), pendingTimers: new Map(), totalExecutions: 0, totalThrottled: 0 };
}

export function registerTask(state: SchedulerState, id: string, fn: (...args: any[]) => any, mode: ScheduleMode, delay: number): SchedulerState {
  const task: ScheduledTask = { id, fn, mode, delay, lastRunAt: 0, pending: false, callCount: 0 };
  return { ...state, tasks: new Map(state.tasks).set(id, task) };
}

export function triggerTask(state: SchedulerState, id: string, ...args: any[]): SchedulerState {
  const task = state.tasks.get(id);
  if (!task) return state;
  const now = Date.now();
  if (task.mode === 'throttle') {
    if (now - task.lastRunAt < task.delay) {
      return { ...state, totalThrottled: state.totalThrottled + 1 };
    }
    task.fn(...args);
    return { ...state, tasks: new Map(state.tasks).set(id, { ...task, lastRunAt: now, callCount: task.callCount + 1 }), totalExecutions: state.totalExecutions + 1 };
  } else if (task.mode === 'leading') {
    if (!task.pending) {
      task.fn(...args);
      return { ...state, tasks: new Map(state.tasks).set(id, { ...task, lastRunAt: now, callCount: task.callCount + 1, pending: true }), totalExecutions: state.totalExecutions + 1 };
    }
    return { ...state, totalThrottled: state.totalThrottled + 1 };
  } else { // debounce or trailing
    return { ...state, tasks: new Map(state.tasks).set(id, { ...task, pending: true, callCount: task.callCount + 1 }) };
  }
}

export function completeDebounced(state: SchedulerState, id: string, ...args: any[]): SchedulerState {
  const task = state.tasks.get(id);
  if (!task || !task.pending) return state;
  task.fn(...args);
  return { ...state, tasks: new Map(state.tasks).set(id, { ...task, pending: false, lastRunAt: Date.now() }), totalExecutions: state.totalExecutions + 1 };
}

export function getTask(state: SchedulerState, id: string): ScheduledTask | undefined {
  return state.tasks.get(id);
}

export function unregisterTask(state: SchedulerState, id: string): SchedulerState {
  const tasks = new Map(state.tasks);
  tasks.delete(id);
  return { ...state, tasks };
}

export function getSchedulerReport(state: SchedulerState): { tasks: number; totalExecutions: number; totalThrottled: number; pendingTasks: number } {
  return { tasks: state.tasks.size, totalExecutions: state.totalExecutions, totalThrottled: state.totalThrottled, pendingTasks: Array.from(state.tasks.values()).filter(t => t.pending).length };
}
