/**
 * V241 SyncEvolver - Direction C Doc Federation (Iter 27/30)
 * generic-agent: Evolve sync strategy based on network conditions
 */
export type SyncStrategy = 'eager' | 'lazy' | 'adaptive' | 'manual';

export interface NetworkConditions {
  bandwidth: number;       // kbps
  latency: number;        // ms
  reliability: number;     // 0..1
  cost: number;            // 0..1
}

export interface StrategyGenome {
  id: string;
  strategy: SyncStrategy;
  batchSize: number;
  retryCount: number;
  compression: boolean;
  fitness: number;
  generation: number;
}

export interface SyncEvolverState {
  population: StrategyGenome[];
  generation: number;
  bestStrategy: StrategyGenome | null;
  mutationRate: number;
  nextId: number;
}

export function createSyncEvolverState(): SyncEvolverState {
  return { population: [], generation: 0, bestStrategy: null, mutationRate: 0.1, nextId: 1 };
}

export function seedPopulation(state: SyncEvolverState, size: number = 8): SyncEvolverState {
  const strategies: SyncStrategy[] = ['eager', 'lazy', 'adaptive', 'manual'];
  const population: StrategyGenome[] = [];
  for (let i = 0; i < size; i++) {
    population.push({
      id: `gen-${state.nextId++}`,
      strategy: strategies[i % strategies.length],
      batchSize: 10 + i * 5,
      retryCount: 1 + (i % 3),
      compression: i % 2 === 0,
      fitness: 0,
      generation: 0,
    });
  }
  return { ...state, population, nextId: state.nextId };
}

export function setFitness(state: SyncEvolverState, genomeId: string, fitness: number): SyncEvolverState {
  const population = state.population.map(g => g.id === genomeId ? { ...g, fitness } : g);
  const best = population.reduce((b, g) => !b || g.fitness > b.fitness ? g : b, state.bestStrategy!);
  return { ...state, population, bestStrategy: best || state.bestStrategy };
}

export function recommendStrategy(state: SyncEvolverState, conditions: NetworkConditions): StrategyGenome {
  if (state.population.length === 0) {
    return { id: 'default', strategy: 'adaptive', batchSize: 20, retryCount: 3, compression: true, fitness: 0.5, generation: 0 };
  }
  // Score each genome against conditions
  const scored = state.population.map(g => {
    let score = g.fitness;
    // Bonus for matching strategy to conditions
    if (conditions.bandwidth > 5000 && g.strategy === 'eager') score += 0.1;
    if (conditions.bandwidth < 1000 && g.strategy === 'lazy') score += 0.1;
    if (conditions.reliability < 0.8 && g.retryCount >= 3) score += 0.1;
    if (conditions.cost > 0.7 && g.compression) score += 0.1;
    return { ...g, score };
  });
  return scored.sort((a, b) => b.score - a.score)[0];
}

export function mutateGenome(genome: StrategyGenome, rate: number): StrategyGenome {
  const newGenome: StrategyGenome = { ...genome, id: `gen-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
  if (Math.random() < rate) {
    newGenome.batchSize = Math.max(1, genome.batchSize + Math.floor((Math.random() - 0.5) * 10));
  }
  if (Math.random() < rate) {
    newGenome.retryCount = Math.max(0, genome.retryCount + (Math.random() < 0.5 ? -1 : 1));
  }
  if (Math.random() < rate) {
    newGenome.compression = !genome.compression;
  }
  return newGenome;
}

export function evolveGeneration(state: SyncEvolverState): SyncEvolverState {
  if (state.population.length === 0) return state;
  const sorted = [...state.population].sort((a, b) => b.fitness - a.fitness);
  const top = sorted.slice(0, Math.ceil(state.population.length / 2));
  const newPopulation: StrategyGenome[] = [...top.map(g => ({ ...g, generation: g.generation + 1 }))];
  while (newPopulation.length < state.population.length) {
    const parent = top[Math.floor(Math.random() * top.length)];
    newPopulation.push(mutateGenome(parent, state.mutationRate));
  }
  return { ...state, population: newPopulation, generation: state.generation + 1 };
}

export function getBestStrategy(state: SyncEvolverState): StrategyGenome | undefined {
  if (state.population.length === 0) return undefined;
  return state.population.reduce((b, g) => !b || g.fitness > b.fitness ? g : b, undefined as StrategyGenome | undefined);
}

export function getSyncEvolverReport(state: SyncEvolverState): { generation: number; population: number; bestFitness: number; bestStrategy: string | null } {
  const best = getBestStrategy(state);
  return { generation: state.generation, population: state.population.length, bestFitness: best?.fitness || 0, bestStrategy: best?.strategy || null };
}
