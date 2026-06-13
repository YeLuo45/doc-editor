/**
 * V168 MindSyncGateway - Direction A Writing Mind (Iter 14/30)
 * nanobot: cross-device sync gateway (CRDT delta sync)
 */
export type SyncOp = 'insert' | 'delete' | 'update';
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';

export interface SyncRecord {
  id: string;
  op: SyncOp;
  path: string;
  value: any;
  timestamp: number;
  deviceId: string;
  status: SyncStatus;
  version: number;
}

export interface SyncGatewayState {
  records: SyncRecord[];
  lastSyncTime: number;
  devices: Set<string>;
  pending: number;
  nextId: number;
}

function nextId(state: SyncGatewayState): string { return `sync-${state.nextId}-${Date.now()}`; }

export function createSyncGateway(): SyncGatewayState {
  return { records: [], lastSyncTime: 0, devices: new Set(), pending: 0, nextId: 1 };
}

export function enqueueSync(state: SyncGatewayState, op: SyncOp, path: string, value: any, deviceId: string): SyncGatewayState {
  const id = nextId(state);
  const record: SyncRecord = { id, op, path, value, timestamp: Date.now(), deviceId, status: 'pending', version: 1 };
  return {
    ...state,
    records: [...state.records, record].slice(-500),
    pending: state.pending + 1,
    nextId: state.nextId + 1,
  };
}

export function markSyncing(state: SyncGatewayState, id: string): SyncGatewayState {
  return { ...state, records: state.records.map(r => r.id === id ? { ...r, status: 'syncing' as SyncStatus } : r) };
}

export function markSynced(state: SyncGatewayState, id: string): SyncGatewayState {
  return {
    ...state,
    records: state.records.map(r => r.id === id ? { ...r, status: 'synced' as SyncStatus, version: r.version + 1 } : r),
    lastSyncTime: Date.now(),
    pending: Math.max(0, state.pending - 1),
  };
}

export function markFailed(state: SyncGatewayState, id: string): SyncGatewayState {
  return { ...state, records: state.records.map(r => r.id === id ? { ...r, status: 'failed' as SyncStatus } : r) };
}

export function markConflict(state: SyncGatewayState, id: string): SyncGatewayState {
  return { ...state, records: state.records.map(r => r.id === id ? { ...r, status: 'conflict' as SyncStatus } : r) };
}

export function getRecordsByPath(state: SyncGatewayState, path: string): SyncRecord[] {
  return state.records.filter(r => r.path === path);
}

export function getRecordsByStatus(state: SyncGatewayState, status: SyncStatus): SyncRecord[] {
  return state.records.filter(r => r.status === status);
}

export function resolveConflict(state: SyncGatewayState, id: string, _resolution: any): SyncGatewayState {
  return markSynced(state, id);
}

export function addDevice(state: SyncGatewayState, deviceId: string): SyncGatewayState {
  const devices = new Set(state.devices);
  devices.add(deviceId);
  return { ...state, devices };
}

export function getSyncReport(state: SyncGatewayState): { total: number; pending: number; synced: number; failed: number; conflict: number; devices: number } {
  const byStatus = (s: SyncStatus) => state.records.filter(r => r.status === s).length;
  return { total: state.records.length, pending: byStatus('pending') + byStatus('syncing'), synced: byStatus('synced'), failed: byStatus('failed'), conflict: byStatus('conflict'), devices: state.devices.size };
}
