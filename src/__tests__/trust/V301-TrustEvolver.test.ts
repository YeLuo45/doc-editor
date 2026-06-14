import { describe, it, expect } from 'vitest';
import {
  createTrustEvolverState, seedTrustPopulation, setTrustFitness, mutateTrustGenome,
  evolveTrustGeneration, getBestTrustGenome, getTrustEvolverReport,
} from '../../trust/V301-TrustEvolver';

describe('V301 TrustEvolver', () => {
  it('should create empty state', () => {
    const s = createTrustEvolverState();
    expect(s.population).toHaveLength(0);
  });

  it('should seed population', () => {
    let s = createTrustEvolverState();
    s = seedTrustPopulation(s, 8);
    expect(s.population).toHaveLength(8);
  });

  it('should set fitness', () => {
    let s = createTrustEvolverState();
    s = seedTrustPopulation(s, 4);
    const id = s.population[0].id;
    s = setTrustFitness(s, id, 0.9);
    expect(s.population[0].fitness).toBe(0.9);
  });

  it('should mutate genome', () => {
    const genome = { id: 'g1', strategy: 'strict' as const, thresholdHigh: 0.7, thresholdLow: 0.3, requireMultiSig: true, fitness: 0.5, generation: 0, trials: 0, successes: 0 };
    const mutated = mutateTrustGenome(genome, 1.0);
    expect(mutated.id).not.toBe('g1');
  });

  it('should evolve generation', () => {
    let s = createTrustEvolverState();
    s = seedTrustPopulation(s, 4);
    s = evolveTrustGeneration(s);
    expect(s.generation).toBe(1);
  });

  it('should get best genome', () => {
    let s = createTrustEvolverState();
    s = seedTrustPopulation(s, 4);
    s = setTrustFitness(s, s.population[0].id, 0.9);
    s = setTrustFitness(s, s.population[1].id, 0.5);
    const best = getBestTrustGenome(s);
    expect(best!.fitness).toBe(0.9);
  });

  it('should return undefined for empty state', () => {
    const s = createTrustEvolverState();
    expect(getBestTrustGenome(s)).toBeUndefined();
  });

  it('should produce report', () => {
    let s = createTrustEvolverState();
    s = seedTrustPopulation(s, 4);
    const r = getTrustEvolverReport(s);
    expect(r.population).toBe(4);
  });

  it('should handle empty state for evolve', () => {
    const s = createTrustEvolverState();
    expect(evolveTrustGeneration(s).generation).toBe(0);
  });
});
