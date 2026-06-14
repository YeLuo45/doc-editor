/**
 * V215 DocSyncState - Direction C Doc Federation (Iter 1/30)
 * thunderbolt: Document sync state machine (offline/syncing/synced/conflict)
 */
export type SyncState = 'offline' | 'syncing' | 'synced' | 'conflict' | 'paused' | 'error';

export interface SyncStateRecord {
  docId: string;
  state: SyncState;
  lastSyncAt: number;
  pendingOps: number;
  deviceId: string;
  errorMessage?: string;
}

export interface DocSyncState {
  states: Map<string, SyncStateRecord>;
  history: Array<{ docId: string; from: SyncState; to: SyncState; timestamp: number; reason?: string }>;
}

const VALID: Record<SyncState, SyncState[]> = {
  offline: ['syncing', 'paused', 'error'],
  syncing: ['synced', 'conflict', 'paused', 'error'],
  synced: ['syncing', 'offline', 'paused'],
  conflict: ['syncing', 'offline', 'paused'],
  paused: ['syncing', 'offline'],
  error: ['syncing', 'offline'],
};

export function createDocSyncState(): DocSyncState {
  return { states: new Map(), history: [] };
}

export function setDocSyncState(state: DocSyncState, docId: string, deviceId: string, newState: SyncState, reason?: string, errorMessage?: string): DocSyncState {
  const current = state.states.get(docId);
  const from = current?.state || 'offline';
  if (current && !VALID[from].includes(newState)) {
    return state;
  }
  const record: SyncStateRecord = {
    docId,
    state: newState,
    lastSyncAt: Date.now(),
    pendingOps: current?.pendingOps || 0,
    deviceId,
    errorMessage,
  };
  return {
    ...state,
    states: new Map(state.states).set(docId, record),
    history: [...state.history, { docId, from, to: newState, timestamp: Date.now(), reason }].slice(-200),
  };
}

export function markOffline(state: DocSyncState, docId: string, deviceId: string): DocSyncState {
  return setDocSyncState(state, docId, deviceId, 'offline', 'no connection');
}

export function markSyncing(state: DocSyncState, docId: string, deviceId: string): DocSyncState {
  return setDocSyncState(state, docId, deviceId, 'syncing', 'starting sync');
}

export function markSynced(state: DocSyncState, docId: string, deviceId: string): DocSyncState {
  return setDocSyncState(state, docId, deviceId, 'synced', 'sync complete');
}

export function markConflict(state: DocSyncState, docId: string, deviceId: string, reason: string): DocSyncState {
  return setDocSyncState(state, docId, deviceId, 'conflict', reason);
}

export function getDocState(state: DocSyncState, docId: string): SyncStateRecord | undefined {
  return state.states.get(docId);
}

export function getDocsByState(state: DocSyncState, syncState: SyncState): SyncStateRecord[] {
  return Array.from(state.states.values()).filter(s => s.state === syncState);
}

export function incrementPendingOps(state: DocSyncState, docId: string, deviceId: string, count: number = 1): DocSyncState {
  const r = state.states.get(docId);
  if (!r) return state;
  return { ...state, states: new Map(state.states).set(docId, { ...r, pendingOps: r.pendingOps + count, deviceId }) };
}

export function clearDocSyncState(state: DocSyncState, docId: string): DocSyncState {
  const states = new Map(state.states);
  states.delete(docId);
  return { ...state, states };
}

export function getDocSyncReport(state: DocSyncState): { total: number; byState: Record<string, number>; totalPendingOps: number } {
  const records = Array.from(state.states.values());
  const byState: Record<string, number> = {};
  let totalPendingOps = 0;
  for (const r of records) {
    byState[r.state] = (byState[r.state] || 0) + 1;
    totalPendingOps += r.pendingOps;
  }
  return { total: records.length, byState, totalPendingOps };
}
