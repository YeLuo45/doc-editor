/**
 * V256 FrameBudget - Direction D Perf Compression (Iter 12/30)
 * nanobot: Per-frame 16ms budget enforcement
 */
export interface FrameMetric {
  frame: number;
  workMs: number;
  remainingMs: number;
  overBudget: boolean;
  timestamp: number;
}

export interface FrameBudgetState {
  frames: FrameMetric[];
  currentFrame: number;
  frameStartTime: number;
  budgetMs: number;
  totalFrames: number;
  overBudgetFrames: number;
}

export function createFrameBudgetState(budgetMs: number = 16): FrameBudgetState {
  return { frames: [], currentFrame: 0, frameStartTime: 0, budgetMs, totalFrames: 0, overBudgetFrames: 0 };
}

export function startFrame(state: FrameBudgetState): FrameBudgetState {
  return { ...state, currentFrame: state.currentFrame + 1, frameStartTime: Date.now() };
}

export function endFrame(state: FrameBudgetState): FrameBudgetState {
  const now = Date.now();
  const workMs = now - state.frameStartTime;
  const overBudget = workMs > state.budgetMs;
  const metric: FrameMetric = { frame: state.currentFrame, workMs, remainingMs: Math.max(0, state.budgetMs - workMs), overBudget, timestamp: now };
  return {
    ...state,
    frames: [...state.frames, metric].slice(-300),  // ~5s at 60fps
    totalFrames: state.totalFrames + 1,
    overBudgetFrames: state.overBudgetFrames + (overBudget ? 1 : 0),
  };
}

export function getRecentFrames(state: FrameBudgetState, count: number = 60): FrameMetric[] {
  return state.frames.slice(-count);
}

export function getFrameStats(state: FrameBudgetState): { avgWorkMs: number; p95WorkMs: number; overBudgetRatio: number } {
  if (state.frames.length === 0) return { avgWorkMs: 0, p95WorkMs: 0, overBudgetRatio: 0 };
  const works = state.frames.map(f => f.workMs);
  const avgWorkMs = works.reduce((a, b) => a + b, 0) / works.length;
  const sorted = [...works].sort((a, b) => a - b);
  const p95WorkMs = sorted[Math.max(0, Math.floor((sorted.length - 1) * 0.95))];
  const overBudgetCount = state.frames.filter(f => f.overBudget).length;
  return { avgWorkMs, p95WorkMs, overBudgetRatio: overBudgetCount / state.frames.length };
}

export function getOverBudgetFrames(state: FrameBudgetState): FrameMetric[] {
  return state.frames.filter(f => f.overBudget);
}

export function clearFrameHistory(state: FrameBudgetState): FrameBudgetState {
  return { ...state, frames: [], totalFrames: 0, overBudgetFrames: 0 };
}

export function setBudget(state: FrameBudgetState, budgetMs: number): FrameBudgetState {
  return { ...state, budgetMs };
}

export function getFrameBudgetReport(state: FrameBudgetState): { totalFrames: number; overBudgetFrames: number; overBudgetRatio: number; budget: number } {
  return {
    totalFrames: state.totalFrames,
    overBudgetFrames: state.overBudgetFrames,
    overBudgetRatio: state.totalFrames > 0 ? state.overBudgetFrames / state.totalFrames : 0,
    budget: state.budgetMs,
  };
}
