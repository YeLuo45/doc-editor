import { describe, it, expect } from 'vitest';
import {
  createReflectorState, recordMetric, getMetricStats, generateInsights,
  generateRecommendations, createReflection, getReflectionsByPeriod, getLastReflection, clearReflections, getReflectorReport,
} from '../../forge/V210-AgentReflector';

describe('V210 AgentReflector', () => {
  it('should create empty state', () => {
    const s = createReflectorState();
    expect(s.reflections).toHaveLength(0);
  });

  it('should record metric', () => {
    let s = createReflectorState();
    s = recordMetric(s, 'success_rate', 0.5);
    expect(s.metrics.success_rate).toHaveLength(1);
  });

  it('should get metric stats', () => {
    let s = createReflectorState();
    s = recordMetric(s, 'm', 0.1);
    s = recordMetric(s, 'm', 0.5);
    s = recordMetric(s, 'm', 0.9);
    const stats = getMetricStats(s, 'm');
    expect(stats.avg).toBeCloseTo(0.5, 1);
  });

  it('should detect rising trend', () => {
    let s = createReflectorState();
    for (let i = 0; i < 10; i++) s = recordMetric(s, 'm', 0.1 + i * 0.1);
    expect(getMetricStats(s, 'm').trend).toBe('rising');
  });

  it('should detect falling trend', () => {
    let s = createReflectorState();
    for (let i = 0; i < 10; i++) s = recordMetric(s, 'm', 1 - i * 0.1);
    expect(getMetricStats(s, 'm').trend).toBe('falling');
  });

  it('should generate insights', () => {
    let s = createReflectorState();
    for (let i = 0; i < 10; i++) s = recordMetric(s, 'success_rate', 0.1 + i * 0.1);
    const insights = generateInsights(s);
    expect(insights.length).toBeGreaterThan(0);
  });

  it('should generate recommendations', () => {
    let s = createReflectorState();
    for (let i = 0; i < 10; i++) s = recordMetric(s, 'success_rate', 1 - i * 0.1);
    const recs = generateRecommendations(s);
    expect(recs.length).toBeGreaterThan(0);
  });

  it('should create reflection', () => {
    let s = createReflectorState();
    s = recordMetric(s, 'm', 0.5);
    s = createReflection(s, 'daily');
    expect(s.reflections).toHaveLength(1);
  });

  it('should get reflections by period', () => {
    let s = createReflectorState();
    s = createReflection(s, 'daily');
    s = createReflection(s, 'weekly');
    expect(getReflectionsByPeriod(s, 'daily')).toHaveLength(1);
  });

  it('should get last reflection', () => {
    let s = createReflectorState();
    s = createReflection(s, 'daily');
    s = createReflection(s, 'weekly');
    expect(getLastReflection(s)!.period).toBe('weekly');
  });

  it('should clear reflections', () => {
    let s = createReflectorState();
    s = createReflection(s, 'daily');
    s = clearReflections(s);
    expect(s.reflections).toHaveLength(0);
  });

  it('should produce report', () => {
    let s = createReflectorState();
    s = recordMetric(s, 'm', 0.5);
    s = createReflection(s, 'daily');
    const r = getReflectorReport(s);
    expect(r.total).toBe(1);
    expect(r.metricsTracked).toBe(1);
  });
});
