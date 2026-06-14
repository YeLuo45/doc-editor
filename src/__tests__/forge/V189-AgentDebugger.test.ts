import { describe, it, expect } from 'vitest';
import {
  createDebuggerState, addTrace, setBreakpoint, clearBreakpoint,
  pause, resume, stepTo, getTraceByType, getTraceChildren, getErrorTraces, clearTraces, getDebuggerReport,
} from '../../forge/V189-AgentDebugger';

describe('V189 AgentDebugger', () => {
  it('should create empty state', () => {
    const s = createDebuggerState();
    expect(s.traces).toHaveLength(0);
    expect(s.paused).toBe(false);
  });

  it('should add trace', () => {
    let s = createDebuggerState();
    s = addTrace(s, 'start', { agent: 'editor' });
    expect(s.traces).toHaveLength(1);
  });

  it('should set breakpoint', () => {
    let s = createDebuggerState();
    s = setBreakpoint(s, 5);
    expect(s.breakpoints.has(5)).toBe(true);
  });

  it('should clear breakpoint', () => {
    let s = createDebuggerState();
    s = setBreakpoint(s, 5);
    s = clearBreakpoint(s, 5);
    expect(s.breakpoints.has(5)).toBe(false);
  });

  it('should pause and resume', () => {
    let s = createDebuggerState();
    s = pause(s);
    expect(s.paused).toBe(true);
    s = resume(s);
    expect(s.paused).toBe(false);
  });

  it('should step to trace', () => {
    let s = createDebuggerState();
    s = stepTo(s, 10);
    expect(s.currentStep).toBe(10);
    expect(s.paused).toBe(true);
  });

  it('should get trace by type', () => {
    let s = createDebuggerState();
    s = addTrace(s, 'start', {});
    s = addTrace(s, 'end', {});
    s = addTrace(s, 'start', {});
    expect(getTraceByType(s, 'start')).toHaveLength(2);
  });

  it('should get trace children', () => {
    let s = createDebuggerState();
    s = addTrace(s, 'start', {}, undefined, undefined);
    s = addTrace(s, 'tool_call', {}, undefined, 1);
    s = addTrace(s, 'tool_call', {}, undefined, 1);
    expect(getTraceChildren(s, 1)).toHaveLength(2);
  });

  it('should get error traces', () => {
    let s = createDebuggerState();
    s = addTrace(s, 'error', { msg: 'fail' });
    s = addTrace(s, 'tool_call', {});
    expect(getErrorTraces(s)).toHaveLength(1);
  });

  it('should clear traces', () => {
    let s = createDebuggerState();
    s = addTrace(s, 'start', {});
    s = clearTraces(s);
    expect(s.traces).toHaveLength(0);
  });

  it('should produce report', () => {
    let s = createDebuggerState();
    s = addTrace(s, 'error', {});
    const r = getDebuggerReport(s);
    expect(r.traces).toBe(1);
    expect(r.errors).toBe(1);
  });
});
