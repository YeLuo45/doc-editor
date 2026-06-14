/**
 * V258 PerfSnapshot - Direction D Perf Compression (Iter 14/30)
 * nanobot: Save/restore performance snapshots for comparison
 */
export interface Snapshot {
  id: string;
  label: string;
  timestamp: number;
  metrics: Record<string, number>;
}

export interface SnapshotDiff {
  from: string;
  to: string;
  changes: Record<string, { from: number; to: number; delta: number; percent: number }>;
}

export interface PerfSnapshotState {
  snapshots: Map<string, Snapshot>;
  diffs: SnapshotDiff[];
  nextId: number;
}

export function createPerfSnapshotState(): PerfSnapshotState {
  return { snapshots: new Map(), diffs: [], nextId: 1 };
}

export function takeSnapshot(state: PerfSnapshotState, label: string, metrics: Record<string, number>): { state: PerfSnapshotState; snapshotId: string } {
  const id = `snap-${state.nextId}`;
  const snapshot: Snapshot = { id, label, timestamp: Date.now(), metrics };
  return { state: { ...state, snapshots: new Map(state.snapshots).set(id, snapshot), nextId: state.nextId + 1 }, snapshotId: id };
}

export function deleteSnapshot(state: PerfSnapshotState, id: string): PerfSnapshotState {
  const snapshots = new Map(state.snapshots);
  snapshots.delete(id);
  return { ...state, snapshots };
}

export function getSnapshot(state: PerfSnapshotState, id: string): Snapshot | undefined {
  return state.snapshots.get(id);
}

export function getSnapshotsByLabel(state: PerfSnapshotState, label: string): Snapshot[] {
  return Array.from(state.snapshots.values()).filter(s => s.label === label);
}

export function compareSnapshots(state: PerfSnapshotState, fromId: string, toId: string): { state: PerfSnapshotState; diff: SnapshotDiff } {
  const from = state.snapshots.get(fromId);
  const to = state.snapshots.get(toId);
  if (!from || !to) {
    return { state, diff: { from: fromId, to: toId, changes: {} } };
  }
  const changes: Record<string, { from: number; to: number; delta: number; percent: number }> = {};
  const allKeys = new Set([...Object.keys(from.metrics), ...Object.keys(to.metrics)]);
  for (const key of allKeys) {
    const f = from.metrics[key] || 0;
    const t = to.metrics[key] || 0;
    const delta = t - f;
    const percent = f !== 0 ? (delta / f) * 100 : (t > 0 ? 100 : 0);
    changes[key] = { from: f, to: t, delta, percent };
  }
  const diff: SnapshotDiff = { from: fromId, to: toId, changes };
  return { state: { ...state, diffs: [...state.diffs, diff].slice(-100) }, diff };
}

export function getRecentDiffs(state: PerfSnapshotState, count: number = 10): SnapshotDiff[] {
  return state.diffs.slice(-count);
}

export function clearSnapshots(state: PerfSnapshotState): PerfSnapshotState {
  return { ...state, snapshots: new Map(), diffs: [] };
}

export function getPerfSnapshotReport(state: PerfSnapshotState): { total: number; diffs: number; byLabel: Record<string, number> } {
  const byLabel: Record<string, number> = {};
  for (const s of state.snapshots.values()) byLabel[s.label] = (byLabel[s.label] || 0) + 1;
  return { total: state.snapshots.size, diffs: state.diffs.length, byLabel };
}
