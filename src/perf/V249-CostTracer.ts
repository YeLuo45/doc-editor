/**
 * V249 CostTracer - Direction D Perf Compression (Iter 5/30)
 * thunderbolt: Per-AI-call cost tracking (tokens/time/$/agent)
 */
export interface CostRecord {
  id: string;
  agentId: string;
  operation: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  costUsd: number;
  timestamp: number;
}

export interface CostTracerState {
  records: CostRecord[];
  costPerInputToken: number;
  costPerOutputToken: number;
  nextId: number;
  totalCost: number;
  totalTokens: number;
}

export function createCostTracerState(costPerInput: number = 0.000001, costPerOutput: number = 0.000002): CostTracerState {
  return { records: [], costPerInputToken: costPerInput, costPerOutputToken: costPerOutput, nextId: 1, totalCost: 0, totalTokens: 0 };
}

export function recordCost(state: CostTracerState, agentId: string, operation: string, inputTokens: number, outputTokens: number, durationMs: number): CostTracerState {
  const cost = inputTokens * state.costPerInputToken + outputTokens * state.costPerOutputToken;
  const record: CostRecord = { id: `cost-${state.nextId}`, agentId, operation, inputTokens, outputTokens, durationMs, costUsd: cost, timestamp: Date.now() };
  return { ...state, records: [...state.records, record].slice(-1000), nextId: state.nextId + 1, totalCost: state.totalCost + cost, totalTokens: state.totalTokens + inputTokens + outputTokens };
}

export function setPricing(state: CostTracerState, inputCost: number, outputCost: number): CostTracerState {
  return { ...state, costPerInputToken: inputCost, costPerOutputToken: outputCost };
}

export function getCostByAgent(state: CostTracerState, agentId: string): number {
  return state.records.filter(r => r.agentId === agentId).reduce((a, b) => a + b.costUsd, 0);
}

export function getCostByOperation(state: CostTracerState, operation: string): number {
  return state.records.filter(r => r.operation === operation).reduce((a, b) => a + b.costUsd, 0);
}

export function getTotalCostInWindow(state: CostTracerState, windowStart: number): number {
  return state.records.filter(r => r.timestamp >= windowStart).reduce((a, b) => a + b.costUsd, 0);
}

export function getRecentRecords(state: CostTracerState, count: number = 10): CostRecord[] {
  return state.records.slice(-count);
}

export function clearCostRecords(state: CostTracerState): CostTracerState {
  return { ...state, records: [], totalCost: 0, totalTokens: 0 };
}

export function getCostTracerReport(state: CostTracerState): { records: number; totalCost: number; totalTokens: number; avgCost: number; byAgent: Record<string, number> } {
  const byAgent: Record<string, number> = {};
  for (const r of state.records) byAgent[r.agentId] = (byAgent[r.agentId] || 0) + r.costUsd;
  return { records: state.records.length, totalCost: state.totalCost, totalTokens: state.totalTokens, avgCost: state.records.length > 0 ? state.totalCost / state.records.length : 0, byAgent };
}
