import { describe, it, expect } from 'vitest';
import {
  createPerfEvolverState, seedPerfPopulation, setPerfFitness, mutatePerfGenome,
  evolvePerfGeneration, getBestPerfGenome, getPerfEvolverReport,
} from '../../perf/V271-PerfEvolver';

describe('V271 PerfEvolver', () => {
  it('should create empty state', () => {
    const s = createPerfEvolverState();
    expect(s.population).toHaveLength(0);
  });

  it('should seed population', () => {
    let s = createPerfEvolverState();
    s = seedPerfPopulation(s, 8);
    expect(s.population).toHaveLength(8);
  });

  it('should set fitness', () => {
    let s = createPerfEvolverState();
    s = seedPerfPopulation(s, 4);
    const id = s.population[0].id;
    s = setPerfFitness(s, id, 0.9);
    expect(s.population[0].fitness).toBe(0.9);
  });

  it('should mutate genome', () => {
    const genome = { id: 'g1', cacheStrategy: 'lru' as const, compressionLevel: 0.5, prefetch: true, parallelRequests: 2, fitness: 0.5, generation: 0, trials: 0, successes: 0 };
    const mutated = mutatePerfGenome(genome, 1.0);
    expect(mutated.id).not.toBe('g1');
  });

  it('should evolve generation', () => {
    let s = createPerfEvolverState();
    s = seedPerfPopulation(s, 4);
    s = evolvePerfGeneration(s);
    expect(s.generation).toBe(1);
  });

  it('should get best genome', () => {
    let s = createPerfEvolverState();
    s = seedPerfPopulation(s, 4);
    s = setPerfFitness(s, s.population[0].id, 0.9);
    s = setPerfFitness(s, s.population[1].id, 0.5);
    const best = getBestPerfGenome(s);
    expect(best!.fitness).toBe(0.9);
  });

  it('should produce report', () => {
    let s = createPerfEvolverState();
    s = seedPerfPopulation(s, 4);
    const r = getPerfEvolverReport(s);
    expect(r.population).toBe(4);
  });

  it('should handle empty state for evolve', () => {
    const s = createPerfEvolverState();
    const newState = evolvePerfGeneration(s);
    expect(newState.generation).toBe(0);
  });

  it('should return undefined best for empty state', () => {
    const s = createPerfEvolverState();
    expect(getBestPerfGenome(s)).toBeUndefined();
  });
});
