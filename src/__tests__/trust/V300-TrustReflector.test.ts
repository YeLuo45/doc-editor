import { describe, it, expect } from 'vitest';
import {
  createTrustReflectorState, recordTrustMetric, getTrustMetricStats, generateTrustInsights,
  generateTrustRecs, createTrustReflection, getReflectionsByWindow, clearTrustReflections, getTrustReflectorReport,
} from '../../trust/V300-TrustReflector';

describe('V300 TrustReflector', () => {
  it('should create empty state', () => {
    const s = createTrustReflectorState();
    expect(s.reflections).toHaveLength(0);
  });

  it('should record metric', () => {
    let s = createTrustReflectorState();
    s = recordTrustMetric(s, 'trust_score', 0.9);
    expect(s.metrics.trust_score).toHaveLength(1);
  });

  it('should get metric stats', () => {
    let s = createTrustReflectorState();
    s = recordTrustMetric(s, 'm', 0.1);
    s = recordTrustMetric(s, 'm', 0.5);
    s = recordTrustMetric(s, 'm', 0.9);
    const stats = getTrustMetricStats(s, 'm');
    expect(stats.avg).toBeCloseTo(0.5, 1);
  });

  it('should detect rising trend', () => {
    let s = createTrustReflectorState();
    for (let i = 0; i < 10; i++) s = recordTrustMetric(s, 'm', 0.1 + i * 0.1);
    expect(getTrustMetricStats(s, 'm').trend).toBe('rising');
  });

  it('should generate insights', () => {
    let s = createTrustReflectorState();
    for (let i = 0; i < 10; i++) s = recordTrustMetric(s, 'm', 0.1 + i * 0.1);
    expect(generateTrustInsights(s).length).toBeGreaterThan(0);
  });

  it('should generate recommendations for falling trust', () => {
    let s = createTrustReflectorState();
    for (let i = 0; i < 10; i++) s = recordTrustMetric(s, 'trust_score', 1 - i * 0.1);
    expect(generateTrustRecs(s).length).toBeGreaterThan(0);
  });

  it('should default rec to stable', () => {
    let s = createTrustReflectorState();
    s = recordTrustMetric(s, 'fps', 60);
    expect(generateTrustRecs(s)).toContain('Trust metrics stable');
  });

  it('should create reflection', () => {
    let s = createTrustReflectorState();
    s = recordTrustMetric(s, 'm', 0.5);
    s = createTrustReflection(s, 'daily');
    expect(s.reflections).toHaveLength(1);
  });

  it('should get reflections by window', () => {
    let s = createTrustReflectorState();
    s = createTrustReflection(s, 'daily');
    s = createTrustReflection(s, 'weekly');
    expect(getReflectionsByWindow(s, 'daily')).toHaveLength(1);
  });

  it('should clear reflections', () => {
    let s = createTrustReflectorState();
    s = createTrustReflection(s, 'daily');
    s = clearTrustReflections(s);
    expect(s.reflections).toHaveLength(0);
  });

  it('should produce report', () => {
    let s = createTrustReflectorState();
    s = recordTrustMetric(s, 'm', 0.5);
    s = createTrustReflection(s, 'daily');
    const r = getTrustReflectorReport(s);
    expect(r.total).toBe(1);
  });
});
