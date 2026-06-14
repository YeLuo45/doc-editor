import { describe, it, expect } from 'vitest';
import {
  createDocLifecycleTracker, transitionDocState, activateDoc, archiveDoc, deleteDoc,
  lockDoc, unlockDoc, isDocActive, isDocDeleted, getDocAge, getDocLifecycleReport,
} from '../../federation/V230-DocLifecycle';

describe('V230 DocLifecycle', () => {
  it('should create tracker in draft', () => {
    const t = createDocLifecycleTracker('d1');
    expect(t.current).toBe('draft');
  });

  it('should activate from draft', () => {
    let t = createDocLifecycleTracker('d1');
    t = activateDoc(t);
    expect(t.current).toBe('active');
  });

  it('should archive from active', () => {
    let t = createDocLifecycleTracker('d1');
    t = activateDoc(t);
    t = archiveDoc(t);
    expect(t.current).toBe('archived');
  });

  it('should delete from active', () => {
    let t = createDocLifecycleTracker('d1');
    t = activateDoc(t);
    t = deleteDoc(t);
    expect(t.current).toBe('deleted');
  });

  it('should lock from active', () => {
    let t = createDocLifecycleTracker('d1');
    t = activateDoc(t);
    t = lockDoc(t);
    expect(t.current).toBe('locked');
  });

  it('should unlock from locked', () => {
    let t = createDocLifecycleTracker('d1');
    t = activateDoc(t);
    t = lockDoc(t);
    t = unlockDoc(t);
    expect(t.current).toBe('active');
  });

  it('should reject invalid transition', () => {
    const t = createDocLifecycleTracker('d1');
    expect(() => transitionDocState(t, 'locked')).toThrow();
  });

  it('should check isDocActive', () => {
    let t = createDocLifecycleTracker('d1');
    expect(isDocActive(t)).toBe(false);
    t = activateDoc(t);
    expect(isDocActive(t)).toBe(true);
  });

  it('should check isDocDeleted', () => {
    let t = createDocLifecycleTracker('d1');
    t = activateDoc(t);
    t = deleteDoc(t);
    expect(isDocDeleted(t)).toBe(true);
  });

  it('should get doc age', () => {
    const t = createDocLifecycleTracker('d1');
    expect(getDocAge(t)).toBeGreaterThanOrEqual(0);
  });

  it('should produce report', () => {
    let t = createDocLifecycleTracker('d1');
    t = activateDoc(t);
    const r = getDocLifecycleReport(t);
    expect(r.current).toBe('active');
    expect(r.transitions).toBe(1);
  });
});
