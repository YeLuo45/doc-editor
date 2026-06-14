import { describe, it, expect } from 'vitest';
import {
  createPerfSnapshotState, takeSnapshot, deleteSnapshot, getSnapshot, getSnapshotsByLabel,
  compareSnapshots, getRecentDiffs, clearSnapshots, getPerfSnapshotReport,
} from '../../perf/V258-PerfSnapshot';

describe('V258 PerfSnapshot', () => {
  it('should create empty state', () => {
    const s = createPerfSnapshotState();
    expect(s.snapshots.size).toBe(0);
  });

  it('should take snapshot', () => {
    const s = createPerfSnapshotState();
    const r = takeSnapshot(s, 'baseline', { fps: 60, memory: 100 });
    expect(r.state.snapshots.size).toBe(1);
  });

  it('should delete snapshot', () => {
    let s = createPerfSnapshotState();
    const r = takeSnapshot(s, 'a', {});
    s = deleteSnapshot(r.state, r.snapshotId);
    expect(s.snapshots.size).toBe(0);
  });

  it('should get snapshot by id', () => {
    let s = createPerfSnapshotState();
    const r = takeSnapshot(s, 'a', {});
    s = r.state;
    expect(getSnapshot(s, r.snapshotId)).toBeDefined();
  });

  it('should get snapshots by label', () => {
    let s = createPerfSnapshotState();
    s = takeSnapshot(s, 'baseline', {}).state;
    s = takeSnapshot(s, 'optimized', {}).state;
    s = takeSnapshot(s, 'baseline', {}).state;
    expect(getSnapshotsByLabel(s, 'baseline')).toHaveLength(2);
  });

  it('should compare snapshots', () => {
    let s = createPerfSnapshotState();
    const r1 = takeSnapshot(s, 'a', { fps: 60, memory: 100 });
    s = r1.state;
    const r2 = takeSnapshot(s, 'b', { fps: 30, memory: 200 });
    s = r2.state;
    const r = compareSnapshots(s, r1.snapshotId, r2.snapshotId);
    expect(r.diff.changes.fps.delta).toBe(-30);
    expect(r.diff.changes.memory.delta).toBe(100);
  });

  it('should compare with missing snapshot', () => {
    const s = createPerfSnapshotState();
    const r = compareSnapshots(s, 'missing1', 'missing2');
    expect(r.diff.changes).toEqual({});
  });

  it('should get recent diffs', () => {
    let s = createPerfSnapshotState();
    const r1 = takeSnapshot(s, 'a', { x: 1 });
    s = r1.state;
    const r2 = takeSnapshot(s, 'b', { x: 2 });
    s = r2.state;
    const r = compareSnapshots(s, r1.snapshotId, r2.snapshotId);
    s = r.state;
    expect(getRecentDiffs(s, 5)).toHaveLength(1);
  });

  it('should clear snapshots', () => {
    let s = createPerfSnapshotState();
    s = takeSnapshot(s, 'a', {}).state;
    s = clearSnapshots(s);
    expect(s.snapshots.size).toBe(0);
  });

  it('should handle percent calculation with zero baseline', () => {
    let s = createPerfSnapshotState();
    const r1 = takeSnapshot(s, 'a', { x: 0 });
    s = r1.state;
    const r2 = takeSnapshot(s, 'b', { x: 10 });
    s = r2.state;
    const r = compareSnapshots(s, r1.snapshotId, r2.snapshotId);
    expect(r.diff.changes.x.percent).toBe(100);
  });

  it('should produce report', () => {
    let s = createPerfSnapshotState();
    s = takeSnapshot(s, 'a', {}).state;
    s = takeSnapshot(s, 'b', {}).state;
    const r = getPerfSnapshotReport(s);
    expect(r.total).toBe(2);
    expect(r.byLabel.a).toBe(1);
  });
});
