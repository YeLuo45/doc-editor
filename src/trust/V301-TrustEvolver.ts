/**
 * V301 TrustEvolver - Direction E Trust Verification (Iter 27/30)
 * generic-agent: Evolve trust strategy based on outcomes
 */
export type TrustStrategy = 'strict' | 'moderate' | 'lenient' | 'adaptive';

export interface TrustGenome {
  id: string;
  strategy: TrustStrategy;
  thresholdHigh: number;       // 0..1
  thresholdLow: number;        // 0..1
  requireMultiSig: boolean;
  fitness: number;
  generation: number;
  trials: number;
  successes: number;
}

export interface TrustEvolverState {
  population: TrustGenome[];
  generation: number;
  bestGenome: TrustGenome | null;
  mutationRate: number;
  nextId: number;
}

export function createTrustEvolverState(): TrustEvolverState {
  return { population: [], generation: 0, bestGenome: null, mutationRate: 0.1, nextId: 1 };
}

export function seedTrustPopulation(state: TrustEvolverState, size: number = 8): TrustEvolverState {
  const strategies: TrustStrategy[] = ['strict', 'moderate', 'lenient', 'adaptive'];
  const population: TrustGenome[] = [];
  for (let i = 0; i < size; i++) {
    population.push({
      id: `tgen-${state.nextId++}`,
      strategy: strategies[i % 4],
      thresholdHigh: 0.5 + (i / size) * 0.5,
      thresholdLow: 0.1 + (i / size) * 0.3,
      requireMultiSig: i % 2 === 0,
      fitness: 0,
      generation: 0,
      trials: 0,
      successes: 0,
    });
  }
  return { ...state, population, nextId: state.nextId };
}

export function setTrustFitness(state: TrustEvolverState, genomeId: string, fitness: number): TrustEvolverState {
  return { ...state, population: state.population.map(g => g.id === genomeId ? { ...g, trials: g.trials + 1, successes: g.successes + (fitness > 0.5 ? 1 : 0), fitness } : g) };
}

export function mutateTrustGenome(genome: TrustGenome, rate: number): TrustGenome {
  const strategies: TrustStrategy[] = ['strict', 'moderate', 'lenient', 'adaptive'];
  return {
    ...genome,
    id: `tgen-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    strategy: Math.random() < rate ? strategies[Math.floor(Math.random() * strategies.length)] : genome.strategy,
    thresholdHigh: Math.random() < rate ? Math.max(0, Math.min(1, genome.thresholdHigh + (Math.random() - 0.5) * 0.2)) : genome.thresholdHigh,
    thresholdLow: Math.random() < rate ? Math.max(0, Math.min(1, genome.thresholdLow + (Math.random() - 0.5) * 0.1)) : genome.thresholdLow,
    requireMultiSig: Math.random() < rate ? !genome.requireMultiSig : genome.requireMultiSig,
  };
}

export function evolveTrustGeneration(state: TrustEvolverState): TrustEvolverState {
  if (state.population.length === 0) return state;
  const sorted = [...state.population].sort((a, b) => b.fitness - a.fitness);
  const top = sorted.slice(0, Math.ceil(state.population.length / 2));
  const newPopulation: TrustGenome[] = [...top.map(g => ({ ...g, generation: g.generation + 1 }))];
  while (newPopulation.length < state.population.length) {
    const parent = top[Math.floor(Math.random() * top.length)];
    newPopulation.push(mutateTrustGenome(parent, state.mutationRate));
  }
  return { ...state, population: newPopulation, generation: state.generation + 1 };
}

export function getBestTrustGenome(state: TrustEvolverState): TrustGenome | undefined {
  if (state.population.length === 0) return undefined;
  return state.population.reduce((b, g) => !b || g.fitness > b.fitness ? g : b, undefined as TrustGenome | undefined);
}

export function getTrustEvolverReport(state: TrustEvolverState): { generation: number; population: number; bestFitness: number; bestStrategy: string } {
  const best = getBestTrustGenome(state);
  return { generation: state.generation, population: state.population.length, bestFitness: best?.fitness || 0, bestStrategy: best?.strategy || 'adaptive' };
}
