import { describe, it, expect } from 'vitest';
import {
  createAggregatorState, addSample, getAggregatedStats, getAllStats,
  clearAggregatorSamples, getAggregatorReport,
} from '../../perf/V254-PerfAggregator';

describe('V254 PerfAggregator', () => {
  it('should create empty state', () => {
    const s = createAggregatorState();
    expect(s.samples.size).toBe(0);
  });

  it('should add sample', () => {
    let s = createAggregatorState();
    s = addSample(s, 'fps', 60);
    expect(s.samples.size).toBe(1);
  });

  it('should compute stats for empty metric', () => {
    const s = createAggregatorState();
    const stats = getAggregatedStats(s, 'fps');
    expect(stats.count).toBe(0);
    expect(stats.mean).toBe(0);
  });

  it('should compute basic stats', () => {
    let s = createAggregatorState();
    s = addSample(s, 'fps', 60);
    s = addSample(s, 'fps', 50);
    s = addSample(s, 'fps', 70);
    const stats = getAggregatedStats(s, 'fps');
    expect(stats.count).toBe(3);
    expect(stats.mean).toBe(60);
    expect(stats.min).toBe(50);
    expect(stats.max).toBe(70);
  });

  it('should compute percentiles', () => {
    let s = createAggregatorState();
    for (let i = 1; i <= 100; i++) s = addSample(s, 'm', i);
    const stats = getAggregatedStats(s, 'm');
    expect(stats.p50).toBe(50);
    expect(stats.p95).toBe(95);
    expect(stats.p99).toBe(99);
  });

  it('should detect rising trend', () => {
    let s = createAggregatorState();
    for (let i = 0; i < 10; i++) s = addSample(s, 'm', 0.1 + i * 0.1);
    expect(getAggregatedStats(s, 'm').trend).toBe('rising');
  });

  it('should get all stats', () => {
    let s = createAggregatorState();
    s = addSample(s, 'fps', 60);
    s = addSample(s, 'memory', 100);
    expect(getAllStats(s)).toHaveLength(2);
  });

  it('should clear all samples', () => {
    let s = createAggregatorState();
    s = addSample(s, 'fps', 60);
    s = clearAggregatorSamples(s);
    expect(s.samples.size).toBe(0);
  });

  it('should clear specific metric', () => {
    let s = createAggregatorState();
    s = addSample(s, 'fps', 60);
    s = addSample(s, 'memory', 100);
    s = clearAggregatorSamples(s, 'fps');
    expect(s.samples.size).toBe(1);
  });

  it('should cap samples at 1000', () => {
    let s = createAggregatorState();
    for (let i = 0; i < 1500; i++) s = addSample(s, 'fps', 60);
    expect(s.samples.get('fps')!.length).toBe(1000);
  });

  it('should produce report', () => {
    let s = createAggregatorState();
    s = addSample(s, 'fps', 60);
    s = addSample(s, 'memory', 100);
    const r = getAggregatorReport(s);
    expect(r.metricsTracked).toBe(2);
  });
});
