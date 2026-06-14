import { describe, it, expect } from 'vitest';
import {
  createSyncEvolverState, seedPopulation, setFitness, recommendStrategy,
  mutateGenome, evolveGeneration, getBestStrategy, getSyncEvolverReport,
} from '../../federation/V241-SyncEvolver';

describe('V241 SyncEvolver', () => {
  it('should create empty state', () => {
    const s = createSyncEvolverState();
    expect(s.population).toHaveLength(0);
  });

  it('should seed population', () => {
    let s = createSyncEvolverState();
    s = seedPopulation(s, 8);
    expect(s.population).toHaveLength(8);
  });

  it('should set fitness', () => {
    let s = createSyncEvolverState();
    s = seedPopulation(s, 4);
    const id = s.population[0].id;
    s = setFitness(s, id, 0.9);
    expect(s.population[0].fitness).toBe(0.9);
  });

  it('should recommend strategy based on conditions', () => {
    let s = createSyncEvolverState();
    s = seedPopulation(s, 4);
    const rec = recommendStrategy(s, { bandwidth: 10000, latency: 50, reliability: 0.9, cost: 0.3 });
    expect(rec).toBeDefined();
  });

  it('should return default for empty state', () => {
    const s = createSyncEvolverState();
    const rec = recommendStrategy(s, { bandwidth: 1000, latency: 50, reliability: 0.9, cost: 0.3 });
    expect(rec.id).toBe('default');
  });

  it('should mutate genome', () => {
    const genome = { id: 'g1', strategy: 'eager' as const, batchSize: 10, retryCount: 3, compression: true, fitness: 0.5, generation: 0 };
    const mutated = mutateGenome(genome, 1.0);
    expect(mutated.id).not.toBe('g1');
  });

  it('should evolve generation', () => {
    let s = createSyncEvolverState();
    s = seedPopulation(s, 4);
    s = evolveGeneration(s);
    expect(s.generation).toBe(1);
  });

  it('should get best strategy', () => {
    let s = createSyncEvolverState();
    s = seedPopulation(s, 4);
    s = setFitness(s, s.population[0].id, 0.9);
    const best = getBestStrategy(s);
    expect(best!.fitness).toBe(0.9);
  });

  it('should produce report', () => {
    let s = createSyncEvolverState();
    s = seedPopulation(s, 4);
    const r = getSyncEvolverReport(s);
    expect(r.population).toBe(4);
    expect(r.generation).toBe(0);
  });

  it('should handle empty population for evolve', () => {
    const s = createSyncEvolverState();
    const newState = evolveGeneration(s);
    expect(newState.generation).toBe(0);
  });
});
