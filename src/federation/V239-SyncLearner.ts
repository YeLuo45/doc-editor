/**
 * V239 SyncLearner - Direction C Doc Federation (Iter 25/30)
 * generic-agent: Learn from sync outcomes to improve next time
 */
export type SyncOutcome = 'success' | 'partial' | 'failure';

export interface SyncLearningEvent {
  id: string;
  docId: string;
  deviceId: string;
  outcome: SyncOutcome;
  latencyMs: number;
  conflictCount: number;
  bytesSynced: number;
  parameters: Record<string, any>;
  timestamp: number;
}

export interface SyncLearnerState {
  events: SyncLearningEvent[];
  docStats: Map<string, { total: number; success: number; partial: number; failure: number; avgLatency: number }>;
  nextId: number;
}

export function createSyncLearnerState(): SyncLearnerState {
  return { events: [], docStats: new Map(), nextId: 1 };
}

export function recordSyncOutcome(state: SyncLearnerState, docId: string, deviceId: string, outcome: SyncOutcome, latencyMs: number, conflictCount: number, bytesSynced: number, parameters: Record<string, any>): SyncLearnerState {
  const event: SyncLearningEvent = { id: `learn-${state.nextId}`, docId, deviceId, outcome, latencyMs, conflictCount, bytesSynced, parameters, timestamp: Date.now() };
  const stats = state.docStats.get(docId) || { total: 0, success: 0, partial: 0, failure: 0, avgLatency: 0 };
  const newTotal = stats.total + 1;
  const newSuccess = stats.success + (outcome === 'success' ? 1 : 0);
  const newPartial = stats.partial + (outcome === 'partial' ? 1 : 0);
  const newFailure = stats.failure + (outcome === 'failure' ? 1 : 0);
  const newAvgLatency = (stats.avgLatency * stats.total + latencyMs) / newTotal;
  const docStats = new Map(state.docStats);
  docStats.set(docId, { total: newTotal, success: newSuccess, partial: newPartial, failure: newFailure, avgLatency: newAvgLatency });
  return { ...state, events: [...state.events, event].slice(-1000), docStats, nextId: state.nextId + 1 };
}

export function getSyncSuccessRate(state: SyncLearnerState, docId: string): number {
  const stats = state.docStats.get(docId);
  if (!stats || stats.total === 0) return 0;
  return stats.success / stats.total;
}

export function getSyncAvgLatency(state: SyncLearnerState, docId: string): number {
  return state.docStats.get(docId)?.avgLatency || 0;
}

export function getBestSyncParameters(state: SyncLearnerState, docId: string): Record<string, any> | undefined {
  const candidates = state.events.filter(e => e.docId === docId && e.outcome === 'success');
  if (candidates.length === 0) return undefined;
  const best = candidates.sort((a, b) => b.bytesSynced - a.bytesSynced)[0];
  return best.parameters;
}

export function getSyncOutcomeDistribution(state: SyncLearnerState, docId: string): Record<SyncOutcome, number> {
  const stats = state.docStats.get(docId);
  if (!stats) return { success: 0, partial: 0, failure: 0 };
  return { success: stats.success, partial: stats.partial, failure: stats.failure };
}

export function clearSyncLearning(state: SyncLearnerState): SyncLearnerState {
  return { events: [], docStats: new Map(), nextId: 1 };
}

export function getSyncLearnerReport(state: SyncLearnerState): { total: number; docs: number; overallSuccessRate: number } {
  let total = 0, success = 0;
  for (const stats of state.docStats.values()) {
    total += stats.total;
    success += stats.success;
  }
  return { total: state.events.length, docs: state.docStats.size, overallSuccessRate: total > 0 ? success / total : 0 };
}
