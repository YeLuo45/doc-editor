/**
 * V267 PerfNegotiate - Direction D Perf Compression (Iter 23/30)
 * chatdev: Negotiate perf budget between agents
 */
export interface BudgetRequest {
  id: string;
  agentId: string;
  requestedTokens: number;
  minTokens: number;
  priority: number;     // 1-10
  timestamp: number;
}

export interface BudgetGrant {
  agentId: string;
  grantedTokens: number;
  totalAvailable: number;
  remainingAfter: number;
}

export interface NegotiateState {
  totalBudget: number;
  allocated: Map<string, number>;
  pendingRequests: BudgetRequest[];
  nextId: number;
  totalNegotiations: number;
}

export function createNegotiateState(totalBudget: number = 100000): NegotiateState {
  return { totalBudget, allocated: new Map(), pendingRequests: [], nextId: 1, totalNegotiations: 0 };
}

export function requestBudget(state: NegotiateState, agentId: string, requestedTokens: number, minTokens: number, priority: number): { state: NegotiateState; requestId: string } {
  const id = `req-${state.nextId}`;
  const request: BudgetRequest = { id, agentId, requestedTokens, minTokens, priority, timestamp: Date.now() };
  return { state: { ...state, pendingRequests: [...state.pendingRequests, request].slice(-100), nextId: state.nextId + 1 }, requestId: id };
}

export function negotiate(state: NegotiateState, requestId: string): { state: NegotiateState; grant?: BudgetGrant } {
  const request = state.pendingRequests.find(r => r.id === requestId);
  if (!request) return { state };
  const allocatedSoFar = Array.from(state.allocated.values()).reduce((a, b) => a + b, 0);
  // Also account for other pending requests
  const otherPending = state.pendingRequests.filter(r => r.id !== requestId);
  const pendingAllocated = otherPending.reduce((a, b) => a + b.requestedTokens, 0);
  const remaining = state.totalBudget - allocatedSoFar - pendingAllocated;
  // Find current request's effective request (use requested or min depending on availability)
  const grantTokens = Math.min(request.requestedTokens, Math.max(request.minTokens, remaining));
  if (request.requestedTokens > remaining) {
    if (request.minTokens <= remaining) {
      const updated: NegotiateState = { ...state, allocated: new Map(state.allocated).set(request.agentId, (state.allocated.get(request.agentId) || 0) + grantTokens), pendingRequests: state.pendingRequests.filter(r => r.id !== requestId), totalNegotiations: state.totalNegotiations + 1 };
      return { state: updated, grant: { agentId: request.agentId, grantedTokens: grantTokens, totalAvailable: state.totalBudget, remainingAfter: remaining - grantTokens } };
    }
    // Cannot satisfy even minimum, defer or reject
    return { state: { ...state, pendingRequests: state.pendingRequests.filter(r => r.id !== requestId), totalNegotiations: state.totalNegotiations + 1 } };
  }
  const updated: NegotiateState = { ...state, allocated: new Map(state.allocated).set(request.agentId, (state.allocated.get(request.agentId) || 0) + request.requestedTokens), pendingRequests: state.pendingRequests.filter(r => r.id !== requestId), totalNegotiations: state.totalNegotiations + 1 };
  return { state: updated, grant: { agentId: request.agentId, grantedTokens: request.requestedTokens, totalAvailable: state.totalBudget, remainingAfter: remaining - request.requestedTokens } };
}

export function setTotalBudget(state: NegotiateState, total: number): NegotiateState {
  return { ...state, totalBudget: total };
}

export function getAllocation(state: NegotiateState, agentId: string): number {
  return state.allocated.get(agentId) || 0;
}

export function getPendingRequests(state: NegotiateState): BudgetRequest[] {
  return state.pendingRequests;
}

export function getNegotiateReport(state: NegotiateState): { totalBudget: number; allocated: number; pending: number; negotiations: number; byAgent: Record<string, number> } {
  const allocated = Array.from(state.allocated.values()).reduce((a, b) => a + b, 0);
  const byAgent: Record<string, number> = {};
  for (const [a, v] of state.allocated.entries()) byAgent[a] = v;
  return { totalBudget: state.totalBudget, allocated, pending: state.pendingRequests.length, negotiations: state.totalNegotiations, byAgent };
}
