import { describe, it, expect } from 'vitest';
import {
  createPerfLifecycleState, startSession, transitionPhase, recordMeasurement, recordOptimization,
  endSession, getSession, getActiveSession, getSessionsByPhase, getPerfLifecycleReport,
} from '../../perf/V260-PerfLifecycle';

describe('V260 PerfLifecycle', () => {
  it('should create empty state', () => {
    const s = createPerfLifecycleState();
    expect(s.sessions.size).toBe(0);
    expect(s.activeId).toBeNull();
  });

  it('should start session', () => {
    const s = createPerfLifecycleState();
    const r = startSession(s);
    expect(r.state.sessions.size).toBe(1);
    expect(r.state.activeId).toBe(r.sessionId);
  });

  it('should transition phase', () => {
    let s = createPerfLifecycleState();
    const r = startSession(s);
    s = transitionPhase(r.state, r.sessionId, 'measuring');
    expect(getSession(s, r.sessionId)!.phase).toBe('measuring');
  });

  it('should record measurement', () => {
    let s = createPerfLifecycleState();
    const r = startSession(s);
    s = recordMeasurement(r.state, r.sessionId);
    expect(getSession(s, r.sessionId)!.measurements).toBe(1);
  });

  it('should record optimization', () => {
    let s = createPerfLifecycleState();
    const r = startSession(s);
    s = recordOptimization(r.state, r.sessionId);
    expect(getSession(s, r.sessionId)!.optimizations).toBe(1);
  });

  it('should end session', () => {
    let s = createPerfLifecycleState();
    const r = startSession(s);
    s = endSession(r.state, r.sessionId);
    expect(getSession(s, r.sessionId)!.phase).toBe('idle');
    expect(s.activeId).toBeNull();
  });

  it('should get active session', () => {
    let s = createPerfLifecycleState();
    const r = startSession(s);
    s = r.state;
    expect(getActiveSession(s)!.id).toBe(r.sessionId);
  });

  it('should get sessions by phase', () => {
    let s = createPerfLifecycleState();
    s = startSession(s).state;
    s = startSession(s).state;
    expect(getSessionsByPhase(s, 'init')).toHaveLength(2);
  });

  it('should not transition missing session', () => {
    const s = createPerfLifecycleState();
    expect(transitionPhase(s, 'missing', 'measuring')).toBe(s);
  });

  it('should preserve active when ending other', () => {
    let s = createPerfLifecycleState();
    const r1 = startSession(s);
    s = r1.state;
    const r2 = startSession(s);
    s = r2.state;
    s = endSession(s, r1.sessionId);
    expect(s.activeId).toBe(r2.sessionId);
  });

  it('should produce report', () => {
    let s = createPerfLifecycleState();
    s = startSession(s).state;
    s = recordMeasurement(s, s.activeId!);
    const r = getPerfLifecycleReport(s);
    expect(r.total).toBe(1);
    expect(r.totalMeasurements).toBe(1);
  });
});
