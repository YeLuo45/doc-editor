import { describe, it, expect } from 'vitest';
import {
  createLearnerState, recordOutcome, getSuccessRate, getAvgScore,
  getBestParameterForOutcome, getRecommendedParameters, getOutcomeDistribution,
  clearEvents, getLearnerReport,
} from '../../forge/V209-AgentLearner';

describe('V209 AgentLearner', () => {
  it('should create empty state', () => {
    const s = createLearnerState();
    expect(s.events).toHaveLength(0);
  });

  it('should record outcome', () => {
    let s = createLearnerState();
    s = recordOutcome(s, 'a', 'edit', 'success', { temp: 0.7 }, 0.9);
    expect(s.events).toHaveLength(1);
  });

  it('should get success rate', () => {
    let s = createLearnerState();
    s = recordOutcome(s, 'a', 'edit', 'success', {}, 0.9);
    s = recordOutcome(s, 'a', 'edit', 'failure', {}, 0.3);
    expect(getSuccessRate(s, 'a')).toBe(0.5);
  });

  it('should get average score', () => {
    let s = createLearnerState();
    s = recordOutcome(s, 'a', 'edit', 'success', {}, 0.8);
    s = recordOutcome(s, 'a', 'edit', 'success', {}, 1.0);
    expect(getAvgScore(s, 'a')).toBeCloseTo(0.9, 1);
  });

  it('should get best parameters for outcome', () => {
    let s = createLearnerState();
    s = recordOutcome(s, 'a', 'edit', 'success', { temp: 0.5 }, 0.7);
    s = recordOutcome(s, 'a', 'edit', 'success', { temp: 0.9 }, 0.95);
    const best = getBestParameterForOutcome(s, 'a', 'edit', 'success');
    expect(best!.temp).toBe(0.9);
  });

  it('should recommend parameters (prefer success)', () => {
    let s = createLearnerState();
    s = recordOutcome(s, 'a', 'edit', 'success', { temp: 0.5 }, 0.7);
    s = recordOutcome(s, 'a', 'edit', 'partial', { temp: 0.8 }, 0.5);
    const rec = getRecommendedParameters(s, 'a', 'edit');
    expect(rec.temp).toBe(0.5);
  });

  it('should get outcome distribution', () => {
    let s = createLearnerState();
    s = recordOutcome(s, 'a', 'edit', 'success', {}, 0.9);
    s = recordOutcome(s, 'a', 'edit', 'partial', {}, 0.5);
    const dist = getOutcomeDistribution(s, 'a');
    expect(dist.success).toBe(1);
    expect(dist.partial).toBe(1);
  });

  it('should clear events', () => {
    let s = createLearnerState();
    s = recordOutcome(s, 'a', 'edit', 'success', {}, 0.9);
    s = clearEvents(s);
    expect(s.events).toHaveLength(0);
  });

  it('should produce report', () => {
    let s = createLearnerState();
    s = recordOutcome(s, 'a', 'edit', 'success', {}, 0.9);
    s = recordOutcome(s, 'b', 'edit', 'failure', {}, 0.3);
    const r = getLearnerReport(s);
    expect(r.agents).toBe(2);
    expect(r.overallSuccessRate).toBe(0.5);
  });

  it('should return 0 success rate for unknown agent', () => {
    const s = createLearnerState();
    expect(getSuccessRate(s, 'unknown')).toBe(0);
  });

  it('should return empty recommended for no history', () => {
    const s = createLearnerState();
    expect(getRecommendedParameters(s, 'a', 'edit')).toEqual({});
  });
});
