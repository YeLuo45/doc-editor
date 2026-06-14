/**
 * V191 AgentOptimizer Tests - Direction B Agent Forge (Iter 7/30)
 */
import { describe, it, expect } from 'vitest';
import {
  createOptimizerState, setParamRanges, setStrategy, setMaxTrials,
  suggestParams, recordTrial, getTrials, getBestTrial, clearTrials, getOptimizerReport,
  type ParamRange,
} from '../../forge/V191-AgentOptimizer';

describe('V191 AgentOptimizer', () => {
  it('should create empty state', () => {
    const s = createOptimizerState();
    expect(s.trials).toHaveLength(0);
  });

  it('should set param ranges', () => {
    let s = createOptimizerState();
    s = setParamRanges(s, [{ name: 'temp', min: 0, max: 1, step: 0.1 }]);
    expect(s.paramRanges).toHaveLength(1);
  });

  it('should set strategy', () => {
    let s = createOptimizerState();
    s = setStrategy(s, 'bayesian');
    expect(s.strategy).toBe('bayesian');
  });

  it('should set max trials', () => {
    let s = createOptimizerState();
    s = setMaxTrials(s, 50);
    expect(s.maxTrials).toBe(50);
  });

  it('should suggest params (random)', () => {
    let s = createOptimizerState();
    s = setParamRanges(s, [{ name: 'temp', min: 0, max: 1, step: 0.1 }]);
    s = setStrategy(s, 'random');
    const r = suggestParams(s);
    expect(r.params.temp).toBeGreaterThanOrEqual(0);
    expect(r.params.temp).toBeLessThanOrEqual(1);
  });

  it('should suggest params (grid)', () => {
    let s = createOptimizerState();
    s = setParamRanges(s, [{ name: 'temp', min: 0, max: 0.5, step: 0.1 }]);
    s = setStrategy(s, 'grid');
    const r1 = suggestParams(s);
    s = r1.state;
    const r2 = suggestParams(s);
    s = r2.state;
    expect(r1.params.temp).toBe(0);
    expect(r2.params.temp).toBe(0.1);
  });

  it('should suggest params (gradient)', () => {
    let s = createOptimizerState();
    s = setParamRanges(s, [{ name: 'temp', min: 0, max: 1, step: 0.1 }]);
    s = setStrategy(s, 'gradient');
    const r = suggestParams(s);
    expect(r.params.temp).toBeGreaterThanOrEqual(0);
  });

  it('should record trial and track best', () => {
    let s = createOptimizerState();
    s = recordTrial(s, { temp: 0.5 }, 0.8);
    s = recordTrial(s, { temp: 0.7 }, 0.9);
    const best = getBestTrial(s);
    expect(best!.score).toBe(0.9);
  });

  it('should cap trials at maxTrials', () => {
    let s = createOptimizerState();
    s = setMaxTrials(s, 5);
    for (let i = 0; i < 10; i++) s = recordTrial(s, { temp: i * 0.1 }, i * 0.1);
    expect(getTrials(s)).toHaveLength(5);
  });

  it('should clear trials', () => {
    let s = createOptimizerState();
    s = recordTrial(s, { temp: 0.5 }, 0.8);
    s = clearTrials(s);
    expect(s.trials).toHaveLength(0);
  });

  it('should produce report', () => {
    let s = createOptimizerState();
    s = setParamRanges(s, [{ name: 'a', min: 0, max: 1, step: 0.1 }]);
    s = recordTrial(s, { a: 0.5 }, 0.8);
    const r = getOptimizerReport(s);
    expect(r.trialsRun).toBe(1);
    expect(r.bestScore).toBe(0.8);
  });
});
