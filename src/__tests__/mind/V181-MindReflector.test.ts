import { describe, it, expect } from 'vitest';
import {
  createReflectorState, recordMetric, getMetricStats, generateInsights,
  generateRecommendations, createReflection, getReflectionsByPeriod, getLastReflection, getReflectorReport,
} from '../../mind/V181-MindReflector';

describe('V181 MindReflector', () => {
  it('should create empty state', () => {
    const s = createReflectorState();
    expect(s.reflections).toHaveLength(0);
    expect(s.metrics).toEqual({});
  });

  it('should record metric', () => {
    let s = createReflectorState();
    s = recordMetric(s, 'wordCount', 100);
    s = recordMetric(s, 'wordCount', 200);
    expect(s.metrics.wordCount).toHaveLength(2);
  });

  it('should get metric stats', () => {
    let s = createReflectorState();
    s = recordMetric(s, 'm', 10);
    s = recordMetric(s, 'm', 20);
    s = recordMetric(s, 'm', 30);
    const stats = getMetricStats(s, 'm');
    expect(stats.count).toBe(3);
    expect(stats.avg).toBe(20);
    expect(stats.min).toBe(10);
    expect(stats.max).toBe(30);
  });

  it('should detect rising trend', () => {
    let s = createReflectorState();
    for (let i = 0; i < 20; i++) s = recordMetric(s, 'm', i * 10);
    expect(getMetricStats(s, 'm').trend).toBe('rising');
  });

  it('should detect falling trend', () => {
    let s = createReflectorState();
    for (let i = 0; i < 20; i++) s = recordMetric(s, 'm', 1000 - i * 10);
    expect(getMetricStats(s, 'm').trend).toBe('falling');
  });

  it('should handle unknown metric', () => {
    const s = createReflectorState();
    const stats = getMetricStats(s, 'unknown');
    expect(stats.count).toBe(0);
  });

  it('should generate insights', () => {
    let s = createReflectorState();
    for (let i = 0; i < 20; i++) s = recordMetric(s, 'm', i * 10);
    const insights = generateInsights(s, 'weekly');
    expect(insights.length).toBeGreaterThan(0);
  });

  it('should generate recommendations', () => {
    let s = createReflectorState();
    for (let i = 0; i < 20; i++) s = recordMetric(s, 'm', 1000 - i * 10);
    const recs = generateRecommendations(s);
    expect(recs.length).toBeGreaterThan(0);
  });

  it('should create reflection', () => {
    let s = createReflectorState();
    s = recordMetric(s, 'm', 50);
    s = createReflection(s, 'weekly', Date.now() - 7 * 86400000, Date.now());
    expect(s.reflections).toHaveLength(1);
  });

  it('should get reflections by period', () => {
    let s = createReflectorState();
    s = createReflection(s, 'weekly', 0, 1);
    s = createReflection(s, 'monthly', 0, 1);
    expect(getReflectionsByPeriod(s, 'weekly')).toHaveLength(1);
  });

  it('should get last reflection', () => {
    let s = createReflectorState();
    s = createReflection(s, 'weekly', 0, 1);
    s = createReflection(s, 'weekly', 0, 1);
    expect(getLastReflection(s)).toBeDefined();
  });

  it('should produce report', () => {
    let s = createReflectorState();
    s = recordMetric(s, 'm', 50);
    s = createReflection(s, 'weekly', 0, 1);
    const r = getReflectorReport(s);
    expect(r.total).toBe(1);
    expect(r.metrics).toBe(1);
  });
});
