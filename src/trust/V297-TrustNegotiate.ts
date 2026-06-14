/**
 * V297 TrustNegotiate - Direction E Trust Verification (Iter 23/30)
 * chatdev: Negotiate trust levels between agents
 */
export type TrustLevel = 'low' | 'medium' | 'high' | 'critical';

export interface TrustRequest {
  id: string;
  agentId: string;
  requestedLevel: TrustLevel;
  minLevel: TrustLevel;
  resource: string;
  timestamp: number;
}

export interface TrustGrant {
  agentId: string;
  grantedLevel: TrustLevel;
  resource: string;
  reason: string;
}

export interface TrustNegotiateState {
  pendingRequests: TrustRequest[];
  grants: TrustGrant[];
  nextId: number;
  totalNegotiations: number;
  byLevel: Record<TrustLevel, number>;
}

const LEVEL_RANK: Record<TrustLevel, number> = { low: 1, medium: 2, high: 3, critical: 4 };

export function createTrustNegotiateState(): TrustNegotiateState {
  return { pendingRequests: [], grants: [], nextId: 1, totalNegotiations: 0, byLevel: { low: 0, medium: 0, high: 0, critical: 0 } };
}

export function requestTrustLevel(state: TrustNegotiateState, agentId: string, requestedLevel: TrustLevel, minLevel: TrustLevel, resource: string): { state: TrustNegotiateState; requestId: string } {
  const id = `tnr-${state.nextId}`;
  const request: TrustRequest = { id, agentId, requestedLevel, minLevel, resource, timestamp: Date.now() };
  return { state: { ...state, pendingRequests: [...state.pendingRequests, request].slice(-100), nextId: state.nextId + 1 }, requestId: id };
}

export function negotiateTrustLevel(state: TrustNegotiateState, requestId: string, availableLevel: TrustLevel): { state: TrustNegotiateState; grant?: TrustGrant } {
  const request = state.pendingRequests.find(r => r.id === requestId);
  if (!request) return { state };
  const minRank = LEVEL_RANK[request.minLevel];
  const reqRank = LEVEL_RANK[request.requestedLevel];
  const availRank = LEVEL_RANK[availableLevel];
  // Grant = min of available and requested, but at least minLevel
  const grantedRank = Math.min(availRank, reqRank);
  if (grantedRank < minRank) {
    // Cannot satisfy minimum - drop
    return { state: { ...state, pendingRequests: state.pendingRequests.filter(r => r.id !== requestId), totalNegotiations: state.totalNegotiations + 1 } };
  }
  const levelName = (Object.keys(LEVEL_RANK) as TrustLevel[]).find(k => LEVEL_RANK[k] === grantedRank)!;
  const grant: TrustGrant = { agentId: request.agentId, grantedLevel: levelName, resource: request.resource, reason: `granted ${levelName} for ${request.resource}` };
  return {
    state: {
      ...state,
      grants: [...state.grants, grant].slice(-200),
      pendingRequests: state.pendingRequests.filter(r => r.id !== requestId),
      nextId: state.nextId,
      totalNegotiations: state.totalNegotiations + 1,
      byLevel: { ...state.byLevel, [levelName]: state.byLevel[levelName] + 1 },
    },
    grant,
  };
}

export function getPendingRequests(state: TrustNegotiateState): TrustRequest[] {
  return state.pendingRequests;
}

export function getGrantsForAgent(state: TrustNegotiateState, agentId: string): TrustGrant[] {
  return state.grants.filter(g => g.agentId === agentId);
}

export function clearTrustNegotiations(state: TrustNegotiateState): TrustNegotiateState {
  return createTrustNegotiateState();
}

export function getTrustNegotiateReport(state: TrustNegotiateState): { totalNegotiations: number; totalGrants: number; pending: number; byLevel: Record<string, number> } {
  return { totalNegotiations: state.totalNegotiations, totalGrants: state.grants.length, pending: state.pendingRequests.length, byLevel: state.byLevel };
}
