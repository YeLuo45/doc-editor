/**
 * V191 AgentOptimizer - Direction B Agent Forge (Iter 7/30)
 * thunderbolt: Optimize agent parameters based on metrics
 */
export type OptimizationStrategy = 'grid' | 'random' | 'bayesian' | 'gradient';

export interface ParamRange {
  name: string;
  min: number;
  max: number;
  step: number;
}

export interface OptimizationTrial {
  id: number;
  params: Record<string, number>;
  score: number;
  timestamp: number;
}

export interface OptimizerState {
  paramRanges: ParamRange[];
  trials: OptimizationTrial[];
  bestTrial: OptimizationTrial | null;
  strategy: OptimizationStrategy;
  maxTrials: number;
  nextId: number;
  gridCounter: number;
}

export function createOptimizerState(): OptimizerState {
  return { paramRanges: [], trials: [], bestTrial: null, strategy: 'random', maxTrials: 100, nextId: 1, gridCounter: 0 };
}

export function setParamRanges(state: OptimizerState, ranges: ParamRange[]): OptimizerState {
  return { ...state, paramRanges: ranges };
}

export function setStrategy(state: OptimizerState, strategy: OptimizationStrategy): OptimizerState {
  return { ...state, strategy };
}

export function setMaxTrials(state: OptimizerState, max: number): OptimizerState {
  return { ...state, maxTrials: max };
}

export function suggestParams(state: OptimizerState): { state: OptimizerState; params: Record<string, number> } {
  const params: Record<string, number> = {};
  for (const range of state.paramRanges) {
    if (state.strategy === 'random' || state.strategy === 'bayesian') {
      const steps = Math.floor((range.max - range.min) / range.step) + 1;
      params[range.name] = range.min + Math.floor(Math.random() * steps) * range.step;
    } else if (state.strategy === 'grid') {
      const steps = Math.floor((range.max - range.min) / range.step) + 1;
      // Use gridCounter so it increments on each call
      const idx = state.gridCounter % steps;
      params[range.name] = range.min + idx * range.step;
    } else { // gradient
      const last = state.trials[state.trials.length - 1];
      if (last) {
        const prev = last.params[range.name] ?? range.min;
        const direction = state.bestTrial && last.score > state.bestTrial.score ? 1 : -1;
        params[range.name] = Math.max(range.min, Math.min(range.max, prev + direction * range.step));
      } else {
        params[range.name] = (range.min + range.max) / 2;
      }
    }
  }
  // Increment gridCounter for grid strategy
  const newState = state.strategy === 'grid' ? { ...state, gridCounter: state.gridCounter + 1 } : state;
  return { state: newState, params };
}

export function recordTrial(state: OptimizerState, params: Record<string, number>, score: number): OptimizerState {
  const trial: OptimizationTrial = { id: state.nextId, params, score, timestamp: Date.now() };
  const trials = [...state.trials, trial].slice(-state.maxTrials);
  const bestTrial = !state.bestTrial || score > state.bestTrial.score ? trial : state.bestTrial;
  return { ...state, trials, bestTrial, nextId: state.nextId + 1 };
}

export function getTrials(state: OptimizerState): OptimizationTrial[] {
  return state.trials;
}

export function getBestTrial(state: OptimizerState): OptimizationTrial | null {
  return state.bestTrial;
}

export function clearTrials(state: OptimizerState): OptimizerState {
  return { ...state, trials: [], bestTrial: null };
}

export function getOptimizerReport(state: OptimizerState): { trialsRun: number; bestScore: number; paramRanges: number; strategy: string } {
  return { trialsRun: state.trials.length, bestScore: state.bestTrial?.score || 0, paramRanges: state.paramRanges.length, strategy: state.strategy };
}
