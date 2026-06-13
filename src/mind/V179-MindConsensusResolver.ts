/**
 * V179 MindConsensusResolver - Direction A Writing Mind (Iter 25/30)
 * chatdev: resolve conflicting writing suggestions
 */
export type ResolutionMethod = 'majority' | 'weighted' | 'priority' | 'latest' | 'merge';

export interface Suggestion {
  id: string;
  agent: string;
  value: string;
  confidence: number;
  priority: number;
  weight: number;
  timestamp: number;
}

export interface ConsensusResult {
  chosenId: string | null;
  chosenValue: string | null;
  method: ResolutionMethod;
  score: number;
  conflicts: number;
  merged?: string;
}

export interface ConsensusState {
  suggestions: Suggestion[];
  history: ConsensusResult[];
  resolutionCounts: Map<ResolutionMethod, number>;
}

export function createConsensusState(): ConsensusState {
  return { suggestions: [], history: [], resolutionCounts: new Map() };
}

export function addSuggestion(state: ConsensusState, agent: string, value: string, confidence: number, priority: number, weight: number = 1): ConsensusState {
  const id = `sug-${state.suggestions.length + 1}`;
  const s: Suggestion = { id, agent, value, confidence, priority, weight, timestamp: Date.now() };
  return { ...state, suggestions: [...state.suggestions, s].slice(-100) };
}

export function clearSuggestions(state: ConsensusState): ConsensusState {
  return { ...state, suggestions: [] };
}

export function resolveByMajority(state: ConsensusState): ConsensusResult {
  const counts: Record<string, number> = {};
  for (const s of state.suggestions) counts[s.value] = (counts[s.value] || 0) + 1;
  const conflicts = Object.keys(counts).length;
  let chosenValue: string | null = null;
  let maxCount = 0;
  for (const [value, count] of Object.entries(counts)) {
    if (count > maxCount) { maxCount = count; chosenValue = value; }
  }
  const chosen = state.suggestions.find(s => s.value === chosenValue);
  return { chosenId: chosen?.id || null, chosenValue, method: 'majority', score: maxCount / state.suggestions.length, conflicts };
}

export function resolveByWeight(state: ConsensusState): ConsensusResult {
  if (state.suggestions.length === 0) return { chosenId: null, chosenValue: null, method: 'weighted', score: 0, conflicts: 0 };
  const weights: Record<string, number> = {};
  for (const s of state.suggestions) {
    const w = s.confidence * s.weight;
    weights[s.value] = (weights[s.value] || 0) + w;
  }
  const conflicts = Object.keys(weights).length;
  let chosenValue: string | null = null;
  let maxWeight = -1;
  for (const [value, w] of Object.entries(weights)) {
    if (w > maxWeight) { maxWeight = w; chosenValue = value; }
  }
  const chosen = state.suggestions.find(s => s.value === chosenValue);
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  return { chosenId: chosen?.id || null, chosenValue, method: 'weighted', score: totalWeight > 0 ? maxWeight / totalWeight : 0, conflicts };
}

export function resolveByPriority(state: ConsensusState): ConsensusResult {
  if (state.suggestions.length === 0) return { chosenId: null, chosenValue: null, method: 'priority', score: 0, conflicts: 0 };
  const top = state.suggestions.reduce((max, s) => s.priority > max.priority ? s : max, state.suggestions[0]);
  const conflicts = new Set(state.suggestions.map(s => s.value)).size;
  return { chosenId: top.id, chosenValue: top.value, method: 'priority', score: top.priority / 10, conflicts };
}

export function resolveByLatest(state: ConsensusState): ConsensusResult {
  if (state.suggestions.length === 0) return { chosenId: null, chosenValue: null, method: 'latest', score: 0, conflicts: 0 };
  const latest = state.suggestions.reduce((max, s) => s.timestamp > max.timestamp ? s : max, state.suggestions[0]);
  const conflicts = new Set(state.suggestions.map(s => s.value)).size;
  return { chosenId: latest.id, chosenValue: latest.value, method: 'latest', score: 1 / state.suggestions.length, conflicts };
}

export function resolveByMerge(state: ConsensusState): ConsensusResult {
  if (state.suggestions.length === 0) return { chosenId: null, chosenValue: null, method: 'merge', score: 0, conflicts: 0 };
  // Merge all unique values, sorted by confidence desc
  const sorted = [...state.suggestions].sort((a, b) => b.confidence - a.confidence);
  const merged: string[] = [];
  const seen = new Set<string>();
  for (const s of sorted) {
    if (!seen.has(s.value)) {
      seen.add(s.value);
      merged.push(s.value);
    }
  }
  return { chosenId: null, chosenValue: null, method: 'merge', score: sorted[0].confidence, conflicts: seen.size, merged: merged.join(' | ') };
}

export function resolve(state: ConsensusState, method: ResolutionMethod): ConsensusResult {
  let result: ConsensusResult;
  if (method === 'majority') result = resolveByMajority(state);
  else if (method === 'weighted') result = resolveByWeight(state);
  else if (method === 'priority') result = resolveByPriority(state);
  else if (method === 'latest') result = resolveByLatest(state);
  else result = resolveByMerge(state);
  return result;
}

export function getConsensusReport(state: ConsensusState): { total: number; history: number; byMethod: Record<string, number> } {
  const byMethod: Record<string, number> = {};
  for (const [m, c] of state.resolutionCounts.entries()) byMethod[m] = c;
  return { total: state.suggestions.length, history: state.history.length, byMethod };
}
