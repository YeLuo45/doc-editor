/**
 * V299 TrustLearner - Direction E Trust Verification (Iter 25/30)
 * generic-agent: Learn from past verifications to predict future trust issues
 */
export type TrustIssueType = 'tampering' | 'policies' | 'pii' | 'secret' | 'signature';

export interface TrustHistoryEvent {
  id: string;
  type: TrustIssueType;
  docId: string;
  timestamp: number;
  resolved: boolean;
}

export interface TrustPrediction {
  type: TrustIssueType;
  likelihood: number;
  reason: string;
  predictedAt: number;
}

export interface TrustLearnerState {
  events: TrustHistoryEvent[];
  predictions: TrustPrediction[];
  nextId: number;
  totalEvents: number;
}

export function createTrustLearnerState(): TrustLearnerState {
  return { events: [], predictions: [], nextId: 1, totalEvents: 0 };
}

export function recordTrustIssue(state: TrustLearnerState, type: TrustIssueType, docId: string, resolved: boolean): TrustLearnerState {
  const event: TrustHistoryEvent = { id: `tle-${state.nextId}`, type, docId, timestamp: Date.now(), resolved };
  return { ...state, events: [...state.events, event].slice(-500), nextId: state.nextId + 1, totalEvents: state.totalEvents + 1 };
}

export function predictTrustIssues(state: TrustLearnerState): TrustLearnerState {
  const types: TrustIssueType[] = ['tampering', 'policies', 'pii', 'secret', 'signature'];
  const predictions: TrustPrediction[] = [];
  for (const type of types) {
    const typeEvents = state.events.filter(e => e.type === type);
    if (typeEvents.length < 3) continue;
    const unresolvedCount = typeEvents.filter(e => !e.resolved).length;
    const likelihood = unresolvedCount / typeEvents.length;
    if (likelihood > 0.4) {
      predictions.push({ type, likelihood, reason: `${unresolvedCount}/${typeEvents.length} recent ${type} issues unresolved`, predictedAt: Date.now() });
    }
  }
  return { ...state, predictions: [...state.predictions, ...predictions].slice(-100) };
}

export function getEventsByType(state: TrustLearnerState, type: TrustIssueType): TrustHistoryEvent[] {
  return state.events.filter(e => e.type === type);
}

export function getLatestPrediction(state: TrustLearnerState, type: TrustIssueType): TrustPrediction | undefined {
  const filtered = state.predictions.filter(p => p.type === type);
  return filtered[filtered.length - 1];
}

export function clearTrustHistory(state: TrustLearnerState): TrustLearnerState {
  return { ...state, events: [], predictions: [] };
}

export function getTrustLearnerReport(state: TrustLearnerState): { totalEvents: number; predictions: number; byType: Record<string, number> } {
  const byType: Record<string, number> = {};
  for (const e of state.events) byType[e.type] = (byType[e.type] || 0) + 1;
  return { totalEvents: state.totalEvents, predictions: state.predictions.length, byType };
}
