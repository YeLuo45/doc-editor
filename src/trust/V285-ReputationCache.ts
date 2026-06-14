/**
 * V285 ReputationCache - Direction E Trust Verification (Iter 11/30)
 * nanobot: Cache user/author reputation scores
 */
export interface ReputationRecord {
  userId: string;
  score: number;        // 0..1
  trustLevel: 'newcomer' | 'verified' | 'trusted' | 'expert';
  lastUpdated: number;
  evidence: { type: string; delta: number; timestamp: number }[];
}

export interface ReputationCacheState {
  cache: Map<string, ReputationRecord>;
  hits: number;
  misses: number;
  totalUpdates: number;
}

export function createReputationCacheState(): ReputationCacheState {
  return { cache: new Map(), hits: 0, misses: 0, totalUpdates: 0 };
}

export function getReputation(state: ReputationCacheState, userId: string): { state: ReputationCacheState; record: ReputationRecord; hit: boolean } {
  const record = state.cache.get(userId);
  if (record) {
    return { state: { ...state, hits: state.hits + 1 }, record, hit: true };
  }
  // Miss - create new
  const newRecord: ReputationRecord = { userId, score: 0.5, trustLevel: 'newcomer', lastUpdated: Date.now(), evidence: [] };
  return { state: { ...state, cache: new Map(state.cache).set(userId, newRecord), misses: state.misses + 1 }, record: newRecord, hit: false };
}

export function updateReputation(state: ReputationCacheState, userId: string, evidence: { type: string; delta: number }): ReputationCacheState {
  const existing = state.cache.get(userId) || { userId, score: 0.5, trustLevel: 'newcomer' as const, lastUpdated: Date.now(), evidence: [] };
  const newScore = Math.max(0, Math.min(1, existing.score + evidence.delta));
  const trustLevel: ReputationRecord['trustLevel'] = newScore >= 0.9 ? 'expert' : newScore >= 0.7 ? 'trusted' : newScore >= 0.5 ? 'verified' : 'newcomer';
  const updated: ReputationRecord = { ...existing, score: newScore, trustLevel, lastUpdated: Date.now(), evidence: [...existing.evidence, { type: evidence.type, delta: evidence.delta, timestamp: Date.now() }].slice(-20) };
  return { ...state, cache: new Map(state.cache).set(userId, updated), totalUpdates: state.totalUpdates + 1 };
}

export function invalidateReputation(state: ReputationCacheState, userId: string): ReputationCacheState {
  const cache = new Map(state.cache);
  cache.delete(userId);
  return { ...state, cache };
}

export function getTrustedUsers(state: ReputationCacheState, threshold: number = 0.7): ReputationRecord[] {
  return Array.from(state.cache.values()).filter(r => r.score >= threshold);
}

export function getUsersByTrustLevel(state: ReputationCacheState, level: ReputationRecord['trustLevel']): ReputationRecord[] {
  return Array.from(state.cache.values()).filter(r => r.trustLevel === level);
}

export function clearReputationCache(state: ReputationCacheState): ReputationCacheState {
  return createReputationCacheState();
}

export function getReputationCacheReport(state: ReputationCacheState): { hits: number; misses: number; totalUpdates: number; hitRate: number; totalUsers: number } {
  const total = state.hits + state.misses;
  return { hits: state.hits, misses: state.misses, totalUpdates: state.totalUpdates, hitRate: total > 0 ? state.hits / total : 0, totalUsers: state.cache.size };
}
