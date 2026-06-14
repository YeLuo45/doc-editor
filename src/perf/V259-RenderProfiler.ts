/**
 * V259 RenderProfiler - Direction D Perf Compression (Iter 15/30)
 * nanobot: Profile React render times per component
 */
export interface RenderRecord {
  id: number;
  component: string;
  durationMs: number;
  props: number;        // number of props
  timestamp: number;
  rerender: boolean;
}

export interface RenderProfilerState {
  records: RenderRecord[];
  nextId: number;
  totalRenders: number;
  totalDurationMs: number;
  byComponent: Map<string, { count: number; totalMs: number; avgMs: number; maxMs: number }>;
}

export function createRenderProfilerState(): RenderProfilerState {
  return { records: [], nextId: 1, totalRenders: 0, totalDurationMs: 0, byComponent: new Map() };
}

export function recordRender(state: RenderProfilerState, component: string, durationMs: number, props: number = 0, rerender: boolean = false): RenderProfilerState {
  const record: RenderRecord = { id: state.nextId, component, durationMs, props, timestamp: Date.now(), rerender };
  const existing = state.byComponent.get(component) || { count: 0, totalMs: 0, avgMs: 0, maxMs: 0 };
  const newCount = existing.count + 1;
  const newTotalMs = existing.totalMs + durationMs;
  const newAvg = newTotalMs / newCount;
  const newMax = Math.max(existing.maxMs, durationMs);
  const byComponent = new Map(state.byComponent);
  byComponent.set(component, { count: newCount, totalMs: newTotalMs, avgMs: newAvg, maxMs: newMax });
  return { ...state, records: [...state.records, record].slice(-1000), nextId: state.nextId + 1, totalRenders: state.totalRenders + 1, totalDurationMs: state.totalDurationMs + durationMs, byComponent };
}

export function getRendersForComponent(state: RenderProfilerState, component: string): RenderRecord[] {
  return state.records.filter(r => r.component === component);
}

export function getSlowRenders(state: RenderProfilerState, thresholdMs: number = 16): RenderRecord[] {
  return state.records.filter(r => r.durationMs > thresholdMs);
}

export function getComponentStats(state: RenderProfilerState, component: string): { count: number; totalMs: number; avgMs: number; maxMs: number } | undefined {
  return state.byComponent.get(component);
}

export function getSlowestComponents(state: RenderProfilerState, limit: number = 5): Array<{ component: string; avgMs: number; count: number }> {
  return Array.from(state.byComponent.entries())
    .map(([component, stats]) => ({ component, avgMs: stats.avgMs, count: stats.count }))
    .sort((a, b) => b.avgMs - a.avgMs)
    .slice(0, limit);
}

export function clearRenderRecords(state: RenderProfilerState): RenderProfilerState {
  return createRenderProfilerState();
}

export function getRenderProfilerReport(state: RenderProfilerState): { totalRenders: number; totalDurationMs: number; avgRenderMs: number; components: number } {
  return { totalRenders: state.totalRenders, totalDurationMs: state.totalDurationMs, avgRenderMs: state.totalRenders > 0 ? state.totalDurationMs / state.totalRenders : 0, components: state.byComponent.size };
}
