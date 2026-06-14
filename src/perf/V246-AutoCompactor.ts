/**
 * V246 AutoCompactor - Direction D Perf Compression (Iter 2/30)
 * thunderbolt: Auto-compact long context with summary + recent preservation
 */
export interface CompactionResult {
  id: string;
  originalTokens: number;
  compactedTokens: number;
  summary: string;
  recentKept: string;
  compressionRatio: number;
  timestamp: number;
}

export interface CompactionState {
  compactions: CompactionResult[];
  nextId: number;
  totalOriginalTokens: number;
  totalCompactedTokens: number;
}

export function createCompactionState(): CompactionState {
  return { compactions: [], nextId: 1, totalOriginalTokens: 0, totalCompactedTokens: 0 };
}

export function compactContext(state: CompactionState, text: string, recentWindow: number = 200, summaryRatio: number = 0.3): { state: CompactionState; result: CompactionResult } {
  const NL = String.fromCharCode(10);
  const originalTokens = Math.ceil(text.length / 4);
  if (text.length <= recentWindow * 2) {
    const result: CompactionResult = { id: `compact-${state.nextId}`, originalTokens, compactedTokens: originalTokens, summary: text, recentKept: '', compressionRatio: 1, timestamp: Date.now() };
    return { state: { ...state, compactions: [...state.compactions, result], nextId: state.nextId + 1, totalOriginalTokens: state.totalOriginalTokens + originalTokens, totalCompactedTokens: state.totalCompactedTokens + originalTokens }, result };
  }
  const summaryLen = Math.floor((text.length - recentWindow) * summaryRatio);
  const summary = text.slice(0, summaryLen);
  const recentKept = text.slice(text.length - recentWindow);
  const compactedText = summary + NL + '[...compacted...]' + NL + recentKept;
  const compactedTokens = Math.ceil(compactedText.length / 4);
  const result: CompactionResult = { id: `compact-${state.nextId}`, originalTokens, compactedTokens, summary, recentKept, compressionRatio: compactedTokens / originalTokens, timestamp: Date.now() };
  return {
    state: { ...state, compactions: [...state.compactions, result].slice(-100), nextId: state.nextId + 1, totalOriginalTokens: state.totalOriginalTokens + originalTokens, totalCompactedTokens: state.totalCompactedTokens + compactedTokens },
    result,
  };
}

export function getCompaction(state: CompactionState, id: string): CompactionResult | undefined {
  return state.compactions.find(c => c.id === id);
}

export function getRecentCompactions(state: CompactionState, count: number = 10): CompactionResult[] {
  return state.compactions.slice(-count);
}

export function getAverageCompressionRatio(state: CompactionState): number {
  if (state.compactions.length === 0) return 1;
  const totalRatio = state.compactions.reduce((a, b) => a + b.compressionRatio, 0);
  return totalRatio / state.compactions.length;
}

export function clearCompactions(state: CompactionState): CompactionState {
  return createCompactionState();
}

export function getCompactionReport(state: CompactionState): { totalCompactions: number; originalTokens: number; compactedTokens: number; avgRatio: number; savedTokens: number } {
  const saved = state.totalOriginalTokens - state.totalCompactedTokens;
  return { totalCompactions: state.compactions.length, originalTokens: state.totalOriginalTokens, compactedTokens: state.totalCompactedTokens, avgRatio: getAverageCompressionRatio(state), savedTokens: saved };
}
