/**
 * V211 AgentEvolver - Direction B Agent Forge (Iter 27/30)
 * generic-agent: Evolve agent strategies via mutation/crossover
 */
export type MutationType = 'point' | 'swap' | 'insert' | 'delete';

export interface Genome {
  id: string;
  genes: number[];        // 0..1 each
  fitness: number;
  generation: number;
  parentIds: string[];
  mutations: MutationType[];
}

export interface EvolverState {
  population: Genome[];
  generation: number;
  bestGenome: Genome | null;
  mutationRate: number;
  populationSize: number;
  nextId: number;
}

export function createEvolverState(): EvolverState {
  return { population: [], generation: 0, bestGenome: null, mutationRate: 0.1, populationSize: 10, nextId: 1 };
}

export function seedPopulation(state: EvolverState, geneLength: number): EvolverState {
  const population: Genome[] = [];
  for (let i = 0; i < state.populationSize; i++) {
    const genes = Array.from({ length: geneLength }, () => Math.random());
    population.push({ id: `gen-${state.nextId++}`, genes, fitness: 0, generation: 0, parentIds: [], mutations: [] });
  }
  return { ...state, population, nextId: state.nextId };
}

export function setFitness(state: EvolverState, genomeId: string, fitness: number): EvolverState {
  const population = state.population.map(g => g.id === genomeId ? { ...g, fitness } : g);
  const best = population.reduce((b, g) => !b || g.fitness > b.fitness ? g : b, state.bestGenome!);
  return { ...state, population, bestGenome: best || state.bestGenome };
}

function mutateGene(gene: number, type: MutationType): number {
  if (type === 'point') return Math.max(0, Math.min(1, gene + (Math.random() - 0.5) * 0.2));
  if (type === 'swap') return 1 - gene;
  if (type === 'insert') return Math.random();
  if (type === 'delete') return Math.max(0, Math.min(1, gene * 0.5));
  return gene;
}

export function mutateGenome(genome: Genome, rate: number): Genome {
  const mutations: MutationType[] = [];
  const newGenes = genome.genes.map(g => {
    if (Math.random() < rate) {
      const types: MutationType[] = ['point', 'swap', 'insert', 'delete'];
      const type = types[Math.floor(Math.random() * types.length)];
      mutations.push(type);
      return mutateGene(g, type);
    }
    return g;
  });
  return { ...genome, id: `gen-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, genes: newGenes, fitness: 0, parentIds: [genome.id], mutations };
}

export function crossover(parent1: Genome, parent2: Genome): Genome {
  const point = Math.floor(Math.random() * parent1.genes.length);
  const genes = [...parent1.genes.slice(0, point), ...parent2.genes.slice(point)];
  return { id: `gen-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, genes, fitness: 0, generation: Math.max(parent1.generation, parent2.generation) + 1, parentIds: [parent1.id, parent2.id], mutations: [] };
}

export function evolveGeneration(state: EvolverState): EvolverState {
  if (state.population.length === 0) return state;
  const sorted = [...state.population].sort((a, b) => b.fitness - a.fitness);
  const top = sorted.slice(0, Math.ceil(state.populationSize / 2));
  const newPopulation: Genome[] = [...top];
  while (newPopulation.length < state.populationSize) {
    const p1 = top[Math.floor(Math.random() * top.length)];
    const p2 = top[Math.floor(Math.random() * top.length)];
    if (p1.id !== p2.id) {
      const child = mutateGenome(crossover(p1, p2), state.mutationRate);
      newPopulation.push(child);
    } else {
      newPopulation.push(mutateGenome(p1, state.mutationRate));
    }
  }
  return { ...state, population: newPopulation, generation: state.generation + 1 };
}

export function getBestGenome(state: EvolverState): Genome | undefined {
  return state.bestGenome || state.population.reduce((b, g) => !b || g.fitness > b.fitness ? g : b, undefined as Genome | undefined);
}

export function getEvolverReport(state: EvolverState): { generation: number; population: number; avgFitness: number; bestFitness: number } {
  const avgFitness = state.population.length > 0 ? state.population.reduce((a, b) => a + b.fitness, 0) / state.population.length : 0;
  return { generation: state.generation, population: state.population.length, avgFitness, bestFitness: state.bestGenome?.fitness || 0 };
}
