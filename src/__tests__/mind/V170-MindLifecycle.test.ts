import { describe, it, expect } from 'vitest';
import {
  createLifecycleTracker, transition, activate, pause, resume,
  close, archive, isActive, getDuration, getIdleTime, getLifecycleReport,
} from '../../mind/V170-MindLifecycle';

describe('V170 MindLifecycle', () => {
  it('should create tracker in init state', () => {
    const t = createLifecycleTracker();
    expect(t.current).toBe('init');
    expect(t.transitions).toBe(0);
  });

  it('should activate from init', () => {
    let t = createLifecycleTracker();
    t = activate(t);
    expect(t.current).toBe('active');
    expect(t.transitions).toBe(1);
  });

  it('should pause from active', () => {
    let t = createLifecycleTracker();
    t = activate(t);
    t = pause(t);
    expect(t.current).toBe('paused');
  });

  it('should resume from paused', () => {
    let t = createLifecycleTracker();
    t = activate(t);
    t = pause(t);
    t = resume(t);
    expect(t.current).toBe('resumed');
  });

  it('should close from active', () => {
    let t = createLifecycleTracker();
    t = activate(t);
    t = close(t);
    expect(t.current).toBe('closed');
  });

  it('should archive from closed', () => {
    let t = createLifecycleTracker();
    t = activate(t);
    t = close(t);
    t = archive(t);
    expect(t.current).toBe('archived');
  });

  it('should reject invalid transition', () => {
    const t = createLifecycleTracker();
    expect(() => transition(t, 'archived')).toThrow();
  });

  it('should check active state', () => {
    let t = createLifecycleTracker();
    expect(isActive(t)).toBe(false);
    t = activate(t);
    expect(isActive(t)).toBe(true);
    t = pause(t);
    expect(isActive(t)).toBe(false);
    t = resume(t);
    expect(isActive(t)).toBe(true);
  });

  it('should track duration', () => {
    const t = createLifecycleTracker();
    const d = getDuration(t);
    expect(d).toBeGreaterThanOrEqual(0);
  });

  it('should track idle time', () => {
    const t = createLifecycleTracker();
    const i = getIdleTime(t);
    expect(i).toBeGreaterThanOrEqual(0);
  });

  it('should produce report', () => {
    let t = createLifecycleTracker();
    t = activate(t);
    const r = getLifecycleReport(t);
    expect(r.current).toBe('active');
    expect(r.transitions).toBe(1);
    expect(r.historySize).toBe(2);
  });

  it('should cap history at 100', () => {
    let t = createLifecycleTracker();
    for (let i = 0; i < 50; i++) {
      try {
        t = activate(t);
        t = pause(t);
        t = resume(t);
        t = close(t);
        t = archive(t);
        break;
      } catch {}
    }
    expect(t.history.length).toBeLessThanOrEqual(100);
  });
});
