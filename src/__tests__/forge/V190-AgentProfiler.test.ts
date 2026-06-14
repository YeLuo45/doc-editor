import { describe, it, expect } from 'vitest';
import {
  createProfilerState, recordSample, getStatsForAgent, getAllAgentStats,
  clearSamples, setPricing, getProfilerReport,
} from '../../forge/V190-AgentProfiler';

describe('V190 AgentProfiler', () => {
  it('should create empty state', () => {
    const s = createProfilerState();
    expect(s.samples).toHaveLength(0);
  });

  it('should record sample', () => {
    let s = createProfilerState();
    s = recordSample(s, 'editor', 100, 50, 100, true);
    expect(s.samples).toHaveLength(1);
  });

  it('should compute stats for agent', () => {
    let s = createProfilerState();
    s = recordSample(s, 'editor', 100, 50, 100, true);
    s = recordSample(s, 'editor', 200, 60, 150, true);
    const stats = getStatsForAgent(s, 'editor');
    expect(stats.sampleCount).toBe(2);
    expect(stats.successRate).toBe(1);
  });

  it('should compute percentiles', () => {
    let s = createProfilerState();
    for (let i = 1; i <= 100; i++) s = recordSample(s, 'a', i, 10, 10, true);
    const stats = getStatsForAgent(s, 'a');
    expect(stats.p50Latency).toBe(50);
    expect(stats.p95Latency).toBe(95);
  });

  it('should compute cost', () => {
    let s = createProfilerState();
    s = recordSample(s, 'a', 100, 1000, 500, true);
    const stats = getStatsForAgent(s, 'a');
    expect(stats.totalCost).toBeGreaterThan(0);
  });

  it('should return zero stats for unknown agent', () => {
    const s = createProfilerState();
    const stats = getStatsForAgent(s, 'unknown');
    expect(stats.sampleCount).toBe(0);
  });

  it('should get all agent stats', () => {
    let s = createProfilerState();
    s = recordSample(s, 'a', 100, 50, 100, true);
    s = recordSample(s, 'b', 200, 60, 150, false);
    const stats = getAllAgentStats(s);
    expect(stats).toHaveLength(2);
  });

  it('should clear samples', () => {
    let s = createProfilerState();
    s = recordSample(s, 'a', 100, 50, 100, true);
    s = clearSamples(s);
    expect(s.samples).toHaveLength(0);
  });

  it('should set pricing', () => {
    let s = createProfilerState();
    s = setPricing(s, 0.001, 0.002);
    expect(s.costPerInputToken).toBe(0.001);
  });

  it('should compute success rate', () => {
    let s = createProfilerState();
    s = recordSample(s, 'a', 100, 10, 10, true);
    s = recordSample(s, 'a', 100, 10, 10, false);
    const stats = getStatsForAgent(s, 'a');
    expect(stats.successRate).toBe(0.5);
  });

  it('should produce report', () => {
    let s = createProfilerState();
    s = recordSample(s, 'a', 100, 10, 10, true);
    const r = getProfilerReport(s);
    expect(r.totalSamples).toBe(1);
  });
});
