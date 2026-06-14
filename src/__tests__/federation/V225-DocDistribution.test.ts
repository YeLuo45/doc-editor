import { describe, it, expect } from 'vitest';
import {
  createDocDistributionState, setDistributionMode, addTarget, markSynced, markFailed,
  markOutOfSync, getTargetsForDoc, getTarget, removeTarget, getDocDistributionReport,
} from '../../federation/V225-DocDistribution';

describe('V225 DocDistribution', () => {
  it('should create empty state', () => {
    const s = createDocDistributionState();
    expect(s.distributions.size).toBe(0);
  });

  it('should set mode', () => {
    let s = createDocDistributionState();
    s = setDistributionMode(s, 'multi_primary');
    expect(s.mode).toBe('multi_primary');
  });

  it('should add target', () => {
    let s = createDocDistributionState();
    s = addTarget(s, { instanceId: 'i1', deviceId: 'd1', docId: 'doc1' });
    expect(getTargetsForDoc(s, 'doc1')).toHaveLength(1);
  });

  it('should mark synced', () => {
    let s = createDocDistributionState();
    s = addTarget(s, { instanceId: 'i1', deviceId: 'd1', docId: 'doc1' });
    s = markSynced(s, 'doc1', 'i1', 2);
    expect(getTarget(s, 'doc1', 'i1')!.status).toBe('synced');
    expect(getTarget(s, 'doc1', 'i1')!.version).toBe(2);
  });

  it('should mark failed', () => {
    let s = createDocDistributionState();
    s = addTarget(s, { instanceId: 'i1', deviceId: 'd1', docId: 'doc1' });
    s = markFailed(s, 'doc1', 'i1');
    expect(getTarget(s, 'doc1', 'i1')!.status).toBe('failed');
  });

  it('should mark out of sync', () => {
    let s = createDocDistributionState();
    s = addTarget(s, { instanceId: 'i1', deviceId: 'd1', docId: 'doc1' });
    s = markOutOfSync(s, 'doc1', 'i1');
    expect(getTarget(s, 'doc1', 'i1')!.status).toBe('out_of_sync');
  });

  it('should get target', () => {
    let s = createDocDistributionState();
    s = addTarget(s, { instanceId: 'i1', deviceId: 'd1', docId: 'doc1' });
    expect(getTarget(s, 'doc1', 'i1')).toBeDefined();
  });

  it('should return undefined for missing target', () => {
    const s = createDocDistributionState();
    expect(getTarget(s, 'missing', 'i1')).toBeUndefined();
  });

  it('should remove target', () => {
    let s = createDocDistributionState();
    s = addTarget(s, { instanceId: 'i1', deviceId: 'd1', docId: 'doc1' });
    s = removeTarget(s, 'doc1', 'i1');
    expect(getTargetsForDoc(s, 'doc1')).toHaveLength(0);
  });

  it('should produce report', () => {
    let s = createDocDistributionState();
    s = addTarget(s, { instanceId: 'i1', deviceId: 'd1', docId: 'doc1' });
    s = addTarget(s, { instanceId: 'i2', deviceId: 'd2', docId: 'doc1' });
    const r = getDocDistributionReport(s);
    expect(r.totalTargets).toBe(2);
    expect(r.byDoc.doc1).toBe(2);
  });
});
