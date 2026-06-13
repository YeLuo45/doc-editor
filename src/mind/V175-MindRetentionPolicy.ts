/**
 * V175 MindRetentionPolicy - Direction A Writing Mind (Iter 21/30)
 * ruflo: memory retention policy (TTL/age/importance-based)
 */
export type RetentionStrategy = 'fifo' | 'lru' | 'importance' | 'hybrid';

export interface MemoryItem {
  id: string;
  content: string;
  createdAt: number;
  lastAccess: number;
  importance: number;       // 0..1
  accessCount: number;
}

export interface RetentionState {
  items: Map<string, MemoryItem>;
  strategy: RetentionStrategy;
  maxItems: number;
  defaultTtl: number;
  importanceFloor: number;
  evicted: number;
}

export function createRetentionState(): RetentionState {
  return {
    items: new Map(),
    strategy: 'hybrid',
    maxItems: 100,
    defaultTtl: 7 * 24 * 60 * 60 * 1000,  // 7 days
    importanceFloor: 0.2,
    evicted: 0,
  };
}

export function addMemory(state: RetentionState, item: MemoryItem): RetentionState {
  const items = new Map(state.items);
  items.set(item.id, item);
  const next = { ...state, items };
  return applyRetention(next);
}

export function accessMemory(state: RetentionState, id: string): RetentionState {
  const item = state.items.get(id);
  if (!item) return state;
  const items = new Map(state.items);
  items.set(id, { ...item, lastAccess: Date.now(), accessCount: item.accessCount + 1 });
  return { ...state, items };
}

export function removeMemory(state: RetentionState, id: string): RetentionState {
  const items = new Map(state.items);
  items.delete(id);
  return { ...state, items };
}

function applyRetention(state: RetentionState): RetentionState {
  if (state.items.size <= state.maxItems) return state;
  const candidates: MemoryItem[] = Array.from(state.items.values());
  const now = Date.now();
  let sorted: MemoryItem[];
  if (state.strategy === 'fifo') {
    sorted = candidates.sort((a, b) => a.createdAt - b.createdAt);
  } else if (state.strategy === 'lru') {
    sorted = candidates.sort((a, b) => a.lastAccess - b.lastAccess);
  } else if (state.strategy === 'importance') {
    sorted = candidates.sort((a, b) => a.importance - b.importance);
  } else {
    // hybrid: importance * 0.5 + recency * 0.3 + access count factor * 0.2
    sorted = candidates.sort((a, b) => {
      const scoreA = a.importance * 0.5 + (1 - (now - a.lastAccess) / state.defaultTtl) * 0.3 + Math.min(a.accessCount / 10, 1) * 0.2;
      const scoreB = b.importance * 0.5 + (1 - (now - b.lastAccess) / state.defaultTtl) * 0.3 + Math.min(b.accessCount / 10, 1) * 0.2;
      return scoreA - scoreB;
    });
  }
  // Keep top maxItems, evict the rest
  const toEvict = sorted.slice(0, sorted.length - state.maxItems);
  const items = new Map(state.items);
  for (const item of toEvict) {
    if (item.importance < state.importanceFloor) {
      items.delete(item.id);
    }
  }
  return { ...state, items, evicted: state.evicted + toEvict.filter(i => i.importance < state.importanceFloor).length };
}

export function setStrategy(state: RetentionState, strategy: RetentionStrategy): RetentionState {
  return { ...state, strategy };
}

export function setMaxItems(state: RetentionState, max: number): RetentionState {
  const next = { ...state, maxItems: max };
  return applyRetention(next);
}

export function pruneExpired(state: RetentionState, now: number = Date.now()): RetentionState {
  const items = new Map(state.items);
  let count = 0;
  for (const [id, item] of Array.from(items.entries())) {
    if (now - item.createdAt > state.defaultTtl) {
      items.delete(id);
      count++;
    }
  }
  return { ...state, items, evicted: state.evicted + count };
}

export function getMemory(state: RetentionState, id: string): MemoryItem | undefined {
  return state.items.get(id);
}

export function getMemoriesByImportance(state: RetentionState, threshold: number): MemoryItem[] {
  return Array.from(state.items.values()).filter(i => i.importance >= threshold);
}

export function getRetentionReport(state: RetentionState): { total: number; maxItems: number; strategy: RetentionStrategy; evicted: number; byImportance: { high: number; mid: number; low: number } } {
  const items = Array.from(state.items.values());
  const byImportance = { high: 0, mid: 0, low: 0 };
  for (const i of items) {
    if (i.importance >= 0.7) byImportance.high++;
    else if (i.importance >= 0.4) byImportance.mid++;
    else byImportance.low++;
  }
  return { total: items.length, maxItems: state.maxItems, strategy: state.strategy, evicted: state.evicted, byImportance };
}
