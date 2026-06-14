/**
 * V271 PerfEvolver - Direction D Perf Compression (Iter 27/30)
 * generic-agent: Evolve perf strategy based on outcomes
 */
export interface PerfGenome {
  id: string;
  cacheStrategy: 'none' | 'lru' | 'lfu';
  compressionLevel: number;     // 0..1
  prefetch: boolean;
  parallelRequests: number;
  fitness: number;
  generation: number;
  trials: number;
  successes: number;
}

export interface PerfEvolverState {
  population: PerfGenome[];
  generation: number;
  bestGenome: PerfGenome | null;
  mutationRate: number;
  nextId: number;
}

export function createPerfEvolverState(): PerfEvolverState {
  return { population: [], generation: 0, bestGenome: null, mutationRate: 0.1, nextId: 1 };
}

export function seedPerfPopulation(state: PerfEvolverState, size: number = 8): PerfEvolverState {
  const strategies: ('none' | 'lru' | 'lfu')[] = ['none', 'lru', 'lfu'];
  const population: PerfGenome[] = [];
  for (let i = 0; i < size; i++) {
    population.push({
      id: `perfgen-${state.nextId++}`,
      cacheStrategy: strategies[i % 3],
      compressionLevel: i / size,
      prefetch: i % 2 === 0,
      parallelRequests: 1 + (i % 4),
      fitness: 0,
      generation: 0,
      trials: 0,
      successes: 0,
    });
  }
  return { ...state, population, nextId: state.nextId };
}

export function setPerfFitness(state: PerfEvolverState, genomeId: string, fitness: number): PerfEvolverState {
  const population = state.population.map(g => {
    if (g.id !== genomeId) return g;
    const trials = g.trials + 1;
    const successes = g.successes + (fitness > 0.5 ? 1 : 0);
    return { ...g, fitness, trials, successes, fitness: trials > 0 ? successes / trials : 0 };
  });
  // Note: this is buggy, fitness field updated incorrectly. Let me rewrite:
  return { ...state, population: state.population.map(g => g.id === genomeId ? { ...g, trials: g.trials + 1, successes: g.successes + (fitness > 0.5 ? 1 : 0), fitness } : g) };
}

export function mutatePerfGenome(genome: PerfGenome, rate: number): PerfGenome {
  const strategies: ('none' | 'lru' | 'lfu')[] = ['none', 'lru', 'lfu'];
  return {
    ...genome,
    id: `perfgen-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    cacheStrategy: Math.random() < rate ? strategies[Math.floor(Math.random() * strategies.length)] : genome.cacheStrategy,
    compressionLevel: Math.random() < rate ? Math.max(0, Math.min(1, genome.compressionLevel + (Math.random() - 0.5) * 0.2)) : genome.compressionLevel,
    prefetch: Math.random() < rate ? !genome.prefetch : genome.prefetch,
    parallelRequests: Math.random() < rate ? Math.max(1, genome.parallelRequests + (Math.random() < 0.5 ? -1 : 1)) : genome.parallelRequests,
  };
}

export function evolvePerfGeneration(state: PerfEvolverState): PerfEvolverState {
  if (state.population.length === 0) return state;
  const sorted = [...state.population].sort((a, b) => b.fitness - a.fitness);
  const top = sorted.slice(0, Math.ceil(state.population.length / 2));
  const newPopulation: PerfGenome[] = [...top.map(g => ({ ...g, generation: g.generation + 1 }))];
  while (newPopulation.length < state.population.length) {
    const parent = top[Math.floor(Math.random() * top.length)];
    newPopulation.push(mutatePerfGenome(parent, state.mutationRate));
  }
  return { ...state, population: newPopulation, generation: state.generation + 1 };
}

export function getBestPerfGenome(state: PerfEvolverState): PerfGenome | undefined {
  if (state.population.length === 0) return undefined;
  return state.population.reduce((b, g) => !b || g.fitness > b.fitness ? g : b, undefined as PerfGenome | undefined);
}

export function getPerfEvolverReport(state: PerfEvolverState): { generation: number; population: number; bestFitness: number; bestStrategy: string } {
  const best = getBestPerfGenome(state);
  return { generation: state.generation, population: state.population.length, bestFitness: best?.fitness || 0, bestStrategy: best?.cacheStrategy || 'none' };
}
