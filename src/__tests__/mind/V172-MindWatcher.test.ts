import { describe, it, expect } from 'vitest';
import {
  createWatcherState, recordWatchEvent, analyzeWatcher,
  getAlertsByType, getLastAlert, clearAlerts, setThresholds, getWatcherReport,
} from '../../mind/V172-MindWatcher';

describe('V172 MindWatcher', () => {
  it('should create empty watcher', () => {
    const s = createWatcherState();
    expect(s.events).toHaveLength(0);
    expect(s.alerts).toHaveLength(0);
  });

  it('should record watch event', () => {
    let s = createWatcherState();
    s = recordWatchEvent(s, { type: 'edit', timestamp: Date.now() });
    expect(s.events).toHaveLength(1);
  });

  it('should detect idle', () => {
    let s = createWatcherState();
    s = recordWatchEvent(s, { type: 'edit', timestamp: 1000 });
    s = analyzeWatcher(s, 1000 + 35000);
    expect(s.alerts).toHaveLength(1);
    expect(s.alerts[0].alert).toBe('idle');
  });

  it('should detect stuck', () => {
    let s = createWatcherState();
    s = recordWatchEvent(s, { type: 'edit', timestamp: 1000 });
    s = analyzeWatcher(s, 1000 + 400000);
    expect(getAlertsByType(s, 'stuck')).toHaveLength(1);
  });

  it('should detect abandoned', () => {
    let s = createWatcherState();
    s = recordWatchEvent(s, { type: 'edit', timestamp: 1000 });
    s = analyzeWatcher(s, 1000 + 2000000);
    expect(getAlertsByType(s, 'abandoned')).toHaveLength(1);
  });

  it('should detect rapid changes', () => {
    let s = createWatcherState();
    const now = 100000;
    for (let i = 0; i < 15; i++) {
      s = recordWatchEvent(s, { type: 'edit', timestamp: now - 100 + i * 10 });
    }
    s = analyzeWatcher(s, now);
    expect(getAlertsByType(s, 'rapid_change').length).toBeGreaterThan(0);
  });

  it('should get last alert', () => {
    let s = createWatcherState();
    s = recordWatchEvent(s, { type: 'edit', timestamp: 1000 });
    s = analyzeWatcher(s, 1000 + 35000);
    const last = getLastAlert(s);
    expect(last).toBeDefined();
    expect(last!.alert).toBe('idle');
  });

  it('should clear alerts', () => {
    let s = createWatcherState();
    s = recordWatchEvent(s, { type: 'edit', timestamp: 1000 });
    s = analyzeWatcher(s, 1000 + 35000);
    s = clearAlerts(s);
    expect(s.alerts).toHaveLength(0);
  });

  it('should set custom thresholds', () => {
    let s = createWatcherState();
    s = setThresholds(s, 1000, 5000, 10000);
    s = recordWatchEvent(s, { type: 'edit', timestamp: 0 });
    s = analyzeWatcher(s, 2000);
    expect(s.alerts[0].alert).toBe('idle');
  });

  it('should generate report', () => {
    let s = createWatcherState();
    s = recordWatchEvent(s, { type: 'edit', timestamp: 1000 });
    s = analyzeWatcher(s, 1000 + 35000);
    const r = getWatcherReport(s);
    expect(r.totalEvents).toBe(1);
    expect(r.totalAlerts).toBe(1);
    expect(r.byAlert.idle).toBe(1);
  });

  it('should cap events at 200', () => {
    let s = createWatcherState();
    for (let i = 0; i < 250; i++) s = recordWatchEvent(s, { type: 'edit', timestamp: i });
    expect(s.events).toHaveLength(200);
  });

  it('should cap alerts at 100', () => {
    let s = createWatcherState();
    s = setThresholds(s, 100, 500, 1000);
    for (let i = 0; i < 200; i++) {
      s = recordWatchEvent(s, { type: 'edit', timestamp: i });
      s = analyzeWatcher(s, i + 200);
    }
    expect(s.alerts.length).toBeLessThanOrEqual(100);
  });
});
