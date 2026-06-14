/**
 * V255 LongTaskDetector - Direction D Perf Compression (Iter 11/30)
 * nanobot: Detect tasks longer than 50ms blocking main thread
 */
export interface LongTask {
  id: string;
  name: string;
  durationMs: number;
  startTime: number;
  attribution: string;
  severity: 'minor' | 'major' | 'critical';
}

export interface LongTaskDetectorState {
  tasks: LongTask[];
  thresholdMs: number;
  nextId: number;
  totalTasks: number;
  totalDurationMs: number;
  bySeverity: Record<string, number>;
}

export function createLongTaskDetectorState(thresholdMs: number = 50): LongTaskDetectorState {
  return { tasks: [], thresholdMs, nextId: 1, totalTasks: 0, totalDurationMs: 0, bySeverity: {} };
}

export function reportLongTask(state: LongTaskDetectorState, name: string, durationMs: number, attribution: string = 'main', startTime: number = Date.now()): LongTaskDetectorState {
  if (durationMs < state.thresholdMs) return state;
  let severity: 'minor' | 'major' | 'critical' = 'minor';
  if (durationMs > state.thresholdMs * 8) severity = 'critical';
  else if (durationMs > state.thresholdMs * 4) severity = 'major';
  const task: LongTask = { id: `lt-${state.nextId}`, name, durationMs, startTime, attribution, severity };
  return {
    ...state,
    tasks: [...state.tasks, task].slice(-200),
    nextId: state.nextId + 1,
    totalTasks: state.totalTasks + 1,
    totalDurationMs: state.totalDurationMs + durationMs,
    bySeverity: { ...state.bySeverity, [severity]: (state.bySeverity[severity] || 0) + 1 },
  };
}

export function getLongTasks(state: LongTaskDetectorState, minSeverity?: 'minor' | 'major' | 'critical'): LongTask[] {
  if (!minSeverity) return state.tasks;
  const order = { minor: 0, major: 1, critical: 2 };
  const minLevel = order[minSeverity];
  return state.tasks.filter(t => order[t.severity] >= minLevel);
}

export function getLongTasksByAttribution(state: LongTaskDetectorState, attribution: string): LongTask[] {
  return state.tasks.filter(t => t.attribution === attribution);
}

export function getTotalBlockingTime(state: LongTaskDetectorState): number {
  return state.totalDurationMs;
}

export function clearLongTasks(state: LongTaskDetectorState): LongTaskDetectorState {
  return { ...state, tasks: [], totalTasks: 0, totalDurationMs: 0, bySeverity: {} };
}

export function setThreshold(state: LongTaskDetectorState, thresholdMs: number): LongTaskDetectorState {
  return { ...state, thresholdMs };
}

export function getLongTaskDetectorReport(state: LongTaskDetectorState): { total: number; totalDuration: number; bySeverity: Record<string, number>; threshold: number } {
  return { total: state.totalTasks, totalDuration: state.totalDurationMs, bySeverity: state.bySeverity, threshold: state.thresholdMs };
}
