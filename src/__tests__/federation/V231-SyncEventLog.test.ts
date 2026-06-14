import { describe, it, expect } from 'vitest';
import {
  createSyncEventLog, logSyncEvent, setSyncLogLevelFilter, setSyncLogCategoryFilter,
  setSyncLogDocFilter, clearSyncLogFilter, getSyncEventsByLevel, getSyncEventsByCategory,
  getRecentSyncEvents, getSyncEventLogReport,
} from '../../federation/V231-SyncEventLog';

describe('V231 SyncEventLog', () => {
  it('should create empty log', () => {
    const s = createSyncEventLog();
    expect(s.events).toHaveLength(0);
  });

  it('should log event', () => {
    let s = createSyncEventLog();
    s = logSyncEvent(s, 'info', 'sync', 'doc synced', { docId: 'd1' });
    expect(s.events).toHaveLength(1);
  });

  it('should filter by level', () => {
    let s = createSyncEventLog();
    s = setSyncLogLevelFilter(s, 'warn');
    s = logSyncEvent(s, 'info', 'sync', 'low', { docId: 'd1' });
    s = logSyncEvent(s, 'warn', 'sync', 'high', { docId: 'd1' });
    expect(s.events).toHaveLength(1);
  });

  it('should filter by category', () => {
    let s = createSyncEventLog();
    s = setSyncLogCategoryFilter(s, 'transport');
    s = logSyncEvent(s, 'info', 'sync', 'a', { docId: 'd1' });
    s = logSyncEvent(s, 'info', 'transport', 'b', { docId: 'd1' });
    expect(s.events).toHaveLength(1);
  });

  it('should filter by docId', () => {
    let s = createSyncEventLog();
    s = setSyncLogDocFilter(s, 'd1');
    s = logSyncEvent(s, 'info', 'sync', 'a', { docId: 'd1' });
    s = logSyncEvent(s, 'info', 'sync', 'b', { docId: 'd2' });
    expect(s.events).toHaveLength(1);
  });

  it('should clear filter', () => {
    let s = createSyncEventLog();
    s = setSyncLogLevelFilter(s, 'warn');
    s = clearSyncLogFilter(s);
    s = logSyncEvent(s, 'info', 'sync', 'a', { docId: 'd1' });
    expect(s.events).toHaveLength(1);
  });

  it('should get events by level', () => {
    let s = createSyncEventLog();
    s = logSyncEvent(s, 'error', 'sync', 'a', { docId: 'd1' });
    s = logSyncEvent(s, 'info', 'sync', 'b', { docId: 'd1' });
    expect(getSyncEventsByLevel(s, 'error')).toHaveLength(1);
  });

  it('should get events by category', () => {
    let s = createSyncEventLog();
    s = logSyncEvent(s, 'info', 'transport', 'a', { docId: 'd1' });
    s = logSyncEvent(s, 'info', 'sync', 'b', { docId: 'd1' });
    expect(getSyncEventsByCategory(s, 'transport')).toHaveLength(1);
  });

  it('should get recent events', () => {
    let s = createSyncEventLog();
    for (let i = 0; i < 20; i++) s = logSyncEvent(s, 'info', 'sync', `m${i}`, { docId: 'd1' });
    expect(getRecentSyncEvents(s, 5)).toHaveLength(5);
  });

  it('should cap at 2000', () => {
    let s = createSyncEventLog();
    for (let i = 0; i < 2500; i++) s = logSyncEvent(s, 'info', 'sync', `m${i}`, { docId: 'd1' });
    expect(s.events).toHaveLength(2000);
  });

  it('should produce report', () => {
    let s = createSyncEventLog();
    s = logSyncEvent(s, 'info', 'sync', 'a', { docId: 'd1' });
    s = logSyncEvent(s, 'error', 'sync', 'b', { docId: 'd1' });
    const r = getSyncEventLogReport(s);
    expect(r.total).toBe(2);
    expect(r.byLevel.info).toBe(1);
  });
});
