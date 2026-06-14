/**
 * V288 TrustSnapshot - Direction E Trust Verification (Iter 14/30)
 * nanobot: Snapshot document trust state at a point in time
 */
export interface TrustSnapshot {
  id: string;
  docId: string;
  trustState: Record<string, any>;
  timestamp: number;
  label: string;
}

export interface TrustDiff {
  from: string;
  to: string;
  changes: Record<string, { from: any; to: any }>;
}

export interface TrustSnapshotState {
  snapshots: Map<string, TrustSnapshot>;
  diffs: TrustDiff[];
  nextId: number;
}

export function createTrustSnapshotState(): TrustSnapshotState {
  return { snapshots: new Map(), diffs: [], nextId: 1 };
}

export function takeTrustSnapshot(state: TrustSnapshotState, docId: string, trustState: Record<string, any>, label: string): { state: TrustSnapshotState; snapshotId: string } {
  const id = `tsnap-${state.nextId}`;
  const snap: TrustSnapshot = { id, docId, trustState, timestamp: Date.now(), label };
  return { state: { ...state, snapshots: new Map(state.snapshots).set(id, snap), nextId: state.nextId + 1 }, snapshotId: id };
}

export function compareTrustSnapshots(state: TrustSnapshotState, fromId: string, toId: string): { state: TrustSnapshotState; diff: TrustDiff } {
  const from = state.snapshots.get(fromId);
  const to = state.snapshots.get(toId);
  if (!from || !to) return { state, diff: { from: fromId, to: toId, changes: {} } };
  const changes: Record<string, { from: any; to: any }> = {};
  const allKeys = new Set([...Object.keys(from.trustState), ...Object.keys(to.trustState)]);
  for (const key of allKeys) {
    if (JSON.stringify(from.trustState[key]) !== JSON.stringify(to.trustState[key])) {
      changes[key] = { from: from.trustState[key], to: to.trustState[key] };
    }
  }
  const diff: TrustDiff = { from: fromId, to: toId, changes };
  return { state: { ...state, diffs: [...state.diffs, diff].slice(-100) }, diff };
}

export function getTrustSnapshot(state: TrustSnapshotState, id: string): TrustSnapshot | undefined {
  return state.snapshots.get(id);
}

export function getSnapshotsForDoc(state: TrustSnapshotState, docId: string): TrustSnapshot[] {
  return Array.from(state.snapshots.values()).filter(s => s.docId === docId);
}

export function getRecentDiffs(state: TrustSnapshotState, count: number = 10): TrustDiff[] {
  return state.diffs.slice(-count);
}

export function clearTrustSnapshots(state: TrustSnapshotState): TrustSnapshotState {
  return createTrustSnapshotState();
}

export function getTrustSnapshotReport(state: TrustSnapshotState): { total: number; diffs: number; byLabel: Record<string, number> } {
  const byLabel: Record<string, number> = {};
  for (const s of state.snapshots.values()) byLabel[s.label] = (byLabel[s.label] || 0) + 1;
  return { total: state.snapshots.size, diffs: state.diffs.length, byLabel };
}
