/**
 * V279 TrustScorer - Direction E Trust Verification (Iter 5/30)
 * thunderbolt: Score trust level (0-1) based on author/source/history
 */
export interface TrustScore {
  docId: string;
  score: number;        // 0..1
  factors: { name: string; weight: number; value: number }[];
  timestamp: number;
}

export interface TrustScorerState {
  scores: Map<string, TrustScore>;
  weights: { authorReputation: number; provenance: number; signatures: number; age: number; size: number };
  totalScores: number;
}

export function createTrustScorerState(): TrustScorerState {
  return {
    scores: new Map(),
    weights: { authorReputation: 0.3, provenance: 0.2, signatures: 0.3, age: 0.1, size: 0.1 },
    totalScores: 0,
  };
}

export function setTrustWeights(state: TrustScorerState, weights: Partial<{ authorReputation: number; provenance: number; signatures: number; age: number; size: number }>): TrustScorerState {
  return { ...state, weights: { ...state.weights, ...weights } };
}

export function scoreTrust(state: TrustScorerState, docId: string, factors: { authorReputation: number; provenance: number; signatures: number; age: number; size: number }): TrustScorerState {
  const w = state.weights;
  const score = Math.min(1, Math.max(0,
    factors.authorReputation * w.authorReputation +
    factors.provenance * w.provenance +
    factors.signatures * w.signatures +
    factors.age * w.age +
    factors.size * w.size
  ));
  const trustScore: TrustScore = { docId, score, factors: [
    { name: 'authorReputation', weight: w.authorReputation, value: factors.authorReputation },
    { name: 'provenance', weight: w.provenance, value: factors.provenance },
    { name: 'signatures', weight: w.signatures, value: factors.signatures },
    { name: 'age', weight: w.age, value: factors.age },
    { name: 'size', weight: w.size, value: factors.size },
  ], timestamp: Date.now() };
  return { ...state, scores: new Map(state.scores).set(docId, trustScore), totalScores: state.totalScores + 1 };
}

export function getTrustScore(state: TrustScorerState, docId: string): TrustScore | undefined {
  return state.scores.get(docId);
}

export function getHighTrustDocs(state: TrustScorerState, threshold: number = 0.8): TrustScore[] {
  return Array.from(state.scores.values()).filter(s => s.score >= threshold);
}

export function getLowTrustDocs(state: TrustScorerState, threshold: number = 0.5): TrustScore[] {
  return Array.from(state.scores.values()).filter(s => s.score < threshold);
}

export function clearTrustScores(state: TrustScorerState): TrustScorerState {
  return { ...state, scores: new Map() };
}

export function getTrustScorerReport(state: TrustScorerState): { totalScores: number; avgScore: number; highTrust: number; lowTrust: number } {
  const scores = Array.from(state.scores.values());
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b.score, 0) / scores.length : 0;
  return { totalScores: state.totalScores, avgScore, highTrust: getHighTrustDocs(state).length, lowTrust: getLowTrustDocs(state).length };
}
