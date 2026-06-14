import { describe, it, expect } from 'vitest';
import {
  createTrustSnapshotState, takeTrustSnapshot, compareTrustSnapshots,
  getTrustSnapshot, getSnapshotsForDoc, getRecentDiffs, clearTrustSnapshots, getTrustSnapshotReport,
} from '../../trust/V288-TrustSnapshot';

describe('V288 TrustSnapshot', () => {
  it('should create empty state', () => {
    const s = createTrustSnapshotState();
    expect(s.snapshots.size).toBe(0);
  });

  it('should take snapshot', () => {
    const s = createTrustSnapshotState();
    const r = takeTrustSnapshot(s, 'd1', { score: 0.9 }, 'baseline');
    expect(r.state.snapshots.size).toBe(1);
  });

  it('should compare snapshots with no changes', () => {
    let s = createTrustSnapshotState();
    const r1 = takeTrustSnapshot(s, 'd1', { score: 0.9 }, 'a');
    s = r1.state;
    const r2 = takeTrustSnapshot(s, 'd1', { score: 0.9 }, 'b');
    s = r2.state;
    const c = compareTrustSnapshots(s, r1.snapshotId, r2.snapshotId);
    expect(Object.keys(c.diff.changes).length).toBe(0);
  });

  it('should compare snapshots with changes', () => {
    let s = createTrustSnapshotState();
    const r1 = takeTrustSnapshot(s, 'd1', { score: 0.9 }, 'a');
    s = r1.state;
    const r2 = takeTrustSnapshot(s, 'd1', { score: 0.5 }, 'b');
    s = r2.state;
    const c = compareTrustSnapshots(s, r1.snapshotId, r2.snapshotId);
    expect(c.diff.changes.score.from).toBe(0.9);
    expect(c.diff.changes.score.to).toBe(0.5);
  });

  it('should return empty diff for missing snapshot', () => {
    const s = createTrustSnapshotState();
    const c = compareTrustSnapshots(s, 'm1', 'm2');
    expect(c.diff.changes).toEqual({});
  });

  it('should get snapshot by id', () => {
    let s = createTrustSnapshotState();
    const r = takeTrustSnapshot(s, 'd1', { score: 0.9 }, 'a');
    s = r.state;
    expect(getTrustSnapshot(s, r.snapshotId)).toBeDefined();
  });

  it('should get snapshots for doc', () => {
    let s = createTrustSnapshotState();
    s = takeTrustSnapshot(s, 'd1', { a: 1 }, 'x').state;
    s = takeTrustSnapshot(s, 'd2', { a: 1 }, 'y').state;
    expect(getSnapshotsForDoc(s, 'd1')).toHaveLength(1);
  });

  it('should get recent diffs', () => {
    let s = createTrustSnapshotState();
    const r1 = takeTrustSnapshot(s, 'd1', { a: 1 }, 'x');
    s = r1.state;
    const r2 = takeTrustSnapshot(s, 'd1', { a: 2 }, 'y');
    s = r2.state;
    const c = compareTrustSnapshots(s, r1.snapshotId, r2.snapshotId);
    s = c.state;
    expect(getRecentDiffs(s, 5)).toHaveLength(1);
  });

  it('should clear snapshots', () => {
    let s = createTrustSnapshotState();
    s = takeTrustSnapshot(s, 'd1', { a: 1 }, 'x').state;
    s = clearTrustSnapshots(s);
    expect(s.snapshots.size).toBe(0);
  });

  it('should detect added keys', () => {
    let s = createTrustSnapshotState();
    const r1 = takeTrustSnapshot(s, 'd1', { a: 1 }, 'x');
    s = r1.state;
    const r2 = takeTrustSnapshot(s, 'd1', { a: 1, b: 2 }, 'y');
    s = r2.state;
    const c = compareTrustSnapshots(s, r1.snapshotId, r2.snapshotId);
    expect(c.diff.changes.b).toBeDefined();
  });

  it('should produce report', () => {
    let s = createTrustSnapshotState();
    s = takeTrustSnapshot(s, 'd1', { a: 1 }, 'baseline').state;
    s = takeTrustSnapshot(s, 'd2', { a: 1 }, 'baseline').state;
    const r = getTrustSnapshotReport(s);
    expect(r.total).toBe(2);
    expect(r.byLabel.baseline).toBe(2);
  });
});
