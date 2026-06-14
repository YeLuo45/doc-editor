/**
 * V233 SyncAudit - Direction C Doc Federation (Iter 19/30)
 * ruflo: Audit all sync operations (input/output/decision)
 */
export type AuditAction = 'sync_start' | 'sync_end' | 'conflict_detected' | 'conflict_resolved' | 'distribution' | 'replication';

export interface AuditEntry {
  id: number;
  timestamp: number;
  action: AuditAction;
  docId: string;
  deviceId: string;
  input: any;
  output: any;
  decision: string;
}

export interface SyncAuditState {
  entries: AuditEntry[];
  nextId: number;
  totalEntries: number;
}

export function createSyncAuditState(): SyncAuditState {
  return { entries: [], nextId: 1, totalEntries: 0 };
}

export function recordAudit(state: SyncAuditState, action: AuditAction, docId: string, deviceId: string, input: any, output: any, decision: string): SyncAuditState {
  const entry: AuditEntry = { id: state.nextId, timestamp: Date.now(), action, docId, deviceId, input, output, decision };
  return { ...state, entries: [...state.entries, entry].slice(-1000), nextId: state.nextId + 1, totalEntries: state.totalEntries + 1 };
}

export function getAuditByAction(state: SyncAuditState, action: AuditAction): AuditEntry[] {
  return state.entries.filter(e => e.action === action);
}

export function getAuditByDoc(state: SyncAuditState, docId: string): AuditEntry[] {
  return state.entries.filter(e => e.docId === docId);
}

export function getAuditByDevice(state: SyncAuditState, deviceId: string): AuditEntry[] {
  return state.entries.filter(e => e.deviceId === deviceId);
}

export function getRecentAudit(state: SyncAuditState, count: number = 10): AuditEntry[] {
  return state.entries.slice(-count);
}

export function searchAuditByDecision(state: SyncAuditState, keyword: string): AuditEntry[] {
  return state.entries.filter(e => e.decision.includes(keyword));
}

export function clearAudit(state: SyncAuditState): SyncAuditState {
  return createSyncAuditState();
}

export function getSyncAuditReport(state: SyncAuditState): { total: number; byAction: Record<string, number>; byDoc: Record<string, number> } {
  const byAction: Record<string, number> = {};
  const byDoc: Record<string, number> = {};
  for (const e of state.entries) {
    byAction[e.action] = (byAction[e.action] || 0) + 1;
    byDoc[e.docId] = (byDoc[e.docId] || 0) + 1;
  }
  return { total: state.totalEntries, byAction, byDoc };
}
