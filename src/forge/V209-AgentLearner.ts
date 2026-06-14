/**
 * V209 AgentLearner - Direction B Agent Forge (Iter 25/30)
 * generic-agent: Learn from agent outcomes to improve next time
 */
export type Outcome = 'success' | 'partial' | 'failure';

export interface LearningEvent {
  id: string;
  agentId: string;
  taskType: string;
  outcome: Outcome;
  parameters: Record<string, any>;
  timestamp: number;
  score: number;       // 0..1
}

export interface LearnerState {
  events: LearningEvent[];
  agentStats: Map<string, { total: number; success: number; partial: number; failure: number; avgScore: number }>;
  nextId: number;
}

export function createLearnerState(): LearnerState {
  return { events: [], agentStats: new Map(), nextId: 1 };
}

export function recordOutcome(state: LearnerState, agentId: string, taskType: string, outcome: Outcome, parameters: Record<string, any>, score: number): LearnerState {
  const event: LearningEvent = { id: `learn-${state.nextId}`, agentId, taskType, outcome, parameters, timestamp: Date.now(), score };
  const stats = state.agentStats.get(agentId) || { total: 0, success: 0, partial: 0, failure: 0, avgScore: 0 };
  const newTotal = stats.total + 1;
  const newSuccess = stats.success + (outcome === 'success' ? 1 : 0);
  const newPartial = stats.partial + (outcome === 'partial' ? 1 : 0);
  const newFailure = stats.failure + (outcome === 'failure' ? 1 : 0);
  const newAvgScore = (stats.avgScore * stats.total + score) / newTotal;
  const agentStats = new Map(state.agentStats);
  agentStats.set(agentId, { total: newTotal, success: newSuccess, partial: newPartial, failure: newFailure, avgScore: newAvgScore });
  return { ...state, events: [...state.events, event].slice(-1000), agentStats, nextId: state.nextId + 1 };
}

export function getSuccessRate(state: LearnerState, agentId: string): number {
  const stats = state.agentStats.get(agentId);
  if (!stats || stats.total === 0) return 0;
  return stats.success / stats.total;
}

export function getAvgScore(state: LearnerState, agentId: string): number {
  return state.agentStats.get(agentId)?.avgScore || 0;
}

export function getBestParameterForOutcome(state: LearnerState, agentId: string, taskType: string, outcome: Outcome): Record<string, any> | undefined {
  const candidates = state.events.filter(e => e.agentId === agentId && e.taskType === taskType && e.outcome === outcome);
  if (candidates.length === 0) return undefined;
  const best = candidates.sort((a, b) => b.score - a.score)[0];
  return best.parameters;
}

export function getRecommendedParameters(state: LearnerState, agentId: string, taskType: string): Record<string, any> {
  const bestSuccess = getBestParameterForOutcome(state, agentId, taskType, 'success');
  if (bestSuccess) return bestSuccess;
  const bestPartial = getBestParameterForOutcome(state, agentId, taskType, 'partial');
  if (bestPartial) return bestPartial;
  return {};
}

export function getOutcomeDistribution(state: LearnerState, agentId: string): Record<Outcome, number> {
  const stats = state.agentStats.get(agentId);
  if (!stats) return { success: 0, partial: 0, failure: 0 };
  return { success: stats.success, partial: stats.partial, failure: stats.failure };
}

export function clearEvents(state: LearnerState): LearnerState {
  return { ...state, events: [], agentStats: new Map() };
}

export function getLearnerReport(state: LearnerState): { totalEvents: number; agents: number; overallSuccessRate: number } {
  let total = 0, success = 0;
  for (const stats of state.agentStats.values()) {
    total += stats.total;
    success += stats.success;
  }
  return { totalEvents: state.events.length, agents: state.agentStats.size, overallSuccessRate: total > 0 ? success / total : 0 };
}
