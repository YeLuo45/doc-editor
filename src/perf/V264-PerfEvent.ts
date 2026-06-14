/**
 * V264 PerfEvent - Direction D Perf Compression (Iter 20/30)
 * ruflo: Emit typed performance events
 */
export type PerfEventType = 'faster' | 'slower' | 'stable' | 'regressed' | 'optimized' | 'deoptimized';

export interface PerfEvent {
  id: number;
  type: PerfEventType;
  metric: string;
  oldValue: number;
  newValue: number;
  delta: number;
  percent: number;
  source: string;
  timestamp: number;
}

export interface PerfEventBusState {
  events: PerfEvent[];
  nextId: number;
  totalEvents: number;
  byType: Record<PerfEventType, number>;
}

export function createPerfEventBus(): PerfEventBusState {
  return { events: [], nextId: 1, totalEvents: 0, byType: { faster: 0, slower: 0, stable: 0, regressed: 0, optimized: 0, deoptimized: 0 } };
}

export function emitPerfEvent(state: PerfEventBusState, metric: string, oldValue: number, newValue: number, source: string = 'unknown'): PerfEventBusState {
  const delta = newValue - oldValue;
  const percent = oldValue !== 0 ? (delta / oldValue) * 100 : (newValue > 0 ? 100 : 0);
  let type: PerfEventType = 'stable';
  const threshold = 5;  // 5% change threshold
  if (Math.abs(percent) < threshold) type = 'stable';
  else if (delta < 0) type = 'faster';  // For perf metrics, lower is better
  else if (delta > 0) type = 'slower';
  // Large change: optimized/deoptimized
  if (Math.abs(percent) > 50) type = delta < 0 ? 'optimized' : 'deoptimized';
  // Regression source with any positive change → regressed
  else if (source === 'regression' && delta > 0) type = 'regressed';
  const event: PerfEvent = { id: state.nextId, type, metric, oldValue, newValue, delta, percent, source, timestamp: Date.now() };
  return { ...state, events: [...state.events, event].slice(-500), nextId: state.nextId + 1, totalEvents: state.totalEvents + 1, byType: { ...state.byType, [type]: state.byType[type] + 1 } };
}

export function getEventsByType(state: PerfEventBusState, type: PerfEventType): PerfEvent[] {
  return state.events.filter(e => e.type === type);
}

export function getEventsByMetric(state: PerfEventBusState, metric: string): PerfEvent[] {
  return state.events.filter(e => e.metric === metric);
}

export function getRegressions(state: PerfEventBusState): PerfEvent[] {
  return state.events.filter(e => e.type === 'regressed' || e.type === 'deoptimized');
}

export function getOptimizations(state: PerfEventBusState): PerfEvent[] {
  return state.events.filter(e => e.type === 'optimized' || e.type === 'faster');
}

export function getRecentEvents(state: PerfEventBusState, count: number = 10): PerfEvent[] {
  return state.events.slice(-count);
}

export function clearEvents(state: PerfEventBusState): PerfEventBusState {
  return createPerfEventBus();
}

export function getPerfEventReport(state: PerfEventBusState): { total: number; byType: Record<string, number>; regressions: number; optimizations: number } {
  return { total: state.totalEvents, byType: state.byType, regressions: state.byType.regressed + state.byType.deoptimized, optimizations: state.byType.optimized + state.byType.faster };
}
