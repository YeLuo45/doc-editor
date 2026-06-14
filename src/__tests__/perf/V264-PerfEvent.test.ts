import { describe, it, expect } from 'vitest';
import {
  createPerfEventBus, emitPerfEvent, getEventsByType, getEventsByMetric,
  getRegressions, getOptimizations, getRecentEvents, clearEvents, getPerfEventReport,
} from '../../perf/V264-PerfEvent';

describe('V264 PerfEvent', () => {
  it('should create empty bus', () => {
    const s = createPerfEventBus();
    expect(s.events).toHaveLength(0);
  });

  it('should emit event', () => {
    let s = createPerfEventBus();
    s = emitPerfEvent(s, 'fps', 60, 30, 'opt');
    expect(s.events).toHaveLength(1);
  });

  it('should classify stable', () => {
    let s = createPerfEventBus();
    s = emitPerfEvent(s, 'm', 100, 102);
    expect(s.events[0].type).toBe('stable');
  });

  it('should classify faster (decreased)', () => {
    let s = createPerfEventBus();
    s = emitPerfEvent(s, 'm', 100, 50);
    expect(s.events[0].type).toBe('faster');
  });

  it('should classify slower (increased)', () => {
    let s = createPerfEventBus();
    s = emitPerfEvent(s, 'm', 100, 120);
    expect(s.events[0].type).toBe('slower');
  });

  it('should classify optimized (large decrease)', () => {
    let s = createPerfEventBus();
    s = emitPerfEvent(s, 'm', 100, 30);
    expect(s.events[0].type).toBe('optimized');
  });

  it('should classify regressed', () => {
    let s = createPerfEventBus();
    s = emitPerfEvent(s, 'm', 100, 115, 'regression');
    expect(s.events[0].type).toBe('regressed');
  });

  it('should get events by type', () => {
    let s = createPerfEventBus();
    s = emitPerfEvent(s, 'm', 100, 50);
    s = emitPerfEvent(s, 'm', 100, 200);
    expect(getEventsByType(s, 'faster')).toHaveLength(1);
  });

  it('should get events by metric', () => {
    let s = createPerfEventBus();
    s = emitPerfEvent(s, 'fps', 60, 30);
    s = emitPerfEvent(s, 'memory', 100, 200);
    expect(getEventsByMetric(s, 'fps')).toHaveLength(1);
  });

  it('should get regressions', () => {
    let s = createPerfEventBus();
    s = emitPerfEvent(s, 'm', 100, 200, 'regression');
    expect(getRegressions(s)).toHaveLength(1);
  });

  it('should get optimizations', () => {
    let s = createPerfEventBus();
    s = emitPerfEvent(s, 'm', 100, 30);
    expect(getOptimizations(s)).toHaveLength(1);
  });

  it('should get recent events', () => {
    let s = createPerfEventBus();
    for (let i = 0; i < 20; i++) s = emitPerfEvent(s, 'm', 100, 100);
    expect(getRecentEvents(s, 5)).toHaveLength(5);
  });

  it('should clear events', () => {
    let s = createPerfEventBus();
    s = emitPerfEvent(s, 'm', 100, 100);
    s = clearEvents(s);
    expect(s.events).toHaveLength(0);
  });

  it('should produce report', () => {
    let s = createPerfEventBus();
    s = emitPerfEvent(s, 'm', 100, 50);
    s = emitPerfEvent(s, 'm', 100, 200, 'regression');
    const r = getPerfEventReport(s);
    expect(r.optimizations).toBe(1);
    expect(r.regressions).toBe(1);
  });
});
