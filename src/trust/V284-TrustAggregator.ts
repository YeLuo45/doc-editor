/**
 * V284 TrustAggregator - Direction E Trust Verification (Iter 10/30)
 * nanobot: Aggregate trust signals across documents
 */
export interface TrustSignal {
  id: number;
  docId: string;
  signal: string;     // e.g. 'signature_valid' / 'pii_found' / 'secret_leaked'
  value: number;      // -1..1 (negative = bad, positive = good)
  timestamp: number;
}

export interface TrustAggregated {
  docId: string;
  score: number;       // 0..1
  signalCount: number;
  positiveCount: number;
  negativeCount: number;
  signals: TrustSignal[];
  updatedAt: number;
}

export interface TrustAggregatorState {
  signals: Map<string, TrustSignal[]>;    // docId -> signals
  aggregations: Map<string, TrustAggregated>;
  nextId: number;
  totalSignals: number;
}

export function createTrustAggregatorState(): TrustAggregatorState {
  return { signals: new Map(), aggregations: new Map(), nextId: 1, totalSignals: 0 };
}

export function recordSignal(state: TrustAggregatorState, docId: string, signal: string, value: number): TrustAggregatorState {
  const sig: TrustSignal = { id: state.nextId, docId, signal, value, timestamp: Date.now() };
  const existing = state.signals.get(docId) || [];
  const signals = new Map(state.signals);
  signals.set(docId, [...existing, sig].slice(-100));
  return { ...state, signals, nextId: state.nextId + 1, totalSignals: state.totalSignals + 1 };
}

export function recomputeDoc(state: TrustAggregatorState, docId: string): TrustAggregatorState {
  const signals = state.signals.get(docId) || [];
  if (signals.length === 0) return state;
  const positiveCount = signals.filter(s => s.value > 0).length;
  const negativeCount = signals.filter(s => s.value < 0).length;
  const total = positiveCount + negativeCount;
  const score = total > 0 ? positiveCount / total : 0.5;
  const aggregated: TrustAggregated = { docId, score, signalCount: signals.length, positiveCount, negativeCount, signals, updatedAt: Date.now() };
  return { ...state, aggregations: new Map(state.aggregations).set(docId, aggregated) };
}

export function getTrustAggregation(state: TrustAggregatorState, docId: string): TrustAggregated | undefined {
  return state.aggregations.get(docId);
}

export function getAllAggregations(state: TrustAggregatorState): TrustAggregated[] {
  return Array.from(state.aggregations.values());
}

export function getSignalsForDoc(state: TrustAggregatorState, docId: string): TrustSignal[] {
  return state.signals.get(docId) || [];
}

export function clearTrustAggregation(state: TrustAggregatorState): TrustAggregatorState {
  return createTrustAggregatorState();
}

export function getTrustAggregatorReport(state: TrustAggregatorState): { totalSignals: number; docsTracked: number; avgScore: number } {
  const aggs = Array.from(state.aggregations.values());
  const avgScore = aggs.length > 0 ? aggs.reduce((a, b) => a + b.score, 0) / aggs.length : 0;
  return { totalSignals: state.totalSignals, docsTracked: state.signals.size, avgScore };
}
