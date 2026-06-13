import { describe, it, expect } from 'vitest';
import {
  createSyncGateway, enqueueSync, markSyncing, markSynced, markFailed,
  markConflict, getRecordsByPath, getRecordsByStatus, resolveConflict,
  addDevice, getSyncReport,
} from '../../mind/V168-MindSyncGateway';

describe('V168 MindSyncGateway', () => {
  it('should create empty gateway', () => {
    const s = createSyncGateway();
    expect(s.records).toHaveLength(0);
    expect(s.pending).toBe(0);
  });

  it('should enqueue sync', () => {
    let s = createSyncGateway();
    const state = enqueueSync(s, 'insert', '/docs/1', { text: 'hi' }, 'dev1'); const id = state.records[state.records.length - 1].id;
    expect(state.records).toHaveLength(1);
    expect(id).toMatch(/^sync-/);
    expect(state.pending).toBe(1);
  });

  it('should mark syncing', () => {
    let s = createSyncGateway();
    const state = enqueueSync(s, 'insert', '/a', {}, 'd1'); const id = state.records[0].id;
    s = markSyncing(state, id);
    expect(s.records[0].status).toBe('syncing');
  });

  it('should mark synced', () => {
    let s = createSyncGateway();
    const state = enqueueSync(s, 'insert', '/a', {}, 'd1'); const id = state.records[0].id;
    s = markSynced(state, id);
    expect(s.records[0].status).toBe('synced');
    expect(s.records[0].version).toBe(2);
    expect(s.pending).toBe(0);
  });

  it('should mark failed', () => {
    let s = createSyncGateway();
    const state = enqueueSync(s, 'insert', '/a', {}, 'd1'); const id = state.records[0].id;
    s = markFailed(state, id);
    expect(s.records[0].status).toBe('failed');
  });

  it('should mark conflict', () => {
    let s = createSyncGateway();
    const state = enqueueSync(s, 'update', '/a', {}, 'd1'); const id = state.records[state.records.length - 1].id;
    s = markConflict(state, id);
    expect(s.records[0].status).toBe('conflict');
  });

  it('should get records by path', () => {
    let s = createSyncGateway();
    s = enqueueSync(s, 'insert', '/a', {}, 'd1');
    s = enqueueSync(s, 'insert', '/b', {}, 'd1');
    s = enqueueSync(s, 'insert', '/a', {}, 'd2');
    const aRecs = getRecordsByPath(s, '/a');
    expect(aRecs).toHaveLength(2);
  });

  it('should get records by status', () => {
    let s = createSyncGateway();
    const state = enqueueSync(s, 'insert', '/a', {}, 'd1'); const id = state.records[0].id;
    s = markSynced(state, id);
    const synced = getRecordsByStatus(s, 'synced');
    expect(synced).toHaveLength(1);
  });

  it('should resolve conflict', () => {
    let s = createSyncGateway();
    const state = enqueueSync(s, 'update', '/a', {}, 'd1'); const id = state.records[state.records.length - 1].id;
    s = markConflict(state, id);
    s = resolveConflict(s, id, { merged: true });
    expect(s.records[0].status).toBe('synced');
  });

  it('should add device', () => {
    let s = createSyncGateway();
    s = addDevice(s, 'device1');
    s = addDevice(s, 'device2');
    s = addDevice(s, 'device1');
    expect(s.devices.size).toBe(2);
  });

  it('should produce report', () => {
    let s = createSyncGateway();
    s = enqueueSync(s, 'insert', '/a', {}, 'd1');
    s = addDevice(s, 'd1');
    const r = getSyncReport(s);
    expect(r.total).toBe(1);
    expect(r.devices).toBe(1);
  });

  it('should cap records at 500', () => {
    let s = createSyncGateway();
    for (let i = 0; i < 600; i++) s = enqueueSync(s, 'insert', `/a${i}`, {}, 'd1');
    expect(s.records).toHaveLength(500);
  });
});
