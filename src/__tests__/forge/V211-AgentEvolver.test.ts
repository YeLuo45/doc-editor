import { describe, it, expect } from 'vitest';
import {
  createEvolverState, seedPopulation, setFitness, mutateGenome, crossover, evolveGeneration,
  getBestGenome, getEvolverReport,
} from '../../forge/V211-AgentEvolver';

describe('V211 AgentEvolver', () => {
  it('should create empty state', () => {
    const s = createEvolverState();
    expect(s.population).toHaveLength(0);
  });

  it('should seed population', () => {
    let s = createEvolverState();
    s = seedPopulation(s, 5);
    expect(s.population).toHaveLength(10);
    expect(s.population[0].genes).toHaveLength(5);
  });

  it('should set fitness', () => {
    let s = createEvolverState();
    s = seedPopulation(s, 3);
    const id = s.population[0].id;
    s = setFitness(s, id, 0.9);
    expect(s.population[0].fitness).toBe(0.9);
  });

  it('should track best genome', () => {
    let s = createEvolverState();
    s = seedPopulation(s, 3);
    s = setFitness(s, s.population[0].id, 0.5);
    s = setFitness(s, s.population[1].id, 0.9);
    const best = getBestGenome(s);
    expect(best!.fitness).toBe(0.9);
  });

  it('should mutate genome', () => {
    const genome = { id: 'g1', genes: [0.5, 0.5, 0.5], fitness: 0, generation: 0, parentIds: [], mutations: [] };
    const mutated = mutateGenome(genome, 1.0);
    expect(mutated.parentIds).toContain('g1');
    expect(mutated.mutations.length).toBeGreaterThan(0);
  });

  it('should crossover two genomes', () => {
    const g1 = { id: 'a', genes: [0.1, 0.2, 0.3], fitness: 0, generation: 0, parentIds: [], mutations: [] };
    const g2 = { id: 'b', genes: [0.7, 0.8, 0.9], fitness: 0, generation: 0, parentIds: [], mutations: [] };
    const child = crossover(g1, g2);
    expect(child.parentIds).toContain('a');
    expect(child.parentIds).toContain('b');
  });

  it('should evolve generation', () => {
    let s = createEvolverState();
    s = seedPopulation(s, 3);
    for (const g of s.population) {
      s = setFitness(s, g.id, Math.random());
    }
    s = evolveGeneration(s);
    expect(s.generation).toBe(1);
  });

  it('should produce report', () => {
    let s = createEvolverState();
    s = seedPopulation(s, 3);
    const r = getEvolverReport(s);
    expect(r.population).toBe(10);
    expect(r.generation).toBe(0);
  });

  it('should handle empty population for evolveGeneration', () => {
    const s = createEvolverState();
    const newState = evolveGeneration(s);
    expect(newState.generation).toBe(0);
  });

  it('should evolve with same parent when only one selected', () => {
    let s = createEvolverState();
    s = seedPopulation(s, 2);
    s = evolveGeneration(s);
    expect(s.population).toHaveLength(10);
  });
});
