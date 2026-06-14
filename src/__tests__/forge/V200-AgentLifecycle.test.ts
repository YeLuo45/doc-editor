import { describe, it, expect } from 'vitest';
import {
  createLifecycleTracker, transition, startAgent, activateAgent, pauseAgent,
  stopAgent, archiveAgent, errorAgent, isActive, getUptime, getLifecycleReport,
} from '../../forge/V200-AgentLifecycle';

describe('V200 AgentLifecycle', () => {
  it('should create tracker in init state', () => {
    const t = createLifecycleTracker('a1');
    expect(t.current).toBe('init');
    expect(t.transitions).toBe(0);
  });

  it('should start from init', () => {
    let t = createLifecycleTracker('a');
    t = startAgent(t);
    expect(t.current).toBe('loading');
  });

  it('should activate from loading', () => {
    let t = createLifecycleTracker('a');
    t = startAgent(t);
    t = activateAgent(t);
    expect(t.current).toBe('active');
  });

  it('should pause from active', () => {
    let t = createLifecycleTracker('a');
    t = startAgent(t);
    t = activateAgent(t);
    t = pauseAgent(t);
    expect(t.current).toBe('paused');
  });

  it('should stop from active', () => {
    let t = createLifecycleTracker('a');
    t = startAgent(t);
    t = activateAgent(t);
    t = stopAgent(t);
    expect(t.current).toBe('stopped');
  });

  it('should archive from stopped', () => {
    let t = createLifecycleTracker('a');
    t = startAgent(t);
    t = activateAgent(t);
    t = stopAgent(t);
    t = archiveAgent(t);
    expect(t.current).toBe('archived');
  });

  it('should error from active', () => {
    let t = createLifecycleTracker('a');
    t = startAgent(t);
    t = activateAgent(t);
    t = errorAgent(t, 'crashed');
    expect(t.current).toBe('error');
  });

  it('should reject invalid transition', () => {
    const t = createLifecycleTracker('a');
    expect(() => transition(t, 'archived')).toThrow();
  });

  it('should check isActive', () => {
    let t = createLifecycleTracker('a');
    expect(isActive(t)).toBe(false);
    t = startAgent(t);
    t = activateAgent(t);
    expect(isActive(t)).toBe(true);
  });

  it('should get uptime', () => {
    const t = createLifecycleTracker('a');
    expect(getUptime(t)).toBeGreaterThanOrEqual(0);
  });

  it('should produce report', () => {
    let t = createLifecycleTracker('a');
    t = startAgent(t);
    const r = getLifecycleReport(t);
    expect(r.current).toBe('loading');
    expect(r.transitions).toBe(1);
  });
});
