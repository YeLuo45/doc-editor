/**
 * V269 PerfLearner - Direction D Perf Compression (Iter 25/30)
 * generic-agent: Learn from past perf to predict future bottlenecks
 */
export type BottleneckType = 'cpu' | 'memory' | 'network' | 'render' | 'ai';

export interface PerfHistoryEvent {
  id: string;
  type: BottleneckType;
  metric: string;
  value: number;
  timestamp: number;
  resolved: boolean;
}

export interface PerfPrediction {
  type: BottleneckType;
  metric: string;
  likelihood: number;       // 0..1
  predictedAt: number;
  reason: string;
}

export interface PerfLearnerState {
  events: PerfHistoryEvent[];
  predictions: PerfPrediction[];
  nextId: number;
  totalEvents: number;
}

export function createPerfLearnerState(): PerfLearnerState {
  return { events: [], predictions: [], nextId: 1, totalEvents: 0 };
}

export function recordHistory(state: PerfLearnerState, type: BottleneckType, metric: string, value: number, resolved: boolean): PerfLearnerState {
  const event: PerfHistoryEvent = { id: `ple-${state.nextId}`, type, metric, value, timestamp: Date.now(), resolved };
  return { ...state, events: [...state.events, event].slice(-500), nextId: state.nextId + 1, totalEvents: state.totalEvents + 1 };
}

export function predictBottlenecks(state: PerfLearnerState): PerfLearnerState {
  const types: BottleneckType[] = ['cpu', 'memory', 'network', 'render', 'ai'];
  const predictions: PerfPrediction[] = [];
  for (const type of types) {
    const typeEvents = state.events.filter(e => e.type === type);
    if (typeEvents.length < 3) continue;
    const unresolvedCount = typeEvents.filter(e => !e.resolved).length;
    const likelihood = unresolvedCount / typeEvents.length;
    if (likelihood > 0.4) {
      const latestMetric = typeEvents[typeEvents.length - 1].metric;
      predictions.push({ type, metric: latestMetric, likelihood, predictedAt: Date.now(), reason: `${unresolvedCount}/${typeEvents.length} recent ${type} issues unresolved` });
    }
  }
  return { ...state, predictions: [...state.predictions, ...predictions].slice(-100) };
}

export function getEventsByType(state: PerfLearnerState, type: BottleneckType): PerfHistoryEvent[] {
  return state.events.filter(e => e.type === type);
}

export function getLatestPrediction(state: PerfLearnerState, type: BottleneckType): PerfPrediction | undefined {
  const filtered = state.predictions.filter(p => p.type === type);
  return filtered[filtered.length - 1];
}

export function clearHistory(state: PerfLearnerState): PerfLearnerState {
  return { ...state, events: [], predictions: [] };
}

export function getPerfLearnerReport(state: PerfLearnerState): { totalEvents: number; predictions: number; byType: Record<string, number> } {
  const byType: Record<string, number> = {};
  for (const e of state.events) byType[e.type] = (byType[e.type] || 0) + 1;
  return { totalEvents: state.totalEvents, predictions: state.predictions.length, byType };
}
