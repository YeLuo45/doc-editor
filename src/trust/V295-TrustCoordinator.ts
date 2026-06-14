/**
 * V295 TrustCoordinator - Direction E Trust Verification (Iter 21/30)
 * chatdev: Coordinate trust decisions across multiple verifiers
 */
export interface TrustDecision {
  id: string;
  docId: string;
  requesterId: string;
  verifierIds: string[];
  votes: Map<string, 'approve' | 'reject' | 'abstain'>;
  consensus: 'approve' | 'reject' | 'pending';
  createdAt: number;
  resolvedAt?: number;
}

export interface TrustCoordState {
  decisions: Map<string, TrustDecision>;
  nextId: number;
  totalDecisions: number;
  approvedCount: number;
  rejectedCount: number;
}

export function createTrustCoordState(): TrustCoordState {
  return { decisions: new Map(), nextId: 1, totalDecisions: 0, approvedCount: 0, rejectedCount: 0 };
}

export function initiateDecision(state: TrustCoordState, docId: string, requesterId: string, verifierIds: string[]): { state: TrustCoordState; decisionId: string } {
  const id = `tdec-${state.nextId}`;
  const decision: TrustDecision = { id, docId, requesterId, verifierIds, votes: new Map(), consensus: 'pending', createdAt: Date.now() };
  return { state: { ...state, decisions: new Map(state.decisions).set(id, decision), nextId: state.nextId + 1, totalDecisions: state.totalDecisions + 1 }, decisionId: id };
}

export function voteOnDecision(state: TrustCoordState, decisionId: string, verifierId: string, vote: 'approve' | 'reject' | 'abstain'): TrustCoordState {
  const decision = state.decisions.get(decisionId);
  if (!decision) return state;
  const votes = new Map(decision.votes);
  votes.set(verifierId, vote);
  return { ...state, decisions: new Map(state.decisions).set(decisionId, { ...decision, votes }) };
}

export function resolveDecision(state: TrustCoordState, decisionId: string): TrustCoordState {
  const decision = state.decisions.get(decisionId);
  if (!decision) return state;
  const approvals = Array.from(decision.votes.values()).filter(v => v === 'approve').length;
  const rejections = Array.from(decision.votes.values()).filter(v => v === 'reject').length;
  const totalVoters = decision.verifierIds.length;
  const consensus: 'approve' | 'reject' = approvals > totalVoters / 2 ? 'approve' : 'reject';
  const updated: TrustDecision = { ...decision, consensus, resolvedAt: Date.now() };
  return {
    ...state,
    decisions: new Map(state.decisions).set(decisionId, updated),
    approvedCount: state.approvedCount + (consensus === 'approve' ? 1 : 0),
    rejectedCount: state.rejectedCount + (consensus === 'reject' ? 1 : 0),
  };
}

export function getDecision(state: TrustCoordState, decisionId: string): TrustDecision | undefined {
  return state.decisions.get(decisionId);
}

export function getDecisionsForDoc(state: TrustCoordState, docId: string): TrustDecision[] {
  return Array.from(state.decisions.values()).filter(d => d.docId === docId);
}

export function getPendingDecisions(state: TrustCoordState): TrustDecision[] {
  return Array.from(state.decisions.values()).filter(d => d.consensus === 'pending');
}

export function clearCoordState(state: TrustCoordState): TrustCoordState {
  return createTrustCoordState();
}

export function getTrustCoordReport(state: TrustCoordState): { total: number; approved: number; rejected: number; pending: number } {
  return { total: state.totalDecisions, approved: state.approvedCount, rejected: state.rejectedCount, pending: getPendingDecisions(state).length };
}
