/**
 * V182 MindEvolver - Direction A Writing Mind (Iter 28/30)
 * generic-agent: evolve suggestion strategy based on outcomes
 */
export type EvolutionStrategy = 'exploit' | 'explore' | 'balanced';

export interface Strategy {
  id: string;
  name: string;
  parameters: Record<string, number>;
  fitness: number;
  generation: number;
  trials: number;
  successes: number;
}

export interface EvolutionState {
  strategies: Strategy[];
  generation: number;
  bestStrategyId: string | null;
  mutationRate: number;
  populationSize: number;
}

export function createEvolutionState(): EvolutionState {
  return { strategies: [], generation: 0, bestStrategyId: null, mutationRate: 0.1, populationSize: 10 };
}

export function seedStrategies(state: EvolutionState, names: string[]): EvolutionState {
  const strategies: Strategy[] = names.map((name, i) => ({
    id: `strat-${i + 1}`,
    name,
    parameters: { aggressiveness: Math.random(), verbosity: Math.random(), focus: Math.random() },
    fitness: 0.5,
    generation: 0,
    trials: 0,
    successes: 0,
  }));
  return { ...state, strategies };
}

export function recordTrial(state: EvolutionState, strategyId: string, success: boolean): EvolutionState {
  const strategies = state.strategies.map(s => {
    if (s.id !== strategyId) return s;
    const trials = s.trials + 1;
    const successes = s.successes + (success ? 1 : 0);
    const fitness = trials > 0 ? successes / trials : 0;
    return { ...s, trials, successes, fitness };
  });
  return { ...state, strategies };
}

export function selectStrategy(state: EvolutionState, approach: EvolutionStrategy = 'balanced'): Strategy {
  if (state.strategies.length === 0) {
    return { id: 'default', name: 'default', parameters: {}, fitness: 0.5, generation: 0, trials: 0, successes: 0 };
  }
  if (approach === 'exploit') {
    return state.strategies.reduce((best, s) => s.fitness > best.fitness ? s : best, state.strategies[0]);
  }
  if (approach === 'explore') {
    return state.strategies[Math.floor(Math.random() * state.strategies.length)];
  }
  // balanced: 70% exploit, 30% explore
  if (Math.random() < 0.7) {
    return state.strategies.reduce((best, s) => s.fitness > best.fitness ? s : best, state.strategies[0]);
  }
  return state.strategies[Math.floor(Math.random() * state.strategies.length)];
}

export function evolveGeneration(state: EvolutionState): EvolutionState {
  if (state.strategies.length === 0) return state;
  // Sort by fitness
  const sorted = [...state.strategies].sort((a, b) => b.fitness - a.fitness);
  const top = sorted.slice(0, Math.ceil(state.populationSize / 2));
  const newStrategies: Strategy[] = [];
  for (let i = 0; i < state.populationSize; i++) {
    const parent = top[i % top.length];
    const child: Strategy = {
      ...parent,
      id: `strat-g${state.generation + 1}-${i + 1}`,
      parameters: mutateParameters(parent.parameters, state.mutationRate),
      generation: state.generation + 1,
      trials: 0,
      successes: 0,
      fitness: 0.5,
    };
    newStrategies.push(child);
  }
  const best = sorted[0];
  return { ...state, strategies: newStrategies, generation: state.generation + 1, bestStrategyId: best.id };
}

function mutateParameters(params: Record<string, number>, rate: number): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(params)) {
    if (Math.random() < rate) {
      result[k] = Math.max(0, Math.min(1, v + (Math.random() - 0.5) * 0.2));
    } else {
      result[k] = v;
    }
  }
  return result;
}

export function getBestStrategy(state: EvolutionState): Strategy | undefined {
  if (state.strategies.length === 0) return undefined;
  return state.strategies.reduce((best, s) => s.fitness > best.fitness ? s : best, state.strategies[0]);
}

export function setMutationRate(state: EvolutionState, rate: number): EvolutionState {
  return { ...state, mutationRate: Math.max(0, Math.min(1, rate)) };
}

export function getEvolutionReport(state: EvolutionState): { generation: number; population: number; avgFitness: number; bestFitness: number; bestStrategy: string | null } {
  const avgFitness = state.strategies.length > 0 ? state.strategies.reduce((a, b) => a + b.fitness, 0) / state.strategies.length : 0;
  const best = getBestStrategy(state);
  return {
    generation: state.generation,
    population: state.strategies.length,
    avgFitness,
    bestFitness: best?.fitness || 0,
    bestStrategy: best?.name || null,
  };
}
