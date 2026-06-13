import { describe, it, expect } from 'vitest';
import {
  createEvolutionState, seedStrategies, recordTrial, selectStrategy,
  evolveGeneration, getBestStrategy, setMutationRate, getEvolutionReport,
} from '../../mind/V182-MindEvolver';

describe('V182 MindEvolver', () => {
  it('should create empty state', () => {
    const s = createEvolutionState();
    expect(s.strategies).toHaveLength(0);
    expect(s.generation).toBe(0);
  });

  it('should seed strategies', () => {
    let s = createEvolutionState();
    s = seedStrategies(s, ['aggressive', 'conservative', 'balanced']);
    expect(s.strategies).toHaveLength(3);
  });

  it('should record trial success', () => {
    let s = createEvolutionState();
    s = seedStrategies(s, ['a']);
    s = recordTrial(s, 'strat-1', true);
    expect(s.strategies[0].successes).toBe(1);
    expect(s.strategies[0].fitness).toBe(1);
  });

  it('should record trial failure', () => {
    let s = createEvolutionState();
    s = seedStrategies(s, ['a']);
    s = recordTrial(s, 'strat-1', false);
    expect(s.strategies[0].fitness).toBe(0);
  });

  it('should select strategy (exploit)', () => {
    let s = createEvolutionState();
    s = seedStrategies(s, ['a', 'b', 'c']);
    s = recordTrial(s, 'strat-1', true);
    s = recordTrial(s, 'strat-1', true);
    const sel = selectStrategy(s, 'exploit');
    expect(sel.id).toBe('strat-1');
  });

  it('should select strategy (explore)', () => {
    let s = createEvolutionState();
    s = seedStrategies(s, ['a', 'b', 'c']);
    const sel = selectStrategy(s, 'explore');
    expect(sel).toBeDefined();
  });

  it('should select strategy (balanced)', () => {
    let s = createEvolutionState();
    s = seedStrategies(s, ['a', 'b', 'c']);
    const sel = selectStrategy(s, 'balanced');
    expect(sel).toBeDefined();
  });

  it('should select default for empty state', () => {
    const s = createEvolutionState();
    const sel = selectStrategy(s, 'exploit');
    expect(sel.id).toBe('default');
  });

  it('should evolve generation', () => {
    let s = createEvolutionState();
    s = seedStrategies(s, ['a', 'b', 'c']);
    s = evolveGeneration(s);
    expect(s.generation).toBe(1);
  });

  it('should get best strategy', () => {
    let s = createEvolutionState();
    s = seedStrategies(s, ['a', 'b']);
    s = recordTrial(s, 'strat-1', true);
    s = recordTrial(s, 'strat-1', true);
    s = recordTrial(s, 'strat-2', false);
    const best = getBestStrategy(s);
    expect(best!.id).toBe('strat-1');
  });

  it('should set mutation rate', () => {
    let s = createEvolutionState();
    s = setMutationRate(s, 0.5);
    expect(s.mutationRate).toBe(0.5);
  });

  it('should produce report', () => {
    let s = createEvolutionState();
    s = seedStrategies(s, ['a', 'b']);
    const r = getEvolutionReport(s);
    expect(r.generation).toBe(0);
    expect(r.population).toBe(2);
  });
});
