/**
 * V169 MindCacheLayer - Direction A Writing Mind (Iter 15/30)
 * nanobot: writing analysis cache (TTL + LRU + invalidation)
 */
export interface CacheEntry<V = any> {
  key: string;
  value: V;
  expiresAt: number;
  lastAccess: number;
  hits: number;
  seq: number;
}

export interface CacheState<V = any> {
  entries: Map<string, CacheEntry<V>>;
  maxSize: number;
  defaultTtl: number;
  hits: number;
  misses: number;
  evictions: number;
  seqCounter: number;
}

function nextSeq(state: CacheState): number {
  state.seqCounter++;
  return state.seqCounter;
}

export function createCacheState(maxSize: number = 100, defaultTtl: number = 60000): CacheState {
  return { entries: new Map(), maxSize, defaultTtl, hits: 0, misses: 0, evictions: 0, seqCounter: 0 };
}

export function setCache<V>(state: CacheState<V>, key: string, value: V, ttl?: number): CacheState<V> {
  const now = Date.now();
  const entries = new Map(state.entries);
  let evictions = state.evictions;
  // Evict oldest if at capacity
  if (entries.size >= state.maxSize && !entries.has(key)) {
    let oldestKey: string | null = null;
    let oldestSeq = Infinity;
    for (const [k, v] of entries.entries()) {
      if (v.seq < oldestSeq) {
        oldestSeq = v.seq;
        oldestKey = k;
      }
    }
    if (oldestKey !== null) {
      entries.delete(oldestKey);
      evictions++;
    }
  }
  const newState = { ...state, entries, evictions };
  const entry: CacheEntry<V> = { key, value, expiresAt: now + (ttl ?? state.defaultTtl), lastAccess: now, hits: 0, seq: nextSeq(newState) };
  entries.set(key, entry);
  return newState;
}

export function getCache<V>(state: CacheState<V>, key: string): { state: CacheState<V>; value?: V } {
  const entry = state.entries.get(key);
  if (!entry) return { state: { ...state, misses: state.misses + 1 }, value: undefined };
  if (entry.expiresAt < Date.now()) {
    const entries = new Map(state.entries);
    entries.delete(key);
    return { state: { ...state, entries, misses: state.misses + 1 }, value: undefined };
  }
  const entries = new Map(state.entries);
  const newState = { ...state, entries };
  const updated: CacheEntry<V> = { ...entry, lastAccess: Date.now(), hits: entry.hits + 1, seq: nextSeq(newState) };
  entries.set(key, updated);
  return { state: { ...newState, hits: newState.hits + 1 }, value: entry.value };
}

export function deleteCache<V>(state: CacheState<V>, key: string): CacheState<V> {
  const entries = new Map(state.entries);
  entries.delete(key);
  return { ...state, entries };
}

export function invalidateByPrefix<V>(state: CacheState<V>, prefix: string): CacheState<V> {
  const entries = new Map(state.entries);
  for (const k of Array.from(entries.keys())) {
    if (k.startsWith(prefix)) entries.delete(k);
  }
  return { ...state, entries };
}

export function clearCache<V>(state: CacheState<V>): CacheState<V> {
  return { ...state, entries: new Map() };
}

export function pruneExpired<V>(state: CacheState<V>): CacheState<V> {
  const now = Date.now();
  const entries = new Map(state.entries);
  for (const [k, v] of Array.from(entries.entries())) {
    if (v.expiresAt < now) entries.delete(k);
  }
  return { ...state, entries };
}

export function getCacheReport<V>(state: CacheState<V>): { size: number; hits: number; misses: number; evictions: number; hitRate: number } {
  const total = state.hits + state.misses;
  return { size: state.entries.size, hits: state.hits, misses: state.misses, evictions: state.evictions, hitRate: total > 0 ? state.hits / total : 0 };
}
