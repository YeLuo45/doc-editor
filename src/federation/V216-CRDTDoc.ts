/**
 * V216 CRDTDoc - Direction C Doc Federation (Iter 2/30)
 * thunderbolt: CRDT document core (LWW + OR-Set) for conflict-free replication
 */
export interface LWWEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  deviceId: string;
  tombstone: boolean;
}

export interface ORSetEntry {
  element: string;
  added: { timestamp: number; deviceId: string };
  removed?: { timestamp: number; deviceId: string };
}

export interface CRDTDocState {
  docId: string;
  lww: Map<string, LWWEntry<any>>;
  orset: Map<string, ORSetEntry>;
  clock: number;
  deviceId: string;
}

export function createCRDTDocState(docId: string, deviceId: string): CRDTDocState {
  return { docId, lww: new Map(), orset: new Map(), clock: 0, deviceId };
}

export function lwwSet<T>(state: CRDTDocState, key: string, value: T): CRDTDocState {
  const now = Date.now();
  const entry: LWWEntry<T> = { key, value, timestamp: now, deviceId: state.deviceId, tombstone: false };
  const existing = state.lww.get(key);
  if (existing && existing.timestamp > now) {
    return state;
  }
  state.clock++;
  return { ...state, lww: new Map(state.lww).set(key, entry) };
}

export function lwwDelete(state: CRDTDocState, key: string): CRDTDocState {
  const now = Date.now();
  const existing = state.lww.get(key);
  if (!existing) return state;
  const entry: LWWEntry<any> = { key, value: existing.value, timestamp: now, deviceId: state.deviceId, tombstone: true };
  state.clock++;
  return { ...state, lww: new Map(state.lww).set(key, entry) };
}

export function lwwGet<T>(state: CRDTDocState, key: string): T | undefined {
  const e = state.lww.get(key);
  if (!e || e.tombstone) return undefined;
  return e.value as T;
}

export function orsetAdd(state: CRDTDocState, element: string): CRDTDocState {
  const now = Date.now();
  const existing = state.orset.get(element);
  if (existing) return state;
  const entry: ORSetEntry = { element, added: { timestamp: now, deviceId: state.deviceId } };
  state.clock++;
  return { ...state, orset: new Map(state.orset).set(element, entry) };
}

export function orsetRemove(state: CRDTDocState, element: string): CRDTDocState {
  const now = Date.now();
  const existing = state.orset.get(element);
  if (existing && existing.removed) return state;
  if (existing) {
    const entry: ORSetEntry = { ...existing, removed: { timestamp: now, deviceId: state.deviceId } };
    state.clock++;
    return { ...state, orset: new Map(state.orset).set(element, entry) };
  } else {
    // Create tombstone for cross-device delete
    const entry: ORSetEntry = { element, added: { timestamp: 0, deviceId: '' }, removed: { timestamp: now, deviceId: state.deviceId } };
    state.clock++;
    return { ...state, orset: new Map(state.orset).set(element, entry) };
  }
}

export function orsetHas(state: CRDTDocState, element: string): boolean {
  const e = state.orset.get(element);
  return e !== undefined && !e.removed;
}

export function orsetList(state: CRDTDocState): string[] {
  return Array.from(state.orset.entries()).filter(([_, e]) => !e.removed).map(([k]) => k);
}

export function mergeCRDT(state1: CRDTDocState, state2: CRDTDocState): CRDTDocState {
  const merged: CRDTDocState = { ...state1, lww: new Map(state1.lww), orset: new Map(state1.orset) };
  // Merge LWW
  for (const [key, entry2] of state2.lww.entries()) {
    const entry1 = merged.lww.get(key);
    if (!entry1 || entry2.timestamp > entry1.timestamp) {
      merged.lww.set(key, entry2);
    }
  }
  // Merge OR-Set
  for (const [element, entry2] of state2.orset.entries()) {
    const entry1 = merged.orset.get(element);
    if (!entry1) {
      merged.orset.set(element, entry2);
    } else {
      // Add wins (only if added later)
      if (entry2.added.timestamp > entry1.added.timestamp) {
        merged.orset.set(element, { ...entry1, added: entry2.added });
      }
      // Remove wins
      if (entry2.removed && (!entry1.removed || entry2.removed.timestamp > entry1.removed.timestamp)) {
        merged.orset.set(element, { ...merged.orset.get(element)!, removed: entry2.removed });
      }
    }
  }
  merged.clock = Math.max(state1.clock, state2.clock) + 1;
  return merged;
}

export function getCRDTDocReport(state: CRDTDocState): { lwwSize: number; orsetSize: number; clock: number } {
  return { lwwSize: state.lww.size, orsetSize: Array.from(state.orset.values()).filter(e => !e.removed).length, clock: state.clock };
}
