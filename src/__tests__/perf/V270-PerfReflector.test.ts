import { describe, it, expect } from 'vitest';
import {
  createPerfReflectorState, recordPerfMetric, getPerfMetricStats, generatePerfInsights,
  generatePerfRecs, createReflection, getReflectionsByWindow, clearReflections, getPerfReflectorReport,
} from '../../perf/V270-PerfReflector';

describe('V270 PerfReflector', () => {
  it('should create empty state', () => {
    const s = createPerfReflectorState();
    expect(s.reflections).toHaveLength(0);
  });

  it('should record metric', () => {
    let s = createPerfReflectorState();
    s = recordPerfMetric(s, 'fps', 60);
    expect(s.metrics.fps).toHaveLength(1);
  });

  it('should get metric stats', () => {
    let s = createPerfReflectorState();
    s = recordPerfMetric(s, 'm', 0.1);
    s = recordPerfMetric(s, 'm', 0.5);
    s = recordPerfMetric(s, 'm', 0.9);
    const stats = getPerfMetricStats(s, 'm');
    expect(stats.avg).toBeCloseTo(0.5, 1);
  });

  it('should detect rising trend', () => {
    let s = createPerfReflectorState();
    for (let i = 0; i < 10; i++) s = recordPerfMetric(s, 'm', 0.1 + i * 0.1);
    expect(getPerfMetricStats(s, 'm').trend).toBe('rising');
  });

  it('should generate insights', () => {
    let s = createPerfReflectorState();
    for (let i = 0; i < 10; i++) s = recordPerfMetric(s, 'm', 0.1 + i * 0.1);
    expect(generatePerfInsights(s).length).toBeGreaterThan(0);
  });

  it('should generate recommendations for latency metrics', () => {
    let s = createPerfReflectorState();
    for (let i = 0; i < 10; i++) s = recordPerfMetric(s, 'latency_ms', 10 + i);
    expect(generatePerfRecs(s).length).toBeGreaterThan(0);
  });

  it('should default rec to stable', () => {
    let s = createPerfReflectorState();
    s = recordPerfMetric(s, 'fps', 60);
    expect(generatePerfRecs(s)).toContain('Perf is stable');
  });

  it('should create reflection', () => {
    let s = createPerfReflectorState();
    s = recordPerfMetric(s, 'm', 0.5);
    s = createReflection(s, 'daily');
    expect(s.reflections).toHaveLength(1);
  });

  it('should get reflections by window', () => {
    let s = createPerfReflectorState();
    s = createReflection(s, 'daily');
    s = createReflection(s, 'weekly');
    expect(getReflectionsByWindow(s, 'daily')).toHaveLength(1);
  });

  it('should clear reflections', () => {
    let s = createPerfReflectorState();
    s = createReflection(s, 'daily');
    s = clearReflections(s);
    expect(s.reflections).toHaveLength(0);
  });

  it('should produce report', () => {
    let s = createPerfReflectorState();
    s = recordPerfMetric(s, 'm', 0.5);
    s = createReflection(s, 'daily');
    const r = getPerfReflectorReport(s);
    expect(r.total).toBe(1);
    expect(r.metricsTracked).toBe(1);
  });
});
