import { describe, it, expect } from 'vitest';
import {
  createPerfLearnerState, recordHistory, predictBottlenecks,
  getEventsByType, getLatestPrediction, clearHistory, getPerfLearnerReport,
} from '../../perf/V269-PerfLearner';

describe('V269 PerfLearner', () => {
  it('should create empty state', () => {
    const s = createPerfLearnerState();
    expect(s.events).toHaveLength(0);
  });

  it('should record history', () => {
    let s = createPerfLearnerState();
    s = recordHistory(s, 'cpu', 'main_thread', 80, false);
    expect(s.events).toHaveLength(1);
  });

  it('should not predict with too few events', () => {
    let s = createPerfLearnerState();
    s = recordHistory(s, 'cpu', 'main_thread', 80, false);
    s = predictBottlenecks(s);
    expect(s.predictions).toHaveLength(0);
  });

  it('should predict when unresolved ratio high', () => {
    let s = createPerfLearnerState();
    s = recordHistory(s, 'cpu', 'm1', 80, false);
    s = recordHistory(s, 'cpu', 'm1', 90, false);
    s = recordHistory(s, 'cpu', 'm1', 85, false);
    s = predictBottlenecks(s);
    expect(s.predictions.length).toBeGreaterThan(0);
  });

  it('should not predict when most resolved', () => {
    let s = createPerfLearnerState();
    s = recordHistory(s, 'cpu', 'm1', 80, false);
    s = recordHistory(s, 'cpu', 'm1', 90, true);
    s = recordHistory(s, 'cpu', 'm1', 85, true);
    s = predictBottlenecks(s);
    expect(s.predictions).toHaveLength(0);
  });

  it('should get events by type', () => {
    let s = createPerfLearnerState();
    s = recordHistory(s, 'cpu', 'm1', 80, false);
    s = recordHistory(s, 'memory', 'm2', 100, false);
    expect(getEventsByType(s, 'cpu')).toHaveLength(1);
  });

  it('should get latest prediction', () => {
    let s = createPerfLearnerState();
    s = recordHistory(s, 'cpu', 'm1', 80, false);
    s = recordHistory(s, 'cpu', 'm1', 90, false);
    s = recordHistory(s, 'cpu', 'm1', 85, false);
    s = predictBottlenecks(s);
    expect(getLatestPrediction(s, 'cpu')).toBeDefined();
  });

  it('should clear history', () => {
    let s = createPerfLearnerState();
    s = recordHistory(s, 'cpu', 'm1', 80, false);
    s = clearHistory(s);
    expect(s.events).toHaveLength(0);
  });

  it('should cap events at 500', () => {
    let s = createPerfLearnerState();
    for (let i = 0; i < 600; i++) s = recordHistory(s, 'cpu', 'm1', 80, false);
    expect(s.events).toHaveLength(500);
  });

  it('should produce report', () => {
    let s = createPerfLearnerState();
    s = recordHistory(s, 'cpu', 'm1', 80, false);
    s = recordHistory(s, 'memory', 'm2', 100, false);
    const r = getPerfLearnerReport(s);
    expect(r.totalEvents).toBe(2);
    expect(r.byType.cpu).toBe(1);
  });

  it('should return undefined for missing prediction', () => {
    const s = createPerfLearnerState();
    expect(getLatestPrediction(s, 'cpu')).toBeUndefined();
  });
});
