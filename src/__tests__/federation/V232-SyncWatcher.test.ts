import { describe, it, expect } from 'vitest';
import {
  createSyncWatcherState, recordSyncEvent, analyzeSyncWatcher,
  getSyncAlertsByType, getSyncAlertsForDoc, clearSyncAlerts, setSyncThresholds, getSyncWatcherReport,
} from '../../federation/V232-SyncWatcher';

describe('V232 SyncWatcher', () => {
  it('should create empty state', () => {
    const s = createSyncWatcherState();
    expect(s.events).toHaveLength(0);
  });

  it('should record event', () => {
    let s = createSyncWatcherState();
    s = recordSyncEvent(s, { type: 'sync_start', timestamp: Date.now(), docId: 'd1' });
    expect(s.events).toHaveLength(1);
  });

  it('should detect stuck sync', () => {
    let s = createSyncWatcherState();
    s = recordSyncEvent(s, { type: 'sync_start', timestamp: 1000, docId: 'd1' });
    s = analyzeSyncWatcher(s, 1000 + 70000);
    expect(getSyncAlertsByType(s, 'stuck')).toHaveLength(1);
  });

  it('should detect slow sync', () => {
    let s = createSyncWatcherState();
    s = recordSyncEvent(s, { type: 'sync_start', timestamp: 1000, docId: 'd1' });
    s = analyzeSyncWatcher(s, 1000 + 15000);
    expect(getSyncAlertsByType(s, 'slow')).toHaveLength(1);
  });

  it('should detect idle', () => {
    let s = createSyncWatcherState();
    s = recordSyncEvent(s, { type: 'sync_end', timestamp: 1000, docId: 'd1' });
    s = analyzeSyncWatcher(s, 1000 + 40000);
    expect(getSyncAlertsByType(s, 'idle')).toHaveLength(1);
  });

  it('should get alerts for doc', () => {
    let s = createSyncWatcherState();
    s = recordSyncEvent(s, { type: 'sync_start', timestamp: 1000, docId: 'd1' });
    s = analyzeSyncWatcher(s, 1000 + 70000);
    expect(getSyncAlertsForDoc(s, 'd1').length).toBeGreaterThan(0);
  });

  it('should clear alerts', () => {
    let s = createSyncWatcherState();
    s = recordSyncEvent(s, { type: 'sync_start', timestamp: 1000, docId: 'd1' });
    s = analyzeSyncWatcher(s, 1000 + 70000);
    s = clearSyncAlerts(s);
    expect(s.alerts).toHaveLength(0);
  });

  it('should set thresholds', () => {
    let s = createSyncWatcherState();
    s = setSyncThresholds(s, 1000, 500, 2000);
    expect(s.stuckThresholdMs).toBe(1000);
  });

  it('should produce report', () => {
    let s = createSyncWatcherState();
    s = recordSyncEvent(s, { type: 'sync_start', timestamp: 1000, docId: 'd1' });
    s = analyzeSyncWatcher(s, 1000 + 70000);
    const r = getSyncWatcherReport(s);
    expect(r.alerts).toBeGreaterThan(0);
    expect(r.byAlert.stuck).toBe(1);
  });

  it('should cap events at 500', () => {
    let s = createSyncWatcherState();
    for (let i = 0; i < 600; i++) s = recordSyncEvent(s, { type: 'sync_start', timestamp: i, docId: 'd1' });
    expect(s.events).toHaveLength(500);
  });

  it('should not alert on no events', () => {
    const s = createSyncWatcherState();
    const result = analyzeSyncWatcher(s);
    expect(result.alerts).toHaveLength(0);
  });
});
