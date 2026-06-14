/**
 * V218 ConflictDetector - Direction C Doc Federation (Iter 4/30)
 * thunderbolt: Detect sync conflicts between local and remote operations
 */
export type ConflictType = 'concurrent_edit' | 'delete_edit' | 'type_mismatch' | 'dependency' | 'order';

export interface Op {
  id: string;
  type: 'insert' | 'delete' | 'update' | 'move';
  path: string;
  value?: any;
  timestamp: number;
  deviceId: string;
}

export interface Conflict {
  type: ConflictType;
  localOp: Op;
  remoteOp: Op;
  path: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface ConflictDetectorState {
  conflicts: Conflict[];
  nextId: number;
}

export function createConflictDetectorState(): ConflictDetectorState {
  return { conflicts: [], nextId: 1 };
}

export function detectConflict(state: ConflictDetectorState, local: Op, remote: Op): { state: ConflictDetectorState; conflict?: Conflict } {
  // Different paths, no conflict
  if (local.path !== remote.path) return { state };
  // Same path, check conflict type
  const timeDiff = Math.abs(local.timestamp - remote.timestamp);
  const CONCURRENT_THRESHOLD = 1000; // 1 second
  let conflict: Conflict | undefined;
  if (local.type === 'delete' && remote.type === 'update') {
    conflict = { type: 'delete_edit', localOp: local, remoteOp: remote, path: local.path, severity: 'high', description: 'Remote update conflicts with local delete' };
  } else if (local.type === 'update' && remote.type === 'delete') {
    conflict = { type: 'delete_edit', localOp: local, remoteOp: remote, path: local.path, severity: 'high', description: 'Local update conflicts with remote delete' };
  } else if (local.type === 'update' && remote.type === 'update' && timeDiff < CONCURRENT_THRESHOLD) {
    conflict = { type: 'concurrent_edit', localOp: local, remoteOp: remote, path: local.path, severity: 'medium', description: 'Concurrent edits to same path' };
  } else if (local.type === 'insert' && remote.type === 'insert' && timeDiff < CONCURRENT_THRESHOLD) {
    conflict = { type: 'concurrent_edit', localOp: local, remoteOp: remote, path: local.path, severity: 'low', description: 'Concurrent inserts to same path' };
  } else if (local.type !== remote.type && timeDiff < CONCURRENT_THRESHOLD) {
    conflict = { type: 'type_mismatch', localOp: local, remoteOp: remote, path: local.path, severity: 'medium', description: 'Type mismatch on same path' };
  }
  if (!conflict) return { state };
  return { state: { ...state, conflicts: [...state.conflicts, conflict].slice(-200), nextId: state.nextId + 1 }, conflict };
}

export function getConflictsByPath(state: ConflictDetectorState, path: string): Conflict[] {
  return state.conflicts.filter(c => c.path === path);
}

export function getConflictsBySeverity(state: ConflictDetectorState, severity: Conflict['severity']): Conflict[] {
  return state.conflicts.filter(c => c.severity === severity);
}

export function resolveConflictAt(state: ConflictDetectorState, index: number): ConflictDetectorState {
  return { ...state, conflicts: state.conflicts.filter((_, i) => i !== index) };
}

export function clearConflicts(state: ConflictDetectorState): ConflictDetectorState {
  return { ...state, conflicts: [] };
}

export function getConflictDetectorReport(state: ConflictDetectorState): { total: number; byType: Record<string, number>; bySeverity: Record<string, number> } {
  const byType: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  for (const c of state.conflicts) {
    byType[c.type] = (byType[c.type] || 0) + 1;
    bySeverity[c.severity] = (bySeverity[c.severity] || 0) + 1;
  }
  return { total: state.conflicts.length, byType, bySeverity };
}
