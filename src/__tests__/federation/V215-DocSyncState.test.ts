import { describe, it, expect } from 'vitest';
import {
  createDocSyncState, setDocSyncState, markOffline, markSyncing, markSynced, markConflict,
  getDocState, getDocsByState, incrementPendingOps, clearDocSyncState, getDocSyncReport,
} from '../../federation/V215-DocSyncState';

describe('V215 DocSyncState', () => {
  it('should create empty state', () => {
    const s = createDocSyncState();
    expect(s.states.size).toBe(0);
  });

  it('should set initial state from offline', () => {
    let s = createDocSyncState();
    s = setDocSyncState(s, 'doc1', 'device1', 'offline');
    expect(s.states.size).toBe(1);
  });

  it('should mark offline', () => {
    let s = createDocSyncState();
    s = markOffline(s, 'd1', 'dev1');
    expect(getDocState(s, 'd1')!.state).toBe('offline');
  });

  it('should mark syncing then synced', () => {
    let s = createDocSyncState();
    s = markOffline(s, 'd1', 'dev1');
    s = markSyncing(s, 'd1', 'dev1');
    expect(getDocState(s, 'd1')!.state).toBe('syncing');
    s = markSynced(s, 'd1', 'dev1');
    expect(getDocState(s, 'd1')!.state).toBe('synced');
  });

  it('should mark conflict', () => {
    let s = createDocSyncState();
    s = markOffline(s, 'd1', 'dev1');
    s = markSyncing(s, 'd1', 'dev1');
    s = markConflict(s, 'd1', 'dev1', 'concurrent edit');
    expect(getDocState(s, 'd1')!.state).toBe('conflict');
  });

  it('should get docs by state', () => {
    let s = createDocSyncState();
    s = markOffline(s, 'd1', 'dev1');
    s = markOffline(s, 'd2', 'dev1');
    s = markOffline(s, 'd3', 'dev1');
    s = markSyncing(s, 'd1', 'dev1');
    expect(getDocsByState(s, 'offline')).toHaveLength(2);
    expect(getDocsByState(s, 'syncing')).toHaveLength(1);
  });

  it('should increment pending ops', () => {
    let s = createDocSyncState();
    s = markOffline(s, 'd1', 'dev1');
    s = incrementPendingOps(s, 'd1', 'dev1', 3);
    expect(getDocState(s, 'd1')!.pendingOps).toBe(3);
  });

  it('should clear doc sync state', () => {
    let s = createDocSyncState();
    s = markOffline(s, 'd1', 'dev1');
    s = clearDocSyncState(s, 'd1');
    expect(s.states.size).toBe(0);
  });

  it('should produce report', () => {
    let s = createDocSyncState();
    s = markOffline(s, 'd1', 'dev1');
    s = markOffline(s, 'd2', 'dev1');
    s = incrementPendingOps(s, 'd1', 'dev1', 5);
    const r = getDocSyncReport(s);
    expect(r.total).toBe(2);
    expect(r.totalPendingOps).toBe(5);
  });

  it('should reject invalid transition', () => {
    let s = createDocSyncState();
    s = markSynced(s, 'd1', 'dev1');
    // From synced, conflict is not valid
    s = markConflict(s, 'd1', 'dev1', 'should fail');
    expect(getDocState(s, 'd1')!.state).toBe('synced');
  });
});
