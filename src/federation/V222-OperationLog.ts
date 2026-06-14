/**
 * V222 OperationLog - Direction C Doc Federation (Iter 8/30)
 * thunderbolt: Append-only operation log for replay and audit
 */
export interface LoggedOp {
  id: number;
  docId: string;
  opType: 'insert' | 'delete' | 'update' | 'move' | 'sync';
  path?: string;
  value?: any;
  deviceId: string;
  userId: string;
  timestamp: number;
  vectorClock: Record<string, number>;
}

export interface OperationLogState {
  entries: LoggedOp[];
  byDoc: Map<string, number[]>;  // docId -> list of entry IDs
  nextId: number;
  totalLogged: number;
}

export function createOperationLogState(): OperationLogState {
  return { entries: [], byDoc: new Map(), nextId: 1, totalLogged: 0 };
}

export function logOp(state: OperationLogState, op: Omit<LoggedOp, 'id' | 'timestamp'> & { timestamp?: number }): OperationLogState {
  const id = state.nextId;
  const timestamp = op.timestamp || Date.now();
  const entry: LoggedOp = { ...op, id, timestamp };
  const byDoc = new Map(state.byDoc);
  const ids = byDoc.get(op.docId) || [];
  byDoc.set(op.docId, [...ids, id].slice(-1000));
  return { ...state, entries: [...state.entries, entry].slice(-5000), byDoc, nextId: state.nextId + 1, totalLogged: state.totalLogged + 1 };
}

export function getEntry(state: OperationLogState, id: number): LoggedOp | undefined {
  return state.entries.find(e => e.id === id);
}

export function getEntriesByDoc(state: OperationLogState, docId: string): LoggedOp[] {
  const ids = state.byDoc.get(docId) || [];
  return ids.map(id => state.entries.find(e => e.id === id)).filter((e): e is LoggedOp => e !== undefined);
}

export function getEntriesByDevice(state: OperationLogState, deviceId: string): LoggedOp[] {
  return state.entries.filter(e => e.deviceId === deviceId);
}

export function getEntriesByUser(state: OperationLogState, userId: string): LoggedOp[] {
  return state.entries.filter(e => e.userId === userId);
}

export function getRecentEntries(state: OperationLogState, count: number = 10): LoggedOp[] {
  return state.entries.slice(-count);
}

export function clearOperationLog(state: OperationLogState): OperationLogState {
  return createOperationLogState();
}

export function getOperationLogReport(state: OperationLogState): { total: number; byDoc: Record<string, number>; byDevice: Record<string, number> } {
  const byDoc: Record<string, number> = {};
  const byDevice: Record<string, number> = {};
  for (const e of state.entries) {
    byDoc[e.docId] = (byDoc[e.docId] || 0) + 1;
    byDevice[e.deviceId] = (byDevice[e.deviceId] || 0) + 1;
  }
  return { total: state.entries.length, byDoc, byDevice };
}
