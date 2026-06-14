/**
 * V208 AgentConsensus - Direction B Agent Forge (Iter 24/30)
 * chatdev: Multi-agent consensus on outputs
 */
export type ConsensusStrategy = 'majority' | 'weighted' | 'unanimous' | 'best_of' | 'merge';

export interface AgentVote {
  agentId: string;
  value: any;
  confidence: number;
  weight: number;
  reason?: string;
}

export interface ConsensusResult {
  strategy: ConsensusStrategy;
  result: any;
  votes: AgentVote[];
  agreement: number;       // 0..1
  confidence: number;      // 0..1
  participatingAgents: number;
}

export interface ConsensusState {
  rounds: ConsensusResult[];
  totalVotes: number;
}

export function createConsensusState(): ConsensusState {
  return { rounds: [], totalVotes: 0 };
}

export function majorityVote(votes: AgentVote[]): ConsensusResult {
  const counts = new Map<string, number>();
  for (const v of votes) {
    const key = JSON.stringify(v.value);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  let topKey = '';
  let topCount = 0;
  for (const [k, c] of counts.entries()) {
    if (c > topCount) { topCount = c; topKey = k; }
  }
  const topValue = topKey ? JSON.parse(topKey) : null;
  const agreement = votes.length > 0 ? topCount / votes.length : 0;
  const confidence = votes.reduce((a, b) => a + b.confidence, 0) / votes.length;
  return { strategy: 'majority', result: topValue, votes, agreement, confidence, participatingAgents: votes.length };
}

export function weightedVote(votes: AgentVote[]): ConsensusResult {
  if (votes.length === 0) return { strategy: 'weighted', result: null, votes, agreement: 0, confidence: 0, participatingAgents: 0 };
  const weights: Map<string, number> = new Map();
  for (const v of votes) {
    const key = JSON.stringify(v.value);
    const w = v.confidence * v.weight;
    weights.set(key, (weights.get(key) || 0) + w);
  }
  let topKey = '';
  let topWeight = -1;
  let totalWeight = 0;
  for (const [k, w] of weights.entries()) {
    totalWeight += w;
    if (w > topWeight) { topWeight = w; topKey = k; }
  }
  const topValue = topKey ? JSON.parse(topKey) : null;
  const agreement = totalWeight > 0 ? topWeight / totalWeight : 0;
  const confidence = votes.reduce((a, b) => a + b.confidence, 0) / votes.length;
  return { strategy: 'weighted', result: topValue, votes, agreement, confidence, participatingAgents: votes.length };
}

export function unanimousVote(votes: AgentVote[]): ConsensusResult {
  if (votes.length === 0) return { strategy: 'unanimous', result: null, votes, agreement: 0, confidence: 0, participatingAgents: 0 };
  const firstKey = JSON.stringify(votes[0].value);
  const allSame = votes.every(v => JSON.stringify(v.value) === firstKey);
  const avgConfidence = votes.reduce((a, b) => a + b.confidence, 0) / votes.length;
  return {
    strategy: 'unanimous',
    result: allSame ? votes[0].value : null,
    votes,
    agreement: allSame ? 1 : 0,
    confidence: avgConfidence,
    participatingAgents: votes.length,
  };
}

export function bestOfVote(votes: AgentVote[]): ConsensusResult {
  if (votes.length === 0) return { strategy: 'best_of', result: null, votes, agreement: 0, confidence: 0, participatingAgents: 0 };
  const best = votes.reduce((a, b) => b.confidence * b.weight > a.confidence * a.weight ? b : a);
  return { strategy: 'best_of', result: best.value, votes, agreement: 1 / votes.length, confidence: best.confidence, participatingAgents: votes.length };
}

export function mergeVote(votes: AgentVote[]): ConsensusResult {
  const merged: any[] = [];
  const seen = new Set<string>();
  for (const v of votes.sort((a, b) => b.confidence - a.confidence)) {
    const key = JSON.stringify(v.value);
    if (!seen.has(key)) { seen.add(key); merged.push(v.value); }
  }
  const avgConfidence = votes.length > 0 ? votes.reduce((a, b) => a + b.confidence, 0) / votes.length : 0;
  return { strategy: 'merge', result: merged, votes, agreement: 1 / (merged.length || 1), confidence: avgConfidence, participatingAgents: votes.length };
}

export function reachConsensus(state: ConsensusState, votes: AgentVote[], strategy: ConsensusStrategy): ConsensusState {
  let result: ConsensusResult;
  if (strategy === 'majority') result = majorityVote(votes);
  else if (strategy === 'weighted') result = weightedVote(votes);
  else if (strategy === 'unanimous') result = unanimousVote(votes);
  else if (strategy === 'best_of') result = bestOfVote(votes);
  else result = mergeVote(votes);
  return { ...state, rounds: [...state.rounds, result].slice(-100), totalVotes: state.totalVotes + votes.length };
}

export function getConsensusRounds(state: ConsensusState): ConsensusResult[] {
  return state.rounds;
}

export function getConsensusReport(state: ConsensusState): { rounds: number; totalVotes: number; avgAgreement: number; avgConfidence: number } {
  const rounds = state.rounds;
  return {
    rounds: rounds.length,
    totalVotes: state.totalVotes,
    avgAgreement: rounds.length > 0 ? rounds.reduce((a, b) => a + b.agreement, 0) / rounds.length : 0,
    avgConfidence: rounds.length > 0 ? rounds.reduce((a, b) => a + b.confidence, 0) / rounds.length : 0,
  };
}
