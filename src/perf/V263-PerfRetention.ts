/**
 * V263 PerfRetention - Direction D Perf Compression (Iter 19/30)
 * ruflo: How long to keep perf data (TTL-based)
 */
export interface RetentionPolicy {
  name: string;
  maxAgeMs: number;
  maxItems: number;
}

export interface PerfDataItem {
  id: string;
  policy: string;
  timestamp: number;
  data: any;
}

export interface PerfRetentionState {
  items: Map<string, PerfDataItem>;
  policies: Map<string, RetentionPolicy>;
  nextId: number;
  totalPruned: number;
  totalRetained: number;
}

export function createPerfRetentionState(): PerfRetentionState {
  return { items: new Map(), policies: new Map(), nextId: 1, totalPruned: 0, totalRetained: 0 };
}

export function setPolicy(state: PerfRetentionState, policy: RetentionPolicy): PerfRetentionState {
  return { ...state, policies: new Map(state.policies).set(policy.name, policy) };
}

export function addItem(state: PerfRetentionState, policyName: string, data: any): { state: PerfRetentionState; itemId: string } {
  const id = `item-${state.nextId}`;
  const item: PerfDataItem = { id, policy: policyName, timestamp: Date.now(), data };
  return { state: { ...state, items: new Map(state.items).set(id, item), nextId: state.nextId + 1, totalRetained: state.totalRetained + 1 }, itemId: id };
}

export function pruneExpired(state: PerfRetentionState, now: number = Date.now()): PerfRetentionState {
  const items = new Map(state.items);
  let pruned = 0;
  for (const [id, item] of Array.from(items.entries())) {
    const policy = state.policies.get(item.policy);
    if (policy && now - item.timestamp > policy.maxAgeMs) {
      items.delete(id);
      pruned++;
    }
  }
  return { ...state, items, totalPruned: state.totalPruned + pruned };
}

export function pruneExcess(state: PerfRetentionState): PerfRetentionState {
  const items = new Map(state.items);
  let pruned = 0;
  for (const [policyName, policy] of state.policies.entries()) {
    const policyItems = Array.from(items.values()).filter(i => i.policy === policyName);
    if (policyItems.length > policy.maxItems) {
      const toRemove = policyItems.slice(0, policyItems.length - policy.maxItems);
      for (const item of toRemove) {
        items.delete(item.id);
        pruned++;
      }
    }
  }
  return { ...state, items, totalPruned: state.totalPruned + pruned };
}

export function getItemsByPolicy(state: PerfRetentionState, policyName: string): PerfDataItem[] {
  return Array.from(state.items.values()).filter(i => i.policy === policyName);
}

export function getItem(state: PerfRetentionState, id: string): PerfDataItem | undefined {
  return state.items.get(id);
}

export function clearItems(state: PerfRetentionState): PerfRetentionState {
  return { ...state, items: new Map() };
}

export function getPerfRetentionReport(state: PerfRetentionState): { total: number; policies: number; pruned: number; retained: number } {
  return { total: state.items.size, policies: state.policies.size, pruned: state.totalPruned, retained: state.totalRetained };
}
