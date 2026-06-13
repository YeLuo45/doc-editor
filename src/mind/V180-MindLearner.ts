/**
 * V180 MindLearner - Direction A Writing Mind (Iter 26/30)
 * generic-agent: learn from user accept/reject of suggestions
 */
export type FeedbackType = 'accept' | 'reject' | 'modify';

export interface FeedbackEvent {
  id: string;
  type: FeedbackType;
  suggestionType: string;
  agent: string;
  timestamp: number;
  confidence: number;
}

export interface LearnerModel {
  acceptRates: Map<string, { accepted: number; rejected: number; modified: number; total: number }>;
  agentScores: Map<string, number>;
  preferenceWeights: Map<string, number>;
}

export interface LearnerState {
  events: FeedbackEvent[];
  model: LearnerModel;
  learningRate: number;
  totalFeedback: number;
  nextId: number;
}

export function createLearnerState(): LearnerState {
  return {
    events: [],
    model: { acceptRates: new Map(), agentScores: new Map(), preferenceWeights: new Map() },
    learningRate: 0.1,
    totalFeedback: 0,
    nextId: 1,
  };
}

export function recordFeedback(state: LearnerState, type: FeedbackType, suggestionType: string, agent: string, confidence: number): LearnerState {
  const event: FeedbackEvent = { id: `fb-${state.nextId}`, type, suggestionType, agent, timestamp: Date.now(), confidence };
  const events = [...state.events, event].slice(-500);
  const model: LearnerModel = {
    acceptRates: new Map(state.model.acceptRates),
    agentScores: new Map(state.model.agentScores),
    preferenceWeights: new Map(state.model.preferenceWeights),
  };
  // Update accept rates
  const ar = model.acceptRates.get(suggestionType) || { accepted: 0, rejected: 0, modified: 0, total: 0 };
  ar.total += 1;
  if (type === 'accept') ar.accepted += 1;
  else if (type === 'reject') ar.rejected += 1;
  else if (type === 'modify') ar.modified += 1;
  model.acceptRates.set(suggestionType, ar);
  // Update agent score
  const currentScore = model.agentScores.get(agent) || 0.5;
  const newScore = type === 'accept' ? currentScore + state.learningRate * (1 - currentScore) : type === 'reject' ? currentScore - state.learningRate * currentScore : currentScore;
  model.agentScores.set(agent, Math.max(0, Math.min(1, newScore)));
  // Update preference weights
  const pw = model.preferenceWeights.get(suggestionType) || 0.5;
  model.preferenceWeights.set(suggestionType, type === 'accept' ? Math.min(1, pw + state.learningRate) : type === 'reject' ? Math.max(0, pw - state.learningRate) : pw);
  return { ...state, events, model, totalFeedback: state.totalFeedback + 1, nextId: state.nextId + 1 };
}

export function getAcceptRate(state: LearnerState, suggestionType: string): number {
  const ar = state.model.acceptRates.get(suggestionType);
  if (!ar || ar.total === 0) return 0.5;
  return ar.accepted / ar.total;
}

export function getAgentScore(state: LearnerState, agent: string): number {
  return state.model.agentScores.get(agent) || 0.5;
}

export function getPreferenceWeight(state: LearnerState, suggestionType: string): number {
  return state.model.preferenceWeights.get(suggestionType) || 0.5;
}

export function getLearnerReport(state: LearnerState): { total: number; acceptRates: Record<string, number>; agentScores: Record<string, number> } {
  const acceptRates: Record<string, number> = {};
  for (const [k, v] of state.model.acceptRates.entries()) acceptRates[k] = v.total > 0 ? v.accepted / v.total : 0.5;
  const agentScores: Record<string, number> = {};
  for (const [k, v] of state.model.agentScores.entries()) agentScores[k] = v;
  return { total: state.totalFeedback, acceptRates, agentScores };
}
