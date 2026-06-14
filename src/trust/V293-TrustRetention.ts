/**
 * V293 TrustRetention - Direction E Trust Verification (Iter 19/30)
 * ruflo: TTL-based retention of trust data
 */
export interface RetentionPolicy {
  name: string;
  maxAgeMs: number;
  maxItems: number;
}

export interface TrustDataItem {
  id: string;
  policy: string;
  timestamp: number;
  data: any;
}

export interface TrustRetentionState {
  items: Map<string, TrustDataItem>;
  policies: Map<string, RetentionPolicy>;
  nextId: number;
  totalPruned: number;
}

export function createTrustRetentionState(): TrustRetentionState {
  return { items: new Map(), policies: new Map(), nextId: 1, totalPruned: 0 };
}

export function setRetentionPolicy(state: TrustRetentionState, policy: RetentionPolicy): TrustRetentionState {
  return { ...state, policies: new Map(state.policies).set(policy.name, policy) };
}

export function addTrustItem(state: TrustRetentionState, policyName: string, data: any): { state: TrustRetentionState; itemId: string } {
  const id = `titem-${state.nextId}`;
  const item: TrustDataItem = { id, policy: policyName, timestamp: Date.now(), data };
  return { state: { ...state, items: new Map(state.items).set(id, item), nextId: state.nextId + 1 }, itemId: id };
}

export function pruneExpired(state: TrustRetentionState, now: number = Date.now()): TrustRetentionState {
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

export function pruneExcess(state: TrustRetentionState): TrustRetentionState {
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

export function getItemsByPolicy(state: TrustRetentionState, policyName: string): TrustDataItem[] {
  return Array.from(state.items.values()).filter(i => i.policy === policyName);
}

export function getTrustItem(state: TrustRetentionState, id: string): TrustDataItem | undefined {
  return state.items.get(id);
}

export function clearTrustItems(state: TrustRetentionState): TrustRetentionState {
  return { ...state, items: new Map() };
}

export function getTrustRetentionReport(state: TrustRetentionState): { total: number; policies: number; pruned: number } {
  return { total: state.items.size, policies: state.policies.size, pruned: state.totalPruned };
}
