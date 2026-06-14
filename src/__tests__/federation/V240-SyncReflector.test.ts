import { describe, it, expect } from 'vitest';
import {
  createSyncReflectorState, recordSyncMetric, getSyncMetricStats, generateSyncInsights,
  generateSyncRecommendations, createSyncReflection, getSyncReflectionsByPeriod, getLastSyncReflection, clearSyncReflections, getSyncReflectorReport,
} from '../../federation/V240-SyncReflector';

describe('V240 SyncReflector', () => {
  it('should create empty state', () => {
    const s = createSyncReflectorState();
    expect(s.reflections).toHaveLength(0);
  });

  it('should record metric', () => {
    let s = createSyncReflectorState();
    s = recordSyncMetric(s, 'success_rate', 0.5);
    expect(s.metrics.success_rate).toHaveLength(1);
  });

  it('should get metric stats', () => {
    let s = createSyncReflectorState();
    s = recordSyncMetric(s, 'm', 0.1);
    s = recordSyncMetric(s, 'm', 0.5);
    s = recordSyncMetric(s, 'm', 0.9);
    const stats = getSyncMetricStats(s, 'm');
    expect(stats.avg).toBeCloseTo(0.5, 1);
  });

  it('should detect rising trend', () => {
    let s = createSyncReflectorState();
    for (let i = 0; i < 10; i++) s = recordSyncMetric(s, 'm', 0.1 + i * 0.1);
    expect(getSyncMetricStats(s, 'm').trend).toBe('rising');
  });

  it('should generate insights', () => {
    let s = createSyncReflectorState();
    for (let i = 0; i < 10; i++) s = recordSyncMetric(s, 'm', 0.1 + i * 0.1);
    expect(generateSyncInsights(s).length).toBeGreaterThan(0);
  });

  it('should generate recommendations', () => {
    let s = createSyncReflectorState();
    for (let i = 0; i < 10; i++) s = recordSyncMetric(s, 'success_rate', 1 - i * 0.1);
    expect(generateSyncRecommendations(s).length).toBeGreaterThan(0);
  });

  it('should create reflection', () => {
    let s = createSyncReflectorState();
    s = recordSyncMetric(s, 'm', 0.5);
    s = createSyncReflection(s, 'daily');
    expect(s.reflections).toHaveLength(1);
  });

  it('should get reflections by period', () => {
    let s = createSyncReflectorState();
    s = createSyncReflection(s, 'daily');
    s = createSyncReflection(s, 'weekly');
    expect(getSyncReflectionsByPeriod(s, 'daily')).toHaveLength(1);
  });

  it('should get last reflection', () => {
    let s = createSyncReflectorState();
    s = createSyncReflection(s, 'daily');
    s = createSyncReflection(s, 'weekly');
    expect(getLastSyncReflection(s)!.period).toBe('weekly');
  });

  it('should clear reflections', () => {
    let s = createSyncReflectorState();
    s = createSyncReflection(s, 'daily');
    s = clearSyncReflections(s);
    expect(s.reflections).toHaveLength(0);
  });

  it('should produce report', () => {
    let s = createSyncReflectorState();
    s = recordSyncMetric(s, 'm', 0.5);
    s = createSyncReflection(s, 'daily');
    const r = getSyncReflectorReport(s);
    expect(r.total).toBe(1);
    expect(r.metricsTracked).toBe(1);
  });
});
